<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Why the unit came in. The paper ticket used to carry this, and without
 * it the mechanic has to ask the customer again — or guess.
 *
 * Nullable so jobs logged before this column still load.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_jobs', function (Blueprint $table) {
            $table->string('complaint', 500)->nullable()->after('date_in');
        });
    }

    public function down(): void
    {
        Schema::table('service_jobs', function (Blueprint $table) {
            $table->dropColumn('complaint');
        });
    }
};
