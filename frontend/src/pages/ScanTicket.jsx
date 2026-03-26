import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getTicketById, checkinTicket } from '../utils/api';

export default function ScanTicket() {
  const [scanning, setScanning] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinResult, setCheckinResult] = useState(null); // {success, alreadyCheckedIn, checkedInAt}
  const [error, setError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const scannerRef = useRef(null);
  const scannerId = 'qr-reader';

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current = null;
        });
      }
    };
  }, []);

  async function startScan() {
    setError(''); setTicket(null); setCheckinResult(null);
    try {
      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop();
          scannerRef.current = null;
          setScanning(false);
          handleScannedId(decodedText.trim());
        },
        () => {} // ignore scan errors
      );
    } catch (err) {
      setScanning(false);
      setError('Could not access camera. Please allow camera permission and try again.');
    }
  }

  async function stopScan() {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  }

  async function handleScannedId(ticketId) {
    setLookupLoading(true); setError('');
    try {
      const data = await getTicketById(ticketId);
      setTicket(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError(`No ticket found for ID: ${ticketId}`);
      } else {
        setError(err.response?.data?.error || 'Failed to look up ticket.');
      }
    } finally { setLookupLoading(false); }
  }

  async function handleCheckIn() {
    if (!ticket) return;
    setCheckingIn(true); setError('');
    try {
      const result = await checkinTicket(ticket.ticketId);
      setCheckinResult(result);
      setTicket(prev => ({
        ...prev,
        checkedIn: true,
        checkedInAt: result.checkedInAt || prev.checkedInAt,
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Check-in failed. Please try again.');
    } finally { setCheckingIn(false); }
  }

  function reset() {
    setTicket(null); setCheckinResult(null); setError(''); setScanning(false);
  }

  const statusColor = ticket ? (
    ticket.status === 'approved' ? { bg: '#D1FAE5', text: '#065F46', label: '✓ Verified' }
    : ticket.status === 'rejected' ? { bg: '#FEE2E2', text: '#991B1B', label: '✗ Rejected' }
    : { bg: '#FEF3C7', text: '#92400E', label: '⏳ Pending' }
  ) : null;

  const formatTime = (iso) => iso
    ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="page">
      <h1 style={styles.title}>Scan Tickets</h1>
      <p style={styles.subtitle}>Point camera at guest QR code to verify attendance</p>

      {error && <div className="alert alert-error" style={{ maxWidth: '480px', margin: '0 auto 16px' }}>{error}</div>}

      {/* ── Scanner area ── */}
      {!ticket && (
        <div style={styles.scanSection}>
          {/* QR reader div — always rendered so Html5Qrcode can attach */}
          <div id={scannerId} style={{ ...styles.qrBox, display: scanning ? 'block' : 'none' }} />

          {!scanning && (
            <div style={styles.scanPlaceholder}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📷</div>
              <p style={{ color: '#7A6060', marginBottom: '20px', fontSize: '15px' }}>
                Ready to scan guest QR codes
              </p>
              <button onClick={startScan} className="btn btn-primary" style={styles.scanBtn}>
                Start Camera Scan
              </button>
            </div>
          )}

          {scanning && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <p style={{ color: '#7A6060', fontSize: '14px', marginBottom: '12px' }}>
                Position the QR code inside the frame
              </p>
              <button onClick={stopScan} style={styles.cancelBtn}>Cancel</button>
            </div>
          )}

          {lookupLoading && (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#7A6060' }}>Looking up ticket...</p>
            </div>
          )}
        </div>
      )}

      {/* ── Ticket result ── */}
      {ticket && (
        <div style={styles.resultCard}>
          {/* Selfie */}
          {ticket.selfieUrl ? (
            <img src={ticket.selfieUrl} alt={ticket.guestName} style={styles.selfie} crossOrigin="anonymous" />
          ) : (
            <div style={styles.selfieEmpty}>👤</div>
          )}

          {/* Info */}
          <div style={styles.resultInfo}>
            <h2 style={styles.guestName}>{ticket.guestName}</h2>
            <p style={styles.attendanceId}>{ticket.ticketId}</p>

            {/* Verification status */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ ...styles.badge, background: statusColor.bg, color: statusColor.text }}>
                {statusColor.label}
              </span>
            </div>

            {/* Check-in status */}
            {ticket.checkedIn ? (
              <div style={styles.checkedInBanner}>
                <span style={{ fontSize: '20px' }}>✅</span>
                <div>
                  <p style={{ margin: '0 0 2px', fontWeight: '700', color: '#065F46' }}>Checked In</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#047857' }}>{formatTime(ticket.checkedInAt)}</p>
                </div>
              </div>
            ) : checkinResult?.alreadyCheckedIn ? (
              <div style={styles.alreadyCheckedBanner}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <div>
                  <p style={{ margin: '0 0 2px', fontWeight: '700', color: '#92400E' }}>Already Checked In</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#92400E' }}>{formatTime(checkinResult.checkedInAt)}</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleCheckIn}
                style={{
                  ...styles.checkinBtn,
                  opacity: ticket.status !== 'approved' ? 0.6 : 1,
                }}
                disabled={checkingIn || ticket.status !== 'approved'}
                title={ticket.status !== 'approved' ? 'Ticket must be approved before check-in' : ''}
              >
                {checkingIn ? 'Checking in...' : '✓ Mark as Checked In'}
              </button>
            )}

            {ticket.status !== 'approved' && !ticket.checkedIn && (
              <p style={styles.notApprovedNote}>
                This ticket has not been approved yet. Approve it in Manage Tickets before checking in.
              </p>
            )}
          </div>

          {/* Scan another */}
          <button onClick={reset} style={styles.scanAnotherBtn}>
            📷 Scan Another Ticket
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { fontSize: 'clamp(22px, 3vw, 28px)', color: '#2D2020', margin: '0 0 6px' },
  subtitle: { color: '#7A6060', marginBottom: '28px', fontSize: '14px' },

  scanSection: { maxWidth: '400px', margin: '0 auto' },
  qrBox: { width: '100%', borderRadius: '16px', overflow: 'hidden' },
  scanPlaceholder: {
    textAlign: 'center', background: 'white',
    border: '2px dashed #C4956A', borderRadius: '16px', padding: '48px 24px',
  },
  scanBtn: { padding: '14px 32px', fontSize: '15px', justifyContent: 'center' },
  cancelBtn: {
    background: 'none', border: '1px solid #EDE0D8', color: '#5C3D2E',
    padding: '10px 24px', borderRadius: '20px', cursor: 'pointer', fontSize: '14px',
  },

  resultCard: {
    maxWidth: '400px', margin: '0 auto',
    background: 'white', borderRadius: '20px',
    border: '1px solid #EDE0D8',
    boxShadow: '0 4px 24px rgba(122,20,40,0.08)',
    overflow: 'hidden',
  },
  selfie: {
    width: '100%', height: '320px',
    objectFit: 'cover', objectPosition: 'top', display: 'block',
  },
  selfieEmpty: {
    width: '100%', height: '200px',
    background: '#F7EDE0', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '64px',
  },
  resultInfo: { padding: '20px 24px' },
  guestName: { fontSize: '24px', fontWeight: '700', color: '#2D2020', margin: '0 0 4px', lineHeight: 1.2 },
  attendanceId: {
    fontSize: '16px', fontWeight: '700', color: '#7A1428', fontFamily: 'monospace',
    margin: '0 0 14px', letterSpacing: '1px',
  },
  badge: {
    fontSize: '13px', fontWeight: '600', padding: '5px 14px',
    borderRadius: '20px', display: 'inline-block',
  },
  checkedInBanner: {
    display: 'flex', gap: '12px', alignItems: 'center',
    background: '#D1FAE5', borderRadius: '12px', padding: '14px 16px', marginTop: '12px',
  },
  alreadyCheckedBanner: {
    display: 'flex', gap: '12px', alignItems: 'center',
    background: '#FEF3C7', borderRadius: '12px', padding: '14px 16px', marginTop: '12px',
  },
  checkinBtn: {
    width: '100%', marginTop: '12px', padding: '14px',
    background: '#065F46', color: 'white', border: 'none',
    borderRadius: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: '700',
  },
  notApprovedNote: {
    fontSize: '12px', color: '#92400E', background: '#FEF3C7',
    borderRadius: '8px', padding: '10px 12px', marginTop: '10px', lineHeight: '1.5',
  },
  scanAnotherBtn: {
    display: 'block', width: '100%', padding: '14px',
    background: 'none', border: 'none', borderTop: '1px solid #EDE0D8',
    color: '#7A1428', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
  },
};
