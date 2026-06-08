<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo "\nColumns in caja:\n";
try {
    $columns = \DB::select('DESCRIBE caja');
    echo json_encode($columns, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo "caja table not found.\n";
}
echo "\nColumns in gastos:\n";
try {
    $columns = \DB::select('DESCRIBE gastos');
    echo json_encode($columns, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo "gastos table not found.\n";
}
