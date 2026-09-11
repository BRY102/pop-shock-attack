<?php

namespace App\Http\Middleware;

use App\Models\AppUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TouchLastSeen
{
    /**
     * Keep last_seen_at fresh while the user is using the app, without
     * writing the database on every single request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof AppUser) {
            $cutoff = now()->subSeconds(30);
            if ($user->last_seen_at === null || $user->last_seen_at->lt($cutoff)) {
                AppUser::whereKey($user->id)->update(['last_seen_at' => now()]);
                $user->last_seen_at = now();
            }
        }

        return $next($request);
    }
}
