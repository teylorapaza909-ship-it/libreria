<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Producto extends Model
{
    protected $table = 'productos';
    public $timestamps = false;
    protected $guarded = [];

    public function registrarMovimiento($tipo, $cantidad, $stockFinal)
    {
        return \App\Models\Inventario::create([
            'id_producto' => $this->id,
            'fecha' => now(),
            'tipo' => $tipo, // ENTRADA, SALIDA, AJUSTE, ANULACION
            'cantidad' => $cantidad,
            'stock_restante' => $stockFinal
        ]);
    }
}
