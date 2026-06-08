import React, { useState, useEffect } from 'react';
import { Barcode, Filter } from 'lucide-react';
import api from '../../api/axiosBase';
import toast from 'react-hot-toast';

const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };

const MOCK_MOVIMIENTOS = [
    { id: 1, fecha: new Date().toISOString(), producto: 'Cuaderno A4', tipo: 'ENTRADA', cantidad: 50, stock_final: 120, usuario: 'Moises' },
    { id: 2, fecha: new Date().toISOString(), producto: 'Colores 12 piezas', tipo: 'SALIDA', cantidad: 3, stock_final: 27, usuario: 'Moises' },
];

const Kardex = () => {
    const [fechaInicio, setFechaInicio] = useState(daysAgo(30));
    const [fechaFin, setFechaFin]       = useState(today());
    const [search, setSearch]           = useState('');
    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading]         = useState(true);

    const fetchMovimientos = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/inventario', { 
                params: { 
                    fecha_inicio: fechaInicio, 
                    fecha_fin: fechaFin, 
                    producto: search 
                } 
            });
            setMovimientos(data);
        } catch {
            toast.error('Error al cargar movimientos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMovimientos();
    }, []);

    return (
        <div className="animate-fade">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', background: 'var(--primary-alpha)', borderRadius: 'var(--radius-lg)' }}>
                    <Barcode size={24} color="var(--primary)" />
                </div>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Kardex de Inventario</h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Historial de movimientos de stock — entradas y salidas</p>
                </div>
            </div>

            {/* Filtros */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={L}>Fecha inicio</label>
                        <input className="form-control" type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                    </div>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={L}>Fecha fin</label>
                        <input className="form-control" type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
                    </div>
                    <div style={{ flex: 2, minWidth: '200px' }}>
                        <label style={L}>Buscar producto</label>
                        <input 
                            className="form-control" 
                            type="text" 
                            placeholder="Nombre del producto..." 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={fetchMovimientos}><Filter size={16} /> Filtrar</button>
                </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'var(--bg-color)' }}>
                        <tr>
                            {['Fecha', 'Producto', 'Tipo Movimiento', 'Cantidad', 'Stock Resultante', 'Usuario'].map(h => (
                                <th key={h} style={TH}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Cargando movimientos...</td></tr>
                        ) : movimientos.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No se encontraron movimientos</td></tr>
                        ) : movimientos.map(m => (
                            <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={TD}>{new Date(m.fecha).toLocaleString('es-PE')}</td>
                                <td style={{ ...TD, fontWeight: 600 }}>{m.producto?.nombre || 'Producto Eliminado'}</td>
                                <td style={TD}>
                                    <span className={`badge ${m.tipo.includes('ENTRADA') ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                                        {m.tipo.includes('ENTRADA') ? '⬆️' : '⬇️'} {m.tipo}
                                    </span>
                                </td>
                                <td style={{ ...TD, fontWeight: 700, color: m.tipo.includes('ENTRADA') ? 'var(--success)' : 'var(--danger)' }}>
                                    {m.tipo.includes('ENTRADA') ? '+' : '-'}{m.cantidad}
                                </td>
                                <td style={TD}><span style={{ fontWeight: 700 }}>{m.stock_restante}</span> uds</td>
                                <td style={TD}>Sistema</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                💡 El Kardex se alimenta automáticamente con cada venta y compra registrada en el sistema.
            </p>
        </div>
    );
};

const L = { display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const TH = { padding: '1rem 1.25rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' };
const TD = { padding: '0.875rem 1.25rem', verticalAlign: 'middle', fontSize: '0.875rem', color: 'var(--text-main)', whiteSpace: 'nowrap' };

export default Kardex;
