<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\AppUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $username, string $role): AppUser
    {
        return AppUser::create([
            'username' => $username,
            'password' => 'secret123',
            'role' => $role,
            'status' => 'approved',
        ]);
    }

    public function test_login_writes_a_logged_in_line(): void
    {
        $this->makeUser('owner', 'admin');

        $this->postJson('/api/login', [
            'username' => 'owner',
            'password' => 'secret123',
        ])->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'Logged in',
        ]);
    }

    public function test_a_warranty_page_visit_is_recorded(): void
    {
        Sanctum::actingAs($this->makeUser('tech', 'staff'));

        $this->postJson('/api/activity-logs', ['view' => 'warranty'])
            ->assertCreated();

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'Visited the Warranty page',
        ]);
    }

    public function test_a_page_visit_is_recorded_for_that_role(): void
    {
        Sanctum::actingAs($this->makeUser('owner', 'admin'));

        $this->postJson('/api/activity-logs', ['view' => 'overview'])
            ->assertCreated();

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'Visited the Overview page',
        ]);
    }

    public function test_a_shop_action_is_recorded(): void
    {
        Sanctum::actingAs($this->makeUser('owner', 'admin'));

        $this->postJson('/api/expenses', [
            'category' => 'Utilities',
            'description' => 'May electricity bill',
            'amount' => 2200,
            'date' => '2026-08-22',
        ])->assertCreated();

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'Recorded an expense',
        ]);
    }

    public function test_users_only_see_their_own_logs(): void
    {
        $owner = $this->makeUser('owner', 'admin');
        $tech = $this->makeUser('tech', 'staff');

        ActivityLog::create([
            'app_user_id' => $owner->id,
            'ip_address' => '10.0.0.1',
            'action' => 'Visited the Overview page',
            'created_at' => now(),
        ]);
        ActivityLog::create([
            'app_user_id' => $tech->id,
            'ip_address' => '10.0.0.2',
            'action' => 'Visited the Workflow page',
            'created_at' => now(),
        ]);

        Sanctum::actingAs($owner);

        $this->getJson('/api/activity-logs')
            ->assertOk()
            ->assertJsonCount(1, 'logs')
            ->assertJsonPath('logs.0.action', 'Visited the Overview page')
            ->assertJsonMissing(['action' => 'Visited the Workflow page']);
    }

    public function test_guests_cannot_read_activity_logs(): void
    {
        $this->getJson('/api/activity-logs')->assertUnauthorized();
    }

    public function test_a_customer_cannot_log_a_shop_page_visit(): void
    {
        Sanctum::actingAs($this->makeUser('rider', 'customer'));

        $this->postJson('/api/activity-logs', ['view' => 'overview'])
            ->assertCreated();

        $this->assertDatabaseMissing('activity_logs', [
            'action' => 'Visited the Overview page',
        ]);
    }

    public function test_repeat_visits_are_not_spammed(): void
    {
        Sanctum::actingAs($this->makeUser('owner', 'admin'));

        $this->postJson('/api/activity-logs', ['view' => 'kanban'])->assertCreated();
        $this->postJson('/api/activity-logs', ['view' => 'kanban'])->assertCreated();

        $this->assertDatabaseCount('activity_logs', 1);
    }

    public function test_logout_is_recorded(): void
    {
        $this->makeUser('owner', 'admin');
        $token = $this->postJson('/api/login', [
            'username' => 'owner',
            'password' => 'secret123',
        ])->assertOk()->json('token');

        $this->withToken($token)->postJson('/api/logout')->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'Logged out',
        ]);
    }
}
