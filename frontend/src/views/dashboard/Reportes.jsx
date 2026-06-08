import React, { useState, useEffect, useCallback } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    PieChart as PieIcon, ShoppingCart, DollarSign,
    Award, Filter, Printer, Eye, RotateCcw, FileText, Receipt
} from 'lucide-react';
import api from '../../api/axiosBase';
import toast from 'react-hot-toast';
import TicketModal from '../pos/TicketModal';
import Modal from '../../components/Modal';
import { AlertCircle } from 'lucide-react';

/* ─────────────── helpers ─────────────── */
const today  = () => new Intl.DateTimeFormat('en-CA').format(new Date());
const dAgo   = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return new Intl.DateTimeFormat('en-CA').format(d); };
const fmt    = (v) => { const n = parseFloat(v); return isNaN(n) ? 'S/ 0.00' : `S/ ${n.toFixed(2)}`; };
const fmtNum = (v) => { const n = parseFloat(v); return isNaN(n) ? '0.00' : n.toFixed(2); };
const fmtDt  = (d) => { try { return new Date(d).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); } catch { return d||'–'; } };

const GRADIENT_COLORS = ['#2563EB','#059669','#D97706','#DC2626','#7C3AED','#0891B2','#DB2777','#65A30D'];
const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
const buildExportUrl = (accion, fechaInicio, fechaFin, extraParams = {}) => {
    const params = new URLSearchParams({
        accion,
        tipo: 'pdf',
        fechaInicio,
        fechaFin,
        ...extraParams,
    });
    return `http://127.0.0.1/utiles/ajax/exportes.ajax.php?${params.toString()}`;
};

