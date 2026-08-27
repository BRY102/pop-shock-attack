<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignMechanicRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('mechanic') === '') {
            $this->merge(['mechanic' => null]);
        }
    }

    public function rules(): array
    {
        return [
            'mechanic' => ['nullable', 'string', 'max:100', Rule::exists('mechanics', 'name')],
        ];
    }
}
