<?php

namespace App\Http\Requests;

use App\Enums\JobStage;
use App\Models\ServiceJob;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    public function rules(): array
    {
        return [
            'stage' => ['required', Rule::in(JobStage::values())],
        ];
    }

    /**
     * The stage gate is enforced here rather than only on the board, so the
     * workflow cannot be skipped by calling the API directly.
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $job = $this->route('job');

                if (! $job instanceof ServiceJob || $validator->errors()->has('stage')) {
                    return;
                }

                $current = JobStage::from($job->stage);
                $requested = JobStage::from($this->input('stage'));

                if (! $current->canTransitionTo($requested)) {
                    $validator->errors()->add('stage', $this->rejectionMessage($current, $requested));
                    return;
                }

                if (
                    $current->requiresLeadTechBeforeLeaving()
                    && $current->isForwardTo($requested)
                    && blank($job->mechanic_name)
                ) {
                    $validator->errors()->add(
                        'mechanic',
                        'Assign a lead tech before moving this unit.'
                    );
                }
            },
        ];
    }

    private function rejectionMessage(JobStage $current, JobStage $requested): string
    {
        $allowed = $current->allowedTransitions();

        if ($allowed === []) {
            return "This unit is already at {$current->value} and can no longer be moved.";
        }

        if ($current === $requested) {
            return "This unit is already at {$current->value}.";
        }

        $names = implode(' or ', array_column($allowed, 'value'));

        return "A unit at {$current->value} can only move to {$names}.";
    }
}
