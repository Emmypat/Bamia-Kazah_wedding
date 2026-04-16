import React, { useState, useEffect, useRef } from 'react';
import {
  getTickets, updateTicketStatus, revokeTicket, deleteTicket,
  getPreapprovedPhones, addPreapprovedPhones, removePreapprovedPhone,
  exportTicketsCSV, issueTicket, setDefaultTicketImage,
} from '../utils/api';

const TABS = ['Pending', 'Approved', 'Pre-approved', 'Settings'];

export default function AdminTickets() {
  const [tab, setTab]       = useState('Pending');
  const [tickets, setTickets] = useState([]);
  const [preapproved, setPreapproved] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [updating, setUpdating] = useState('');

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true); setError('');
    try {
      const [ticketsData, preData] = await Promise.all([
        getTickets(),
        getPreapprovedPhones(),
      ]);
      setTickets(ticketsData.tickets || []);
      setPreapproved(preData.records || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load data.');
    } finally { setLoading(false); }
  }

  async function handleUpdate(ticketId, status) {
    setUpdating(ticketId);
    try {
      if (status === 'pending') {
        await revokeTicket(ticketId);
      } else {
        await updateTicketStatus(ticketId, status);
      }
      setTickets(prev => prev.map(t => t.ticketId === ticketId ? { ...t, status } : t));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update ticket.');
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
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>Attendance Tickets</h1>
        <div style={s.stats}>
          <span style={{ ...s.chip, background: '#FEF3C7', color: '#92400E' }}>{pending.length} pending</span>
          <span style={{ ...s.chip, background: '#D1FAE5', color: '#065F46' }}>{approved.length} approved</span>
          <span style={{ ...s.chip, background: '#FEE2E2', color: '#991B1B' }}>{rejected.length} rejected</span>
        </div>
        <button onClick={fetchAll} style={s.refreshBtn} disabled={loading}>
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ ...s.tabBtn, ...(tab === t ? s.tabActive : {}) }}
          >
            {t}
            {t === 'Pending'  && pending.length  > 0 && <span style={s.badge}>{pending.length}</span>}
            {t === 'Approved' && approved.length > 0 && <span style={{ ...s.badge, background: '#065F46' }}>{approved.length}</span>}
          </button>
        ))}
      </div>

      {/* Tab: Pending */}
      {tab === 'Pending' && (
        <PendingTab
          pending={pending}
          rejected={rejected}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          updating={updating}
          loading={loading}
        />
      )}

      {/* Tab: Approved */}
      {tab === 'Approved' && (
        <ApprovedTab
          approved={approved}
          onUpdate={handleUpdate}
          updating={updating}
          loading={loading}
        />
      )}

      {/* Tab: Pre-approved */}
      {tab === 'Pre-approved' && (
        <PreapprovedTab
          records={preapproved}
          setRecords={setPreapproved}
        />
      )}

      {/* Tab: Settings */}
      {tab === 'Settings' && (
        <SettingsTab onIssueTicket={(ticket) => setTickets(prev => [ticket, ...prev])} />
      )}
    </div>
  );
}

// ── Pending Tab ───────────────────────────────────────────────

