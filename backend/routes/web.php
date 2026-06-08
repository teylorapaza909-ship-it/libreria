<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Ruta nombrada 'login' requerida por el middleware de autenticación de Laravel/Sanctum.
// Cuando una petición API llega sin token, en lugar de redirigir a una vista inexistente,
// devuelve un JSON 401 limpio que el frontend puede manejar correctamente.
Route::get('/login', function () {
    return response()->json(['message' => 'No autenticado. Por favor inicie sesión.'], 401);
})->name('login');
