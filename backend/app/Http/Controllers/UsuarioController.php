<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UsuarioController extends Controller
{
    public function index()
    {
        return response()->json(
            Usuario::select('id', 'usuario', 'rol', 'estado')
                ->orderBy('usuario', 'asc')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'usuario'  => 'required|string|max:50|unique:usuarios,usuario',
            'password' => 'required|string|min:6',
            'rol'      => 'required|in:Administrador,Cajero',
        ]);

        $usuario = Usuario::create([
            'usuario'  => $request->usuario,
            'password' => Hash::make($request->password),
            'rol'      => $request->rol,
            'estado'   => 1,
        ]);

        return response()->json(
            $usuario->makeHidden('password'),
            201
        );
    }

    public function show($id)
    {
        return response()->json(
            Usuario::select('id', 'usuario', 'rol', 'estado')->findOrFail($id)
        );
    }

    public function update(Request $request, $id)
    {
        $usuario = Usuario::findOrFail($id);

        $request->validate([
            'usuario'  => 'sometimes|required|string|max:50|unique:usuarios,usuario,' . $id,
            'password' => 'nullable|string|min:6',
            'rol'      => 'sometimes|required|in:Administrador,Cajero',
            'estado'   => 'sometimes|boolean',
        ]);

        $data = $request->only(['usuario', 'rol', 'estado']);
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $usuario->update($data);

        return response()->json(
            $usuario->makeHidden('password')
        );
    }

    public function destroy($id)
    {
        $usuario = Usuario::findOrFail($id);
        $usuario->update(['estado' => 0]);
        return response()->json(['message' => 'Usuario desactivado correctamente.']);
    }
}
