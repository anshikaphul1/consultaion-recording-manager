import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api';
import { Lock, User, Compass, AlertCircle, Smile, Phone, Calendar, Clock, MapPin, Award } from 'lucide-react';
import { AppContext } from '../context/AppContext';

const Register = () => {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // 'user', 'astrologer', 'admin'
  
  // Client specific fields
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  
  // Astrologer specific fields
  const [specialization, setSpecialization] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AppContext);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      username,
      password,
      name,
      role
    };

    if (role === 'user') {
      payload.phone = phone;
      payload.dob = dob;
      payload.birthTime = birthTime;
      payload.birthPlace = birthPlace;
    } else if (role === 'astrologer') {
      payload.specialization = specialization;
    }

    try {
      const response = await API.post('/auth/register', payload);
      const { token, user } = response.data;
      
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      login(user);
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFill = () => {
    const randomSuffix = Math.floor(Math.random() * 900 + 100);
    setName(`Astro User ${randomSuffix}`);
    setUsername(`astro_${randomSuffix}`);
    setPassword('user123');
    
    if (role === 'user') {
      setPhone(`+91 98765 ${randomSuffix}`);
      setDob('2000-01-01');
      setBirthTime('12:00');
      setBirthPlace('New Delhi, India');
    } else if (role === 'astrologer') {
      setSpecialization('Vedic Horary & Palmistry');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '2.25rem 2rem' }}>
        
        {/* Branding header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.65rem', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', marginBottom: '0.75rem' }}>
            <Compass size={32} className="animate-spin-slow" color="var(--primary-hover)" />
          </div>
          <h1 className="gold-gradient-text" style={{ fontSize: '1.75rem', fontWeight: 800 }}>Create Account</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Join AstroChronicle Recording Manager</p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">I am registering as:</label>
            <select 
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ background: 'var(--bg-primary)' }}
            >
              <option value="user" style={{ background: 'var(--bg-primary)' }}>Client / Consultant User</option>
              <option value="astrologer" style={{ background: 'var(--bg-primary)' }}>Astrologer</option>
              <option value="admin" style={{ background: 'var(--bg-primary)' }}>Administrator</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <Smile size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Enter full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ paddingLeft: '36px' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '36px' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-control"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '36px' }}
                required
              />
            </div>
          </div>

          {/* DYNAMIC FIELDS FOR CLIENT/USER */}
          {role === 'user' && (
            <div style={{ borderTop: '1px dashed var(--glass-border)', marginTop: '1.5rem', paddingTop: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}>Astrological Chart Registration</h3>
              
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="date"
                    className="form-control"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Birth Time (Local)</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="time"
                    className="form-control"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Birth Place</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="City, Country"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC FIELDS FOR ASTROLOGER */}
          {role === 'astrologer' && (
            <div style={{ borderTop: '1px dashed var(--glass-border)', marginTop: '1.5rem', paddingTop: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}>Astrologer Profile Details</h3>

              <div className="form-group">
                <label className="form-label">Specialization</label>
                <div style={{ position: 'relative' }}>
                  <Award size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Vedic, Numerology, Horary"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.25rem' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem' }}>
          <button 
            type="button" 
            onClick={handleAutoFill} 
            className="btn btn-secondary btn-sm" 
            style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', color: 'var(--accent-gold)', marginBottom: '1rem' }}
          >
            Quick Sandbox Auto-Fill
          </button>
          <div style={{ color: 'var(--text-secondary)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--primary-hover)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
