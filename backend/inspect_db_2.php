<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
try {
    echo "Cajas:\n";
    $cajas = \DB::table('caja')->get();
    echo json_encode($cajas) . "\n";
    echo "Ventas:\n";
    $ventas = \DB::table('ventas')->take(5)->get();
    echo json_encode($ventas) . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
