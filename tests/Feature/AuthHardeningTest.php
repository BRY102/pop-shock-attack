<?php

namespace Tests\Feature;

use App\Models\AppUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AuthHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected bool $disableAuthThrottle = false;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    private function makeOwner(): AppUser
    {
        return AppUser::create([
            'username' => 'owner',
            'password' => 'secret123',
            'role' => 'admin',
            'status' => 'approved',
        ]);
    }

    public function test_a_fresh_token_can_access_protected_routes(): void
    {
        $this->makeOwner();

        $token = $this->postJson('/api/login', [
            'username' => 'owner',
            'password' => 'secret123',
        ])->assertOk()->json('token');

        $this->withToken($token)->getJson('/api/jobs')->assertOk();
    }

    public function test_a_token_expires_after_the_configured_lifetime(): void
    {
        config(['sanctum.expiration' => 60]);

        $owner = $this->makeOwner();
        $token = $owner->createToken('api-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/jobs')->assertOk();

        $this->travel(61)->minutes();

        $this->flushHeaders();
        app('auth')->forgetGuards();

        $this->withToken($token)->getJson('/api/jobs')->assertUnauthorized();
    }

    public function test_login_is_blocked_after_too_many_attempts(): void
    {
        $this->makeOwner();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', [
                'username' => 'owner',
                'password' => 'wrong-password',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/login', [
            'username' => 'owner',
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }

    public function test_register_is_blocked_after_too_many_attempts(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/api/register', [
                'username' => "rider_{$i}",
                'password' => 'secret123',
            ])->assertCreated();
        }

        $this->postJson('/api/register', [
            'username' => 'rider_6',
            'password' => 'secret123',
        ])->assertStatus(429);
    }
}
