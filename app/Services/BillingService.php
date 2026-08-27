<?php

namespace App\Services;

class BillingService
{
    /**
     * Allowed base labor amounts, from config/shop.php engine_classes.
     * The tuning form offers the same list so staff cannot pick a rogue price.
     *
     * @return list<int>
     */
    public static function basePrices(): array
    {
        return array_map(
            static fn (array $class): int => (int) $class['price'],
            config('shop.engine_classes', []),
        );
    }

    private function partPrice(string $key): int
    {
        return (int) config("shop.part_prices.{$key}");
    }

    /**
     * The priced lines of a bill, plus the total the customer actually pays.
     * A warranty claim still lists the shop prices so the owner can see what
     * was given away, but the total is ₱0 — that is the shop's only waiver.
     *
     * @return array{lines: list<array{key: string, label: string, qty: int, unitPrice: int, amount: int}>, subtotal: int, total: int, covered: bool}
     */
    public function breakdown(
        int $enginePrice,
        bool $isWarrantyClaim,
        ?string $oil,
        ?string $oilSealSize,
        int $oilSealQty,
        ?string $dustSealSize,
        int $dustSealQty,
        ?string $springs,
    ): array {
        $lines = [];

        $lines[] = [
            'key' => 'labor',
            'label' => 'Base Engine/Labor',
            'qty' => 1,
            'unitPrice' => $enginePrice,
            'amount' => $enginePrice,
        ];

        if ($this->isUsed($oil)) {
            $lines[] = [
                'key' => 'oil',
                'label' => "Fork oil ({$oil})",
                'qty' => 1,
                'unitPrice' => 0,
                'amount' => 0,
            ];
        }

        if ($this->isUsed($oilSealSize) && $oilSealQty > 0) {
            $unit = $enginePrice >= $this->partPrice('big_bike_labor_threshold')
                ? $this->partPrice('oil_seal_big')
                : $this->partPrice('oil_seal_small');
            $lines[] = [
                'key' => 'oilSeal',
                'label' => $oilSealSize,
                'qty' => $oilSealQty,
                'unitPrice' => $unit,
                'amount' => $oilSealQty * $unit,
            ];
        }

        if ($this->isUsed($dustSealSize) && $dustSealQty > 0) {
            $lines[] = [
                'key' => 'dustSeal',
                'label' => $dustSealSize,
                'qty' => $dustSealQty,
                'unitPrice' => $this->partPrice('dust_seal'),
                'amount' => $dustSealQty * $this->partPrice('dust_seal'),
            ];
        }

        if ($this->isUsed($springs)) {
            $lines[] = [
                'key' => 'springs',
                'label' => $springs,
                'qty' => 1,
                'unitPrice' => $this->partPrice('springs'),
                'amount' => $this->partPrice('springs'),
            ];
        }

        $subtotal = array_sum(array_column($lines, 'amount'));

        return [
            'lines' => $lines,
            'subtotal' => $subtotal,
            'total' => $isWarrantyClaim ? 0 : $subtotal,
            'covered' => $isWarrantyClaim,
        ];
    }

    /**
     * Compute the total bill on the server so the client-side preview
     * can never be tampered with. Warranty re-service claims are free.
     */
    public function computeTotal(
        int $enginePrice,
        bool $isWarrantyClaim,
        ?string $oilSealSize,
        int $oilSealQty,
        ?string $dustSealSize,
        int $dustSealQty,
        ?string $springs,
        ?string $oil = null,
    ): int {
        return $this->breakdown(
            enginePrice: $enginePrice,
            isWarrantyClaim: $isWarrantyClaim,
            oil: $oil,
            oilSealSize: $oilSealSize,
            oilSealQty: $oilSealQty,
            dustSealSize: $dustSealSize,
            dustSealQty: $dustSealQty,
            springs: $springs,
        )['total'];
    }

    private function isUsed(?string $part): bool
    {
        return $part !== null && $part !== '' && $part !== 'None';
    }
}