function PendingTab({ pending, rejected, onUpdate, onDelete, updating, loading }) {
  if (loading) return <LoadingState />;
  return (
    <>
      {pending.length === 0 && rejected.length === 0 && (
        <EmptyState icon="🎟️" text="No pending ticket requests." />
      )}
      {pending.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={s.sectionTitle}>Awaiting Approval ({pending.length})</h2>
          <div style={s.grid}>
            {pending.map(t => (
              <TicketCard key={t.ticketId} ticket={t} onUpdate={onUpdate} onDelete={onDelete} updating={updating} />
            ))}
          </div>
        </section>
      )}
      {rejected.length > 0 && (
        <section>
          <h2 style={{ ...s.sectionTitle, color: '#991B1B' }}>Rejected ({rejected.length})</h2>
          <div style={s.grid}>
            {rejected.map(t => (
              <TicketCard key={t.ticketId} ticket={t} onUpdate={onUpdate} onDelete={onDelete} updating={updating} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// ── Approved Tab ──────────────────────────────────────────────

function ApprovedTab({ approved, onUpdate, updating, loading }) {
  if (loading) return <LoadingState />;
  if (approved.length === 0) return <EmptyState icon="✓" text="No approved tickets yet." />;
  return (
    <div style={s.grid}>
      {approved.map(t => (
        <TicketCard key={t.ticketId} ticket={t} onUpdate={onUpdate} onDelete={() => {}} updating={updating} />
      ))}
    </div>
  );
}

// ── Pre-approved Tab ──────────────────────────────────────────

function PreapprovedTab({ records, setRecords }) {
  const [phones, setPhones] = useState('');
  const [names,  setNames]  = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const phoneList = phones.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);
      const nameList  = names.split(/[\n,]+/).map(n => n.trim());
      const data = await addPreapprovedPhones(phoneList, nameList);
      setRecords(prev => [...(data.added || []).map(r => ({ ...r, used: false })), ...prev]);
      setPhones(''); setNames('');
      let msg = `Added ${data.count} phone${data.count !== 1 ? 's' : ''}.`;
      if (data.auto_approved?.length > 0) {
        msg += ` Auto-approved ${data.auto_approved.length} existing pending ticket${data.auto_approved.length !== 1 ? 's' : ''}.`;
      }
      setMsg(msg);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to add phones.');
    } finally { setSaving(false); }
  }

  async function handleRemove(id) {
    try {
      await removePreapprovedPhone(id);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove record.');
    }
  }

  const unused = records.filter(r => !r.used);
  const used   = records.filter(r => r.used);

  return (
    <div>
      {/* Add form */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>Add Pre-approved Phones</h2>
        <p style={s.cardDesc}>
          When a guest with a pre-approved phone submits a ticket, it will be instantly approved — no manual review needed.
        </p>
        <form onSubmit={handleAdd}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '16px', marginBottom: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Phone Numbers (one per line or comma-separated)</label>
              <textarea
                rows={4}
                placeholder="08012345678&#10;08087654321&#10;+2349011112222"
                value={phones}
                onChange={e => setPhones(e.target.value)}
                style={s.textarea}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Guest Names (matching order, optional)</label>
              <textarea
                rows={4}
                placeholder="John Doe&#10;Jane Smith&#10;(leave blank to skip)"
                value={names}
                onChange={e => setNames(e.target.value)}
                style={s.textarea}
              />
            </div>
          </div>
          {msg && <p style={{ fontSize: '13px', color: msg.startsWith('Added') ? '#065F46' : '#991B1B', margin: '0 0 10px' }}>{msg}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving || !phones.trim()}>
            {saving ? 'Adding...' : '+ Add Phones'}
          </button>
        </form>
      </div>

      {/* Records */}
      {unused.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h3 style={s.sectionTitle}>Unused ({unused.length})</h3>
          <div style={s.preapprovedList}>
            {unused.map(r => (
              <PreapprovedRow key={r.id} record={r} onRemove={handleRemove} />
            ))}
          </div>
        </section>
      )}

      {used.length > 0 && (
        <section>
          <h3 style={{ ...s.sectionTitle, color: '#7A6060' }}>Used ({used.length})</h3>
          <div style={s.preapprovedList}>
            {used.map(r => (
              <PreapprovedRow key={r.id} record={r} onRemove={handleRemove} used />
            ))}
          </div>
        </section>
      )}

      {records.length === 0 && <EmptyState icon="📋" text="No pre-approved phones yet." />}
    </div>
  );
}

function PreapprovedRow({ record, onRemove, used }) {
  return (
    <div style={{ ...s.preapprovedRow, opacity: used ? 0.6 : 1 }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: '600', color: '#2D2020', marginRight: '10px' }}>{record.phone}</span>
        {record.guestName && <span style={{ fontSize: '13px', color: '#7A6060' }}>{record.guestName}</span>}
      </div>
      {used ? (
        <span style={{ fontSize: '11px', background: '#D1FAE5', color: '#065F46', padding: '3px 10px', borderRadius: '20px' }}>
          ✓ Used
        </span>
      ) : (
        <button onClick={() => onRemove(record.id)} style={s.removeBtn} title="Remove">✕</button>
      )}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────

function SettingsTab({ onIssueTicket }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <ExportCard />
      <IssueTicketCard onIssueTicket={onIssueTicket} />
      <DefaultImageCard />
    </div>
  );
}

function ExportCard() {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportTicketsCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.error || 'Export failed.');
    } finally { setExporting(false); }
  }

  return (
    <div style={s.card}>
      <h2 style={s.cardTitle}>Export Tickets</h2>
      <p style={s.cardDesc}>Download all ticket records as a CSV file (Ticket ID, Name, Phone, Status, Approved At, Checked In, etc.).</p>
      <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
        {exporting ? 'Generating...' : '📥 Download CSV'}
      </button>
    </div>
  );
}

