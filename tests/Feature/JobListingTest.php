<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\ServiceJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class JobListingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(AppUser::create([
            'username' => 'tech',
            'password' => 'secret123',
            'role' => 'staff',
            'status' => 'approved',
        ]));
    }

    public function test_index_returns_only_jobs_still_on_the_floor(): void
    {
        ServiceJob::create([
            'customer' => 'walkin', 'moto_model' => 'Honda Click 125',
            'plate_number' => 'ACT-0001', 'stage' => 'Tuning', 'date_in' => '2026-07-09',
        ]);
        ServiceJob::create([
            'customer' => 'walkin', 'moto_model' => 'Yamaha NMAX 155',
            'plate_number' => 'REL-0001', 'stage' => 'Release', 'date_in' => '2026-04-10',
        ]);

        $this->getJson('/api/jobs')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['plate_number' => 'ACT-0001'])
            ->assertJsonMissing(['plate_number' => 'REL-0001']);
    }

    public function test_released_endpoint_returns_only_completed_jobs(): void
    {
        ServiceJob::create([
            'customer' => 'walkin', 'moto_model' => 'Honda Click 125',
            'plate_number' => 'ACT-0001', 'stage' => 'QA', 'date_in' => '2026-07-09',
        ]);
        ServiceJob::create([
            'customer' => 'walkin', 'moto_model' => 'Yamaha NMAX 155',
            'plate_number' => 'REL-0001', 'stage' => 'Release', 'date_in' => '2026-04-10',
        ]);

        $this->getJson('/api/jobs/released')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['plate_number' => 'REL-0001'])
            ->assertJsonMissing(['plate_number' => 'ACT-0001']);
    }

    public function test_released_endpoint_can_filter_by_date_in_range(): void
    {
        ServiceJob::create([
            'customer' => 'walkin', 'moto_model' => 'Honda Click 125',
            'plate_number' => 'APR-0001', 'stage' => 'Release', 'date_in' => '2026-04-10',
        ]);
        ServiceJob::create([
            'customer' => 'walkin', 'moto_model' => 'Yamaha NMAX 155',
            'plate_number' => 'JUL-0001', 'stage' => 'Release', 'date_in' => '2026-07-09',
        ]);

        $this->getJson('/api/jobs/released?start=2026-07-01&end=2026-07-31')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['plate_number' => 'JUL-0001']);
    }

    public function test_history_returns_released_jobs_newest_first(): void
    {
        ServiceJob::create([
            'customer' => 'walkin', 'moto_model' => 'Honda Click 125',
            'plate_number' => 'OLD-0001', 'stage' => 'Release', 'date_in' => '2026-04-10',
        ]);
        ServiceJob::create([
            'customer' => 'walkin', 'moto_model' => 'Yamaha NMAX 155',
            'plate_number' => 'CLAIM-0001', 'stage' => 'Release',
            'date_in' => '2026-07-09', 'is_warranty_claim' => true,
        ]);
        ServiceJob::create([
            'customer' => 'walkin', 'moto_model' => 'Suzuki Raider',
            'plate_number' => 'TUNE-0001', 'stage' => 'Tuning', 'date_in' => '2026-07-20',
        ]);

        $this->getJson('/api/jobs/history')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.plate_number', 'CLAIM-0001')
            ->assertJsonPath('1.plate_number', 'OLD-0001')
            ->assertJsonMissing(['plate_number' => 'TUNE-0001']);
    }
}
