<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\CompletePasswordResetRequest;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Resources\PasswordResetRequestResource;
use App\Models\AppUser;
use App\Models\PasswordResetRequest;
use App\Notifications\PasswordResetRequested;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Notification;

class PasswordResetController extends Controller
{
    /**
     * Same wording whether the username exists or not, so the form
     * cannot be used to probe for accounts.
     */
    private const PUBLIC_MESSAGE = 'If this account exists, visit the shop counter. Staff can set a new password there.';

    /**
     * Public request from the login screen. Creates a pending ticket
     * only for an approved customer; everyone else gets the same reply.
     */
    public function store(ForgotPasswordRequest $request): JsonResponse
    {
        $username = strtolower(trim($request->validated()['username']));

        $user = AppUser::where('username', $username)->first();

        if ($this->isEligibleCustomer($user)) {
            $alreadyPending = PasswordResetRequest::where('app_user_id', $user->id)
                ->where('status', PasswordResetRequest::STATUS_PENDING)
                ->exists();

            if (! $alreadyPending) {
                PasswordResetRequest::create([
                    'app_user_id' => $user->id,
                    'username' => $user->username,
                    'status' => PasswordResetRequest::STATUS_PENDING,
                ]);

                $this->notifyShop($user);
            }
        }

        return response()->json(['message' => self::PUBLIC_MESSAGE]);
    }

    /**
     * Pending counter tickets for staff and the owner.
     */
    public function index(): JsonResponse
    {
        $resets = PasswordResetRequest::where('status', PasswordResetRequest::STATUS_PENDING)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(PasswordResetRequestResource::collection($resets));
    }

    /**
     * Staff/owner sets the new password at the counter, then the
     * rider's old sessions are dropped so the stolen-or-forgotten
     * password cannot keep working.
     */
    public function complete(CompletePasswordResetRequest $request, PasswordResetRequest $passwordReset): JsonResponse
    {
        $user = $passwordReset->user;
        $user->password = $request->validated()['password'];
        $user->save();
        $user->tokens()->delete();

        $passwordReset->status = PasswordResetRequest::STATUS_COMPLETED;
        $passwordReset->completed_by = $request->user()->id;
        $passwordReset->completed_at = now();
        $passwordReset->save();

        return response()->json([
            'message' => 'Password reset. Tell the rider the new password at the counter.',
        ]);
    }

    private function isEligibleCustomer(?AppUser $user): bool
    {
        return $user
            && $user->role === UserRole::Customer->value
            && $user->status === 'approved';
    }

    private function notifyShop(AppUser $customer): void
    {
        $recipients = AppUser::whereIn('role', [UserRole::Admin->value, UserRole::Staff->value])
            ->where('status', 'approved')
            ->get();

        if ($recipients->isEmpty()) {
            return;
        }

        Notification::send($recipients, new PasswordResetRequested($customer));
    }
}