/* ─────────────── sub-components ─────────────── */
const KpiCard = ({ label, value, sub, icon, color }) => {
    const IconComponent = icon;
    return (
        <div className="card card-hoverable" style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                    <p style={{ margin:0, fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)' }}>{label}</p>
                    <h3 style={{ margin:'0.25rem 0 0', fontSize:'1.75rem', fontWeight:800, letterSpacing:'-1px', color:'var(--text-main)' }}>{value}</h3>
                </div>
                <div style={{ width:46, height:46, borderRadius:'var(--radius-lg)', backgroundColor:`${color}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <IconComponent size={22} color={color} />
                </div>
            </div>
            {sub && <p style={{ margin:0, fontSize:'0.8rem', color:'var(--text-muted)', fontWeight:500 }}>{sub}</p>}
        </div>
    );
};

const TABS = ['Ventas Diarias', 'Ventas Mensuales', 'Top Productos', 'Métodos de Pago'];

/* ─────────────── MAIN COMPONENT ─────────────── */
const Reportes = () => {
    const [activeTab, setActiveTab]   = useState(0);
    const [tableTab, setTableTab]     = useState('ventas');

    const [fechaInicio, setFechaInicio] = useState(dAgo(30));
    const [fechaFin, setFechaFin]       = useState(today());
    const [ventas, setVentas]           = useState([]);
    const [productos, setProductos]     = useState([]);
    const [resumen, setResumen]         = useState({ top_productos: [] });
    const [loading, setLoading]         = useState(true);

    const [showTicket, setShowTicket]   = useState(false);
    const [ticketData, setTicketData]   = useState(null);

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [itemToAnular, setItemToAnular]   = useState(null);

    /* ── fetch ── */
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [vRes, pRes, rRes] = await Promise.all([
                api.get('/ventas', { params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin } }),
                api.get('/productos'),
                api.get('/ventas-resumen', { params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin } }),
            ]);
            setVentas(vRes.data);
            setProductos(pRes.data);
            setResumen(rRes.data);
        } catch { toast.error('Error al cargar reportes'); }
        finally { setLoading(false); }
    }, [fechaInicio, fechaFin]);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── Acciones de Venta ── */
    const handleViewTicket = async (id, autoPrint = false) => {
        try {
            toast.loading('Cargando ticket...', { id: 'ticket_load' });
            const resp = await api.get(`/ventas/${id}`);
            const { venta, detalles } = resp.data;
            const cartItems = detalles.map(d => ({
                ...d,
                precio_unidad: d.precio
            }));
            
            setTicketData({
                cart: cartItems,
                total: parseFloat(venta.total),
                meta: {
                    fecha: fmtDt(venta.fecha),
                    metodoPago: venta.metodo_pago,
                    cliente: venta.cliente_nombre || 'General',
                    ticket: venta.ticket || `VENTA-${String(venta.id || '').padStart(6, '0')}`
                }
            });
            setShowTicket(true);
            toast.dismiss('ticket_load');
            
            if (autoPrint) {
                setTimeout(() => window.print(), 500);
            }
        } catch {
            toast.error('Error al cargar la venta', { id: 'ticket_load' });
        }
    };

    const handleAnular = async (id, isConfirmed = false) => {
        if (!isConfirmed) {
            setItemToAnular(id);
            setIsConfirmOpen(true);
            return;
        }

        setIsConfirmOpen(false);
        const loadingToast = toast.loading('Anulando venta...');
        try {
            await api.delete(`/ventas/${id}`);
            toast.success('Venta anulada correctamente', { id: loadingToast });
            fetchData();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error al anular venta', { id: loadingToast });
        }
    };

    /* ── KPIs ── */
    const completadas  = ventas.filter(v => v.estado === 'Completada');
    const totalVendido = completadas.reduce((s, v) => s + parseFloat(v.total || 0), 0);
    const canceladas   = ventas.filter(v => v.estado === 'Cancelada' || v.estado === 'Anulada').length;
    const stockBajo    = productos.filter(p => p.estado && p.stock < (p.stock_minimo || 10)).length;

    /* ── Chart data: ventas por día ── */
    const ventasPorDia = (() => {
        const map = {};
        completadas.forEach(v => {
            const d = v.fecha?.split('T')[0] || v.fecha?.split(' ')[0];
            if (!d) return;
            map[d] = (map[d] || 0) + parseFloat(v.total || 0);
        });
        return Object.keys(map).sort().map(d => ({
            name: d.slice(5), // MM-DD
            total: parseFloat(map[d].toFixed(2))
        }));
    })();

    /* ── Chart data: métodos de pago ── */
    const metodosPago = (() => {
        const map = {};
        completadas.forEach(v => { map[v.metodo_pago] = (map[v.metodo_pago] || 0) + parseFloat(v.total || 0); });
        return Object.entries(map).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
    })();

    /* ── Chart data: ventas por mes ── */
    const ventasPorMes = (() => {
        const map = {};
        completadas.forEach(v => {
            const d = v.fecha?.split('T')[0] || v.fecha?.split(' ')[0];
            if (!d) return;
            const mes = d.slice(0, 7);
            map[mes] = (map[mes] || 0) + parseFloat(v.total || 0);
        });
        return Object.keys(map).sort().map(m => ({
            name: m,
            total: parseFloat(map[m].toFixed(2))
        }));
    })();

    /* ── Chart data: top productos vendidos ── */
    const topProductos = (resumen.top_productos || []).map(p => ({
        name: p.nombre?.slice(0, 24),
        cantidad: parseInt(p.cantidad || 0, 10),
        total: parseFloat(p.total || 0)
    }));

    /* ── tooltip style ── */
    const ttStyle = { backgroundColor:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', boxShadow:'var(--shadow-md)', color:'var(--text-main)', padding:'10px 14px', fontSize:'0.85rem' };

    const quickBtns = [{l:'Hoy',d:0},{l:'7 días',d:7},{l:'30 días',d:30},{l:'90 días',d:90},{l:'Este año',d:365}];

    const handlePdfReport = () => {
        const accion = tableTab === 'ventas' ? 'reporte_ventas' : 'historial_ventas';
        window.location.href = buildExportUrl(accion, fechaInicio, fechaFin);
    };

    const handlePrintRanking = async () => {
        const loadingToast = toast.loading('Generando reporte de ranking...');
        try {
            const resp = await api.get('/ventas-ranking', {
                params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
            });
            const { ranking_libreria, ranking_personal, movimientos } = resp.data;
            toast.dismiss(loadingToast);

            // ── helpers de escape ──
            const e = (v) => String(v ?? '–')
                .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
            const fmtS = (v) => { const n = parseFloat(v); return isNaN(n) ? 'S/ 0.00' : `S/ ${n.toFixed(2)}`; };
            const fmtDateShort = (d) => { try { return new Date(d).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); } catch { return d||'–'; } };

            // ── Tabla ranking genérica ──
            const buildRankingTable = (rows, emptyMsg) => {
                if (!rows || rows.length === 0) {
                    return `<tr><td colspan="5" class="empty-row">${e(emptyMsg)}</td></tr>`;
                }
                const totalCant = rows.reduce((s, r) => s + parseInt(r.cantidad || 0), 0);
                const totalMonto = rows.reduce((s, r) => s + parseFloat(r.total || 0), 0);
                const rowsHtml = rows.map((r, i) => `
                    <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
                        <td class="num">${i + 1}</td>
                        <td class="prod">${e(r.nombre)}</td>
                        <td class="cat">${e(r.categoria)}</td>
                        <td class="cant">${e(r.cantidad)}</td>
                        <td class="monto">${fmtS(r.total)}</td>
                    </tr>`).join('');
                return rowsHtml + `
                    <tr class="foot-row">
                        <td colspan="3" class="foot-label">TOTAL</td>
                        <td class="cant">${totalCant}</td>
                        <td class="monto">${fmtS(totalMonto)}</td>
                    </tr>`;
            };

            // ── Tabla movimientos inventario ──
            const buildMovTable = (rows) => {
                if (!rows || rows.length === 0) {
                    return `<tr><td colspan="5" class="empty-row">Sin movimientos en el periodo.</td></tr>`;
                }
                const entradas = rows.filter(r => r.tipo && r.tipo.startsWith('ENTRADA'));
                const salidas  = rows.filter(r => r.tipo && r.tipo.startsWith('SALIDA'));
                const totEnt = entradas.reduce((s, r) => s + parseInt(r.cantidad || 0), 0);
                const totSal = salidas.reduce((s, r) => s + parseInt(r.cantidad || 0), 0);

                const rowsHtml = rows.map((r, i) => {
                    const isEntrada = r.tipo && r.tipo.startsWith('ENTRADA');
                    return `<tr class="${i % 2 === 0 ? 'even' : 'odd'}">
                        <td class="fecha-col">${e(fmtDateShort(r.fecha))}</td>
                        <td class="prod">${e(r.producto)}</td>
                        <td class="tipo-col ${isEntrada ? 'entrada' : 'salida'}">${e(r.tipo)}</td>
                        <td class="cant">${e(r.cantidad)}</td>
                        <td class="cant">${e(r.stock_restante)}</td>
                    </tr>`;
                }).join('');

                return rowsHtml + `
                    <tr class="foot-row">
                        <td colspan="2" class="foot-label">TOTALES</td>
                        <td class="foot-label">—</td>
                        <td class="cant" style="color:#166534">+${totEnt} / -${totSal}</td>
                        <td class="cant">—</td>
                    </tr>`;
            };

            const printWindow = window.open('', 'ranking-report', 'width=900,height=900');
            if (!printWindow) { toast.error('No se pudo abrir la ventana de impresión'); return; }

            printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Reporte de Ranking – ${e(fechaInicio)} al ${e(fechaFin)}</title>
<style>
  @page { size: A4 portrait; margin: 15mm 12mm; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    color: #111;
    background: #fff;
  }
  /* ── Encabezado ── */
  .report-header {
    text-align: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2.5px solid #1e40af;
  }
  .report-header .biz-name {
    font-size: 21px;
    font-weight: 800;
    color: #1e3a8a;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .report-header .subtitle {
    font-size: 14px;
    color: #475569;
    margin-top: 3px;
  }
  .report-header .period {
    display: inline-block;
    margin-top: 7px;
    padding: 4px 16px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 999px;
    font-size: 12px;
    color: #1d4ed8;
    font-weight: 600;
  }
  /* ── Secciones ── */
  .section { margin-bottom: 22px; page-break-inside: avoid; }
  .section-title {
    font-size: 14px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 8px 14px;
    border-radius: 4px 4px 0 0;
    color: #fff;
  }
  .section-title.lib   { background: #1d4ed8; }
  .section-title.pers  { background: #7c3aed; }
  .section-title.inv   { background: #0f766e; }
  /* ── Tablas ── */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  thead th {
    padding: 7px 10px;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.04em;
    color: #374151;
    border-bottom: 1.5px solid #e5e7eb;
    background: #f8fafc;
  }
  tbody td { padding: 6px 10px; vertical-align: middle; border-bottom: 1px solid #f1f5f9; }
  .even td { background: #fff; }
  .odd td  { background: #f8fafc; }
  .foot-row td {
    background: #f1f5f9;
    font-weight: 800;
    font-size: 12px;
    padding: 7px 10px;
    border-top: 1.5px solid #cbd5e1;
  }
  /* Columnas */
  .num   { width: 36px; text-align: center; color: #64748b; font-weight: 700; }
  .prod  { min-width: 140px; }
  .cat   { width: 100px; color: #475569; }
  .cant  { width: 65px; text-align: center; font-weight: 700; }
  .monto { width: 90px; text-align: right; font-weight: 700; color: #166534; }
  .foot-label { color: #374151; text-align: right; }
  .fecha-col  { width: 120px; color: #475569; }
  .tipo-col   { width: 150px; font-size: 11px; font-weight: 600; }
  .entrada    { color: #166534; }
  .salida     { color: #991b1b; }
  .empty-row  { text-align: center; padding: 16px; color: #94a3b8; font-style: italic; }
  /* Pie de pagina */
  .report-footer {
    margin-top: 18px;
    padding-top: 9px;
    border-top: 1px dashed #cbd5e1;
    font-size: 11px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>

<div class="report-header">
  <div class="biz-name">Reporte de Ranking</div>
  <div class="subtitle">Sistema de Gestión Comercial</div>
  <div class="period">Periodo: ${e(fechaInicio)} &nbsp;→&nbsp; ${e(fechaFin)}</div>
</div>

<!-- ── Ranking Librería ── -->
<div class="section">
  <div class="section-title lib">🏆 Ranking Librería</div>
  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th class="prod">Producto</th>
        <th class="cat">Categoría</th>
        <th class="cant">Cant.</th>
        <th class="monto">Total</th>
      </tr>
    </thead>
    <tbody>
      ${buildRankingTable(ranking_libreria, 'Sin ventas de librería en el periodo.')}
    </tbody>
  </table>
</div>

<!-- ── Ranking Personal ── -->
<div class="section">
  <div class="section-title pers">🏆 Ranking Personal</div>
  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th class="prod">Producto</th>
        <th class="cat">Categoría</th>
        <th class="cant">Cant.</th>
        <th class="monto">Total</th>
      </tr>
    </thead>
    <tbody>
      ${buildRankingTable(ranking_personal, 'Sin ventas de personal en el periodo.')}
    </tbody>
  </table>
</div>

<!-- ── Ingresos y Salidas Inventario ── -->
<div class="section">
  <div class="section-title inv">📦 Ingresos y Salidas del Inventario</div>
  <table>
    <thead>
      <tr>
        <th class="fecha-col">Fecha</th>
        <th class="prod">Producto</th>
        <th class="tipo-col">Movimiento</th>
        <th class="cant">Cantidad</th>
        <th class="cant">Stock Final</th>
      </tr>
    </thead>
    <tbody>
      ${buildMovTable(movimientos)}
    </tbody>
  </table>
</div>

<div class="report-footer">
  <span>Impreso: ${e(fmtDateShort(new Date()))}</span>
  <span>Sistema de Gestión Comercial</span>
</div>

<script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`);
            printWindow.document.close();
        } catch (err) {
            toast.error('Error al generar el reporte de ranking', { id: loadingToast });
            console.error(err);
        }
    };



    return (
        <div className="animate-fade" style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>

            {/* ── Header ── */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                    <div style={{ padding:'0.75rem', background:'var(--primary-alpha)', borderRadius:'var(--radius-lg)' }}>
                        <PieIcon size={24} color="var(--primary)" />
                    </div>
                    <div>
                        <h1 style={{ margin:0, fontSize:'1.5rem' }}>Análisis de Rendimiento</h1>
                        <p style={{ margin:0, color:'var(--text-muted)', fontSize:'0.875rem' }}>Sistema de Inteligencia Comercial</p>
                    </div>
                </div>
                <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
                    <button className="btn btn-outline" onClick={handlePdfReport} style={{ gap:'0.5rem' }}>
                        <FileText size={16} /> PDF
                    </button>
                    <button className="btn btn-outline" onClick={handlePrintRanking} style={{ gap:'0.5rem' }}>
                        <Printer size={16} /> Imprimir
                    </button>
                </div>
            </div>

            {/* ── Filtros ── */}
            <div className="card" style={{ padding:'1.25rem' }}>
                <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.875rem', flexWrap:'wrap' }}>
                    {quickBtns.map(q => (
                        <button key={q.l} className="btn btn-outline" style={{ padding:'0.3rem 0.875rem', fontSize:'0.8rem' }}
                            onClick={() => { setFechaInicio(dAgo(q.d)); setFechaFin(today()); }}>
                            {q.l}
                        </button>
                    ))}
                </div>
                <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', alignItems:'flex-end' }}>
                    <div style={{ flex:1, minWidth:'140px' }}>
                        <label style={L}>Fecha inicio</label>
                        <input className="form-control" type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                    </div>
                    <div style={{ flex:1, minWidth:'140px' }}>
                        <label style={L}>Fecha fin</label>
                        <input className="form-control" type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
                        <Filter size={16} /> {loading ? 'Cargando...' : 'Filtrar'}
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem' }}>
                <KpiCard label="Total Ventas"     value={fmt(totalVendido)}         sub={`${completadas.length} transacciones`} icon={DollarSign}  color="#059669" />
                <KpiCard label="Ventas Totales"   value={ventas.length}              sub={`${canceladas} canceladas`}            icon={ShoppingCart} color="#7C3AED" />
                <KpiCard label="Stock Bajo"       value={stockBajo + ' prods'}       sub="Por debajo del mínimo"                 icon={Award}       color={stockBajo>0?'#DC2626':'#059669'} />
            </div>

            {/* ── Gráficos ── */}
            <div className="card" style={{ padding:'1.5rem' }}>
                {/* Tab switcher */}
                <div style={{ display:'flex', gap:'0.25rem', marginBottom:'1.5rem', borderBottom:'2px solid var(--border-color)', paddingBottom:'0' }}>
                    {TABS.map((t, i) => (
                        <button key={t} onClick={() => setActiveTab(i)}
                            style={{ padding:'0.625rem 1.25rem', border:'none', background:'none', cursor:'pointer', fontWeight: activeTab===i ? 700 : 500, color: activeTab===i ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab===i ? '2px solid var(--primary)' : '2px solid transparent', marginBottom:'-2px', fontSize:'0.875rem', transition:'all 0.15s' }}>
                            {t}
                        </button>
                    ))}
                </div>

                <div style={{ height:320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        {activeTab === 0 ? (
                            <AreaChart data={ventasPorDia} margin={{ top:10, right:10, left:-10, bottom:0 }}>
                                <defs>
                                    <linearGradient id="cgIngresos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={6} />
                                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `S/${v}`} dx={-4} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                <Tooltip contentStyle={ttStyle} formatter={v => [`S/ ${v}`, 'Ventas']} />
                                <Area type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={3} fill="url(#cgIngresos)" activeDot={{ r:5, fill:'var(--primary)', stroke:'var(--surface)', strokeWidth:2 }} />
                            </AreaChart>
                        ) : activeTab === 1 ? (
                            <AreaChart data={ventasPorMes} margin={{ top:10, right:10, left:-10, bottom:0 }}>
                                <defs>
                                    <linearGradient id="cgIngresosMes" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="var(--success)" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={6} />
                                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `S/${v}`} dx={-4} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                <Tooltip contentStyle={ttStyle} formatter={v => [`S/ ${v}`, 'Ventas']} />
                                <Area type="monotone" dataKey="total" stroke="var(--success)" strokeWidth={3} fill="url(#cgIngresosMes)" activeDot={{ r:5, fill:'var(--success)', stroke:'var(--surface)', strokeWidth:2 }} />
                            </AreaChart>
                        ) : activeTab === 2 ? (
                            <BarChart data={topProductos} layout="vertical" margin={{ top:5, right:20, left:80, bottom:0 }}>
                                <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v=>`${v}`} />
                                <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} width={80} />
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                                <Tooltip contentStyle={ttStyle} formatter={(v, name) => [name === 'total' ? `S/ ${fmtNum(v)}` : v, name === 'total' ? 'Importe vendido' : 'Unidades vendidas']} />
                                <Bar dataKey="cantidad" radius={[0,6,6,0]} barSize={18}>
                                    {topProductos.map((_, i) => <Cell key={i} fill={GRADIENT_COLORS[i % GRADIENT_COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        ) : (
                            <PieChart>
                                <Pie data={metodosPago} cx="50%" cy="50%" outerRadius={110} innerRadius={55}
                                    dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                                    labelLine={false} paddingAngle={4}>
                                    {metodosPago.map((_, i) => <Cell key={i} fill={GRADIENT_COLORS[i % GRADIENT_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={ttStyle} formatter={v => [`S/ ${fmtNum(v)}`, 'Total']} />
                                <Legend />
                            </PieChart>
                        )}
                    </ResponsiveContainer>
                </div>

                {ventasPorDia.length === 0 && activeTab === 0 && (
                    <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.875rem', marginTop:'1rem' }}>No hay ventas en el periodo seleccionado</p>
                )}
                {ventasPorMes.length === 0 && activeTab === 1 && (
                    <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.875rem', marginTop:'1rem' }}>No hay ventas mensuales en el periodo seleccionado</p>
                )}
                {topProductos.length === 0 && activeTab === 2 && (
                    <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.875rem', marginTop:'1rem' }}>No hay productos vendidos en el periodo seleccionado</p>
                )}
            </div>

            {/* ── Tabla de ventas con pestañas ── */}
            <div className="card" style={{ overflow:'hidden' }}>
                {/* Pestañas */}
                <div style={{ display:'flex', borderBottom:'1px solid var(--border-color)', backgroundColor:'var(--surface)' }}>
                    {[
                        { k:'ventas', label:'📋 Diario de Ventas', icon: FileText },
                        { k:'resumen', label:'📊 Resumen por Método', icon: Receipt },
                    ].map(t => (
                        <button key={t.k} onClick={() => setTableTab(t.k)}
                            style={{ padding:'1rem 1.5rem', border:'none', background:'none', cursor:'pointer', fontWeight: tableTab===t.k ? 700 : 500, color: tableTab===t.k ? 'var(--primary)' : 'var(--text-muted)', borderBottom: tableTab===t.k ? '2px solid var(--primary)' : '2px solid transparent', marginBottom:'-1px', fontSize:'0.875rem' }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {tableTab === 'ventas' ? (
                    <div style={{ overflowX:'auto', maxHeight:'50vh', overflowY:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                            <thead style={{ backgroundColor:'var(--bg-color)', position:'sticky', top:0 }}>
                                <tr>
                                    {['Fecha / Hora','ID','Cliente','Método','Estado','Total','Acción'].map(h => (
                                        <th key={h} style={TH}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} style={{ padding:'3rem', textAlign:'center', color:'var(--text-muted)' }}>Cargando...</td></tr>
                                ) : ventas.length === 0 ? (
                                    <tr><td colSpan={7} style={{ padding:'3rem', textAlign:'center', color:'var(--text-muted)' }}>No hay ventas en el periodo seleccionado</td></tr>
                                ) : ventas.map(v => (
                                    <tr key={v.id} style={{ borderBottom:'1px solid var(--border-color)' }}>
                                        <td style={TD}>
                                            <div style={{ fontSize:'0.875rem' }}>{v.fecha?.split('T')[0] || v.fecha?.split(' ')[0]}</div>
                                            <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{fmtDt(v.fecha).split(', ')[1] || ''}</div>
                                        </td>
                                        <td style={TD}><span style={{ fontFamily:'monospace', fontSize:'0.8rem' }}>#{String(v.id).padStart(6,'0')}</span></td>
                                        <td style={TD}>{v.id_cliente ? `Cliente #${v.id_cliente}` : 'Gral.'}</td>
                                        <td style={TD}>{v.metodo_pago}</td>
                                        <td style={TD}>
                                            {v.estado === 'Completada'
                                                ? <span className="badge badge-success">✅ Completada</span>
                                                : <span className="badge badge-danger">❌ {v.estado}</span>}
                                        </td>
                                        <td style={{ ...TD, fontWeight:700, color:'var(--primary)' }}>{fmt(v.total)}</td>
                                        <td style={TD}>
                                            <div style={{ display:'flex', gap:'0.25rem' }}>
                                                <button style={ICON_BTN} title="Ver detalle" onClick={(e) => { e.stopPropagation(); handleViewTicket(v.id); }}>
                                                    <Eye size={14} />
                                                </button>
                                                <button style={ICON_BTN} title="Reimprimir" onClick={(e) => { e.stopPropagation(); handleViewTicket(v.id, true); }}>
                                                    <Printer size={14} />
                                                </button>
                                                {v.estado !== 'Cancelada' && (
                                                    <button 
                                                        style={{ ...ICON_BTN, color:'var(--warning)', borderColor:'var(--warning)' }} 
                                                        title="Anular" 
                                                        onClick={(e) => { e.stopPropagation(); handleAnular(v.id); }}
                                                    >
                                                        <RotateCcw size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {ventas.length > 0 && (
                                <tfoot>
                                    <tr style={{ backgroundColor:'#0F172A', color:'#fff' }}>
                                        <td colSpan={5} style={{ padding:'1rem 1.25rem', fontWeight:700, textAlign:'right', letterSpacing:'0.05em', fontSize:'0.875rem' }}>TOTAL PERÍODO</td>
                                        <td style={{ padding:'1rem 1.25rem', fontWeight:800, fontSize:'1.1rem', color:'#4ADE80' }}>{fmt(totalVendido)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                ) : (
                    /* Resumen por método */
                    <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                            <thead style={{ backgroundColor:'var(--bg-color)' }}>
                                <tr>
                                    {['Método de Pago','# Transacciones','Monto Total','% del Total'].map(h => <th key={h} style={TH}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {metodosPago.length === 0 ? (
                                    <tr><td colSpan={4} style={{ padding:'3rem', textAlign:'center', color:'var(--text-muted)' }}>Sin datos en el período</td></tr>
                                ) : metodosPago.map((m, i) => {
                                    const cnt = completadas.filter(v => v.metodo_pago === m.name).length;
                                    const pct = totalVendido > 0 ? (m.value / totalVendido * 100).toFixed(1) : '0.0';
                                    return (
                                        <tr key={m.name} style={{ borderBottom:'1px solid var(--border-color)' }}>
                                            <td style={TD}>
                                                <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                                                    <div style={{ width:12, height:12, borderRadius:'50%', backgroundColor:GRADIENT_COLORS[i%GRADIENT_COLORS.length], flexShrink:0 }} />
                                                    <span style={{ fontWeight:600 }}>{m.name}</span>
                                                </div>
                                            </td>
                                            <td style={TD}>{cnt} ventas</td>
                                            <td style={{ ...TD, fontWeight:700, color:'var(--success)' }}>{fmt(m.value)}</td>
                                            <td style={TD}>
                                                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                                                    <div style={{ flex:1, height:6, backgroundColor:'var(--bg-color)', borderRadius:'var(--radius-full)', overflow:'hidden' }}>
                                                        <div style={{ width:`${pct}%`, height:'100%', backgroundColor:GRADIENT_COLORS[i%GRADIENT_COLORS.length], borderRadius:'var(--radius-full)', transition:'width 0.5s' }} />
                                                    </div>
                                                    <span style={{ minWidth:42, fontWeight:600, fontSize:'0.8rem' }}>{pct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {metodosPago.length > 0 && (
                                <tfoot>
                                    <tr style={{ backgroundColor:'var(--bg-color)' }}>
                                        <td style={{ ...TH, color:'var(--text-main)', fontWeight:800 }}>TOTAL</td>
                                        <td style={TH}>{completadas.length} ventas</td>
                                        <td style={{ ...TH, color:'var(--success)', fontWeight:800 }}>{fmt(totalVendido)}</td>
                                        <td style={TH}>100%</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>

            {ticketData && (
                <TicketModal
                    isOpen={showTicket}
                    onClose={() => setShowTicket(false)}
                    cart={ticketData.cart}
                    total={ticketData.total}
                    meta={ticketData.meta}
                />
            )}

            {/* Modal de Confirmación de Anulación */}
            <Modal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                title="⚠️ Confirmar Anulación"
                size="sm"
            >
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ padding: '1rem', background: 'var(--danger-light)', borderRadius: '50%' }}>
                            <AlertCircle size={32} color="var(--danger)" />
                        </div>
                    </div>
                    <p style={{ margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
                        ¿Estás seguro que deseas <strong>ANULAR</strong> la venta <span style={{ fontFamily: 'monospace' }}>#{String(itemToAnular).padStart(6, '0')}</span>?
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        El stock de los productos será devuelto automáticamente al inventario. Esta acción no se puede deshacer.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsConfirmOpen(false)}>Cancelar</button>
                        <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleAnular(itemToAnular, true)}>Anular Venta</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const L = { display:'block', marginBottom:'0.35rem', fontSize:'0.75rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' };
const TH = { padding:'0.875rem 1.25rem', fontWeight:600, fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)', borderBottom:'1px solid var(--border-color)', whiteSpace:'nowrap' };
const TD = { padding:'0.875rem 1.25rem', verticalAlign:'middle', fontSize:'0.875rem', color:'var(--text-main)', whiteSpace:'nowrap' };
const ICON_BTN = { background:'none', border:'1px solid var(--border-color)', cursor:'pointer', padding:'0.3rem', borderRadius:'var(--radius-md)', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' };

export default Reportes;
