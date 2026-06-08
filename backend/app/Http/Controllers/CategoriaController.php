<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use Illuminate\Http\Request;

class CategoriaController extends Controller
{
    public function index()
    {
        return response()->json(Categoria::orderBy('nombre', 'asc')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre'       => 'required|string|max:100',
            'tipo_negocio' => 'nullable|in:libreria,personal',
        ]);

        $categoria = Categoria::create([
            'nombre'       => $request->nombre,
            'estado'       => 1,
            'tipo_negocio' => $request->tipo_negocio ?? 'libreria',
        ]);

        return response()->json($categoria, 201);
    }

    public function show($id)
    {
        return response()->json(Categoria::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'nombre'       => 'sometimes|required|string|max:100',
            'estado'       => 'sometimes|boolean',
            'tipo_negocio' => 'nullable|in:libreria,personal',
        ]);

        $categoria = Categoria::findOrFail($id);
        $categoria->update($request->only(['nombre', 'estado', 'tipo_negocio']));

        return response()->json($categoria);
    }

    public function destroy($id)
    {
        $categoria = Categoria::findOrFail($id);
        $categoria->update(['estado' => 0]);
        return response()->json(['message' => 'Categoría desactivada correctamente.']);
    }
}
