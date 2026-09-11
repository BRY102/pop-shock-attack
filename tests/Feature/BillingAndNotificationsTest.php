<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Models\InventoryItem;
use App\Models\ServiceJob;
use App\Notifications\JobStageChanged;
use App\Notifications\LowStockDetected;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BillingAndNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private AppUser $staff;

    private AppUser $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->staff = AppUser::create([
            'username' => 'tech', 'password' => 'secret123',
            'role' => 'staff', 'status' => 'approved',
        ]);
        $this->customer = AppUser::create([
            'username' => 'juan_tester', 'password' => 'secret123',
            'role' => 'customer', 'status' => 'approved',
        ]);

        // Logged specs draw on real stock, so the parts they name must exist.
        InventoryItem::create([
            'item_no' => '000001', 'name' => 'Daily Oil', 'description' => 'Standard oil',
            'stock' => 20, 'threshold' => 3, 'price' => 150,
        ]);
        InventoryItem::create([
            'item_no' => '000002', 'name' => 'Oil Seal 41x54x11', 'description' => 'Front fork seal',
            'stock' => 20, 'threshold' => 2, 'price' => 500,
        ]);

        Sanctum::actingAs($this->staff);
    }

    private function makeJob(string $stage = 'Tuning'): ServiceJob
    {
        return ServiceJob::create([
            'customer' => $this->customer->username,
            'app_user_id' => $this->customer->id,
            'moto_model' => 'Yamaha NMAX',
            'plate_number' => 'ABC-1234',
            'stage' => $stage,
            'date_in' => '2026-07-06',
            'mechanic_name' => 'Rico',
        ]);
    }

    /**
     * An earlier visit for the same unit, released and still inside its
     * warranty window — what makes a free re-service claim legitimate.
     */
    private function makeCoveredHistory(?string $expiresAt = null): ServiceJob
    {
        $previous = ServiceJob::create([
            'customer' => $this->customer->username,
            'app_user_id' => $this->customer->id,
            'moto_model' => 'Yamaha NMAX',
            'plate_number' => 'ABC-1234',
            'stage' => 'Release',
            'date_in' => '2026-05-01',
        ]);

        $previous->warranty_expires_at = $expiresAt ?? now()->addMonths(3)->toDateString();
        $previous->save();

        return $previous;
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
            'rawOil' => 'Daily Oil',
            'rawOsSize' => 'Oil Seal 41x54x11',
            'rawOsQty' => 2,
            'rawDsSize' => 'None',
            'rawDsQty' => 0,
            'rawSprings' => 'None',
        ], $overrides);
    }

    public function test_bill_is_computed_server_side_and_a_tampered_total_is_ignored(): void
    {
        $job = $this->makeJob();

        // A tampered client claims the bill is ₱1; the server must recompute:
        // ₱1,500 base + 2 oil seals x ₱300 (small class) = ₱2,100.
        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'totalBill' => 1,
        ]))->assertOk();

        $this->assertEquals(2100, $job->fresh()->specs['totalBill']);
    }

    public function test_big_bike_classes_use_the_higher_oil_seal_price(): void
    {
        $job = $this->makeJob();

        // ₱4,500 base + 2 oil seals x ₱500 (big-bike class) = ₱5,500.
        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'enginePrice' => 4500,
        ]))->assertOk();

        $this->assertEquals(5500, $job->fresh()->specs['totalBill']);
    }

    public function test_warranty_claims_are_billed_zero(): void
    {
        $this->makeCoveredHistory();
        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'isWarranty' => true,
        ]))->assertOk();

        $fresh = $job->fresh();
        $this->assertEquals(0, $fresh->specs['totalBill']);
        $this->assertTrue($fresh->is_warranty_claim);
    }

    public function test_a_free_claim_is_refused_when_the_unit_has_no_earlier_service(): void
    {
        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'isWarranty' => true,
        ]))->assertUnprocessable();

        $this->assertNull($job->fresh()->specs);
        $this->assertFalse($job->fresh()->is_warranty_claim);
    }

    public function test_a_free_claim_is_refused_once_the_earlier_coverage_has_lapsed(): void
    {
        $this->makeCoveredHistory(now()->subDay()->toDateString());
        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'isWarranty' => true,
        ]))->assertUnprocessable();

        $this->assertNull($job->fresh()->specs);
    }

    public function test_logging_specs_stores_priced_bill_lines(): void
    {
        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload())->assertOk();

        $specs = $job->fresh()->specs;
        $this->assertEquals(2100, $specs['totalBill']);
        $this->assertEquals(2100, $specs['billSubtotal']);
        $this->assertFalse($specs['billCovered']);

        $byKey = collect($specs['billLines'])->keyBy('key');
        $this->assertEquals(1500, $byKey['labor']['amount']);
        $this->assertEquals(600, $byKey['oilSeal']['amount']);
        $this->assertEquals(0, $byKey['oil']['amount']);
    }

    public function test_a_warranty_claim_lists_shop_prices_but_charges_zero(): void
    {
        $this->makeCoveredHistory();
        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'isWarranty' => true,
        ]))->assertOk();

        $specs = $job->fresh()->specs;
        $this->assertEquals(0, $specs['totalBill']);
        $this->assertEquals(2100, $specs['billSubtotal']);
        $this->assertTrue($specs['billCovered']);
        $this->assertEquals(1500, collect($specs['billLines'])->firstWhere('key', 'labor')['amount']);
    }

    public function test_logging_specs_records_what_the_parts_cost(): void
    {
        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload())->assertOk();

        // 1 x Daily Oil at ₱150 + 2 x Oil Seal 41x54x11 at ₱500 = ₱1,150.
        $this->assertEquals(1150, $job->fresh()->specs['partsCost']);
    }

    public function test_a_later_price_change_does_not_rewrite_a_recorded_parts_cost(): void
    {
        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload())->assertOk();

        InventoryItem::where('name', 'Oil Seal 41x54x11')->update(['price' => 900]);

        // The job keeps the cost from the day the parts were fitted.
        $this->assertEquals(1150, $job->fresh()->specs['partsCost']);
    }

    public function test_unknown_engine_class_prices_are_rejected(): void
    {
        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload([
            'enginePrice' => 999999,
        ]))->assertUnprocessable();
    }

    public function test_stage_change_notifies_the_shop_and_the_customer_but_not_the_actor(): void
    {
        Notification::fake();

        $owner = AppUser::create([
            'username' => 'owner_tester', 'password' => 'secret123',
            'role' => 'admin', 'status' => 'approved',
        ]);
        $otherTech = AppUser::create([
            'username' => 'second_tech', 'password' => 'secret123',
            'role' => 'staff', 'status' => 'approved',
        ]);

        $job = $this->makeJob('QA');

        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Release'])->assertOk();

        Notification::assertSentTo($this->customer, JobStageChanged::class);
        Notification::assertSentTo($owner, JobStageChanged::class);
        Notification::assertSentTo($otherTech, JobStageChanged::class);

        // Whoever moved the unit is not told about their own action.
        Notification::assertNotSentTo($this->staff, JobStageChanged::class);
    }

    public function test_running_a_consumable_down_to_its_alert_level_warns_the_shop(): void
    {
        Notification::fake();

        $owner = AppUser::create([
            'username' => 'owner_tester', 'password' => 'secret123',
            'role' => 'admin', 'status' => 'approved',
        ]);

        // Three seals left with an alert level of two: fitting a pair crosses it.
        InventoryItem::where('name', 'Oil Seal 41x54x11')->update(['stock' => 3, 'threshold' => 2]);

        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload())->assertOk();

        // The owner is warned because restocking is owner-only, and the
        // technician is warned even though they caused it — using the last
        // pair is exactly what they need to know.
        Notification::assertSentTo($owner, LowStockDetected::class);
        Notification::assertSentTo($this->staff, LowStockDetected::class);
        Notification::assertNotSentTo($this->customer, LowStockDetected::class);
    }

    public function test_a_consumable_that_is_merely_still_low_does_not_warn_again(): void
    {
        Notification::fake();

        $owner = AppUser::create([
            'username' => 'owner_tester', 'password' => 'secret123',
            'role' => 'admin', 'status' => 'approved',
        ]);

        // Already below its alert level before this job, and not emptied by it.
        InventoryItem::where('name', 'Oil Seal 41x54x11')->update(['stock' => 6, 'threshold' => 8]);

        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload())->assertOk();

        Notification::assertNotSentTo($owner, LowStockDetected::class);
    }

    public function test_emptying_a_consumable_warns_even_when_it_was_already_low(): void
    {
        Notification::fake();

        $owner = AppUser::create([
            'username' => 'owner_tester', 'password' => 'secret123',
            'role' => 'admin', 'status' => 'approved',
        ]);

        // Already low, and this job takes the last two.
        InventoryItem::where('name', 'Oil Seal 41x54x11')->update(['stock' => 2, 'threshold' => 8]);

        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload())->assertOk();

        Notification::assertSentTo($owner, LowStockDetected::class);
    }

    public function test_a_rejected_specs_log_raises_no_restock_alarm(): void
    {
        Notification::fake();

        $owner = AppUser::create([
            'username' => 'owner_tester', 'password' => 'secret123',
            'role' => 'admin', 'status' => 'approved',
        ]);

        // The oil is taken first and crosses its alert level, then the seals
        // come up short and the whole log is rejected. Nothing actually left
        // stock, so nothing should be reported as running low.
        InventoryItem::where('name', 'Daily Oil')->update(['stock' => 3, 'threshold' => 2]);
        InventoryItem::where('name', 'Oil Seal 41x54x11')->update(['stock' => 1]);

        $job = $this->makeJob();

        $this->putJson("/api/jobs/{$job->id}/specs", $this->specsPayload())->assertUnprocessable();

        Notification::assertNotSentTo($owner, LowStockDetected::class);
        $this->assertEquals(3, InventoryItem::where('name', 'Daily Oil')->value('stock'));
    }

    public function test_users_can_fetch_and_clear_their_notifications(): void
    {
        $owner = AppUser::create([
            'username' => 'owner_tester', 'password' => 'secret123',
            'role' => 'admin', 'status' => 'approved',
        ]);

        $job = $this->makeJob('QA');
        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Release'])->assertOk();

        Sanctum::actingAs($this->customer);

        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('notifications.0.data.stage', 'Release')
            ->assertJsonPath('notifications.0.data.type', 'job_stage')
            ->assertJsonPath('notifications.0.unread', true);

        $this->putJson('/api/notifications/mark-read')->assertOk();

        $this->getJson('/api/notifications')->assertJsonPath('unread_count', 0);
    }

    public function test_a_user_can_mark_one_notification_read(): void
    {
        $job = $this->makeJob('QA');
        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Release'])->assertOk();

        Sanctum::actingAs($this->customer);
        $id = $this->customer->notifications()->first()->id;

        $this->putJson("/api/notifications/{$id}/read")->assertOk();
        $this->getJson('/api/notifications')->assertJsonPath('unread_count', 0);
        $this->assertNotNull($this->customer->notifications()->first()->read_at);
    }

    public function test_a_user_cannot_mark_someone_elses_notification_read(): void
    {
        $owner = AppUser::create([
            'username' => 'owner_tester', 'password' => 'secret123',
            'role' => 'admin', 'status' => 'approved',
        ]);

        $job = $this->makeJob('QA');
        $this->putJson("/api/jobs/{$job->id}/stage", ['stage' => 'Release'])->assertOk();

        $ownerNotifId = $owner->notifications()->first()->id;

        Sanctum::actingAs($this->customer);
        $this->putJson("/api/notifications/{$ownerNotifId}/read")->assertNotFound();
        $this->assertNull($owner->notifications()->first()->read_at);
    }

    public function test_logout_revokes_the_token(): void
    {
        $token = $this->staff->createToken('api-token')->plainTextToken;

        // Real HTTP-style calls with the bearer header (not actingAs) so the
        // revocation path is exercised end-to-end.
        $this->flushHeaders();
        app('auth')->forgetGuards();

        $this->withToken($token)->postJson('/api/logout')->assertOk();

        app('auth')->forgetGuards();
        $this->withToken($token)->getJson('/api/jobs')->assertUnauthorized();
    }
}
