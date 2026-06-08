import React, { useState, useEffect, useContext } from 'react';
import { Users, Plus } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import api from '../../api/axiosBase';
import toast from 'react-hot-toast';
import { AuthContext } from '../../context/AuthContextObject';

const INIT = { nombre: '', documento: '', telefono: '', direccion: '' };

const Clientes = () => {
    const { user } = useContext(AuthContext);
    const isAdmin = ['Administrador', 'admin'].includes(user?.rol);

    const [clientes, setClientes]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem]   = useState(null);
    const [form, setForm]           = useState(INIT);
    const [saving, setSaving]       = useState(false);

    const fetch_ = async () => {
        setLoading(true);
        try { const { data } = await api.get('/clientes'); setClientes(data); }
        catch { toast.error('Error al cargar clientes'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch_(); }, []);

    const openCreate = () => { setEditItem(null); setForm(INIT); setModalOpen(true); };
    const openEdit = (row) => {
        setEditItem(row);
        setForm({ nombre: row.nombre || '', documento: row.documento || '', telefono: row.telefono || '', direccion: row.direccion || '' });
        setModalOpen(true);
    };
    const handleDelete = async (row) => {
        if (!window.confirm(`¿Eliminar a "${row.nombre}"?`)) return;
        try { await api.delete(`/clientes/${row.id}`); toast.success('Cliente eliminado'); fetch_(); }
        catch { toast.error('Error al eliminar'); }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
        setSaving(true);
        try {
            editItem ? await api.put(`/clientes/${editItem.id}`, form) : await api.post('/clientes', form);
            toast.success(editItem ? 'Cliente actualizado' : 'Cliente creado');
            setModalOpen(false); fetch_();
        } catch (err) { toast.error(err.response?.data?.message || 'Error al guardar'); }
        finally { setSaving(false); }
    };

    const columns = [
        {
            key: 'nombre', label: 'Nombre del Cliente',
            render: (r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-alpha)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                        {r.nombre.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600 }}>{r.nombre}</span>
                </div>
            )
        },
        { key: 'documento', label: 'DNI / RUC', render: (r) => r.documento || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>–</span> },
        { key: 'telefono', label: 'Teléfono', render: (r) => r.telefono ? `📞 ${r.telefono}` : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>–</span> },
        { key: 'direccion', label: 'Dirección', render: (r) => r.direccion || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>–</span> },
        {
            key: 'estado', label: 'Estado',
            render: (r) => r.estado ? <span className="badge badge-success">✅ Activo</span> : <span className="badge badge-danger">❌ Inactivo</span>
        },
    ];

    const L = { display: 'block', marginBottom: '0.4rem', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' };

    return (
        <div className="animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--primary-alpha)', borderRadius: 'var(--radius-lg)' }}><Users size={24} color="var(--primary)" /></div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Cartera de Clientes</h1>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Base de datos de exclusividad</p>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Nuevo Cliente</button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {[
                    { label: 'Total', value: clientes.length, color: 'var(--primary)' },
                    { label: 'Activos', value: clientes.filter(c => c.estado).length, color: 'var(--success)' },
                    { label: 'Inactivos', value: clientes.filter(c => !c.estado).length, color: 'var(--danger)' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '120px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>{s.label}</span>
                    </div>
                ))}
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Cargando clientes...</div> : (
                <DataTable columns={columns} data={clientes} searchPlaceholder="Buscar por nombre o documento..." onEdit={openEdit} onDelete={isAdmin ? handleDelete : undefined} />
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div><label style={L}>Nombre del Cliente *</label><input className="form-control" type="text" placeholder="Nombre completo" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} autoFocus /></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div><label style={L}>DNI / RUC</label><input className="form-control" type="text" placeholder="Número de documento" value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} /></div>
                            <div><label style={L}>Teléfono</label><input className="form-control" type="text" placeholder="999 999 999" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
                        </div>
                        <div><label style={L}>Dirección</label><textarea className="form-control" rows={2} placeholder="Dirección completa..." value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
                        {editItem && <div><label style={L}>Estado</label><select className="form-control" value={form.estado ?? 1} onChange={e => setForm({ ...form, estado: Number(e.target.value) })}><option value={1}>✅ Activo</option><option value={0}>❌ Inactivo</option></select></div>}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : (editItem ? 'Actualizar' : 'Registrar Cliente')}</button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Clientes;
