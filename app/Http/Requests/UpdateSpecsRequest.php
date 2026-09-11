<?php

namespace App\Http\Requests;

use App\Enums\JobStage;
use App\Models\ServiceJob;
use App\Services\BillingService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSpecsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    public function rules(): array
    {
        return [
            // Must be one of the shop's motorcycle-class base prices;
            // the total bill is computed server-side from these inputs.
            'enginePrice' => ['required', 'integer', Rule::in(BillingService::basePrices())],
            'oil' => 'required|string|max:255',
            'oilSeal' => 'required|string|max:255',
            'dustSeal' => 'required|string|max:255',
            'springs' => 'required|string|max:255',
            'isWarranty' => 'required|boolean',
            // The suspension setup measured for this unit. Constrained to the
            // shop's vocabulary so a returning unit's history stays comparable.
            'oilViscosity' => ['required', 'string', Rule::in(config('shop.oil_viscosities'))],
            'suspensionBrand' => 'required|string|max:100',
            'suspensionType' => ['required', 'string', Rule::in(config('shop.suspension_types'))],
            'rawOil' => 'nullable|string|max:255',
            'rawOsSize' => 'nullable|string|max:255',
            'rawOsQty' => 'nullable|integer|min:0|max:10',
            'rawDsSize' => 'nullable|string|max:255',
            'rawDsQty' => 'nullable|integer|min:0|max:10',
            'rawSprings' => 'nullable|string|max:255',
        ];
    }

    /**
     * Two rules the board relies on but cannot enforce by itself: specs belong
     * to the Tuning stage, and a free re-service needs real warranty coverage
     * on an earlier visit rather than just a ticked checkbox.
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $job = $this->route('job');

                if (! $job instanceof ServiceJob) {
                    return;
                }

                if ($job->stage !== JobStage::Tuning->value) {
                    $validator->errors()->add(
                        'stage',
                        "Tuning specs can only be logged while a unit is in Tuning; this one is at {$job->stage}."
                    );
                }

                if (blank($job->mechanic_name)) {
                    $validator->errors()->add(
                        'mechanic',
                        'Assign a lead tech before logging specs.'
                    );
                }

                if ($this->boolean('isWarranty') && ! $job->coveringWarranty()) {
                    $validator->errors()->add(
                        'isWarranty',
                        'This unit has no earlier released service still under warranty, so it cannot be billed as a free re-service claim.'
                    );
                }
            },
        ];
    }
}