function IssueTicketCard({ onIssueTicket }) {
  const [form, setForm]       = useState({ guestName: '', phone: '' });
  const [selfie, setSelfie]   = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');
  const [issued, setIssued]   = useState(null);

  function handleSelfie(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelfie(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.guestName.trim()) return;
    setSaving(true); setMsg('');
    try {
      const data = await issueTicket({ guestName: form.guestName, phone: form.phone, selfieFile: selfie });
      if (data.existing) {
        setMsg(`Ticket already exists: ${data.ticket.ticketId} (${data.ticket.status})`);
        return;
      }
      onIssueTicket({ ...data, status: 'approved' });
      setIssued(data);
      setForm({ guestName: '', phone: '' });
      setSelfie(null); setPreview(null);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to issue ticket.');
    } finally { setSaving(false); }
  }

  const ticketLink = issued ? `${window.location.origin}/ticket/${issued.ticketId}` : '';

  return (
    <div style={s.card}>
      <h2 style={s.cardTitle}>Issue a Ticket</h2>
      <p style={s.cardDesc}>Create a pre-approved ticket on behalf of a guest. The ticket is immediately approved and ready to use. A default wedding image is used if no selfie is provided.</p>

      {issued && (
        <div style={{ background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
          <p style={{ margin: '0 0 6px', fontWeight: '700', color: '#065F46' }}>Ticket issued: {issued.ticketId}</p>
          <a href={ticketLink} target="_blank" rel="noreferrer" style={{ color: '#065F46', fontSize: '13px' }}>{ticketLink}</a>
          <button onClick={() => setIssued(null)} style={{ display: 'block', marginTop: '8px', background: 'none', border: 'none', color: '#065F46', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>Issue another</button>
        </div>
      )}

      {!issued && (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Guest Name *</label>
            <input
              placeholder="Full name as it should appear on the ticket"
              value={form.guestName}
              onChange={e => setForm({ ...form, guestName: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Phone Number (optional)</label>
            <input
              placeholder="08012345678"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Selfie (optional — default wedding image used if blank)</label>
            {preview ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={preview} alt="selfie" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #7A1428' }} />
                <button type="button" onClick={() => { setSelfie(null); setPreview(null); }} style={{ fontSize: '12px', color: '#991B1B', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Remove</button>
              </div>
            ) : (
              <label style={{ display: 'inline-block', padding: '8px 16px', border: '1px dashed #C4956A', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#5C3D2E' }}>
                + Upload selfie
                <input type="file" accept="image/*" onChange={handleSelfie} style={{ display: 'none' }} />
              </label>
            )}
          </div>
          {msg && <p style={{ fontSize: '13px', color: '#991B1B', margin: '0 0 10px' }}>{msg}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving || !form.guestName.trim()}>
            {saving ? 'Issuing...' : '🎟️ Issue Ticket'}
          </button>
        </form>
      )}
    </div>
  );
}

function DefaultImageCard() {
  const [file, setFile]     = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState('');

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setMsg('');
  }

  async function handleUpload() {
    if (!file) return;
    setSaving(true); setMsg('');
    try {
      await setDefaultTicketImage(file);
      setMsg('Default image updated successfully.');
      setFile(null); setPreview(null);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Upload failed.');
    } finally { setSaving(false); }
  }

  return (
    <div style={s.card}>
      <h2 style={s.cardTitle}>Default Ticket Image</h2>
      <p style={s.cardDesc}>This image is used on admin-issued tickets that have no selfie. Upload a wedding photo or logo.</p>
      {preview && (
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <img src={preview} alt="preview" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '10px', border: '2px solid #C4956A' }} />
        </div>
      )}
      <label style={{ display: 'inline-block', padding: '9px 20px', border: '1px solid #C4956A', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#5C3D2E', marginBottom: '12px' }}>
        {file ? file.name : '📷 Choose Image'}
        <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      </label>
      {file && (
        <button className="btn btn-primary" onClick={handleUpload} disabled={saving} style={{ marginLeft: '10px' }}>
          {saving ? 'Uploading...' : 'Upload'}
        </button>
      )}
      {msg && <p style={{ fontSize: '13px', marginTop: '8px', color: msg.includes('success') ? '#065F46' : '#991B1B' }}>{msg}</p>}
    </div>
  );
}

// ── Ticket Card ───────────────────────────────────────────────

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

  const isAutoApproved  = ticket.approved_by === 'auto';
  const isAdminIssued   = ticket.approved_by === 'admin_issued';
  const isCoordIssued   = ticket.issuedByRole === 'coordinator';

  return (
    <div style={c.card}>
      {ticket.selfieUrl ? (
        <img src={ticket.selfieUrl} alt={ticket.guestName} style={c.selfie} />
      ) : (
        <div style={c.selfieEmpty}>👤</div>
      )}

      <div style={c.info}>
        <p style={c.name}>{ticket.guestName}</p>
        <p style={c.ticketId}>{ticket.ticketId}</p>
        <p style={c.meta}>
          {ticket.phone && <span>{ticket.phone} · </span>}
          {new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ ...c.badge, background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}>
            {ticket.status === 'pending' ? '⏳ Pending' : ticket.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
          </span>
          {isAutoApproved && (
            <span style={{ ...c.badge, background: '#EDE9FE', color: '#5B21B6', border: '1px solid #C4B5FD' }}>⚡ Auto</span>
          )}
          {isAdminIssued && !isCoordIssued && (
            <span style={{ ...c.badge, background: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE' }}>🎟️ Issued</span>
          )}
          {isCoordIssued && (
            <span style={{ ...c.badge, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }} title={ticket.issuedByEmail || ''}>
              👤 {ticket.issuedByName || 'Coordinator'}
            </span>
          )}
          {ticket.checkedIn && (
            <span style={{ ...c.badge, background: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7' }}>✅ Checked in</span>
          )}
        </div>
      </div>

      <div style={c.actions}>
        {ticket.status !== 'approved' && (
          <button onClick={() => onUpdate(ticket.ticketId, 'approved')} style={c.approveBtn} disabled={isBusy}>
            {isBusy ? '...' : '✓ Approve'}
          </button>
        )}
        {ticket.status === 'approved' && (
          <button onClick={() => onUpdate(ticket.ticketId, 'pending')} style={c.revokeBtn} disabled={isBusy} title="Revoke approval">
            {isBusy ? '...' : '↩ Revoke'}
          </button>
        )}
        {ticket.status !== 'rejected' && (
          <button onClick={() => onUpdate(ticket.ticketId, 'rejected')} style={c.rejectBtn} disabled={isBusy}>
            {isBusy ? '...' : '✗ Reject'}
          </button>
        )}
      </div>

      {ticket.status === 'approved' && whatsappMsg && (
        <div style={c.notifyRow}>
          <a href={whatsappMsg} target="_blank" rel="noreferrer" style={c.whatsappBtn}>
            💬 Notify via WhatsApp
          </a>
          <a href={ticketLink} target="_blank" rel="noreferrer" style={c.viewLink}>View ↗</a>
        </div>
      )}

      {ticket.status === 'rejected' && (
        <div style={{ padding: '0 16px 14px' }}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={c.deleteBtn}>🗑 Delete Ticket</button>
          ) : (
            <div style={c.confirmRow}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#991B1B', fontWeight: '600' }}>Permanently delete this ticket?</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleDelete} disabled={deleting} style={c.confirmDeleteBtn}>{deleting ? 'Deleting...' : 'Yes, Delete'}</button>
                <button onClick={() => setConfirmDelete(false)} style={c.cancelDeleteBtn}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#7A6060' }}>
      <div className="spinner" style={{ margin: '0 auto 16px' }} />
      Loading...
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#7A6060', fontSize: '16px' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>{icon}</div>
      <p>{text}</p>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────

const s = {
  header:      { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' },
  title:       { fontSize: 'clamp(22px, 3vw, 30px)', color: '#2D2020', margin: 0, flex: 1 },
  stats:       { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  chip:        { fontSize: '12px', fontWeight: '600', padding: '4px 14px', borderRadius: '20px' },
  refreshBtn:  { background: 'none', border: '1px solid #EDE0D8', color: '#5C3D2E', padding: '8px 18px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px' },
  sectionTitle: { fontSize: '17px', color: '#2D2020', margin: '0 0 14px', fontWeight: '700' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '16px' },
  tabs:        { display: 'flex', gap: '4px', borderBottom: '2px solid #EDE0D8', marginBottom: '28px', flexWrap: 'wrap' },
  tabBtn:      { padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#7A6060', borderBottom: '3px solid transparent', marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '6px' },
  tabActive:   { color: '#7A1428', borderBottomColor: '#7A1428' },
  badge:       { fontSize: '11px', fontWeight: '700', background: '#7A1428', color: 'white', borderRadius: '20px', padding: '1px 7px', minWidth: '18px', textAlign: 'center' },
  card:        { background: 'white', borderRadius: '16px', padding: '28px 28px 24px', border: '1px solid #EDE0D8', boxShadow: '0 2px 12px rgba(122,20,40,0.06)', marginBottom: '0' },
  cardTitle:   { fontSize: '18px', color: '#2D2020', margin: '0 0 6px' },
  cardDesc:    { fontSize: '13px', color: '#7A6060', margin: '0 0 20px', lineHeight: '1.6' },
  textarea:    { width: '100%', padding: '10px 14px', border: '1px solid #DDD0C8', borderRadius: '10px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' },
  preapprovedList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  preapprovedRow:  { display: 'flex', alignItems: 'center', gap: '12px', background: 'white', border: '1px solid #EDE0D8', borderRadius: '10px', padding: '10px 16px' },
  removeBtn:   { background: 'none', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', flexShrink: 0 },
};

const c = {
  card: { background: 'white', borderRadius: '14px', border: '1px solid #EDE0D8', boxShadow: '0 2px 16px rgba(122,20,40,0.06)', overflow: 'hidden' },
  selfie: { width: '100%', height: '340px', objectFit: 'cover', objectPosition: 'center top', display: 'block' },
  selfieEmpty: { width: '100%', height: '340px', background: '#F7EDE0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px' },
  info: { padding: '16px 16px 0' },
  name: { fontSize: '18px', fontWeight: '700', color: '#2D2020', margin: '0 0 4px' },
  ticketId: { fontSize: '14px', fontWeight: '700', color: '#7A1428', margin: '0 0 6px', fontFamily: 'monospace' },
  meta: { fontSize: '12px', color: '#7A6060', margin: '0 0 10px', lineHeight: '1.6' },
  badge: { fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', display: 'inline-block' },
  actions: { padding: '12px 16px 8px', display: 'flex', gap: '8px' },
  approveBtn: { flex: 1, padding: '9px', borderRadius: '8px', background: '#065F46', color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  revokeBtn:  { flex: 1, padding: '9px', borderRadius: '8px', background: '#92400E', color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  rejectBtn:  { flex: 1, padding: '9px', borderRadius: '8px', background: '#991B1B', color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  notifyRow: { padding: '0 16px 14px', display: 'flex', gap: '8px', alignItems: 'center' },
  whatsappBtn: { flex: 1, padding: '9px', borderRadius: '8px', textAlign: 'center', background: '#25D366', color: 'white', textDecoration: 'none', fontSize: '12px', fontWeight: '600', display: 'block' },
  viewLink: { fontSize: '12px', color: '#7A1428', textDecoration: 'none', fontWeight: '600', whiteSpace: 'nowrap' },
  deleteBtn: { width: '100%', padding: '8px', borderRadius: '8px', background: 'none', border: '1px solid #FECACA', color: '#991B1B', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  confirmRow: { background: '#FFF5F5', borderRadius: '8px', padding: '10px 12px' },
  confirmDeleteBtn: { flex: 1, padding: '8px 12px', borderRadius: '8px', background: '#991B1B', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  cancelDeleteBtn:  { flex: 1, padding: '8px 12px', borderRadius: '8px', background: 'none', border: '1px solid #EDE0D8', color: '#5C3D2E', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
};
