import React, { useContext } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextObject';
import { ThemeContext } from '../context/ThemeContext';
import { 
    LayoutDashboard, ShoppingCart, Package, Tags, Users, LogOut, Sun, Moon, Bell, Menu,
    Truck, PieChart, History, Trash2, Barcode, Settings, UserCog, Calculator
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const Layout = () => {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const location = useLocation();
    const [notifCount, setNotifCount] = React.useState(0); // Ahora dinámico, inicializado en 0
    const isAdmin = ['Administrador', 'admin'].includes(user?.rol);

    const menu = [
        { name: 'Inicio', path: '/', icon: <LayoutDashboard size={20} className="menu-icon" /> },
        { name: 'Caja', path: '/caja', icon: <Calculator size={20} className="menu-icon" /> },
        { name: 'POS (Ventas)', path: '/pos', icon: <ShoppingCart size={20} className="menu-icon" /> },
        { name: 'Productos', path: '/productos', icon: <Package size={20} className="menu-icon" /> },
        { name: 'Categorías', path: '/categorias', icon: <Tags size={20} className="menu-icon" />, adminOnly: true },
        { name: 'Clientes', path: '/clientes', icon: <Users size={20} className="menu-icon" /> },
        { name: 'Proveedores', path: '/proveedores', icon: <Truck size={20} className="menu-icon" />, adminOnly: true },
        { name: 'Reportes', path: '/reportes', icon: <PieChart size={20} className="menu-icon" />, adminOnly: true },
        { name: 'Historial de Ventas', path: '/historial', icon: <History size={20} className="menu-icon" />, adminOnly: true },
        { isDivider: true, name: 'ADMINISTRACIÓN', adminOnly: true },
        { name: 'Configuración', path: '/configuracion', icon: <Settings size={20} className="menu-icon" />, adminOnly: true },
        { name: 'Usuarios', path: '/usuarios', icon: <UserCog size={20} className="menu-icon" />, adminOnly: true },
        { name: 'Kardex', path: '/kardex', icon: <Barcode size={20} className="menu-icon" />, adminOnly: true },
        { name: 'Papelera', path: '/papelera', icon: <Trash2 size={20} className="menu-icon" />, adminOnly: true },
    ].filter(item => !item.adminOnly || isAdmin);

    return (
        <div style={styles.appContainer}>
            {/* Sidebar SaaS Style */}
            <aside style={styles.sidebar}>
                <div style={styles.logoBox}>
                    <div style={styles.logoIcon}>
                        <ShoppingCart size={22} color="white" />
                    </div>
                    <div>
                        <h2 style={styles.brandTitle}>Útiles POS</h2>
                        <span style={styles.brandSubtitle}>ESCOLAR Y OFICINA</span>
                    </div>
                </div>
                
                <div style={styles.navSectionTitle}>
                    <span>Menú Principal</span>
                </div>

                <nav style={styles.nav}>
                    {menu.map((item, index) => {
                        if (item.isDivider) {
                            return (
                                <div key={`div-${index}`} style={{ ...styles.navSectionTitle, marginTop: '1rem', paddingTop: '0.5rem' }}>
                                    <span>{item.name}</span>
                                </div>
                            );
                        }

                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <Link 
                                key={item.path} 
                                to={item.path} 
                                style={{
                                    ...styles.navLink,
                                    ...(isActive ? styles.activeLink : {})
                                }}
                                className="nav-item-hover"
                            >
                                <span style={{ 
                                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                    display: 'flex', alignItems: 'center', transition: 'var(--transition-fast)'
                                }} className="nav-icon-wrapper">
                                    {item.icon}
                                </span>
                                {item.name}
                                {isActive && <div style={styles.activeIndicator}></div>}
                            </Link>
                        );
                    })}
                </nav>

                <div style={styles.userBox}>
                    <div style={styles.userAvatar}>
                        {user?.usuario ? user.usuario.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div style={styles.userInfo}>
                        <p style={styles.userName}>
                            {user?.usuario || 'Usuario'}
                        </p>
                        <p style={styles.userRole}>
                            <span style={styles.statusDot}></span>
                            {user?.rol || 'Usuario'}
                        </p>
                    </div>
                    <button onClick={logout} style={styles.iconBtn} className="hover-bg" title="Cerrar Sesión">
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={styles.mainContent}>
                <header style={styles.topbar}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button style={styles.iconBtn} className="hover-bg mobile-only">
                            <Menu size={20} />
                        </button>
                        <h2 style={styles.pageTitle}>
                            {menu.find(m => m.path === location.pathname)?.name || 'Módulo'}
                        </h2>
                    </div>
                    
                    <div style={styles.topActions}>
                        <div style={styles.clock}>
                            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                        
                        <div style={styles.divider}></div>

                        <button onClick={toggleTheme} style={styles.iconBtn} className="hover-bg theme-toggle-btn" title="Alternar Tema">
                            <span style={{ display: 'flex', transition: 'transform 0.5s ease', transform: theme === 'dark' ? 'rotate(360deg)' : 'rotate(0)' }}>
                                {theme === 'dark' ? <Sun size={20} color="#FFD700" /> : <Moon size={20} color="#3B82F6" />}
                            </span>
                        </button>
                        
                        <button 
                            onClick={() => {
                                if (notifCount > 0) {
                                    toast('Tienes notificaciones pendientes', { icon: '🔔' });
                                    setNotifCount(0);
                                } else {
                                    toast('No tienes notificaciones pendientes', { icon: '🔔' });
                                }
                            }}
                            style={{...styles.iconBtn, position: 'relative'}} 
                            className="hover-bg" 
                            title="Notificaciones"
                        >
                            <Bell size={20} style={{ color: notifCount > 0 ? 'var(--warning)' : 'inherit' }} />
                            {notifCount > 0 && <span style={styles.notificationBadge}>{notifCount}</span>}
                        </button>
                    </div>
                </header>
                
                <div style={styles.pageContent} className="animate-fade">
                    <Outlet />
                </div>
            </main>
            
            {/* Inline styles para efectos hover */}
            <style dangerouslySetInnerHTML={{__html: `
                .nav-item-hover:hover {
                    background-color: var(--surface-hover) !important;
                    color: var(--text-main) !important;
                }
                .nav-item-hover:hover .nav-icon-wrapper {
                    color: var(--primary) !important;
                    transform: scale(1.05);
                }
                .hover-bg:hover {
                    background-color: var(--surface-hover);
                    color: var(--text-main) !important;
                }
                @media (min-width: 768px) {
                    .mobile-only { display: none !important; }
                }
            `}} />
        </div>
    );
};

const styles = {
    appContainer: {
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-color)'
    },
    sidebar: {
        width: '260px',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-color)',
        zIndex: 50,
        backgroundColor: 'var(--surface)',
        boxShadow: '10px 0 30px rgba(0, 0, 0, 0.05)'
    },
    logoBox: {
        padding: '1.5rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        height: '80px',
        borderBottom: '1px solid var(--border-color)'
    },
    logoIcon: {
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
        width: '36px',
        height: '36px',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-primary)'
    },
    brandTitle: { color: 'var(--text-main)', margin: 0, fontSize: '1.2rem', fontWeight: '700', letterSpacing: '-0.5px' },
    brandSubtitle: { fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' },
    navSectionTitle: {
        padding: '0 1.5rem',
        marginTop: '1.75rem',
        marginBottom: '0.75rem',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    nav: {
        flex: 1,
        padding: '0 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        overflowY: 'auto'
    },
    navLink: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        padding: '0.75rem 1.25rem',
        margin: '0 0.75rem',
        borderRadius: '0.75rem',
        color: 'var(--text-muted)',
        fontWeight: 500,
        fontSize: '0.875rem',
        transition: 'var(--transition-fast)',
        textDecoration: 'none'
    },
    activeLink: {
        backgroundColor: 'var(--primary-alpha)',
        color: 'var(--primary)',
        fontWeight: 600,
        boxShadow: 'inset 0 0 0 1px var(--primary)'
    },
    activeIndicator: {
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        height: '6px',
        width: '6px',
        backgroundColor: 'var(--primary)',
        borderRadius: '50%',
        boxShadow: '0 0 10px var(--primary)'
    },
    userBox: {
        padding: '1.25rem',
        margin: '1rem',
        borderRadius: '1.25rem',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        backgroundColor: 'var(--bg-color)',
        marginTop: 'auto'
    },
    userAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        backgroundColor: 'var(--primary-alpha)',
        color: 'var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '1rem',
        border: '1px solid var(--primary-light)'
    },
    userInfo: { textAlign: 'left', flex: 1, overflow: 'hidden' },
    userName: { fontWeight: 600, margin: 0, fontSize: '0.825rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--text-main)' },
    userRole: { fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '1px' },
    statusDot: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)', boxShadow: '0 0 8px var(--success)' },
    iconBtn: {
        background: 'none',
        border: 'none',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        padding: '0.5rem',
        borderRadius: 'var(--radius-md)',
        transition: 'var(--transition-fast)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    mainContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    topbar: {
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2.5rem',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--surface)',
        zIndex: 40
    },
    pageTitle: { margin: 0, fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.5px' },
    topActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
    },
    clock: {
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginRight: '0.5rem'
    },
    divider: {
        width: '1px',
        height: '24px',
        backgroundColor: 'var(--border-color)',
        margin: '0 0.25rem'
    },
    notificationBadge: {
        position: 'absolute',
        top: '6px',
        right: '8px',
        backgroundColor: 'var(--danger)',
        color: '#fff',
        fontSize: '10px',
        fontWeight: 'bold',
        padding: '3px 5px',
        borderRadius: '10px',
        lineHeight: 1,
        border: '2px solid var(--surface)'
    },
    pageContent: {
        flex: 1,
        overflowY: 'auto',
        padding: '2rem',
        position: 'relative',
        backgroundColor: 'var(--bg-color)'
    }
};

export default Layout;
