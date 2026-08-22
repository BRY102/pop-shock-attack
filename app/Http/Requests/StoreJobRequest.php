<?php

namespace App\Http\Requests;

use App\Enums\JobStage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    public function rules(): array
    {
        return [
            'customer' => 'required|string|max:255',
            'moto' => 'required|string|max:255',
            'plate' => [
                'required', 'string', 'max:255',
                // A unit can only be in the shop once at a time. Released
                // visits stay on record so a returning unit can be re-admitted.
                Rule::unique('service_jobs', 'plate_number')->where(
                    fn ($query) => $query->where('stage', '!=', JobStage::Release->value)
                ),
            ],
            'dateIn' => 'required|date',
        ];
    }

    public function messages(): array
    {
        return [
            'plate.unique' => 'That plate / engine number already has an active job in the shop.',
        ];
    }
}
