import React, { useState, useEffect } from 'react';
import { Tags, Plus, CheckCircle2, XCircle } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import api from '../../api/axiosBase';
import toast from 'react-hot-toast';

const INITIAL_FORM = { nombre: '', tipo_negocio: 'libreria' };

const Categorias = () => {
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [modalOpen, setModalOpen]   = useState(false);
    const [editItem, setEditItem]     = useState(null);
    const [form, setForm]             = useState(INITIAL_FORM);
    const [saving, setSaving]         = useState(false);

    const fetchCategorias = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/categorias');
            setCategorias(data);
        } catch {
            toast.error('Error al cargar categorías');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCategorias(); }, []);

    const openCreate = () => {
        setEditItem(null);
        setForm(INITIAL_FORM);
        setModalOpen(true);
    };

    const openEdit = (row) => {
        setEditItem(row);
        setForm({ nombre: row.nombre, tipo_negocio: row.tipo_negocio || 'libreria' });
        setModalOpen(true);
    };

    const handleDelete = async (row) => {
        if (!window.confirm(`¿Desactivar la categoría "${row.nombre}"?`)) return;
        try {
            await api.delete(`/categorias/${row.id}`);
            toast.success('Categoría desactivada');
            fetchCategorias();
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
                await api.put(`/categorias/${editItem.id}`, form);
                toast.success('Categoría actualizada');
            } else {
                await api.post('/categorias', form);
                toast.success('Categoría creada');
            }
            setModalOpen(false);
            fetchCategorias();
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al guardar';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            key: 'nombre', label: 'Nombre de Categoría',
            render: (row) => <span style={{ fontWeight: 600 }}>{row.nombre}</span>
        },
        {
            key: 'tipo_negocio', label: 'Tipo de Negocio',
            render: (row) => (
                <span className={`badge badge-${row.tipo_negocio === 'libreria' ? 'primary' : 'warning'}`}>
                    {row.tipo_negocio === 'libreria' ? '📚 Librería' : '👤 Personal'}
                </span>
            )
        },
        {
            key: 'estado', label: 'Estado',
            render: (row) => row.estado ? (
                <span className="badge badge-success" style={{ gap: '4px' }}>
                    <CheckCircle2 size={12} /> Activo
                </span>
            ) : (
                <span className="badge badge-danger" style={{ gap: '4px' }}>
                    <XCircle size={12} /> Inactivo
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
                        <Tags size={24} color="var(--primary)" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-main)' }}>Categorías</h1>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Organiza tu catálogo con estilo</p>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={openCreate} style={{ gap: '0.5rem' }}>
                    <Plus size={18} /> Agregar Categoría
                </button>
            </div>

            {/* Stats mini */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {[
                    { label: 'Total', value: categorias.length, color: 'var(--primary)' },
                    { label: 'Activas', value: categorias.filter(c => c.estado).length, color: 'var(--success)' },
                    { label: 'Inactivas', value: categorias.filter(c => !c.estado).length, color: 'var(--danger)' },
                ].map(stat => (
                    <div key={stat.label} className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1', minWidth: '120px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color }}>{stat.value}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>{stat.label}</span>
                    </div>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Cargando categorías...</div>
            ) : (
                <DataTable
                    columns={columns}
                    data={categorias}
                    searchPlaceholder="Buscar por nombre..."
                    onEdit={openEdit}
                    onDelete={handleDelete}
                />
            )}

            {/* Modal Crear / Editar */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editItem ? '✏️ Editar Categoría' : '➕ Nueva Categoría'}
            >
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={labelStyle}>Nombre de Categoría *</label>
                            <input
                                className="form-control"
                                type="text"
                                placeholder="Ej. Cuadernos, Colores..."
                                value={form.nombre}
                                onChange={e => setForm({ ...form, nombre: e.target.value })}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Tipo de Negocio</label>
                            <select
                                className="form-control"
                                value={form.tipo_negocio}
                                onChange={e => setForm({ ...form, tipo_negocio: e.target.value })}
                            >
                                <option value="libreria">📚 Librería / Escolar</option>
                                <option value="personal">👤 Uso Personal</option>
                            </select>
                        </div>
                        {editItem && (
                            <div>
                                <label style={labelStyle}>Estado</label>
                                <select
                                    className="form-control"
                                    value={form.estado ?? 1}
                                    onChange={e => setForm({ ...form, estado: Number(e.target.value) })}
                                >
                                    <option value={1}>✅ Activo</option>
                                    <option value={0}>❌ Inactivo</option>
                                </select>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Guardando...' : (editItem ? 'Actualizar' : 'Crear Categoría')}
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

export default Categorias;
