<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMechanicRequest;
use App\Http\Resources\MechanicResource;
use App\Models\Mechanic;
use Illuminate\Http\JsonResponse;

class MechanicController extends Controller
{
    /**
     * Names staff can assign on the board. Jobs keep the name
     * they were given even if this row is later deleted.
     */
    public function index(): JsonResponse
    {
        return response()->json(MechanicResource::collection(
            Mechanic::orderBy('name')->get()
        ));
    }

    public function store(StoreMechanicRequest $request): JsonResponse
    {
        $mechanic = Mechanic::create($request->validated());

        return response()->json([
            'message' => 'Mechanic added',
            'mechanic' => new MechanicResource($mechanic),
        ], 201);
    }

    public function destroy(Mechanic $mechanic): JsonResponse
    {
        $mechanic->delete();

        return response()->json(['message' => 'Mechanic removed']);
    }
}
