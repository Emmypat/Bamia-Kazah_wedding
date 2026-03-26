import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { registerOrLoginGuest, logout } from '../utils/auth';
import { createTicket } from '../utils/api';

function phoneToEmail(phone) {
  let digits = phone.replace(/\s+/g, '').replace(/^\+/, '');
  if (digits.startsWith('0')) digits = '234' + digits.slice(1);
  return `${digits}@weddingguest.ng`;
}

function isPhoneInput(value) {
  const clean = value.replace(/\s+/g, '');
  return /^(\+234|234|0)[789]\d{8,9}$/.test(clean) || /^0\d{10}$/.test(clean);
}

// Steps: 'info' → 'selfie' → 'generating' → 'ticket'
export default function GetTicket() {
  const [step, setStep] = useState('info');
  const [form, setForm] = useState({ name: '', phone: '' });
  const [selfie, setSelfie] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ticketRef = useRef(null);

  useEffect(() => {
    if (ticket?.ticketId) {
      QRCode.toDataURL(ticket.ticketId, {
        width: 150, margin: 1,
        color: { dark: '#7A1428', light: '#FFFFFF' },
      }).then(setQrDataUrl);
    }
  }, [ticket]);

  async function handleInfo(e) {
    e.preventDefault();
    if (!isPhoneInput(form.phone)) {
      setError('Please enter a valid Nigerian phone number (e.g. 08012345678).');
      return;
    }
    setLoading(true); setError('');
    try {
      const email = phoneToEmail(form.phone);
      await logout().catch(() => {});
      await registerOrLoginGuest({ name: form.name, email, phone: form.phone });
      setStep('selfie');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  }

  function handleSelfieSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelfie(file);
    setSelfiePreview(URL.createObjectURL(file));
    setError('');
  }

  async function handleGenerateTicket() {
    if (!selfie) return;
    setLoading(true); setError('');
    try {
      const data = await createTicket({ selfieFile: selfie, guestName: form.name, phone: form.phone });
      setTicket(data);
      setStep('ticket');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to generate ticket. Please try again.');
    } finally { setLoading(false); }
  }

  async function downloadAsPDF() {
    if (!ticketRef.current) return;
    try {
      const canvas = await html2canvas(ticketRef.current, { scale: 2, useCORS: true, backgroundColor: '#7A1428' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [90, 140] });
      pdf.addImage(imgData, 'PNG', 0, 0, 90, 140);
      pdf.save(`BamaiKazah-Ticket-${ticket.ticketId}.pdf`);
    } catch (err) {
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
    } catch (err) {
      alert('Image download failed. Please try again.');
    }
  }

  function shareToWhatsApp() {
    const text = `I'm attending Bamai & Kazah's Wedding on 11 April 2026!\nMy attendance ID: ${ticket.ticketId}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="page">
      <h1 style={styles.title}>Get My Ticket</h1>
      <p style={styles.subtitle}>
        Generate your personal attendance ticket with a unique ID and QR code.
      </p>

      {/* ── Step indicators ─────────────────── */}
      <div style={styles.steps}>
        {['Your Info', 'Take Selfie', 'Your Ticket'].map((label, i) => {
          const stepNum = i + 1;
          const currentStep = step === 'info' ? 1 : step === 'selfie' ? 2 : 3;
          return (
            <div key={label} style={styles.stepItem}>
              <div style={{ ...styles.stepCircle, ...(stepNum <= currentStep ? styles.stepActive : {}) }}>
                {stepNum < currentStep ? '✓' : stepNum}
              </div>
              <span style={{ ...styles.stepLabel, ...(stepNum <= currentStep ? { color: '#7A1428', fontWeight: '600' } : {}) }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {error && <div className="alert alert-error" style={{ maxWidth: '520px', margin: '0 auto 16px' }}>{error}</div>}

      {/* ── Step 1: Info ──────────────────────── */}
      {step === 'info' && (
        <div style={styles.formCard}>
          <h2 style={styles.cardTitle}>Enter your details</h2>
          <p style={styles.cardDesc}>This will appear on your ticket.</p>
          <form onSubmit={handleInfo}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                placeholder="e.g. Bamai Patrick"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                placeholder="08012345678 or +2348012345678"
                value={form.phone}
                onChange={e => { setForm({ ...form, phone: e.target.value }); setError(''); }}
                required
              />
              {form.phone && (
                <span style={{ fontSize: '12px', marginTop: '4px', display: 'block',
                  color: isPhoneInput(form.phone) ? '#166534' : '#7A6060' }}>
                  {isPhoneInput(form.phone) ? '✓ Phone number accepted' : 'Enter a valid Nigerian number'}
                </span>
              )}
            </div>
            <button type="submit" className="btn btn-primary" style={styles.fullBtn} disabled={loading}>
              {loading ? 'Verifying...' : 'Continue →'}
            </button>
          </form>
        </div>
      )}

      {/* ── Step 2: Selfie ────────────────────── */}
      {step === 'selfie' && (
        <div style={styles.formCard}>
          <h2 style={styles.cardTitle}>Take a selfie</h2>
          <p style={styles.cardDesc}>
            Your selfie will be reviewed by the admin for identity verification.
            Use a clear, well-lit photo.
          </p>

          {selfiePreview ? (
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <img src={selfiePreview} alt="Your selfie" style={styles.selfiePreview} />
              <button
                onClick={() => { setSelfie(null); setSelfiePreview(null); }}
                style={styles.changeBtn}
              >
                Choose a different photo
              </button>
            </div>
          ) : (
            <label style={styles.selfieDropzone}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>🤳</span>
              <span style={{ fontWeight: '600', fontSize: '15px', color: '#5C3D2E', display: 'block', marginBottom: '6px' }}>
                Tap to take or upload a selfie
              </span>
              <span style={{ fontSize: '13px', color: '#7A6060' }}>Clear, front-facing photo</span>
              <input type="file" accept="image/*" onChange={handleSelfieSelect} style={{ display: 'none' }} />
            </label>
          )}

          <button
            className="btn btn-primary"
            style={styles.fullBtn}
            onClick={handleGenerateTicket}
            disabled={!selfie || loading}
          >
            {loading ? 'Generating ticket...' : 'Generate My Ticket →'}
          </button>
          <button
            style={styles.backBtn}
            onClick={() => { setStep('info'); setError(''); }}
          >
            ← Back
          </button>
        </div>
      )}

      {/* ── Step 3: Ticket ────────────────────── */}
      {step === 'ticket' && ticket && (
        <div style={styles.ticketSection}>
          {/* The printable / downloadable ticket */}
          <div ref={ticketRef} style={styles.ticketCard}>
            {/* Watermark */}
            <div style={styles.ticketWatermark}>{ticket.guestName}</div>

            {/* Header */}
            <div style={{ ...styles.ticketHeader, position: 'relative', zIndex: 1 }}>
              <p style={styles.ticketPre}>ATTENDANCE TICKET</p>
              <h2 style={styles.ticketCouple}>Bamai &amp; Kazah</h2>
              <p style={styles.ticketDate}>11 April 2026 · Kaduna</p>
            </div>

            {/* Divider */}
            <div style={styles.ticketDivider} />

            {/* Guest info + QR */}
            <div style={{ ...styles.ticketBody, position: 'relative', zIndex: 1 }}>
              <div style={styles.ticketInfo}>
                <p style={styles.ticketLabel}>GUEST NAME</p>
                <p style={styles.ticketName}>{ticket.guestName}</p>
                <p style={{ ...styles.ticketLabel, marginTop: '16px' }}>ATTENDANCE ID</p>
                <p style={styles.ticketId}>{ticket.ticketId}</p>
                <div style={styles.ticketStatus}>
                  <span style={{
                    ...styles.statusBadge,
                    ...(ticket.status === 'approved' ? styles.statusApproved : styles.statusPending),
                  }}>
                    {ticket.status === 'approved' ? '✓ Verified' : '⏳ Pending Verification'}
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
            <div style={{ ...styles.ticketFooter, position: 'relative', zIndex: 1 }}>
              <p style={styles.ticketVenue}>Our Lady of Fatima Chaplaincy, Sabon Tasha · Epitome Event Center, Barnawa</p>
            </div>
          </div>

          {/* Pending notice */}
          {ticket.status !== 'approved' && (
            <div style={styles.pendingNotice}>
              <span style={{ fontSize: '20px' }}>⏳</span>
              <p style={{ margin: 0, fontSize: '14px', color: '#92400e', lineHeight: '1.6' }}>
                <strong>Your ticket is pending admin verification.</strong><br />
                You can download and share it now. A verified badge will appear once approved.
              </p>
            </div>
          )}

          {/* Action buttons */}
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
            <button onClick={handlePrint} style={styles.actionBtn2}>
              🖨️ Print
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#7A6060', marginTop: '12px' }}>
            Ticket ID: <strong>{ticket.ticketId}</strong> · Save this for your records
          </p>
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { fontSize: 'clamp(24px, 4vw, 34px)', color: '#2D2020', margin: '0 0 8px' },
  subtitle: { color: '#7A6060', marginBottom: '32px', fontSize: '15px' },

  steps: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', marginBottom: '32px', flexWrap: 'wrap',
  },
  stepItem: { display: 'flex', alignItems: 'center', gap: '8px' },
  stepCircle: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: '#EDE0D8', color: '#7A6060',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: '700',
  },
  stepActive: { background: '#7A1428', color: 'white' },
  stepLabel: { fontSize: '13px', color: '#7A6060' },

  formCard: {
    background: 'white', borderRadius: '20px', padding: '36px',
    border: '1px solid #EDE0D8',
    boxShadow: '0 4px 24px rgba(122,20,40,0.07)',
    maxWidth: '520px', margin: '0 auto',
  },
  cardTitle: { fontSize: '22px', color: '#2D2020', margin: '0 0 6px' },
  cardDesc: { fontSize: '14px', color: '#7A6060', margin: '0 0 24px', lineHeight: '1.6' },
  fullBtn: { width: '100%', justifyContent: 'center', padding: '14px', marginTop: '8px' },
  backBtn: {
    width: '100%', marginTop: '10px', background: 'none',
    border: 'none', color: '#7A6060', fontSize: '14px',
    cursor: 'pointer', padding: '8px',
  },

  selfieDropzone: {
    display: 'block', padding: '36px 16px',
    border: '2px dashed #C4956A', borderRadius: '14px',
    textAlign: 'center', cursor: 'pointer',
    background: '#FDF6EE', marginBottom: '24px',
  },
  selfiePreview: {
    width: '150px', height: '150px', borderRadius: '50%',
    objectFit: 'cover', border: '3px solid #7A1428',
    display: 'block', margin: '0 auto 12px',
  },
  changeBtn: {
    background: 'none', border: 'none', color: '#C4956A',
    fontSize: '13px', cursor: 'pointer', textDecoration: 'underline',
    display: 'block', margin: '0 auto',
  },

  /* Ticket */
  ticketSection: { maxWidth: '420px', margin: '0 auto' },
  ticketCard: {
    background: 'linear-gradient(160deg, #7A1428 0%, #5C0F1E 100%)',
    borderRadius: '20px', overflow: 'hidden',
    boxShadow: '0 12px 48px rgba(122,20,40,0.3)',
    marginBottom: '20px',
    fontFamily: 'Inter, sans-serif',
    position: 'relative',
  },
  ticketWatermark: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%) rotate(-30deg)',
    fontSize: '36px', fontWeight: '300', color: 'white',
    opacity: 0.08, pointerEvents: 'none', whiteSpace: 'nowrap',
    zIndex: 0, letterSpacing: '2px',
  },
  ticketHeader: {
    padding: '28px 28px 20px', textAlign: 'center',
  },
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
  ticketDivider: {
    height: '1px',
    background: 'rgba(255,255,255,0.15)',
    margin: '0 28px',
  },
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
    margin: '0 0 16px', lineHeight: 1.2,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
  ticketId: {
    fontSize: '22px', fontWeight: '800', color: '#C4956A',
    margin: '0 0 12px', letterSpacing: '1px',
    fontFamily: 'monospace',
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
    padding: '14px 28px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.15)',
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
