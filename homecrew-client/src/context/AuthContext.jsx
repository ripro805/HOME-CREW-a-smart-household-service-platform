import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const response = await api.get('/auth/users/me/');
        setUser(response.data);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/jwt/create/', { email, password });
      const { access, refresh } = response.data;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      const meRes = await api.get('/auth/users/me/', {
        headers: { Authorization: `Bearer ${access}` }
      });
      setUser(meRes.data);
      return {
        success: true,
        isAdmin: meRes.data.role === 'admin',
        isTechnician: meRes.data.role === 'technician',
        role: meRes.data.role,
      };
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return { 
        success: false, 
        error: error.response?.data || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      // Use djoser registration endpoint for email activation
      await api.post('/auth/users/', userData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'technician';

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin,
    isTechnician,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
