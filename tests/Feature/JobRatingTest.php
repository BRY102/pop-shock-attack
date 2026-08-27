<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\ServiceJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class JobRatingTest extends TestCase
{
    use RefreshDatabase;

    private AppUser $customer;

    private AppUser $other;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = AppUser::create([
            'username' => 'rider_one',
            'password' => 'secret123',
            'role' => 'customer',
            'status' => 'approved',
        ]);
        $this->other = AppUser::create([
            'username' => 'rider_two',
            'password' => 'secret123',
            'role' => 'customer',
            'status' => 'approved',
        ]);
    }

    private function makeJob(array $overrides = []): ServiceJob
    {
        return ServiceJob::create(array_merge([
            'customer' => $this->customer->username,
            'app_user_id' => $this->customer->id,
            'moto_model' => 'Honda Click 125',
            'plate_number' => 'RAT-0001',
            'stage' => 'Release',
            'date_in' => '2026-08-01',
        ], $overrides));
    }

    public function test_a_customer_can_rate_their_released_job_once(): void
    {
        Sanctum::actingAs($this->customer);
        $job = $this->makeJob();

        $this->postJson("/api/jobs/{$job->id}/rating", [
            'rating' => 4,
            'comment' => 'Fork still a bit stiff',
        ])
            ->assertOk()
            ->assertJsonPath('job.rating', 4)
            ->assertJsonPath('job.rating_comment', 'Fork still a bit stiff');

        $this->assertDatabaseHas('service_jobs', [
            'id' => $job->id,
            'rating' => 4,
            'rating_comment' => 'Fork still a bit stiff',
        ]);
        $this->assertNotNull($job->fresh()->rated_at);
    }

    public function test_a_rating_cannot_be_changed_after_submit(): void
    {
        Sanctum::actingAs($this->customer);
        $job = $this->makeJob();
        $job->rating = 5;
        $job->rated_at = now();
        $job->save();

        $this->postJson("/api/jobs/{$job->id}/rating", ['rating' => 1])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'This job already has a rating.');

        $this->assertSame(5, $job->fresh()->rating);
    }

    public function test_a_job_cannot_be_rated_before_release(): void
    {
        Sanctum::actingAs($this->customer);
        $job = $this->makeJob(['stage' => 'QA']);

        $this->postJson("/api/jobs/{$job->id}/rating", ['rating' => 5])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Rate this job after the shop releases it.');

        $this->assertNull($job->fresh()->rating);
    }

    public function test_a_customer_cannot_rate_someone_elses_job(): void
    {
        Sanctum::actingAs($this->other);
        $job = $this->makeJob();

        $this->postJson("/api/jobs/{$job->id}/rating", ['rating' => 5])
            ->assertForbidden();

        $this->assertNull($job->fresh()->rating);
    }

    public function test_staff_cannot_submit_a_customer_rating(): void
    {
        $job = $this->makeJob();
        Sanctum::actingAs(AppUser::create([
            'username' => 'tech',
            'password' => 'secret123',
            'role' => 'staff',
            'status' => 'approved',
        ]));

        $this->postJson("/api/jobs/{$job->id}/rating", ['rating' => 5])
            ->assertForbidden();
    }

    public function test_rating_must_be_one_to_five_and_comment_is_optional(): void
    {
        Sanctum::actingAs($this->customer);
        $job = $this->makeJob();

        $this->postJson("/api/jobs/{$job->id}/rating", ['rating' => 6])
            ->assertUnprocessable();

        $this->postJson("/api/jobs/{$job->id}/rating", ['rating' => 5])
            ->assertOk()
            ->assertJsonPath('job.rating', 5)
            ->assertJsonPath('job.rating_comment', null);
    }

    public function test_my_jobs_includes_rating_fields(): void
    {
        Sanctum::actingAs($this->customer);
        $job = $this->makeJob();
        $job->rating = 3;
        $job->rating_comment = 'Okay';
        $job->rated_at = now();
        $job->save();

        $this->getJson('/api/my-jobs')
            ->assertOk()
            ->assertJsonPath('0.rating', 3)
            ->assertJsonPath('0.rating_comment', 'Okay');
    }
}
