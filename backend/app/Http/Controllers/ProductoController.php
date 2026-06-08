<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use Illuminate\Http\Request;

class ProductoController extends Controller
{
    public function index()
    {
        // Se cargan todos los productos activos, ordenados por nombre.
        // Asumiendo que la tabla puede retornar mucha data, retornamos Collection.
        // Para sistemas grandes, se usaría paginate().
        $productos = Producto::orderBy('nombre', 'asc')
            ->get();
            
        return response()->json($productos);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'codigo_barras' => 'nullable|string|max:50|unique:productos',
            'nombre' => 'required|string|max:150',
            'precio_unidad' => 'required|numeric',
            'precio_menor' => 'nullable|numeric',
            'precio_mayor' => 'required|numeric',
            'costo' => 'required|numeric',
            'stock' => 'required|integer',
            'unidad_base' => 'nullable|string|max:50',
            'cantidad_por_caja' => 'nullable|integer|min:1',
            'precio_caja' => 'nullable|numeric|min:0',
            'tipo_caja' => 'nullable|string|in:libreria,personal',
        ]);

        // Por defecto, se crea en estado 1 (activo).
        $data['estado'] = 1;
        
        if (empty($data['precio_menor'])) {
            $data['precio_menor'] = $data['precio_unidad'];
        }
        
        if (empty($data['stock_minimo'])) {
            $data['stock_minimo'] = 0;
        }
        if (empty($data['unidad_base'])) {
            $data['unidad_base'] = 'unidad';
        }
        if (empty($data['cantidad_por_caja'])) {
            $data['cantidad_por_caja'] = 1;
        }
        if (empty($data['precio_caja'])) {
            $data['precio_caja'] = 0;
        }
        if (empty($data['tipo_caja'])) {
            $data['tipo_caja'] = 'libreria';
        }

        $producto = Producto::create($data);

        return response()->json($producto, 201);
    }

    public function show($id)
    {
        return response()->json(Producto::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $producto = Producto::findOrFail($id);

        $data = $request->validate([
            'codigo_barras' => 'nullable|string|max:50|unique:productos,codigo_barras,' . $id,
            'nombre'        => 'sometimes|required|string|max:150',
            'marca'         => 'nullable|string|max:100',
            'id_categoria'  => 'nullable|integer|exists:categorias,id',
            'precio_unidad' => 'sometimes|required|numeric',
            'precio_menor'  => 'nullable|numeric',
            'precio_mayor'  => 'sometimes|required|numeric',
            'costo'         => 'sometimes|required|numeric',
            'stock'         => 'sometimes|required|integer',
            'stock_minimo'  => 'nullable|integer',
            'estado'        => 'sometimes|boolean',
            'unidad_base' => 'nullable|string|max:50',
            'cantidad_por_caja' => 'nullable|integer|min:1',
            'precio_caja' => 'nullable|numeric|min:0',
            'tipo_caja' => 'nullable|string|in:libreria,personal',
        ]);

        if (array_key_exists('precio_menor', $data) && empty($data['precio_menor'])) {
            $data['precio_menor'] = $data['precio_unidad'] ?? $producto->precio_unidad;
        } elseif (!isset($data['precio_menor']) && isset($data['precio_unidad'])) {
            $data['precio_menor'] = $data['precio_unidad'];
        }

        if (array_key_exists('stock_minimo', $data) && $data['stock_minimo'] === null) {
            $data['stock_minimo'] = 0;
        }
        if (isset($data['unidad_base']) && empty($data['unidad_base'])) {
            $data['unidad_base'] = 'unidad';
        }
        if (isset($data['cantidad_por_caja']) && empty($data['cantidad_por_caja'])) {
            $data['cantidad_por_caja'] = 1;
        }
        if (isset($data['precio_caja']) && empty($data['precio_caja'])) {
            $data['precio_caja'] = 0;
        }
        if (isset($data['tipo_caja']) && empty($data['tipo_caja'])) {
            $data['tipo_caja'] = 'libreria';
        }

        $producto->update($data);
        return response()->json($producto);
    }

    public function destroy($id)
    {
        $producto = Producto::findOrFail($id);
        $producto->update(['estado' => 0]);
        return response()->json(['message' => 'Producto desactivado']);
    }
}
