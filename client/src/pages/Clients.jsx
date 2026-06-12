import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import { Search, Plus, Edit2, Trash2, Eye, Calendar, Clock, MapPin, Phone, User, X } from 'lucide-react';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
  const [selectedClient, setSelectedClient] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    dob: '',
    birthTime: '',
    birthPlace: ''
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Load clients
  const fetchClients = async (searchVal = '') => {
    try {
      setLoading(true);
      const response = await API.get(`/clients?search=${searchVal}`);
      setClients(response.data);
    } catch (err) {
      setError('Failed to fetch clients.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    
    // Check if URL has ?add=true query to trigger modal automatically
    if (searchParams.get('add') === 'true') {
      triggerAddModal();
      // Remove query param to avoid re-triggering on refresh
      setSearchParams({});
    }
  }, [searchParams]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchClients(val);
  };

  const triggerAddModal = () => {
    setModalType('add');
    setFormData({
      name: '',
      phone: '',
      dob: '',
      birthTime: '',
      birthPlace: ''
    });
    setSelectedClient(null);
    setShowModal(true);
  };

  const triggerEditModal = (client) => {
    setModalType('edit');
    setSelectedClient(client);
    // Format DOB to YYYY-MM-DD for date input
    const formattedDob = new Date(client.dob).toISOString().split('T')[0];
    setFormData({
      name: client.name,
      phone: client.phone,
      dob: formattedDob,
      birthTime: client.birthTime,
      birthPlace: client.birthPlace
    });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'add') {
        const response = await API.post('/clients', formData);
        setClients([...clients, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const response = await API.put(`/clients/${selectedClient._id}`, formData);
        setClients(clients.map(c => c._id === selectedClient._id ? response.data : c).sort((a, b) => a.name.localeCompare(b.name)));
      }
      setShowModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving client.');
      console.error(err);
    }
  };

  const handleDeleteClient = async (id, name) => {
    const confirmDelete = window.confirm(
      `WARNING: Are you sure you want to delete ${name}?\n\nThis will also cascade delete all consultation logs and recordings linked to this client. This action cannot be undone.`
    );
    if (confirmDelete) {
      try {
        await API.delete(`/clients/${id}`);
        setClients(clients.filter(c => c._id !== id));
      } catch (err) {
        setError('Error deleting client.');
        console.error(err);
      }
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '2.25rem', fontWeight: 800 }}>Client Manager</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Add, inspect, and update client profile and birth charts</p>
          </div>
          <button onClick={triggerAddModal} className="btn btn-primary">
            <Plus size={16} />
            <span>Add Client</span>
          </button>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="glass-card" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search clients by name..."
              value={search}
              onChange={handleSearchChange}
              style={{ paddingLeft: '36px', height: '40px' }}
            />
          </div>
        </div>

        {/* Client List */}
        {loading && clients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
            Loading clients list...
          </div>
        ) : clients.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            <User size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <h3>No Clients Found</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Start by adding a new client to manage their consultation logs.</p>
            <button onClick={triggerAddModal} className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
              Create Client Profile
            </button>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Date of Birth</th>
                    <th>Birth Time</th>
                    <th>Birth Place</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client._id}>
                      <td style={{ fontWeight: 600 }}>
                        <span 
                          onClick={() => navigate(`/clients/${client._id}`)} 
                          style={{ cursor: 'pointer', color: 'var(--text-primary)', transition: 'var(--transition-smooth)' }} 
                          className="nav-link-hover"
                        >
                          {client.name}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          <Phone size={14} color="var(--text-muted)" />
                          {client.phone}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          <Calendar size={14} color="var(--text-muted)" />
                          {formatDate(client.dob)}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          <Clock size={14} color="var(--text-muted)" />
                          {client.birthTime}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          <MapPin size={14} color="var(--text-muted)" />
                          {client.birthPlace}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => navigate(`/clients/${client._id}`)} 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '0.4rem' }} 
                            title="View Chart & Consultations"
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            onClick={() => triggerEditModal(client)} 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '0.4rem' }} 
                            title="Edit Details"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClient(client._id, client.name)} 
                            className="btn btn-danger btn-sm" 
                            style={{ padding: '0.4rem' }} 
                            title="Delete Client"
                          >
                            <Trash2 size={14} />
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
            <div className="glass-card modal-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>
                  {modalType === 'add' ? 'Register New Client' : `Edit client: ${selectedClient?.name}`}
                </h2>
                <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem', background: 'none', border: 'none' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                  <label className="form-label">Client Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-control"
                    placeholder="e.g., +1 234 567 8900"
                    value={formData.phone}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    className="form-control"
                    value={formData.dob}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Birth Time (Local)</label>
                  <input
                    type="time"
                    name="birthTime"
                    className="form-control"
                    value={formData.birthTime}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Birth Place</label>
                  <input
                    type="text"
                    name="birthPlace"
                    className="form-control"
                    placeholder="City, Country"
                    value={formData.birthPlace}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {modalType === 'add' ? 'Add Client' : 'Save Changes'}
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

export default Clients;
