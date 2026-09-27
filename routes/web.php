<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// Main Application Portal (Staff & Customer SPA)
Route::get('/', function () {
    return view('index');
});

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
