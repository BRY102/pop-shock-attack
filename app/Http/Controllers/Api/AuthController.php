<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\AppUser;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(private readonly ActivityLogger $logger) {}

    /**
     * Public customer self-registration. Accounts start as "pending"
     * until approved by staff.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = AppUser::create([
            'username' => $validated['username'],
            'password' => $validated['password'], // hashed via the model's 'hashed' cast
            'role' => UserRole::Customer->value,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Registered successfully',
            'user' => new UserResource($user),
        ], 201);
    }

    /**
     * Verify credentials and issue a Sanctum bearer token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $user = AppUser::where('username', $credentials['username'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if ($user->status === 'pending') {
            return response()->json(['message' => 'Account pending staff approval.'], 403);
        }

        $user->forceFill(['last_seen_at' => now()])->save();
        $token = $user->createToken('api-token')->plainTextToken;
        $this->logger->record($user, 'Logged in', $request->ip());

        return response()->json([
            'message' => 'Login successful',
            'user' => new UserResource($user->fresh()),
            'token' => $token,
        ]);
    }

    /**
     * Revoke the token used for the current request.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();
        $user->forceFill(['last_seen_at' => null])->save();

        return response()->json(['message' => 'Logged out successfully']);
    }
}
