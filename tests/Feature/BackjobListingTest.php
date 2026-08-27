<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\ServiceJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BackjobListingTest extends TestCase
{
    use RefreshDatabase;

    private function loginAs(string $role): AppUser
    {
        $user = AppUser::create([
            'username' => $role === 'admin' ? 'owner' : $role,
            'password' => 'secret123',
            'role' => $role,
            'status' => 'approved',
        ]);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_backjobs_returns_warranty_claims_newest_first(): void
    {
        $this->loginAs('admin');

        ServiceJob::create([
            'customer' => 'juan_rider', 'moto_model' => 'Yamaha NMAX 155',
            'plate_number' => 'ABC-1234', 'stage' => 'Release',
            'date_in' => '2026-04-10', 'complaint' => 'First rebuild',
            'mechanic_name' => 'Rico', 'is_warranty_claim' => false,
        ]);
        ServiceJob::create([
            'customer' => 'juan_rider', 'moto_model' => 'Yamaha NMAX 155',
            'plate_number' => 'ABC-1234', 'stage' => 'Release',
            'date_in' => '2026-06-01', 'complaint' => 'Oil leaking from left fork',
            'mechanic_name' => 'Rico', 'is_warranty_claim' => true,
        ]);
        ServiceJob::create([
            'customer' => 'maria_rides', 'moto_model' => 'Honda Click 125',
            'plate_number' => 'XYZ-9999', 'stage' => 'QA',
            'date_in' => '2026-08-20', 'complaint' => 'Still leaking after last visit',
            'mechanic_name' => 'Ben', 'is_warranty_claim' => true,
        ]);

        $this->getJson('/api/jobs/backjobs')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.plate_number', 'XYZ-9999')
            ->assertJsonPath('0.complaint', 'Still leaking after last visit')
            ->assertJsonPath('0.mechanic_name', 'Ben')
            ->assertJsonPath('1.plate_number', 'ABC-1234')
            ->assertJsonPath('1.mechanic_name', 'Rico')
            ->assertJsonMissing(['complaint' => 'First rebuild']);
    }

    public function test_staff_can_access_backjob_listing(): void
    {
        $this->loginAs('staff');

        ServiceJob::create([
            'customer' => 'juan_rider', 'moto_model' => 'Yamaha NMAX 155',
            'plate_number' => 'ABC-1234', 'stage' => 'QA',
            'date_in' => '2026-08-20', 'complaint' => 'Still leaking',
            'mechanic_name' => 'Ben', 'is_warranty_claim' => true,
        ]);

        $this->getJson('/api/jobs/backjobs')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.plate_number', 'ABC-1234');
    }

    public function test_customers_cannot_access_backjob_analytics(): void
    {
        $this->loginAs('customer');

        $this->getJson('/api/jobs/backjobs')->assertForbidden();
    }
}
