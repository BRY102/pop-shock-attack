<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreActivityLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'view' => [
                'required',
                'string',
                Rule::in([
                    'overview',
                    'kanban',
                    'history',
                    'warranty',
                    'inventory',
                    'reports',
                    'backjobs',
                    'users',
                    'approvals',
                    'customer',
                    'customer-prev',
                ]),
            ],
        ];
    }
}
