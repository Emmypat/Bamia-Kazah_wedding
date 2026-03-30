import React, { useState, useEffect } from 'react';
import { getMyQuota, issueTicket } from '../utils/api';
import { getCurrentUser } from '../utils/auth';

export default function CoordinatorDashboard() {
  const [quota, setQuota] = useState(null);
  const [loadingQuota, setLoadingQuota] = useState(true);
  const [user, setUser] = useState(null);

  // Issue ticket form
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [selfieFile, setSelfieFile] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState(null);
  const [issueError, setIssueError] = useState('');

  // Issued tickets list (session only — no persist)
  const [issuedList, setIssuedList] = useState([]);

  useEffect(() => {
    getCurrentUser().then(setUser);
    loadQuota();
  }, []);

  async function loadQuota() {
    setLoadingQuota(true);
    try {
      const data = await getMyQuota();
      setQuota(data);
    } catch {
      setQuota(null);
    } finally {
      setLoadingQuota(false);
    }
  }

  async function handleIssue(e) {
    e.preventDefault();
    if (quota && quota.quotaRemaining <= 0) {
      setIssueError('Your ticket quota is exhausted. Contact an admin to request more.');
      return;
    }
    setIssuing(true);
    setIssueError('');
    setIssueResult(null);
    try {
      const result = await issueTicket({ guestName: guestName.trim(), phone: phone.trim(), selfieFile });
      setIssueResult(result);
      setIssuedList(prev => [result, ...prev]);
      // Refresh quota
      await loadQuota();
      // Reset form
      setGuestName('');
      setPhone('');
      setSelfieFile(null);
      // Clear file input
      const fileInput = document.getElementById('coord-selfie-input');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to issue ticket.';
      setIssueError(msg);
    } finally {
      setIssuing(false);
    }
  }

  const quotaExhausted = quota && quota.quotaRemaining <= 0;
  const quotaPct = quota ? Math.round((quota.quotaUsed / quota.quotaTotal) * 100) : 0;

  return (
    <div className="page">
      <h1 style={styles.title}>Registrar Dashboard</h1>
      {user && <p style={styles.subtitle}>Welcome, {quota?.name || user.username}</p>}

      {/* Quota card */}
      <div style={styles.quotaCard}>
        <p style={styles.quotaLabel}>YOUR TICKET QUOTA</p>
        {loadingQuota ? (
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Loading...</p>
        ) : quota ? (
          <>
            <div style={styles.quotaNumbers}>
              <div style={styles.quotaStat}>
                <span style={styles.quotaBig}>{quota.quotaRemaining}</span>
                <span style={styles.quotaSmall}>Remaining</span>
              </div>
              <div style={styles.quotaDivider} />
              <div style={styles.quotaStat}>
                <span style={styles.quotaBig}>{quota.quotaUsed}</span>
                <span style={styles.quotaSmall}>Issued</span>
              </div>
              <div style={styles.quotaDivider} />
              <div style={styles.quotaStat}>
                <span style={styles.quotaBig}>{quota.quotaTotal}</span>
                <span style={styles.quotaSmall}>Total</span>
              </div>
            </div>
            {/* Progress bar */}
            <div style={styles.progressBg}>
              <div style={{ ...styles.progressFill, width: `${Math.min(quotaPct, 100)}%`, background: quotaExhausted ? '#f87171' : '#4ade80' }} />
            </div>
            {quotaExhausted && (
              <p style={styles.exhaustedNote}>Quota exhausted — contact an admin to get more tickets.</p>
            )}
            {!quota.isActive && (
              <p style={{ ...styles.exhaustedNote, background: 'rgba(239,68,68,0.2)' }}>
                Your account is currently inactive. Contact the wedding team.
              </p>
            )}
          </>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Could not load quota.</p>
        )}
      </div>

      {/* Issue ticket form */}
      <div style={styles.formCard}>
        <h2 style={styles.sectionTitle}>Issue a Ticket</h2>
        <p style={styles.sectionSubtitle}>Fill in the guest's details. Ticket is immediately approved.</p>

        <form onSubmit={handleIssue}>
          <div className="form-group">
            <label>Guest Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Amina Yusuf"
              value={guestName}
              onChange={e => { setGuestName(e.target.value); setIssueError(''); }}
              required
              disabled={quotaExhausted || (quota && !quota.isActive)}
            />
          </div>
          <div className="form-group">
            <label>Phone Number (optional)</label>
            <input
              type="tel"
              placeholder="08012345678"
              value={phone}
              onChange={e => { setPhone(e.target.value); setIssueError(''); }}
              disabled={quotaExhausted || (quota && !quota.isActive)}
            />
          </div>
          <div className="form-group">
            <label>Guest Selfie (optional)</label>
            <input
              id="coord-selfie-input"
              type="file"
              accept="image/*"
              capture="user"
              onChange={e => setSelfieFile(e.target.files[0] || null)}
              disabled={quotaExhausted || (quota && !quota.isActive)}
            />
            <p style={styles.hint}>Take or upload a selfie of the guest. Default image used if skipped.</p>
          </div>

          {issueError && <div className="alert alert-error" style={{ marginBottom: '12px' }}>{issueError}</div>}
          {issueResult && (
            <div className="alert alert-success" style={{ marginBottom: '12px' }}>
              Ticket issued! ID: <strong>{issueResult.ticketId}</strong> for {issueResult.guestName}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.fullBtn}
            disabled={issuing || quotaExhausted || !guestName.trim() || (quota && !quota.isActive)}
          >
            {issuing ? 'Issuing...' : quotaExhausted ? 'Quota Exhausted' : 'Issue Ticket →'}
          </button>
        </form>
      </div>

      {/* Issued this session */}
      {issuedList.length > 0 && (
        <div style={styles.issuedSection}>
          <h2 style={styles.sectionTitle}>Issued This Session</h2>
          {issuedList.map(t => (
            <div key={t.ticketId} style={styles.issuedRow}>
              <div>
                <p style={styles.issuedName}>{t.guestName}</p>
                <p style={styles.issuedId}>{t.ticketId}</p>
                {t.phone && <p style={styles.issuedPhone}>{t.phone}</p>}
              </div>
              <a
                href={`/ticket/${t.ticketId}`}
                target="_blank"
                rel="noreferrer"
                style={styles.viewBtn}
              >
                View →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { fontSize: 'clamp(22px, 3.5vw, 30px)', color: '#2D2020', margin: '0 0 4px' },
  subtitle: { color: '#7A6060', marginBottom: '24px', fontSize: '14px' },

  quotaCard: {
    background: 'linear-gradient(135deg, #7A1428, #5C0F1E)',
    borderRadius: '20px', padding: '28px 32px',
    maxWidth: '560px', margin: '0 auto 28px',
    boxShadow: '0 8px 32px rgba(122,20,40,0.25)',
  },
  quotaLabel: {
    fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase',
    color: 'rgba(196,149,106,0.9)', margin: '0 0 16px',
  },
  quotaNumbers: { display: 'flex', gap: '0', alignItems: 'center', marginBottom: '16px' },
  quotaStat: { flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' },
  quotaBig: { fontSize: '36px', fontWeight: '700', color: 'white', lineHeight: 1 },
  quotaSmall: { fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' },
  quotaDivider: { width: '1px', height: '48px', background: 'rgba(255,255,255,0.2)' },
  progressBg: { height: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '3px', transition: 'width 0.4s' },
  exhaustedNote: {
    marginTop: '10px', fontSize: '12px', color: '#fbbf24',
    background: 'rgba(251,191,36,0.1)', padding: '8px 12px', borderRadius: '8px',
  },

  formCard: {
    background: 'white', borderRadius: '20px', padding: '32px',
    border: '1px solid #EDE0D8',
    boxShadow: '0 4px 24px rgba(122,20,40,0.07)',
    maxWidth: '560px', margin: '0 auto 28px',
  },
  sectionTitle: { fontSize: '18px', color: '#2D2020', margin: '0 0 4px' },
  sectionSubtitle: { fontSize: '13px', color: '#7A6060', marginBottom: '20px' },
  fullBtn: { width: '100%', justifyContent: 'center', padding: '14px', marginTop: '4px' },
  hint: { fontSize: '12px', color: '#9A8080', margin: '4px 0 0' },

  issuedSection: { maxWidth: '560px', margin: '0 auto 24px' },
  issuedRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'white', border: '1px solid #EDE0D8', borderRadius: '12px',
    padding: '14px 20px', marginBottom: '10px',
    boxShadow: '0 2px 8px rgba(122,20,40,0.04)',
  },
  issuedName: { fontWeight: '600', color: '#2D2020', margin: 0, fontSize: '15px' },
  issuedId: { fontFamily: 'monospace', color: '#C4956A', fontSize: '13px', margin: '2px 0 0', fontWeight: '700' },
  issuedPhone: { fontSize: '12px', color: '#7A6060', margin: '2px 0 0' },
  viewBtn: {
    background: '#7A1428', color: 'white', padding: '8px 16px',
    borderRadius: '20px', fontSize: '12px', fontWeight: '600',
    textDecoration: 'none', flexShrink: 0,
  },
};
