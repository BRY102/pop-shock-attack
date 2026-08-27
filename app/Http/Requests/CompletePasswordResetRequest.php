<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Models\PasswordResetRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class CompletePasswordResetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    public function rules(): array
    {
        return [
            'password' => 'required|string|min:'.config('shop.password_min_length'),
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $reset = $this->route('passwordReset');

                if (! $reset instanceof PasswordResetRequest) {
                    return;
                }

                if ($reset->status !== PasswordResetRequest::STATUS_PENDING) {
                    $validator->errors()->add('status', 'This reset request has already been completed.');
                }

                $user = $reset->user;

                if (! $user || $user->role !== UserRole::Customer->value) {
                    $validator->errors()->add(
                        'password',
                        'Only customer accounts can be reset from a shop-counter request.'
                    );
                }
            },
        ];
    }
}
