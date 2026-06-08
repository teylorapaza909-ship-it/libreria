<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
// Simular un usuario para evitar el 401
$user = \App\Models\User::first();
if ($user) {
    \Laravel\Sanctum\Sanctum::actingAs($user);
}
$request = Illuminate\Http\Request::create('/api/cajas-dashboard', 'GET');
$response = $app->handle($request);
echo $response->getContent();
