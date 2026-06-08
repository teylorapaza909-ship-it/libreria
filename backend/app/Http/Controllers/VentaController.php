<?php

namespace App\Http\Controllers;

use App\Models\Venta;
use App\Models\DetalleVenta;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VentaController extends Controller
{
    public function resumen(Request $request)
    {
        $fechaInicio = $request->input('fecha_inicio');
        $fechaFin = $request->input('fecha_fin');

        $topProductos = DB::table('detalle_ventas as dv')
            ->join('ventas as v', 'dv.id_venta', '=', 'v.id')
            ->join('productos as p', 'dv.id_producto', '=', 'p.id')
            ->when($fechaInicio, fn($q) => $q->whereDate('v.fecha', '>=', $fechaInicio))
            ->when($fechaFin, fn($q) => $q->whereDate('v.fecha', '<=', $fechaFin))
            ->where('v.estado', 'Completada')
            ->groupBy('p.id', 'p.nombre')
            ->select(
                'p.id',
                'p.nombre',
                DB::raw('SUM(dv.cantidad) as cantidad'),
                DB::raw('SUM(dv.subtotal) as total')
            )
            ->orderByDesc('cantidad')
            ->limit(10)
            ->get();

        return response()->json([
            'top_productos' => $topProductos,
        ]);
    }

    public function rankingReport(Request $request)
    {
        $fechaInicio = $request->input('fecha_inicio');
        $fechaFin    = $request->input('fecha_fin');

        // Base query builder para ranking
        $baseRanking = fn($tipo) => DB::table('detalle_ventas as dv')
            ->join('ventas as v', 'dv.id_venta', '=', 'v.id')
            ->join('productos as p', 'dv.id_producto', '=', 'p.id')
            ->leftJoin('categorias as c', 'p.id_categoria', '=', 'c.id')
            ->when($fechaInicio, fn($q) => $q->whereDate('v.fecha', '>=', $fechaInicio))
            ->when($fechaFin,    fn($q) => $q->whereDate('v.fecha', '<=', $fechaFin))
            ->where('v.estado', 'Completada')
            ->where('p.tipo_caja', $tipo)
            ->groupBy('p.id', 'p.nombre', 'c.nombre')
            ->select(
                'p.id',
                'p.nombre',
                'c.nombre as categoria',
                DB::raw('SUM(dv.cantidad) as cantidad'),
                DB::raw('SUM(dv.subtotal) as total')
            )
            ->orderByDesc('cantidad')
            ->get();

        $rankingLibreria = $baseRanking('libreria');
        $rankingPersonal = $baseRanking('personal');

        // Movimientos de inventario en el periodo
        $movimientos = DB::table('inventario as inv')
            ->join('productos as p', 'inv.id_producto', '=', 'p.id')
            ->when($fechaInicio, fn($q) => $q->whereDate('inv.fecha', '>=', $fechaInicio))
            ->when($fechaFin,    fn($q) => $q->whereDate('inv.fecha', '<=', $fechaFin))
            ->select(
                'inv.fecha',
                'p.nombre as producto',
                'inv.tipo',
                'inv.cantidad',
                'inv.stock_restante'
            )
            ->orderBy('inv.fecha', 'desc')
            ->limit(200)
            ->get();

        return response()->json([
            'ranking_libreria' => $rankingLibreria,
            'ranking_personal' => $rankingPersonal,
            'movimientos'      => $movimientos,
            'periodo'          => ['inicio' => $fechaInicio, 'fin' => $fechaFin],
        ]);
    }

    public function index(Request $request)
    {
        $query = Venta::orderBy('fecha', 'desc');

        if ($request->filled('fecha_inicio')) {
            $query->whereDate('fecha', '>=', $request->fecha_inicio);
        }
        if ($request->filled('fecha_fin')) {
            $query->whereDate('fecha', '<=', $request->fecha_fin);
        }
        if ($request->filled('estado') && $request->estado !== 'Todos') {
            $query->where('estado', $request->estado);
        }

        return response()->json($query->take(200)->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'id_cliente' => 'nullable|integer',
            // id_caja ya no es requerido desde el front, lo calcularemos por producto
            'metodo_pago' => 'required|string|in:Efectivo,Transferencia,Tarjeta,Yape',
            'monto_recibido' => 'required|numeric',
            'descuento' => 'nullable|numeric',
            'detalles' => 'required|array|min:1',
            'detalles.*.id_producto' => 'required|integer',
            'detalles.*.cantidad' => 'required|integer|min:1',
            'detalles.*.precio' => 'required|numeric',
            'detalles.*.tipo_venta' => 'nullable|string|in:unidad,caja',
        ]);

        try {
            DB::beginTransaction();

            // 1. Agrupar productos por su tipo_caja
            $itemsPorCaja = [];
            foreach ($request->detalles as $det) {
                $producto = Producto::findOrFail($det['id_producto']);
                $tipo = $producto->tipo_caja ?: 'libreria';
                
                if (!isset($itemsPorCaja[$tipo])) {
                    $itemsPorCaja[$tipo] = [];
                }
                $itemsPorCaja[$tipo][] = [
                    'producto' => $producto,
                    'detalle' => $det
                ];
            }

            // 2. Validar que todas las cajas necesarias estén abiertas
            $cajasActivas = [];
            foreach (array_keys($itemsPorCaja) as $tipo) {
                $caja = \App\Models\Caja::where('tipo_caja', $tipo)->where('estado', 'Abierta')->first();
                if (!$caja) {
                    throw new \Exception("La caja para productos de tipo '$tipo' está cerrada. Debe abrirla para procesar esta venta.");
                }
                $cajasActivas[$tipo] = $caja;
            }

            $ventasRealizadas = [];
            $primerVentaId = null;

            // 3. Procesar una venta por cada tipo de caja
            foreach ($itemsPorCaja as $tipo => $items) {
                $caja = $cajasActivas[$tipo];
                $subtotalCaja = 0;
                foreach ($items as $item) {
                    $subtotalCaja += ($item['detalle']['precio'] * $item['detalle']['cantidad']);
                }

                // Por simplicidad en esta fase, el descuento se aplica solo a la primera venta o proporcionalmente.
                // Aquí lo haremos proporcional al subtotal.
                $totalGlobalSubtotal = 0;
                foreach($request->detalles as $d) $totalGlobalSubtotal += ($d['precio'] * $d['cantidad']);
                
                $ratio = $totalGlobalSubtotal > 0 ? ($subtotalCaja / $totalGlobalSubtotal) : 0;
                $descuentoCaja = ($request->descuento ?? 0) * $ratio;
                $totalCaja = $subtotalCaja - $descuentoCaja;

                // Crear la venta para esta caja
                $venta = Venta::create([
                    'id_cliente' => $request->id_cliente,
                    'id_usuario' => $request->user()->id,
                    'id_caja' => $caja->id,
                    'fecha' => now(),
                    'subtotal' => $subtotalCaja,
                    'descuento' => $descuentoCaja,
                    'total' => $totalCaja,
                    'metodo_pago' => $request->metodo_pago,
                    'monto_recibido' => $totalCaja, // El vuelto se maneja en el total global en el front
                    'vuelto' => 0,
                    'estado' => 'Completada'
                ]);

                if (!$primerVentaId) $primerVentaId = $venta->id;

                foreach ($items as $item) {
                    $prod = $item['producto'];
                    $det = $item['detalle'];

                    $tipo_venta = isset($det['tipo_venta']) ? $det['tipo_venta'] : 'unidad';
                    $factor = ($tipo_venta === 'caja' && $prod->cantidad_por_caja > 0) ? $prod->cantidad_por_caja : 1;
                    $unidades = $det['cantidad'] * $factor;

                    // Permitimos venta con stock insuficiente (permitir stock negativo)
                    // if ($prod->stock < $unidades) {
                    //     throw new \Exception("Stock insuficiente para: " . $prod->nombre);
                    // }

                    $prod->stock -= $unidades;
                    $prod->save();

                    // Registrar en Kardex
                    $prod->registrarMovimiento('SALIDA', $unidades, $prod->stock);

                    DetalleVenta::create([
                        'id_venta' => $venta->id,
                        'id_producto' => $prod->id,
                        'cantidad' => $det['cantidad'],
                        'precio' => $det['precio'],
                        'subtotal' => $det['cantidad'] * $det['precio'],
                        'tipo_venta' => $tipo_venta
                    ]);
                }
                $ventasRealizadas[] = $venta;
            }

            DB::commit();

            return response()->json([
                'message' => 'Venta registrada con éxito',
                'venta' => $ventasRealizadas[0], // Retornamos la primera para el ticket
                'ids' => array_map(fn($v) => $v->id, $ventasRealizadas)
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al procesar la venta: ' . $e->getMessage()], 400);
        }
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'id_cliente' => 'nullable|integer',
            'metodo_pago' => 'required|string|in:Efectivo,Transferencia,Tarjeta,Yape',
            'detalles' => 'required|array|min:1',
            'detalles.*.id_producto' => 'required|integer',
            'detalles.*.cantidad' => 'required|integer|min:1',
            'detalles.*.precio' => 'required|numeric',
            'detalles.*.tipo_venta' => 'nullable|string|in:unidad,caja',
        ]);

        try {
            DB::beginTransaction();

            $venta = Venta::findOrFail($id);
            if ($venta->estado === 'Cancelada') {
                throw new \Exception("No se puede editar una venta anulada.");
            }

            // 1. Revertir stock de items anteriores
            $detallesViejos = DetalleVenta::where('id_venta', $id)->get();
            foreach ($detallesViejos as $det) {
                $prod = Producto::find($det->id_producto);
                if ($prod) {
                    $factor = ($det->tipo_venta === 'caja' && $prod->cantidad_por_caja > 0) ? $prod->cantidad_por_caja : 1;
                    $unidades = $det->cantidad * $factor;
                    $prod->stock += $unidades;
                    $prod->save();
                    $prod->registrarMovimiento('ENTRADA (EDICIÓN)', $unidades, $prod->stock);
                }
                $det->delete();
            }

            // 2. Calcular nuevos totales y aplicar nuevos items
            $totalNuevo = 0;
            foreach ($request->detalles as $det) {
                $prod = Producto::findOrFail($det['id_producto']);
                $tipo_venta = isset($det['tipo_venta']) ? $det['tipo_venta'] : 'unidad';
                $factor = ($tipo_venta === 'caja' && $prod->cantidad_por_caja > 0) ? $prod->cantidad_por_caja : 1;
                $unidades = $det['cantidad'] * $factor;

                // Permitimos edición de venta con stock insuficiente (permitir stock negativo)
                // if ($prod->stock < $unidades) {
                //     throw new \Exception("Stock insuficiente para: " . $prod->nombre);
                // }

                $prod->stock -= $unidades;
                $prod->save();
                $prod->registrarMovimiento('SALIDA (EDICIÓN)', $unidades, $prod->stock);

                DetalleVenta::create([
                    'id_venta' => $venta->id,
                    'id_producto' => $prod->id,
                    'cantidad' => $det['cantidad'],
                    'precio' => $det['precio'],
                    'subtotal' => $det['cantidad'] * $det['precio'],
                    'tipo_venta' => $tipo_venta
                ]);

                $totalNuevo += ($det['cantidad'] * $det['precio']);
            }

            // 3. Actualizar cabecera de la venta
            $venta->update([
                'id_cliente' => $request->id_cliente,
                'subtotal' => $totalNuevo,
                'total' => $totalNuevo - ($venta->descuento ?? 0),
                'metodo_pago' => $request->metodo_pago,
                'monto_recibido' => $totalNuevo // Simplificación
            ]);

            DB::commit();
            return response()->json(['message' => 'Venta actualizada con éxito', 'venta' => $venta]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al editar venta: ' . $e->getMessage()], 400);
        }
    }

    public function show($id)
    {
        $venta = DB::table('ventas')
            ->leftJoin('clientes', 'ventas.id_cliente', '=', 'clientes.id')
            ->leftJoin('caja', 'ventas.id_caja', '=', 'caja.id')
            ->where('ventas.id', $id)
            ->select(
                'ventas.*',
                'clientes.nombre as cliente_nombre',
                'caja.tipo_caja as tipo_caja',
                'caja.nombre_caja as nombre_caja'
            )
            ->first();
        if (!$venta) {
            return response()->json(['message' => 'Venta no encontrada'], 404);
        }

        $detalles = DB::table('detalle_ventas')
            ->join('productos', 'detalle_ventas.id_producto', '=', 'productos.id')
            ->where('detalle_ventas.id_venta', $id)
            ->select(
                'detalle_ventas.*',
                'productos.nombre as nombre',
                'productos.precio_unidad as precio_unidad',
                'productos.precio_caja as precio_caja',
                'productos.cantidad_por_caja as cantidad_por_caja',
                'productos.stock as stock_actual'
            )
            ->get();

        return response()->json([
            'venta' => $venta,
            'detalles' => $detalles
        ]);
    }

    public function restaurar($id)
    {
        try {
            DB::beginTransaction();

            $venta = Venta::lockForUpdate()->find($id);
            if (!$venta) {
                return response()->json(['message' => 'Venta no encontrada'], 404);
            }

            if ($venta->estado === 'Completada') {
                return response()->json(['message' => 'La venta ya se encuentra activa'], 400);
            }

            $detalles = DetalleVenta::where('id_venta', $id)->get();
            foreach ($detalles as $det) {
                $producto = Producto::lockForUpdate()->find($det->id_producto);
                if (!$producto) {
                    throw new \Exception("Producto no encontrado en la venta.");
                }

                $factor = ($det->tipo_venta === 'caja' && $producto->cantidad_por_caja > 0) ? $producto->cantidad_por_caja : 1;
                $unidades = $det->cantidad * $factor;

                // Permitimos restaurar venta con stock insuficiente (permitir stock negativo)
                // if ($producto->stock < $unidades) {
                //     throw new \Exception("Stock insuficiente para restaurar: " . $producto->nombre);
                // }

                $producto->stock -= $unidades;
                $producto->save();
                $producto->registrarMovimiento('SALIDA (RESTAURACION)', $unidades, $producto->stock);
            }

            $venta->estado = 'Completada';
            $venta->save();

            DB::commit();

            return response()->json(['message' => 'Venta restaurada correctamente', 'venta' => $venta]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al restaurar la venta: ' . $e->getMessage()], 400);
        }
    }

    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $venta = Venta::lockForUpdate()->find($id);

            if (!$venta) {
                return response()->json(['message' => 'Venta no encontrada'], 404);
            }

            if ($venta->estado === 'Cancelada') {
                return response()->json(['message' => 'La venta ya se encuentra anulada'], 400);
            }

            // Marcar como cancelada
            $venta->estado = 'Cancelada';
            $venta->save();

            // Devolver stock
            $detalles = DetalleVenta::where('id_venta', $id)->get();
            foreach ($detalles as $det) {
                $producto = Producto::lockForUpdate()->find($det->id_producto);
                if ($producto) {
                    $factor_conversion = ($det->tipo_venta === 'caja' && $producto->cantidad_por_caja > 0) ? $producto->cantidad_por_caja : 1;
                    $unidades_a_devolver = $det->cantidad * $factor_conversion;
                    $producto->stock += $unidades_a_devolver;
                    $producto->save();

                    // Registrar en Kardex
                    $producto->registrarMovimiento('ENTRADA (ANULACIÓN)', $unidades_a_devolver, $producto->stock);
                }
            }

            DB::commit();

            return response()->json(['message' => 'Venta anulada y stock restituido con éxito']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al anular la venta: ' . $e->getMessage()], 400);
        }
    }
}
