<?php

namespace App\Services;

use App\Models\InventoryItem;
use Illuminate\Validation\ValidationException;

class InventoryDeductionService
{
    /**
     * The consumables a set of tuning specs uses, as [['name' => ..., 'qty' => ...]].
     * "None" and empty selections are skipped, and repeated names are merged so a
     * single stock row is only ever locked once per job.
     *
     * @return list<array{name: string, qty: int}>
     */
    public function consumablesFor(
        ?string $oil,
        ?string $oilSealSize,
        int $oilSealQty,
        ?string $dustSealSize,
        int $dustSealQty,
        ?string $springs,
    ): array {
        $totals = [];

        $used = [
            [$oil, 1],
            [$oilSealSize, $oilSealQty],
            [$dustSealSize, $dustSealQty],
            [$springs, 1],
        ];

        foreach ($used as [$name, $qty]) {
            if ($this->isUsed($name) && $qty > 0) {
                $totals[$name] = ($totals[$name] ?? 0) + $qty;
            }
        }

        $lines = [];
        foreach ($totals as $name => $qty) {
            $lines[] = ['name' => (string) $name, 'qty' => $qty];
        }

        return $lines;
    }

    /**
     * The consumables recorded on a job's saved specs, so they can be put back
     * when the specs are revised or the job is cancelled. Jobs logged before
     * consumables were recorded return nothing rather than a guess, so a
     * reversal can never invent stock the shop does not have.
     *
     * @return list<array{name: string, qty: int}>
     */
    public function fromSpecs(?array $specs): array
    {
        return $specs['consumables'] ?? [];
    }

    /**
     * Take a consumable list out of stock. Call inside a DB transaction together
     * with the job save, so a failure can never leave the job updated but the
     * stock untouched. Rows are locked for the length of that transaction, so two
     * jobs logged at the same time cannot both claim the last unit.
     *
     * @param  list<array{name: string, qty: int}>  $consumables
     * @return list<InventoryItem> the items this deduction pushed to their alert
     *                             level or emptied, so the caller can warn the
     *                             shop once the surrounding transaction commits.
     *
     * @throws ValidationException when an item is not in the catalog or is short.
     */
    public function deduct(array $consumables): array
    {
        $ranLow = [];

        foreach ($consumables as $line) {
            $item = InventoryItem::where('name', $line['name'])->lockForUpdate()->first();

            if (! $item) {
                throw ValidationException::withMessages([
                    'specs' => "\"{$line['name']}\" is not in the consumables inventory, so it cannot be logged. Add it under Consumables first.",
                ]);
            }

            if ($item->stock < $line['qty']) {
                throw ValidationException::withMessages([
                    'specs' => "Not enough stock for \"{$item->name}\": {$item->stock} left but {$line['qty']} needed. Restock it before logging these specs.",
                ]);
            }

            $wasHealthy = (int) $item->stock > (int) $item->threshold;

            $item->decrement('stock', $line['qty']);

            // Only report the way down: the moment an item crosses its alert
            // level, or the moment it empties. An item that is merely still low
            // stays quiet, so the bell is not flooded on every job.
            if (($wasHealthy && (int) $item->stock <= (int) $item->threshold) || (int) $item->stock === 0) {
                $ranLow[] = $item;
            }
        }

        return $ranLow;
    }

    /**
     * Objective 2.3: what a consumable list is worth at catalog prices. Stored
     * on the job so its parts cost stays fixed at what the shop paid when the
     * parts were fitted, even if the catalog price changes later.
     *
     * @param  list<array{name: string, qty: int}>  $consumables
     */
    public function costOf(array $consumables): float
    {
        if ($consumables === []) {
            return 0.0;
        }

        $prices = InventoryItem::whereIn('name', array_column($consumables, 'name'))
            ->pluck('price', 'name');

        $total = 0.0;

        foreach ($consumables as $line) {
            $total += (float) ($prices[$line['name']] ?? 0) * (int) $line['qty'];
        }

        return round($total, 2);
    }

    /**
     * Put a consumable list back: the parts were never actually fitted because
     * the specs were revised or the job was cancelled.
     *
     * @param  list<array{name: string, qty: int}>  $consumables
     */
    public function restore(array $consumables): void
    {
        foreach ($consumables as $line) {
            InventoryItem::where('name', $line['name'])->increment('stock', $line['qty']);
        }
    }

    private function isUsed(?string $name): bool
    {
        return $name !== null && $name !== '' && $name !== 'None';
    }
}
