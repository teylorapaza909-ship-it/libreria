<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
try {
    $gastos = \DB::table('gastos')->get();
    foreach ($gastos as $g) {
        echo "ID: " . $g->id . " - Desc: " . $g->descripcion . " - Enc: " . mb_detect_encoding($g->descripcion) . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
