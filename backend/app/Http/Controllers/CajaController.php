<?php

namespace App\Http\Controllers;

use App\Models\Caja;
use App\Models\Venta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CajaController extends Controller
{
    private function cleanString($str) {
        if ($str === null) return "";
        return mb_convert_encoding($str, 'UTF-8', 'UTF-8');
    }

    public function dashboard()
    {
        try {
            $tipos = ['libreria' => 'Caja Libreria', 'personal' => 'Caja Personal'];
            $data = [];

            foreach ($tipos as $key => $name) {
                $cajaActiva = Caja::where('tipo_caja', $key)->where('estado', 'Abierta')->orderBy('id', 'desc')->first();
                
                $historialRaw = Caja::where('tipo_caja', $key)->where('estado', 'Cerrada')->orderBy('id', 'desc')->take(10)->get();
                $historial = [];
                foreach($historialRaw as $h) {
                    $historial[] = [
                        'id' => $h->id,
                        'session' => $h->id,
                        'openDate' => date('d/m/Y H:i', strtotime($h->fecha_apertura . ' ' . $h->hora_apertura)),
                        'closeDate' => date('d/m/Y H:i', strtotime($h->fecha_cierre . ' ' . $h->hora_cierre)),
                        'inicial' => (float)$h->monto_inicial,
                        'expected' => (float)($h->monto_final - $h->diferencia),
                        'declared' => (float)$h->monto_final,
                        'difference' => (float)$h->diferencia
                    ];
                }

                if ($cajaActiva) {
                    $ventasRaw = Venta::where('id_caja', $cajaActiva->id)->where('estado', 'Completada')->orderBy('id', 'desc')->get();
                    $ventas = [];
                    $ventas_efectivo = 0;
                    $ventas_yape = 0;
                    $ventas_transferencia = 0;
                    $ventas_tarjeta = 0;
                    $efectivo_count = 0;
                    $yape_count = 0;
                    $transferencia_count = 0;
                    $tarjeta_count = 0;

                    foreach ($ventasRaw as $v) {
                        $pago = $v->metodo_pago ?: 'Efectivo';
                        $ventas[] = [
                            'id' => $v->id,
                            'ticket' => '#' . str_pad($v->id, 4, '0', STR_PAD_LEFT),
                            'hora' => date('H:i', strtotime($v->fecha)),
                            'cliente' => $v->id_cliente ? 'Cliente #'.$v->id_cliente : 'Cliente General',
                            'pago' => $pago,
                            'monto' => (float)$v->total
                        ];

                        if ($pago === 'Efectivo') {
                            $ventas_efectivo += (float)$v->total;
                            $efectivo_count++;
                        } elseif ($pago === 'Yape' || $pago === 'Yape / Plin') {
                            $ventas_yape += (float)$v->total;
                            $yape_count++;
                        } elseif ($pago === 'Transferencia') {
                            $ventas_transferencia += (float)$v->total;
                            $transferencia_count++;
                        } elseif ($pago === 'Tarjeta') {
                            $ventas_tarjeta += (float)$v->total;
                            $tarjeta_count++;
                        }
                    }

                    $movimientosRaw = DB::table('gastos')->where('id_caja', $cajaActiva->id)->orderBy('id', 'desc')->get();
                    $movimientos = [];
                    foreach ($movimientosRaw as $m) {
                        $movimientos[] = [
                            'id' => $m->id,
                            'hora' => date('H:i', strtotime($m->fecha)),
                            'tipo' => $m->tipo,
                            'descripcion' => $this->cleanString($m->descripcion),
                            'monto' => (float)$m->monto
                        ];
                    }

                    $data[$key] = [
                        'id' => $cajaActiva->id,
                        'tipo_caja' => $key,
                        'name' => $name,
                        'status' => 'abierta',
                        'session' => $cajaActiva->id,
                        'openDate' => date('d/m/Y H:i', strtotime($cajaActiva->fecha_apertura . ' ' . $cajaActiva->hora_apertura)),
                        'monto_inicial' => (float)$cajaActiva->monto_inicial,
                        'ventas_efectivo' => $ventas_efectivo,
                        'ventas_yape' => $ventas_yape,
                        'ventas_transferencia' => $ventas_transferencia,
                        'ventas_tarjeta' => $ventas_tarjeta,
                        'efectivo_count' => $efectivo_count,
                        'yape_count' => $yape_count,
                        'transferencia_count' => $transferencia_count,
                        'tarjeta_count' => $tarjeta_count,
                        'movimientos' => $movimientos,
                        'ventas' => $ventas,
                        'historial' => $historial
                    ];
                } else {
                    $data[$key] = [
                        'id' => $key,
                        'tipo_caja' => $key,
                        'name' => $name,
                        'status' => 'cerrada',
                        'session' => '',
                        'openDate' => '',
                        'monto_inicial' => 0,
                        'ventas_efectivo' => 0,
                        'ventas_yape' => 0,
                        'ventas_transferencia' => 0,
                        'ventas_tarjeta' => 0,
                        'efectivo_count' => 0,
                        'yape_count' => 0,
                        'transferencia_count' => 0,
                        'tarjeta_count' => 0,
                        'movimientos' => [],
                        'ventas' => [],
                        'historial' => $historial
                    ];
                }
            }
            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function abrir(Request $request)
    {
        $request->validate([
            'tipo_caja' => 'required|in:libreria,personal',
            'monto_inicial' => 'required|numeric|min:0'
        ]);

        $activa = Caja::where('tipo_caja', $request->tipo_caja)->where('estado', 'Abierta')->first();
        if ($activa) {
            return response()->json(['message' => 'Ya existe una caja abierta para este tipo'], 400);
        }

        $caja = Caja::create([
            'tipo_caja' => $request->tipo_caja,
            'nombre_caja' => $request->tipo_caja === 'libreria' ? 'Caja Libreria' : 'Caja Personal',
            'fecha_apertura' => date('Y-m-d'),
            'hora_apertura' => date('H:i:s'),
            'monto_inicial' => $request->monto_inicial,
            'estado' => 'Abierta'
        ]);

        return response()->json(['message' => 'Caja abierta con éxito', 'caja' => $caja], 201);
    }

    public function movimiento(Request $request)
    {
        $request->validate([
            'id_caja' => 'required|integer',
            'tipo' => 'required|in:entrada,salida',
            'descripcion' => 'required|string',
            'monto' => 'required|numeric|min:0.01'
        ]);

        DB::table('gastos')->insert([
            'id_caja' => $request->id_caja,
            'tipo' => $request->tipo,
            'descripcion' => $request->descripcion,
            'monto' => $request->monto,
            'fecha' => date('Y-m-d H:i:s')
        ]);

        return response()->json(['message' => 'Movimiento registrado con éxito'], 201);
    }

    public function cerrar(Request $request, $id)
    {
        $request->validate([
            'declarado' => 'required|numeric|min:0',
            'esperado' => 'required|numeric'
        ]);

        $caja = Caja::find($id);
        if (!$caja) {
            return response()->json(['message' => 'Caja no encontrada'], 404);
        }
        
        if ($caja->estado === 'Cerrada') {
            return response()->json(['message' => 'Esta caja ya está cerrada'], 400);
        }

        $caja->fecha_cierre = date('Y-m-d');
        $caja->hora_cierre = date('H:i:s');
        $caja->monto_final = $request->declarado;
        $caja->diferencia = $request->declarado - $request->esperado;
        $caja->estado = 'Cerrada';
        
        $caja->save();

        return response()->json(['message' => 'Caja cerrada correctamente']);
    }
    
    public function getCajaActual()
    {
        $caja = Caja::where('estado', 'Abierta')->orderBy('id', 'desc')->first();
        if (!$caja) {
            return response()->json(['status' => 'No hay caja abierta', 'caja' => null]);
        }
        return response()->json(['status' => 'Abierta', 'caja' => $caja]);
    }

    public function getCajasAbiertas()
    {
        $cajas = Caja::where('estado', 'Abierta')->orderBy('id', 'desc')->get();
        return response()->json($cajas);
    }
}
