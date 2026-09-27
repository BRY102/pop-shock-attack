<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// Dedicated Administrator Portal
Route::get('/admin', function () {
    return view('admin.login');
});

Route::get('/admin/login', function () {
    return view('admin.login');
});

// Redirect legacy /index.html directly to root
Route::get('/index.html', function () {
    return redirect('/');
});

// Main Application Portal (Staff & Customer SPA)
Route::get('/', function () {
    return view('index');
});

// SPA View Routes (Clean Path URLs)
$spaViews = 'login|overview|kanban|transactions|history|warranty|inventory|reports|backjobs|users|approvals|customer|customer-prev';

Route::get('/{view}', function () {
    return view('index');
})->where('view', '(?i:' . $spaViews . ')');

