<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCounterSaleRequest;
use App\Http\Resources\CounterSaleResource;
use App\Models\CounterSale;
use Illuminate\Http\JsonResponse;

class CounterSaleController extends Controller
{
    /**
     * All counter sales, most recent first.
     */
    public function index(): JsonResponse
    {
        return response()->json(CounterSaleResource::collection(
            CounterSale::orderByDesc('date')->get()
        ));
    }

    /**
     * Record a walk-in sale that has no service job behind it.
     */
    public function store(StoreCounterSaleRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $sale = CounterSale::create([
            'description' => $validated['description'],
            'amount' => $validated['amount'],
            'date' => $validated['date'] ?? now()->toDateString(),
        ]);

        return response()->json([
            'message' => 'Counter sale recorded successfully',
            'sale' => new CounterSaleResource($sale),
        ], 201);
    }
}
