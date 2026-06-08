import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, Lock, Unlock, Clock, Info, Banknote, Smartphone, CreditCard, Landmark, ArrowLeftRight, RefreshCw, AlertTriangle } from 'lucide-react';
import Modal from '../../components/Modal';
import api from '../../api/axiosBase';
import toast from 'react-hot-toast';

const CajaDia = () => {
    // ESTADOS GLOBALES DE LA VISTA
    const [cajas, setCajas] = useState(null);
    const [selectedCajaId, setSelectedCajaId] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // ESTADOS DE MODALES
    const [abrirModal, setAbrirModal] = useState({ isOpen: false, cajaId: null });
    const [movimientoModal, setMovimientoModal] = useState({ isOpen: false, tipo: 'entrada' });
    const [cerrarModal, setCerrarModal] = useState(false);
    const [historialModal, setHistorialModal] = useState({ isOpen: false, cajaId: null });

    // ESTADOS DE FORMULARIOS
    const [montoInicial, setMontoInicial] = useState('');
    const [formMov, setFormMov] = useState({ monto: '', descripcion: '' });
    const [efectivoDeclarado, setEfectivoDeclarado] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/cajas-dashboard');
            // Validar que la respuesta sea un objeto válido
            if (res.data && typeof res.data === 'object') {
                setCajas(res.data);
            } else {
                throw new Error("Formato de respuesta inválido del servidor");
            }
        } catch (error) {
            console.error("Error fetching cajas:", error);
            setError(error.response?.data?.message || error.message || 'Error de conexión');
            toast.error('Error al cargar datos de las cajas');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // HANDLERS
    const handleAbrirCajaSubmit = async () => {
        const amt = parseFloat(montoInicial) || 0;
        const cid = abrirModal.cajaId;
        
        toast.loading('Abriendo caja...', { id: 'abrir' });
        try {
            await api.post('/cajas/abrir', { tipo_caja: cid, monto_inicial: amt });
            toast.success('Caja abierta exitosamente', { id: 'abrir' });
            setAbrirModal({ isOpen: false, cajaId: null });
            setMontoInicial('');
            await fetchData();
            setSelectedCajaId(cid);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al abrir la caja', { id: 'abrir' });
        }
    };

    const handleMovimientoSubmit = async () => {
        const amt = parseFloat(formMov.monto);
        if (!amt || !formMov.descripcion) return toast.error('Por favor llene todos los campos.');
        
        toast.loading('Registrando...', { id: 'mov' });
        try {
            await api.post('/cajas/movimiento', {
                id_caja: activeCaja.id,
                tipo: movimientoModal.tipo,
                descripcion: formMov.descripcion,
                monto: amt
            });
            toast.success('Movimiento registrado', { id: 'mov' });
            setMovimientoModal({ isOpen: false, tipo: 'entrada' });
            setFormMov({ monto: '', descripcion: '' });
            await fetchData();
        } catch {
            toast.error('Error al registrar movimiento', { id: 'mov' });
        }
    };

    const handleCerrarCajaSubmit = async () => {
        if (efectivoDeclarado === '') return toast.error('Debe declarar el efectivo.');
        const declared = parseFloat(efectivoDeclarado);
        
        toast.loading('Calculando arqueo y cerrando...', { id: 'cerrar' });
        try {
            await api.post(`/cajas/${activeCaja.id}/cerrar`, {
                declarado: declared,
                esperado: debeHaber
            });
            toast.success('Terminal cerrada correctamente.', { id: 'cerrar' });
            setCerrarModal(false);
            setEfectivoDeclarado('');
            setSelectedCajaId(null);
            await fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al cerrar', { id: 'cerrar' });
        }
    };

    // VISTAS DE ESTADO
    if (loading && !cajas) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
                <RefreshCw className="animate-spin" size={48} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                <p style={{ fontSize: '1.2rem' }}>Sincronizando con el servidor de cajas...</p>
            </div>
        );
    }

    if (error && !cajas) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', padding: '2rem' }}>
                <AlertTriangle size={64} color="var(--danger)" style={{ marginBottom: '1.5rem' }} />
                <h2 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Ocurrió un problema</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{error}</p>
                <button className="btn btn-primary" onClick={fetchData}>
                    <RefreshCw size={18} style={{ marginRight: '0.5rem' }} /> Reintentar Conexión
                </button>
            </div>
        );
    }

    if (!cajas) return null;

    const activeCaja = selectedCajaId ? cajas[selectedCajaId] : null;

    // CALCULO REACTIVO
    let totalIngresos = 0;
    let totalEgresos = 0;
    if (activeCaja && activeCaja.movimientos) {
        activeCaja.movimientos.forEach(m => {
            if (m.tipo === 'entrada') totalIngresos += (parseFloat(m.monto) || 0);
            if (m.tipo === 'salida') totalEgresos += (parseFloat(m.monto) || 0);
        });
    }
    const debeHaber = activeCaja ? (activeCaja.monto_inicial + activeCaja.ventas_efectivo + totalIngresos - totalEgresos) : 0;
    const diferencia = (parseFloat(efectivoDeclarado) || 0) - debeHaber;

    // ----- VISTA DE SELECCION -----
    if (!selectedCajaId) {
        return (
            <div className="animate-fade" style={{ padding: '0 2rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <Wallet color="var(--primary)" size={36} />
                        <h1 style={{ color: 'var(--text-main)', margin: 0, fontSize: '2.5rem' }}>Control de Cajas</h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Gestione las sesiones y arqueos de dinero</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                    {Object.keys(cajas).map(key => {
                        const c = cajas[key];
                        const isAbierta = c.status === 'abierta';
                        return (
                            <div key={key} className="card glass card-hoverable" style={{ padding: '2.5rem 2rem', textAlign: 'center', borderTop: isAbierta ? '3px solid var(--success)' : 'none' }}>
                                <div style={{ background: isAbierta ? 'var(--success-light)' : 'var(--surface-hover)', padding: '1.25rem', borderRadius: '50%', width: 'fit-content', margin: '0 auto 1.5rem', border: `1px solid ${isAbierta ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}` }}>
                                    {isAbierta ? <Unlock color="var(--success)" size={42} /> : <Lock color="var(--text-muted)" size={42} />}
                                </div>
                                <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>{c.name}</h2>
                                <span className={`badge ${isAbierta ? 'badge-success' : 'badge-danger'}`} style={{ marginBottom: '1.5rem' }}>
                                    {isAbierta ? 'SESIÓN ACTIVA' : 'CAJA CERRADA'}
                                </span>
                                <div style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem', minHeight: '3em' }}>
                                    {isAbierta ? (
                                        <>
                                            <p style={{ margin: 0 }}>ID Sesión: #{c.session}</p>
                                            <p style={{ margin: 0 }}>Abierto: {c.openDate}</p>
                                        </>
                                    ) : (
                                        <p>Terminal disponible para nuevo turno.</p>
                                    )}
                                </div>
                                {isAbierta ? (
                                    <button className="btn btn-success" style={{ width: '100%', marginBottom: '1rem' }} onClick={() => setSelectedCajaId(key)}>GESTIONAR</button>
                                ) : (
                                    <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }} onClick={() => setAbrirModal({ isOpen: true, cajaId: key })}>ABRIR CAJA</button>
                                )}
                                <button className="btn btn-outline" style={{ width: '100%', border: 'none', fontSize: '0.85rem' }} onClick={() => setHistorialModal({ isOpen: true, cajaId: key })}>
                                    <Clock size={14} style={{ marginRight: '0.5rem' }} /> Ver Historial
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* MODALES SELECCION */}
                <Modal isOpen={abrirModal.isOpen} onClose={() => setAbrirModal({ isOpen: false, cajaId: null })} title={`Abrir ${cajas[abrirModal.cajaId]?.name}`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Monto Inicial (Efectivo en base)</label>
                            <input type="number" className="form-control" placeholder="0.00" value={montoInicial} onChange={(e) => setMontoInicial(e.target.value)} style={{ fontSize: '1.5rem', padding: '0.75rem' }} autoFocus />
                        </div>
                        <div className="badge badge-info" style={{ padding: '1rem', background: 'var(--surface-hover)', color: 'var(--text-muted)', fontWeight: 'normal', lineHeight: '1.5' }}>
                            <Info size={18} style={{ marginRight: '0.75rem', verticalAlign: 'middle' }} />
                            Ingrese el dinero físico que hay en la gaveta ANTES de empezar a vender.
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="btn btn-outline" onClick={() => setAbrirModal({ isOpen: false, cajaId: null })}>Cerrar</button>
                            <button className="btn btn-primary" onClick={handleAbrirCajaSubmit}>Iniciar Turno</button>
                        </div>
                    </div>
                </Modal>

                <Modal isOpen={historialModal.isOpen} onClose={() => setHistorialModal({ isOpen: false, cajaId: null })} title="Historial de Sesiones" size="lg">
                    {historialModal.cajaId && cajas[historialModal.cajaId].historial?.length > 0 ? (
                        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '1rem' }}>ID</th>
                                        <th style={{ padding: '1rem' }}>Apertura / Cierre</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Diferencia</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Final (S/)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cajas[historialModal.cajaId].historial.map(h => (
                                        <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                                            <td style={{ padding: '1rem' }}>#{h.session}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ color: 'var(--success)' }}>{h.openDate}</div>
                                                <div style={{ color: 'var(--danger)' }}>{h.closeDate}</div>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', color: h.difference === 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                S/ {h.difference.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>S/ {h.declared.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No hay historial registrado.</p>
                    )}
                </Modal>
            </div>
        );
    }

    // ----- VISTA DE GESTION -----
    return (
        <div className="animate-fade" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <button className="btn btn-outline" style={{ border: 'none', color: 'var(--text-muted)' }} onClick={() => setSelectedCajaId(null)}>
                    <ArrowLeftRight size={18} style={{ marginRight: '0.5rem' }} /> Cambiar de Caja
                </button>
                <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'right' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dinero Inicial</div>
                        <div style={{ fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 600 }}>S/ {activeCaja.monto_inicial.toFixed(2)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Efectivo Actual</div>
                        <div style={{ fontSize: '1.25rem', color: 'var(--success)', fontWeight: 700 }}>S/ {debeHaber.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
                <div>
                    <h1 style={{ color: 'var(--text-main)', marginBottom: '1.5rem', fontSize: '2rem' }}>{activeCaja.name}</h1>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="card glass" style={{ borderLeft: '4px solid var(--success)', padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Banknote color="var(--success)" />
                                <span className="badge badge-success">{activeCaja.efectivo_count} ventas</span>
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ganancia Efectivo</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>S/ {activeCaja.ventas_efectivo.toFixed(2)}</div>
                            </div>
                        </div>
                        <div className="card glass" style={{ borderLeft: '4px solid var(--primary)', padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Smartphone color="var(--primary)" />
                                <span className="badge badge-info">{activeCaja.yape_count} ventas</span>
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cobrado en Yape</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>S/ {activeCaja.ventas_yape.toFixed(2)}</div>
                            </div>
                        </div>
                        <div className="card glass" style={{ borderLeft: '4px solid var(--warning)', padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Landmark color="var(--warning)" />
                                <span className="badge badge-warning">{activeCaja.transferencia_count || 0} ventas</span>
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Transferencias</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>S/ {(activeCaja.ventas_transferencia || 0).toFixed(2)}</div>
                            </div>
                        </div>
                        <div className="card glass" style={{ borderLeft: '4px solid var(--danger)', padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <CreditCard color="var(--danger)" />
                                <span className="badge badge-danger">{activeCaja.tarjeta_count || 0} ventas</span>
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tarjeta</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>S/ {(activeCaja.ventas_tarjeta || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="card glass" style={{ marginBottom: '2rem' }}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Ventas Registradas</h3>
                        </div>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-color)', zIndex: 1 }}>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '0.75rem 1rem' }}>Hora</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Ticket</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Pago</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeCaja.ventas?.length > 0 ? activeCaja.ventas.map(v => (
                                        <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.75rem 1rem' }}>{v.hora}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{v.ticket}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{v.pago}</td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 'bold' }}>S/ {v.monto.toFixed(2)}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay ventas en esta sesión.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card glass" style={{ padding: '1.5rem' }}>
                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ArrowLeftRight size={18} /> Movimientos Extra
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <button className="btn btn-success btn-sm" onClick={() => setMovimientoModal({ isOpen: true, tipo: 'entrada' })}>+ Ingreso</button>
                            <button className="btn btn-danger btn-sm" onClick={() => setMovimientoModal({ isOpen: true, tipo: 'salida' })}>- Gasto</button>
                        </div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {activeCaja.movimientos?.map(m => (
                                <div key={m.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-main)' }}>{m.descripcion}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.hora}</div>
                                    </div>
                                    <div style={{ color: m.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                                        {m.tipo === 'entrada' ? '+' : '-'} {m.monto.toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="btn btn-danger" style={{ width: '100%', padding: '1rem', fontWeight: 'bold' }} onClick={() => setCerrarModal(true)}>
                        <Lock size={18} style={{ marginRight: '0.75rem' }} /> CERRAR Y ARQUEAR
                    </button>
                </div>
            </div>

            {/* MODALES GESTION */}
            <Modal isOpen={movimientoModal.isOpen} onClose={() => setMovimientoModal({ isOpen: false, tipo: 'entrada' })} title={`Registrar ${movimientoModal.tipo === 'entrada' ? 'Entrada' : 'Salida'}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input type="number" className="form-control" placeholder="Monto S/" value={formMov.monto} onChange={(e) => setFormMov({...formMov, monto: e.target.value})} autoFocus />
                    <input type="text" className="form-control" placeholder="Descripción / Motivo" value={formMov.descripcion} onChange={(e) => setFormMov({...formMov, descripcion: e.target.value})} />
                    <button className={`btn ${movimientoModal.tipo === 'entrada' ? 'btn-success' : 'btn-danger'}`} onClick={handleMovimientoSubmit}>Registrar</button>
                </div>
            </Modal>

            <Modal isOpen={cerrarModal} onClose={() => setCerrarModal(false)} title="Cierre de Caja">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Esperado en Sistema:</span>
                        <span style={{ fontWeight: 'bold' }}>S/ {debeHaber.toFixed(2)}</span>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Efectivo Físico Contado:</label>
                        <input type="number" className="form-control" placeholder="0.00" value={efectivoDeclarado} onChange={(e) => setEfectivoDeclarado(e.target.value)} style={{ fontSize: '1.5rem', textAlign: 'center' }} autoFocus />
                    </div>
                    {efectivoDeclarado !== '' && (
                        <div style={{ textAlign: 'center', color: diferencia === 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                            {diferencia === 0 ? '¡CAJA CUADRADA!' : `Diferencia: S/ ${diferencia.toFixed(2)}`}
                        </div>
                    )}
                    <button className="btn btn-danger" onClick={handleCerrarCajaSubmit} disabled={efectivoDeclarado === ''}>CONFORME Y CERRAR</button>
                </div>
            </Modal>
        </div>
    );
};

export default CajaDia;
