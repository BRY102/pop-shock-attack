<?php

namespace App\Services;

class BillingService
{
    /**
     * Base front-shock service price per motorcycle class.
     * Must match the classes offered on the tuning-specs form.
     */
    public const BASE_PRICES = [1200, 1500, 2500, 2800, 4500, 6500];

    /** Oil seal price depends on the motorcycle class. */
    private const OIL_SEAL_PRICE_BIG = 500;

    private const OIL_SEAL_PRICE_SMALL = 300;

    private const BIG_BIKE_THRESHOLD = 2800;

    private const DUST_SEAL_PRICE = 75;

    private const SPRING_PRICE = 580;

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
            $unit = $enginePrice >= self::BIG_BIKE_THRESHOLD
                ? self::OIL_SEAL_PRICE_BIG
                : self::OIL_SEAL_PRICE_SMALL;
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
                'unitPrice' => self::DUST_SEAL_PRICE,
                'amount' => $dustSealQty * self::DUST_SEAL_PRICE,
            ];
        }

        if ($this->isUsed($springs)) {
            $lines[] = [
                'key' => 'springs',
                'label' => $springs,
                'qty' => 1,
                'unitPrice' => self::SPRING_PRICE,
                'amount' => self::SPRING_PRICE,
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
