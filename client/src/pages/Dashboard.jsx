import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import AudioPlayer from '../components/AudioPlayer';
import { 
  Users, AudioLines, Award, Clock, Plus, Compass, 
  Calendar, UserPlus, Phone, MapPin, CalendarDays, FileAudio, FileText 
} from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [astrologers, setAstrologers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeAudioSrc, setActiveAudioSrc] = useState('');
  const [activeConsultationId, setActiveConsultationId] = useState('');
  const navigate = useNavigate();

  const userString = localStorage.getItem('admin_user');
  const user = userString ? JSON.parse(userString) : { role: 'user' };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await API.get('/dashboard');
        setData(response.data);

        // Fetch astrologers list if logged in as client
        if (user.role === 'user') {
          const astrosResponse = await API.get('/astrologers');
          setAstrologers(astrosResponse.data);
        }
      } catch (err) {
        setError('Failed to load dashboard metrics.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatDuration = (seconds) => {
    if (!seconds) return '0 mins';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min${mins > 1 ? 's' : ''}`;
    }
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  };

  const formatDurationText = (seconds) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatBirthDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const playAudio = (consultation) => {
    const serverBase = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
    const url = `${serverBase}${consultation.audioUrl}`;
    setActiveAudioSrc(url);
    setActiveConsultationId(consultation._id);
  };

  if (loading) {
    return (
      <div className="app-container">
        <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '1rem' }}>
          <Compass className="animate-spin-slow" size={48} color="var(--primary)" />
          <p style={{ color: 'var(--text-secondary)' }}>Loading AstroChronicle stats...</p>
        </div>
      </div>
    );
  }

  // 1. CLIENT / USER DASHBOARD VIEW
  if (user.role === 'user') {
    const { client, consultations } = data || { client: {}, consultations: [] };
    return (
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <div style={{ marginBottom: '2rem' }}>
            <h1 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>Welcome, {client.name}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Your AstroConsultations logs and birth chart recommendations</p>
          </div>

          <div className="two-col-grid">
            {/* Left: Consultations list */}
            <div>
              <div className="glass-card">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AudioLines size={20} color="var(--primary)" />
                  <span>My Consultations Timeline</span>
                </h2>

                {consultations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <FileAudio size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                    <p>No consultations logged for you yet.</p>
                  </div>
                ) : (
                  <div className="timeline" style={{ paddingLeft: '1.5rem', borderLeft: '2px dashed rgba(255,255,255,0.08)' }}>
                    {consultations.map((c) => (
                      <div key={c._id} className="timeline-item" style={{ position: 'relative', marginBottom: '1.75rem' }}>
                        <div className="timeline-dot" style={{ left: 'calc(-1.5rem - 6px)', background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }} />
                        
                        <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(15, 23, 42, 0.25)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                {new Date(c.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                Conducted by: <strong>{c.astrologer?.name}</strong>
                              </div>
                            </div>
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Completed</span>
                          </div>

                          {c.notes && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.75rem', borderLeft: '2px solid var(--primary-glow)' }}>
                              {c.notes}
                            </p>
                          )}

                          {c.tags && c.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                              {c.tags.map(t => (
                                <span key={t} className="badge badge-primary" style={{ fontSize: '0.6rem' }}>{t}</span>
                              ))}
                            </div>
                          )}

                          {c.audioUrl ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.1)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Audio Log ({formatDurationText(c.duration)})</span>
                              {activeConsultationId === c._id ? (
                                <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>Active Player</span>
                              ) : (
                                <button onClick={() => playAudio(c)} className="btn btn-primary btn-sm" style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}>
                                  Load Audio
                                </button>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No audio log attached</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Client birth info & active player */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-gold)' }}>My Birth Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Phone size={14} color="var(--text-muted)" />
                    <span>Phone: {client.phone}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <CalendarDays size={14} color="var(--text-muted)" />
                    <span>DOB: {formatBirthDate(client.dob)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Clock size={14} color="var(--text-muted)" />
                    <span>Birth Time: {client.birthTime}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <MapPin size={14} color="var(--text-muted)" />
                    <span>Birth Place: {client.birthPlace}</span>
                  </div>
                </div>
              </div>

              {activeAudioSrc && (
                <div className="glass-card">
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <FileAudio size={16} color="var(--primary)" />
                    <span>Audio Player</span>
                  </h3>
                  <AudioPlayer src={activeAudioSrc} />
                </div>
              )}
            </div>
          </div>

          {/* Meet Our Astrologers Section */}
          <div style={{ marginTop: '2.5rem' }}>
            <h2 className="gradient-text" style={{ fontSize: '1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
              <Compass size={22} className="animate-spin-slow" color="var(--accent-gold)" />
              <span>Our Team of Expert Astrologers</span>
            </h2>
            <div className="astrologers-grid">
              {astrologers.map((astro) => (
                <div key={astro._id} className="astrologer-card">
                  <div className="astrologer-avatar-wrapper">
                    <img 
                      src={astro.photoUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=250&auto=format&fit=crop'} 
                      alt={astro.name} 
                      className="astrologer-avatar" 
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=250&auto=format&fit=crop';
                      }}
                    />
                  </div>
                  <div className="astrologer-name">{astro.name}</div>
                  <div className="astrologer-specialization">{astro.specialization}</div>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    );
  }

  // 2. ASTROLOGER DASHBOARD VIEW
  if (user.role === 'astrologer') {
    const { counts, recentConsultations } = data || { counts: { clients: 0, consultations: 0, totalDurationSeconds: 0 }, recentConsultations: [] };
    return (
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>Welcome, {user.name}</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Astrologer Portal — Manage your sessions and consult recordings</p>
            </div>
            <Link to="/consultations?add=true" className="btn btn-primary">
              <Plus size={16} />
              <span>Log Consultation</span>
            </Link>
          </div>

          {/* Stats */}
          <div className="dashboard-grid">
            <div className="glass-card stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                <Users size={24} color="var(--primary)" />
              </div>
              <div>
                <div className="stat-value">{counts.clients}</div>
                <div className="stat-label">Clients Served</div>
              </div>
            </div>

            <div className="glass-card stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                <AudioLines size={24} color="var(--accent-gold)" />
              </div>
              <div>
                <div className="stat-value">{counts.consultations}</div>
                <div className="stat-label">My Consultations</div>
              </div>
            </div>

            <div className="glass-card stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                <Clock size={24} color="var(--accent-emerald)" />
              </div>
              <div>
                <div className="stat-value">{formatDuration(counts.totalDurationSeconds)}</div>
                <div className="stat-label">Audio Consult Logged</div>
              </div>
            </div>
          </div>

          <div className="two-col-grid" style={{ marginTop: '2rem' }}>
            {/* Left: Astrologer's consultations */}
            <div className="glass-card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>My Recent Sessions</h2>
              
              {recentConsultations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <AudioLines size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                  <p>You haven't logged any sessions yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {recentConsultations.map((c) => (
                    <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{c.client?.name}</div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={14} />
                            {formatDate(c.date)}
                          </span>
                          {c.duration > 0 && <span>Duration: {formatDurationText(c.duration)}</span>}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {c.audioUrl ? (
                          <button 
                            onClick={() => playAudio(c)} 
                            className={`btn ${activeConsultationId === c._id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                          >
                            Play Audio
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No audio</span>
                        )}
                        <button onClick={() => navigate(`/clients/${c.client?._id}`)} className="btn btn-secondary btn-sm">
                          View Client
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Audio Player Widget */}
            <div>
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Active Player</h3>
                {activeAudioSrc ? (
                  <AudioPlayer src={activeAudioSrc} />
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>Select a consultation recording on the left to play.</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 3. ADMIN DASHBOARD VIEW (GLOBAL STATS)
  const { counts, recentConsultations, recentClients, popularTags } = data || {
    counts: { clients: 0, consultations: 0, astrologers: 0, totalDurationSeconds: 0 },
    recentConsultations: [],
    recentClients: [],
    popularTags: []
  };

  return (
    <div className="app-container">
      <Navbar />
      
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '2.25rem', fontWeight: 800 }}>Admin Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)' }}>System overview and recent astrologer activity statistics</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/clients?add=true" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <UserPlus size={16} />
              <span>Add Client</span>
            </Link>
            <Link to="/consultations?add=true" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={16} />
              <span>Add Consultation</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="dashboard-grid">
          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary-hover)' }}>
              <Users size={24} />
            </div>
            <div>
              <div className="stat-value">{counts.clients}</div>
              <div className="stat-label">Active Clients</div>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-gold)' }}>
              <AudioLines size={24} />
            </div>
            <div>
              <div className="stat-value">{counts.consultations}</div>
              <div className="stat-label">Consultations</div>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)' }}>
              <Award size={24} />
            </div>
            <div>
              <div className="stat-value">{counts.astrologers}</div>
              <div className="stat-label">Astrologers</div>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}>
              <Clock size={24} />
            </div>
            <div>
              <div className="stat-value">{formatDuration(counts.totalDurationSeconds)}</div>
              <div className="stat-label">Audio Logs</div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="two-col-grid" style={{ marginTop: '2rem' }}>
          
          {/* Left Column: Recent Consultations */}
          <div>
            <div className="glass-card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AudioLines size={20} color="var(--primary)" />
                <span>Recent Consultations</span>
              </h2>

              {recentConsultations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <AudioLines size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                  <p>No consultations logged yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {recentConsultations.map((consultation) => (
                    <div key={consultation._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <Link to={`/clients/${consultation.client?._id}`} style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)', textDecoration: 'none' }} className="nav-link-hover">
                          {consultation.client?.name || 'Deleted Client'}
                        </Link>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Award size={14} color="var(--accent-gold)" />
                            {consultation.astrologer?.name}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={14} />
                            {formatDate(consultation.date)}
                          </span>
                        </div>
                        {consultation.tags && consultation.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                            {consultation.tags.map(t => (
                              <span key={t} className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <span className={`badge ${consultation.status === 'Completed' ? 'badge-success' : consultation.status === 'Scheduled' ? 'badge-warning' : 'badge-danger'}`}>
                          {consultation.status}
                        </span>
                        {consultation.duration > 0 && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {Math.floor(consultation.duration / 60)}m {consultation.duration % 60}s
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                    <Link to="/consultations" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>View All Consultations</Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Recent Clients & Tags */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Recent Clients */}
            <div className="glass-card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="var(--accent-emerald)" />
                <span>New Clients</span>
              </h2>

              {recentClients.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>No clients registered.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {recentClients.map(c => (
                    <Link key={c._id} to={`/clients/${c._id}`} style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', textDecoration: 'none', padding: '0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', transition: 'var(--transition-smooth)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.phone}</div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {c.birthPlace}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Tags */}
            <div className="glass-card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Compass size={20} color="var(--accent-gold)" />
                <span>Popular Tags</span>
              </h2>

              {popularTags.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>No tags used yet.</p>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {popularTags.map(tag => (
                    <span 
                      key={tag.name} 
                      className="badge badge-warning" 
                      style={{ fontSize: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}
                    >
                      <span>{tag.name}</span>
                      <span style={{ opacity: 0.6, fontSize: '0.65rem', background: 'rgba(0,0,0,0.2)', padding: '0.05rem 0.3rem', borderRadius: '3px' }}>{tag.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
