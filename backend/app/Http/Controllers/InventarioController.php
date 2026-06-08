<?php

namespace App\Http\Controllers;

use App\Models\Inventario;
use Illuminate\Http\Request;

class InventarioController extends Controller
{
    public function index(Request $request)
    {
        $query = Inventario::with('producto')->orderBy('fecha', 'desc');

        if ($request->filled('fecha_inicio')) {
            $query->whereDate('fecha', '>=', $request->fecha_inicio);
        }
        if ($request->filled('fecha_fin')) {
            $query->whereDate('fecha', '<=', $request->fecha_fin);
        }
        if ($request->filled('producto')) {
            $search = $request->producto;
            $query->whereHas('producto', function($q) use ($search) {
                $q->where('nombre', 'like', "%$search%");
            });
        }

        return response()->json($query->take(500)->get());
    }
}
