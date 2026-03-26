import React, { useState, useEffect } from 'react';
import { getTickets, updateTicketStatus, deleteTicket } from '../utils/api';

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(''); // ticketId being updated

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    setLoading(true); setError('');
    try {
      const data = await getTickets();
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load tickets.');
    } finally { setLoading(false); }
  }

  async function handleUpdate(ticketId, status) {
    setUpdating(ticketId);
    try {
      await updateTicketStatus(ticketId, status);
      setTickets(prev => prev.map(t => t.ticketId === ticketId ? { ...t, status } : t));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update ticket. Please try again.');
    } finally { setUpdating(''); }
  }

  function handleDelete(ticketId) {
    setTickets(prev => prev.filter(t => t.ticketId !== ticketId));
  }

  const pending  = tickets.filter(t => t.status === 'pending');
  const approved = tickets.filter(t => t.status === 'approved');
  const rejected = tickets.filter(t => t.status === 'rejected');

  return (
    <div className="page">
      <div style={styles.header}>
        <h1 style={styles.title}>Attendance Tickets</h1>
        <div style={styles.stats}>
          <span style={{ ...styles.statChip, background: '#FEF3C7', color: '#92400E' }}>{pending.length} pending</span>
          <span style={{ ...styles.statChip, background: '#D1FAE5', color: '#065F46' }}>{approved.length} approved</span>
          <span style={{ ...styles.statChip, background: '#FEE2E2', color: '#991B1B' }}>{rejected.length} rejected</span>
        </div>
        <button onClick={fetchTickets} style={styles.refreshBtn} disabled={loading}>
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#7A6060' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          Loading tickets...
        </div>
      )}

      {!loading && tickets.length === 0 && (
        <div style={styles.empty}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎟️</div>
          <p>No ticket requests yet.</p>
        </div>
      )}

      {!loading && tickets.length > 0 && (
        <>
          {/* Pending first */}
          {pending.length > 0 && (
            <section style={{ marginBottom: '36px' }}>
              <h2 style={styles.sectionTitle}>Pending Verification ({pending.length})</h2>
              <div style={styles.grid}>
                {pending.map(ticket => (
                  <TicketCard key={ticket.ticketId} ticket={ticket} onUpdate={handleUpdate} onDelete={handleDelete} updating={updating} />
                ))}
              </div>
            </section>
          )}

          {approved.length > 0 && (
            <section style={{ marginBottom: '36px' }}>
              <h2 style={{ ...styles.sectionTitle, color: '#065F46' }}>Approved ({approved.length})</h2>
              <div style={styles.grid}>
                {approved.map(ticket => (
                  <TicketCard key={ticket.ticketId} ticket={ticket} onUpdate={handleUpdate} onDelete={handleDelete} updating={updating} />
                ))}
              </div>
            </section>
          )}

          {rejected.length > 0 && (
            <section>
              <h2 style={{ ...styles.sectionTitle, color: '#991B1B' }}>Rejected ({rejected.length})</h2>
              <div style={styles.grid}>
                {rejected.map(ticket => (
                  <TicketCard key={ticket.ticketId} ticket={ticket} onUpdate={handleUpdate} onDelete={handleDelete} updating={updating} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function TicketCard({ ticket, onUpdate, onDelete, updating }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isBusy = updating === ticket.ticketId;

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteTicket(ticket.ticketId);
      onDelete(ticket.ticketId);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete ticket.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }
  const statusColor = {
    pending:  { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
    approved: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
    rejected: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  }[ticket.status] || {};

  const ticketLink = `${window.location.origin}/ticket/${ticket.ticketId}`;
  const whatsappMsg = ticket.phone
    ? `https://wa.me/${ticket.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hello ${ticket.guestName}! 🎊\n\nYour attendance ticket for Bamai & Kazah's wedding has been verified!\n\nTicket ID: ${ticket.ticketId}\nView & download your ticket: ${ticketLink}\n\nWe look forward to celebrating with you on 11 April 2026!`
      )}`
    : null;

  return (
    <div style={cardStyles.card}>
      {/* Selfie */}
      {ticket.selfieUrl ? (
        <img src={ticket.selfieUrl} alt={ticket.guestName} style={cardStyles.selfie} />
      ) : (
        <div style={cardStyles.selfieEmpty}>👤</div>
      )}

      {/* Info */}
      <div style={cardStyles.info}>
        <p style={cardStyles.name}>{ticket.guestName}</p>
        <p style={cardStyles.ticketId}>{ticket.ticketId}</p>
        <p style={cardStyles.meta}>
          {ticket.phone && <span>{ticket.phone} · </span>}
          {new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
        <span style={{ ...cardStyles.badge, background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}>
          {ticket.status === 'pending' ? '⏳ Pending' : ticket.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
        </span>
      </div>

      {/* Actions */}
      <div style={cardStyles.actions}>
        {ticket.status !== 'approved' && (
          <button
            onClick={() => onUpdate(ticket.ticketId, 'approved')}
            style={cardStyles.approveBtn}
            disabled={isBusy}
          >
            {isBusy ? '...' : '✓ Approve'}
          </button>
        )}
        {ticket.status !== 'rejected' && (
          <button
            onClick={() => onUpdate(ticket.ticketId, 'rejected')}
            style={cardStyles.rejectBtn}
            disabled={isBusy}
          >
            {isBusy ? '...' : '✗ Reject'}
          </button>
        )}
      </div>

      {/* WhatsApp notify — shown for approved tickets with a phone number */}
      {ticket.status === 'approved' && whatsappMsg && (
        <div style={cardStyles.notifyRow}>
          <a href={whatsappMsg} target="_blank" rel="noreferrer" style={cardStyles.whatsappBtn}>
            💬 Notify on WhatsApp
          </a>
          <a href={ticketLink} target="_blank" rel="noreferrer" style={cardStyles.viewLink}>
            View ticket ↗
          </a>
        </div>
      )}

      {/* Delete — only for rejected tickets */}
      {ticket.status === 'rejected' && (
        <div style={{ padding: '0 16px 14px' }}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={cardStyles.deleteBtn}>
              🗑 Delete Ticket
            </button>
          ) : (
            <div style={cardStyles.confirmRow}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#991B1B', fontWeight: '600' }}>
                Permanently delete this ticket?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleDelete} disabled={deleting} style={cardStyles.confirmDeleteBtn}>
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)} style={cardStyles.cancelDeleteBtn}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  header: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' },
  title: { fontSize: 'clamp(22px, 3vw, 30px)', color: '#2D2020', margin: 0, flex: 1 },
  stats: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  statChip: { fontSize: '12px', fontWeight: '600', padding: '4px 14px', borderRadius: '20px' },
  refreshBtn: {
    background: 'none', border: '1px solid #EDE0D8', color: '#5C3D2E',
    padding: '8px 18px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
  },
  sectionTitle: { fontSize: '18px', color: '#2D2020', margin: '0 0 16px', fontWeight: '700' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  empty: { textAlign: 'center', padding: '80px 20px', color: '#7A6060', fontSize: '16px' },
};

const cardStyles = {
  card: {
    background: 'white', borderRadius: '14px',
    border: '1px solid #EDE0D8',
    boxShadow: '0 2px 16px rgba(122,20,40,0.06)',
    overflow: 'hidden',
  },
  selfie: { width: '100%', height: '340px', objectFit: 'cover', objectPosition: 'center top', display: 'block' },
  selfieEmpty: {
    width: '100%', height: '340px',
    background: '#F7EDE0', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '64px',
  },
  info: { padding: '16px 16px 0' },
  name: { fontSize: '18px', fontWeight: '700', color: '#2D2020', margin: '0 0 4px' },
  ticketId: { fontSize: '14px', fontWeight: '700', color: '#7A1428', margin: '0 0 6px', fontFamily: 'monospace' },
  meta: { fontSize: '12px', color: '#7A6060', margin: '0 0 10px', lineHeight: '1.6' },
  badge: { fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', display: 'inline-block' },
  actions: { padding: '12px 16px 8px', display: 'flex', gap: '8px' },
  approveBtn: {
    flex: 1, padding: '9px', borderRadius: '8px',
    background: '#065F46', color: 'white', border: 'none',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600',
  },
  rejectBtn: {
    flex: 1, padding: '9px', borderRadius: '8px',
    background: '#991B1B', color: 'white', border: 'none',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600',
  },
  notifyRow: {
    padding: '0 16px 14px', display: 'flex', gap: '8px', alignItems: 'center',
  },
  whatsappBtn: {
    flex: 1, padding: '9px', borderRadius: '8px', textAlign: 'center',
    background: '#25D366', color: 'white', textDecoration: 'none',
    fontSize: '12px', fontWeight: '600', display: 'block',
  },
  viewLink: {
    fontSize: '12px', color: '#7A1428', textDecoration: 'none', fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  deleteBtn: {
    width: '100%', padding: '8px', borderRadius: '8px',
    background: 'none', border: '1px solid #FECACA', color: '#991B1B',
    cursor: 'pointer', fontSize: '12px', fontWeight: '600',
  },
  confirmRow: { background: '#FFF5F5', borderRadius: '8px', padding: '10px 12px' },
  confirmDeleteBtn: {
    flex: 1, padding: '8px 12px', borderRadius: '8px',
    background: '#991B1B', color: 'white', border: 'none',
    cursor: 'pointer', fontSize: '12px', fontWeight: '600',
  },
  cancelDeleteBtn: {
    flex: 1, padding: '8px 12px', borderRadius: '8px',
    background: 'none', border: '1px solid #EDE0D8', color: '#5C3D2E',
    cursor: 'pointer', fontSize: '12px', fontWeight: '600',
  },
};
