<?php

namespace Tests\Feature;

use App\Models\ServiceJob;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The presentation data has to actually reach the database: specs and warranty
 * dates are guarded against mass assignment, so a seeder that passes them to
 * create() leaves the owner dashboard showing no revenue at all.
 */
class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeded_jobs_keep_their_billing_and_warranty_data(): void
    {
        $this->seed(DemoSeeder::class);

        $released = ServiceJob::where('stage', 'Release')->get();

        $this->assertNotEmpty($released);

        foreach ($released as $job) {
            $this->assertIsArray($job->specs, "Job {$job->plate_number} lost its specs");
            $this->assertArrayHasKey('totalBill', $job->specs);
            $this->assertNotNull($job->warranty_expires_at, "Job {$job->plate_number} lost its warranty date");
        }

        $revenue = $released->sum(fn (ServiceJob $job) => $job->specs['totalBill']);
        $this->assertGreaterThan(0, $revenue, 'Owner dashboard would show no revenue');
    }

    public function test_the_board_is_seeded_with_a_unit_on_every_active_stage(): void
    {
        $this->seed(DemoSeeder::class);

        foreach (['Intake', 'Disassembly', 'Tuning', 'QA'] as $stage) {
            $this->assertTrue(
                ServiceJob::where('stage', $stage)->exists(),
                "No demo unit at the {$stage} stage"
            );
        }
    }

    public function test_re_running_the_seeder_does_not_duplicate_demo_records(): void
    {
        $this->seed(DemoSeeder::class);
        $firstRun = ServiceJob::count();

        $this->seed(DemoSeeder::class);

        $this->assertSame($firstRun, ServiceJob::count());
    }
}
