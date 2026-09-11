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

    protected function prepareForValidation(): void
    {
        $time = $this->input('timeIn');
        if (is_string($time) && preg_match('/^\d{2}:\d{2}/', $time)) {
            $this->merge(['timeIn' => substr($time, 0, 5)]);
        }
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
            'dateIn' => 'required|date|before_or_equal:today',
            'timeIn' => 'required|date_format:H:i',
            'complaint' => 'required|string|min:3|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'plate.unique' => 'That plate / engine number already has an active job in the shop.',
            'dateIn.before_or_equal' => 'A unit cannot be dated after today — that would put it in the wrong month on the reports.',
            'timeIn.required' => 'Set the time the unit came in.',
            'complaint.required' => 'Write why the unit came in, the same way the paper ticket used to.',
        ];
    }
}
