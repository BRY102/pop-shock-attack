<?php

return [
    // How long a completed service is covered, counted from release day.
    'warranty_months' => env('SHOP_WARRANTY_MONTHS', 6),

    // The fork oil weights the shop stocks. The specs form offers these and
    // the API rejects anything else, so the viscosity log stays comparable
    // across visits instead of filling up with free-text variants.
    'oil_viscosities' => ['5W', '10W', '15W', '20W', '30W'],

    // The suspension layouts the shop services.
    'suspension_types' => [
        'Telescopic Fork',
        'Inverted (USD) Fork',
        'Mono-shock',
        'Twin-shock',
    ],

];
