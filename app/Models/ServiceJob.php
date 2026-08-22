<?php

namespace App\Models;

use App\Enums\JobStage;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class ServiceJob extends Model
{
    protected $table = 'service_jobs';

    // Fields the intake/workflow forms are allowed to mass-assign.
    // 'specs' and 'warranty_expires_at' are set explicitly by the
    // controller, never straight from request input.
    protected $fillable = [
        'customer',
        'app_user_id',
        'moto_model',
        'plate_number',
        'stage',
        'date_in',
        'mechanic_name',
        'is_warranty_claim',
    ];

    protected $casts = [
        'specs' => 'array',
        'is_warranty_claim' => 'boolean',
        'warranty_expires_at' => 'date',
    ];

    public function appUser()
    {
        return $this->belongsTo(AppUser::class);
    }

    /**
     * The earlier visit whose warranty still covers this unit, if any. A free
     * re-service claim is only legitimate when this returns a job, so the
     * decision never rests on the staff checkbox alone.
     */
    public function coveringWarranty(): ?self
    {
        return static::query()
            ->where('plate_number', $this->plate_number)
            ->whereKeyNot($this->getKey())
            ->where('stage', JobStage::Release->value)
            ->whereNotNull('warranty_expires_at')
            ->whereDate('warranty_expires_at', '>=', now()->toDateString())
            ->orderByDesc('warranty_expires_at')
            ->first();
    }

    // warranty_status is derived from warranty_expires_at so it can't go stale.
    // Set warranty_expires_at (e.g. on Release) rather than writing this directly.
    protected function warrantyStatus(): Attribute
    {
        return Attribute::make(
            get: function () {
                if (! $this->warranty_expires_at) {
                    return 'Pending';
                }

                return $this->warranty_expires_at->isFuture()
                    ? 'Active (Expires '.$this->warranty_expires_at->format('m/d/Y').')'
                    : 'Expired ('.$this->warranty_expires_at->format('m/d/Y').')';
            },
        );
    }
}
