import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext();
const USER_CACHE_KEY = 'homecrew_user_cache';

const readCachedUser = () => {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
      localStorage.setItem('user_role', user.role || 'client');
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem('user_role');
    }
  } catch {
    // ignore localStorage write errors
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readCachedUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      writeCachedUser(null);
      setLoading(false);
      return;
    }

    // Release UI immediately; validate token/user in background.
    setLoading(false);

    // If no cached user is available yet, keep an optimistic session object
    // so protected screens don't hard-redirect on reload.
    setUser((prev) => prev || { role: localStorage.getItem('user_role') || 'client' });

    try {
      const response = await api.get('/auth/users/me/');
      setUser(response.data);
      writeCachedUser(response.data);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      writeCachedUser(null);
      setUser(null);
    }
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
      writeCachedUser(meRes.data);
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
    writeCachedUser(null);
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
