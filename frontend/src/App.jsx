import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Upload from './pages/Upload';
import Search from './pages/Search';
import Gallery from './pages/Gallery';
import GetTicket from './pages/GetTicket';
import MyTicket from './pages/MyTicket';
import AdminTickets from './pages/AdminTickets';
import AdminCoordinators from './pages/AdminCoordinators';
import TicketView from './pages/TicketView';
import ScanTicket from './pages/ScanTicket';
import CoordinatorLogin from './pages/CoordinatorLogin';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import Program from './pages/Program';
import { isAuthenticated, getCurrentUser, getAccessToken } from './utils/auth';
import './App.css';

function decodeJwtGroups(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const groups = payload['cognito:groups'];
    if (!groups) return [];
    const str = Array.isArray(groups) ? groups.join(',') : String(groups).replace(/[\[\]]/g, '');
    return str.split(',').map(g => g.trim()).filter(Boolean);
  } catch { return []; }
}

/**
 * ProtectedRoute: redirects to /register if not authenticated.
 */
function ProtectedRoute({ children }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    isAuthenticated().then((result) => {
      setAuthed(result);
      setAuthChecked(true);
    });
  }, []);

  if (!authChecked) {
    return <div style={{ minHeight: '100vh', background: '#f9f7f4' }} />;
  }

  return authed ? children : <Navigate to="/register" replace />;
}

/**
 * AdminRoute: redirects to /admin-login if not authenticated or not admin.
 */
function AdminRoute({ children }) {
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user) { setChecked(true); return; }
      const token = await getAccessToken();
      const groups = token ? decodeJwtGroups(token) : [];
      const isAdmin = groups.includes('admins') || groups.includes('superadmins');
      setAllowed(isAdmin);
      setChecked(true);
    })();
  }, []);

  if (!checked) return <div style={{ minHeight: '100vh', background: '#f9f7f4' }} />;
  return allowed ? children : <Navigate to="/admin-login" replace />;
}

/**
 * CoordinatorRoute: redirects to /coordinator/login if not a coordinator.
 */
function CoordinatorRoute({ children }) {
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user) { setChecked(true); return; }
      const token = await getAccessToken();
      const groups = token ? decodeJwtGroups(token) : [];
      setAllowed(groups.includes('coordinators'));
      setChecked(true);
    })();
  }, []);

  if (!checked) return <div style={{ minHeight: '100vh', background: '#f9f7f4' }} />;
  return allowed ? children : <Navigate to="/coordinator/login" replace />;
}

function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #EDE0D8',
      padding: '18px 24px',
      textAlign: 'center',
      background: 'white',
    }}>
      <p style={{
        margin: 0,
        fontSize: '11px',
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        color: '#C4956A',
        fontWeight: '600',
        fontFamily: 'system-ui, sans-serif',
      }}>
        Cherish &nbsp;·&nbsp; Powered by Yerima Shettima
      </p>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/program" element={<Program />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/coordinator/login" element={<CoordinatorLogin />} />
          <Route path="/ticket/:ticketId" element={<TicketView />} />
          <Route path="/my-ticket" element={<MyTicket />} />
          <Route path="/get-ticket" element={
            <ProtectedRoute><GetTicket /></ProtectedRoute>
          } />

          {/* Protected guest routes */}
          <Route path="/upload" element={
            <ProtectedRoute><Upload /></ProtectedRoute>
          } />
          <Route path="/search" element={
            <ProtectedRoute><Search /></ProtectedRoute>
          } />
          <Route path="/gallery" element={
            <ProtectedRoute><Gallery /></ProtectedRoute>
          } />

          {/* Coordinator routes */}
          <Route path="/coordinator/dashboard" element={
            <CoordinatorRoute><CoordinatorDashboard /></CoordinatorRoute>
          } />

          {/* Admin-only routes */}
          <Route path="/admin/tickets" element={
            <AdminRoute><AdminTickets /></AdminRoute>
          } />
          <Route path="/admin/scan" element={
            <AdminRoute><ScanTicket /></AdminRoute>
          } />
          <Route path="/admin/coordinators" element={
            <AdminRoute><AdminCoordinators /></AdminRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
