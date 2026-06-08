import React, { useState, useEffect, useContext } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, ShoppingBag, PackageOpen, TrendingUp, AlertTriangle } from 'lucide-react';
import api from '../../api/axiosBase';
import Modal from '../../components/Modal';
import { AuthContext } from '../../context/AuthContextObject';

const dataArea = [
    { name: 'Lun', ingresos: 1200 },
    { name: 'Mar', ingresos: 1900 },
    { name: 'Mié', ingresos: 1500 },
    { name: 'Jue', ingresos: 2100 },
    { name: 'Vie', ingresos: 2800 },
    { name: 'Sáb', ingresos: 3500 },
    { name: 'Dom', ingresos: 2900 },
];

const dataBar = [
    { name: 'Electrónica', ventas: 400 },
    { name: 'Oficina', ventas: 300 },
    { name: 'Mochilas', ventas: 200 },
    { name: 'Librería', ventas: 278 },
    { name: 'Regalos', ventas: 189 },
];

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const isAdmin = ['Administrador', 'admin'].includes(user?.rol);

    const [kpis, setKpis] = useState({
        ingresosHoy: 0,
        ventasHoy: 0,
        stockBajo: 0,
        inventarioTotal: 0
    });
    
    const [charts, setCharts] = useState({
        area: [],
        bar: []
    });

    const [isStockModalOpen, setStockModalOpen] = useState(false);
    const [lowStockProducts, setLowStockProducts] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Método confiable: obtener fecha local como YYYY-MM-DD sin confusión de zona horaria
                const todayStr = new Intl.DateTimeFormat('en-CA').format(new Date());

                const requests = [
                    api.get(`/ventas?fecha_inicio=${todayStr}&fecha_fin=${todayStr}`),
                    api.get('/productos')
                ];
                if (isAdmin) {
                    requests.push(api.get('/dashboard/charts'));
                }

                const results = await Promise.allSettled(requests);

                const ventasRes  = results[0];
                const productosRes = results[1];
                const chartsRes  = isAdmin ? results[2] : null;

                // Procesar Ventas
                let ingresosHoy = 0;
                let ventasHoy   = 0;
                if (ventasRes.status === 'fulfilled') {
                    const ventas = ventasRes.value.data || [];
                    console.log(`✅ Ventas hoy (${todayStr}):`, ventas.length, ventas);
                    ingresosHoy = ventas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
                    ventasHoy   = ventas.length;
                } else {
                    console.error("❌ Error ventas:", ventasRes.reason?.response?.status, ventasRes.reason?.message);
                }

                // Procesar Productos (umbral stock bajo = 5, igual que la vista de inventario)
                let stockBajo     = 0;
                let inventarioTotal = 0;
                let arrStockBajo  = [];
                if (productosRes.status === 'fulfilled') {
                    const productos = productosRes.value.data || [];
                    console.log(`✅ Productos cargados:`, productos.length);
                    arrStockBajo    = productos.filter(p => parseInt(p.stock) <= 5);
                    stockBajo       = arrStockBajo.length;
                    inventarioTotal = productos.reduce((sum, p) => sum + (parseFloat(p.precio_unidad || 0) * Math.max(0, parseInt(p.stock || 0))), 0);
                    setLowStockProducts(arrStockBajo.sort((a, b) => parseInt(a.stock) - parseInt(b.stock)));
                } else {
                    console.error("❌ Error productos:", productosRes.reason?.response?.status, productosRes.reason?.message);
                }

                setKpis({ ingresosHoy, ventasHoy, stockBajo, inventarioTotal });

                // Procesar Gráficos
                if (isAdmin && chartsRes && chartsRes.status === 'fulfilled') {
                    const chartsData = chartsRes.value.data || {};
                    const areaData   = (chartsData.ingresos7Dias || []).map(item => {
                        const d       = new Date(item.fecha + 'T00:00:00');
                        const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
                        return {
                            name: dayName.charAt(0).toUpperCase() + dayName.slice(1).replace('.', ''),
                            ingresos: parseFloat(item.ingresos || 0)
                        };
                    });
                    setCharts({
                        area: areaData.length > 0 ? areaData : dataArea,
                        bar: (chartsData.ventasPorCategoria || []).length > 0
                            ? chartsData.ventasPorCategoria.map(item => ({ name: item.name, ventas: parseInt(item.ventas || 0) }))
                            : dataBar
                    });
                } else if (isAdmin) {
                    console.error("❌ Error charts:", chartsRes?.reason?.response?.status, chartsRes?.reason?.message);
                }

            } catch (error) {
                console.error("❌ Error fatal dashboard:", error);
            }
        };

        fetchDashboardData();
    }, [isAdmin]);

    return (
        <div style={styles.container} className="animate-fade">
            {/* KPI Cards */}
            <div style={styles.kpiGrid}>
                {isAdmin && (
                    <div className="card card-hoverable" style={styles.kpiCard}>
                        <div style={styles.kpiHeader}>
                            <div>
                                <p style={styles.kpiTitle}>Ingresos Hoy</p>
                                <h3 style={styles.kpiValue}>S/ {kpis.ingresosHoy.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                            </div>
                            <div style={{...styles.kpiIconBox, backgroundColor: 'var(--success-light)', color: 'var(--success)'}}>
                                <DollarSign size={24} />
                            </div>
                        </div>
                        <div style={styles.kpiFooter}>
                            <span style={styles.badgeSuccessTrend}>
                                <TrendingUp size={14} /> +0.0%
                            </span>
                            <span style={styles.footerText}>vs ayer</span>
                        </div>
                    </div>
                )}

                <div className="card card-hoverable" style={styles.kpiCard}>
                    <div style={styles.kpiHeader}>
                        <div>
                            <p style={styles.kpiTitle}>Ventas Realizadas</p>
                            <h3 style={styles.kpiValue}>{kpis.ventasHoy}</h3>
                        </div>
                        <div style={{...styles.kpiIconBox, backgroundColor: 'var(--primary-light)', color: 'var(--primary)'}}>
                            <ShoppingBag size={24} />
                        </div>
                    </div>
                    <div style={styles.kpiFooter}>
                        <span style={styles.badgePrimaryTrend}>
                            <TrendingUp size={14} /> +0.0%
                        </span>
                        <span style={styles.footerText}>vs ayer</span>
                    </div>
                </div>

                <div className="card card-hoverable" style={{...styles.kpiCard, cursor: 'pointer', border: '1px solid rgba(244, 63, 94, 0.2)'}} onClick={() => setStockModalOpen(true)}>
                    <div style={styles.kpiHeader}>
                        <div>
                            <p style={styles.kpiTitle}>Stock Bajo</p>
                            <h3 style={styles.kpiValue}>{kpis.stockBajo} <span style={{fontSize: '1rem'}}>productos</span></h3>
                        </div>
                        <div style={{...styles.kpiIconBox, backgroundColor: 'var(--danger-light)', color: 'var(--danger)'}}>
                            <PackageOpen size={24} />
                        </div>
                    </div>
                    <div style={styles.kpiFooter}>
                        <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={16} /> Ver detalles</span>
                    </div>
                </div>

                {isAdmin && (
                    <div className="card card-hoverable" style={styles.kpiCard}>
                        <div style={styles.kpiHeader}>
                            <div>
                                <p style={styles.kpiTitle}>Total Inventario</p>
                                <h3 style={styles.kpiValue}>S/ {kpis.inventarioTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                            </div>
                            <div style={{...styles.kpiIconBox, backgroundColor: 'var(--warning-light)', color: 'var(--warning)'}}>
                                <DollarSign size={24} />
                            </div>
                        </div>
                        <div style={styles.kpiFooter}>
                            <span style={styles.footerText}>Valorizado actual</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Charts Area */}
            {isAdmin && (
                <div style={styles.chartsGrid}>
                    <div className="card" style={styles.chartCard}>
                        <div style={styles.chartHeader}>
                            <h4 style={styles.chartTitle}>Ingresos Últimos 7 Días</h4>
                        </div>
                        <div style={styles.chartBody}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={charts.area.length > 0 ? charts.area : dataArea} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.05}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `S/${value}`} dx={-10} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', padding: '10px 15px', boxShadow: 'var(--shadow-md)' }}
                                        itemStyle={{ color: 'var(--primary)', fontWeight: '700', fontSize: '1rem', margin: 0 }}
                                        formatter={(value) => [`S/ ${value}`, 'Total']}
                                        labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px' }}
                                    />
                                    <Area type="monotone" dataKey="ingresos" stroke="var(--primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorIngresos)" activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--bg-color)', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="card glass" style={styles.chartCard}>
                        <div style={styles.chartHeader}>
                            <h4 style={styles.chartTitle}>Ventas por Categoría</h4>
                        </div>
                        <div style={styles.chartBody}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.bar.length > 0 ? charts.bar : dataBar} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                    <Tooltip 
                                        cursor={{ fill: 'var(--border-color)' }}
                                        contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', color: 'var(--text-main)', borderRadius: '1rem', padding: '10px 15px', boxShadow: 'var(--shadow-md)' }}
                                        itemStyle={{ color: 'var(--primary)', fontWeight: '700', fontSize: '1rem', margin: 0 }}
                                        formatter={(value) => [`${value} unids.`, 'Total Ventas']}
                                        labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px' }}
                                    />
                                    <Bar dataKey="ventas" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Stock Bajo */}
            <Modal isOpen={isStockModalOpen} onClose={() => setStockModalOpen(false)} title="Productos con Stock Crítico" size="lg">
                {lowStockProducts.length > 0 ? (
                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', backdropFilter: 'blur(5px)' }}>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '1rem' }}>Código</th>
                                    <th style={{ padding: '1rem' }}>Producto</th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>Stock Actual</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lowStockProducts.map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.codigo || p.codigo_barras || '-'}</td>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>{p.nombre}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <span style={{ 
                                                background: p.stock === 0 ? 'var(--danger-light)' : 'rgba(245, 158, 11, 0.1)', 
                                                color: p.stock === 0 ? 'var(--danger)' : 'var(--warning)', 
                                                padding: '0.3rem 0.8rem', 
                                                borderRadius: 'var(--radius-full)', 
                                                fontWeight: 'bold' 
                                            }}>
                                                {p.stock}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <PackageOpen size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                        <p style={{ fontSize: '1.1rem' }}>Todos los productos cuentan con inventario suficiente.</p>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem'
    },
    kpiGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.5rem'
    },
    kpiCard: {
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        cursor: 'default',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)'
    },
    kpiHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    kpiTitle: {
        margin: '0 0 0.25rem 0',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '2px'
    },
    kpiValue: {
        margin: 0,
        fontSize: '2.2rem',
        color: 'var(--text-main)',
        fontWeight: '900',
        letterSpacing: '-1.5px'
    },
    kpiIconBox: {
        width: '52px',
        height: '52px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'inset 0 0 10px var(--border-color)'
    },
    kpiFooter: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border-color)'
    },
    badgeSuccessTrend: { color: 'var(--success)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '2rem' },
    badgePrimaryTrend: { color: 'var(--primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', backgroundColor: 'rgba(0, 210, 255, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '2rem' },
    footerText: { color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.5px' },
    chartsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: '1.5rem'
    },
    chartCard: {
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        height: '420px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border-color)'
    },
    chartHeader: {
        marginBottom: '2rem'
    },
    chartTitle: { margin: 0, color: 'var(--text-main)', fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' },
    chartBody: {
        flex: 1,
        width: '100%'
    }
};

export default Dashboard;
