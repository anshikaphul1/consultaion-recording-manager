import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AppContext } from '../context/AppContext';
import AudioPlayer from '../components/AudioPlayer';
import { 
  Compass, Power, Clock, DollarSign, List, Edit, PhoneCall, 
  CheckCircle, XCircle, Play, Sparkles, User, Award, MessageSquare, Send, Eye 
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AstrologerDashboard = () => {
  const { 
    user, logout, socket, activeCall, chatMessages, acceptIncomingCall, rejectIncomingCall, endActiveCall, sendChatMessage 
  } = useContext(AppContext);

  const [activeTab, setActiveTab] = useState('home');
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [isOnlineState, setIsOnlineState] = useState(false);

  // Profile Form States
  const [profileFormData, setProfileFormData] = useState({
    name: '',
    specialization: '',
    specialties: '',
    languages: '',
    ratePerMin: 10,
    experience: 0,
    bio: '',
    photoUrl: ''
  });

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  // Live Chat States inside Active Call
  const [liveMsgText, setLiveMsgText] = useState('');
  const chatEndRef = useRef(null);

  // Playback Modal States
  const [playbackSession, setPlaybackSession] = useState(null);
  const [playbackTranscript, setPlaybackTranscript] = useState([]);
  const [playbackAudioUrl, setPlaybackAudioUrl] = useState(null);
  const [loadingPlayback, setLoadingPlayback] = useState(false);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

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

  const handleSendLiveMessage = (e) => {
    e.preventDefault();
    if (!liveMsgText.trim()) return;
    sendChatMessage(liveMsgText.trim());
    setLiveMsgText('');
  };


  useEffect(() => {
    fetchAstroProfile();
    fetchAstroSessions();
    fetchAstroEarnings();
  }, []);

  const fetchAstroProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE}/astrologers/${user.astrologerRef}`, { headers });
      setProfile(res.data);
      setIsOnlineState(res.data.isOnline);
      setProfileFormData({
        name: res.data.name || '',
        specialization: res.data.specialization || '',
        specialties: res.data.specialties?.join(', ') || '',
        languages: res.data.languages?.join(', ') || '',
        ratePerMin: res.data.ratePerMin || 10,
        experience: res.data.experience || 0,
        bio: res.data.bio || '',
        photoUrl: res.data.photoUrl || ''
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAstroSessions = async () => {
    try {
      // Find sessions where astrologer is this user's profile
      const res = await axios.get(`${API_BASE}/consultations?astrologerId=${user.astrologerRef}`, { headers });
      setSessions(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAstroEarnings = async () => {
    try {
      // Aggregate earnings on backend (or compute locally)
      const res = await axios.get(`${API_BASE}/wallet`, { headers });
      setEarnings(res.data.balance || 0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusToggle = () => {
    if (!socket || !profile) return;
    const nextStatus = !isOnlineState;
    setIsOnlineState(nextStatus);
    socket.emit('astrologer-status-change', {
      astrologerId: profile._id,
      status: nextStatus ? 'online' : 'offline'
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...profileFormData,
      specialties: profileFormData.specialties.split(',').map(s => s.trim()).filter(Boolean),
      languages: profileFormData.languages.split(',').map(l => l.trim()).filter(Boolean),
      ratePerMin: Number(profileFormData.ratePerMin),
      experience: Number(profileFormData.experience)
    };

    try {
      await axios.put(`${API_BASE}/astrologers/${user.astrologerRef}`, payload, { headers });
      alert('Profile details updated successfully!');
      fetchAstroProfile();
    } catch (e) {
      alert('Failed to update profile.');
    }
  };

  const triggerPayoutRequest = () => {
    alert('Payout request submitted successfully. Funds will transfer in 3-5 business days.');
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-bg-secondary text-text-primary font-sans antialiased pb-10">
      
      {/* Navbar */}
      <nav className="glass-card mx-6 my-4 p-4 flex justify-between items-center rounded-2xl border-none">
        <div className="flex items-center gap-2">
          <Compass className="text-gold animate-spin-slow" size={28} />
          <span className="font-heading font-extrabold text-xl tracking-tight gold-gradient-text">AstroChronicle Astrologer Hub</span>
        </div>
        
        {/* Toggle online and log out */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary">Availability:</span>
            <button 
              onClick={handleStatusToggle} 
              className={`p-1.5 px-3 rounded-full text-[10px] font-bold tracking-wider transition ${isOnlineState ? 'bg-emerald/20 text-emerald border border-emerald/30' : 'bg-crimson/20 text-crimson border border-crimson/30'}`}
            >
              {isOnlineState ? 'ONLINE' : 'OFFLINE'}
            </button>
          </div>
          <button onClick={logout} className="btn btn-secondary btn-sm text-crimson hover:bg-crimson/10">Log Out</button>
        </div>
      </nav>

      {/* Tabs */}
      <div className="max-w-[1280px] mx-auto px-6 mb-6 flex gap-2">
        <button onClick={() => setActiveTab('home')} className={`p-2 px-4 rounded-full text-xs font-bold transition ${activeTab === 'home' ? 'bg-primary text-white' : 'bg-white/5 hover:bg-white/10 text-text-secondary'}`}>My Dashboard</button>
        <button onClick={() => setActiveTab('earnings')} className={`p-2 px-4 rounded-full text-xs font-bold transition ${activeTab === 'earnings' ? 'bg-primary text-white' : 'bg-white/5 hover:bg-white/10 text-text-secondary'}`}>Earnings</button>
        <button onClick={() => setActiveTab('history')} className={`p-2 px-4 rounded-full text-xs font-bold transition ${activeTab === 'history' ? 'bg-primary text-white' : 'bg-white/5 hover:bg-white/10 text-text-secondary'}`}>Consultation Log</button>
        <button onClick={() => setActiveTab('profile')} className={`p-2 px-4 rounded-full text-xs font-bold transition ${activeTab === 'profile' ? 'bg-primary text-white' : 'bg-white/5 hover:bg-white/10 text-text-secondary'}`}>Edit Profile</button>
      </div>

      <div className="max-w-[1280px] mx-auto px-6">
        
        {/* TAB: HOME / MY PROFILE SUMMARY */}
        {activeTab === 'home' && profile && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left - Profile Detail Widget */}
            <div className="glass-card flex flex-col items-center text-center gap-4">
              <img src={profile.photoUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop'} alt="" className="w-24 h-24 rounded-full border-2 border-primary object-cover shadow-lg" />
              <div>
                <h2 className="font-heading font-extrabold text-xl">{profile.name}</h2>
                <div className="text-gold font-semibold text-sm">{profile.specialization}</div>
                <div className="text-xs text-text-muted mt-1">{profile.experience || 0} Years Experience</div>
              </div>

              <div className="w-full flex justify-around border-t border-b border-white/5 py-3 mt-2">
                <div>
                  <span className="text-[10px] text-text-secondary block font-bold uppercase">Rate Fee</span>
                  <span className="text-lg font-extrabold text-emerald">₹{profile.ratePerMin}/m</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary block font-bold uppercase">Rating</span>
                  <span className="text-lg font-extrabold text-gold">⭐ {profile.rating}</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 w-full mt-2">
                <div className="text-xs font-semibold text-text-secondary text-left mb-1">Languages:</div>
                <div className="flex gap-1 flex-wrap">
                  {profile.languages?.map(l => <span key={l} className="badge badge-primary text-[10px]">{l}</span>)}
                </div>
              </div>
            </div>

            {/* Right - General Quick Summary & Recent Reviews */}
            <div className="md:col-span-2 flex flex-col gap-6">
              
              {/* Quick Status Bar */}
              <div className={`glass-card border-none flex justify-between items-center ${isOnlineState ? 'bg-emerald/5 border border-emerald/20' : 'bg-white/5'}`}>
                <div>
                  <h3 className="font-heading font-bold text-base">Current Console State</h3>
                  <p className="text-text-secondary text-xs mt-0.5">Toggle availability switch to accept new client consultation incoming calls.</p>
                </div>
                <button 
                  onClick={handleStatusToggle} 
                  className={`btn ${isOnlineState ? 'btn-primary' : 'btn-secondary'} btn-sm flex items-center gap-1.5`}
                >
                  <Power size={14} />
                  <span>{isOnlineState ? 'Go Offline' : 'Go Online'}</span>
                </button>
              </div>

              {/* Quick statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card flex items-center gap-4">
                  <div className="stat-icon text-emerald bg-emerald/10"><DollarSign size={20} /></div>
                  <div>
                    <div className="stat-value">₹{earnings}</div>
                    <div className="stat-label">Total Earnings</div>
                  </div>
                </div>
                <div className="glass-card flex items-center gap-4">
                  <div className="stat-icon"><List size={20} /></div>
                  <div>
                    <div className="stat-value">{sessions.length}</div>
                    <div className="stat-label">Sessions Conducted</div>
                  </div>
                </div>
              </div>
              
              {/* Recent review list */}
              <div className="glass-card flex flex-col gap-4">
                <h3 className="font-heading font-bold text-lg border-b border-white/5 pb-2">Recent Client Reviews</h3>
                <AstroReviewsSection astroId={profile._id} />
              </div>
            </div>
          </div>
        )}

        {/* TAB: ASTROLOGER EARNINGS */}
        {activeTab === 'earnings' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Payout Widget */}
            <div className="glass-card flex flex-col gap-4 self-start">
              <h3 className="font-heading font-bold text-lg">My Earnings Wallet</h3>
              <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                <span className="text-xs text-text-secondary uppercase font-bold block mb-1">Total Earnings</span>
                <span className="text-3xl font-heading font-extrabold text-emerald">₹{earnings}</span>
              </div>
              <button onClick={triggerPayoutRequest} className="btn btn-primary w-full mt-2">Request Payout</button>
            </div>

            {/* Earnings breakdown list */}
            <div className="md:col-span-2 glass-card flex flex-col gap-4">
              <h3 className="font-heading font-bold text-lg">Earnings Breakdown</h3>
              <div className="table-container">
                <table className="custom-table w-full text-xs">
                  <thead>
                    <tr>
                      <th>Session ID</th>
                      <th>Client</th>
                      <th>Date</th>
                      <th>Duration</th>
                      <th>My Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s._id}>
                        <td className="text-text-muted font-mono">{s._id}</td>
                        <td className="font-semibold">{s.client?.name || 'Vedic Client'}</td>
                        <td>{new Date(s.date).toLocaleDateString()}</td>
                        <td>{formatDuration(s.duration)}</td>
                        <td className="text-emerald font-bold">+₹{s.amount}</td>
                      </tr>
                    ))}
                    {sessions.length === 0 && (
                      <tr><td colSpan="5" className="text-center p-4 text-text-muted">No session earnings generated yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SESSIONS HISTORY LOGS */}
        {activeTab === 'history' && (
          <div className="glass-card flex flex-col gap-4">
            <h1 className="font-heading font-extrabold text-2xl tracking-tight">Consultation Log</h1>
            <div className="table-container">
              <table className="custom-table w-full">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Date & Time</th>
                    <th>Duration</th>
                    <th>Amount Earned</th>
                    <th>Recording & Transcript</th>
                    <th>Consultation Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s._id}>
                      <td className="font-semibold">{s.client?.name || 'Deleted Client'}</td>
                      <td>{new Date(s.date).toLocaleString()}</td>
                      <td>{formatDuration(s.duration)}</td>
                      <td className="text-emerald font-bold">+₹{s.amount}</td>
                      <td>
                        {(s.recordingUrl || s.chatTranscriptAvailable) ? (
                          <button 
                            onClick={() => handleOpenPlayback(s)}
                            className="btn btn-secondary btn-sm flex items-center gap-1.5 py-1 text-xs text-primary-hover border-primary/20 bg-primary/5 hover:bg-primary/10"
                          >
                            <Eye size={12} /> Playback
                          </button>
                        ) : (
                          <span className="text-text-muted text-[11px] italic">Not available</span>
                        )}
                      </td>
                      <td className="text-text-secondary max-w-[200px] truncate" title={s.notes}>{s.notes}</td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr><td colSpan="6" className="text-center p-8 text-text-muted">No consultations conducted yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: EDIT PROFILE */}
        {activeTab === 'profile' && (
          <div className="glass-card max-w-[600px] mx-auto">
            <h1 className="font-heading font-extrabold text-2xl tracking-tight mb-4">Edit Profile details</h1>
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control" required value={profileFormData.name} onChange={e => setProfileFormData({...profileFormData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Core Speciality</label>
                <input type="text" className="form-control" required value={profileFormData.specialization} onChange={e => setProfileFormData({...profileFormData, specialization: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">All Specialties (comma separated)</label>
                <input type="text" className="form-control" placeholder="e.g. Tarot, Vedic, Palmistry" value={profileFormData.specialties} onChange={e => setProfileFormData({...profileFormData, specialties: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Languages (comma separated)</label>
                <input type="text" className="form-control" placeholder="e.g. English, Hindi, Punjabi" value={profileFormData.languages} onChange={e => setProfileFormData({...profileFormData, languages: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Rate Fee (₹/minute)</label>
                <input type="number" className="form-control" required value={profileFormData.ratePerMin} onChange={e => setProfileFormData({...profileFormData, ratePerMin: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Experience (Years)</label>
                <input type="number" className="form-control" value={profileFormData.experience} onChange={e => setProfileFormData({...profileFormData, experience: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Profile Photo URL</label>
                <input type="text" className="form-control" value={profileFormData.photoUrl} onChange={e => setProfileFormData({...profileFormData, photoUrl: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Bio Description</label>
                <textarea rows={4} className="form-control" value={profileFormData.bio} onChange={e => setProfileFormData({...profileFormData, bio: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary w-full mt-2">Save Profile Updates</button>
            </form>
          </div>
        )}

      </div>

      {/* OVERLAY DIALOGS: SOCKET INCOMING CALL POPUP */}
      {activeCall.status === 'incoming' && (
        <div className="modal-overlay">
          <div className="glass-card modal-content p-8 max-w-[380px] text-center flex flex-col items-center gap-6 border-emerald/40 shadow-emerald/10">
            
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-emerald/20 blur-xl animate-pulse"></div>
              <div className="w-24 h-24 rounded-full border-4 border-emerald/40 flex items-center justify-center shadow-lg overflow-hidden relative z-10 animate-bounce">
                <PhoneCall className="text-emerald" size={36} />
              </div>
            </div>

            <div>
              <h3 className="font-heading font-extrabold text-xl text-emerald">{activeCall.partner?.name}</h3>
              <p className="text-text-secondary text-xs mt-1">Incoming Consultation Call Request...</p>
            </div>

            <div className="flex gap-4 w-full mt-2">
              <button 
                onClick={rejectIncomingCall} 
                className="btn btn-secondary flex-1 border-crimson/20 text-crimson hover:bg-crimson/10 font-bold"
              >
                Decline
              </button>
              <button 
                onClick={acceptIncomingCall} 
                className="btn btn-primary flex-1 bg-emerald border-emerald hover:bg-emerald/80 font-bold"
              >
                Accept
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* OVERLAY DIALOGS: LIVE CALL ACTIVE SCREEN */}
      {activeCall.status === 'connected' && activeCall.role === 'astrologer' && (
        <div className="modal-overlay">
          <div className="glass-card modal-content p-6 max-w-[700px] w-full flex flex-col md:flex-row gap-6 border-gold/40 shadow-gold/10">
            {/* Left Column: Session Info */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center border-b md:border-b-0 md:border-r border-white/5 pb-6 md:pb-0 md:pr-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse"></div>
                <div className="w-20 h-20 rounded-full border-4 border-gold/40 flex items-center justify-center shadow-lg overflow-hidden relative z-10 animate-spin-slow">
                  <Compass className="text-gold" size={28} />
                </div>
              </div>

              <div>
                <h3 className="font-heading font-extrabold text-xl text-gold">{activeCall.partner?.name}</h3>
                <p className="text-text-secondary text-xs mt-1">Live Astrological Consultation Active</p>
              </div>

              <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col gap-1 w-full max-w-[220px]">
                <span className="text-text-secondary text-[10px] uppercase font-bold tracking-wider">Call Duration Elapsed</span>
                <span className="text-2xl font-bold font-mono text-emerald">
                  {Math.floor(activeCall.timer / 60).toString().padStart(2, '0')}:
                  {(activeCall.timer % 60).toString().padStart(2, '0')}
                </span>
              </div>
              
              <div className="text-xs text-text-muted flex justify-between w-full max-w-[220px] px-1">
                <span>Earning: ₹{profile?.ratePerMin}/min</span>
                <span className="text-emerald font-bold animate-pulse">Session Live</span>
              </div>

              <button onClick={endActiveCall} className="btn btn-danger w-full max-w-[220px] mt-2">End Session</button>
            </div>

            {/* Right Column: Live Chat Panel */}
            <div className="flex-1 flex flex-col h-[400px] bg-black/20 rounded-xl border border-white/5 p-3 overflow-hidden">
              <div className="text-xs font-bold text-gold border-b border-white/5 pb-2 mb-2 uppercase tracking-wider">
                Live Conversation Chat
              </div>
              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 mb-3">
                {chatMessages.map((msg) => {
                  const isMe = msg.senderRole === 'astrologer';
                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                      <div
                        className={`p-2.5 rounded-2xl text-xs font-medium leading-relaxed ${
                          isMe
                            ? 'bg-primary text-white rounded-tr-none'
                            : 'bg-white/10 text-text-primary rounded-tl-none border border-white/5'
                        }`}
                      >
                        {msg.message}
                      </div>
                      <span className="text-[9px] text-text-muted mt-0.5 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              {/* Message Input form */}
              <form onSubmit={handleSendLiveMessage} className="flex gap-2 border-t border-white/5 pt-2">
                <input
                  type="text"
                  placeholder="Type message here..."
                  className="form-control text-xs flex-1 bg-white/5 border-white/10 text-white rounded-lg focus:border-primary px-3 py-2"
                  value={liveMsgText}
                  onChange={(e) => setLiveMsgText(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm p-2 rounded-lg flex items-center justify-center shrink-0">
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONSULTATION SESSION PLAYBACK MODAL */}
      {playbackSession && (
        <div className="modal-overlay">
          <div className="glass-card modal-content p-6 max-w-[550px] w-full flex flex-col gap-4 border-gold/30">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h3 className="font-heading font-bold text-lg text-gold">Consultation Playback</h3>
                <p className="text-text-secondary text-xs">Session with {playbackSession.client?.name}</p>
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
                        const isAstro = msg.senderRole === 'astrologer';
                        return (
                          <div
                            key={msg._id}
                            className={`flex flex-col max-w-[80%] ${isAstro ? 'self-end items-end' : 'self-start items-start'}`}
                          >
                            <span className="text-[9px] text-text-muted mb-0.5 px-1 font-semibold">
                              {isAstro ? 'You' : (playbackSession.client?.name || 'Client')}
                            </span>
                            <div
                              className={`p-2 rounded-xl text-xs ${
                                isAstro
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

// Reviews helper subcomponent
const AstroReviewsSection = ({ astroId }) => {
  const [reviews, setReviews] = useState([]);
  
  useEffect(() => {
    const fetchAstroReviews = async () => {
      try {
        const res = await axios.get(`${API_BASE}/reviews/astrologer/${astroId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
        });
        setReviews(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchAstroReviews();
  }, [astroId]);

  return (
    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2">
      {reviews.map(r => (
        <div key={r._id} className="bg-white/5 p-3 rounded-lg border border-white/5 text-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-text-primary">{r.client?.name || 'Vedic Client'}</span>
            <span className="text-gold flex gap-1 items-center font-bold text-xs">⭐ {r.rating}</span>
          </div>
          <p className="text-text-secondary text-xs italic">"{r.comment}"</p>
          <span className="text-[10px] text-text-muted block mt-1">{new Date(r.createdAt).toLocaleDateString()}</span>
        </div>
      ))}
      {reviews.length === 0 && (
        <p className="text-text-muted text-xs text-center py-4">No reviews submitted yet for this astrologer.</p>
      )}
    </div>
  );
};

export default AstrologerDashboard;
