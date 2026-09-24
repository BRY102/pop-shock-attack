<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceJobResource extends JsonResource
{
    /**
     * The single definition of what the API exposes for a service job.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer' => $this->customer,
            'app_user_id' => $this->app_user_id,
            'moto_model' => $this->moto_model,
            'plate_number' => $this->plate_number,
            'stage' => $this->stage,
            'date_in' => $this->date_in,
            'time_in' => $this->formatTimeIn($this->time_in),
            'date_released' => $this->released_at?->toDateString(),
            'complaint' => $this->complaint,
            'specs' => $this->specs,
            'oil_viscosity' => $this->oil_viscosity,
            'suspension_brand' => $this->suspension_brand,
            'suspension_type' => $this->suspension_type,
            'spring_rate' => $this->spring_rate,
            'mechanic_name' => $this->mechanic_name,
            'rating' => $this->rating,
            'rating_comment' => $this->rating_comment,
            'rated_at' => $this->rated_at?->toIso8601String(),
            'is_warranty_claim' => $this->is_warranty_claim,
            'warranty_status' => $this->warranty_status,
            'warranty_expires_at' => $this->warranty_expires_at?->toDateString(),
            'payment_method' => $this->payment_method,
            'amount_paid' => $this->amount_paid,
            'change_amount' => $this->change_amount,
            'payment_reference' => $this->payment_reference,
            'payment_notes' => $this->payment_notes,
            'released_by' => $this->released_by,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }


    private function formatTimeIn(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format('H:i');
        }

        return substr((string) $value, 0, 5);
    }
}
