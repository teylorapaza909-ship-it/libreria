import React, { useState, useEffect, useContext } from 'react';
import { Package, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import api from '../../api/axiosBase';
import toast from 'react-hot-toast';
import { AuthContext } from '../../context/AuthContextObject';

const INITIAL_FORM = {
    codigo_barras: '',
    nombre: '',
    marca: '',
    precio_unidad: '',
    precio_mayor: '',
    costo: '',
    stock: '',
    stock_minimo: '',
    id_categoria: '',
    unidad_base: 'unidad',
    cantidad_por_caja: 1,
    precio_caja: '',
    tipo_caja: 'libreria',
};

const fmt = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? 'S/ 0.00' : `S/ ${n.toFixed(2)}`;
};

const Productos = () => {
    const { user } = useContext(AuthContext);
    const isAdmin = ['Administrador', 'admin'].includes(user?.rol);

    const [productos, setProductos]   = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [modalOpen, setModalOpen]   = useState(false);
    const [editItem, setEditItem]     = useState(null);
    const [form, setForm]             = useState(INITIAL_FORM);
    const [saving, setSaving]         = useState(false);
    const [usaCajas, setUsaCajas]     = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pRes, cRes] = await Promise.all([
                api.get('/productos'),
                api.get('/categorias'),
            ]);
            setProductos(pRes.data);
            setCategorias(cRes.data);
        } catch {
            toast.error('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const openCreate = () => {
        setEditItem(null);
        setForm(INITIAL_FORM);
        setUsaCajas(false);
        setModalOpen(true);
    };

    const openEdit = (row) => {
        setEditItem(row);
        setForm({
            codigo_barras: row.codigo_barras || '',
            nombre: row.nombre || '',
            marca: row.marca || '',
            precio_unidad: row.precio_unidad || '',
            precio_mayor: row.precio_mayor || '',
            costo: row.costo || '',
            stock: row.stock || '',
            stock_minimo: row.stock_minimo || '',
            id_categoria: row.id_categoria || '',
            unidad_base: row.unidad_base || 'unidad',
            cantidad_por_caja: row.cantidad_por_caja || 1,
            precio_caja: row.precio_caja || '',
            tipo_caja: row.tipo_caja || 'libreria',
        });
        setUsaCajas((row.cantidad_por_caja && row.cantidad_por_caja > 1) ? true : false);
        setModalOpen(true);
    };

    const handleDelete = async (row) => {
        if (!window.confirm(`¿Eliminar el producto "${row.nombre}"?`)) return;
        try {
            await api.delete(`/productos/${row.id}`);
            toast.success('Producto eliminado');
            fetchData();
        } catch {
            toast.error('Error al eliminar');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
        setSaving(true);
        try {
            if (editItem) {
                await api.put(`/productos/${editItem.id}`, form);
                toast.success('Producto actualizado');
            } else {
                await api.post('/productos', form);
                toast.success('Producto creado');
            }
            setModalOpen(false);
            fetchData();
        } catch (err) {
            const errors = err.response?.data?.errors;
            if (errors) {
                Object.values(errors).flat().forEach(msg => toast.error(msg));
            } else {
                toast.error(err.response?.data?.message || 'Error al guardar');
            }
        } finally {
            setSaving(false);
        }
    };

    const lowStock  = productos.filter(p => p.stock < (p.stock_minimo || 10)).length;
    const totalVal  = productos.reduce((s, p) => s + (parseFloat(p.precio_unidad) || 0) * (parseInt(p.stock) || 0), 0);

    const columns = [
        {
            key: 'nombre', label: 'Producto',
            render: (row) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{row.nombre}</div>
                    {row.marca && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.marca}</div>}
                </div>
            )
        },
        {
            key: 'codigo_barras', label: 'Código',
            render: (row) => row.codigo_barras
                ? <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--bg-color)', padding: '2px 6px', borderRadius: 4 }}>{row.codigo_barras}</span>
                : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>– sin código</span>
        },
        {
            key: 'precio_unidad', label: 'Precio Unitario',
            render: (row) => <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{fmt(row.precio_unidad)}</span>
        },
        {
            key: 'stock', label: 'Stock',
            render: (row) => {
                const bajo = row.stock < (row.stock_minimo || 10);
                const isCaja = row.cantidad_por_caja > 1;
                let cj = 0, ud = row.stock;
                if (isCaja) {
                    cj = Math.floor(row.stock / row.cantidad_por_caja);
                    ud = row.stock % row.cantidad_por_caja;
                }
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, color: bajo ? 'var(--danger)' : 'var(--success)' }}>
                            {bajo ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                            {row.stock} uds
                        </span>
                        {isCaja && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cj} cj + {ud} uds</span>}
                    </div>
                );
            }
        },
        {
            key: 'estado', label: 'Estado',
            render: (row) => row.estado
                ? <span className="badge badge-success">Activo</span>
                : <span className="badge badge-danger">Inactivo</span>
        },
        {
            key: 'tipo_caja', label: 'Caja Destino',
            render: (row) => (
                <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    padding: '2px 8px', 
                    borderRadius: '10px',
                    background: row.tipo_caja === 'personal' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(0, 210, 255, 0.1)',
                    color: row.tipo_caja === 'personal' ? '#a855f7' : '#00d2ff',
                    border: `1px solid ${row.tipo_caja === 'personal' ? '#a855f733' : '#00d2ff33'}`
                }}>
                    {row.tipo_caja === 'personal' ? '👤 PERSONAL' : '📚 LIBRERÍA'}
                </span>
            )
        },
    ];

    return (
        <div className="animate-fade">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--primary-alpha)', borderRadius: 'var(--radius-lg)' }}>
                        <Package size={24} color="var(--primary)" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Gestión de Productos</h1>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Administra y controla tu inventario</p>
                    </div>
                </div>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={18} /> Nuevo Producto
                    </button>
                )}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {[
                    { label: 'Total Productos', value: productos.length, color: 'var(--primary)' },
                    { label: 'Activos', value: productos.filter(p => p.estado).length, color: 'var(--success)' },
                    { label: 'Stock Bajo', value: lowStock, color: lowStock > 0 ? 'var(--danger)' : 'var(--success)' },
                    { label: 'Valor Inventario', value: `S/ ${totalVal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, color: 'var(--info)' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '140px' }}>
                        <span style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>{s.label}</span>
                    </div>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Cargando inventario...</div>
            ) : (
                <DataTable
                    columns={columns}
                    data={productos}
                    searchPlaceholder="Buscar por nombre, marca o código..."
                    onEdit={isAdmin ? openEdit : undefined}
                    onDelete={isAdmin ? handleDelete : undefined}
                />
            )}

            {/* Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editItem ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
                size="lg"
            >
                <form onSubmit={handleSubmit}>
                    {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>Información Básica</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={labelStyle}>Nombre del Producto *</label>
                                <input className="form-control" type="text" placeholder="Ej. Cuaderno A4 100 hojas" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} autoFocus />
                            </div>
                            <div>
                                <label style={labelStyle}>Código de Barras</label>
                                <input className="form-control" type="text" placeholder="Ej. 7501234567890" value={form.codigo_barras} onChange={e => setForm({ ...form, codigo_barras: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Marca</label>
                                <input className="form-control" type="text" placeholder="Ej. Pilot, Artesco..." value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} />
                            </div>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={labelStyle}>Categoría</label>
                                <select className="form-control" value={form.id_categoria} onChange={e => setForm({ ...form, id_categoria: e.target.value })}>
                                    <option value="">Sin categoría</option>
                                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={labelStyle}>Caja Destino (Ganancia)</label>
                                <select className="form-control" value={form.tipo_caja} onChange={e => setForm({ ...form, tipo_caja: e.target.value })} style={{ border: '1px solid var(--primary)' }}>
                                    <option value="libreria">📚 Caja Librería</option>
                                    <option value="personal">👤 Caja Personal</option>
                                </select>
                                <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Define a qué sesión de caja se enviará el dinero al vender este producto.</p>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: PRECIOS */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>Precios y Costos</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Costo *</label>
                                <input className="form-control" type="number" step="0.01" placeholder="0.00" value={form.costo} onChange={e => setForm({ ...form, costo: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Precio Unitario *</label>
                                <input className="form-control" type="number" step="0.01" placeholder="0.00" value={form.precio_unidad} onChange={e => setForm({ ...form, precio_unidad: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Precio al por Mayor *</label>
                                <input className="form-control" type="number" step="0.01" placeholder="0.00" value={form.precio_mayor} onChange={e => setForm({ ...form, precio_mayor: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 3: INVENTARIO Y PRESENTACIONES */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>Inventario y Presentaciones</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Stock Actual (Unidades) *</label>
                                <input className="form-control" type="number" placeholder="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Stock Mínimo</label>
                                <input className="form-control" type="number" placeholder="10" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, color: 'var(--text-main)', userSelect: 'none' }}>
                                <input 
                                    type="checkbox" 
                                    checked={usaCajas} 
                                    onChange={e => {
                                        setUsaCajas(e.target.checked);
                                        if (!e.target.checked) {
                                            setForm(f => ({ ...f, cantidad_por_caja: 1, precio_caja: 0 }));
                                        }
                                    }} 
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                📦 Vender también por Cajas
                            </label>

                            {usaCajas && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', animation: 'fadeIn 0.3s' }}>
                                    <div>
                                        <label style={labelStyle}>Uds. por Caja</label>
                                        <input className="form-control" type="number" placeholder="Ej. 50" value={form.cantidad_por_caja} onChange={e => setForm({ ...form, cantidad_por_caja: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Precio por Caja</label>
                                        <input className="form-control" type="number" step="0.01" placeholder="0.00" value={form.precio_caja} onChange={e => setForm({ ...form, precio_caja: e.target.value })} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                        <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Guardando...' : (editItem ? 'Actualizar' : 'Crear Producto')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

const labelStyle = {
    display: 'block', marginBottom: '0.4rem',
    fontSize: '0.825rem', fontWeight: 600,
    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em',
};

export default Productos;
