<?php

namespace App\Http\Controllers;

use App\Models\Proveedor;
use Illuminate\Http\Request;

class ProveedorController extends Controller
{
    public function index()
    {
        return response()->json(Proveedor::orderBy('nombre', 'asc')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre'   => 'required|string|max:150',
            'telefono' => 'nullable|string|max:20',
        ]);

        $proveedor = Proveedor::create([
            'nombre'   => $request->nombre,
            'telefono' => $request->telefono,
            'estado'   => 1,
        ]);

        return response()->json($proveedor, 201);
    }

    public function show($id)
    {
        return response()->json(Proveedor::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'nombre'   => 'sometimes|required|string|max:150',
            'telefono' => 'nullable|string|max:20',
            'estado'   => 'sometimes|boolean',
        ]);

        $proveedor = Proveedor::findOrFail($id);
        $proveedor->update($request->only(['nombre', 'telefono', 'estado']));

        return response()->json($proveedor);
    }

    public function destroy($id)
    {
        $proveedor = Proveedor::findOrFail($id);
        $proveedor->update(['estado' => 0]);
        return response()->json(['message' => 'Proveedor desactivado correctamente.']);
    }
}
