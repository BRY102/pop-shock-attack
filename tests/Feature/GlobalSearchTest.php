<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\ServiceJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GlobalSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(AppUser::create([
            'username' => 'tech', 'password' => 'secret123',
            'role' => 'staff', 'status' => 'approved',
        ]));

        // Released visit with tuning history, an in-progress Tuning job
        // (must not appear in history search), a released re-service, and
        // an unrelated intake.
        $released = ServiceJob::create([
            'customer' => 'juan_rider', 'moto_model' => 'Yamaha NMAX 155',
            'plate_number' => 'ABC-1234', 'stage' => 'Release', 'date_in' => '2026-04-10',
        ]);
        $released->specs = ['enginePrice' => 1500, 'totalBill' => 2100, 'oil' => 'Racing Oil',
            'oilSeal' => 'Oil Seal 41x54x11 (2 - Both)', 'dustSeal' => 'None', 'springs' => 'None'];
        $released->warranty_expires_at = '2026-10-13';
        $released->save();
        ServiceJob::create([
            'customer' => 'juan_rider', 'moto_model' => 'Yamaha NMAX 155',
            'plate_number' => 'ABC-1234', 'stage' => 'Tuning',
            'date_in' => '2026-07-09', 'is_warranty_claim' => true,
        ]);
        ServiceJob::create([
            'customer' => 'juan_rider', 'moto_model' => 'Yamaha NMAX 155',
            'plate_number' => 'ABC-1234', 'stage' => 'Release',
            'date_in' => '2026-06-01', 'is_warranty_claim' => true,
        ]);
        ServiceJob::create([
            'customer' => 'maria_rides', 'moto_model' => 'Honda Click 125',
            'plate_number' => 'XYZ-9999', 'stage' => 'Intake', 'date_in' => '2026-07-09',
        ]);
    }

    public function test_search_by_plate_returns_released_visits_only(): void
    {
        $response = $this->getJson('/api/jobs/search?q=ABC-1234');

        $response->assertOk()->assertJsonCount(2);
        $response->assertJsonFragment(['oil' => 'Racing Oil']);
        $response->assertJsonMissing(['stage' => 'Tuning']);
    }

    public function test_search_matches_partial_plate_customer_and_model(): void
    {
        $this->getJson('/api/jobs/search?q=ABC')->assertOk()->assertJsonCount(2);
        $this->getJson('/api/jobs/search?q=juan_rider')->assertOk()->assertJsonCount(2);
        $this->getJson('/api/jobs/search?q=Click')->assertOk()->assertJsonCount(0);
    }

    public function test_search_with_no_matches_returns_an_empty_list(): void
    {
        $this->getJson('/api/jobs/search?q=NOPE-0000')->assertOk()->assertJsonCount(0);
    }

    public function test_search_requires_at_least_two_characters(): void
    {
        $this->getJson('/api/jobs/search?q=A')->assertUnprocessable();
    }

    public function test_customers_cannot_use_the_global_search(): void
    {
        Sanctum::actingAs(AppUser::create([
            'username' => 'rider', 'password' => 'secret123',
            'role' => 'customer', 'status' => 'approved',
        ]));

        $this->getJson('/api/jobs/search?q=ABC')->assertForbidden();
    }
}
