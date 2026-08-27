<?php

namespace Tests\Feature;

use App\Models\AppUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CounterSaleTest extends TestCase
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

    public function test_the_owner_can_record_a_counter_sale(): void
    {
        Sanctum::actingAs($this->makeUser('owner', 'admin'));

        $this->postJson('/api/counter-sales', [
            'description' => 'Fork oil bottle',
            'amount' => 450,
            'date' => '2026-08-24',
        ])->assertCreated();

        $this->assertDatabaseHas('counter_sales', [
            'description' => 'Fork oil bottle',
            'date' => '2026-08-24',
        ]);

        $this->getJson('/api/counter-sales')
            ->assertOk()
            ->assertJsonFragment(['description' => 'Fork oil bottle']);
    }

    public function test_a_counter_sale_defaults_to_today(): void
    {
        Sanctum::actingAs($this->makeUser('owner', 'admin'));

        $this->postJson('/api/counter-sales', [
            'description' => 'Brake pads',
            'amount' => 600,
        ])->assertCreated();

        $this->assertDatabaseHas('counter_sales', [
            'description' => 'Brake pads',
            'date' => now()->toDateString(),
        ]);
    }

    public function test_a_counter_sale_needs_a_description_and_amount(): void
    {
        Sanctum::actingAs($this->makeUser('owner', 'admin'));

        $this->postJson('/api/counter-sales', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['description', 'amount']);
    }

    public function test_staff_and_customers_cannot_record_counter_sales(): void
    {
        Sanctum::actingAs($this->makeUser('tech', 'staff'));
        $this->postJson('/api/counter-sales', ['description' => 'Chain lube', 'amount' => 200])
            ->assertForbidden();
        $this->getJson('/api/counter-sales')->assertForbidden();

        Sanctum::actingAs($this->makeUser('rider', 'customer'));
        $this->postJson('/api/counter-sales', ['description' => 'Chain lube', 'amount' => 200])
            ->assertForbidden();

        $this->assertDatabaseCount('counter_sales', 0);
    }

    public function test_guests_cannot_record_counter_sales(): void
    {
        $this->postJson('/api/counter-sales', ['description' => 'Chain lube', 'amount' => 200])
            ->assertUnauthorized();
    }
}
