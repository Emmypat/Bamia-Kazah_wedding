import React, { useState, useEffect } from 'react';
import { getMyPhotos } from '../utils/api';

export default function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); // Lightbox

  useEffect(() => {
    getMyPhotos()
      .then((data) => setPhotos(data.photos || []))
      .catch((err) => setError(err.message || 'Failed to load photos'))
      .finally(() => setLoading(false));
  }, []);

  function handleDownload(url, idx) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `wedding-photo-${idx + 1}.jpg`;
    a.click();
  }

  if (loading) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ fontSize: '48px' }}>⏳</div>
        <p style={{ color: '#888' }}>Loading your photos...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 style={styles.title}>🖼️ My Gallery</h1>
      <p style={styles.subtitle}>
        {photos.length > 0 ? `${photos.length} photos you've uploaded` : 'Your uploaded photos will appear here'}
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {photos.length === 0 && !error && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📷</div>
          <p>You haven't uploaded any photos yet.</p>
          <a href="/upload" className="btn-primary" style={{ marginTop: '16px', display: 'inline-block' }}>
            Upload Your First Photo →
          </a>
        </div>
      )}

      {/* Photo grid */}
      <div style={styles.grid}>
        {photos.map((photo, idx) => (
          <div key={idx} style={styles.photoCard} onClick={() => setSelected(photo)}>
            <div style={styles.thumbWrap}>
              <img src={photo.url} alt={`Photo ${idx + 1}`} style={styles.thumb} loading="lazy" />
              {photo.isCouple && (
                <div style={styles.coupleBadge}>💒 Couple</div>
              )}
              <div style={styles.overlay}>
                <span style={styles.overlayIcon}>🔍</span>
              </div>
            </div>
            <div style={styles.cardFooter}>
              <span style={styles.meta}>{photo.faceCount || 0} face{photo.faceCount !== 1 ? 's' : ''}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(photo.url, idx); }}
                style={styles.downloadBtn}
              >
                ⬇️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selected && (
        <div style={styles.lightbox} onClick={() => setSelected(null)}>
          <div style={styles.lightboxInner} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setSelected(null)}>✕</button>
            <img src={selected.url} alt="Full size" style={styles.lightboxImg} />
            <div style={styles.lightboxActions}>
              <button
                className="btn-primary"
                onClick={() => handleDownload(selected.url, photos.indexOf(selected))}
              >
                ⬇️ Download
              </button>
              <p style={styles.lightboxExpiry}>
                Link expires: {new Date(selected.expiresAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { fontSize: '28px', fontWeight: '400', color: '#3a3a3a', margin: '0 0 8px' },
  subtitle: { color: '#888', marginBottom: '28px' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#888' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  photoCard: { background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', cursor: 'pointer' },
  thumbWrap: { position: 'relative', height: '180px' },
  thumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  coupleBadge: {
    position: 'absolute', top: '8px', left: '8px',
    background: 'rgba(212,167,167,0.9)', color: '#fff',
    padding: '3px 8px', borderRadius: '12px', fontSize: '11px',
  },
  overlay: {
    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
  },
  overlayIcon: { fontSize: '28px', opacity: 0 },
  cardFooter: { padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: '13px', color: '#aaa' },
  downloadBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' },
  // Lightbox
  lightbox: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
  },
  lightboxInner: {
    background: '#fff', borderRadius: '12px', padding: '24px',
    maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', position: 'relative',
  },
  closeBtn: {
    position: 'absolute', top: '12px', right: '12px',
    background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666',
  },
  lightboxImg: { maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', display: 'block' },
  lightboxActions: { marginTop: '16px', display: 'flex', alignItems: 'center', gap: '16px' },
  lightboxExpiry: { fontSize: '12px', color: '#aaa', margin: 0 },
};
