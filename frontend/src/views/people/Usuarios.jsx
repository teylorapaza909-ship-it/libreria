import React, { useState, useEffect } from 'react';
import { UserCog, Plus, Shield, Coffee } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import api from '../../api/axiosBase';
import toast from 'react-hot-toast';

const INITIAL_FORM = { usuario: '', password: '', rol: 'Cajero' };

const getRolBadge = (rol) => {
    if (rol === 'Administrador') return <span className="badge badge-primary" style={{ gap: '4px' }}><Shield size={11} /> Administrador</span>;
    return <span className="badge badge-warning" style={{ gap: '4px' }}><Coffee size={11} /> Cajero</span>;
};

const Usuarios = () => {
    const [usuarios, setUsuarios]     = useState([]);
    const [loading, setLoading]       = useState(true);
    const [modalOpen, setModalOpen]   = useState(false);
    const [editItem, setEditItem]     = useState(null);
    const [form, setForm]             = useState(INITIAL_FORM);
    const [saving, setSaving]         = useState(false);

    const fetchUsuarios = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/usuarios');
            setUsuarios(data);
        } catch {
            toast.error('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsuarios(); }, []);

    const openCreate = () => {
        setEditItem(null);
        setForm(INITIAL_FORM);
        setModalOpen(true);
    };

    const openEdit = (row) => {
        setEditItem(row);
        setForm({ usuario: row.usuario, password: '', rol: row.rol });
        setModalOpen(true);
    };

    const handleDelete = async (row) => {
        if (!window.confirm(`¿Desactivar al usuario "${row.usuario}"?`)) return;
        try {
            await api.delete(`/usuarios/${row.id}`);
            toast.success('Usuario desactivado');
            fetchUsuarios();
        } catch {
            toast.error('Error al desactivar');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.usuario.trim()) { toast.error('El usuario es obligatorio'); return; }
        if (!editItem && !form.password) { toast.error('La contraseña es obligatoria'); return; }
        setSaving(true);
        try {
            const payload = { usuario: form.usuario, rol: form.rol };
            if (form.password) payload.password = form.password;
            if (editItem) {
                await api.put(`/usuarios/${editItem.id}`, payload);
                toast.success('Usuario actualizado');
            } else {
                await api.post('/usuarios', { ...payload, password: form.password });
                toast.success('Usuario creado');
            }
            setModalOpen(false);
            fetchUsuarios();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            key: 'usuario', label: 'Nombre de Usuario',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                        {row.usuario.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600 }}>{row.usuario}</span>
                </div>
            )
        },
        { key: 'rol', label: 'Rol / Permiso', render: (row) => getRolBadge(row.rol) },
        {
            key: 'estado', label: 'Estado de Cuenta',
            render: (row) => row.estado ? (
                <span className="badge badge-success">✅ Activo</span>
            ) : (
                <span className="badge badge-danger">🚫 Inactivo</span>
            )
        },
    ];

    return (
        <div className="animate-fade">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--primary-alpha)', borderRadius: 'var(--radius-lg)' }}>
                        <UserCog size={24} color="var(--primary)" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Gestión de Usuarios</h1>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Administra el acceso al sistema</p>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>
                    <Plus size={18} /> Nuevo Usuario
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {[
                    { label: 'Total', value: usuarios.length, color: 'var(--primary)' },
                    { label: 'Administradores', value: usuarios.filter(u => u.rol === 'Administrador').length, color: 'var(--info)' },
                    { label: 'Cajeros', value: usuarios.filter(u => u.rol === 'Cajero').length, color: 'var(--warning)' },
                    { label: 'Activos', value: usuarios.filter(u => u.estado).length, color: 'var(--success)' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '120px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>{s.label}</span>
                    </div>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Cargando usuarios...</div>
            ) : (
                <DataTable
                    columns={columns}
                    data={usuarios}
                    searchPlaceholder="Buscar por nombre de usuario..."
                    onEdit={openEdit}
                    onDelete={handleDelete}
                />
            )}

            {/* Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editItem ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}
            >
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={labelStyle}>Nombre de Usuario *</label>
                            <input
                                className="form-control"
                                type="text"
                                placeholder="Ej. Maria, Vendedor01..."
                                value={form.usuario}
                                onChange={e => setForm({ ...form, usuario: e.target.value })}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Contraseña {editItem ? '(dejar vacío para no cambiar)' : '*'}</label>
                            <input
                                className="form-control"
                                type="password"
                                placeholder={editItem ? '••••••' : 'Mínimo 6 caracteres'}
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Rol / Permiso *</label>
                            <select className="form-control" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
                                <option value="Cajero">☕ Cajero</option>
                                <option value="Administrador">🛡️ Administrador</option>
                            </select>
                        </div>
                        {editItem && (
                            <div>
                                <label style={labelStyle}>Estado</label>
                                <select className="form-control" value={form.estado ?? 1} onChange={e => setForm({ ...form, estado: Number(e.target.value) })}>
                                    <option value={1}>✅ Activo</option>
                                    <option value={0}>🚫 Inactivo</option>
                                </select>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Guardando...' : (editItem ? 'Actualizar' : 'Crear Usuario')}
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

export default Usuarios;
