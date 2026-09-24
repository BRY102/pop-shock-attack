<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('service_jobs', function (Blueprint $table) {
            $table->string('payment_method', 50)->nullable()->after('released_at');
            $table->decimal('amount_paid', 10, 2)->nullable()->after('payment_method');
            $table->decimal('change_amount', 10, 2)->nullable()->after('amount_paid');
            $table->string('payment_reference', 100)->nullable()->after('change_amount');
            $table->string('payment_notes', 255)->nullable()->after('payment_reference');
            $table->string('released_by', 100)->nullable()->after('payment_notes');
            $table->timestamp('paid_at')->nullable()->after('released_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_jobs', function (Blueprint $table) {
            $table->dropColumn([
                'payment_method',
                'amount_paid',
                'change_amount',
                'payment_reference',
                'payment_notes',
                'released_by',
                'paid_at',
            ]);
        });
    }

};
