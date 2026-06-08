<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$productosInactivos = \App\Models\Producto::where('estado', 0)->get();
echo "Productos con estado 0: " . $productosInactivos->count() . "\n";
foreach($productosInactivos as $p) {
    echo "- ID: {$p->id}, Nombre: {$p->nombre}\n";
}

$categoriasInactivas = \App\Models\Categoria::where('estado', 0)->get();
echo "Categorias con estado 0: " . $categoriasInactivas->count() . "\n";
foreach($categoriasInactivas as $c) {
    echo "- ID: {$c->id}, Nombre: {$c->nombre}\n";
}
