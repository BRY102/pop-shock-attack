<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\AppUser;
use App\Models\ServiceJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class JobDetailsTest extends TestCase
{
    use RefreshDatabase;

    private function actAsStaff(): AppUser
    {
        $staff = AppUser::create([
            'username' => 'tech',
            'password' => 'secret123',
            'role' => 'staff',
            'status' => 'approved',
        ]);
        Sanctum::actingAs($staff);

        return $staff;
    }

    private function makeJob(string $stage = 'Disassembly', array $overrides = []): ServiceJob
    {
        return ServiceJob::create(array_merge([
            'customer' => 'walkin',
            'moto_model' => 'Yamaha Aerox 155',
            'plate_number' => 'EDT-0001',
            'stage' => $stage,
            'date_in' => '2026-07-05',
            'time_in' => '09:30',
            'complaint' => 'Front fork leaking oil',
            'mechanic_name' => $stage === 'Intake' ? null : 'Rico',
        ], $overrides));
    }

    private function detailsPayload(array $overrides = []): array
    {
        return array_merge([
            'customer' => 'walkin',
            'moto' => 'Yamaha Aerox 155',
            'plate' => 'EDT-0001',
            'dateIn' => '2026-07-05',
            'timeIn' => '09:30',
            'complaint' => 'Front fork leaking oil',
        ], $overrides);
    }

    public function test_staff_can_correct_details_at_disassembly(): void
    {
        $this->actAsStaff();
        $rider = AppUser::create([
            'username' => 'maria_rides',
            'password' => 'secret123',
            'role' => 'customer',
            'status' => 'approved',
        ]);
        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/details", $this->detailsPayload([
            'customer' => 'Maria_Rides',
            'moto' => 'Honda Click 125',
            'plate' => 'hcu-987',
            'dateIn' => '2026-07-04',
            'timeIn' => '14:15',
            'complaint' => 'Wrong plate was logged at intake',
        ]))->assertOk();

        $job->refresh();
        $this->assertSame('maria_rides', $job->customer);
        $this->assertSame($rider->id, $job->app_user_id);
        $this->assertSame('Honda Click 125', $job->moto_model);
        $this->assertSame('HCU-987', $job->plate_number);
        $this->assertSame('2026-07-04', $job->date_in);
        $this->assertSame('14:15', substr((string) $job->time_in, 0, 5));
        $this->assertSame('Wrong plate was logged at intake', $job->complaint);
        $this->assertSame('Rico', $job->mechanic_name);
        $this->assertSame('Disassembly', $job->stage);
    }

    public function test_details_cannot_be_changed_after_disassembly(): void
    {
        $this->actAsStaff();
        $job = $this->makeJob('Tuning');

        $this->putJson("/api/jobs/{$job->id}/details", $this->detailsPayload([
            'customer' => 'juan_rider',
            'moto' => 'Honda Click 125',
            'complaint' => 'Trying to edit too late',
        ]))->assertUnprocessable();

        $this->assertSame('walkin', $job->fresh()->customer);
    }

    public function test_corrected_plate_cannot_collide_with_another_active_job(): void
    {
        $this->actAsStaff();
        $this->makeJob('Intake', [
            'plate_number' => 'TAKEN-1',
            'mechanic_name' => null,
        ]);
        $job = $this->makeJob('Disassembly', ['plate_number' => 'EDT-0002']);

        $this->putJson("/api/jobs/{$job->id}/details", $this->detailsPayload([
            'plate' => 'TAKEN-1',
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors('plate');
    }

    public function test_correcting_details_is_recorded(): void
    {
        $this->actAsStaff();
        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/details", $this->detailsPayload([
            'plate' => 'EDT-0099',
        ]))->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'Corrected details on EDT-0001',
        ]);
        $this->assertSame(1, ActivityLog::count());
    }

    public function test_customers_cannot_correct_job_details(): void
    {
        $job = $this->makeJob();
        Sanctum::actingAs(AppUser::create([
            'username' => 'rider',
            'password' => 'secret123',
            'role' => 'customer',
            'status' => 'approved',
        ]));

        $this->putJson("/api/jobs/{$job->id}/details", [
            'customer' => 'rider',
            'moto' => 'Honda Click 125',
            'plate' => 'EDT-0001',
            'complaint' => 'Should not work',
        ])->assertForbidden();
    }
}
