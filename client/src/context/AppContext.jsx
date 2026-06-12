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
    ratePerMin: 10,
    sessionId: null
  });

  const [chatMessages, setChatMessages] = useState([]);

  const timerIntervalRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const currentSessionIdRef = useRef(null);

  // Stop media recording and release microphone
  const stopRecordingAndUpload = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

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
      setActiveCall({ status: 'idle', role: null, partner: null, timer: 0, ratePerMin: 10, sessionId: null });
      setChatMessages([]);
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
        ratePerMin: 10, // astrologer's own rate
        sessionId: null
      });
    });

    socket.on('call-accepted', ({ astrologerId, sessionId }) => {
      console.log('Call accepted by astrologer, session:', sessionId);
      setActiveCall((prev) => ({ ...prev, status: 'connected', sessionId }));
      setChatMessages([]);
      startCallTimer();
    });

    socket.on('call-started', ({ clientId, sessionId }) => {
      console.log('Call started on astrologer side, session:', sessionId);
      setActiveCall((prev) => ({ ...prev, status: 'connected', sessionId }));
      setChatMessages([]);
    });

    socket.on('call-rejected', () => {
      console.log('Call rejected by astrologer.');
      alert('The astrologer has declined the call.');
      setActiveCall({ status: 'idle', role: null, partner: null, timer: 0, ratePerMin: 10, sessionId: null });
      setChatMessages([]);
    });

    socket.on('call-terminated', () => {
      console.log('Call ended.');
      stopCallTimer();
      stopRecordingAndUpload();
      setActiveCall({ status: 'idle', role: null, partner: null, timer: 0, ratePerMin: 10, sessionId: null });
      fetchWalletBalance();
    });

    socket.on('call-error', ({ message }) => {
      alert(message);
      stopRecordingAndUpload();
      setActiveCall({ status: 'idle', role: null, partner: null, timer: 0, ratePerMin: 10, sessionId: null });
    });

    socket.on('chat-message-receive', (payload) => {
      console.log('Chat message received in context:', payload);
      setChatMessages((prev) => [...prev, payload]);
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-started');
      socket.off('call-rejected');
      socket.off('call-terminated');
      socket.off('call-error');
      socket.off('chat-message-receive');
    };
  }, [socket, walletBalance]);

  // Handle call audio recording start
  useEffect(() => {
    let activeStream = null;
    const startRecording = async () => {
      if (activeCall.status === 'connected' && activeCall.sessionId) {
        currentSessionIdRef.current = activeCall.sessionId;
        try {
          console.log('Requesting microphone permission...');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStreamRef.current = stream;
          activeStream = stream;
          
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          audioChunksRef.current = [];
          
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          
          recorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const sessionId = currentSessionIdRef.current;
            if (audioBlob.size > 0 && sessionId) {
              try {
                const token = localStorage.getItem('admin_token');
                const formData = new FormData();
                formData.append('audio', audioBlob, `recording-${sessionId}.webm`);
                
                console.log(`Uploading audio recording for session ${sessionId}...`);
                await axios.post(`${API_BASE}/sessions/${sessionId}/recording`, formData, {
                  headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                  }
                });
                console.log('Audio recording uploaded successfully.');
              } catch (err) {
                console.error('Failed to upload audio recording:', err);
              }
            }
            audioChunksRef.current = [];
            mediaRecorderRef.current = null;
            audioStreamRef.current = null;
          };
          
          recorder.start();
          console.log('Started client-side call recording.');
        } catch (err) {
          console.warn('Microphone access denied or failed to initialize recording:', err);
        }
      }
    };

    startRecording();

    // Clean up if we unmount
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeCall.status, activeCall.sessionId]);

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
      ratePerMin,
      sessionId: null
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

    setActiveCall({ status: 'idle', role: null, partner: null, timer: 0, ratePerMin: 10, sessionId: null });
  };

  // End active call (Client or Astrologer)
  const endActiveCall = async () => {
    if (!socket || activeCall.status === 'idle') return;

    const clientId = activeCall.role === 'client' ? user.userId : activeCall.partner.id;
    const astrologerId = activeCall.role === 'client' ? activeCall.partner.id : user.astrologerRef;
    const finalTimer = activeCall.timer;
    const sessionId = activeCall.sessionId;

    // Trigger socket end call signaling
    socket.emit('call-end', { clientId, astrologerId });

    // Stop timer locally
    stopCallTimer();
    stopRecordingAndUpload();
    setActiveCall({ status: 'idle', role: null, partner: null, timer: 0, ratePerMin: 10, sessionId: null });

    // Call backend API to deduct funds and log session
    if (finalTimer > 0 && sessionId) {
      try {
        const token = localStorage.getItem('admin_token');
        await axios.post(`${API_BASE}/consultations/call/end`, {
          sessionId,
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

  // Send real-time chat message
  const sendChatMessage = (messageText) => {
    if (!socket || !activeCall.sessionId || !user) return;
    const senderId = user.userId;
    const senderRole = user.role === 'astrologer' ? 'astrologer' : 'client';
    
    socket.emit('chat-message', {
      sessionId: activeCall.sessionId,
      message: messageText,
      senderId,
      senderRole
    });

    const localMsg = {
      _id: 'temp-' + Date.now(),
      sessionId: activeCall.sessionId,
      message: messageText,
      senderId,
      senderRole,
      timestamp: new Date().toISOString()
    };
    setChatMessages((prev) => [...prev, localMsg]);
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
      chatMessages,
      initiateCall,
      acceptIncomingCall,
      rejectIncomingCall,
      endActiveCall,
      sendChatMessage
    }}>
      {children}
    </AppContext.Provider>
  );
};
