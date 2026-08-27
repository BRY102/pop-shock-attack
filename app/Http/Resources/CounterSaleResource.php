<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CounterSaleResource extends JsonResource
{
    /**
     * The single definition of what the API exposes for a counter sale.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'description' => $this->description,
            'amount' => $this->amount,
            'date' => $this->date?->toDateString(),
            'created_at' => $this->created_at,
        ];
    }
}
