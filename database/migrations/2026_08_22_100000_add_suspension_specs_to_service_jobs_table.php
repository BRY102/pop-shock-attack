<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The suspension parameters the shop tunes per unit, as their own columns so a
 * returning unit's setup history can be queried and compared across visits
 * rather than only read back one job at a time.
 *
 * Nullable because they are recorded at Tuning: a unit still at Intake has no
 * measured setup yet.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_jobs', function (Blueprint $table) {
            $table->string('oil_viscosity', 20)->nullable()->after('specs');
            $table->string('suspension_brand', 100)->nullable()->after('oil_viscosity');
            $table->string('suspension_type', 50)->nullable()->after('suspension_brand');
            // Recorded in kg/mm, the unit Philippine suspension shops quote.
            $table->decimal('spring_rate', 4, 2)->nullable()->after('suspension_type');
        });
    }

    public function down(): void
    {
        Schema::table('service_jobs', function (Blueprint $table) {
            $table->dropColumn(['oil_viscosity', 'suspension_brand', 'suspension_type', 'spring_rate']);
        });
    }
};
