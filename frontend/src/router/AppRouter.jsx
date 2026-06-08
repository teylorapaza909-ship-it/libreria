import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextObject';
import Login from '../views/auth/Login';

import Layout from '../components/Layout';
import Dashboard from '../views/dashboard/Dashboard';
import POS from '../views/pos/POS';
import Productos from '../views/inventory/Productos';
import Clientes from '../views/people/Clientes';
import CajaDia from '../views/transactions/CajaDia';

import Categorias from '../views/inventory/Categorias';
import Proveedores from '../views/people/Proveedores';
import Reportes from '../views/dashboard/Reportes';
import HistorialVentas from '../views/transactions/HistorialVentas';
import Papelera from '../views/dashboard/Papelera';
import Kardex from '../views/inventory/Kardex';
import Compras from '../views/transactions/Compras';
import Facturacion from '../views/transactions/Facturacion';
import Configuracion from '../views/dashboard/Configuracion';
import Usuarios from '../views/people/Usuarios';

const isAdmin = (user) => ['Administrador', 'admin'].includes(user?.rol);

const PrivateRoute = ({ children, adminOnly = false }) => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div style={{ padding:'2rem' }}>Cargando...</div>;
    if (!user) return <Navigate to="/login" />;
    if (adminOnly && !isAdmin(user)) return <Navigate to="/pos" replace />;
    return children;
};

const AppRouter = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route 
                path="/" 
                element={
                    <PrivateRoute>
                        <Layout />
                    </PrivateRoute>
                } 
            >
                <Route index element={<Dashboard />} />
                <Route path="pos" element={<POS />} />
                <Route path="productos" element={<Productos />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="caja" element={<CajaDia />} />
                <Route path="categorias" element={<PrivateRoute adminOnly><Categorias /></PrivateRoute>} />
                <Route path="proveedores" element={<PrivateRoute adminOnly><Proveedores /></PrivateRoute>} />
                <Route path="reportes" element={<PrivateRoute adminOnly><Reportes /></PrivateRoute>} />
                <Route path="historial" element={<PrivateRoute adminOnly><HistorialVentas /></PrivateRoute>} />
                <Route path="papelera" element={<PrivateRoute adminOnly><Papelera /></PrivateRoute>} />
                <Route path="kardex" element={<PrivateRoute adminOnly><Kardex /></PrivateRoute>} />
                <Route path="compras" element={<PrivateRoute adminOnly><Compras /></PrivateRoute>} />
                <Route path="facturacion" element={<PrivateRoute adminOnly><Facturacion /></PrivateRoute>} />
                <Route path="configuracion" element={<PrivateRoute adminOnly><Configuracion /></PrivateRoute>} />
                <Route path="usuarios" element={<PrivateRoute adminOnly><Usuarios /></PrivateRoute>} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

export default AppRouter;
