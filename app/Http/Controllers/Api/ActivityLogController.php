<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreActivityLogRequest;
use App\Models\AppUser;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function __construct(private readonly ActivityLogger $logger) {}

    /**
     * This account's trail, newest first.
     */
    public function index(Request $request): JsonResponse
    {
        $logs = $request->user()
            ->activityLogs()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'logged_at' => $log->created_at->timezone(config('app.timezone'))->format('Y-m-d H:i:s'),
                'ip_address' => $log->ip_address,
                'action' => $log->action,
            ]);

        return response()->json(['logs' => $logs]);
    }

    /**
     * SPA page visit. The label is chosen here so the client cannot write
     * arbitrary log text.
     */
    public function store(StoreActivityLogRequest $request): JsonResponse
    {
        $view = $request->validated()['view'];
        $action = $this->viewActions($request->user())[$view] ?? null;

        if ($action) {
            $this->logger->record($request->user(), $action, $request->ip(), 20);
        }

        return response()->json(['ok' => true], 201);
    }

    /**
     * @return array<string, string>
     */
    private function viewActions(AppUser $user): array
    {
        $shop = [
            'kanban' => 'Visited the Workflow page',
            'history' => 'Visited the Service History page',
            'warranty' => 'Visited the Warranty page',
            'inventory' => 'Visited the Inventory page',
            'backjobs' => 'Visited the Back-jobs page',
        ];

        return match ($user->role) {
            UserRole::Admin->value => $shop + [
                'overview' => 'Visited the Overview page',
                'reports' => 'Visited the Sales page',
                'users' => 'Visited the Manage Users page',
            ],
            UserRole::Staff->value => $shop + [
                'approvals' => 'Visited the Pending Requests page',
            ],
            UserRole::Customer->value => [
                'customer' => 'Visited My Dashboard',
                'customer-prev' => 'Visited Previous jobs',
            ],
            default => [],
        };
    }
}
