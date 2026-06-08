<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
try {
    \DB::statement("ALTER TABLE gastos ADD tipo ENUM('entrada', 'salida') DEFAULT 'salida' AFTER monto;");
    echo "Columna 'tipo' agregada a 'gastos'.\n";
} catch (\Exception $e) {
    echo "No se pudo alterar 'gastos': " . $e->getMessage() . "\n";
}
