<?php

namespace App\Http\Requests;

use App\Enums\JobStage;
use App\Models\ServiceJob;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateJobDetailsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    protected function prepareForValidation(): void
    {
        $merge = [];
        if ($this->has('customer')) {
            $merge['customer'] = strtolower(trim((string) $this->input('customer')));
        }
        if ($this->has('plate')) {
            $merge['plate'] = strtoupper(trim((string) $this->input('plate')));
        }
        if ($this->has('moto')) {
            $merge['moto'] = trim((string) $this->input('moto'));
        }
        if ($this->has('complaint')) {
            $merge['complaint'] = trim((string) $this->input('complaint'));
        }
        $time = $this->input('timeIn');
        if (is_string($time) && preg_match('/^\d{2}:\d{2}/', $time)) {
            $merge['timeIn'] = substr($time, 0, 5);
        }
        if ($merge) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        /** @var ServiceJob|null $job */
        $job = $this->route('job');

        return [
            'customer' => 'required|string|max:255',
            'moto' => 'required|string|max:255',
            'plate' => [
                'required', 'string', 'max:255',
                Rule::unique('service_jobs', 'plate_number')
                    ->ignore($job)
                    ->where(fn ($query) => $query->where('stage', '!=', JobStage::Release->value)),
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
