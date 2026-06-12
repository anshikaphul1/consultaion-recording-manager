import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AudioPlayer from '../components/AudioPlayer';
import { 
  Users, Award, Clock, DollarSign, Calendar, Eye, 
  Trash2, ShieldCheck, CheckCircle2, XCircle, PlusCircle, Edit, Power, ArrowLeftRight, MessageSquare 
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [astrologers, setAstrologers] = useState([]);
  const [clients, setClients] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reviews, setReviews] = useState([]);
  
  // Astrologer Form States
  const [showAstroForm, setShowAstroForm] = useState(false);
  const [editingAstro, setEditingAstro] = useState(null);
  const [astroFormData, setAstroFormData] = useState({
    name: '',
    specialization: '',
    specialties: '',
    languages: '',
    ratePerMin: 10,
    experience: 0,
    bio: '',
    photoUrl: ''
  });

  // Filters for Consultations
  const [clientSearch, setClientSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  // Playback Modal States
  const [playbackSession, setPlaybackSession] = useState(null);
  const [playbackTranscript, setPlaybackTranscript] = useState([]);
  const [playbackAudioUrl, setPlaybackAudioUrl] = useState(null);
  const [loadingPlayback, setLoadingPlayback] = useState(false);

  const handleOpenPlayback = async (session) => {
    setPlaybackSession(session);
    setPlaybackTranscript([]);
    setPlaybackAudioUrl(null);
    setLoadingPlayback(true);
    
    try {
      if (session.chatTranscriptAvailable) {
        const transcriptRes = await axios.get(`${API_BASE}/sessions/${session._id}/chat`, { headers });
        setPlaybackTranscript(transcriptRes.data);
      }
      
      if (session.recordingUrl) {
        const audioRes = await axios.get(`${API_BASE}/sessions/${session._id}/recording`, {
          headers,
          responseType: 'blob'
        });
        const localUrl = URL.createObjectURL(audioRes.data);
        setPlaybackAudioUrl(localUrl);
      }
    } catch (err) {
      console.error('Failed to load session details:', err);
    } finally {
      setLoadingPlayback(false);
    }
  };

  const handleClosePlayback = () => {
    if (playbackAudioUrl) {
      URL.revokeObjectURL(playbackAudioUrl);
    }
    setPlaybackSession(null);
    setPlaybackTranscript([]);
    setPlaybackAudioUrl(null);
  };


  useEffect(() => {
    fetchOverviewMetrics();
    fetchAstrologers();
    fetchClients();
    fetchConsultations();
    fetchTransactions();
    fetchReviews();
  }, []);

  const fetchOverviewMetrics = async () => {
    try {
      const res = await axios.get(`${API_BASE}/dashboard`, { headers });
      setMetrics(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAstrologers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/astrologers`, { headers });
      setAstrologers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API_BASE}/clients/admin-list`, { headers });
      setClients(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchConsultations = async () => {
    try {
      let url = `${API_BASE}/consultations?`;
      if (clientSearch) url += `clientSearch=${clientSearch}&`;
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;
      const res = await axios.get(url, { headers });
      setConsultations(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/wallet/transactions`, { headers });
      setTransactions(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API_BASE}/reviews/admin`, { headers });
      setReviews(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  // Astrologer CRUD Handlers
  const handleAstroSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...astroFormData,
      specialties: astroFormData.specialties.split(',').map(s => s.trim()).filter(Boolean),
      languages: astroFormData.languages.split(',').map(l => l.trim()).filter(Boolean),
      ratePerMin: Number(astroFormData.ratePerMin),
      experience: Number(astroFormData.experience)
    };

    try {
      if (editingAstro) {
        await axios.put(`${API_BASE}/astrologers/${editingAstro._id}`, payload, { headers });
        alert('Astrologer updated successfully!');
      } else {
        await axios.post(`${API_BASE}/astrologers`, payload, { headers });
        alert('Astrologer added successfully!');
      }
      setEditingAstro(null);
      setShowAstroForm(false);
      setAstroFormData({
        name: '',
        specialization: '',
        specialties: '',
        languages: '',
        ratePerMin: 10,
        experience: 0,
        bio: '',
        photoUrl: ''
      });
      fetchAstrologers();
      fetchOverviewMetrics();
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing request');
    }
  };

  const handleEditAstro = (astro) => {
    setEditingAstro(astro);
    setAstroFormData({
      name: astro.name,
      specialization: astro.specialization,
      specialties: astro.specialties.join(', '),
      languages: astro.languages.join(', '),
      ratePerMin: astro.ratePerMin,
      experience: astro.experience || 0,
      bio: astro.bio || '',
      photoUrl: astro.photoUrl || ''
    });
    setShowAstroForm(true);
  };

  const handleDeleteAstro = async (id) => {
    if (!window.confirm('Are you sure you want to delete this astrologer?')) return;
    try {
      await axios.delete(`${API_BASE}/astrologers/${id}`, { headers });
      alert('Deleted successfully.');
      fetchAstrologers();
      fetchOverviewMetrics();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleAstroStatus = async (astro) => {
    try {
      const nextStatus = !astro.isOnline;
      await axios.put(`${API_BASE}/astrologers/${astro._id}`, { isOnline: nextStatus }, { headers });
      fetchAstrologers();
    } catch (e) {
      console.error(e);
    }
  };

  // Reviews handlers
  const toggleReviewApproval = async (id, currentVal) => {
    try {
      await axios.patch(`${API_BASE}/reviews/${id}/approve`, { isApproved: !currentVal }, { headers });
      fetchReviews();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await axios.delete(`${API_BASE}/reviews/${id}`, { headers });
      fetchReviews();
    } catch (e) {
      console.error(e);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const logout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-bg-secondary text-text-primary font-sans antialiased">
      {/* Navbar */}
      <nav className="glass-card mx-6 my-4 p-4 flex justify-between items-center rounded-2xl border-none">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-gold" size={28} />
          <span className="font-heading font-extrabold text-xl tracking-tight gold-gradient-text">AstroChronicle Admin Portal</span>
        </div>
        <button onClick={logout} className="btn btn-secondary btn-sm text-crimson hover:bg-crimson/10">Log Out</button>
      </nav>

      <div className="max-w-[1280px] mx-auto px-6 py-2 flex flex-col md:flex-row gap-6">
        {/* Sidebar tabs */}
        <aside className="md:w-64 flex flex-col gap-2 shrink-0">
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`text-left p-3 rounded-lg font-heading text-sm font-semibold transition ${activeTab === 'overview' ? 'bg-primary/20 text-primary-hover border border-primary/30' : 'hover:bg-white/5 text-text-secondary'}`}
          >
            Overview & Metrics
          </button>
          <button 
            onClick={() => setActiveTab('astrologers')} 
            className={`text-left p-3 rounded-lg font-heading text-sm font-semibold transition ${activeTab === 'astrologers' ? 'bg-primary/20 text-primary-hover border border-primary/30' : 'hover:bg-white/5 text-text-secondary'}`}
          >
            Manage Astrologers
          </button>
          <button 
            onClick={() => setActiveTab('clients')} 
            className={`text-left p-3 rounded-lg font-heading text-sm font-semibold transition ${activeTab === 'clients' ? 'bg-primary/20 text-primary-hover border border-primary/30' : 'hover:bg-white/5 text-text-secondary'}`}
          >
            Manage Clients
          </button>
          <button 
            onClick={() => setActiveTab('consultations')} 
            className={`text-left p-3 rounded-lg font-heading text-sm font-semibold transition ${activeTab === 'consultations' ? 'bg-primary/20 text-primary-hover border border-primary/30' : 'hover:bg-white/5 text-text-secondary'}`}
          >
            Consultation Log
          </button>
          <button 
            onClick={() => setActiveTab('transactions')} 
            className={`text-left p-3 rounded-lg font-heading text-sm font-semibold transition ${activeTab === 'transactions' ? 'bg-primary/20 text-primary-hover border border-primary/30' : 'hover:bg-white/5 text-text-secondary'}`}
          >
            Transaction Log
          </button>
          <button 
            onClick={() => setActiveTab('reviews')} 
            className={`text-left p-3 rounded-lg font-heading text-sm font-semibold transition ${activeTab === 'reviews' ? 'bg-primary/20 text-primary-hover border border-primary/30' : 'hover:bg-white/5 text-text-secondary'}`}
          >
            Reviews Moderation
          </button>
        </aside>

        {/* Dashboard Area */}
        <main className="flex-1 min-w-0">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && metrics && (
            <div className="flex flex-col gap-6">
              <h1 className="font-heading font-extrabold text-2xl tracking-tight">Overview Dashboard</h1>
              {/* Stats counts */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card flex items-center gap-4">
                  <div className="stat-icon"><Users size={20} /></div>
                  <div>
                    <div className="stat-value">{metrics.counts?.clients}</div>
                    <div className="stat-label">Total Clients</div>
                  </div>
                </div>
                <div className="glass-card flex items-center gap-4">
                  <div className="stat-icon text-gold bg-gold/10"><Award size={20} /></div>
                  <div>
                    <div className="stat-value">{metrics.counts?.astrologers}</div>
                    <div className="stat-label">Astrologers</div>
                  </div>
                </div>
                <div className="glass-card flex items-center gap-4">
                  <div className="stat-icon text-emerald bg-emerald/10"><DollarSign size={20} /></div>
                  <div>
                    <div className="stat-value">₹{metrics.counts?.totalRevenue}</div>
                    <div className="stat-label">Total Revenue</div>
                  </div>
                </div>
                <div className="glass-card flex items-center gap-4">
                  <div className="stat-icon text-indigo bg-indigo/10"><Clock size={20} /></div>
                  <div>
                    <div className="stat-value">{metrics.counts?.consultations}</div>
                    <div className="stat-label">Total Sessions</div>
                  </div>
                </div>
              </div>

              {/* Consultation details by timeframe */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card flex flex-col gap-1">
                  <div className="text-text-secondary text-sm font-semibold">Sessions Today</div>
                  <div className="text-3xl font-heading font-extrabold text-primary-hover">{metrics.counts?.consultationsToday}</div>
                </div>
                <div className="glass-card flex flex-col gap-1">
                  <div className="text-text-secondary text-sm font-semibold">Sessions This Week</div>
                  <div className="text-3xl font-heading font-extrabold text-primary-hover">{metrics.counts?.consultationsWeek}</div>
                </div>
                <div className="glass-card flex flex-col gap-1">
                  <div className="text-text-secondary text-sm font-semibold">Sessions This Month</div>
                  <div className="text-3xl font-heading font-extrabold text-primary-hover">{metrics.counts?.consultationsMonth}</div>
                </div>
              </div>

              {/* Recent consultations */}
              <div className="glass-card flex flex-col gap-4">
                <h3 className="font-heading font-bold text-lg">Recent Consultations</h3>
                <div className="table-container">
                  <table className="custom-table w-full">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Astrologer</th>
                        <th>Date & Time</th>
                        <th>Duration</th>
                        <th>Charged</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.recentConsultations?.map(c => (
                        <tr key={c._id}>
                          <td className="font-semibold">{c.client?.name || 'Deleted Client'}</td>
                          <td>{c.astrologer?.name}</td>
                          <td>{new Date(c.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                          <td>{formatDuration(c.duration)}</td>
                          <td className="text-emerald font-bold">₹{c.amount}</td>
                          <td>
                            <span className="badge badge-success">Completed</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ASTROLOGERS MANAGEMENT */}
          {activeTab === 'astrologers' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h1 className="font-heading font-extrabold text-2xl tracking-tight">Astrologer Manager</h1>
                <button 
                  onClick={() => {
                    setEditingAstro(null);
                    setAstroFormData({
                      name: '',
                      specialization: '',
                      specialties: '',
                      languages: '',
                      ratePerMin: 10,
                      experience: 0,
                      bio: '',
                      photoUrl: ''
                    });
                    setShowAstroForm(!showAstroForm);
                  }}
                  className="btn btn-primary btn-sm flex items-center gap-1"
                >
                  <PlusCircle size={16} /> Add Astrologer
                </button>
              </div>

              {/* Astrologer add/edit form */}
              {showAstroForm && (
                <div className="glass-card mb-6">
                  <h3 className="font-heading font-bold text-lg mb-4">{editingAstro ? 'Edit Astrologer Details' : 'Register New Astrologer'}</h3>
                  <form onSubmit={handleAstroSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required
                        value={astroFormData.name}
                        onChange={e => setAstroFormData({...astroFormData, name: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Core Speciality</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Vedic Astrology" 
                        required
                        value={astroFormData.specialization}
                        onChange={e => setAstroFormData({...astroFormData, specialization: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">All Specialties (comma separated)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Horary, Gemology, Numerology"
                        value={astroFormData.specialties}
                        onChange={e => setAstroFormData({...astroFormData, specialties: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Languages (comma separated)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Hindi, English, Punjabi"
                        value={astroFormData.languages}
                        onChange={e => setAstroFormData({...astroFormData, languages: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Consultation Rate (₹/Min)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        required
                        value={astroFormData.ratePerMin}
                        onChange={e => setAstroFormData({...astroFormData, ratePerMin: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Experience (Years)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={astroFormData.experience}
                        onChange={e => setAstroFormData({...astroFormData, experience: e.target.value})}
                      />
                    </div>
                    <div className="form-group md:col-span-2">
                      <label className="form-label">Avatar/Photo URL</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="https://..."
                        value={astroFormData.photoUrl}
                        onChange={e => setAstroFormData({...astroFormData, photoUrl: e.target.value})}
                      />
                    </div>
                    <div className="form-group md:col-span-2">
                      <label className="form-label">Bio Description</label>
                      <textarea 
                        rows={3}
                        className="form-control" 
                        value={astroFormData.bio}
                        onChange={e => setAstroFormData({...astroFormData, bio: e.target.value})}
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-2 justify-end">
                      <button 
                        type="button" 
                        onClick={() => { setShowAstroForm(false); setEditingAstro(null); }}
                        className="btn btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary btn-sm">Save Astrologer</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Astrologers Table */}
              <div className="glass-card table-container">
                <table className="custom-table w-full">
                  <thead>
                    <tr>
                      <th>Astrologer</th>
                      <th>Specialty</th>
                      <th>Languages</th>
                      <th>Rate/Min</th>
                      <th>Experience</th>
                      <th>Online State</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {astrologers.map(a => (
                      <tr key={a._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <img src={a.photoUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop'} alt="" className="w-8 h-8 rounded-full object-cover" />
                            <span className="font-semibold">{a.name}</span>
                          </div>
                        </td>
                        <td>{a.specialization}</td>
                        <td>
                          <div className="flex gap-1 flex-wrap">
                            {a.languages.map(l => (
                              <span key={l} className="badge badge-primary text-[0.6rem]">{l}</span>
                            ))}
                          </div>
                        </td>
                        <td className="font-bold">₹{a.ratePerMin}/min</td>
                        <td>{a.experience} yrs</td>
                        <td>
                          <button 
                            onClick={() => toggleAstroStatus(a)} 
                            className={`badge ${a.isOnline ? 'badge-success' : 'badge-danger'} flex items-center gap-1 cursor-pointer`}
                          >
                            <Power size={10} />
                            <span>{a.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                          </button>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditAstro(a)} className="btn btn-secondary btn-sm p-1.5" title="Edit"><Edit size={14} /></button>
                            <button onClick={() => handleDeleteAstro(a._id)} className="btn btn-danger btn-sm p-1.5" title="Delete"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CLIENTS MANAGEMENT */}
          {activeTab === 'clients' && (
            <div className="flex flex-col gap-4">
              <h1 className="font-heading font-extrabold text-2xl tracking-tight">Client Manager</h1>
              <div className="glass-card table-container">
                <table className="custom-table w-full">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Username</th>
                      <th>Phone</th>
                      <th>Date of Birth</th>
                      <th>Wallet Balance</th>
                      <th>Sessions Counts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(c => (
                      <tr key={c._id}>
                        <td className="font-semibold">{c.name}</td>
                        <td className="text-text-secondary">@{c.username}</td>
                        <td>{c.phone}</td>
                        <td>{c.dob ? new Date(c.dob).toLocaleDateString() : 'N/A'}</td>
                        <td className="text-emerald font-bold">₹{c.walletBalance}</td>
                        <td className="font-semibold">{c.sessionCount} calls</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CONSULTATIONS LOGS */}
          {activeTab === 'consultations' && (
            <div className="flex flex-col gap-4">
              <h1 className="font-heading font-extrabold text-2xl tracking-tight">Consultation Audit Log</h1>
              
              {/* Filters */}
              <div className="glass-card grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="form-group mb-0">
                  <label className="form-label text-[0.75rem]">Client Name Search</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search name..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-[0.75rem]">Start Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-[0.75rem]">End Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
                <button 
                  onClick={fetchConsultations} 
                  className="btn btn-primary w-full"
                >
                  Apply Filters
                </button>
              </div>

              {/* List */}
              <div className="glass-card table-container">
                <table className="custom-table w-full">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Astrologer</th>
                      <th>Date</th>
                      <th>Duration</th>
                      <th>Amount Charged</th>
                      <th>Recording & Transcript</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultations.map(c => (
                      <tr key={c._id}>
                        <td className="font-semibold">{c.client?.name || 'Deleted Client'}</td>
                        <td>{c.astrologer?.name}</td>
                        <td>{new Date(c.date).toLocaleString()}</td>
                        <td>{formatDuration(c.duration)}</td>
                        <td className="text-emerald font-bold">₹{c.amount}</td>
                        <td>
                          {(c.recordingUrl || c.chatTranscriptAvailable) ? (
                            <button 
                              onClick={() => handleOpenPlayback(c)}
                              className="btn btn-secondary btn-sm flex items-center gap-1.5 py-1 text-xs text-primary-hover border-primary/20 bg-primary/5 hover:bg-primary/10"
                            >
                              <Eye size={12} /> Playback
                            </button>
                          ) : (
                            <span className="text-text-muted text-[11px] italic">Not available</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${c.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: TRANSACTION LOGS */}
          {activeTab === 'transactions' && (
            <div className="flex flex-col gap-4">
              <h1 className="font-heading font-extrabold text-2xl tracking-tight">System Transactions</h1>
              <div className="glass-card table-container">
                <table className="custom-table w-full">
                  <thead>
                    <tr>
                      <th>User Account</th>
                      <th>Account Role</th>
                      <th>Amount</th>
                      <th>Tx Type</th>
                      <th>Status</th>
                      <th>Description</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t._id}>
                        <td className="font-semibold">{t.userId?.name || 'N/A'}</td>
                        <td className="capitalize text-text-secondary">{t.userId?.role || 'N/A'}</td>
                        <td className={`font-bold ${t.amount > 0 ? 'text-emerald' : 'text-crimson'}`}>
                          {t.amount > 0 ? `+₹${t.amount}` : `-₹${Math.abs(t.amount)}`}
                        </td>
                        <td className="uppercase font-semibold text-xs">{t.type}</td>
                        <td>
                          <span className="badge badge-success">{t.status}</span>
                        </td>
                        <td>{t.description}</td>
                        <td>{new Date(t.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: REVIEWS MODERATION */}
          {activeTab === 'reviews' && (
            <div className="flex flex-col gap-4">
              <h1 className="font-heading font-extrabold text-2xl tracking-tight">Reviews & Ratings Moderation</h1>
              <div className="grid grid-cols-1 gap-4">
                {reviews.map(r => (
                  <div key={r._id} className="glass-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-text-primary">{r.client?.name || 'Deleted User'}</span>
                        <span className="text-text-muted">reviewed</span>
                        <span className="font-semibold text-gold">{r.astrologer?.name}</span>
                        <span className="badge badge-warning flex gap-1 items-center ml-2">⭐ {r.rating}</span>
                      </div>
                      <p className="text-text-secondary text-sm italic">"{r.comment || 'No comment provided'}"</p>
                      <span className="text-xs text-text-muted mt-2 block">{new Date(r.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => toggleReviewApproval(r._id, r.isApproved)} 
                        className={`btn btn-sm ${r.isApproved ? 'btn-secondary text-crimson' : 'btn-primary'}`}
                      >
                        {r.isApproved ? 'Block/Hide' : 'Approve'}
                      </button>
                      <button 
                        onClick={() => handleDeleteReview(r._id)} 
                        className="btn btn-danger btn-sm p-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {reviews.length === 0 && (
                  <div className="glass-card text-center p-8 text-text-muted flex flex-col items-center gap-2">
                    <MessageSquare size={36} opacity={0.3} />
                    <p>No reviews logged yet in system database.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODAL 4: CONSULTATION SESSION PLAYBACK MODAL */}
      {playbackSession && (
        <div className="modal-overlay">
          <div className="glass-card modal-content p-6 max-w-[550px] w-full flex flex-col gap-4 border-gold/30">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h3 className="font-heading font-bold text-lg text-gold">Consultation Playback</h3>
                <p className="text-text-secondary text-xs">
                  Session: {playbackSession.client?.name || 'Deleted Client'} &harr; {playbackSession.astrologer?.name}
                </p>
              </div>
              <button onClick={handleClosePlayback} className="btn btn-secondary btn-sm py-1 px-3">Close</button>
            </div>

            {loadingPlayback ? (
              <div className="text-center py-10 text-text-muted animate-pulse">Loading session details...</div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Audio Recording Player */}
                {playbackSession.recordingUrl ? (
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider block mb-2">Recorded Call Audio</span>
                    {playbackAudioUrl ? (
                      <AudioPlayer src={playbackAudioUrl} />
                    ) : (
                      <span className="text-xs text-text-muted">Loading audio file...</span>
                    )}
                  </div>
                ) : (
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-center text-xs text-text-muted">
                    No audio call recording available for this session.
                  </div>
                )}

                {/* Chat Transcript Panel */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider block">Chat Transcript</span>
                  {playbackSession.chatTranscriptAvailable ? (
                    <div className="h-[250px] overflow-y-auto bg-black/20 rounded-lg border border-white/5 p-3 flex flex-col gap-2">
                      {playbackTranscript.map((msg) => {
                        const isClient = msg.senderRole === 'client';
                        return (
                          <div
                            key={msg._id}
                            className={`flex flex-col max-w-[80%] ${isClient ? 'self-end items-end' : 'self-start items-start'}`}
                          >
                            <span className="text-[9px] text-text-muted mb-0.5 px-1 font-semibold">
                              {isClient 
                                ? (playbackSession.client?.name || 'Client') 
                                : (playbackSession.astrologer?.name || 'Astrologer')}
                            </span>
                            <div
                              className={`p-2 rounded-xl text-xs ${
                                isClient
                                  ? 'bg-primary text-white rounded-tr-none'
                                  : 'bg-white/10 text-text-primary rounded-tl-none border border-white/5'
                              }`}
                            >
                              {msg.message}
                            </div>
                            <span className="text-[8px] text-text-muted mt-0.5 px-1">
                              {new Date(msg.timestamp).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                      {playbackTranscript.length === 0 && (
                        <div className="text-center text-text-muted text-xs py-8">Transcript is empty.</div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-center text-xs text-text-muted">
                      No chat message logs available for this session.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
