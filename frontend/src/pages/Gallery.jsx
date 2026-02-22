import React, { useState, useEffect } from 'react'
import { listMyPhotos } from '../utils/api'
import toast from 'react-hot-toast'

export default function Gallery() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // Lightbox

  useEffect(() => {
    loadPhotos()
  }, [])

  async function loadPhotos() {
    try {
      const data = await listMyPhotos()
      setPhotos(data.photos || [])
    } catch (err) {
      toast.error('Failed to load your photos')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: '#aaa' }}>Loading your gallery...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <h1 style={styles.title}>My Gallery</h1>
            <p style={styles.subtitle}>
              {photos.length} photo{photos.length !== 1 ? 's' : ''} you've uploaded
            </p>
          </div>
          <button className="btn btn-secondary" onClick={loadPhotos} style={{ fontSize: 13, padding: '8px 20px' }}>
            🔄 Refresh
          </button>
        </div>

        {photos.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📷</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 400, color: '#3a3a3a', marginBottom: 8 }}>
              No Photos Yet
            </h2>
            <p style={{ color: '#aaa', marginBottom: 24 }}>
              Start capturing memories — upload your first photo!
            </p>
            <a href="/upload" className="btn btn-primary">Upload Photos</a>
          </div>
        ) : (
          <div className="photo-grid">
            {photos.map((photo, i) => (
              <div key={i} className="photo-card" onClick={() => setSelected(photo)} style={{ cursor: 'pointer' }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={photo.url}
                    alt="Wedding photo"
                    loading="lazy"
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                  />
                  {photo.isCouple && (
                    <span style={styles.coupleBadge}>💒 Couple</span>
                  )}
                  {photo.faceCount > 0 && (
                    <span style={styles.faceBadge}>👥 {photo.faceCount}</span>
                  )}
                </div>
                <div className="photo-card-footer">
                  <a
                    href={photo.url}
                    download
                    onClick={e => e.stopPropagation()}
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '6px 14px' }}
                  >
                    ⬇️ Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selected && (
        <div style={styles.lightboxOverlay} onClick={() => setSelected(null)}>
          <div style={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            <button style={styles.lightboxClose} onClick={() => setSelected(null)}>✕</button>
            <img src={selected.url} alt="Wedding photo" style={styles.lightboxImg} />
            <div style={styles.lightboxFooter}>
              <span style={{ color: '#aaa', fontSize: 13 }}>
                Uploaded {new Date(selected.uploadedAt).toLocaleDateString()}
                {selected.faceCount > 0 && ` · ${selected.faceCount} faces`}
                {selected.isCouple && ' · 💒 Couple photo'}
              </span>
              <a href={selected.url} download className="btn btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>
                ⬇️ Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 40,
    fontWeight: 400,
    color: '#3a3a3a',
    marginBottom: 4,
  },
  subtitle: { color: '#aaa', fontSize: 14 },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    background: 'white',
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
  },
  coupleBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    background: 'rgba(212,167,167,0.9)',
    color: 'white',
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '50px',
  },
  faceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    background: 'rgba(0,0,0,0.5)',
    color: 'white',
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: '50px',
  },
  lightboxOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  lightboxContent: {
    background: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: 800,
    width: '100%',
    position: 'relative',
  },
  lightboxClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'rgba(0,0,0,0.5)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: 32,
    height: 32,
    cursor: 'pointer',
    fontSize: 14,
    zIndex: 1,
  },
  lightboxImg: {
    width: '100%',
    maxHeight: '70vh',
    objectFit: 'contain',
    display: 'block',
    background: '#111',
  },
  lightboxFooter: {
    padding: '14px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}
