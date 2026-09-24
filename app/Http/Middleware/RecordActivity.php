<?php

namespace App\Http\Middleware;

use App\Models\AppUser;
use App\Models\InventoryItem;
use App\Models\Mechanic;
use App\Models\PasswordResetRequest;
use App\Models\ServiceJob;
use App\Services\ActivityLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RecordActivity
{
    public function __construct(private readonly ActivityLogger $logger) {}

    /**
     * After a successful write, add a line to the actor's activity log.
     * Reads (GET) and the activity-log endpoints themselves are skipped.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $context = $this->context($request);
        $response = $next($request);

        $user = $request->user();
        if (! $user instanceof AppUser || ! $response->isSuccessful()) {
            return $response;
        }

        $action = $this->describe($request, $context);
        if ($action) {
            $this->logger->record($user, $action, $request->ip());
        }

        return $response;
    }

    /**
     * Snapshot route models before a DELETE removes them.
     *
     * @return array{plate: string, job_id: ?int, username: string, item: string, mechanic: string, reset_user: string}
     */
    private function context(Request $request): array
    {
        $job = $request->route('job');
        $user = $request->route('user');
        $item = $request->route('item');
        $mechanic = $request->route('mechanic');
        $reset = $request->route('passwordReset');

        return [
            'plate' => $job instanceof ServiceJob ? trim((string) $job->plate_number) : '',
            'job_id' => $job instanceof ServiceJob ? $job->id : null,
            'username' => $user instanceof AppUser ? (string) $user->username : '',
            'item' => $item instanceof InventoryItem ? (string) $item->name : '',
            'mechanic' => $mechanic instanceof Mechanic ? (string) $mechanic->name : '',
            'reset_user' => $reset instanceof PasswordResetRequest ? (string) $reset->username : '',
        ];
    }

    /**
     * @param  array{plate: string, job_id: ?int, username: string, item: string, mechanic: string, reset_user: string}  $ctx
     */
    private function describe(Request $request, array $ctx): ?string
    {
        $method = $request->method();
        if (! in_array($method, ['POST', 'PUT', 'DELETE'], true)) {
            return null;
        }

        if ($request->is('api/activity-logs') || $request->is('api/notifications') || $request->is('api/notifications/*')) {
            return null;
        }

        $plate = $this->plate($ctx, $request);
        $item = $this->label($ctx['item'] ?: (string) $request->input('name', ''), 'an item');
        $username = $this->label($ctx['username'] ?: (string) $request->input('username', ''), 'an account');
        $mechanic = $this->label((string) ($request->input('mechanic') ?: $ctx['mechanic']), 'a mechanic');

        return match (true) {
            $request->isMethod('POST') && $request->is('api/logout') => 'Logged out',
            $request->isMethod('POST') && $request->is('api/jobs') => 'Registered a new intake ('.$plate.')',
            $request->isMethod('PUT') && $request->is('api/jobs/*/stage') => 'Moved job '.$plate.' to '.$this->label((string) $request->input('stage'), 'the next stage'),
            $request->isMethod('PUT') && $request->is('api/jobs/*/specs') => 'Logged tuning specs for '.$plate,
            $request->isMethod('PUT') && $request->is('api/jobs/*/details') => 'Corrected details on '.$plate,
            $request->isMethod('PUT') && $request->is('api/jobs/*/mechanic') => $request->input('mechanic')
                ? 'Assigned '.$mechanic.' to '.$plate
                : 'Unassigned the mechanic on '.$plate,
            $request->isMethod('DELETE') && $request->is('api/jobs/*') => 'Deleted job '.$plate,
            $request->isMethod('POST') && $request->is('api/jobs/*/rating') => 'Rated a completed job ('.$plate.')',
            $request->isMethod('POST') && $request->is('api/inventory') => 'Added inventory item '.$item,
            $request->isMethod('PUT') && $request->is('api/inventory/*/add-stock') => 'Added stock to '.$item,
            $request->isMethod('PUT') && $request->is('api/inventory/*') => 'Updated inventory item '.$item,
            $request->isMethod('DELETE') && $request->is('api/inventory/*') => 'Deleted inventory item '.$item,
            $request->isMethod('POST') && $request->is('api/expenses') => 'Recorded an expense',
            $request->isMethod('POST') && $request->is('api/counter-sales') => 'Recorded a counter sale',
            $request->isMethod('POST') && $request->is('api/users') => 'Created account '.$username,
            $request->isMethod('PUT') && $request->is('api/users/*/approve') => 'Approved account '.$username,
            $request->isMethod('PUT') && $request->is('api/users/*') => 'Updated account '.$username,
            $request->isMethod('DELETE') && $request->is('api/users/*') => 'Deleted account '.$username,
            $request->isMethod('POST') && $request->is('api/mechanics') => 'Added mechanic '.$this->label((string) $request->input('name', ''), 'a mechanic'),
            $request->isMethod('DELETE') && $request->is('api/mechanics/*') => 'Removed mechanic '.$mechanic,
            $request->isMethod('PUT') && $request->is('api/password-resets/*/complete') => 'Completed a password reset for '.$this->label($ctx['reset_user'], 'a customer'),
            default => null,
        };
    }

    /**
     * @param  array{plate: string, job_id: ?int, username: string, item: string, mechanic: string, reset_user: string}  $ctx
     */
    private function plate(array $ctx, Request $request): string
    {
        $plate = $ctx['plate'] !== '' ? $ctx['plate'] : trim((string) $request->input('plate', ''));
        if ($plate !== '') {
            return $plate;
        }

        return $ctx['job_id'] ? 'job #'.$ctx['job_id'] : 'a job';
    }

    private function label(string $value, string $fallback): string
    {
        $value = trim($value);

        return $value !== '' ? $value : $fallback;
    }
}
