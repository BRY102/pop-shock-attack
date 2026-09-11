<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The calendar day the unit left the shop. Kept separate from
     * updated_at so a later rating cannot rewrite the bill date.
     */
    public function up(): void
    {
        Schema::table('service_jobs', function (Blueprint $table) {
            $table->date('released_at')->nullable()->after('date_in');
        });

        $months = (int) config('shop.warranty_months', 6);

        foreach (DB::table('service_jobs')->where('stage', 'Release')->orderBy('id')->get() as $job) {
            $released = null;
            if (! empty($job->warranty_expires_at)) {
                $released = Carbon::parse($job->warranty_expires_at)->subMonths($months)->toDateString();
            } elseif (! empty($job->updated_at)) {
                $released = Carbon::parse($job->updated_at)->toDateString();
            }

            if ($released) {
                DB::table('service_jobs')->where('id', $job->id)->update(['released_at' => $released]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('service_jobs', function (Blueprint $table) {
            $table->dropColumn('released_at');
        });
    }
};
