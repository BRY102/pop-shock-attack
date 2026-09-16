<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\AppUser;

class ActivityLogger
{
    /**
     * Append one line to this user's trail. Failures never break the action
     * that triggered the log.
     */
    public function record(?AppUser $user, string $action, ?string $ip = null, int $dedupeSeconds = 0): void
    {
        if (! $user) {
            return;
        }

        $action = trim($action);
        if ($action === '') {
            return;
        }

        try {
            if ($dedupeSeconds > 0) {
                $recent = ActivityLog::query()
                    ->where('app_user_id', $user->id)
                    ->where('action', $action)
                    ->where('created_at', '>=', now()->subSeconds($dedupeSeconds))
                    ->exists();

                if ($recent) {
                    return;
                }
            }

            ActivityLog::create([
                'app_user_id' => $user->id,
                'ip_address' => $this->ip($ip),
                'action' => mb_substr($action, 0, 255),
                'created_at' => now(),
            ]);
        } catch (\Throwable) {
            // Logging must never block login or a job move.
        }
    }

    private function ip(?string $ip): string
    {
        $value = trim((string) ($ip ?: request()?->ip() ?: ''));

        return $value !== '' ? mb_substr($value, 0, 45) : '0.0.0.0';
    }
}
