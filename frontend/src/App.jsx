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
import TicketView from './pages/TicketView';
import ScanTicket from './pages/ScanTicket';
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
      const isAdmin = token ? decodeJwtGroups(token).includes('admins') : false;
      setAllowed(isAdmin);
      setChecked(true);
    })();
  }, []);

  if (!checked) return <div style={{ minHeight: '100vh', background: '#f9f7f4' }} />;
  return allowed ? children : <Navigate to="/admin-login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
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

          {/* Admin-only routes */}
          <Route path="/admin/tickets" element={
            <AdminRoute><AdminTickets /></AdminRoute>
          } />
          <Route path="/admin/scan" element={
            <AdminRoute><ScanTicket /></AdminRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
