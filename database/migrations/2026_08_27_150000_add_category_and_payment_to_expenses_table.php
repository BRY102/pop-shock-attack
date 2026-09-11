<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Category and how it was paid, so the Add Expense form can store
     * the fields it shows (not vendor or tax — those stay off the form).
     */
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->string('category', 40)->default('Miscellaneous')->after('id');
            $table->string('payment_method', 20)->default('Cash')->after('category');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn(['category', 'payment_method']);
        });
    }
};
