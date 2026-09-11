<?php

namespace Tests\Feature;

use App\Models\AppUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserPresenceTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): AppUser
    {
        return AppUser::create([
            'username' => 'owner',
            'password' => 'secret123',
            'role' => 'admin',
            'status' => 'approved',
        ]);
    }

    public function test_login_marks_the_user_as_online(): void
    {
        $this->makeAdmin();

        $this->postJson('/api/login', [
            'username' => 'owner',
            'password' => 'secret123',
        ])->assertOk()->assertJsonPath('user.online', true);

        $this->assertNotNull(AppUser::where('username', 'owner')->value('last_seen_at'));
    }

    public function test_logout_marks_the_user_offline(): void
    {
        $this->makeAdmin();

        $token = $this->postJson('/api/login', [
            'username' => 'owner',
            'password' => 'secret123',
        ])->json('token');

        $this->withToken($token)->postJson('/api/logout')->assertOk();

        $this->assertNull(AppUser::where('username', 'owner')->value('last_seen_at'));
    }

    public function test_user_list_reports_who_is_currently_online(): void
    {
        $admin = $this->makeAdmin();
        $staff = AppUser::create([
            'username' => 'tech',
            'password' => 'secret123',
            'role' => 'staff',
            'status' => 'approved',
            'last_seen_at' => now()->subMinutes(10),
        ]);
        $admin->forceFill(['last_seen_at' => now()])->save();

        Sanctum::actingAs($admin);

        $this->getJson('/api/users')
            ->assertOk()
            ->assertJsonFragment(['username' => 'owner', 'online' => true])
            ->assertJsonFragment(['username' => 'tech', 'online' => false]);
    }
}
