import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import AudioPlayer from '../components/AudioPlayer';
import { 
  Calendar, Clock, MapPin, Phone, User, Award, Tag, 
  Plus, Edit2, Trash2, ChevronLeft, CalendarDays, CheckCircle, 
  AlertTriangle, Play, Pause, FileAudio, FileText, X 
} from 'lucide-react';

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [client, setClient] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [astrologers, setAstrologers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Audio Play State in Timeline
  const [activeAudioSrc, setActiveAudioSrc] = useState('');
  const [activeConsultationId, setActiveConsultationId] = useState('');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  // Form States for Consultation
  const [astrologerId, setAstrologerId] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState('Completed');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState([]);
  const [audioFile, setAudioFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  // Live Microphone Call Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState(null);
  const [recordingMethod, setRecordingMethod] = useState('upload'); // 'upload' or 'record'
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    return () => {
      if (recordingTimer) clearInterval(recordingTimer);
    };
  }, [recordingTimer]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [clientRes, consultationsRes, astrologersRes] = await Promise.all([
          API.get(`/clients/${id}`),
          API.get(`/consultations/client/${id}`),
          API.get('/astrologers')
        ]);
        setClient(clientRes.data);
        setConsultations(consultationsRes.data);
        setAstrologers(astrologersRes.data);
        if (astrologersRes.data.length > 0) {
          setAstrologerId(astrologersRes.data[0]._id);
        }
      } catch (err) {
        setError('Failed to retrieve client profile detail.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [id]);

  const triggerAddModal = () => {
    setModalType('add');
    setSelectedConsultation(null);
    if (astrologers.length > 0) {
      setAstrologerId(astrologers[0]._id);
    }
    setDate(new Date().toISOString().substring(0, 16)); // Current date/time YYYY-MM-DDTHH:MM
    setNotes('');
    setDuration(0);
    setStatus('Completed');
    setTags([]);
    setTagsInput('');
    setAudioFile(null);
    setShowModal(true);
  };

  const triggerEditModal = (consultation) => {
    setModalType('edit');
    setSelectedConsultation(consultation);
    setAstrologerId(consultation.astrologer?._id || '');
    // Format date for datetime-local (YYYY-MM-DDTHH:MM)
    const rawDate = new Date(consultation.date);
    const tzOffset = rawDate.getTimezoneOffset() * 60000; // in ms
    const localISOTime = (new Date(rawDate - tzOffset)).toISOString().substring(0, 16);
    setDate(localISOTime);
    setNotes(consultation.notes || '');
    setDuration(consultation.duration || 0);
    setStatus(consultation.status || 'Completed');
    setTags(consultation.tags || []);
    setTagsInput('');
    setAudioFile(null);
    setShowModal(true);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `live-call-recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setAudioFile(file);
        // Clean up tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      const timer = setInterval(() => {
        setRecordingSeconds(prev => {
          const next = prev + 1;
          setDuration(next);
          return next;
        });
      }, 1000);
      setRecordingTimer(timer);
    } catch (err) {
      alert('Could not access microphone: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      // Auto-extract audio duration
      const audioUrl = URL.createObjectURL(file);
      const audio = new Audio(audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        setDuration(Math.round(audio.duration));
      });
    }
  };

  const handleAddTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagsInput.trim()) {
      e.preventDefault();
      const cleaned = tagsInput.replace(/,/g, '').trim();
      if (cleaned && !tags.includes(cleaned)) {
        setTags([...tags, cleaned]);
      }
      setTagsInput('');
    }
  };

  const removeTag = (indexToRemove) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setUploadProgress(true);
    
    // Construct FormData for multipart/form-data upload
    const payload = new FormData();
    payload.append('client', id);
    payload.append('astrologer', astrologerId);
    payload.append('date', date);
    payload.append('notes', notes);
    payload.append('duration', duration);
    payload.append('status', status);
    payload.append('tags', JSON.stringify(tags));
    if (audioFile) {
      payload.append('audio', audioFile);
    }

    try {
      if (modalType === 'add') {
        const response = await API.post('/consultations', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setConsultations([response.data, ...consultations]);
      } else {
        const response = await API.put(`/consultations/${selectedConsultation._id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setConsultations(consultations.map(c => c._id === selectedConsultation._id ? response.data : c));
        // Reset player if active audio updated
        const serverBase = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
        if (activeConsultationId === selectedConsultation._id) {
          setActiveAudioSrc(response.data.audioUrl ? `${serverBase}${response.data.audioUrl}` : '');
        }
      }
      setShowModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Error processing consultation.');
      console.error(err);
    } finally {
      setUploadProgress(false);
    }
  };

  const handleDeleteConsultation = async (consultId) => {
    if (window.confirm('Are you sure you want to delete this consultation log? The recording file will be permanently removed.')) {
      try {
        await API.delete(`/consultations/${consultId}`);
        setConsultations(consultations.filter(c => c._id !== consultId));
        if (activeConsultationId === consultId) {
          setActiveAudioSrc('');
          setActiveConsultationId('');
        }
      } catch (err) {
        setError('Error deleting consultation.');
        console.error(err);
      }
    }
  };

  const playAudio = (consultation) => {
    const serverBase = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
    const url = `${serverBase}${consultation.audioUrl}`;
    setActiveAudioSrc(url);
    setActiveConsultationId(consultation._id);
  };

  const formatBirthDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDurationText = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')} min`;
  };

  if (loading) {
    return (
      <div className="app-container">
        <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '1rem' }}>
          <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--primary-glow)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading client chart data...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="app-container">
        <Navbar />
        <main className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h2>Profile Not Found</h2>
          <button onClick={() => navigate('/clients')} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            Back to Client Directory
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content">
        <button onClick={() => navigate('/clients')} className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem', display: 'inline-flex', gap: '0.25rem' }}>
          <ChevronLeft size={14} />
          <span>Back to Clients</span>
        </button>

        {error && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {/* Client details Card */}
        <div className="glass-card" style={{ marginBottom: '2.5rem', borderLeft: '4px solid var(--accent-gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="badge badge-primary" style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', borderColor: 'var(--accent-gold-glow)', background: 'var(--accent-gold-glow)', marginBottom: '0.5rem' }}>Client Profile</span>
              <h1 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.2 }}>{client.name}</h1>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Phone size={15} color="var(--text-muted)" />
                  {client.phone}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={15} color="var(--text-muted)" />
                  {client.birthPlace}
                </span>
              </div>
            </div>
            
            <div className="glass-card" style={{ padding: '0.8rem 1.2rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', minWidth: '220px' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Birth Charts Metadata</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <CalendarDays size={14} color="var(--accent-gold)" />
                  <span>{formatBirthDate(client.dob)}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <Clock size={14} color="var(--accent-gold)" />
                  <span>Time: <strong>{client.birthTime}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline vs Add consultation */}
        <div className="two-col-grid">
          
          {/* Left Side: Consultation Logs (Timeline) */}
          <div>
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={20} color="var(--primary)" />
                  <span>Consultation History</span>
                </h2>
                <button onClick={triggerAddModal} className="btn btn-primary btn-sm">
                  <Plus size={14} />
                  <span>Log Consultation</span>
                </button>
              </div>

              {consultations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                  <FileAudio size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                  <p>No consultations logged for this client yet.</p>
                  <button onClick={triggerAddModal} className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }}>
                    Record First Consultation
                  </button>
                </div>
              ) : (
                <div className="timeline">
                  {consultations.map((c) => (
                    <div key={c._id} className="timeline-item">
                      <div className="timeline-dot" style={{
                        background: c.status === 'Completed' ? 'var(--accent-emerald)' : c.status === 'Scheduled' ? 'var(--accent-gold)' : 'var(--accent-crimson)',
                        boxShadow: c.status === 'Completed' ? '0 0 8px var(--accent-emerald)' : c.status === 'Scheduled' ? '0 0 8px var(--accent-gold)' : '0 0 8px var(--accent-crimson)'
                      }} />
                      
                      <div className="glass-card" style={{ padding: '1.25rem', background: activeConsultationId === c._id ? 'rgba(139, 92, 246, 0.05)' : 'rgba(15, 23, 42, 0.35)', border: activeConsultationId === c._id ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <div>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                {new Date(c.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className={`badge ${c.status === 'Completed' ? 'badge-success' : c.status === 'Scheduled' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                                {c.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                              <Award size={13} color="var(--accent-gold)" />
                              <span>Conducted by {c.astrologer?.name}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button onClick={() => triggerEditModal(c)} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem' }} title="Edit log">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => handleDeleteConsultation(c._id)} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem', color: 'var(--accent-crimson)' }} title="Delete log">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {c.notes && (
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineBreak: 'anywhere', whiteSpace: 'pre-line', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.75rem', borderLeft: '2px solid var(--primary-glow)' }}>
                            {c.notes}
                          </p>
                        )}

                        {c.tags && c.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                            <Tag size={12} style={{ color: 'var(--text-muted)', alignSelf: 'center' }} />
                            {c.tags.map(t => (
                              <span key={t} className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{t}</span>
                            ))}
                          </div>
                        )}

                        {/* Audio attachment display */}
                        {c.audioUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.1)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <FileAudio size={16} color="var(--primary-hover)" />
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Audio Attachment ({formatDurationText(c.duration)})</span>
                            </div>
                            {activeConsultationId === c._id ? (
                              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Active Player</span>
                            ) : (
                              <button onClick={() => playAudio(c)} className="btn btn-primary btn-sm" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                                <Play size={10} fill="white" />
                                <span>Load Audio</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <FileText size={14} />
                            <span>No recording attached</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Persistent Media Player */}
          <div>
            <div className="glass-card" style={{ position: 'sticky', top: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileAudio size={18} color="var(--accent-gold)" />
                <span>Active Recording Feed</span>
              </h3>
              
              {activeAudioSrc ? (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Playing log from: <strong>{new Date(consultations.find(c => c._id === activeConsultationId)?.date).toLocaleDateString()}</strong>
                  </p>
                  <AudioPlayer src={activeAudioSrc} />
                  <button onClick={() => { setActiveAudioSrc(''); setActiveConsultationId(''); }} className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '0.75rem', color: 'var(--accent-crimson)' }}>
                    Unload Player
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', border: '1px dashed var(--glass-border)', borderRadius: '10px' }}>
                  <FileAudio size={32} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.85rem' }}>No recording selected.<br />Click "Load Audio" on any consultation timeline log above to inspect playback details.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Form for Consultation */}
        {showModal && (
          <div className="modal-overlay">
            <div className="glass-card modal-content" style={{ maxWidth: '550px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>
                  {modalType === 'add' ? 'Log Consultation Recording' : 'Edit Consultation Details'}
                </h2>
                <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem', background: 'none', border: 'none' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                  <label className="form-label">Astrologer</label>
                  <select
                    className="form-control"
                    value={astrologerId}
                    onChange={(e) => setAstrologerId(e.target.value)}
                    required
                  >
                    {astrologers.map(astro => (
                      <option key={astro._id} value={astro._id} style={{ background: 'var(--bg-primary)' }}>
                        {astro.name} ({astro.specialization})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Consultation Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Completed" style={{ background: 'var(--bg-primary)' }}>Completed</option>
                    <option value="Scheduled" style={{ background: 'var(--bg-primary)' }}>Scheduled</option>
                    <option value="Cancelled" style={{ background: 'var(--bg-primary)' }}>Cancelled</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Astrological Remedies</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Enter discussion notes, specific placements analyzed, or remedy details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tags (Type and press Enter or Comma)</label>
                  <div className="tags-input-container">
                    {tags.map((tag, index) => (
                      <span key={index} className="tag-badge">
                        <span>{tag}</span>
                        <button type="button" onClick={() => removeTag(index)}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      className="tag-input-field"
                      placeholder="e.g., Horary, Career, Remedial"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      onKeyDown={handleAddTag}
                    />
                  </div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Press Enter or enter a comma to seal a tag.
                  </small>
                </div>

                <div className="form-group" style={{ padding: '1.25rem', border: '1px dashed var(--glass-border)', borderRadius: '10px', background: 'rgba(255,255,255,0.01)' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    <FileAudio size={16} color="var(--primary)" />
                    <span>Consultation Recording attachment</span>
                  </label>

                  {/* Method tabs selector */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn ${recordingMethod === 'upload' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      onClick={() => { setRecordingMethod('upload'); setAudioFile(null); }}
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                      disabled={isRecording}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      className={`btn ${recordingMethod === 'record' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      onClick={() => { setRecordingMethod('record'); setAudioFile(null); }}
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                      disabled={isRecording}
                    >
                      Record Live Call (Microphone)
                    </button>
                  </div>

                  {/* Upload file method */}
                  {recordingMethod === 'upload' && (
                    <div>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleFileChange}
                        style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', width: '100%', cursor: 'pointer' }}
                      />
                      {duration > 0 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', marginTop: '0.5rem', fontWeight: 500 }}>
                          ✓ Auto-measured duration: {Math.floor(duration / 60)} minutes {duration % 60} seconds
                        </div>
                      )}
                    </div>
                  )}

                  {/* Record live audio method */}
                  {recordingMethod === 'record' && (
                    <div style={{ textAlign: 'center', padding: '0.75rem 0' }}>
                      {isRecording ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="animate-pulse" style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-crimson)', display: 'inline-block' }} />
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-crimson)' }}>Recording Call...</span>
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                          </div>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={stopRecording}
                            style={{ padding: '0.4rem 1rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}
                          >
                            Stop & Save Recording
                          </button>
                        </div>
                      ) : audioFile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600 }}>
                            ✓ Live recording saved ({Math.floor(duration / 60)}m {duration % 60}s)
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={startRecording}
                            style={{ padding: '0.3rem 0.65rem' }}
                          >
                            Re-record Live Call
                          </button>
                        </div>
                      ) : (
                        <div>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={startRecording}
                            style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--accent-crimson)', padding: '0.5rem 1.25rem' }}
                          >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-crimson)' }} />
                            <span>Start Recording Live Call</span>
                          </button>
                          <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                            Uses browser microphone. Grant mic permissions if prompted.
                          </small>
                        </div>
                      )}
                    </div>
                  )}

                  {modalType === 'edit' && selectedConsultation?.audioUrl && !audioFile && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Leave blank to retain existing file: <code>{selectedConsultation.audioUrl.split('/').pop()}</code>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" disabled={uploadProgress}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={uploadProgress}>
                    {uploadProgress ? 'Uploading...' : modalType === 'add' ? 'Log Consultation' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ClientDetail;
