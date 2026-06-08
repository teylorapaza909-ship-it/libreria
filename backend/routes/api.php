<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\ProveedorController;
use App\Http\Controllers\CajaController;
use App\Http\Controllers\VentaController;
use App\Http\Controllers\UsuarioController;

// Rutas Públicas
Route::get('/login', function() { return response()->json(['message' => 'Unauthorized'], 401); })->name('login');
Route::post('/login', [AuthController::class, 'login']);

// Rutas Protegidas
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    
    Route::get('/caja/actual', [CajaController::class, 'getCajaActual']);

    // Rutas CajaDia Dashboard
    Route::get('/cajas-abiertas', [CajaController::class, 'getCajasAbiertas']);
    Route::get('/cajas-dashboard', [CajaController::class, 'dashboard']);
    Route::post('/cajas/abrir', [CajaController::class, 'abrir']);
    Route::post('/cajas/movimiento', [CajaController::class, 'movimiento']);
    Route::post('/cajas/{id}/cerrar', [CajaController::class, 'cerrar']);

    // Rutas protegidas para Administrador
    Route::middleware('admin')->group(function () {
        Route::get('/diag-debug', function() {
            return [
                'count_personal' => \DB::table('caja')->where('tipo_caja', 'personal')->count(),
                'all_cajas' => \DB::table('caja')->select('id', 'tipo_caja', 'estado')->get()
            ];
        });

        Route::get('/dashboard/charts', function () {
            // Ingresos de los últimos 7 días
            $ultimos7Dias = \DB::select("
                SELECT DATE(fecha) as fecha, SUM(total) as ingresos 
                FROM ventas 
                WHERE fecha >= DATE(NOW() - INTERVAL 6 DAY)
                GROUP BY DATE(fecha)
                ORDER BY fecha ASC
            ");

            // Ventas por Categoría (en cantidad de productos)
            $ventasCategoria = \DB::select("
                SELECT COALESCE(c.nombre, 'Sin Categoría') as name, SUM(dv.cantidad) as ventas
                FROM detalle_ventas dv
                JOIN productos p ON dv.id_producto = p.id
                LEFT JOIN categorias c ON p.id_categoria = c.id
                JOIN ventas v ON dv.id_venta = v.id
                WHERE v.estado != 'Anulada'
                GROUP BY c.id, c.nombre
                ORDER BY ventas DESC
                LIMIT 5
            ");

            return response()->json([
                'ingresos7Dias' => $ultimos7Dias,
                'ventasPorCategoria' => $ventasCategoria
            ]);
        });

        // Administración de Usuarios, Proveedores y Cajas
        Route::apiResource('usuarios', UsuarioController::class);
        Route::apiResource('proveedores', ProveedorController::class);
        Route::apiResource('cajas', CajaController::class); // Restringido por seguridad

        // Inventario / Kardex
        Route::get('inventario', [\App\Http\Controllers\InventarioController::class, 'index']);

        // Operaciones de escritura protegidas en Categorías y Productos
        Route::post('categorias', [CategoriaController::class, 'store']);
        Route::put('categorias/{id}', [CategoriaController::class, 'update']);
        Route::delete('categorias/{id}', [CategoriaController::class, 'destroy']);

        Route::post('productos', [ProductoController::class, 'store']);
        Route::put('productos/{id}', [ProductoController::class, 'update']);
        Route::delete('productos/{id}', [ProductoController::class, 'destroy']);

        // Operaciones especiales/anulaciones de Ventas
        Route::get('ventas-resumen', [VentaController::class, 'resumen']);
        Route::get('ventas-ranking', [VentaController::class, 'rankingReport']);
        Route::post('ventas/{id}/restaurar', [VentaController::class, 'restaurar']);
        Route::delete('ventas/{id}', [VentaController::class, 'destroy']);

        // Operaciones de eliminación de Clientes
        Route::delete('clientes/{id}', [ClienteController::class, 'destroy']);
    });

    // Rutas Generales para todo usuario autenticado (Cajeros y Administradores)
    Route::get('categorias', [CategoriaController::class, 'index']);
    Route::get('categorias/{id}', [CategoriaController::class, 'show']);

    Route::get('productos', [ProductoController::class, 'index']);
    Route::get('productos/{id}', [ProductoController::class, 'show']);

    Route::get('clientes', [ClienteController::class, 'index']);
    Route::get('clientes/{id}', [ClienteController::class, 'show']);
    Route::post('clientes', [ClienteController::class, 'store']);
    Route::put('clientes/{id}', [ClienteController::class, 'update']);

    Route::get('ventas', [VentaController::class, 'index']);
    Route::get('ventas/{id}', [VentaController::class, 'show']);
    Route::post('ventas', [VentaController::class, 'store']);
    Route::put('ventas/{id}', [VentaController::class, 'update']);
});

