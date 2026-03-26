import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { getMyTicketByPhone } from '../utils/api';

export default function MyTicket() {
  const [phone, setPhone] = useState('');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (ticket?.ticketId) {
      QRCode.toDataURL(ticket.ticketId, {
        width: 150, margin: 1,
        color: { dark: '#7A1428', light: '#FFFFFF' },
      }).then(setQrDataUrl);
    }
  }, [ticket]);

  async function handleLookup(e) {
    e.preventDefault();
    setLoading(true); setError(''); setTicket(null);
    try {
      const data = await getMyTicketByPhone(phone.trim());
      setTicket(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No ticket found for this phone number. Make sure you used the same number when applying.');
      } else {
        setError(err.response?.data?.error || 'Failed to look up ticket. Please try again.');
      }
    } finally { setLoading(false); }
  }

  const statusMap = {
    approved: { label: '✓ Verified', bg: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
    rejected: { label: '✗ Rejected', bg: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' },
    pending:  { label: '⏳ Pending Verification', bg: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' },
  };
  const statusStyle = ticket ? (statusMap[ticket.status] || statusMap.pending) : null;

  const formatDate = (iso) => iso
    ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  function shareToWhatsApp() {
    const link = `${window.location.origin}/ticket/${ticket.ticketId}`;
    const text = `I'm attending Bamai & Kazah's Wedding on 11 April 2026!\nMy attendance ID: ${ticket.ticketId}\nView ticket: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  return (
    <div className="page">
      <h1 style={styles.title}>My Ticket</h1>
      <p style={styles.subtitle}>Enter your phone number to retrieve your attendance ticket</p>

      {/* Lookup form */}
      <div style={styles.formCard}>
        <form onSubmit={handleLookup}>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              placeholder="08012345678 or +2348012345678"
              value={phone}
              onChange={e => { setPhone(e.target.value); setError(''); }}
              required
            />
          </div>
          {error && <div className="alert alert-error" style={{ marginBottom: '12px' }}>{error}</div>}
          <button type="submit" className="btn btn-primary" style={styles.fullBtn} disabled={loading || !phone}>
            {loading ? 'Looking up...' : 'Find My Ticket →'}
          </button>
        </form>

        <p style={styles.noTicketNote}>
          Don't have a ticket yet?{' '}
          <a href="/get-ticket" style={{ color: '#7A1428', fontWeight: '600', textDecoration: 'none' }}>
            Get one here →
          </a>
        </p>
      </div>

      {/* Ticket result */}
      {ticket && (
        <div style={styles.ticketSection}>
          {/* Status banner */}
          {ticket.status === 'approved' && (
            <div style={styles.verifiedBanner}>
              <span style={{ fontSize: '18px' }}>✓</span>
              <span>Your ticket has been verified by the wedding team!</span>
            </div>
          )}
          {ticket.status === 'rejected' && (
            <div style={styles.rejectedBanner}>
              <span style={{ fontSize: '18px' }}>✗</span>
              <span>Your ticket was not approved. Please contact the wedding team.</span>
            </div>
          )}
          {ticket.status === 'pending' && (
            <div style={styles.pendingBanner}>
              <span style={{ fontSize: '18px' }}>⏳</span>
              <span>Your ticket is pending admin approval. Check back soon.</span>
            </div>
          )}

          {/* Ticket card */}
          <div style={styles.ticketCard}>
            <div style={styles.watermark}>{ticket.guestName}</div>

            {/* Selfie — dominant, first thing on the ticket */}
            {ticket.selfieUrl && (
              <div style={{ textAlign: 'center', paddingTop: '8px', position: 'relative', zIndex: 1 }}>
                <img
                  src={ticket.selfieUrl}
                  alt={ticket.guestName}
                  crossOrigin="anonymous"
                  style={styles.selfieOnCard}
                />
              </div>
            )}

            <div style={{ ...styles.ticketHeader, position: 'relative', zIndex: 1 }}>
              <p style={styles.ticketPre}>ATTENDANCE TICKET</p>
              <h2 style={styles.ticketCouple}>Bamai &amp; Kazah</h2>
              <p style={styles.ticketDate}>11 April 2026 · Kaduna</p>
            </div>

            <div style={styles.ticketDivider} />

            <div style={{ ...styles.ticketBody, position: 'relative', zIndex: 1 }}>
              <div style={styles.ticketInfo}>
                <p style={styles.ticketLabel}>GUEST NAME</p>
                <p style={styles.ticketName}>{ticket.guestName}</p>
                <p style={{ ...styles.ticketLabel, marginTop: '16px' }}>ATTENDANCE ID</p>
                <p style={styles.ticketId}>{ticket.ticketId}</p>
                {ticket.createdAt && (
                  <>
                    <p style={{ ...styles.ticketLabel, marginTop: '12px' }}>SUBMITTED</p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', margin: 0 }}>{formatDate(ticket.createdAt)}</p>
                  </>
                )}
                <div style={{ marginTop: '12px' }}>
                  <span style={{ ...styles.statusBadge, background: statusStyle.bg, color: statusStyle.color, border: statusStyle.border }}>
                    {statusStyle.label}
                  </span>
                </div>
              </div>
              {qrDataUrl && (
                <div style={styles.ticketQR}>
                  <img src={qrDataUrl} alt="QR Code" style={{ width: '110px', height: '110px' }} />
                  <p style={styles.ticketQRLabel}>Scan to verify</p>
                </div>
              )}
            </div>

            {ticket.checkedIn && (
              <div style={{ ...styles.checkedInBanner, position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: '18px' }}>✅</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#4ade80' }}>
                  Checked in at the venue
                  {ticket.checkedInAt ? ` · ${new Date(ticket.checkedInAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
                </span>
              </div>
            )}

            <div style={{ ...styles.ticketFooter, position: 'relative', zIndex: 1 }}>
              <p style={styles.ticketVenue}>Our Lady of Fatima Chaplaincy, Sabon Tasha · Epitome Event Center, Barnawa</p>
            </div>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <a href={`/ticket/${ticket.ticketId}`} target="_blank" rel="noreferrer" style={styles.viewFullBtn}>
              🎟️ View Full Ticket Page
            </a>
            <button onClick={shareToWhatsApp} style={styles.whatsappBtn}>
              💬 Share on WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { fontSize: 'clamp(22px, 3.5vw, 30px)', color: '#2D2020', margin: '0 0 6px' },
  subtitle: { color: '#7A6060', marginBottom: '28px', fontSize: '14px' },

  formCard: {
    background: 'white', borderRadius: '20px', padding: '32px',
    border: '1px solid #EDE0D8',
    boxShadow: '0 4px 24px rgba(122,20,40,0.07)',
    maxWidth: '440px', margin: '0 auto 32px',
  },
  fullBtn: { width: '100%', justifyContent: 'center', padding: '14px', marginTop: '4px' },
  noTicketNote: { textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#7A6060' },

  ticketSection: { maxWidth: '480px', margin: '0 auto' },

  selfieOnCard: {
    width: '300px', height: '300px', borderRadius: '50%',
    objectFit: 'cover', objectPosition: 'center top',
    border: '4px solid #C4956A',
    boxShadow: '0 0 0 6px rgba(196,149,106,0.2), 0 8px 32px rgba(0,0,0,0.4)',
    display: 'block', margin: '0 auto',
  },

  verifiedBanner: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'linear-gradient(135deg, #065F46, #047857)',
    color: 'white', padding: '12px 20px', borderRadius: '12px',
    marginBottom: '16px', fontSize: '14px', fontWeight: '600',
  },
  rejectedBanner: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#FEE2E2', color: '#991B1B',
    padding: '12px 20px', borderRadius: '12px',
    marginBottom: '16px', fontSize: '14px', fontWeight: '600',
  },
  pendingBanner: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#FEF3C7', color: '#92400E',
    padding: '12px 20px', borderRadius: '12px',
    marginBottom: '16px', fontSize: '14px', fontWeight: '600',
  },

  ticketCard: {
    background: 'linear-gradient(160deg, #7A1428 0%, #5C0F1E 100%)',
    borderRadius: '20px', overflow: 'hidden',
    boxShadow: '0 12px 48px rgba(122,20,40,0.3)',
    marginBottom: '20px',
    position: 'relative',
  },
  watermark: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%) rotate(-30deg)',
    fontSize: '36px', fontWeight: '300', color: 'white',
    opacity: 0.08, pointerEvents: 'none', whiteSpace: 'nowrap',
    zIndex: 0, letterSpacing: '2px',
  },
  ticketHeader: { padding: '12px 28px 16px', textAlign: 'center' },
  ticketPre: {
    fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase',
    color: 'rgba(196,149,106,0.9)', margin: '0 0 8px',
  },
  ticketCouple: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '32px', fontWeight: '600', color: 'white',
    margin: '0 0 4px', lineHeight: 1.1,
  },
  ticketDate: { fontSize: '13px', color: 'rgba(255,255,255,0.65)', margin: 0 },
  ticketDivider: { height: '1px', background: 'rgba(255,255,255,0.15)', margin: '0 28px' },
  ticketBody: {
    padding: '20px 28px 24px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
  },
  ticketInfo: { flex: 1 },
  ticketLabel: {
    fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase',
    color: 'rgba(196,149,106,0.8)', margin: '0 0 4px',
  },
  ticketName: {
    fontSize: '20px', fontWeight: '700', color: 'white',
    margin: '0 0 4px', lineHeight: 1.2,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
  ticketId: {
    fontSize: '22px', fontWeight: '800', color: '#C4956A',
    margin: '0 0 4px', letterSpacing: '1px', fontFamily: 'monospace',
  },
  statusBadge: {
    fontSize: '11px', fontWeight: '600', padding: '4px 12px',
    borderRadius: '20px', display: 'inline-block',
  },
  ticketQR: { textAlign: 'center', flexShrink: 0 },
  ticketQRLabel: { fontSize: '10px', color: 'rgba(255,255,255,0.5)', margin: '6px 0 0', letterSpacing: '1px' },
  checkedInBanner: {
    display: 'flex', gap: '10px', alignItems: 'center',
    background: 'rgba(34,197,94,0.15)', padding: '12px 28px',
    borderTop: '1px solid rgba(74,222,128,0.2)',
  },
  ticketFooter: {
    padding: '14px 28px', borderTop: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.15)',
  },
  ticketVenue: { fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: 0, textAlign: 'center', lineHeight: '1.6' },

  actions: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' },
  viewFullBtn: {
    display: 'block', padding: '13px', textAlign: 'center',
    background: '#7A1428', color: 'white', borderRadius: '50px',
    textDecoration: 'none', fontSize: '14px', fontWeight: '600',
  },
  whatsappBtn: {
    padding: '13px', background: '#25D366', color: 'white', border: 'none',
    borderRadius: '50px', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
  },
};
