import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, AudioLines, LogOut, Compass } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const userString = localStorage.getItem('admin_user');
  const user = userString ? JSON.parse(userString) : { name: 'Administrator', role: 'admin' };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/login');
  };

  return (
    <nav className="glass-card" style={{ borderRadius: '0 0 16px 16px', borderTop: 'none', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <NavLink to="/dashboard" className="navbar-brand gold-gradient-text" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Compass className="animate-spin-slow" size={28} color="var(--accent-gold)" />
        <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>AstroChronicle</span>
      </NavLink>

      <ul className="nav-links">
        <li>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
        </li>
        {(user.role === 'admin' || user.role === 'astrologer') && (
          <>
            <li>
              <NavLink to="/clients" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Users size={18} />
                <span>Clients</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/consultations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <AudioLines size={18} />
                <span>Consultations</span>
              </NavLink>
            </li>
          </>
        )}
      </ul>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
          <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginTop: '0.1rem' }}>{user.role === 'admin' ? 'Admin Access' : 'User Access'}</span>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.6rem', color: 'var(--accent-crimson)', display: 'flex', alignItems: 'center', gap: '0.25rem' }} title="Log Out">
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
