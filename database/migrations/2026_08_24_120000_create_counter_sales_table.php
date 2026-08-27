<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Walk-in income that never passes through the job board — parts sold over
     * the counter, accessories, misc receipts. Service work is still billed
     * only when its job reaches Release.
     */
    public function up(): void
    {
        Schema::create('counter_sales', function (Blueprint $table) {
            $table->id();
            $table->string('description');
            $table->decimal('amount', 10, 2);
            $table->date('date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('counter_sales');
    }
};
