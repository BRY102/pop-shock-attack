<?php

namespace App\Enums;

enum JobStage: string
{
    case Intake = 'Intake';
    case Disassembly = 'Disassembly';
    case Tuning = 'Tuning';
    case QA = 'QA';
    case Release = 'Release';

    /**
     * All stage values in workflow order, for validation rules.
     *
     * @return string[]
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * The stages a unit may move to from this one. The board is a stage gate:
     * work advances one step at a time, QA may send a unit back to Tuning for
     * rework, and Release is final.
     *
     * @return self[]
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Intake => [self::Disassembly],
            self::Disassembly => [self::Tuning],
            self::Tuning => [self::QA],
            self::QA => [self::Release, self::Tuning],
            self::Release => [],
        };
    }

    public function canTransitionTo(self $stage): bool
    {
        return in_array($stage, $this->allowedTransitions(), true);
    }

    /**
     * True when the move advances the unit (not QA sending it back to Tuning).
     */
    public function isForwardTo(self $stage): bool
    {
        $order = array_search($this, self::cases(), true);
        $next = array_search($stage, self::cases(), true);

        return $order !== false && $next !== false && $next > $order;
    }

    /**
     * Intake can still move to Disassembly unassigned. From Disassembly on,
     * a lead tech has to be on the card before the unit can leave.
     */
    public function requiresLeadTechBeforeLeaving(): bool
    {
        return $this !== self::Intake && $this !== self::Release;
    }
}
