<?php

namespace App\Http\Controllers\Api;

use App\Enums\JobStage;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\AssignMechanicRequest;
use App\Http\Requests\StoreJobRequest;
use App\Http\Requests\UpdateSpecsRequest;
use App\Http\Requests\UpdateStageRequest;
use App\Http\Resources\ServiceJobResource;
use App\Models\AppUser;
use App\Models\ServiceJob;
use App\Notifications\JobStageChanged;
use App\Notifications\LowStockDetected;
use App\Services\BillingService;
use App\Services\InventoryDeductionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class ServiceJobController extends Controller
{
    /**
     * Stages at which a unit is still on the floor, so cancelling it only
     * discards work in progress.
     */
    private const CANCELLABLE_STAGES = [
        JobStage::Intake->value,
        JobStage::Disassembly->value,
        JobStage::Tuning->value,
    ];

    public function __construct(
        private readonly BillingService $billing,
        private readonly InventoryDeductionService $inventory,
    ) {}

    /**
     * Full job board for admin/staff.
     */
    public function index(): JsonResponse
    {
        return response()->json(ServiceJobResource::collection(ServiceJob::all()));
    }

    /**
     * Global service-history search (Objective 2.3): every job ever
     * recorded — active or released — matched by plate/engine number,
     * customer, or motorcycle model. Lets staff recover a returning
     * unit's previous tuning parameters without paper records.
     */
    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => 'required|string|min:2|max:100',
        ]);

        $term = '%'.$validated['q'].'%';

        $jobs = ServiceJob::where(function ($query) use ($term) {
            $query->where('plate_number', 'like', $term)
                ->orWhere('customer', 'like', $term)
                ->orWhere('moto_model', 'like', $term)
                ->orWhere('complaint', 'like', $term);
        })
            ->orderByDesc('date_in')
            ->limit(50)
            ->get();

        return response()->json(ServiceJobResource::collection($jobs));
    }

    /**
     * Jobs belonging to the logged-in customer only.
     */
    public function myJobs(Request $request): JsonResponse
    {
        return response()->json(ServiceJobResource::collection(
            ServiceJob::where('app_user_id', $request->user()->id)->get()
        ));
    }

    /**
     * Register a new intake and link it to the customer's account when one exists,
     * so the customer portal can show it without exposing other customers' jobs.
     */
    public function store(StoreJobRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $customerAccount = AppUser::where('username', $validated['customer'])
            ->where('role', UserRole::Customer->value)
            ->first();

        $job = ServiceJob::create([
            'customer' => $validated['customer'],
            'app_user_id' => $customerAccount?->id,
            'moto_model' => $validated['moto'],
            'plate_number' => $validated['plate'],
            'stage' => JobStage::Intake->value,
            'date_in' => $validated['dateIn'],
            'complaint' => $validated['complaint'],
        ]);

        return response()->json([
            'message' => 'Job successfully saved!',
            'job' => new ServiceJobResource($job),
        ], 201);
    }

    /**
     * Move a job through the Kanban stages. Reaching Release starts the
     * warranty window. The owner and the job's customer are notified.
     */
    public function updateStage(UpdateStageRequest $request, ServiceJob $job): JsonResponse
    {
        $job->stage = $request->validated()['stage'];

        // Coverage runs from the first release only, so a unit that bounces back
        // to Tuning and is released again does not earn a fresh warranty window.
        if ($job->stage === JobStage::Release->value && $job->warranty_expires_at === null) {
            $job->warranty_expires_at = now()->addMonths(config('shop.warranty_months'));
        }

        $job->save();

        $this->notifyStageChange($job, $request);

        return response()->json([
            'message' => 'Stage updated successfully',
            'job' => new ServiceJobResource($job),
        ]);
    }

    /**
     * Log tuning specs, compute the bill server-side, advance the job to QA,
     * and deduct the consumables used from inventory — atomically.
     */
    public function updateSpecs(UpdateSpecsRequest $request, ServiceJob $job): JsonResponse
    {
        $validated = $request->validated();

        // The bill is always computed here, never taken from the client,
        // so a tampered request cannot underpay a job. The priced lines
        // travel with the job so the receipt can show them later.
        $bill = $this->billing->breakdown(
            enginePrice: (int) $validated['enginePrice'],
            isWarrantyClaim: (bool) $validated['isWarranty'],
            oil: $validated['rawOil'] ?? $validated['oil'] ?? null,
            oilSealSize: $validated['rawOsSize'] ?? null,
            oilSealQty: (int) ($validated['rawOsQty'] ?? 0),
            dustSealSize: $validated['rawDsSize'] ?? null,
            dustSealQty: (int) ($validated['rawDsQty'] ?? 0),
            springs: $validated['rawSprings'] ?? null,
        );
        $totalBill = $bill['total'];

        $consumables = $this->inventory->consumablesFor(
            oil: $validated['rawOil'] ?? null,
            oilSealSize: $validated['rawOsSize'] ?? null,
            oilSealQty: (int) ($validated['rawOsQty'] ?? 0),
            dustSealSize: $validated['rawDsSize'] ?? null,
            dustSealQty: (int) ($validated['rawDsQty'] ?? 0),
            springs: $validated['rawSprings'] ?? null,
        );

        $ranLow = [];

        // Job update and stock movements succeed or fail together.
        DB::transaction(function () use ($job, $validated, $totalBill, $bill, $consumables, &$ranLow) {
            // Re-logging after a QA bounce: the parts from the previous attempt
            // were never fitted, so they go back before the new ones come out.
            $this->inventory->restore($this->inventory->fromSpecs($job->specs));
            $ranLow = $this->inventory->deduct($consumables);

            $job->specs = [
                'enginePrice' => (int) $validated['enginePrice'],
                'totalBill' => $totalBill,
                'oil' => $validated['oil'],
                'oilSeal' => $validated['oilSeal'],
                'dustSeal' => $validated['dustSeal'],
                'springs' => $validated['springs'],
                // What was actually taken from stock, so a revision or a
                // cancellation can put back exactly the same parts.
                'consumables' => $consumables,
                // Objective 2.3: the parts cost recorded at the moment they
                // were fitted, so later price changes cannot rewrite history.
                'partsCost' => $this->inventory->costOf($consumables),
                'billLines' => $bill['lines'],
                'billSubtotal' => $bill['subtotal'],
                'billCovered' => $bill['covered'],
            ];
            // The measured suspension setup lives in its own columns so a
            // returning unit's history can be queried and compared per visit.
            $job->oil_viscosity = $validated['oilViscosity'];
            $job->suspension_brand = $validated['suspensionBrand'];
            $job->suspension_type = $validated['suspensionType'];
            $job->spring_rate = $validated['springRate'];

            $job->is_warranty_claim = (bool) $validated['isWarranty'];
            $job->stage = JobStage::QA->value;
            $job->save();
        });

        $this->notifyStageChange($job, $request);

        // Sent only after the transaction commits, so a rolled-back job can
        // never raise a restock alarm for stock that was never taken.
        $this->notifyLowStock($ranLow);

        return response()->json([
            'message' => 'Specs logged and inventory deducted!',
            'job' => new ServiceJobResource($job),
        ]);
    }

    /**
     * Assign (or unassign) the mechanic responsible for a job.
     */
    public function assignMechanic(AssignMechanicRequest $request, ServiceJob $job): JsonResponse
    {
        $job->mechanic_name = $request->validated()['mechanic'] ?? null;
        $job->save();

        return response()->json([
            'message' => 'Mechanic assigned successfully',
            'job' => new ServiceJobResource($job),
        ]);
    }

    /**
     * Cancel a job that is still on the floor. Once a unit has passed QA its
     * billing and warranty history has to stay on record, so it cannot be
     * deleted. Any parts already logged go back to stock.
     */
    public function destroy(ServiceJob $job): JsonResponse
    {
        if (! in_array($job->stage, self::CANCELLABLE_STAGES, true)) {
            return response()->json([
                'message' => "A unit at {$job->stage} can no longer be deleted; its billing and warranty history must stay on record.",
            ], 422);
        }

        DB::transaction(function () use ($job) {
            $this->inventory->restore($this->inventory->fromSpecs($job->specs));
            $job->delete();
        });

        return response()->json(['message' => 'Job successfully deleted']);
    }

    /**
     * Notify the shop floor (owner and staff) and the job's customer about a
     * stage change, skipping whoever performed the action.
     */
    private function notifyStageChange(ServiceJob $job, Request $request): void
    {
        $recipients = AppUser::whereIn('role', [UserRole::Admin->value, UserRole::Staff->value])
            ->where('id', '!=', $request->user()->id)
            ->get();

        if ($job->app_user_id && $job->app_user_id !== $request->user()->id) {
            $customer = AppUser::find($job->app_user_id);
            if ($customer) {
                $recipients->push($customer);
            }
        }

        Notification::send($recipients, new JobStageChanged($job));
    }

    /**
     * Objective 2.4: tell the shop which consumables just hit their alert level.
     * Staff are told because they are the ones logging parts, and the owner is
     * told because restocking is owner-only. The person who logged the job is
     * included too — running the last unit down is exactly what they need to know.
     *
     * @param  list<\App\Models\InventoryItem>  $items
     */
    private function notifyLowStock(array $items): void
    {
        if ($items === []) {
            return;
        }

        $recipients = AppUser::whereIn('role', [UserRole::Admin->value, UserRole::Staff->value])->get();

        if ($recipients->isEmpty()) {
            return;
        }

        foreach ($items as $item) {
            Notification::send($recipients, new LowStockDetected($item));
        }
    }
}
