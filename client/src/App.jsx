import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, AppContext } from './context/AppContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import AstrologerDashboard from './pages/AstrologerDashboard';

// Universal Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useContext(AppContext);
  const token = localStorage.getItem('admin_token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to correct role-based dashboard if trying to access unauthorized views
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'astrologer') return <Navigate to="/astrologer" replace />;
    return <Navigate to="/client" replace />;
  }
  
  return children;
};

// Public Route Guard (Redirect to correct dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('admin_token');
  const userString = localStorage.getItem('admin_user');
  const user = userString ? JSON.parse(userString) : null;

  if (token && user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'astrologer') return <Navigate to="/astrologer" replace />;
    return <Navigate to="/client" replace />;
  }
  return children;
};

// Dispatcher for default and dashboard paths
const DashboardRedirect = () => {
  const { user } = useContext(AppContext);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'astrologer') return <Navigate to="/astrologer" replace />;
  return <Navigate to="/client" replace />;
};

function AppContent() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Protected Dashboards */}
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/client/*" 
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <ClientDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/astrologer/*" 
        element={
          <ProtectedRoute allowedRoles={['astrologer']}>
            <AstrologerDashboard />
          </ProtectedRoute>
        } 
      />

      {/* Default Fallback Redirects */}
      <Route path="/dashboard" element={<DashboardRedirect />} />
      <Route path="/" element={<DashboardRedirect />} />
      <Route path="*" element={<DashboardRedirect />} />
    </Routes>
  );
}

function App() {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
}

export default App;
