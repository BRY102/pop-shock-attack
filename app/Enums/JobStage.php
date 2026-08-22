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
}
