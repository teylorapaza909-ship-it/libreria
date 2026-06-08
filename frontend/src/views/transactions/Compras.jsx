import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import api from '../../api/axiosBase';
import toast from 'react-hot-toast';

const today = () => new Date().toISOString().split('T')[0];
const fmt = (v) => { const n = parseFloat(v); return isNaN(n) ? '0.00' : n.toFixed(2); };

const Compras = () => {
    const [proveedores, setProveedores] = useState([]);
    const [productos, setProductos]     = useState([]);
    const [historial, setHistorial]     = useState([]);
    const [loading, setLoading]         = useState(true);

    const [form, setForm] = useState({ id_proveedor: '', comprobante: '', observacion: '', fecha: today() });
    const [items, setItems] = useState([{ id_producto: '', nombre: '', cantidad: 1, costo_unitario: 0 }]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [pRes, prodRes] = await Promise.all([api.get('/proveedores'), api.get('/productos')]);
                setProveedores(pRes.data.filter(p => p.estado));
                setProductos(prodRes.data.filter(p => p.estado));
            } catch { toast.error('Error al cargar datos'); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const addItem = () => setItems(prev => [...prev, { id_producto: '', nombre: '', cantidad: 1, costo_unitario: 0 }]);
    const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
    const updateItem = (i, k, v) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
    const selectProducto = (i, id) => {
        const prod = productos.find(p => p.id == id);
        updateItem(i, 'id_producto', id);
        if (prod) updateItem(i, 'costo_unitario', prod.costo || 0);
    };

    const total = items.reduce((s, it) => s + (parseFloat(it.costo_unitario) || 0) * (parseInt(it.cantidad) || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.id_proveedor) { toast.error('Selecciona un proveedor'); return; }
        if (items.some(it => !it.id_producto)) { toast.error('Selecciona producto en todas las líneas'); return; }
        setSaving(true);
        try {
            // En this MVP guardamos nota de compra y aumentamos stock via API de productos
            for (const it of items) {
                const prod = productos.find(p => p.id == it.id_producto);
                if (prod) {
                    await api.put(`/productos/${it.id_producto}`, {
                        stock: (parseInt(prod.stock) || 0) + (parseInt(it.cantidad) || 0),
                        costo: it.costo_unitario,
                    });
                }
            }
            toast.success(`Compra registrada — S/ ${total.toFixed(2)} — Stock actualizado`);
            setHistorial(prev => [{ id: Date.now(), proveedor: proveedores.find(p => p.id == form.id_proveedor)?.nombre, comprobante: form.comprobante, fecha: form.fecha, total, items: [...items] }, ...prev]);
            setForm({ id_proveedor: '', comprobante: '', observacion: '', fecha: today() });
            setItems([{ id_producto: '', nombre: '', cantidad: 1, costo_unitario: 0 }]);
        } catch { toast.error('Error al registrar compra'); }
        finally { setSaving(false); }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Cargando...</div>;

    return (
        <div className="animate-fade">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', background: 'var(--primary-alpha)', borderRadius: 'var(--radius-lg)' }}>
                    <FileText size={24} color="var(--primary)" />
                </div>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Registro de Compras</h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Abastece inventario y registra entradas con trazabilidad de costos</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Formulario */}
                <div className="card" style={{ padding: '1.5rem', gridColumn: '1/-1' }}>
                    <h3 style={SECTION_H}>📋 Nueva Compra</h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={L}>Proveedor *</label>
                                <select className="form-control" value={form.id_proveedor} onChange={e => setForm({ ...form, id_proveedor: e.target.value })}>
                                    <option value="">Seleccionar...</option>
                                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={L}>N° Comprobante</label>
                                <input className="form-control" type="text" placeholder="F001-00123" value={form.comprobante} onChange={e => setForm({ ...form, comprobante: e.target.value })} />
                            </div>
                            <div>
                                <label style={L}>Fecha</label>
                                <input className="form-control" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
                            </div>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={L}>Observación</label>
                                <input className="form-control" type="text" placeholder="Notas adicionales..." value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })} />
                            </div>
                        </div>

                        {/* Líneas de producto */}
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <label style={L}>Productos a ingresar</label>
                                <button type="button" className="btn btn-outline" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }} onClick={addItem}>
                                    <Plus size={14} /> Agregar línea
                                </button>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>{['Producto', 'Cantidad', 'Costo Unit.', 'Subtotal', ''].map(h => (
                                        <th key={h} style={{ ...TH, padding: '0.5rem 0.75rem' }}>{h}</th>
                                    ))}</tr>
                                </thead>
                                <tbody>
                                    {items.map((it, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.5rem' }}>
                                                <select className="form-control" value={it.id_producto} onChange={e => selectProducto(i, e.target.value)}>
                                                    <option value="">Producto...</option>
                                                    {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                                </select>
                                            </td>
                                            <td style={{ padding: '0.5rem', width: '80px' }}>
                                                <input className="form-control" type="number" min="1" value={it.cantidad} onChange={e => updateItem(i, 'cantidad', e.target.value)} />
                                            </td>
                                            <td style={{ padding: '0.5rem', width: '110px' }}>
                                                <input className="form-control" type="number" step="0.01" value={it.costo_unitario} onChange={e => updateItem(i, 'costo_unitario', e.target.value)} />
                                            </td>
                                            <td style={{ padding: '0.5rem', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                                                S/ {fmt(parseFloat(it.costo_unitario || 0) * parseInt(it.cantidad || 0))}
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                {items.length > 1 && (
                                                    <button type="button" onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ backgroundColor: 'var(--bg-color)' }}>
                                        <td colSpan={3} style={{ padding: '0.75rem', fontWeight: 700, textAlign: 'right' }}>TOTAL COMPRA:</td>
                                        <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--success)', fontSize: '1.1rem' }}>S/ {fmt(total)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn btn-success" style={{ padding: '0.75rem 2rem' }} disabled={saving}>
                                {saving ? 'Registrando...' : '✅ Registrar Compra'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Historial */}
                {historial.length > 0 && (
                    <div className="card" style={{ gridColumn: '1/-1', overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>📜 Historial de Compras (sesión actual)</h3>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: 'var(--bg-color)' }}>
                                <tr>{['Fecha', 'Proveedor', 'Comprobante', 'Ítems', 'Total'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {historial.map(h => (
                                    <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={TD}>{h.fecha}</td>
                                        <td style={{ ...TD, fontWeight: 600 }}>{h.proveedor}</td>
                                        <td style={TD}>{h.comprobante || '–'}</td>
                                        <td style={TD}>{h.items.length} producto(s)</td>
                                        <td style={{ ...TD, fontWeight: 700, color: 'var(--success)' }}>S/ {fmt(h.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const SECTION_H = { margin: '0 0 1.25rem 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 };
const L = { display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const TH = { padding: '0.875rem 1.25rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' };
const TD = { padding: '0.875rem 1.25rem', verticalAlign: 'middle', fontSize: '0.875rem', color: 'var(--text-main)', whiteSpace: 'nowrap' };

export default Compras;
