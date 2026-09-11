<?php

return [
    // Printed on every customer bill. The frontend copies these strings
    // because the SPA does not fetch this file at runtime.
    'identity' => [
        'name' => 'Pops Shock Attack',
        'tagline' => 'Suspension Specialists & Tuning',
        'address' => 'San Pedro, Laguna',
        'receipt_prefix' => 'PSA',
    ],

    // How long a completed service is covered, counted from release day.
    'warranty_months' => env('SHOP_WARRANTY_MONTHS', 6),

    // The fork oil weights the shop stocks. The specs form offers these and
    // the API rejects anything else, so the viscosity log stays comparable
    // across visits instead of filling up with free-text variants.
    'oil_viscosities' => ['5W', '10W', '15W', '20W', '30W'],

    // New passwords (register, owner create/edit, counter reset).
    // Login still accepts older shorter passwords so existing accounts work.
    'password_min_length' => 8,

    // A user counts as Active on Manage Users while they have been seen
    // within this many seconds (notification polling keeps a session live).
    'online_within_seconds' => 120,

    // Base front-shock labor by motorcycle class. The tuning form and
    // BillingService both read this list so a price change happens once.
    'engine_classes' => [
        ['price' => 1200, 'label' => '110-125cc Scooter/Underbone'],
        ['price' => 1500, 'label' => '150-160cc Scooter/Underbone'],
        ['price' => 2500, 'label' => 'Inverted Shock Scooter'],
        ['price' => 2800, 'label' => '150-200cc Backbone e.g., R15, MT15'],
        ['price' => 4500, 'label' => '320-450cc Backbone e.g., Ninja 400'],
        ['price' => 6500, 'label' => '500-1000cc Big Bike e.g., Ninja 650'],
    ],

    // Parts billed on top of base labor. BillingService reads these so a
    // price change happens once, same as engine_classes.
    'part_prices' => [
        'oil_seal_small' => 300,
        'oil_seal_big' => 500,
        'big_bike_labor_threshold' => 2800,
        'dust_seal' => 75,
        'springs' => 580,
    ],

    // Logged on the Add Expense form. Frontend lists the same values.
    'expense_categories' => [
        'Utilities',
        'Rent',
        'Inventory Restock',
        'Marketing',
        'Miscellaneous',
    ],

    // The suspension layouts the shop services.
    'suspension_types' => [
        'Telescopic Fork',
        'Inverted (USD) Fork',
        'Mono-shock',
        'Twin-shock',
    ],

];
