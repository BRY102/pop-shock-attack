<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\InventoryItem;
use App\Models\ServiceJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class JobWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function actAsStaff(): void
    {
        Sanctum::actingAs(AppUser::create([
            'username' => 'tech',
            'password' => 'secret123',
            'role' => 'staff',
            'status' => 'approved',
        ]));
    }

    private function makeJob(string $stage = 'Intake'): ServiceJob
    {
        return ServiceJob::create([
            'customer' => 'walkin',
            'moto_model' => 'Suzuki Raider 150',
            'plate_number' => 'TST-0001',
            'stage' => $stage,
            'date_in' => '2026-07-05',
        ]);
    }

    /**
     * Specs can only name consumables that exist in the catalog, so the stock
     * they draw on has to be seeded for the request to succeed.
     */
    private function seedConsumables(int $oilStock = 10, int $sealStock = 5): void
    {
        InventoryItem::create([
            'item_no' => '000001', 'name' => 'Daily Oil', 'description' => 'Standard oil',
            'stock' => $oilStock, 'threshold' => 3, 'price' => 150,
        ]);
        InventoryItem::create([
            'item_no' => '000002', 'name' => 'Oil Seal 41x54x11', 'description' => 'Front fork seal',
            'stock' => $sealStock, 'threshold' => 2, 'price' => 500,
        ]);
    }

    private function specsPayload(array $overrides = []): array
    {
        return array_merge([
            'enginePrice' => 1500,
            'oil' => 'Daily Oil',
            'oilSeal' => 'Oil Seal 41x54x11 (2 - Both)',
            'dustSeal' => 'None',
            'springs' => 'None',
            'isWarranty' => false,
            'oilViscosity' => '10W',
            'suspensionBrand' => 'YSS',
            'suspensionType' => 'Telescopic Fork',
            'springRate' => 0.85,
            'rawOil' => 'Daily Oil',
            'rawOsSize' => 'Oil Seal 41x54x11',
            'rawOsQty' => 2,
            'rawDsSize' => 'None',
            'rawDsQty' => 0,
            'rawSprings' => 'None',
        ], $overrides);
    }

    private function stockOf(string $name): int
    {
        return InventoryItem::where('name', $name)->value('stock');
    }

    public function test_staff_can_register_a_new_intake(): void
    {
        $this->actAsStaff();

        $this->postJson('/api/jobs', [
            'customer' => 'walkin',
            'moto' => 'Honda Beat',
            'plate' => 'NEW-0001',
            'dateIn' => '2026-07-05',
            'timeIn' => '09:30',
            'complaint' => 'Front fork leaking oil',
        ])->assertCreated();

        $this->assertDatabaseHas('service_jobs', [
            'plate_number' => 'NEW-0001',
            'stage' => 'Intake',
            'complaint' => 'Front fork leaking oil',
        ]);
        $this->assertStringStartsWith('09:30', (string) \App\Models\ServiceJob::where('plate_number', 'NEW-0001')->value('time_in'));
    }

    public function test_a_plate_cannot_have_two_active_jobs_at_once(): void
    {
        $this->actAsStaff();
        $this->makeJob('Tuning');

        $this->postJson('/api/jobs', [
            'customer' => 'walkin',
            'moto' => 'Suzuki Raider 150',
            'plate' => 'TST-0001',
            'dateIn' => '2026-07-06',
            'timeIn' => '09:30',
            'complaint' => 'Still leaking after last visit',
        ])->assertUnprocessable();

        $this->assertSame(1, ServiceJob::where('plate_number', 'TST-0001')->count());
    }

    public function test_a_returning_unit_can_be_re_admitted_once_its_last_visit_was_released(): void
    {
        $this->actAsStaff();
        $this->makeJob('Release');

        $this->postJson('/api/jobs', [
            'customer' => 'walkin',
            'moto' => 'Suzuki Raider 150',
            'plate' => 'TST-0001',
            'dateIn' => '2026-07-06',
            'timeIn' => '09:30',
            'complaint' => 'Returning for a fresh rebuild',
        ])->assertCreated();

        $this->assertSame(2, ServiceJob::where('plate_number', 'TST-0001')->count());
    }

    public function test_intake_requires_why_the_unit_came_in(): void
    {
        $this->actAsStaff();

        $this->postJson('/api/jobs', [
            'customer' => 'walkin',
            'moto' => 'Honda Beat',
            'plate' => 'NEW-0002',
            'dateIn' => '2026-07-05',
        ])->assertUnprocessable();
    }

    public function test_intake_cannot_be_dated_after_today(): void
    {
        $this->actAsStaff();

        $this->postJson('/api/jobs', [
            'customer' => 'walkin',
            'moto' => 'Honda Beat',
            'plate' => 'NEW-0003',
            'dateIn' => now()->addDay()->toDateString(),
            'timeIn' => '09:30',
            'complaint' => 'Front fork leaking oil',
        ])->assertUnprocessable();
    }

    public function test_releasing_a_job_starts_the_six_month_warranty(): void
    {
        $this->actAsStaff();
        $job = $this->makeJob('QA');

        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Release'])->assertOk();

        $job->refresh();
        $this->assertNotNull($job->warranty_expires_at);
        $this->assertTrue($job->warranty_expires_at->isSameDay(now()->addMonths(6)));
        $this->assertTrue($job->released_at->isSameDay(now()));
        $this->assertStringStartsWith('Active', $job->warranty_status);
    }

    public function test_invalid_stage_names_are_rejected(): void
    {
        $this->actAsStaff();
        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'NotARealStage'])
            ->assertUnprocessable();
    }

    public function test_the_workflow_cannot_be_skipped_by_calling_the_api_directly(): void
    {
        $this->actAsStaff();
        $job = $this->makeJob('Intake');

        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Release'])
            ->assertUnprocessable();
        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Tuning'])
            ->assertUnprocessable();

        $this->assertSame('Intake', $job->fresh()->stage);
        $this->assertNull($job->fresh()->warranty_expires_at);

        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Disassembly'])->assertOk();
        $this->assertSame('Disassembly', $job->fresh()->stage);
    }

    public function test_qa_can_send_a_unit_back_to_tuning_for_rework(): void
    {
        $this->actAsStaff();
        $job = $this->makeJob('QA');

        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Tuning'])->assertOk();

        $this->assertSame('Tuning', $job->fresh()->stage);
    }

    public function test_a_released_unit_can_no_longer_be_moved(): void
    {
        $this->actAsStaff();
        $job = $this->makeJob('Release');

        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Tuning'])
            ->assertUnprocessable();

        $this->assertSame('Release', $job->fresh()->stage);
    }

    public function test_a_second_release_does_not_extend_the_original_warranty(): void
    {
        $this->actAsStaff();
        $job = $this->makeJob('QA');

        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Release'])->assertOk();
        $original = $job->fresh()->warranty_expires_at;
        $originalReleased = $job->fresh()->released_at;

        // A unit that was pushed back for rework and released a second time
        // keeps the coverage window that started on its first release.
        $job->refresh();
        $job->stage = 'QA';
        $job->save();
        $this->travel(10)->days();

        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Release'])->assertOk();

        $this->assertTrue($job->fresh()->warranty_expires_at->isSameDay($original));
        $this->assertTrue($job->fresh()->released_at->isSameDay($originalReleased));
    }

    public function test_logging_specs_deducts_consumables_and_advances_to_qa(): void
    {
        $this->actAsStaff();
        $job = $this->makeJob('Tuning');
        $this->seedConsumables(oilStock: 10, sealStock: 5);

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload(['totalBill' => 2100]))
            ->assertOk();

        $this->assertSame('QA', $job->fresh()->stage);
        $this->assertSame(9, $this->stockOf('Daily Oil'));
        $this->assertSame(3, $this->stockOf('Oil Seal 41x54x11'));
    }

    public function test_logging_specs_records_the_suspension_setup(): void
    {
        $this->actAsStaff();
        $job = $this->makeJob('Tuning');
        $this->seedConsumables();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'oilViscosity' => '15W',
            'suspensionBrand' => 'Ohlins',
            'suspensionType' => 'Inverted (USD) Fork',
            'springRate' => 1.05,
        ]))->assertOk();

        $fresh = $job->fresh();
        $this->assertSame('15W', $fresh->oil_viscosity);
        $this->assertSame('Ohlins', $fresh->suspension_brand);
        $this->assertSame('Inverted (USD) Fork', $fresh->suspension_type);
        $this->assertSame(1.05, $fresh->spring_rate);
    }

    public function test_a_suspension_setup_outside_the_shop_vocabulary_is_rejected(): void
    {
        $this->actAsStaff();
        $this->seedConsumables();
        $job = $this->makeJob('Tuning');

        // Free-text viscosities would make the setup history incomparable
        // between visits, which is the whole point of logging it.
        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'oilViscosity' => '12.5 weight-ish',
        ]))->assertUnprocessable();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'suspensionType' => 'Hoverboard',
        ]))->assertUnprocessable();

        $this->assertNull($job->fresh()->oil_viscosity);
    }

    public function test_a_returning_unit_keeps_the_setup_from_each_visit(): void
    {
        $this->actAsStaff();
        $this->seedConsumables(oilStock: 10, sealStock: 6);

        // First visit: released with its measured setup.
        $first = $this->makeJob('Tuning');
        $this->putJson("/api/jobs/{$first->id}/specs", $this->specsPayload([
            'oilViscosity' => '10W',
            'springRate' => 0.85,
        ]))->assertOk();
        $this->putJson("/api/jobs/{$first->id}/stage", ['stage' => 'Release'])->assertOk();

        // Same plate comes back and is tuned stiffer.
        $second = ServiceJob::create([
            'customer' => 'walkin',
            'moto_model' => 'Suzuki Raider 150',
            'plate_number' => $first->plate_number,
            'stage' => 'Tuning',
            'date_in' => '2026-07-20',
        ]);
        $this->putJson("/api/jobs/{$second->id}/specs", $this->specsPayload([
            'oilViscosity' => '20W',
            'springRate' => 1.10,
        ]))->assertOk();

        // Each visit keeps its own setup, so the change is on record.
        $this->assertSame('10W', $first->fresh()->oil_viscosity);
        $this->assertSame(0.85, $first->fresh()->spring_rate);
        $this->assertSame('20W', $second->fresh()->oil_viscosity);
        $this->assertSame(1.10, $second->fresh()->spring_rate);
    }

    public function test_specs_can_only_be_logged_while_a_unit_is_in_tuning(): void
    {
        $this->actAsStaff();
        $this->seedConsumables();
        $job = $this->makeJob('Intake');

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload())
            ->assertUnprocessable();

        $this->assertSame('Intake', $job->fresh()->stage);
        $this->assertNull($job->fresh()->specs);
        $this->assertSame(10, $this->stockOf('Daily Oil'));
    }

    public function test_relogging_specs_after_a_qa_bounce_does_not_deduct_twice(): void
    {
        $this->actAsStaff();
        $this->seedConsumables(oilStock: 10, sealStock: 6);
        $job = $this->makeJob('Tuning');

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload())->assertOk();
        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Tuning'])->assertOk();
        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload())->assertOk();

        $this->assertSame(9, $this->stockOf('Daily Oil'));
        $this->assertSame(4, $this->stockOf('Oil Seal 41x54x11'));
    }

    public function test_revising_specs_returns_the_parts_that_are_no_longer_used(): void
    {
        $this->actAsStaff();
        $this->seedConsumables(oilStock: 10, sealStock: 6);
        $job = $this->makeJob('Tuning');

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload())->assertOk();
        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Tuning'])->assertOk();

        // Second look: the seals turned out not to need replacing.
        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'oilSeal' => 'None',
            'rawOsSize' => 'None',
            'rawOsQty' => 0,
        ]))->assertOk();

        $this->assertSame(6, $this->stockOf('Oil Seal 41x54x11'));
        $this->assertSame(9, $this->stockOf('Daily Oil'));
        $this->assertSame(1500, $job->fresh()->specs['totalBill']);
    }

    public function test_specs_are_rejected_when_a_consumable_is_short_and_nothing_is_deducted(): void
    {
        $this->actAsStaff();
        $this->seedConsumables(oilStock: 10, sealStock: 1);
        $job = $this->makeJob('Tuning');

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload())
            ->assertUnprocessable();

        $this->assertSame('Tuning', $job->fresh()->stage);
        $this->assertNull($job->fresh()->specs);

        // The oil is taken out before the seals fail, so the whole request has
        // to roll back rather than leave stock half-deducted.
        $this->assertSame(10, $this->stockOf('Daily Oil'));
        $this->assertSame(1, $this->stockOf('Oil Seal 41x54x11'));
    }

    public function test_specs_are_rejected_when_a_consumable_is_not_in_the_catalog(): void
    {
        $this->actAsStaff();
        $this->seedConsumables();
        $job = $this->makeJob('Tuning');

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'springs' => 'Lowering Spring 9.9 inch',
            'rawSprings' => 'Lowering Spring 9.9 inch',
        ]))->assertUnprocessable();

        $this->assertNull($job->fresh()->specs);
        $this->assertSame(10, $this->stockOf('Daily Oil'));
    }

    public function test_cancelling_a_job_returns_its_logged_parts_to_stock(): void
    {
        $this->actAsStaff();
        $this->seedConsumables(oilStock: 10, sealStock: 6);
        $job = $this->makeJob('Tuning');

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload())->assertOk();
        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Tuning'])->assertOk();
        $this->deleteJson("/api/jobs/{$job->id}")->assertOk();

        $this->assertDatabaseMissing('service_jobs', ['id' => $job->id]);
        $this->assertSame(10, $this->stockOf('Daily Oil'));
        $this->assertSame(6, $this->stockOf('Oil Seal 41x54x11'));
    }

    public function test_a_billed_or_released_job_cannot_be_deleted(): void
    {
        $this->actAsStaff();

        $released = $this->makeJob('Release');
        $this->deleteJson("/api/jobs/{$released->id}")->assertUnprocessable();
        $this->assertDatabaseHas('service_jobs', ['id' => $released->id]);

        $inQa = ServiceJob::create([
            'customer' => 'walkin',
            'moto_model' => 'Honda Beat',
            'plate_number' => 'TST-0002',
            'stage' => 'QA',
            'date_in' => '2026-07-05',
        ]);
        $this->deleteJson("/api/jobs/{$inQa->id}")->assertUnprocessable();
        $this->assertDatabaseHas('service_jobs', ['id' => $inQa->id]);
    }
}
