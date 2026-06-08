import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/axiosBase';
import TicketModal from './TicketModal';
import Modal from '../../components/Modal';
import { Search, Plus, Minus, Trash2, ShoppingCart as CartIcon, Package, ScanLine, Tag, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

const POS = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // ── Modo edición: venimos del historial con un ventaId ──
    const editVentaId = location.state?.editVentaId || null;
    const editVentaDetalles = location.state?.editVentaDetalles || [];
    const [productos, setProductos] = useState([]);
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [showTicket, setShowTicket] = useState(false);
    const [ticketData, setTicketData] = useState(null);
    const [cajasAbiertas, setCajasAbiertas] = useState([]);
    const [metodoPago, setMetodoPago] = useState('Efectivo');
    const [categorias, setCategorias] = useState([]);
    const [selectedCategoria, setSelectedCategoria] = useState('all');
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [selectedProductForModal, setSelectedProductForModal] = useState(null);

    useEffect(() => {
        const fetchProductos = async () => {
            try {
                const resp = await api.get('/productos');
                setProductos(resp.data);

                // Si venimos en modo edición, precargar productos del ticket
                if (editVentaId && editVentaDetalles.length > 0) {
                    const productosData = resp.data;
                    const cartItems = editVentaDetalles.map((det) => {
                        const prod = productosData.find(p => String(p.id) === String(det.id_producto));
                        const tipo = det.tipo_venta || 'unidad';
                        return {
                            ...(prod || {}),
                            id: det.id_producto,
                            nombre: det.nombre,
                            precio_unidad: prod?.precio_unidad ?? det.precio,
                            precio_caja: prod?.precio_caja ?? det.precio,
                            cart_id: `${det.id_producto}-${tipo}-edit`,
                            tipo_venta: tipo,
                            cantidad: det.cantidad,
                            cantidad_por_caja: det.cantidad_por_caja || prod?.cantidad_por_caja || 1,
                            stock: prod?.stock ?? 999,
                            tipo_caja: prod?.tipo_caja || 'libreria',
                        };
                    });
                    setCart(cartItems);
                    toast.success('Venta cargada. Agrega los productos que deseas añadir.', { icon: '✏️', duration: 4000 });
                }
            } catch (error) {
                toast.error('Error al cargar productos');
                console.error('Error al cargar productos:', error);
            } finally {
                setLoading(false);
            }
        };
        const fetchCajasAbiertas = async () => {
            try {
                const resp = await api.get('/cajas-abiertas');
                setCajasAbiertas(resp.data);
            } catch {
                console.error('Error al cargar cajas abiertas');
            }
        };
        const fetchCategorias = async () => {
            try {
                const resp = await api.get('/categorias');
                setCategorias(resp.data);
            } catch {
                console.error('Error al cargar categorias');
            }
        };
        fetchProductos();
        fetchCategorias();
        fetchCajasAbiertas();
    }, []);

    const getStockOcupado = (productId, excludeCartId = null) => {
        return cart.filter(i => i.id === productId && i.cart_id !== excludeCartId).reduce((sum, i) => {
            const factor = i.tipo_venta === 'caja' ? (i.cantidad_por_caja || 1) : 1;
            return sum + (i.cantidad * factor);
        }, 0);
    };

    const addToCart = (product, tipoVenta = null) => {
        // VALIDACIÓN ESTRICTA: ¿La caja necesaria para este producto está abierta?
        const tipoNecesario = product.tipo_caja || 'libreria';
        const cajaCorrespondiente = cajasAbiertas.find(c => c.tipo_caja === tipoNecesario);

        if (!cajaCorrespondiente) {
            toast.error(`No se puede vender este producto porque la Caja ${tipoNecesario === 'libreria' ? 'Librería' : 'Personal'} está CERRADA.`, { 
                id: 'caja-cerrada', 
                duration: 4000,
                icon: '🚫'
            });
            return;
        }

        // Si es multi-unidad y no se ha especificado tipoVenta, abrir modal
        if (!tipoVenta && (product.cantidad_por_caja > 1 && parseFloat(product.precio_caja) > 0)) {
            setSelectedProductForModal(product);
            setShowSelectionModal(true);
            return;
        }

        const tipo = tipoVenta || 'unidad';
        const cartId = `${product.id}-${tipo}`;
        
        const factor = tipo === 'caja' ? (product.cantidad_por_caja || 1) : 1;
        const currentUnits = getStockOcupado(product.id);
        
        if (currentUnits + factor > product.stock) {
            toast(`Stock insuficiente. Disponible: ${product.stock} uds.`, { 
                id: `stock-${product.id}`,
                icon: '⚠️',
                duration: 3000
            });
        }

        setCart(prev => {
            const existing = prev.find(item => item.cart_id === cartId);
            if (existing) {
                return prev.map(item => 
                    item.cart_id === cartId ? { ...item, cantidad: item.cantidad + 1 } : item
                );
            }
            return [...prev, { 
                ...product, 
                cart_id: cartId,
                tipo_venta: tipo,
                cantidad: 1 
            }];
        });
        
        if (showSelectionModal) setShowSelectionModal(false);
        
        toast.success(`Agregado: ${product.nombre} (${tipo})`, {
            id: `add-${product.id}`, 
            duration: 1500,
            icon: '🛒'
        });
    };

    const removeFromCart = (cartId) => {
        setCart(prev => prev.filter(item => item.cart_id !== cartId));
    };

    const updateQuantity = (cartId, delta) => {
        const itemToUpdate = cart.find(i => i.cart_id === cartId);
        if (!itemToUpdate) return;

        if (delta > 0) {
            const factor = itemToUpdate.tipo_venta === 'caja' ? (itemToUpdate.cantidad_por_caja || 1) : 1;
            const currentUnits = getStockOcupado(itemToUpdate.id);
            if (currentUnits + factor > itemToUpdate.stock) {
                toast(`Stock insuficiente. Disponible: ${itemToUpdate.stock} uds.`, { 
                    id: `stock-${itemToUpdate.id}`,
                    icon: '⚠️',
                    duration: 3000
                });
            }
        }

        setCart(prev => prev.map(item => {
            if (item.cart_id === cartId) {
                const newQuantity = item.cantidad + delta;
                return newQuantity > 0 ? { ...item, cantidad: newQuantity } : item;
            }
            return item;
        }));
    };

    const toggleTipoVenta = (cartId) => {
        setCart(prev => {
            const itemToToggle = prev.find(i => i.cart_id === cartId);
            if (!itemToToggle) return prev;

            const nuevoTipo = itemToToggle.tipo_venta === 'unidad' ? 'caja' : 'unidad';
            const factorNuevo = nuevoTipo === 'caja' ? (itemToToggle.cantidad_por_caja || 1) : 1;
            
            const currentUnitsOther = getStockOcupado(itemToToggle.id, cartId);
            const neededUnits = currentUnitsOther + (itemToToggle.cantidad * factorNuevo);
            
            if (neededUnits > itemToToggle.stock) {
                toast(`Stock insuficiente. Disponible: ${itemToToggle.stock} uds.`, { 
                    id: `stock-${itemToToggle.id}`,
                    icon: '⚠️',
                    duration: 3000
                });
            }

            const newCartId = `${itemToToggle.id}-${nuevoTipo}`;

            // Check if the new target cartId already exists (to merge quantities)
            const existingTarget = prev.find(i => i.cart_id === newCartId);

            if (existingTarget) {
                // Merge into existing target and remove old one
                return prev.map(i => {
                    if (i.cart_id === newCartId) {
                        return { ...i, cantidad: i.cantidad + itemToToggle.cantidad };
                    }
                    return i;
                }).filter(i => i.cart_id !== cartId);
            } else {
                // Just change type and cartId
                return prev.map(i => {
                    if (i.cart_id === cartId) {
                        return { ...i, cart_id: newCartId, tipo_venta: nuevoTipo };
                    }
                    return i;
                });
            }
        });
    };

    const subtotal = cart.reduce((sum, item) => {
        const p = parseFloat(item.tipo_venta === 'caja' ? item.precio_caja : item.precio_unidad) || 0;
        const c = parseInt(item.cantidad) || 0;
        return sum + (p * c);
    }, 0);
    const descuento = 0;
    const total = subtotal - descuento;
    const totalItems = cart.reduce((s, i) => s + (parseInt(i.cantidad) || 0), 0);

    const filteredProducts = productos.filter(p => 
        p.estado !== false && p.estado !== 0 &&
        (selectedCategoria === 'all' || String(p.id_categoria) === String(selectedCategoria)) &&
        (p.nombre.toLowerCase().includes(search.toLowerCase()) || 
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(search.toLowerCase())))
    );

    const handleCobrar = async () => {
        if (cart.length === 0) return;
        
        if (cajasAbiertas.length === 0) {
            toast.error('No se puede realizar la venta porque todas las cajas están cerradas.', { id: 'caja-cerrada' });
            return;
        }

        setProcesando(true);

        // ── Modo edición: actualizar venta existente ──
        if (editVentaId) {
            toast.loading('Actualizando venta...', { id: 'venta' });
            try {
                const editPayload = {
                    metodo_pago: metodoPago,
                    id_cliente: null,
                    detalles: cart.map(item => ({
                        id_producto: item.id,
                        nombre: item.nombre,
                        cantidad: item.cantidad,
                        precio: parseFloat(item.tipo_venta === 'caja' ? item.precio_caja : item.precio_unidad) || 0,
                        tipo_venta: item.tipo_venta,
                        cantidad_por_caja: item.cantidad_por_caja || 1,
                    }))
                };
                await api.put(`/ventas/${editVentaId}`, editPayload);
                toast.success('¡Venta actualizada con éxito!', { id: 'venta' });
                setCart([]);
                // Limpiar state y volver al historial
                navigate('/historial', { replace: true });
            } catch (error) {
                toast.error(error.response?.data?.message || 'Error al actualizar la venta', { id: 'venta' });
            } finally {
                setProcesando(false);
            }
            return;
        }

        // ── Modo normal: crear nueva venta ──
        toast.loading('Procesando venta...', { id: 'venta' });
        try {
            const payload = {
                metodo_pago: metodoPago,
                monto_recibido: total,
                descuento: descuento,
                detalles: cart.map(item => ({
                    id_producto: item.id,
                    cantidad: item.cantidad,
                    precio: parseFloat(item.tipo_venta === 'caja' ? item.precio_caja : item.precio_unidad) || 0,
                    tipo_venta: item.tipo_venta
                }))
            };
            await api.post('/ventas', payload);
            toast.success('¡Venta realizada con éxito!', { id: 'venta' });
            
            setTicketData({
                cart: [...cart],
                total,
                meta: {
                    fecha: new Date().toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    metodoPago,
                    cliente: 'General'
                }
            });
            setShowTicket(true);
            setCart([]);
            
            // Recargar stock de productos
            const respProd = await api.get('/productos');
            setProductos(respProd.data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error de stock o caja cerrada', { id: 'venta' });
        } finally {
            setProcesando(false);
        }
    };

    return (
        <React.Fragment>
            <div style={styles.container} className="pos-shell">
                {/* Panel Central: Catálogo de Productos */}
                <div style={styles.mainPanel}>
                    {/* Banner modo edición */}
                    {editVentaId && (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(217,119,6,0.1) 100%)',
                            border: '1px solid rgba(245,158,11,0.4)',
                            borderRadius: '12px', padding: '0.75rem 1.25rem',
                            marginBottom: '1rem', gap: '1rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '1.25rem' }}>✏️</span>
                                <div>
                                    <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.9rem' }}>
                                        MODO EDICIÓN — Venta #{String(editVentaId).padStart(6, '0')}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        Agrega o modifica productos y luego presiona <strong>GUARDAR CAMBIOS</strong>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/historial', { replace: true })}
                                style={{
                                    background: 'none', border: '1px solid rgba(245,158,11,0.4)',
                                    color: '#f59e0b', borderRadius: '8px', padding: '0.4rem 0.9rem',
                                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap'
                                }}
                            >
                                ← Cancelar edición
                            </button>
                        </div>
                    )}
                    {/* Barra de Búsqueda Flotante */}
                    <div style={styles.searchBarContainer}>
                        <ScanLine size={20} color="var(--primary)" style={{ marginLeft: '1.25rem' }} />
                        <input 
                            type="text" 
                            className="pos-search-input"
                            placeholder="Buscar producto por nombre o escanear código de barras..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={styles.searchInput}
                            autoFocus
                        />
                    </div>
                    
                    {/* Filtro de Categorías */}
                    <div className="category-scroll">
                        <button 
                            className={`category-pill ${selectedCategoria === 'all' ? 'active' : ''}`}
                            onClick={() => setSelectedCategoria('all')}
                        >
                            Todas
                        </button>
                        {categorias.map(cat => (
                            <button 
                                key={cat.id}
                                className={`category-pill ${String(selectedCategoria) === String(cat.id) ? 'active' : ''}`}
                                onClick={() => setSelectedCategoria(cat.id)}
                            >
                                {cat.nombre}
                            </button>
                        ))}
                    </div>
                    
                    {/* Grilla de Catálogo */}
                    <div style={styles.grid}>
                        {loading ? (
                            <div style={styles.loadingContainer}>
                                <div className="spinner"></div>
                                <p>Cargando catálogo comercial...</p>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div style={styles.loadingContainer}>
                                <Package size={48} color="var(--border-color)" />
                                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>No se encontraron productos coincidentes.</p>
                            </div>
                        ) : (
                            filteredProducts.map(product => {
                                const stockLow = product.stock <= 5;
                                return (
                                    <div 
                                        key={product.id} 
                                        style={styles.productCard}
                                        className="card pos-card animate-fade"
                                        onClick={() => addToCart(product)}
                                    >
                                        <div style={styles.cardHeader}>
                                            <div style={styles.iconPlaceholder}>
                                                <Tag size={20} color="var(--primary)" />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <h4 style={styles.productName} title={product.nombre}>{product.nombre}</h4>
                                                    {(product.cantidad_por_caja > 1 && parseFloat(product.precio_caja) > 0) && (
                                                        <div title="Disponible en Caja/Paquete" style={{ 
                                                            backgroundColor: 'var(--primary)', 
                                                            color: '#fff', 
                                                            fontSize: '0.6rem', 
                                                            padding: '2px 5px', 
                                                            borderRadius: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '2px',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            <Layers size={10} /> MULTI
                                                        </div>
                                                    )}
                                                </div>
                                                <span style={styles.productCode}>{product.codigo || 'SIN CÓDIGO'}</span>
                                            </div>
                                        </div>
                                        <div style={styles.cardFooter}>
                                            <span style={styles.productPrice}>S/ {Number(product.precio_unidad).toFixed(2)}</span>
                                            <div style={{ 
                                                fontSize: '0.65rem', 
                                                fontWeight: 800, 
                                                padding: '2px 6px', 
                                                borderRadius: '6px',
                                                background: product.tipo_caja === 'personal' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0, 210, 255, 0.2)',
                                                color: product.tipo_caja === 'personal' ? '#a855f7' : '#00d2ff',
                                                border: `1px solid ${product.tipo_caja === 'personal' ? '#a855f744' : '#00d2ff44'}`
                                            }}>
                                                {product.tipo_caja === 'personal' ? 'PERS' : 'LIB'}
                                            </div>
                                            <span style={{
                                                ...styles.stockBadge, 
                                                backgroundColor: stockLow ? 'var(--danger-light)' : 'var(--success-light)',
                                                color: stockLow ? 'var(--danger)' : 'var(--success)'
                                            }}>
                                                Stock: {product.stock}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Panel Lateral: Carrito / Ticket de Cobro */}
                <aside style={styles.cartPanel} className="glass-panel">
                    <div style={styles.cartHeader}>
                        <div style={{ flex: 1, paddingRight: '1rem' }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CartIcon size={22} color="var(--primary)" />
                                {editVentaId ? `Editando Venta #${String(editVentaId).padStart(6, '0')}` : 'Recibo Actual'}
                            </h3>
                            
                            {/* Estado de Cajas */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                {['libreria', 'personal'].map(tipo => {
                                    const abierta = cajasAbiertas.find(c => c.tipo_caja === tipo);
                                    return (
                                        <div key={tipo} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '6px', 
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: abierta ? 'var(--success)' : 'var(--danger)'
                                        }}>
                                            <div style={{ 
                                                width: 8, 
                                                height: 8, 
                                                borderRadius: '50%', 
                                                backgroundColor: abierta ? 'var(--success)' : 'var(--danger)',
                                                boxShadow: abierta ? '0 0 5px var(--success)' : 'none'
                                            }} />
                                            {tipo === 'libreria' ? 'Librería' : 'Personal'}: {abierta ? 'ABIERTA' : 'CERRADA'}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <span style={styles.cartBadge}>{totalItems}</span>
                    </div>
                    
                    <div style={styles.cartItemsScroll}>
                        {cart.length === 0 ? (
                            <div style={styles.emptyCart}>
                                <div style={styles.emptyCartCircle}>
                                    <CartIcon size={40} color="var(--primary)" opacity={0.5} />
                                </div>
                                <p style={{ margin: '1rem 0 0.25rem', fontWeight: 600, color: 'var(--text-main)' }}>El recibo está vacío</p>
                                <p style={{ fontSize: '0.85rem', margin: 0 }}>Escanea o selecciona productos</p>
                            </div>
                        ) : (
                            <div style={{ padding: '0.5rem 0' }}>
                                {cart.map(item => (
                                    <div key={item.cart_id} style={styles.cartItemRow} className="animate-fade cart-row-hover">
                                        <div style={styles.cartItemDetail}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                                                {item.nombre}
                                            </div>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                                                {item.cantidad_por_caja > 1 && parseFloat(item.precio_caja) > 0 ? (
                                                    <div 
                                                        style={{ 
                                                            display: 'inline-flex', 
                                                            alignItems: 'center', 
                                                            background: 'var(--bg-color)', 
                                                            border: '1px solid var(--border-color)', 
                                                            borderRadius: '4px',
                                                            overflow: 'hidden' 
                                                        }}
                                                    >
                                                        <button 
                                                            onClick={() => item.tipo_venta !== 'unidad' && toggleTipoVenta(item.cart_id)}
                                                            className={item.tipo_venta === 'unidad' ? 'segment-btn active' : 'segment-btn inactive'}
                                                        >
                                                            Ud
                                                        </button>
                                                        <button 
                                                            onClick={() => item.tipo_venta !== 'caja' && toggleTipoVenta(item.cart_id)}
                                                            className={item.tipo_venta === 'caja' ? 'segment-btn active' : 'segment-btn inactive'}
                                                        >
                                                            Cj
                                                        </button>
                                                    </div>
                                                ) : null}
                                                <div style={{ color: 'var(--text-muted)' }}>
                                                    S/ {Number(item.tipo_venta === 'caja' ? item.precio_caja : item.precio_unidad).toFixed(2)} / {item.tipo_venta === 'caja' ? `cj (x${item.cantidad_por_caja})` : 'ud'}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={styles.cartItemActions}>
                                            <div style={styles.qtyBox}>
                                                <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.cart_id, -1); }} style={styles.qtyBtn} className="hover-primary"><Minus size={14}/></button>
                                                <span style={styles.qtyNumber}>{item.cantidad}</span>
                                                <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.cart_id, 1); }} style={styles.qtyBtn} className="hover-primary"><Plus size={14}/></button>
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', minWidth: '75px', textAlign: 'right', color: 'var(--text-main)' }}>
                                                S/ {(parseFloat(item.tipo_venta === 'caja' ? item.precio_caja : item.precio_unidad) * parseInt(item.cantidad)).toFixed(2)}
                                            </div>
                                            <button onClick={() => removeFromCart(item.cart_id)} style={styles.trashBtn} className="hover-danger">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={styles.cartCheckoutBox}>
                        <div style={styles.checkoutSummary}>
                            <span translate="no" style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>TOTAL A PAGAR</span>
                            <span translate="no" style={{ fontSize: '2.25rem', color: 'var(--success)', fontWeight: 800, letterSpacing: '-1px' }}>S/ {total.toFixed(2)}</span>
                        </div>
                        
                        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Método de Pago:</label>
                            <select 
                                className="form-control" 
                                value={metodoPago} 
                                onChange={(e) => setMetodoPago(e.target.value)} 
                                style={{ padding: '0.5rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                            >
                                <option value="Efectivo">💵 Efectivo</option>
                                <option value="Yape">📱 Yape / Plin</option>
                                <option value="Transferencia">🏦 Transferencia</option>
                                <option value="Tarjeta">💳 Tarjeta Externa</option>
                            </select>
                        </div>
                        
                        <button 
                            className={`btn btn-success btn-cobrar-premium ${cart.length > 0 && !procesando && cajasAbiertas.length > 0 ? 'animate-pulse-success' : ''}`} 
                            style={{...styles.btnCobrar, opacity: (cajasAbiertas.length === 0 || cart.length === 0 || procesando) ? 0.5 : 1, background: editVentaId ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : undefined}}
                            disabled={cart.length === 0 || procesando || cajasAbiertas.length === 0}
                            onClick={handleCobrar}
                        >
                            <CartIcon size={24} style={{ marginRight: '10px' }} />
                            <span>{procesando ? 'Procesando...' : (cajasAbiertas.length === 0 ? 'CAJAS CERRADAS' : (editVentaId ? 'GUARDAR CAMBIOS' : 'COBRAR AHORA'))}</span>
                        </button>
                    </div>
                </aside>
            </div>

            {ticketData && (
                <TicketModal
                    isOpen={showTicket}
                    onClose={() => setShowTicket(false)}
                    cart={ticketData.cart}
                    total={ticketData.total}
                    meta={ticketData.meta}
                />
            )}

            <Modal 
                isOpen={showSelectionModal} 
                onClose={() => setShowSelectionModal(false)}
                title="¿Cómo desea vender?"
                size="md"
            >
                {selectedProductForModal && (
                    <div style={styles.selectionModalContainer}>
                        <div style={styles.selectionProductInfo}>
                            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>{selectedProductForModal.nombre}</h3>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Stock disponible: <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{selectedProductForModal.stock} uds.</span>
                            </p>
                        </div>

                        <div style={styles.selectionGrid}>
                            {/* Opción Unidad */}
                            <button 
                                style={styles.selectionBtn}
                                className="selection-btn-hover"
                                onClick={() => addToCart(selectedProductForModal, 'unidad')}
                            >
                                <div style={styles.selectionBtnIcon}>
                                    <Tag size={28} />
                                </div>
                                <div style={styles.selectionBtnLabel}>UNIDAD</div>
                                <div style={styles.selectionBtnPrice}>S/ {Number(selectedProductForModal.precio_unidad).toFixed(2)}</div>
                                <div style={styles.selectionBtnSubtext}>Venta por {selectedProductForModal.unidad_base || 'unidad'}</div>
                                {selectedProductForModal.stock < 1 && <div style={styles.outOfStockText}>Sin Stock</div>}
                            </button>

                            {/* Opción Caja */}
                            <button 
                                style={{
                                    ...styles.selectionBtn,
                                    borderColor: 'var(--primary-light)'
                                }}
                                className="selection-btn-hover caja"
                                onClick={() => addToCart(selectedProductForModal, 'caja')}
                            >
                                <div style={{...styles.selectionBtnIcon, background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.2) 0%, rgba(0, 210, 255, 0.1) 100%)'}}>
                                    <Package size={28} color="var(--primary)" />
                                </div>
                                <div style={styles.selectionBtnLabel}>CAJA / PAQUETE</div>
                                <div style={{...styles.selectionBtnPrice, color: 'var(--primary)'}}>S/ {Number(selectedProductForModal.precio_caja).toFixed(2)}</div>
                                <div style={styles.selectionBtnSubtext}>Contiene {selectedProductForModal.cantidad_por_caja} unidades</div>
                                {selectedProductForModal.stock < selectedProductForModal.cantidad_por_caja && (
                                    <div style={styles.outOfStockText}>Stock insuficiente ({selectedProductForModal.stock}/{selectedProductForModal.cantidad_por_caja})</div>
                                )}
                            </button>
                        </div>
                        
                        <button 
                            onClick={() => setShowSelectionModal(false)}
                            style={styles.btnCancelSelection}
                        >
                            Cancelar
                        </button>
                    </div>
                )}
            </Modal>

             {/* Estilos inyectados específicos del POS */}
             <style dangerouslySetInnerHTML={{__html: `
                 .pos-search-input::placeholder {
                     color: var(--text-muted);
                 }
                 .pos-search-input:focus {
                     background-color: var(--primary-light) !important;
                 }
                 .pos-shell {
                     color: var(--text-main);
                 }
                 .pos-card {
                     cursor: pointer;
                     user-select: none;
                     background: var(--surface);
                     border: 1px solid var(--border-color);
                     border-radius: 14px;
                     box-shadow: var(--shadow-sm);
                     transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                 }
                 .pos-card:hover {
                     box-shadow: var(--shadow-lg) !important;
                     border-color: var(--primary) !important;
                     transform: translateY(-4px);
                 }
                 .pos-card:active {
                     transform: translateY(0) scale(0.98);
                 }
                 .glass-panel {
                     background: var(--surface) !important;
                     border: 1px solid var(--border-color) !important;
                 }
                 .segment-btn {
                     padding: 4px 10px;
                     border: none;
                     font-size: 0.75rem;
                     font-weight: 600;
                     cursor: pointer;
                     border-radius: 6px;
                     transition: all 0.2s;
                 }
                 .segment-btn.active {
                     background: var(--primary);
                     color: var(--text-inverse);
                     box-shadow: var(--shadow-sm);
                 }
                 .segment-btn.inactive {
                     background: transparent;
                     color: var(--text-muted);
                 }
                 .segment-btn.inactive:hover {
                     color: var(--text-main);
                     background: var(--surface-hover);
                 }
                 .btn-cobrar-premium {
                     background: var(--success) !important;
                     border: none !important;
                     color: var(--text-inverse) !important;
                     box-shadow: var(--shadow-md) !important;
                     transition: all 0.3s !important;
                     border-radius: 12px !important;
                 }
                 .btn-cobrar-premium:hover:not(:disabled) {
                     transform: translateY(-2px) !important;
                     box-shadow: var(--shadow-lg) !important;
                     background: var(--success-hover) !important;
                 }
                 .selection-btn-hover {
                     transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                 }
                 .selection-btn-hover:hover:not(:disabled) {
                     transform: translateY(-5px);
                     background: var(--surface-hover);
                     border-color: var(--primary) !important;
                     box-shadow: var(--shadow-md);
                 }
                 .selection-btn-hover:active:not(:disabled) {
                     transform: translateY(0) scale(0.98);
                 }
                 .selection-btn-hover:disabled {
                     opacity: 0.5;
                     cursor: not-allowed;
                     filter: grayscale(1);
                 }
                 .selection-btn-hover.caja:hover:not(:disabled) {
                     background: var(--surface-hover);
                 }
                 .category-scroll {
                     display: flex;
                     gap: 0.75rem;
                     overflow-x: auto;
                     padding-bottom: 1rem;
                     margin-bottom: 0.5rem;
                     scrollbar-width: none;
                 }
                 .category-scroll::-webkit-scrollbar {
                     display: none;
                 }
                 .category-pill {
                     padding: 0.4rem 1rem;
                     border-radius: 999px;
                     border: 1px solid var(--border-color);
                     background: var(--surface);
                     color: var(--text-muted);
                     font-size: 0.85rem;
                     font-weight: 700;
                     cursor: pointer;
                     white-space: nowrap;
                     transition: all 0.2s;
                 }
                 .category-pill:hover {
                     background: var(--surface-hover);
                     color: var(--text-main);
                 }
                 .category-pill.active {
                     background: var(--primary);
                     color: var(--text-inverse);
                     border-color: var(--primary);
                     box-shadow: var(--shadow-sm);
                 }
                 .spinner {
                     border: 3px solid var(--border-color);
                     border-top: 3px solid var(--primary);
                     border-radius: 50%;
                     width: 30px;
                     height: 30px;
                     animation: spin 1s linear infinite;
                     margin: 0 auto 1rem;
                 }
                 @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                 
                 .cart-row-hover:hover {
                     background-color: var(--surface-hover);
                 }
                 .hover-primary:hover { color: var(--text-inverse) !important; background-color: var(--primary); }
                 .hover-danger:hover { color: var(--text-inverse) !important; background-color: var(--danger); }
             `}} />
        </React.Fragment>
    );
};

const styles = {
    container: {
        display: 'flex',
        gap: '1.25rem',
        height: 'calc(100% + 4rem)',
        margin: '-2rem',
        padding: '1.25rem',
        alignItems: 'stretch',
        background: 'var(--bg-color)',
        color: 'var(--text-main)',
        overflow: 'hidden'
    },
    mainPanel: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
    },
    searchBarContainer: {
        display: 'flex',
        alignItems: 'center',
        padding: '0 0.5rem',
        marginBottom: '1.25rem',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        backgroundColor: 'var(--surface)',
        borderRadius: '14px',
        border: '1px solid var(--border-color)'
    },
    searchInput: {
        flex: 1,
        border: 'none',
        borderRadius: 0,
        boxShadow: 'none',
        fontSize: '1.05rem',
        padding: '1.25rem 1rem',
        backgroundColor: 'transparent',
        color: 'var(--text-main)',
        outline: 'none',
        fontWeight: '500'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1.1rem',
        overflowY: 'auto',
        paddingRight: '0.5rem',
        paddingBottom: '2rem'
    },
    loadingContainer: {
        padding: '3rem',
        textAlign: 'center',
        gridColumn: '1 / -1',
        color: 'var(--text-muted)'
    },
    productCard: {
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '1rem',
        minHeight: '152px'
    },
    cardHeader: {
        display: 'flex',
        gap: '0.875rem',
        alignItems: 'flex-start'
    },
    iconPlaceholder: {
        width: '46px',
        height: '46px',
        background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--success-light) 100%)',
        border: '1px solid var(--primary-light)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
    },
    productName: {
        margin: '0 0 0.35rem 0',
        fontSize: '1rem',
        fontWeight: '700',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        color: 'var(--text-main)',
        lineHeight: 1.3
    },
    productCode: {
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        fontFamily: 'monospace',
        letterSpacing: '0.5px'
    },
    cardFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.45rem',
        flexWrap: 'wrap'
    },
    productPrice: {
        fontWeight: '800',
        fontSize: '1.3rem',
        color: 'var(--primary)'
    },
    stockBadge: {
        padding: '0.25rem 0.65rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: '700',
        letterSpacing: '0.5px'
    },
    cartPanel: {
        width: '420px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: 0,
        flexShrink: 0,
        borderRadius: '0',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 10
    },
    cartHeader: {
        padding: '1.5rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'transparent'
    },
    cartBadge: {
        backgroundColor: 'var(--primary)',
        color: 'var(--text-inverse)',
        padding: '0.35rem 0.8rem',
        borderRadius: '999px',
        fontWeight: '800',
        fontSize: '1rem',
        boxShadow: 'var(--shadow-sm)'
    },
    cartItemsScroll: {
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'transparent'
    },
    emptyCart: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)'
    },
    emptyCartCircle: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: 'var(--surface-hover)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    cartItemRow: {
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        transition: 'background-color 0.2s'
    },
    cartItemDetail: {
        display: 'flex',
        flexDirection: 'column'
    },
    cartItemActions: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
    },
    qtyBox: {
        display: 'flex',
        alignItems: 'center',
        background: 'var(--surface-hover)',
        borderRadius: '999px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
    },
    qtyBtn: {
        border: 'none',
        background: 'none',
        color: 'var(--text-main)',
        padding: '0.5rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
    },
    qtyNumber: {
        fontWeight: '700',
        width: '32px',
        textAlign: 'center',
        fontSize: '0.95rem'
    },
    trashBtn: {
        background: 'var(--surface-hover)',
        border: '1px solid var(--border-color)',
        color: 'var(--danger)',
        cursor: 'pointer',
        padding: '0.5rem',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
    },
    cartCheckoutBox: {
        padding: '1.5rem',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-md)'
    },
    summaryLines: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        marginBottom: '1rem',
        paddingBottom: '1rem',
        borderBottom: '1px dashed var(--border-color)'
    },
    summaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    summaryLabel: {
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
        fontWeight: '500'
    },
    summaryValue: {
        color: 'var(--text-main)',
        fontSize: '0.95rem',
        fontWeight: '600'
    },
    checkoutSummary: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: '1.25rem'
    },
    btnCobrar: {
        width: '100%',
        padding: '1.25rem',
        fontSize: '1.15rem',
        letterSpacing: '0.5px',
        fontWeight: '700',
        borderRadius: 'var(--radius-lg)'
    },
    selectionModalContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        padding: '0.5rem'
    },
    selectionProductInfo: {
        textAlign: 'center',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-color)'
    },
    selectionGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.25rem'
    },
    selectionBtn: {
        background: 'var(--bg-color)',
        border: '2px solid var(--border-color)',
        borderRadius: '1.5rem',
        padding: '2rem 1rem',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        position: 'relative',
        overflow: 'hidden'
    },
    selectionBtnIcon: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '0.5rem',
        color: 'var(--text-muted)'
    },
    selectionBtnLabel: {
        fontSize: '0.8rem',
        fontWeight: '800',
        color: 'var(--text-muted)',
        letterSpacing: '1px'
    },
    selectionBtnPrice: {
        fontSize: '1.75rem',
        fontWeight: '900',
        color: 'var(--text-main)'
    },
    selectionBtnSubtext: {
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
    },
    outOfStockText: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--danger)',
        color: '#fff',
        fontSize: '0.65rem',
        fontWeight: 'bold',
        padding: '4px',
        textAlign: 'center'
    },
    btnCancelSelection: {
        background: 'transparent',
        border: 'none',
        color: 'var(--text-muted)',
        padding: '0.75rem',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: '600',
        marginTop: '0.5rem',
        borderRadius: 'var(--radius-md)',
        transition: 'all 0.2s'
    }
};

export default POS;
