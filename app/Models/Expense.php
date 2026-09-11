<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    protected $fillable = [
        'category',
        'description',
        'amount',
        'date',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
    ];
}
