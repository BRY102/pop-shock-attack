<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class AppUser extends Authenticatable
{
    use HasApiTokens, Notifiable;

    // Allow mass assignment for these specific columns
    protected $fillable = ['username', 'password', 'role', 'status', 'last_seen_at'];

    // Never expose the password hash in JSON responses
    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            // Automatically bcrypt-hashes on set, verifies via Hash::check on read
            'password' => 'hashed',
            'last_seen_at' => 'datetime',
        ];
    }

    public function isOnline(): bool
    {
        if ($this->last_seen_at === null) {
            return false;
        }

        $window = (int) config('shop.online_within_seconds', 120);

        return $this->last_seen_at->gte(now()->subSeconds($window));
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }
}
