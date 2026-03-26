import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getPublicTicket } from '../utils/api';

export default function TicketView() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const ticketRef = useRef(null);

  useEffect(() => {
    if (!ticketId) { setError('No ticket ID provided.'); setLoading(false); return; }
    getPublicTicket(ticketId)
      .then(data => { setTicket(data); setLoading(false); })
      .catch(err => {
        setError(err.response?.status === 404 ? 'Ticket not found.' : 'Failed to load ticket.');
        setLoading(false);
      });
  }, [ticketId]);

  useEffect(() => {
    if (ticket?.ticketId) {
      QRCode.toDataURL(ticket.ticketId, {
        width: 150, margin: 1,
        color: { dark: '#7A1428', light: '#FFFFFF' },
      }).then(setQrDataUrl);
    }
  }, [ticket]);

  async function downloadAsPDF() {
    if (!ticketRef.current) return;
    try {
      const canvas = await html2canvas(ticketRef.current, { scale: 2, useCORS: true, backgroundColor: '#7A1428' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [90, 140] });
      pdf.addImage(imgData, 'PNG', 0, 0, 90, 140);
      pdf.save(`BamaiKazah-Ticket-${ticket.ticketId}.pdf`);
    } catch {
      alert('PDF download failed. Try "Download as Image" instead.');
    }
  }

  async function downloadAsImage() {
    if (!ticketRef.current) return;
    try {
      const canvas = await html2canvas(ticketRef.current, { scale: 3, useCORS: true, backgroundColor: '#7A1428' });
      const link = document.createElement('a');
      link.download = `BamaiKazah-Ticket-${ticket.ticketId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      alert('Image download failed. Please try again.');
    }
  }

  function shareToWhatsApp() {
    const text = `I'm attending Bamai & Kazah's Wedding on 11 April 2026!\nMy attendance ID: ${ticket.ticketId}\nView ticket: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: '#7A6060' }}>Loading ticket...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎟️</div>
        <p style={{ color: '#991B1B', fontWeight: '600' }}>{error}</p>
        <a href="/" style={{ color: '#7A1428', textDecoration: 'none', fontSize: '14px' }}>← Back to home</a>
      </div>
    );
  }

  const isApproved = ticket?.status === 'approved';

  return (
    <div className="page">
      <h1 style={styles.title}>Attendance Ticket</h1>
      <p style={styles.subtitle}>Bamai &amp; Kazah Wedding · 11 April 2026</p>

      <div style={styles.ticketSection}>
        {/* Verified banner */}
        {isApproved && (
          <div style={styles.verifiedBanner}>
            <span style={{ fontSize: '18px' }}>✓</span>
            <span>This ticket has been verified by the wedding team</span>
          </div>
        )}

        {/* Guest selfie */}
        {ticket.selfieUrl && (
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <img
              src={ticket.selfieUrl}
              alt={ticket.guestName}
              crossOrigin="anonymous"
              style={styles.selfiePhoto}
            />
          </div>
        )}

        {/* Ticket card */}
        <div ref={ticketRef} style={styles.ticketCard}>
          {/* Watermark */}
          <div style={styles.watermark}>{ticket.guestName}</div>

          {/* Selfie inside downloadable card */}
          {ticket.selfieUrl && (
            <div style={{ textAlign: 'center', paddingTop: '20px', position: 'relative', zIndex: 1 }}>
              <img
                src={ticket.selfieUrl}
                alt={ticket.guestName}
                crossOrigin="anonymous"
                style={styles.selfieOnCard}
              />
            </div>
          )}

          {/* Header */}
          <div style={styles.ticketHeader}>
            <p style={styles.ticketPre}>ATTENDANCE TICKET</p>
            <h2 style={styles.ticketCouple}>Bamai &amp; Kazah</h2>
            <p style={styles.ticketDate}>11 April 2026 · Kaduna</p>
          </div>

          <div style={styles.ticketDivider} />

          {/* Body */}
          <div style={styles.ticketBody}>
            <div style={styles.ticketInfo}>
              <p style={styles.ticketLabel}>GUEST NAME</p>
              <p style={styles.ticketName}>{ticket.guestName}</p>
              <p style={{ ...styles.ticketLabel, marginTop: '16px' }}>ATTENDANCE ID</p>
              <p style={styles.ticketId}>{ticket.ticketId}</p>
              <div style={styles.ticketStatus}>
                <span style={{
                  ...styles.statusBadge,
                  ...(isApproved ? styles.statusApproved : styles.statusPending),
                }}>
                  {isApproved ? '✓ Verified' : '⏳ Pending Verification'}
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

          {/* Footer */}
          <div style={styles.ticketFooter}>
            <p style={styles.ticketVenue}>Our Lady of Fatima Chaplaincy, Sabon Tasha · Epitome Event Center, Barnawa</p>
          </div>
        </div>

        {/* Pending notice */}
        {!isApproved && (
          <div style={styles.pendingNotice}>
            <span style={{ fontSize: '20px' }}>⏳</span>
            <p style={{ margin: 0, fontSize: '14px', color: '#92400e', lineHeight: '1.6' }}>
              <strong>Pending verification.</strong><br />
              The wedding team will review and approve your ticket shortly.
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={styles.ticketActions}>
          <button onClick={downloadAsPDF} className="btn btn-primary" style={styles.actionBtn}>
            📄 Download PDF
          </button>
          <button onClick={downloadAsImage} className="btn btn-secondary" style={styles.actionBtn}>
            🖼️ Download Image
          </button>
          <button onClick={shareToWhatsApp} style={{ ...styles.actionBtn, ...styles.whatsappBtn }}>
            💬 Share on WhatsApp
          </button>
          <button onClick={() => window.print()} style={styles.actionBtn2}>
            🖨️ Print
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#7A6060', marginTop: '12px' }}>
          Ticket ID: <strong>{ticket.ticketId}</strong> · Save this for your records
        </p>
      </div>
    </div>
  );
}

const styles = {
  centered: {
    minHeight: '60vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: '40px 16px',
  },
  title: { fontSize: 'clamp(22px, 3.5vw, 30px)', color: '#2D2020', margin: '0 0 6px', textAlign: 'center' },
  subtitle: { color: '#7A6060', marginBottom: '28px', fontSize: '14px', textAlign: 'center' },

  ticketSection: { maxWidth: '420px', margin: '0 auto' },

  selfiePhoto: {
    width: '200px', height: '200px', borderRadius: '50%',
    objectFit: 'cover', border: '4px solid #7A1428', display: 'block', margin: '0 auto',
    boxShadow: '0 4px 20px rgba(122,20,40,0.25)',
  },
  selfieOnCard: {
    width: '120px', height: '120px', borderRadius: '50%',
    objectFit: 'cover', border: '3px solid rgba(196,149,106,0.8)',
    display: 'block', margin: '0 auto',
  },
  verifiedBanner: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'linear-gradient(135deg, #065F46, #047857)',
    color: 'white', padding: '12px 20px', borderRadius: '12px',
    marginBottom: '16px', fontSize: '14px', fontWeight: '600',
  },

  ticketCard: {
    background: 'linear-gradient(160deg, #7A1428 0%, #5C0F1E 100%)',
    borderRadius: '20px', overflow: 'hidden',
    boxShadow: '0 12px 48px rgba(122,20,40,0.3)',
    marginBottom: '20px',
    fontFamily: 'Inter, sans-serif',
    position: 'relative',
  },
  watermark: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%) rotate(-30deg)',
    fontSize: '36px', fontWeight: '300', color: 'white',
    opacity: 0.08, pointerEvents: 'none', whiteSpace: 'nowrap',
    zIndex: 0, letterSpacing: '2px',
  },
  ticketHeader: { padding: '16px 28px 20px', textAlign: 'center', position: 'relative', zIndex: 1 },
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
    padding: '20px 28px 24px', position: 'relative', zIndex: 1,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
  },
  ticketInfo: { flex: 1 },
  ticketLabel: {
    fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase',
    color: 'rgba(196,149,106,0.8)', margin: '0 0 4px',
  },
  ticketName: {
    fontSize: '20px', fontWeight: '700', color: 'white',
    margin: '0 0 16px', lineHeight: 1.2,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
  ticketId: {
    fontSize: '22px', fontWeight: '800', color: '#C4956A',
    margin: '0 0 12px', letterSpacing: '1px', fontFamily: 'monospace',
  },
  ticketStatus: { marginTop: '4px' },
  statusBadge: {
    fontSize: '11px', fontWeight: '600', padding: '4px 12px',
    borderRadius: '20px', display: 'inline-block',
  },
  statusApproved: { background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
  statusPending: { background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' },
  ticketQR: { textAlign: 'center', flexShrink: 0 },
  ticketQRLabel: { fontSize: '10px', color: 'rgba(255,255,255,0.5)', margin: '6px 0 0', letterSpacing: '1px' },
  ticketFooter: {
    padding: '14px 28px', borderTop: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.15)', position: 'relative', zIndex: 1,
  },
  ticketVenue: { fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: 0, textAlign: 'center', lineHeight: '1.6' },

  pendingNotice: {
    display: 'flex', gap: '12px', alignItems: 'flex-start',
    background: '#fffbeb', border: '1px solid #fde68a',
    borderRadius: '12px', padding: '14px 18px', marginBottom: '20px',
  },

  ticketActions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' },
  actionBtn: { padding: '12px', fontSize: '13px', justifyContent: 'center', fontWeight: '600' },
  whatsappBtn: { background: '#25D366', border: 'none', color: 'white', borderRadius: '50px', cursor: 'pointer' },
  actionBtn2: {
    gridColumn: '1 / -1', padding: '11px',
    background: 'none', border: '1px solid #EDE0D8', color: '#5C3D2E',
    borderRadius: '50px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
  },
};
