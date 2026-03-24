import React, { useState, useEffect } from 'react';
import { getMyPhotos } from '../utils/api';

export default function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdminView, setIsAdminView] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'couple'

  useEffect(() => {
    getMyPhotos()
      .then((data) => {
        setPhotos(data.photos || []);
        setIsAdminView(data.isAdminView || false);
      })
      .catch((err) => setError(err.message || 'Failed to load photos'))
      .finally(() => setLoading(false));
  }, []);

  function handleDownload(url, idx) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `bamai-kazah-photo-${idx + 1}.jpg`;
    a.click();
  }

  const filtered = filter === 'couple' ? photos.filter(p => p.isCouple) : photos;
  const coupleCount = photos.filter(p => p.isCouple).length;

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p style={{ color: '#7A6060', marginTop: '16px' }}>Loading photos...</p>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{isAdminView ? 'All Wedding Photos' : 'My Gallery'}</h1>
          <p style={styles.subtitle}>
            {photos.length > 0
              ? `${photos.length} photo${photos.length !== 1 ? 's' : ''}${isAdminView ? ' from all guests' : " you've uploaded"}`
              : isAdminView ? 'No photos have been uploaded yet.' : "You haven't uploaded any photos yet."}
          </p>
        </div>
        {isAdminView && <span style={styles.adminBadge}>Admin View</span>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filter tabs (only show if there are couple photos) */}
      {photos.length > 0 && coupleCount > 0 && (
        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(filter === 'all' ? styles.tabActive : {}) }} onClick={() => setFilter('all')}>
            All Photos <span style={styles.tabCount}>{photos.length}</span>
          </button>
          <button style={{ ...styles.tab, ...(filter === 'couple' ? styles.tabActive : {}) }} onClick={() => setFilter('couple')}>
            Couple Photos <span style={styles.tabCount}>{coupleCount}</span>
          </button>
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && !error && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>📷</div>
          <h3 style={styles.emptyTitle}>No photos yet</h3>
          <p style={styles.emptyDesc}>
            {isAdminView ? 'Guests have not uploaded any photos yet.' : "Share your favourite moments from the celebration."}
          </p>
          <a href="/upload" className="btn btn-primary" style={{ marginTop: '24px', display: 'inline-flex' }}>
            Upload Photos
          </a>
        </div>
      )}

      {/* Grid */}
      <div style={styles.grid}>
        {filtered.map((photo, idx) => (
          <div
            key={idx}
            style={styles.photoCard}
            onClick={() => setSelected({ photo, idx })}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={styles.thumbWrap}>
              <img src={photo.url} alt={`Photo ${idx + 1}`} style={styles.thumb} loading="lazy" />
              {photo.isCouple && <div style={styles.coupleBadge}>Couple</div>}
              <div style={styles.hoverOverlay}>
                <span style={{ fontSize: '28px' }}>🔍</span>
              </div>
            </div>
            <div style={styles.cardFooter}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={styles.meta}>{photo.faceCount || 0} face{photo.faceCount !== 1 ? 's' : ''}</span>
                {isAdminView && <span style={styles.guestTag}>Guest</span>}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(photo.url, idx); }}
                style={styles.downloadBtn}
                title="Download"
              >
                ⬇
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selected && (
        <div style={styles.lightbox} onClick={() => setSelected(null)}>
          <div style={styles.lightboxInner} onClick={e => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setSelected(null)}>✕</button>
            <img src={selected.photo.url} alt="Full size" style={styles.lightboxImg} />
            <div style={styles.lightboxInfo}>
              {selected.photo.isCouple && (
                <span style={styles.lightboxBadge}>Couple Photo</span>
              )}
              {selected.photo.faceCount > 0 && (
                <span style={styles.lightboxBadge}>{selected.photo.faceCount} face{selected.photo.faceCount !== 1 ? 's' : ''} detected</span>
              )}
              {selected.photo.uploadedAt && (
                <span style={styles.lightboxBadge}>
                  {new Date(selected.photo.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button className="btn btn-primary" onClick={() => handleDownload(selected.photo.url, selected.idx)}>
                Download Photo
              </button>
              <a href={selected.photo.url} target="_blank" rel="noreferrer" className="btn btn-secondary">
                Open Original
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  centered: { minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { fontSize: 'clamp(24px, 4vw, 34px)', color: '#2D2020', margin: '0 0 6px' },
  subtitle: { color: '#7A6060', fontSize: '14px', margin: 0 },
  adminBadge: {
    background: '#F5E6E9', color: '#7A1428',
    fontSize: '11px', fontWeight: '700',
    letterSpacing: '1.5px', textTransform: 'uppercase',
    padding: '6px 16px', borderRadius: '20px',
    border: '1px solid #e8c0ca', alignSelf: 'center',
  },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px' },
  tab: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 20px', borderRadius: '50px',
    border: '1.5px solid #EDE0D8', background: 'white',
    color: '#7A6060', fontSize: '14px', fontWeight: '500', cursor: 'pointer',
  },
  tabActive: { background: '#7A1428', borderColor: '#7A1428', color: 'white' },
  tabCount: {
    background: 'rgba(255,255,255,0.25)',
    padding: '1px 8px', borderRadius: '20px',
    fontSize: '12px', fontWeight: '700',
  },
  emptyState: { textAlign: 'center', padding: '80px 20px' },
  emptyTitle: { fontSize: '22px', color: '#5C3D2E', marginBottom: '8px' },
  emptyDesc: { color: '#7A6060', fontSize: '15px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  photoCard: {
    background: 'white', borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: '0 2px 16px rgba(122,20,40,0.07)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid #EDE0D8',
  },
  thumbWrap: { position: 'relative', height: '180px', overflow: 'hidden' },
  thumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  coupleBadge: {
    position: 'absolute', top: '8px', left: '8px',
    background: 'linear-gradient(135deg, #7A1428, #5C0F1E)',
    color: 'white', padding: '3px 10px',
    borderRadius: '12px', fontSize: '11px', fontWeight: '600',
  },
  hoverOverlay: {
    position: 'absolute', inset: 0,
    background: 'rgba(122,20,40,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: 0, transition: 'opacity 0.2s',
  },
  cardFooter: { padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: '12px', color: '#C4956A' },
  guestTag: { background: '#F7EDE0', color: '#5C3D2E', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: '500' },
  downloadBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', color: '#C4956A' },
  lightbox: {
    position: 'fixed', inset: 0, background: 'rgba(30,5,10,0.92)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px',
  },
  lightboxInner: {
    background: 'white', borderRadius: '20px', padding: '28px',
    maxWidth: '640px', width: '100%', maxHeight: '92vh', overflow: 'auto', position: 'relative',
  },
  closeBtn: {
    position: 'absolute', top: '16px', right: '16px',
    background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7A6060',
  },
  lightboxImg: { width: '100%', maxHeight: '55vh', objectFit: 'contain', borderRadius: '10px', display: 'block' },
  lightboxInfo: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' },
  lightboxBadge: {
    background: '#F7EDE0', color: '#5C3D2E',
    fontSize: '12px', padding: '4px 14px', borderRadius: '20px', fontWeight: '500',
  },
};
