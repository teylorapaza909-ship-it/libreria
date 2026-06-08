import React, { useState, useEffect } from 'react';
import { Truck, Plus, CheckCircle2, XCircle } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import api from '../../api/axiosBase';
import toast from 'react-hot-toast';

const INITIAL_FORM = { nombre: '', telefono: '' };

const Proveedores = () => {
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading]         = useState(true);
    const [modalOpen, setModalOpen]     = useState(false);
    const [editItem, setEditItem]       = useState(null);
    const [form, setForm]               = useState(INITIAL_FORM);
    const [saving, setSaving]           = useState(false);

    const fetchProveedores = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/proveedores');
            setProveedores(data);
        } catch {
            toast.error('Error al cargar proveedores');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProveedores(); }, []);

    const openCreate = () => {
        setEditItem(null);
        setForm(INITIAL_FORM);
        setModalOpen(true);
    };

    const openEdit = (row) => {
        setEditItem(row);
        setForm({ nombre: row.nombre, telefono: row.telefono || '' });
        setModalOpen(true);
    };

    const handleDelete = async (row) => {
        if (!window.confirm(`¿Desactivar al proveedor "${row.nombre}"?`)) return;
        try {
            await api.delete(`/proveedores/${row.id}`);
            toast.success('Proveedor desactivado');
            fetchProveedores();
        } catch {
            toast.error('Error al desactivar');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
        setSaving(true);
        try {
            if (editItem) {
                await api.put(`/proveedores/${editItem.id}`, form);
                toast.success('Proveedor actualizado');
            } else {
                await api.post('/proveedores', form);
                toast.success('Proveedor creado');
            }
            setModalOpen(false);
            fetchProveedores();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            key: 'nombre', label: 'Nombre / Razón Social',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--primary-alpha)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                        {row.nombre.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600 }}>{row.nombre}</span>
                </div>
            )
        },
        {
            key: 'telefono', label: 'Teléfono de Contacto',
            render: (row) => row.telefono ? (
                <span style={{ fontFamily: 'monospace' }}>📞 {row.telefono}</span>
            ) : (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin teléfono</span>
            )
        },
        {
            key: 'estado', label: 'Estado Operativo',
            render: (row) => row.estado ? (
                <span className="badge badge-success"><CheckCircle2 size={12} /> Activo</span>
            ) : (
                <span className="badge badge-danger"><XCircle size={12} /> Inactivo</span>
            )
        },
    ];

    return (
        <div className="animate-fade">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--primary-alpha)', borderRadius: 'var(--radius-lg)' }}>
                        <Truck size={24} color="var(--primary)" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Proveedores</h1>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gestiona tus socios comerciales</p>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>
                    <Plus size={18} /> Agregar Proveedor
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {[
                    { label: 'Total', value: proveedores.length, color: 'var(--primary)' },
                    { label: 'Activos', value: proveedores.filter(p => p.estado).length, color: 'var(--success)' },
                    { label: 'Inactivos', value: proveedores.filter(p => !p.estado).length, color: 'var(--danger)' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '120px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>{s.label}</span>
                    </div>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Cargando proveedores...</div>
            ) : (
                <DataTable
                    columns={columns}
                    data={proveedores}
                    searchPlaceholder="Buscar por nombre o teléfono..."
                    onEdit={openEdit}
                    onDelete={handleDelete}
                />
            )}

            {/* Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editItem ? '✏️ Editar Proveedor' : '➕ Nuevo Proveedor'}
            >
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={labelStyle}>Nombre / Razón Social *</label>
                            <input
                                className="form-control"
                                type="text"
                                placeholder="Ej. Distribuidora El Sol..."
                                value={form.nombre}
                                onChange={e => setForm({ ...form, nombre: e.target.value })}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Teléfono de Contacto</label>
                            <input
                                className="form-control"
                                type="text"
                                placeholder="Ej. 987654321"
                                value={form.telefono}
                                onChange={e => setForm({ ...form, telefono: e.target.value })}
                            />
                        </div>
                        {editItem && (
                            <div>
                                <label style={labelStyle}>Estado</label>
                                <select className="form-control" value={form.estado ?? 1} onChange={e => setForm({ ...form, estado: Number(e.target.value) })}>
                                    <option value={1}>✅ Activo</option>
                                    <option value={0}>❌ Inactivo</option>
                                </select>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Guardando...' : (editItem ? 'Actualizar' : 'Crear Proveedor')}
                            </button>
                        </div>
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

export default Proveedores;
