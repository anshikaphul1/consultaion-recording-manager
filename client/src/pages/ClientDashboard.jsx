import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AppContext } from '../context/AppContext';
import { 
  Compass, CreditCard, Clock, Phone, MapPin, Calendar, 
  User, CheckCircle, RefreshCw, Star, MessageSquare, PhoneCall, AlertTriangle, Eye 
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const ClientDashboard = () => {
  const { 
    user, logout, walletBalance, fetchWalletBalance, rechargeWallet, 
    activeCall, initiateCall, endActiveCall 
  } = useContext(AppContext);

  const [activeTab, setActiveTab] = useState('home');
  const [astrologers, setAstrologers] = useState([]);
  const [selectedAstro, setSelectedAstro] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Rating states
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAstroId, setReviewAstroId] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Wallet Recharge States
  const [rechargeAmt, setRechargeAmt] = useState(200);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  
  // Profile Editor States
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    dob: '',
    birthTime: '',
    birthPlace: '',
    gender: 'Male'
  });

  // Filter States
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState(100);

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchAstrologers();
    fetchClientProfile();
    fetchConsultations();
    fetchTransactions();
  }, []);

  const fetchAstrologers = async () => {
    try {
      let url = `${API_BASE}/astrologers?`;
      if (specialtyFilter) url += `specialty=${specialtyFilter}&`;
      if (languageFilter) url += `language=${languageFilter}&`;
      if (maxPrice) url += `priceMax=${maxPrice}&`;
      const res = await axios.get(url, { headers });
      setAstrologers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClientProfile = async () => {
    try {
      const dashboardRes = await axios.get(`${API_BASE}/dashboard`, { headers });
      const profile = dashboardRes.data.client || {};
      setClientInfo(profile);
      setProfileData({
        name: profile.name || user.name,
        phone: profile.phone || '',
        dob: profile.dob ? profile.dob.substring(0, 10) : '',
        birthTime: profile.birthTime || '',
        birthPlace: profile.birthPlace || '',
        gender: profile.gender || 'Male'
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchConsultations = async () => {
    try {
      const dashboardRes = await axios.get(`${API_BASE}/dashboard`, { headers });
      setConsultations(dashboardRes.data.consultations || []);
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

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE}/clients/${clientInfo._id}`, profileData, { headers });
      alert('Profile details updated successfully!');
      fetchClientProfile();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update profile.');
    }
  };

  const handleRechargeSubmit = async (e) => {
    e.preventDefault();
    try {
      await rechargeWallet(rechargeAmt);
      setRechargeModalOpen(false);
      fetchTransactions();
      alert(`Wallet recharged successfully with ₹${rechargeAmt}!`);
    } catch (e) {
      alert('Mock payment failed.');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/reviews`, {
        astrologer: reviewAstroId,
        rating: reviewRating,
        comment: reviewComment
      }, { headers });
      
      alert('Thank you for your review!');
      setReviewModalOpen(false);
      setReviewRating(5);
      setReviewComment('');
      fetchAstrologers();
    } catch (e) {
      alert('Failed to submit review.');
    }
  };

  // Kundli placement algorithm
  const getKundliData = (client) => {
    if (!client || !client.dob) return null;
    const birthMonth = new Date(client.dob).getMonth() + 1;
    const birthDay = new Date(client.dob).getDate();
    
    // Determine starting sign numbers (1 to 12)
    const lagnaNum = ((birthMonth + birthDay) % 12) + 1;
    const signs = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
    
    const housePlacements = {};
    for (let house = 1; house <= 12; house++) {
      const signIndex = (lagnaNum - 1 + house - 1) % 12;
      housePlacements[house] = {
        sign: signs[signIndex],
        num: signIndex + 1,
        planets: []
      };
    }

    // Distribute planetary references
    housePlacements[1].planets.push('Asc');
    housePlacements[((birthMonth) % 12) + 1].planets.push('Su');
    housePlacements[((birthDay) % 12) + 1].planets.push('Mo');
    housePlacements[((birthMonth + 3) % 12) + 1].planets.push('Ju');
    housePlacements[((birthDay + 5) % 12) + 1].planets.push('Ve');
    housePlacements[((birthMonth + 7) % 12) + 1].planets.push('Sa');
    housePlacements[((birthDay + 9) % 12) + 1].planets.push('Me');

    return {
      lagna: signs[lagnaNum - 1],
      housePlacements
    };
  };

  const kundli = getKundliData(clientInfo);

  // Apply filters trigger
  useEffect(() => {
    fetchAstrologers();
  }, [specialtyFilter, languageFilter, maxPrice]);

  return (
    <div className="min-h-screen bg-bg-secondary text-text-primary font-sans antialiased pb-10">
      
      {/* Navbar */}
      <nav className="glass-card mx-6 my-4 p-4 flex justify-between items-center rounded-2xl border-none">
        <div className="flex items-center gap-2">
          <Compass className="text-gold animate-spin-slow" size={28} />
          <span className="font-heading font-extrabold text-xl tracking-tight gold-gradient-text">AstroChronicle Client Hub</span>
        </div>
        
        {/* Wallet Balance Widget */}
        <div className="flex items-center gap-4">
          <div className="glass-card p-2 px-3 border-none flex items-center gap-2 text-xs font-semibold text-emerald bg-emerald/10">
            <CreditCard size={14} />
            <span>Balance: ₹{walletBalance}</span>
            <button onClick={() => setRechargeModalOpen(true)} className="ml-1 text-[10px] bg-emerald/20 p-1 px-2 rounded hover:bg-emerald/30 font-bold uppercase transition">Recharge</button>
          </div>
          <button onClick={logout} className="btn btn-secondary btn-sm text-crimson hover:bg-crimson/10">Log Out</button>
        </div>
      </nav>

      {/* Tabs */}
      <div className="max-w-[1280px] mx-auto px-6 mb-4 flex gap-2 overflow-x-auto">
        <button onClick={() => { setActiveTab('home'); setSelectedAstro(null); }} className={`p-2 px-4 rounded-full text-xs font-bold transition ${activeTab === 'home' ? 'bg-primary text-white' : 'bg-white/5 hover:bg-white/10 text-text-secondary'}`}>Our Astrologers</button>
        <button onClick={() => setActiveTab('kundli')} className={`p-2 px-4 rounded-full text-xs font-bold transition ${activeTab === 'kundli' ? 'bg-primary text-white' : 'bg-white/5 hover:bg-white/10 text-text-secondary'}`}>My Kundli</button>
        <button onClick={() => setActiveTab('wallet')} className={`p-2 px-4 rounded-full text-xs font-bold transition ${activeTab === 'wallet' ? 'bg-primary text-white' : 'bg-white/5 hover:bg-white/10 text-text-secondary'}`}>Wallet & Logs</button>
        <button onClick={() => setActiveTab('consultations')} className={`p-2 px-4 rounded-full text-xs font-bold transition ${activeTab === 'consultations' ? 'bg-primary text-white' : 'bg-white/5 hover:bg-white/10 text-text-secondary'}`}>My Sessions</button>
        <button onClick={() => setActiveTab('profile')} className={`p-2 px-4 rounded-full text-xs font-bold transition ${activeTab === 'profile' ? 'bg-primary text-white' : 'bg-white/5 hover:bg-white/10 text-text-secondary'}`}>Edit Profile</button>
      </div>

      <div className="max-w-[1280px] mx-auto px-6">
        
        {/* TAB: LISTINGS & PORTFOLIO */}
        {activeTab === 'home' && (
          <div>
            {!selectedAstro ? (
              // Astrologer grid view
              <div>
                <div className="glass-card mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-group mb-0">
                    <label className="form-label text-[0.75rem]">Filter by Specialty</label>
                    <select value={specialtyFilter} onChange={e => setSpecialtyFilter(e.target.value)} className="form-control" style={{ background: 'var(--bg-primary)' }}>
                      <option value="">All Specialities</option>
                      <option value="Vedic">Vedic Astrology</option>
                      <option value="Numerology">Numerology</option>
                      <option value="KP">KP System</option>
                      <option value="Horary">Horary Astrology</option>
                    </select>
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label text-[0.75rem]">Filter by Language</label>
                    <input type="text" className="form-control" placeholder="e.g. English, Hindi" value={languageFilter} onChange={e => setLanguageFilter(e.target.value)} />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label text-[0.75rem]">Max Rate: ₹{maxPrice}/min</label>
                    <input type="range" min="5" max="150" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-full mt-2 accent-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {astrologers.map(astro => (
                    <div key={astro._id} className="glass-card flex flex-col items-center text-center gap-3 relative hover:-translate-y-1 transition duration-300">
                      {/* Online/Offline Badge */}
                      <span className={`absolute top-4 right-4 text-[9px] font-bold px-2 py-0.5 rounded-full ${astro.isOnline ? 'bg-emerald/20 text-emerald border border-emerald/30' : 'bg-crimson/20 text-crimson border border-crimson/30'}`}>
                        {astro.isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>

                      <div className="w-20 h-20 rounded-full padding-[2px] bg-gradient-to-r from-primary to-gold flex items-center justify-center shadow-lg overflow-hidden">
                        <img src={astro.photoUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop'} alt="" className="w-[74px] h-[74px] rounded-full object-cover border-2 border-bg-primary" />
                      </div>

                      <div>
                        <h3 className="font-heading font-extrabold text-lg text-text-primary flex items-center gap-1.5 justify-center">
                          {astro.name}
                        </h3>
                        <div className="text-gold text-xs font-semibold">{astro.specialization}</div>
                        <div className="text-text-muted text-[11px] mt-1">{astro.experience || 0} years experience</div>
                      </div>

                      {/* Ratings */}
                      <div className="flex items-center gap-1 text-sm bg-white/5 p-1 px-3 rounded-full border border-white/5">
                        <Star className="text-gold fill-gold" size={13} />
                        <span className="font-bold">{astro.rating || '5.0'}</span>
                        <span className="text-text-muted text-xs">({astro.ratingCount || 0})</span>
                      </div>

                      <div className="text-sm font-extrabold text-emerald mt-1">₹{astro.ratePerMin}/min</div>

                      <div className="flex gap-2 w-full mt-2">
                        <button onClick={() => setSelectedAstro(astro)} className="btn btn-secondary flex-1 btn-sm">Portfolio</button>
                        <button 
                          onClick={() => initiateCall(astro._id, astro.name, astro.ratePerMin)} 
                          className="btn btn-primary flex-1 btn-sm flex items-center gap-1 justify-center"
                          disabled={!astro.isOnline}
                          style={{ opacity: astro.isOnline ? 1 : 0.4 }}
                        >
                          <PhoneCall size={13} /> Call
                        </button>
                      </div>
                    </div>
                  ))}
                  {astrologers.length === 0 && (
                    <div className="col-span-full text-center p-8 text-text-muted">No astrologers match your filters. Try adjusting them.</div>
                  )}
                </div>
              </div>
            ) : (
              // Astrologer portfolio view
              <div className="flex flex-col gap-6">
                <button onClick={() => setSelectedAstro(null)} className="btn btn-secondary btn-sm self-start flex items-center gap-1">
                  &larr; Back to Listings
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left block - bio card */}
                  <div className="glass-card flex flex-col items-center text-center gap-4">
                    <img src={selectedAstro.photoUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop'} alt="" className="w-24 h-24 rounded-full border-2 border-primary object-cover shadow-lg" />
                    <div>
                      <h2 className="font-heading font-extrabold text-xl">{selectedAstro.name}</h2>
                      <div className="text-gold font-semibold text-sm">{selectedAstro.specialization}</div>
                      <div className="text-xs text-text-muted mt-1">{selectedAstro.experience || 0} Years Experience</div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white/5 p-1 px-4 rounded-full">
                      <Star className="text-gold fill-gold" size={14} />
                      <span className="font-bold">{selectedAstro.rating || '5.0'}</span>
                      <span className="text-text-muted text-xs">({selectedAstro.ratingCount || 0} reviews)</span>
                    </div>

                    <div className="text-lg font-bold text-emerald">₹{selectedAstro.ratePerMin} / minute</div>

                    <button 
                      onClick={() => initiateCall(selectedAstro._id, selectedAstro.name, selectedAstro.ratePerMin)} 
                      className="btn btn-primary w-full flex items-center gap-2 justify-center"
                      disabled={!selectedAstro.isOnline}
                      style={{ opacity: selectedAstro.isOnline ? 1 : 0.5 }}
                    >
                      <PhoneCall size={16} /> 
                      <span>{selectedAstro.isOnline ? 'Call Now' : 'Currently Offline'}</span>
                    </button>
                  </div>

                  {/* Right block - portfolio details */}
                  <div className="md:col-span-2 flex flex-col gap-6">
                    <div className="glass-card flex flex-col gap-4">
                      <h3 className="font-heading font-bold text-lg border-b border-white/5 pb-2">Astrologer Portfolio</h3>
                      <div>
                        <h4 className="text-text-secondary text-xs font-bold uppercase mb-1">About Bio</h4>
                        <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">{selectedAstro.bio || 'No bio provided for this astrologer.'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <h4 className="text-text-secondary text-xs font-bold uppercase mb-1">Specialties</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedAstro.specialties?.map(s => <span key={s} className="badge badge-primary text-[10px]">{s}</span>) || <span className="text-sm">Vedic</span>}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-text-secondary text-xs font-bold uppercase mb-1">Languages Spoken</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedAstro.languages?.map(l => <span key={l} className="badge badge-primary text-[10px]">{l}</span>) || <span className="text-sm">English</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Astrologer Reviews */}
                    <div className="glass-card flex flex-col gap-4">
                      <h3 className="font-heading font-bold text-lg border-b border-white/5 pb-2">Client Reviews</h3>
                      <ReviewsSection astroId={selectedAstro._id} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: MY KUNDLI */}
        {activeTab === 'kundli' && (
          <div className="glass-card flex flex-col gap-6">
            <h1 className="font-heading font-extrabold text-2xl tracking-tight">My Vedic Kundli Chart</h1>
            {kundli ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                {/* Traditional North Indian Kundli chart (drawn dynamically via SVG) */}
                <div className="flex justify-center">
                  <svg viewBox="0 0 400 400" className="w-full max-w-[340px] drop-shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                    {/* Background */}
                    <rect x="10" y="10" width="380" height="380" fill="rgba(15, 23, 42, 0.4)" stroke="var(--accent-gold)" strokeWidth="3" rx="8" />
                    
                    {/* Diagonals */}
                    <line x1="10" y1="10" x2="390" y2="390" stroke="var(--accent-gold)" strokeWidth="1.5" />
                    <line x1="390" y1="10" x2="10" y2="390" stroke="var(--accent-gold)" strokeWidth="1.5" />
                    
                    {/* Midpoint diamonds */}
                    <line x1="200" y1="10" x2="390" y2="200" stroke="var(--accent-gold)" strokeWidth="1.5" />
                    <line x1="390" y1="200" x2="200" y2="390" stroke="var(--accent-gold)" strokeWidth="1.5" />
                    <line x1="200" y1="390" x2="10" y2="200" stroke="var(--accent-gold)" strokeWidth="1.5" />
                    <line x1="10" y1="200" x2="200" y2="10" stroke="var(--accent-gold)" strokeWidth="1.5" />
                    
                    {/* Houses numbers (diamond mapping) */}
                    <text x="200" y="130" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" className="font-heading">1 (Asc)</text>
                    <text x="120" y="90" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">2 ({kundli.housePlacements[2].planets.join(', ') || kundli.housePlacements[2].num})</text>
                    <text x="90" y="120" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">3 ({kundli.housePlacements[3].planets.join(', ') || kundli.housePlacements[3].num})</text>
                    <text x="135" y="200" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">4</text>
                    <text x="90" y="280" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">5 ({kundli.housePlacements[5].planets.join(', ') || kundli.housePlacements[5].num})</text>
                    <text x="120" y="315" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">6 ({kundli.housePlacements[6].planets.join(', ') || kundli.housePlacements[6].num})</text>
                    <text x="200" y="275" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">7</text>
                    <text x="280" y="315" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">8 ({kundli.housePlacements[8].planets.join(', ') || kundli.housePlacements[8].num})</text>
                    <text x="310" y="280" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">9 ({kundli.housePlacements[9].planets.join(', ') || kundli.housePlacements[9].num})</text>
                    <text x="265" y="200" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">10</text>
                    <text x="310" y="120" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">11 ({kundli.housePlacements[11].planets.join(', ') || kundli.housePlacements[11].num})</text>
                    <text x="280" y="90" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">12 ({kundli.housePlacements[12].planets.join(', ') || kundli.housePlacements[12].num})</text>

                    {/* Planet Placements Visual overlays */}
                    <text x="200" y="215" textAnchor="middle" fill="var(--accent-gold)" fontSize="14" fontWeight="extrabold">{kundli.housePlacements[1].planets.join(' ')}</text>
                    <text x="200" y="180" textAnchor="middle" fill="white" fontSize="11">Su: {kundli.housePlacements[2].planets.includes('Su') ? 'H2' : kundli.housePlacements[5].planets.includes('Su') ? 'H5' : 'H8'}</text>
                  </svg>
                </div>

                {/* Kundli sign placements list */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-heading font-bold text-lg text-gold">Placements Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-text-secondary block text-xs font-bold uppercase mb-1">Ascendant (Lagna)</span>
                      <span className="font-bold text-text-primary text-base">{kundli.lagna}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-text-secondary block text-xs font-bold uppercase mb-1">Rashi (Moon Sign)</span>
                      <span className="font-bold text-text-primary text-base">Taurus</span>
                    </div>
                  </div>

                  <div className="table-container mt-2">
                    <table className="custom-table w-full text-xs">
                      <thead>
                        <tr>
                          <th>Planet</th>
                          <th>Vedic Sign</th>
                          <th>Nakshatra</th>
                          <th>Degree</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td>Ascendant (Lagna)</td><td>{kundli.lagna}</td><td>Krittika</td><td>12° 24'</td></tr>
                        <tr><td>Sun (Su)</td><td>Leo</td><td>Purva Phalguni</td><td>24° 51'</td></tr>
                        <tr><td>Moon (Mo)</td><td>Taurus</td><td>Rohini</td><td>08° 12'</td></tr>
                        <tr><td>Mars (Ma)</td><td>Scorpio</td><td>Anuradha</td><td>16° 44'</td></tr>
                        <tr><td>Mercury (Me)</td><td>Gemini</td><td>Ardra</td><td>03° 10'</td></tr>
                        <tr><td>Jupiter (Ju)</td><td>Sagittarius</td><td>Mula</td><td>19° 50'</td></tr>
                        <tr><td>Venus (Ve)</td><td>Pisces</td><td>Revati</td><td>11° 15'</td></tr>
                        <tr><td>Saturn (Sa)</td><td>Capricorn</td><td>Uttarashadha</td><td>28° 02'</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-text-muted">Loading your Kundli calculations... please make sure your DOB is updated in your profile.</div>
            )}
          </div>
        )}

        {/* TAB: WALLET & TRANSACTIONS */}
        {activeTab === 'wallet' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Recharge widget */}
            <div className="glass-card flex flex-col gap-4 self-start">
              <h3 className="font-heading font-bold text-lg">Recharge Balance</h3>
              <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                <span className="text-xs text-text-secondary uppercase font-bold block mb-1">Available Funds</span>
                <span className="text-3xl font-heading font-extrabold text-emerald">₹{walletBalance}</span>
              </div>
              
              <form onSubmit={handleRechargeSubmit} className="flex flex-col gap-3">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Select Recharge Option</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[100, 200, 500].map(amt => (
                      <button 
                        key={amt} 
                        type="button" 
                        onClick={() => setRechargeAmt(amt)} 
                        className={`p-2 rounded font-bold text-sm border transition ${rechargeAmt === amt ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10'}`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Or Enter Custom Amount (₹)</label>
                  <input type="number" min="10" className="form-control" value={rechargeAmt} onChange={e => setRechargeAmt(Number(e.target.value))} />
                </div>
                <button type="submit" className="btn btn-primary w-full mt-2">Mock Recharge Instantly</button>
              </form>
            </div>

            {/* Transactions history */}
            <div className="md:col-span-2 glass-card flex flex-col gap-4">
              <h3 className="font-heading font-bold text-lg">Transaction History</h3>
              <div className="table-container">
                <table className="custom-table w-full text-xs">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Amount</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Description</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t._id}>
                        <td className="text-text-muted font-mono">{t._id}</td>
                        <td className={`font-bold ${t.amount > 0 ? 'text-emerald' : 'text-crimson'}`}>
                          {t.amount > 0 ? `+₹${t.amount}` : `-₹${Math.abs(t.amount)}`}
                        </td>
                        <td className="uppercase font-semibold text-[10px]">{t.type}</td>
                        <td><span className="badge badge-success text-[9px]">{t.status}</span></td>
                        <td>{t.description}</td>
                        <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr><td colSpan="6" className="text-center p-4 text-text-muted">No transactions logged yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SESSIONS HISTORY */}
        {activeTab === 'consultations' && (
          <div className="glass-card flex flex-col gap-4">
            <h1 className="font-heading font-extrabold text-2xl tracking-tight">My Past Consultations</h1>
            <div className="table-container">
              <table className="custom-table w-full">
                <thead>
                  <tr>
                    <th>Astrologer</th>
                    <th>Specialty</th>
                    <th>Date & Time</th>
                    <th>Duration</th>
                    <th>Deducted Cost</th>
                    <th>Review Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.map(c => (
                    <tr key={c._id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <img src={c.astrologer?.photoUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop'} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <span className="font-semibold">{c.astrologer?.name}</span>
                        </div>
                      </td>
                      <td className="text-text-secondary">{c.astrologer?.specialization}</td>
                      <td>{new Date(c.date).toLocaleString()}</td>
                      <td>{Math.ceil(c.duration / 60)} mins</td>
                      <td className="text-crimson font-bold">-₹{c.amount}</td>
                      <td>
                        <button 
                          onClick={() => { setReviewAstroId(c.astrologer?._id); setReviewModalOpen(true); }}
                          className="btn btn-secondary btn-sm flex items-center gap-1 py-1"
                        >
                          <Star size={12} className="text-gold fill-gold" /> Rate & Review
                        </button>
                      </td>
                    </tr>
                  ))}
                  {consultations.length === 0 && (
                    <tr><td colSpan="6" className="text-center p-8 text-text-muted">No past consultation calls logged.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: EDIT PROFILE */}
        {activeTab === 'profile' && (
          <div className="glass-card max-w-[600px] mx-auto">
            <h1 className="font-heading font-extrabold text-2xl tracking-tight mb-4">Edit Profile & Chart details</h1>
            <form onSubmit={handleProfileUpdate} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control" required value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="tel" className="form-control" required value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select value={profileData.gender} onChange={e => setProfileData({...profileData, gender: e.target.value})} className="form-control" style={{ background: 'var(--bg-primary)' }}>
                  <option value="Male" style={{ background: 'var(--bg-primary)' }}>Male</option>
                  <option value="Female" style={{ background: 'var(--bg-primary)' }}>Female</option>
                  <option value="Other" style={{ background: 'var(--bg-primary)' }}>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input type="date" className="form-control" required value={profileData.dob} onChange={e => setProfileData({...profileData, dob: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Time of Birth</label>
                <input type="time" className="form-control" required value={profileData.birthTime} onChange={e => setProfileData({...profileData, birthTime: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Place of Birth</label>
                <input type="text" className="form-control" placeholder="City, Country" required value={profileData.birthPlace} onChange={e => setProfileData({...profileData, birthPlace: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary w-full mt-2">Save Profile Updates</button>
            </form>
          </div>
        )}

      </div>

      {/* MODAL 1: MOCK CALLING INTERFACE OVERLAY */}
      {activeCall.status !== 'idle' && (
        <div className="modal-overlay">
          <div className="glass-card modal-content p-8 max-w-[380px] text-center flex flex-col items-center gap-6 border-gold/40 shadow-gold/10">
            
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse"></div>
              <div className="w-24 h-24 rounded-full border-4 border-gold/40 flex items-center justify-center shadow-lg overflow-hidden relative z-10 animate-bounce">
                <Phone className="text-gold" size={36} />
              </div>
            </div>

            <div>
              <h3 className="font-heading font-extrabold text-xl text-gold">{activeCall.partner?.name}</h3>
              <p className="text-text-secondary text-xs mt-1">Vedic Astrology Expert</p>
            </div>

            {/* Connection States */}
            {activeCall.status === 'calling' && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold animate-pulse text-primary-hover">Calling...</span>
                <span className="text-text-muted text-xs">Waiting for astrologer to accept call.</span>
              </div>
            )}

            {activeCall.status === 'incoming' && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-emerald animate-pulse">Incoming Consultation Call!</span>
                <div className="flex gap-2 mt-2">
                  <button onClick={endActiveCall} className="btn btn-danger btn-sm px-6">Decline</button>
                  <button onClick={endActiveCall} className="btn btn-primary btn-sm px-6">Accept</button>
                </div>
              </div>
            )}

            {activeCall.status === 'connected' && (
              <div className="flex flex-col gap-4 w-full">
                <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col gap-1">
                  <span className="text-text-secondary text-xs">Running Call Timer</span>
                  <span className="text-2xl font-bold font-mono text-emerald">
                    {Math.floor(activeCall.timer / 60).toString().padStart(2, '0')}:
                    {(activeCall.timer % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                
                <div className="text-xs text-text-muted flex justify-between px-2">
                  <span>Price: ₹{activeCall.ratePerMin}/min</span>
                  <span className="text-crimson font-bold">Billing Active</span>
                </div>

                <button onClick={endActiveCall} className="btn btn-danger w-full mt-2">End Call</button>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* MODAL 2: RATE & REVIEW MODAL */}
      {reviewModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content p-6 max-w-[420px]">
            <h3 className="font-heading font-bold text-lg mb-4">Rate & Review Consultation</h3>
            <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4">
              <div className="form-group mb-0">
                <label className="form-label text-xs">Rating Stars (1-5)</label>
                <div className="flex gap-2 justify-center my-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star} 
                      type="button" 
                      onClick={() => setReviewRating(star)}
                      className="text-2xl hover:scale-110 transition duration-150"
                    >
                      <Star className={star <= reviewRating ? 'text-gold fill-gold' : 'text-text-muted'} size={24} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-xs">Share Your Feedback</label>
                <textarea 
                  rows={3} 
                  required
                  placeholder="Tell others about your consultation experience..." 
                  className="form-control" 
                  value={reviewComment} 
                  onChange={e => setReviewComment(e.target.value)} 
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setReviewModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Submit Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECHARGE MODAL */}
      {rechargeModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content p-6 max-w-[400px]">
            <h3 className="font-heading font-bold text-lg mb-2">Secure Mock Payment</h3>
            <p className="text-text-secondary text-xs mb-4">Simulate card checkout to instantly credit wallet balance funds.</p>
            <form onSubmit={handleRechargeSubmit} className="flex flex-col gap-4">
              <div className="form-group mb-0">
                <label className="form-label text-xs">Amount to Recharge (₹)</label>
                <input type="number" readOnly className="form-control font-bold text-emerald bg-white/5 border-none" value={rechargeAmt} />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-xs">Mock Card Number</label>
                <input type="text" required defaultValue="4111 2222 3333 4444" placeholder="Card number" className="form-control" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Expiry Date</label>
                  <input type="text" required defaultValue="12/28" placeholder="MM/YY" className="form-control" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">CVV</label>
                  <input type="password" required defaultValue="123" placeholder="***" className="form-control" />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setRechargeModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Pay ₹{rechargeAmt}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// Reviews helper subcomponent
const ReviewsSection = ({ astroId }) => {
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

export default ClientDashboard;
