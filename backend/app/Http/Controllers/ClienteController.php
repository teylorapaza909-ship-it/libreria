<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use Illuminate\Http\Request;

class ClienteController extends Controller
{
    public function index()
    {
        return response()->json(
            Cliente::orderBy('nombre', 'asc')->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre'    => 'required|string|max:150',
            'documento' => 'nullable|string|max:20|unique:clientes,documento',
            'telefono'  => 'nullable|string|max:20',
            'direccion' => 'nullable|string|max:255',
        ]);

        $cliente = Cliente::create([
            'nombre'    => $request->nombre,
            'documento' => $request->documento,
            'telefono'  => $request->telefono,
            'direccion' => $request->direccion,
            'estado'    => 1,
        ]);

        return response()->json($cliente, 201);
    }

    public function show($id)
    {
        return response()->json(Cliente::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'nombre'    => 'sometimes|required|string|max:150',
            'documento' => 'nullable|string|max:20|unique:clientes,documento,' . $id,
            'telefono'  => 'nullable|string|max:20',
            'direccion' => 'nullable|string|max:255',
            'estado'    => 'sometimes|boolean',
        ]);

        $cliente = Cliente::findOrFail($id);
        $cliente->update($request->only(['nombre', 'documento', 'telefono', 'direccion', 'estado']));

        return response()->json($cliente);
    }

    public function destroy($id)
    {
        $cliente = Cliente::findOrFail($id);
        $cliente->update(['estado' => 0]);
        return response()->json(['message' => 'Cliente desactivado correctamente.']);
    }
}
