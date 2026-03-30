import React, { useState, useEffect, useRef } from 'react';
import {
  getCoordinators,
  createCoordinator,
  deactivateCoordinator,
  updateCoordinator,
  enhanceCoordinatorQuota,
  resetCoordinatorPassword,
  getCoordinatorTickets,
  getCoordinatorEnhancements,
} from '../utils/api';

export default function AdminCoordinators() {
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createQuota, setCreateQuota] = useState(20);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(null);

  // Enhance modal
  const [enhanceTarget, setEnhanceTarget] = useState(null);
  const [enhanceAdd, setEnhanceAdd] = useState(10);
  const [enhanceReason, setEnhanceReason] = useState('');
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState('');
  const [enhanceSuccess, setEnhanceSuccess] = useState('');

  // Expand detail
  const [expandedId, setExpandedId] = useState(null);
  const [expandData, setExpandData] = useState({});
  const [expandLoading, setExpandLoading] = useState(false);

  useEffect(() => { loadCoordinators(); }, []);

  async function loadCoordinators() {
    setLoading(true);
    setError('');
    try {
      const data = await getCoordinators();
      setCoordinators(data.coordinators || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load coordinators.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    setCreateSuccess(null);
    try {
      const result = await createCoordinator({
        name: createName.trim(),
        email: createEmail.trim(),
        phone: createPhone.trim(),
        initialQuota: Number(createQuota),
      });
      setCreateSuccess(result);
      setCreateName(''); setCreateEmail(''); setCreatePhone(''); setCreateQuota(20);
      await loadCoordinators();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create coordinator.');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(coord) {
    if (!window.confirm(`${coord.isActive ? 'Deactivate' : 'Reactivate'} ${coord.name}?`)) return;
    try {
      if (coord.isActive) {
        await deactivateCoordinator(coord.userId);
      } else {
        await updateCoordinator(coord.userId, { isActive: true });
      }
      await loadCoordinators();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed.');
    }
  }

  async function handleResetPassword(coord) {
    if (!window.confirm(`Reset password for ${coord.name}? A new temporary password will be emailed.`)) return;
    try {
      await resetCoordinatorPassword(coord.userId);
      alert(`Password reset email sent to ${coord.email}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Reset failed.');
    }
  }

  async function openEnhance(coord) {
    setEnhanceTarget(coord);
    setEnhanceAdd(10);
    setEnhanceReason('');
    setEnhanceError('');
    setEnhanceSuccess('');
  }

  async function handleEnhance(e) {
    e.preventDefault();
    if (!enhanceTarget) return;
    setEnhancing(true);
    setEnhanceError('');
    setEnhanceSuccess('');
    try {
      const result = await enhanceCoordinatorQuota(enhanceTarget.userId, Number(enhanceAdd), enhanceReason.trim());
      setEnhanceSuccess(`Quota updated: ${result.previousTotal} → ${result.newTotal} (${result.quotaRemaining} remaining)`);
      await loadCoordinators();
      if (expandedId === enhanceTarget.userId) {
        await loadExpandData(enhanceTarget.userId);
      }
    } catch (err) {
      setEnhanceError(err.response?.data?.error || 'Enhancement failed.');
    } finally {
      setEnhancing(false);
    }
  }

  async function toggleExpand(id) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    await loadExpandData(id);
  }

  async function loadExpandData(id) {
    setExpandLoading(true);
    try {
      const [ticketsRes, enhancementsRes] = await Promise.all([
        getCoordinatorTickets(id),
        getCoordinatorEnhancements(id),
      ]);
      setExpandData(prev => ({
        ...prev,
        [id]: {
          tickets: ticketsRes.tickets || [],
          enhancements: enhancementsRes.enhancements || [],
        },
      }));
    } catch {
      // silently fail
    } finally {
      setExpandLoading(false);
    }
  }

  const formatDate = iso => iso
    ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <div className="page">
      <h1 style={styles.title}>Coordinators</h1>
      <p style={styles.subtitle}>Manage registrar accounts and their ticket quotas</p>

      {/* Create coordinator */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader} onClick={() => setShowCreate(v => !v)}>
          <h2 style={styles.sectionTitle}>+ Add Coordinator</h2>
          <span style={{ color: '#7A6060', fontSize: '18px' }}>{showCreate ? '▲' : '▼'}</span>
        </div>
        {showCreate && (
          <form onSubmit={handleCreate} style={{ marginTop: '20px' }}>
            <div style={styles.formGrid}>
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" placeholder="e.g. Halima Musa" value={createName}
                  onChange={e => setCreateName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input type="email" placeholder="coordinator@example.com" value={createEmail}
                  onChange={e => setCreateEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Phone (optional)</label>
                <input type="tel" placeholder="08012345678" value={createPhone}
                  onChange={e => setCreatePhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Initial Ticket Quota *</label>
                <input type="number" min="1" max="500" value={createQuota}
                  onChange={e => setCreateQuota(e.target.value)} required />
              </div>
            </div>
            {createError && <div className="alert alert-error" style={{ marginBottom: '12px' }}>{createError}</div>}
            {createSuccess && (
              <div className="alert alert-success" style={{ marginBottom: '12px' }}>
                Coordinator created! Temp password: <strong style={{ fontFamily: 'monospace' }}>{createSuccess.tempPassword}</strong>
                {' '}— sent by email to {createSuccess.email}
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Coordinator →'}
            </button>
          </form>
        )}
      </div>

      {/* Coordinators list */}
      {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#7A6060', padding: '40px' }}>Loading coordinators...</p>
      ) : coordinators.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ fontSize: '32px', margin: '0 0 8px' }}>👥</p>
          <p style={{ color: '#7A6060', fontSize: '15px' }}>No coordinators yet. Add one above.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {coordinators.map(coord => {
            const remaining = (coord.quotaTotal || 0) - (coord.quotaUsed || 0);
            const pct = coord.quotaTotal ? Math.round((coord.quotaUsed / coord.quotaTotal) * 100) : 0;
            const expanded = expandedId === coord.userId;
            const data = expandData[coord.userId];

            return (
              <div key={coord.userId} style={{ ...styles.coordCard, opacity: coord.isActive ? 1 : 0.6 }}>
                {/* Header row */}
                <div style={styles.coordHeader}>
                  <div style={styles.coordInfo}>
                    <span style={styles.coordName}>{coord.name}</span>
                    {!coord.isActive && <span style={styles.inactiveBadge}>INACTIVE</span>}
                    <span style={styles.coordEmail}>{coord.email}</span>
                    {coord.phone && <span style={styles.coordEmail}>{coord.phone}</span>}
                  </div>
                  <div style={styles.quotaDisplay}>
                    <span style={{ ...styles.quotaNum, color: remaining <= 0 ? '#f87171' : '#4ade80' }}>
                      {remaining}
                    </span>
                    <span style={styles.quotaOf}>/ {coord.quotaTotal} tickets</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={styles.progressBg}>
                  <div style={{
                    ...styles.progressFill,
                    width: `${Math.min(pct, 100)}%`,
                    background: remaining <= 0 ? '#f87171' : pct > 70 ? '#fbbf24' : '#4ade80',
                  }} />
                </div>
                <p style={styles.coordStat}>{coord.quotaUsed || 0} issued · {coord.quotaTotal || 0} total · since {formatDate(coord.createdAt)}</p>

                {/* Actions */}
                <div style={styles.actions}>
                  <button style={styles.actionBtn} onClick={() => openEnhance(coord)}>
                    + Add Quota
                  </button>
                  <button style={styles.actionBtn} onClick={() => handleResetPassword(coord)}>
                    Reset Password
                  </button>
                  <button
                    style={{ ...styles.actionBtn, color: coord.isActive ? '#991B1B' : '#065F46' }}
                    onClick={() => handleToggleActive(coord)}
                  >
                    {coord.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button
                    style={{ ...styles.actionBtn, color: '#7A1428', fontWeight: 700 }}
                    onClick={() => toggleExpand(coord.userId)}
                  >
                    {expanded ? 'Hide Details' : 'View Details'}
                  </button>
                </div>

                {/* Expand: tickets + enhancements */}
                {expanded && (
                  <div style={styles.expandSection}>
                    {expandLoading && !data ? (
                      <p style={{ color: '#7A6060', fontSize: '13px' }}>Loading...</p>
                    ) : data ? (
                      <>
                        <p style={styles.expandLabel}>TICKETS ISSUED ({data.tickets.length})</p>
                        {data.tickets.length === 0 ? (
                          <p style={styles.expandEmpty}>No tickets issued yet.</p>
                        ) : (
                          <div style={styles.ticketsMini}>
                            {data.tickets.slice(0, 10).map(t => (
                              <div key={t.ticketId} style={styles.miniRow}>
                                <span style={styles.miniName}>{t.guestName}</span>
                                <span style={{ ...styles.miniId }}>{t.ticketId}</span>
                                <a href={`/ticket/${t.ticketId}`} target="_blank" rel="noreferrer" style={styles.miniLink}>View</a>
                              </div>
                            ))}
                            {data.tickets.length > 10 && (
                              <p style={styles.expandEmpty}>...and {data.tickets.length - 10} more</p>
                            )}
                          </div>
                        )}

                        <p style={{ ...styles.expandLabel, marginTop: '16px' }}>QUOTA HISTORY ({data.enhancements.length})</p>
                        {data.enhancements.length === 0 ? (
                          <p style={styles.expandEmpty}>No enhancements yet.</p>
                        ) : (
                          data.enhancements.map(en => (
                            <div key={en.id} style={styles.enhRow}>
                              <span style={{ color: '#4ade80', fontWeight: 700 }}>+{en.added}</span>
                              <span style={{ color: '#7A6060', fontSize: '12px' }}>{en.reason || 'No reason given'}</span>
                              <span style={{ color: '#9A8080', fontSize: '11px' }}>{formatDate(en.createdAt)}</span>
                            </div>
                          ))
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Enhance modal */}
      {enhanceTarget && (
        <div style={styles.modalOverlay} onClick={() => setEnhanceTarget(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 4px', fontSize: '20px', color: '#2D2020' }}>Add Quota</h2>
            <p style={{ color: '#7A6060', fontSize: '13px', marginBottom: '20px' }}>
              For: <strong>{enhanceTarget.name}</strong> · Currently {(enhanceTarget.quotaTotal || 0) - (enhanceTarget.quotaUsed || 0)} remaining
            </p>
            <form onSubmit={handleEnhance}>
              <div className="form-group">
                <label>Tickets to Add *</label>
                <input type="number" min="1" max="500" value={enhanceAdd}
                  onChange={e => setEnhanceAdd(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Reason (optional)</label>
                <input type="text" placeholder="e.g. Extra VIP guests added"
                  value={enhanceReason} onChange={e => setEnhanceReason(e.target.value)} />
              </div>
              {enhanceError && <div className="alert alert-error" style={{ marginBottom: '12px' }}>{enhanceError}</div>}
              {enhanceSuccess && <div className="alert alert-success" style={{ marginBottom: '12px' }}>{enhanceSuccess}</div>}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary" disabled={enhancing} style={{ flex: 1 }}>
                  {enhancing ? 'Saving...' : `Add ${enhanceAdd} Tickets`}
                </button>
                <button type="button" onClick={() => setEnhanceTarget(null)} style={styles.cancelBtn}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { fontSize: 'clamp(22px, 3.5vw, 30px)', color: '#2D2020', margin: '0 0 6px' },
  subtitle: { color: '#7A6060', marginBottom: '28px', fontSize: '14px' },

  sectionCard: {
    background: 'white', borderRadius: '16px', padding: '24px',
    border: '1px solid #EDE0D8', boxShadow: '0 2px 12px rgba(122,20,40,0.05)',
    marginBottom: '24px',
  },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  sectionTitle: { margin: 0, fontSize: '17px', color: '#2D2020' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0 20px' },

  emptyState: {
    textAlign: 'center', padding: '48px 24px',
    background: 'white', borderRadius: '16px', border: '1px solid #EDE0D8',
  },

  list: { display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' },

  coordCard: {
    background: 'white', borderRadius: '16px', padding: '20px 24px',
    border: '1px solid #EDE0D8', boxShadow: '0 2px 12px rgba(122,20,40,0.05)',
  },
  coordHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' },
  coordInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  coordName: { fontSize: '16px', fontWeight: '700', color: '#2D2020' },
  inactiveBadge: {
    display: 'inline-block', fontSize: '9px', letterSpacing: '1px',
    background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '10px',
    fontWeight: '700', width: 'fit-content',
  },
  coordEmail: { fontSize: '12px', color: '#7A6060' },
  quotaDisplay: { textAlign: 'right' },
  quotaNum: { fontSize: '28px', fontWeight: '800', lineHeight: 1 },
  quotaOf: { display: 'block', fontSize: '11px', color: '#7A6060' },

  progressBg: { height: '4px', background: '#F5EDE0', borderRadius: '2px', margin: '8px 0' },
  progressFill: { height: '100%', borderRadius: '2px', transition: 'width 0.3s' },
  coordStat: { fontSize: '11px', color: '#9A8080', margin: '0 0 14px' },

  actions: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  actionBtn: {
    background: 'none', border: '1px solid #EDE0D8', color: '#5C3D2E',
    padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
  },

  expandSection: {
    marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F5EDE0',
  },
  expandLabel: {
    fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase',
    color: '#C4956A', margin: '0 0 8px',
  },
  expandEmpty: { fontSize: '12px', color: '#9A8080', margin: '0 0 4px' },
  ticketsMini: { display: 'flex', flexDirection: 'column', gap: '4px' },
  miniRow: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '6px 10px', background: '#FAF5F0', borderRadius: '8px', fontSize: '12px',
  },
  miniName: { flex: 1, fontWeight: '500', color: '#2D2020' },
  miniId: { fontFamily: 'monospace', color: '#C4956A', fontWeight: '700', fontSize: '11px' },
  miniLink: { color: '#7A1428', fontWeight: '600', textDecoration: 'none', fontSize: '11px' },
  enhRow: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '6px 10px', background: '#FAF5F0', borderRadius: '8px', fontSize: '12px',
    marginBottom: '4px',
  },

  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '24px',
  },
  modal: {
    background: 'white', borderRadius: '20px', padding: '32px',
    width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  cancelBtn: {
    flex: 1, background: 'none', border: '1px solid #EDE0D8', color: '#5C3D2E',
    padding: '12px', borderRadius: '50px', cursor: 'pointer', fontSize: '14px',
  },
};
