import React, { useState, useEffect } from 'react';
import api from '../api/axiosBase';
import { AuthContext } from './AuthContextObject';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('pos_token');
            if (token) {
                try {
                    const response = await api.get('/me');
                    setUser(response.data);
                } catch (error) {
                    console.error("Token inválido", error);
                    localStorage.removeItem('pos_token');
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (usuario, password) => {
        const response = await api.post('/login', { usuario, password });
        localStorage.setItem('pos_token', response.data.token);
        setUser(response.data.usuario);
        return response.data;
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (e) {
            console.error(e);
        } finally {
            localStorage.removeItem('pos_token');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
