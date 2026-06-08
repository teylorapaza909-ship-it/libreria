<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'usuario' => 'required',
            'password' => 'required',
        ]);

        $user = Usuario::where('usuario', $request->usuario)->first();

        // Verificamos si existe y si la contraseña coincide (usando Hash::check)
        // Nota: asumo que las contraseñas en utiles_db están hasheadas con bcrypt ($2y$).
        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Las credenciales proporcionadas son incorrectas.'
            ], 401);
        }

        if ($user->estado == 0) {
            return response()->json([
                'message' => 'Usuario inactivo.'
            ], 401);
        }

        // Crear token de Sanctum
        $token = $user->createToken('pos-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'usuario' => $user
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sesión cerrada correctamente'
        ]);
    }
    
    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
