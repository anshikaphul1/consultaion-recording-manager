import React, { createContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

export const AppContext = createContext();

const API_BASE = 'http://localhost:5000/api';

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const userString = localStorage.getItem('admin_user');
    return userString ? JSON.parse(userString) : null;
  });
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [socket, setSocket] = useState(null);
  
  // Call State
  // status: 'idle' | 'calling' | 'incoming' | 'connected'
  const [activeCall, setActiveCall] = useState({
    status: 'idle',
    role: null, // 'client' | 'astrologer'
    partner: null, // { id, name }
    timer: 0,
    ratePerMin: 10
  });

  const timerIntervalRef = useRef(null);

  // Initialize Socket on login
  useEffect(() => {
    if (user) {
      const socketUrl = 'http://localhost:5000';
      const newSocket = io(socketUrl);
      setSocket(newSocket);

      newSocket.emit('register-user', { userId: user.userId });

      // Fetch wallet balance
      fetchWalletBalance();

      return () => {
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setWalletBalance(0);
      setActiveCall({ status: 'idle', role: null, partner: null, timer: 0, ratePerMin: 10 });
    }
  }, [user]);

  // Fetch Wallet Balance helper
  const fetchWalletBalance = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get(`${API_BASE}/wallet`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletBalance(response.data.balance);
    } catch (e) {
      console.error('Failed to fetch wallet:', e);
    }
  };

  // Re-fetch wallet balance on balance changes
  const rechargeWallet = async (amount) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await axios.post(`${API_BASE}/wallet/recharge`, { amount }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletBalance(res.data.wallet.balance);
      return res.data;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  // Start call timer
  const startCallTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setActiveCall((prev) => {
        // Compute remaining balance check (for client)
        if (prev.role === 'client') {
          const elapsedMins = Math.ceil((prev.timer + 1) / 60);
          const currentCost = elapsedMins * prev.ratePerMin;
          if (walletBalance < currentCost) {
            // Insufficient balance, auto hang up
            setTimeout(() => {
              endActiveCall();
              alert('Call disconnected due to insufficient wallet balance.');
            }, 0);
          }
        }
        return { ...prev, timer: prev.timer + 1 };
      });
    }, 1000);
  };

  const stopCallTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Socket event subscriptions
  useEffect(() => {
    if (!socket) return;

    socket.on('incoming-call', ({ clientId, clientName, astrologerId }) => {
      console.log('Incoming call received in context:', clientName);
      setActiveCall({
        status: 'incoming',
        role: 'astrologer',
        partner: { id: clientId, name: clientName },
        timer: 0,
        ratePerMin: 10 // astrologer's own rate
      });
    });

    socket.on('call-accepted', ({ astrologerId }) => {
      console.log('Call accepted by astrologer.');
      setActiveCall((prev) => ({ ...prev, status: 'connected' }));
      startCallTimer();
    });

    socket.on('call-rejected', () => {
      console.log('Call rejected by astrologer.');
      alert('The astrologer has declined the call.');
      setActiveCall({ status: 'idle', role: null, partner: null, timer: 0, ratePerMin: 10 });
    });

    socket.on('call-terminated', () => {
      console.log('Call ended.');
      stopCallTimer();
      setActiveCall({ status: 'idle', role: null, partner: null, timer: 0, ratePerMin: 10 });
      fetchWalletBalance();
    });

    socket.on('call-error', ({ message }) => {
      alert(message);
      setActiveCall({ status: 'idle', role: null, partner: null, timer: 0, ratePerMin: 10 });
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('call-terminated');
      socket.off('call-error');
    };
  }, [socket, walletBalance]);

  // Client Initiates Call
  const initiateCall = (astrologerId, astrologerName, ratePerMin) => {
    if (!socket || !user) return;
    
    // Check wallet balance meets minimum threshold (e.g. at least 1 min rate)
    if (walletBalance < ratePerMin) {
      alert(`Insufficient balance. Minimum balance required is ₹${ratePerMin} to start this call.`);
      return;
    }

    setActiveCall({
      status: 'calling',
      role: 'client',
      partner: { id: astrologerId, name: astrologerName },
      timer: 0,
      ratePerMin
    });

    socket.emit('call-request', {
      clientUserId: user.userId,
      clientName: user.name,
      astrologerId
    });
  };

  // Astrologer Accepts Call
  const acceptIncomingCall = () => {
    if (!socket || !activeCall.partner) return;
    
    socket.emit('call-accept', {
      clientId: activeCall.partner.id,
      astrologerId: user.astrologerRef
    });

    setActiveCall((prev) => ({ ...prev, status: 'connected' }));
    startCallTimer();
  };

  // Astrologer Rejects Call
  const rejectIncomingCall = () => {
    if (!socket || !activeCall.partner) return;
    
    socket.emit('call-reject', {
      clientId: activeCall.partner.id
    });

    setActiveCall({ status: 'idle', role: null, partner: null, timer: 0, ratePerMin: 10 });
  };

  // End active call (Client or Astrologer)
  const endActiveCall = async () => {
    if (!socket || activeCall.status === 'idle') return;

    const clientId = activeCall.role === 'client' ? user.userId : activeCall.partner.id;
    const astrologerId = activeCall.role === 'client' ? activeCall.partner.id : user.astrologerRef;
    const finalTimer = activeCall.timer;

    // Trigger socket end call signaling
    socket.emit('call-end', { clientId, astrologerId });

    // Stop timer locally
    stopCallTimer();
    setActiveCall({ status: 'idle', role: null, partner: null, timer: 0, ratePerMin: 10 });

    // Call backend API to deduct funds and log session
    if (finalTimer > 0) {
      try {
        const token = localStorage.getItem('admin_token');
        await axios.post(`${API_BASE}/consultations/call/end`, {
          clientId,
          astrologerId,
          durationSeconds: finalTimer
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchWalletBalance();
      } catch (e) {
        console.error('Failed to log consultation session details:', e);
      }
    }
  };

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setUser(null);
  };

  return (
    <AppContext.Provider value={{
      user,
      login,
      logout,
      walletBalance,
      fetchWalletBalance,
      rechargeWallet,
      activeCall,
      initiateCall,
      acceptIncomingCall,
      rejectIncomingCall,
      endActiveCall
    }}>
      {children}
    </AppContext.Provider>
  );
};
