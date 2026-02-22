/**
 * App.jsx — Root component with routing
 *
 * Uses React Router v6 for client-side navigation.
 * All routes are rendered inside the layout (Navbar + main content).
 *
 * Protected routes (Upload, Search, Gallery) redirect to /login
 * if the user is not authenticated.
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Register from './pages/Register';
import Upload from './pages/Upload';
import Search from './pages/Search';
import Gallery from './pages/Gallery';
import { isAuthenticated } from './utils/auth';
import './App.css';

/**
 * ProtectedRoute: wraps a component and redirects to /register
 * if the user is not authenticated.
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
    // Show nothing while checking auth (avoids flash)
    return <div style={{ minHeight: '100vh', background: '#f9f7f4' }} />;
  }

  return authed ? children : <Navigate to="/register" replace />;
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

          {/* Protected routes */}
          <Route path="/upload" element={
            <ProtectedRoute><Upload /></ProtectedRoute>
          } />
          <Route path="/search" element={
            <ProtectedRoute><Search /></ProtectedRoute>
          } />
          <Route path="/gallery" element={
            <ProtectedRoute><Gallery /></ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
