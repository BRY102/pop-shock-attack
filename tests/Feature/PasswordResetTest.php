<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\PasswordResetRequest;
use App\Notifications\PasswordResetRequested;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    private const PUBLIC_MESSAGE = 'If this account exists, visit the shop counter. Staff can set a new password there.';

    private function makeUser(string $username, string $role, string $status = 'approved'): AppUser
    {
        return AppUser::create([
            'username' => $username,
            'password' => 'secret123',
            'role' => $role,
            'status' => $status,
        ]);
    }

    public function test_a_customer_can_file_a_reset_request(): void
    {
        Notification::fake();

        $owner = $this->makeUser('owner', 'admin');
        $this->makeUser('juan_rider', 'customer');

        $this->postJson('/api/forgot-password', ['username' => 'juan_rider'])
            ->assertOk()
            ->assertJson(['message' => self::PUBLIC_MESSAGE]);

        $this->assertDatabaseHas('password_reset_requests', [
            'username' => 'juan_rider',
            'status' => 'pending',
        ]);

        Notification::assertSentTo($owner, PasswordResetRequested::class);
    }

    public function test_unknown_usernames_get_the_same_reply_and_create_nothing(): void
    {
        $this->postJson('/api/forgot-password', ['username' => 'nobody_here'])
            ->assertOk()
            ->assertJson(['message' => self::PUBLIC_MESSAGE]);

        $this->assertDatabaseCount('password_reset_requests', 0);
    }

    public function test_staff_and_admin_accounts_cannot_be_reset_from_the_public_form(): void
    {
        $this->makeUser('owner', 'admin');
        $this->makeUser('tech', 'staff');

        $this->postJson('/api/forgot-password', ['username' => 'owner'])->assertOk();
        $this->postJson('/api/forgot-password', ['username' => 'tech'])->assertOk();

        $this->assertDatabaseCount('password_reset_requests', 0);
    }

    public function test_pending_customers_do_not_get_a_reset_ticket(): void
    {
        $this->makeUser('new_rider', 'customer', 'pending');

        $this->postJson('/api/forgot-password', ['username' => 'new_rider'])->assertOk();

        $this->assertDatabaseCount('password_reset_requests', 0);
    }

    public function test_a_second_request_does_not_duplicate_a_pending_ticket(): void
    {
        $this->makeUser('juan_rider', 'customer');

        $this->postJson('/api/forgot-password', ['username' => 'juan_rider'])->assertOk();
        $this->postJson('/api/forgot-password', ['username' => 'Juan_Rider'])->assertOk();

        $this->assertDatabaseCount('password_reset_requests', 1);
    }

    public function test_customers_cannot_list_or_complete_reset_tickets(): void
    {
        $rider = $this->makeUser('juan_rider', 'customer');
        $reset = PasswordResetRequest::create([
            'app_user_id' => $rider->id,
            'username' => $rider->username,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($rider);

        $this->getJson('/api/password-resets')->assertForbidden();
        $this->putJson("/api/password-resets/{$reset->id}/complete", [
            'password' => 'newpass1',
        ])->assertForbidden();
    }

    public function test_staff_can_set_a_new_password_and_the_old_one_stops_working(): void
    {
        $rider = $this->makeUser('juan_rider', 'customer');
        $rider->createToken('api-token');
        $staff = $this->makeUser('tech', 'staff');
        $staffToken = $staff->createToken('api-token')->plainTextToken;
        $reset = PasswordResetRequest::create([
            'app_user_id' => $rider->id,
            'username' => $rider->username,
            'status' => 'pending',
        ]);

        $this->withToken($staffToken)->putJson("/api/password-resets/{$reset->id}/complete", [
            'password' => 'newpass1',
        ])->assertOk();

        $rider->refresh();
        $this->assertTrue(Hash::check('newpass1', $rider->password));
        $this->assertFalse(Hash::check('secret123', $rider->password));
        $this->assertDatabaseHas('password_reset_requests', [
            'id' => $reset->id,
            'status' => 'completed',
        ]);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $rider->id,
        ]);

        $this->postJson('/api/login', [
            'username' => 'juan_rider',
            'password' => 'secret123',
        ])->assertUnauthorized();

        $this->postJson('/api/login', [
            'username' => 'juan_rider',
            'password' => 'newpass1',
        ])->assertOk();
    }

    public function test_a_counter_reset_rejects_a_short_password(): void
    {
        $rider = $this->makeUser('juan_rider', 'customer');
        $reset = PasswordResetRequest::create([
            'app_user_id' => $rider->id,
            'username' => $rider->username,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->makeUser('tech', 'staff'));

        $this->putJson("/api/password-resets/{$reset->id}/complete", [
            'password' => '1234567',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $rider->refresh();
        $this->assertTrue(Hash::check('secret123', $rider->password));
    }

    public function test_a_completed_ticket_cannot_be_used_again(): void
    {
        $rider = $this->makeUser('juan_rider', 'customer');
        $reset = PasswordResetRequest::create([
            'app_user_id' => $rider->id,
            'username' => $rider->username,
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        Sanctum::actingAs($this->makeUser('tech', 'staff'));

        $this->putJson("/api/password-resets/{$reset->id}/complete", [
            'password' => 'another1',
        ])->assertUnprocessable();
    }

    public function test_staff_see_only_pending_tickets(): void
    {
        $rider = $this->makeUser('juan_rider', 'customer');
        PasswordResetRequest::create([
            'app_user_id' => $rider->id,
            'username' => $rider->username,
            'status' => 'pending',
        ]);
        PasswordResetRequest::create([
            'app_user_id' => $rider->id,
            'username' => $rider->username,
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        Sanctum::actingAs($this->makeUser('tech', 'staff'));

        $this->getJson('/api/password-resets')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['username' => 'juan_rider', 'status' => 'pending']);
    }
}
