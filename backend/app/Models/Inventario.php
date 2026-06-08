<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Inventario extends Model
{
    protected $table = 'inventario';
    public $timestamps = false;
    protected $guarded = [];

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'id_producto');
    }
}
