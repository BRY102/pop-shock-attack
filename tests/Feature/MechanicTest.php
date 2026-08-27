<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\Mechanic;
use App\Models\ServiceJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MechanicTest extends TestCase
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

    public function test_staff_can_list_and_assign_a_seeded_mechanic(): void
    {
        $this->seed(\Database\Seeders\MechanicSeeder::class);
        Sanctum::actingAs($this->makeUser('tech', 'staff'));

        $this->getJson('/api/mechanics')
            ->assertOk()
            ->assertJsonFragment(['name' => 'John Hendrix']);

        $job = ServiceJob::create([
            'customer' => 'walkin',
            'moto_model' => 'Honda Click 125',
            'plate_number' => 'MEC-0001',
            'stage' => 'Disassembly',
            'date_in' => '2026-08-01',
        ]);

        $this->putJson("/api/jobs/{$job->id}/mechanic", [
            'mechanic' => 'John Hendrix',
        ])->assertOk();

        $this->assertSame('John Hendrix', $job->fresh()->mechanic_name);
    }

    public function test_an_unknown_mechanic_cannot_be_assigned(): void
    {
        Sanctum::actingAs($this->makeUser('tech', 'staff'));

        $job = ServiceJob::create([
            'customer' => 'walkin',
            'moto_model' => 'Honda Click 125',
            'plate_number' => 'MEC-0002',
            'stage' => 'Disassembly',
            'date_in' => '2026-08-01',
        ]);

        $this->putJson("/api/jobs/{$job->id}/mechanic", [
            'mechanic' => 'Not On The Roster',
        ])->assertUnprocessable();
    }

    public function test_staff_cannot_add_or_delete_mechanics(): void
    {
        $mechanic = Mechanic::create(['name' => 'Temp Tech']);
        Sanctum::actingAs($this->makeUser('tech', 'staff'));

        $this->postJson('/api/mechanics', ['name' => 'New Hire'])->assertForbidden();
        $this->deleteJson("/api/mechanics/{$mechanic->id}")->assertForbidden();
    }

    public function test_the_owner_can_add_and_remove_a_mechanic(): void
    {
        Sanctum::actingAs($this->makeUser('owner', 'admin'));

        $id = $this->postJson('/api/mechanics', ['name' => 'New Hire'])
            ->assertCreated()
            ->json('mechanic.id');

        $this->assertDatabaseHas('mechanics', ['name' => 'New Hire']);

        $this->deleteJson("/api/mechanics/{$id}")->assertOk();
        $this->assertDatabaseMissing('mechanics', ['name' => 'New Hire']);
    }

    public function test_customers_cannot_see_the_mechanic_roster(): void
    {
        Sanctum::actingAs($this->makeUser('rider', 'customer'));

        $this->getJson('/api/mechanics')->assertForbidden();
    }
}
