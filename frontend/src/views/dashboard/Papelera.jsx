import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import api from '../../api/axiosBase';
import toast from 'react-hot-toast';

const TABS = [
    { key: 'ventas', label: 'Ventas', endpoint: '/ventas', estado: 'Cancelada' },
    { key: 'productos', label: '📦 Productos', endpoint: '/productos', inactivo: true },
    { key: 'categorias', label: '🏷️ Categorías', endpoint: '/categorias', inactivo: true },
    { key: 'clientes', label: '👥 Clientes', endpoint: '/clientes', inactivo: true },
    { key: 'proveedores', label: '🚚 Proveedores', endpoint: '/proveedores', inactivo: true },
    { key: 'usuarios', label: '👤 Usuarios', endpoint: '/usuarios', inactivo: true },
];

const Papelera = () => {
    const [activeTab, setActiveTab] = useState('ventas');
    const [items, setItems]         = useState([]);
    const [loading, setLoading]     = useState(false);

    const fetchItems = async (tab = activeTab) => {
        setLoading(true);
        try {
            const tabConfig = TABS.find(t => t.key === tab);
            const { data } = await api.get(tabConfig?.endpoint, tabConfig?.estado ? { params: { estado: tabConfig.estado } } : undefined);
            setItems(Array.isArray(data) ? data.filter(i => {
                if (tabConfig?.estado) return i.estado === tabConfig.estado;
                return !i.estado;
            }) : []);
        } catch { toast.error('Error al cargar la papelera'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchItems(activeTab); }, [activeTab]);

    const handleRestore = async (item) => {
        const tab = TABS.find(t => t.key === activeTab);
        if (!window.confirm(`¿Restaurar este registro?`)) return;
        try {
            if (activeTab === 'ventas') {
                await api.post(`/ventas/${item.id}/restaurar`);
                toast.success('Venta restaurada correctamente');
            } else {
                await api.put(`${tab.endpoint}/${item.id}`, { estado: 1 });
                toast.success('Registro restaurado correctamente');
            }
            fetchItems();
        } catch (e) { toast.error(e.response?.data?.message || 'Error al restaurar'); }
    };

    const getLabel = (item) => {
        if (activeTab === 'ventas') {
            const fecha = item.fecha ? new Date(item.fecha).toLocaleString('es-PE') : '';
            const total = Number(item.total || 0).toFixed(2);
            return `Venta #${String(item.id).padStart(6, '0')} - S/ ${total}${fecha ? ` - ${fecha}` : ''}`;
        }
        return item.nombre || item.usuario || `#${item.id}`;
    };

    return (
        <div className="animate-fade">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(220,38,38,0.1)', borderRadius: 'var(--radius-lg)' }}>
                    <Trash2 size={24} color="var(--danger)" />
                </div>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Papelera de Reciclaje</h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Recuperación de datos eliminados / desactivados</p>
                </div>
            </div>

            {/* Alerta informativa */}
            <div style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-lg)', padding: '0.875rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--warning)' }}>
                    Los registros aquí mostrados están <strong>desactivados o anulados</strong>. Puedes restaurarlos para que vuelvan a estar disponibles en el sistema.
                </p>
            </div>

            {/* Pestañas */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
                {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        style={{ padding: '0.625rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: activeTab === tab.key ? 700 : 500, color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: '-2px', fontSize: '0.875rem', transition: 'all 0.15s' }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tabla */}
            <div className="card" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Cargando...</div>
                ) : items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
                        <Trash2 size={48} opacity={0.3} />
                        <p style={{ marginTop: '1rem', fontWeight: 500 }}>La papelera está vacía en esta sección</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: 'var(--bg-color)' }}>
                            <tr>
                                <th style={TH}>Nombre / Identificador</th>
                                <th style={TH}>ID</th>
                                <th style={{ ...TH, textAlign: 'center' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={TD}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <span className="badge badge-danger">{activeTab === 'ventas' ? 'Anulada' : 'Inactivo'}</span>
                                            <span style={{ fontWeight: 600 }}>{getLabel(item)}</span>
                                        </div>
                                    </td>
                                    <td style={TD}><span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>#{item.id}</span></td>
                                    <td style={{ ...TD, textAlign: 'center' }}>
                                        <button className="btn btn-outline" style={{ gap: '0.4rem', padding: '0.4rem 0.875rem', fontSize: '0.8rem', color: 'var(--success)', borderColor: 'var(--success)' }}
                                            onClick={() => handleRestore(item)}>
                                            <RotateCcw size={14} /> Restaurar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

const TH = { padding: '1rem 1.25rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' };
const TD = { padding: '0.875rem 1.25rem', verticalAlign: 'middle', fontSize: '0.875rem', color: 'var(--text-main)' };

export default Papelera;
