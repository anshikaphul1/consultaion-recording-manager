import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api';
import { Lock, User, Compass, AlertCircle } from 'lucide-react';
import { AppContext } from '../context/AppContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AppContext);

  useEffect(() => {
    // If already logged in, skip login page
    const token = localStorage.getItem('admin_token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await API.post('/auth/login', { username, password });
      const { token, user } = response.data;
      
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      login(user);
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to authenticate. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFill = () => {
    setUsername('admin');
    setPassword('admin123');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem 2rem', position: 'relative' }}>
        
        {/* Branding header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', marginBottom: '1rem' }}>
            <Compass size={40} className="animate-spin-slow" color="var(--primary-hover)" />
          </div>
          <h1 className="gold-gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>AstroChronicle</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Consultation Recording Manager</p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '36px' }}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-control"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '36px' }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            type="button" 
            onClick={handleAutoFill} 
            className="btn btn-secondary btn-sm" 
            style={{ fontSize: '0.8rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', color: 'var(--accent-gold)' }}
          >
            Quick Sandbox Auto-fill
          </button>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', marginBottom: '1rem' }}>
            Testing credentials: <strong>admin</strong> / <strong>admin123</strong>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--primary-hover)', textDecoration: 'none', fontWeight: 600 }}>Sign Up</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
