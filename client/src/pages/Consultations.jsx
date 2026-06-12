import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import AudioPlayer from '../components/AudioPlayer';
import { 
  Search, Plus, Edit2, Trash2, Calendar, Award, Tag, 
  Clock, Play, FileAudio, FileText, X, CheckCircle, AlertTriangle 
} from 'lucide-react';

const Consultations = () => {
  const [consultations, setConsultations] = useState([]);
  const [clients, setClients] = useState([]);
  const [astrologers, setAstrologers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [clientSearch, setClientSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [astrologerFilter, setAstrologerFilter] = useState('');

  // Audio Playback
  const [activeAudioSrc, setActiveAudioSrc] = useState('');
  const [activeConsultationId, setActiveConsultationId] = useState('');

  // Modal control
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add');
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  // Form states
  const [clientId, setClientId] = useState('');
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

  const [searchParams, setSearchParams] = useSearchParams();

  const fetchConsultations = async (filters = {}) => {
    try {
      setLoading(true);
      let queryStr = [];
      if (filters.clientSearch) queryStr.push(`clientSearch=${encodeURIComponent(filters.clientSearch)}`);
      if (filters.startDate) queryStr.push(`startDate=${filters.startDate}`);
      if (filters.endDate) queryStr.push(`endDate=${filters.endDate}`);
      if (filters.tag) queryStr.push(`tag=${encodeURIComponent(filters.tag)}`);
      if (filters.astrologerId) queryStr.push(`astrologerId=${filters.astrologerId}`);

      const response = await API.get(`/consultations?${queryStr.join('&')}`);
      setConsultations(response.data);
    } catch (err) {
      setError('Failed to fetch consultations.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [clientsRes, astrologersRes] = await Promise.all([
        API.get('/clients'),
        API.get('/astrologers')
      ]);
      setClients(clientsRes.data);
      setAstrologers(astrologersRes.data);
      if (clientsRes.data.length > 0) setClientId(clientsRes.data[0]._id);
      if (astrologersRes.data.length > 0) setAstrologerId(astrologersRes.data[0]._id);
    } catch (err) {
      console.error('Error loading form options:', err);
    }
  };

  useEffect(() => {
    fetchConsultations();
    loadDependencies();

    if (searchParams.get('add') === 'true') {
      triggerAddModal();
      setSearchParams({});
    }
  }, [searchParams]);

  const handleApplyFilters = () => {
    fetchConsultations({
      clientSearch,
      startDate,
      endDate,
      tag: tagFilter,
      astrologerId: astrologerFilter
    });
  };

  const handleClearFilters = () => {
    setClientSearch('');
    setStartDate('');
    setEndDate('');
    setTagFilter('');
    setAstrologerFilter('');
    fetchConsultations();
  };

  const triggerAddModal = () => {
    setModalType('add');
    setSelectedConsultation(null);
    if (clients.length > 0) setClientId(clients[0]._id);
    if (astrologers.length > 0) setAstrologerId(astrologers[0]._id);
    setDate(new Date().toISOString().substring(0, 16));
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
    setClientId(consultation.client?._id || '');
    setAstrologerId(consultation.astrologer?._id || '');
    
    // Format date for datetime-local
    const rawDate = new Date(consultation.date);
    const tzOffset = rawDate.getTimezoneOffset() * 60000;
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

    const payload = new FormData();
    payload.append('client', clientId);
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
        const serverBase = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
        if (activeConsultationId === selectedConsultation._id) {
          setActiveAudioSrc(response.data.audioUrl ? `${serverBase}${response.data.audioUrl}` : '');
        }
      }
      setShowModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving consultation details.');
      console.error(err);
    } finally {
      setUploadProgress(false);
    }
  };

  const handleDeleteConsultation = async (consultId) => {
    if (window.confirm('Are you sure you want to delete this consultation log? The recording file will be permanently deleted.')) {
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

  const loadAudioPlayer = (consultation) => {
    const serverBase = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
    const url = `${serverBase}${consultation.audioUrl}`;
    setActiveAudioSrc(url);
    setActiveConsultationId(consultation._id);
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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '2.25rem', fontWeight: 800 }}>Consultation Logs</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Search, filter, and listen to recordings of previous consultation sessions</p>
          </div>
          {clients.length === 0 ? (
            <Link to="/clients?add=true" className="btn btn-primary">
              <Plus size={16} />
              <span>Create Client First</span>
            </Link>
          ) : (
            <button onClick={triggerAddModal} className="btn btn-primary">
              <Plus size={16} />
              <span>Add Consultation</span>
            </button>
          )}
        </div>

        {error && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {/* Filters Panel */}
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Filter & Search Recordings</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Client Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search client..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                style={{ height: '38px', fontSize: '0.875rem' }}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Astrologer</label>
              <select
                className="form-control"
                value={astrogerFilter}
                onChange={(e) => setAstrologerFilter(e.target.value)}
                style={{ height: '38px', fontSize: '0.875rem', background: 'rgba(15,23,42,0.4)' }}
              >
                <option value="" style={{ background: 'var(--bg-primary)' }}>All Astrologers</option>
                {astrologers.map(a => (
                  <option key={a._id} value={a._id} style={{ background: 'var(--bg-primary)' }}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Tag</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Career, Health"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                style={{ height: '38px', fontSize: '0.875rem' }}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ height: '38px', fontSize: '0.875rem' }}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>End Date</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ height: '38px', fontSize: '0.875rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button onClick={handleClearFilters} className="btn btn-secondary btn-sm" style={{ padding: '0.5rem 1rem' }}>
              Reset Filters
            </button>
            <button onClick={handleApplyFilters} className="btn btn-primary btn-sm" style={{ padding: '0.5rem 1.25rem' }}>
              Apply Filters
            </button>
          </div>
        </div>

        {/* Global Player Widget */}
        {activeAudioSrc && (
          <div className="glass-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent-gold)', background: 'rgba(15,23,42,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Playing consultation log for: <strong style={{ color: 'var(--text-primary)' }}>{consultations.find(c => c._id === activeConsultationId)?.client?.name}</strong> (Conducted by {consultations.find(c => c._id === activeConsultationId)?.astrologer?.name})
              </div>
              <button onClick={() => { setActiveAudioSrc(''); setActiveConsultationId(''); }} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem', background: 'none', border: 'none' }} title="Close Player">
                <X size={16} />
              </button>
            </div>
            <AudioPlayer src={activeAudioSrc} />
          </div>
        )}

        {/* Consultations Results */}
        {loading && consultations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
            Retrieving recordings index...
          </div>
        ) : consultations.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            <FileAudio size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <h3>No Consultations Logged</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Try refining your filters or upload a new recording.</p>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Client</th>
                    <th>Astrologer</th>
                    <th>Status</th>
                    <th>Tags</th>
                    <th>Recording</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.map((c) => (
                    <tr key={c._id}>
                      <td style={{ fontWeight: 600 }}>{formatDate(c.date)}</td>
                      <td>
                        <Link to={`/clients/${c.client?._id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 500 }} className="nav-link-hover">
                          {c.client?.name || 'Deleted Client'}
                        </Link>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          <Award size={14} color="var(--accent-gold)" />
                          {c.astrologer?.name}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${c.status === 'Completed' ? 'badge-success' : c.status === 'Scheduled' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap', maxWidth: '200px' }}>
                          {c.tags && c.tags.map(t => (
                            <span key={t} className="badge badge-primary" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>{t}</span>
                          ))}
                          {(!c.tags || c.tags.length === 0) && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                        </div>
                      </td>
                      <td>
                        {c.audioUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button 
                              onClick={() => loadAudioPlayer(c)} 
                              className={`btn ${activeConsultationId === c._id ? 'btn-primary' : 'btn-secondary'} btn-sm`} 
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <Play size={10} fill="white" />
                              <span>{formatDurationText(c.duration)}</span>
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <FileText size={12} />
                            No audio
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => triggerEditModal(c)} 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '0.4rem' }} 
                            title="Edit Details"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteConsultation(c._id)} 
                            className="btn btn-danger btn-sm" 
                            style={{ padding: '0.4rem' }} 
                            title="Delete Consultation"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Form */}
        {showModal && (
          <div className="modal-overlay">
            <div className="glass-card modal-content" style={{ maxWidth: '550px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>
                  {modalType === 'add' ? 'Log Consultation' : 'Edit Consultation Details'}
                </h2>
                <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem', background: 'none', border: 'none' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                  <label className="form-label">Client</label>
                  <select
                    className="form-control"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                    disabled={modalType === 'edit'}
                  >
                    {clients.map(client => (
                      <option key={client._id} value={client._id} style={{ background: 'var(--bg-primary)' }}>
                        {client.name} (Phone: {client.phone})
                      </option>
                    ))}
                  </select>
                </div>

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
                    placeholder="Enter discussion notes, birth chart analysis details, or advice..."
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

export default Consultations;
