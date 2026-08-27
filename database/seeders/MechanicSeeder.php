<?php

namespace Database\Seeders;

use App\Models\Mechanic;
use Illuminate\Database\Seeder;

class MechanicSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['John Hendrix', 'Vince Sael', 'Dhax Allen', 'Jan Cairo'] as $name) {
            Mechanic::firstOrCreate(['name' => $name]);
        }
    }
}
