import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sp_token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data.data.user);
          setSchool(res.data.data.school);
        })
        .catch(() => {
          localStorage.removeItem('sp_token');
          localStorage.removeItem('sp_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const identifier = credentials.login?.trim();
    const payload = {
      password: credentials.password,
      ...(identifier?.includes('@') ? { email: identifier } : { phone: identifier }),
    };

    const res = await api.post('/auth/login', payload);
    const { user: u, token } = res.data.data;
    localStorage.setItem('sp_token', token);
    localStorage.setItem('sp_user', JSON.stringify(u));
    setUser(u);
    // Fetch school data
    if (u.school_id) {
      const schoolRes = await api.get('/auth/me');
      setSchool(schoolRes.data.data.school);
    }
    return u;
  };

  const logout = () => {
    localStorage.removeItem('sp_token');
    localStorage.removeItem('sp_user');
    setUser(null);
    setSchool(null);
  };

  const refreshMe = async () => {
    const res = await api.get('/auth/me');
    setUser(res.data.data.user);
    setSchool(res.data.data.school);
    localStorage.setItem('sp_user', JSON.stringify(res.data.data.user));
    return res.data.data;
  };

  const updateProfile = async (payload) => {
    const res = await api.put('/auth/me', payload);
    setUser(res.data.data);
    localStorage.setItem('sp_user', JSON.stringify(res.data.data));
    return res.data.data;
  };

  const isAdmin = user?.role === 'school_admin' || user?.role === 'super_admin';
  const isTeacher = user?.role === 'teacher';
  const isParent = user?.role === 'parent';
  const isStudent = user?.role === 'student';

  return (
    <AuthContext.Provider value={{ user, school, loading, login, logout, refreshMe, updateProfile, isAdmin, isTeacher, isParent, isStudent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
