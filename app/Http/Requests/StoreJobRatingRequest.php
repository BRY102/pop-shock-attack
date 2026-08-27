<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreJobRatingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('comment') || ! is_string($this->input('comment'))) {
            return;
        }

        $comment = trim($this->input('comment'));
        $this->merge(['comment' => $comment === '' ? null : $comment]);
    }

    public function rules(): array
    {
        return [
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:280',
        ];
    }

    public function messages(): array
    {
        return [
            'rating.required' => 'Pick a star rating from 1 to 5.',
            'rating.min' => 'Pick a star rating from 1 to 5.',
            'rating.max' => 'Pick a star rating from 1 to 5.',
        ];
    }
};
