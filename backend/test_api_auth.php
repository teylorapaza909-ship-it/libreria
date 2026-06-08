<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Login as Moises
$user = \App\Models\Usuario::where('usuario', 'Moises')->first();
$token = $user->createToken('test-token')->plainTextToken;

// Fetch productos
$request = Illuminate\Http\Request::create('/api/productos', 'GET');
$request->headers->set('Authorization', 'Bearer ' . $token);
$response = $app->handle($request);
echo $response->getContent();
