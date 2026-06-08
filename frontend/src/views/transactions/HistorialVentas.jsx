import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Eye, Printer, Filter, RotateCcw, AlertCircle, Pencil, Info, Plus, Trash2, ShoppingCart } from 'lucide-react';
import api from '../../api/axiosBase';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import TicketModal, { buildTicketHTMLFromData, printTicket } from '../pos/TicketModal';

const fmt = (v) => { const n = parseFloat(v); return isNaN(n) ? 'S/ 0.00' : `S/ ${n.toFixed(2)}`; };
const fmtDate = (d) => { try { return new Date(d).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d || '–'; } };

const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };

const HistorialVentas = () => {
    const navigate = useNavigate();
    const [ventas, setVentas]           = useState([]);
    const [loading, setLoading]         = useState(true);
    const [fechaInicio, setFechaInicio] = useState(daysAgo(30));
    const [fechaFin, setFechaFin]       = useState(today());
    const [estado, setEstado]           = useState('Todos');

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [itemToAnular, setItemToAnular]   = useState(null);

    const [showTicket, setShowTicket]       = useState(false);
    const [ticketData, setTicketData]       = useState(null);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    const [isEditOpen, setIsEditOpen]       = useState(false);
    const [itemToEdit, setItemToEdit]       = useState(null);
    const [editForm, setEditForm]           = useState({ detalles: [], metodo_pago: 'Efectivo', id_cliente: null });
    const [productosEdit, setProductosEdit] = useState([]);
    const [productoToAdd, setProductoToAdd] = useState('');
    const [tipoVentaToAdd, setTipoVentaToAdd] = useState('unidad');

    const fetchVentas = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/ventas', { params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin, estado: estado !== 'Todos' ? estado : undefined } });
            setVentas(data);
        } catch { toast.error('Error al cargar historial'); }
        finally { setLoading(false); }
    };

    const handleViewTicket = async (id, autoPrint = false) => {
        setActionLoadingId(id);
        const loadingToast = toast.loading('Cargando ticket...');
        try {
            const resp = await api.get(`/ventas/${id}`);
            const { venta, detalles } = resp.data;
            if (!venta) throw new Error("Venta no encontrada");

            // Mapear los detalles: getUnitPrice() lee precio_caja si tipo==='caja'
            // y precio_unidad si es 'unidad'. Usamos el precio pactado (d.precio)
            // como valor definitivo para evitar inconsistencias por cambios de precios.
            const cart = (detalles || []).map(d => {
                const tipo = d.tipo_venta || 'unidad';
                const precioPactado = parseFloat(d.precio) || 0;
                return {
                    ...d,
                    tipo_venta:    tipo,
                    precio_unidad: tipo === 'caja'
                        ? (parseFloat(d.precio_unidad) || precioPactado)
                        : precioPactado,
                    precio_caja:   tipo === 'caja'
                        ? precioPactado
                        : (parseFloat(d.precio_caja) || precioPactado),
                    precio: precioPactado,
                };
            });

            const meta = {
                fecha:      fmtDate(venta.fecha),
                metodoPago: venta.metodo_pago,
                cliente:    venta.cliente_nombre || 'General',
                ticket:     venta.ticket || `VENTA-${String(venta.id).padStart(6, '0')}`,
            };
            const total = parseFloat(venta.total);

            toast.dismiss(loadingToast);

            if (autoPrint) {
                // Construir el HTML y disparar la impresión directamente
                // sin abrir el modal (el #thermal-print-root debe estar lleno ANTES de window.print)
                const html = buildTicketHTMLFromData({ cart, total, meta });
                printTicket(html);
            } else {
                setTicketData({ cart, total, meta });
                setShowTicket(true);
            }
        } catch {
            toast.error('Error al cargar la venta', { id: loadingToast });
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleAnular = async (id, isConfirmed = false) => {
        if (!isConfirmed) {
            setItemToAnular(id);
            setIsConfirmOpen(true);
            return;
        }

        setIsConfirmOpen(false);
        setActionLoadingId(id);
        const loadingToast = toast.loading('Anulando venta...');
        try {
            await api.delete(`/ventas/${id}`);
            toast.success('Venta anulada correctamente', { id: loadingToast });
            fetchVentas();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error al anular venta', { id: loadingToast });
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleEditOpen = async (id) => {
        if (actionLoadingId) return;
        setActionLoadingId(id);
        setItemToEdit(null);
        const loadingToast = toast.loading('Cargando datos de venta...');
        try {
            const resp = await api.get(`/ventas/${id}`);
            const productosResp = await api.get('/productos');
            const { venta, detalles } = resp.data;
            if (!venta) throw new Error("Venta no encontrada");

            setProductosEdit(Array.isArray(productosResp.data) ? productosResp.data.filter(p => p.estado !== false && p.estado !== 0) : []);
            setProductoToAdd('');
            setTipoVentaToAdd('unidad');
            setItemToEdit(venta);
            setEditForm({
                metodo_pago: venta.metodo_pago || 'Efectivo',
                id_cliente: venta.id_cliente,
                detalles: (detalles || []).map(d => ({
                    id_producto: d.id_producto,
                    nombre: d.nombre,
                    cantidad: d.cantidad,
                    precio: d.precio,
                    tipo_venta: d.tipo_venta || 'unidad',
                    cantidad_por_caja: d.cantidad_por_caja || 1
                }))
            });
            toast.dismiss(loadingToast);
            setIsEditOpen(true);
        } catch {
            toast.error('Error al cargar la venta', { id: loadingToast });
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleEditSubmit = async () => {
        if (!itemToEdit || editForm.detalles.length === 0) {
            toast.error('No hay detalles para guardar');
            return;
        }
        const loadingToast = toast.loading('Actualizando venta...');
        try {
            await api.put(`/ventas/${itemToEdit.id}`, editForm);
            toast.success('Venta actualizada correctamente', { id: loadingToast });
            setIsEditOpen(false);
            fetchVentas();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error al actualizar venta', { id: loadingToast });
        }
    };

    const handleAddProductToEdit = () => {
        setIsEditOpen(false);
        navigate('/pos', { 
            state: { 
                editVentaId: itemToEdit.id, 
                editVentaDetalles: editForm.detalles 
            } 
        });
    };

    const handleRemoveEditDetail = (idx) => {
        setEditForm(prev => ({
            ...prev,
            detalles: prev.detalles.filter((_, i) => i !== idx)
        }));
    };

    useEffect(() => { fetchVentas(); }, [fechaInicio, fechaFin, estado]);

    const completadas = ventas.filter(v => v.estado === 'Completada');
    const totalVendido = completadas.reduce((s, v) => s + parseFloat(v.total || 0), 0);
    const quickFilter = (days) => { setFechaInicio(daysAgo(days)); setFechaFin(today()); };

    return (
        <div className="animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--primary-alpha)', borderRadius: 'var(--radius-lg)' }}><History size={24} color="var(--primary)" /></div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Historial de Ventas</h1>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Consulta completa de transacciones del negocio</p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {[{ label: 'Hoy', days: 0 }, { label: '7 días', days: 7 }, { label: '30 días', days: 30 }, { label: '90 días', days: 90 }].map(q => (
                        <button key={q.label} className="btn btn-outline" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }} onClick={() => quickFilter(q.days)}>{q.label}</button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={L}>Fecha inicio</label>
                        <input className="form-control" type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                    </div>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={L}>Fecha fin</label>
                        <input className="form-control" type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
                    </div>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={L}>Estado</label>
                        <select className="form-control" value={estado} onChange={e => setEstado(e.target.value)}>
                            <option value="Todos">Todos</option>
                            <option value="Completada">Completada</option>
                            <option value="Cancelada">Cancelada</option>
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={fetchVentas} style={{ whiteSpace: 'nowrap' }}>
                        <Filter size={16} /> Filtrar
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {[
                    { label: 'Transacciones', value: ventas.length, color: 'var(--primary)' },
                    { label: 'Total Vendido', value: `S/ ${totalVendido.toFixed(2)}`, color: 'var(--success)' },
                    { label: 'Canceladas', value: ventas.filter(v => v.estado === 'Cancelada').length, color: 'var(--danger)' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '130px' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color }}>{s.value}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>{s.label}</span>
                    </div>
                ))}
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Cargando historial...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ backgroundColor: 'var(--bg-color)', position: 'sticky', top: 0 }}>
                                <tr>
                                    {['Fecha', 'ID', 'Cliente', 'Método', 'Estado', 'Total', 'Acción'].map(h => (
                                        <th key={h} style={{ padding: '1rem 1.25rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ventas.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No hay ventas en el periodo seleccionado</td></tr>
                                ) : ventas.map(v => (
                                    <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={TD}>{fmtDate(v.fecha)}</td>
                                        <td style={TD}><span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>#{String(v.id).padStart(6, '0')}</span></td>
                                        <td style={TD}>{v.cliente?.nombre || v.id_cliente ? `Cliente #${v.id_cliente}` : 'Cliente General'}</td>
                                        <td style={TD}>{v.metodo_pago}</td>
                                        <td style={TD}>
                                            {v.estado === 'Completada'
                                                ? <span className="badge badge-success">✅ Completada</span>
                                                : <span className="badge badge-warning">⚠️ Cancelada</span>}
                                        </td>
                                        <td style={{ ...TD, fontWeight: 700, color: 'var(--primary)' }}>{fmt(v.total)}</td>
                                        <td style={TD}>
                                            <div style={{ display: 'flex', gap: '0.4rem', pointerEvents: 'auto' }}>
                                                <button
                                                    type="button"
                                                    style={BTN_STYLE} 
                                                    title="Ver venta"
                                                    onClick={(e) => { 
                                                        e.preventDefault();
                                                        e.stopPropagation(); 
                                                        if(v.id) handleViewTicket(v.id); 
                                                    }}
                                                    disabled={actionLoadingId === v.id}
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    style={BTN_STYLE}
                                                    title="Imprimir ticket"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if(v.id) handleViewTicket(v.id, true);
                                                    }}
                                                    disabled={actionLoadingId === v.id}
                                                >
                                                    <Printer size={15} />
                                                </button>
                                                {v.estado !== 'Cancelada' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            style={{ ...BTN_STYLE, color: 'var(--primary)', borderColor: 'var(--primary)' }} 
                                                            title="Editar venta"
                                                            onClick={(e) => { 
                                                                e.preventDefault();
                                                                e.stopPropagation(); 
                                                                if(v.id) handleEditOpen(v.id); 
                                                            }}
                                                            disabled={actionLoadingId === v.id}
                                                        >
                                                            <Pencil size={15} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            style={{ ...BTN_STYLE, color: 'var(--warning)', borderColor: 'var(--warning)' }} 
                                                            title="Anular venta"
                                                            onClick={(e) => { 
                                                                e.preventDefault();
                                                                e.stopPropagation(); 
                                                                if(v.id) handleAnular(v.id); 
                                                            }}
                                                            disabled={actionLoadingId === v.id}
                                                        >
                                                            <RotateCcw size={15} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {ventas.length > 0 && (
                                <tfoot>
                                    <tr style={{ backgroundColor: 'var(--bg-color)' }}>
                                        <td colSpan={5} style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-muted)' }}>TOTAL PERÍODO</td>
                                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--success)', fontSize: '1rem' }}>{fmt(totalVendido)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>

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

            {ticketData && (
                <TicketModal
                    isOpen={showTicket}
                    onClose={() => setShowTicket(false)}
                    cart={ticketData.cart}
                    total={ticketData.total}
                    meta={ticketData.meta}
                />
            )}

            <Modal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                title="✏️ Editar Venta"
                size="lg"
            >
                {itemToEdit ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '300px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={L}>Método de Pago</label>
                                <select 
                                    className="form-control" 
                                    value={editForm.metodo_pago}
                                    onChange={e => setEditForm({...editForm, metodo_pago: e.target.value})}
                                >
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Yape">Yape / Plin</option>
                                    <option value="Transferencia">Transferencia</option>
                                    <option value="Tarjeta">Tarjeta</option>
                                </select>
                            </div>
                        </div>

                        <div className="card" style={{ padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <label style={{...L, marginBottom: 0}}>Agregar producto al ticket</label>
                                <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Serás redirigido al POS para buscar y agregar productos</span>
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleAddProductToEdit}
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                <ShoppingCart size={16} /> Ir al POS a agregar
                            </button>
                        </div>

                        <div className="card" style={{ padding: '0', overflow: 'auto', maxHeight: '300px', border: '1px solid var(--border-color)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead style={{ background: 'var(--bg-color)', position: 'sticky', top: 0 }}>
                                    <tr>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Producto</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Cant.</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Subtotal</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'center' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {editForm.detalles.map((det, idx) => (
                                        <tr key={idx} style={{ borderTop: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.75rem' }}>
                                                {det.nombre} <br/>
                                                <small style={{ color: 'var(--text-muted)' }}>S/ {(parseFloat(det.precio) || 0).toFixed(2)} ({det.tipo_venta})</small>
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <input 
                                                    type="number" 
                                                    className="form-control" 
                                                    style={{ width: '70px', padding: '0.35rem', textAlign: 'center' }}
                                                    value={det.cantidad}
                                                    onChange={e => {
                                                        const newDetalles = [...editForm.detalles];
                                                        newDetalles[idx].cantidad = Math.max(1, parseInt(e.target.value, 10) || 1);
                                                        setEditForm({...editForm, detalles: newDetalles});
                                                    }}
                                                />
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>S/ {(det.cantidad * det.precio).toFixed(2)}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    style={{ ...BTN_STYLE, color: 'var(--danger)', borderColor: 'var(--danger)', margin: '0 auto' }}
                                                    title="Quitar producto"
                                                    onClick={() => handleRemoveEditDetail(idx)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {editForm.detalles.length === 0 && (
                                        <tr>
                                            <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                Agregue al menos un producto al ticket.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ padding: '1rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600 }}>TOTAL ACTUALIZADO:</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                                S/ {editForm.detalles.reduce((s, d) => s + (d.cantidad * d.precio), 0).toFixed(2)}
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button className="btn btn-outline" onClick={() => setIsEditOpen(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleEditSubmit}>Guardar Cambios</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Info size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <p>Cargando información de la venta...</p>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const L = { display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const TD = { padding: '0.875rem 1.25rem', verticalAlign: 'middle', fontSize: '0.875rem', color: 'var(--text-main)', whiteSpace: 'nowrap' };
const BTN_STYLE = { background: 'none', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.3rem 0.6rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' };
export default HistorialVentas;
