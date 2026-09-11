<?php

namespace Tests\Feature;

use App\Models\AppUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExpenseTest extends TestCase
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

    public function test_the_owner_can_record_a_shop_expense(): void
    {
        Sanctum::actingAs($this->makeUser('owner', 'admin'));

        $this->postJson('/api/expenses', [
            'category' => 'Utilities',
            'description' => 'May electricity bill',
            'amount' => 2200,
            'date' => '2026-08-22',
        ])->assertCreated()
            ->assertJsonPath('expense.category', 'Utilities');

        $this->assertDatabaseHas('expenses', [
            'description' => 'May electricity bill',
            'category' => 'Utilities',
            'date' => '2026-08-22',
        ]);
    }

    public function test_an_expense_needs_category_amount_and_notes(): void
    {
        Sanctum::actingAs($this->makeUser('owner', 'admin'));

        $this->postJson('/api/expenses', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['category', 'description', 'amount', 'date']);
    }

    public function test_customers_cannot_record_expenses(): void
    {
        Sanctum::actingAs($this->makeUser('rider', 'customer'));

        $this->postJson('/api/expenses', [
            'category' => 'Rent',
            'description' => 'Shop rent',
            'amount' => 8000,
            'date' => '2026-08-22',
        ])->assertForbidden();

        $this->assertDatabaseCount('expenses', 0);
    }
}
