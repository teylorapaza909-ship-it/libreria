<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$productosCount = \App\Models\Producto::count();
$productosActivos = \App\Models\Producto::where('estado', 1)->count();
echo json_encode(['count' => $productosCount, 'activos' => $productosActivos]);
