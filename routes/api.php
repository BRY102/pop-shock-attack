<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CounterSaleController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\InventoryItemController;
use App\Http\Controllers\Api\MechanicController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ServiceJobController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/
Route::middleware('throttle:5,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [PasswordResetController::class, 'store']);
});

/*
|--------------------------------------------------------------------------
| Authenticated routes (Authorization: Bearer <token>)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'seen', 'activity'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    Route::post('/activity-logs', [ActivityLogController::class, 'store']);

    // Notifications (every role has their own)
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::put('/notifications/mark-read', [NotificationController::class, 'markAllRead']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markOneRead']);

    // Customer portal
    Route::middleware('role:customer')->group(function () {
        Route::get('/my-jobs', [ServiceJobController::class, 'myJobs']);
        Route::post('/jobs/{job}/rating', [ServiceJobController::class, 'rate']);
    });

    // Shop operations (owner + staff)
    Route::middleware('role:admin,staff')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::put('/users/{user}/approve', [UserController::class, 'approve']);

        Route::get('/password-resets', [PasswordResetController::class, 'index']);
        Route::put('/password-resets/{passwordReset}/complete', [PasswordResetController::class, 'complete']);

        Route::get('/inventory', [InventoryItemController::class, 'index']);
        Route::get('/inventory/low-stock', [InventoryItemController::class, 'lowStock']);

        Route::get('/expenses', [ExpenseController::class, 'index']);
        Route::post('/expenses', [ExpenseController::class, 'store']);

        Route::get('/jobs', [ServiceJobController::class, 'index']);
        Route::get('/jobs/released', [ServiceJobController::class, 'released']);
        Route::get('/jobs/history', [ServiceJobController::class, 'history']);
        Route::get('/jobs/backjobs', [ServiceJobController::class, 'backjobs']);
        Route::get('/jobs/search', [ServiceJobController::class, 'search']);
        Route::post('/jobs', [ServiceJobController::class, 'store']);
        Route::put('/jobs/{job}/stage', [ServiceJobController::class, 'updateStage']);
        Route::put('/jobs/{job}/specs', [ServiceJobController::class, 'updateSpecs']);
        Route::put('/jobs/{job}/details', [ServiceJobController::class, 'updateDetails']);
        Route::put('/jobs/{job}/mechanic', [ServiceJobController::class, 'assignMechanic']);

        Route::get('/mechanics', [MechanicController::class, 'index']);
        Route::delete('/jobs/{job}', [ServiceJobController::class, 'destroy']);
    });

    // Owner-only management
    Route::middleware('role:admin')->group(function () {
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);

        Route::post('/mechanics', [MechanicController::class, 'store']);
        Route::delete('/mechanics/{mechanic}', [MechanicController::class, 'destroy']);

        // Walk-in income the owner logs from the dashboard
        Route::get('/counter-sales', [CounterSaleController::class, 'index']);
        Route::post('/counter-sales', [CounterSaleController::class, 'store']);

        Route::post('/inventory', [InventoryItemController::class, 'store']);
        Route::put('/inventory/{item}/add-stock', [InventoryItemController::class, 'addStock']);
        Route::put('/inventory/{item}', [InventoryItemController::class, 'update']);
        Route::delete('/inventory/{item}', [InventoryItemController::class, 'destroy']);
    });
});
