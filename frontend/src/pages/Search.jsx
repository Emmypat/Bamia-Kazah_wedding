import React, { useState } from 'react';
import { searchByFace } from '../utils/api';

export default function Search() {
  const [selfie, setSelfie] = useState(null);
  const [preview, setPreview] = useState(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelfie(file);
    setPreview(URL.createObjectURL(file));
    setResults(null);
    setError('');
  }

  async function handleSearch() {
    if (!selfie) return;
    setSearching(true);
    setError('');
    try {
      const data = await searchByFace(selfie);
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  function handleDownload(url, idx) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `wedding-photo-${idx + 1}.jpg`;
    a.click();
  }

  return (
    <div className="page">
      <h1 style={styles.title}>🔍 Find My Photos</h1>
      <p style={styles.subtitle}>
        Upload a selfie and our AI will find every photo you appear in — instantly.
      </p>

      <div style={styles.layout}>
        {/* Selfie upload panel */}
        <div className="card" style={styles.uploadPanel}>
          <h3 style={styles.panelTitle}>Your Selfie</h3>
          <p style={styles.hint}>Use a clear, front-facing photo with good lighting for best results.</p>

          {preview ? (
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img src={preview} alt="Your selfie" style={styles.selfiePreview} />
              <button
                onClick={() => { setSelfie(null); setPreview(null); setResults(null); }}
                style={styles.clearBtn}
              >
                Choose different photo
              </button>
            </div>
          ) : (
            <div style={styles.selfieOptions}>
              <label style={styles.optionBtn}>
                📷 Take Selfie
                <input type="file" accept="image/*" capture="user" onChange={handleFileSelect} style={{ display: 'none' }} />
              </label>
              <label style={styles.optionBtn}>
                🖼️ Upload Photo
                <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
              </label>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          <button
            className="btn-primary"
            onClick={handleSearch}
            disabled={!selfie || searching}
            style={{ width: '100%' }}
          >
            {searching ? '🔍 Searching...' : 'Find My Photos →'}
          </button>

          <p style={styles.privacyNote}>
            🔒 Your selfie is never stored. It's used only for matching and then discarded.
          </p>
        </div>

        {/* Results panel */}
        <div style={styles.resultsPanel}>
          {results === null && !searching && (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '64px' }}>🤳</div>
              <p>Your matching photos will appear here</p>
            </div>
          )}

          {searching && (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              <p>Scanning photos for your face...</p>
            </div>
          )}

          {results && (
            <>
              <h3 style={styles.resultsTitle}>
                {results.matchCount > 0
                  ? `Found ${results.matchCount} photo${results.matchCount !== 1 ? 's' : ''} of you! 🎉`
                  : 'No photos found yet'}
              </h3>
              {results.matchCount === 0 && (
                <div className="alert alert-info">
                  {results.message || "Try again after more photos have been uploaded, or use a clearer selfie."}
                </div>
              )}
              <div style={styles.photoGrid}>
                {results.photos?.map((photo, idx) => (
                  <div key={idx} style={styles.photoCard}>
                    <img src={photo.url} alt={`Match ${idx + 1}`} style={styles.photoThumb} loading="lazy" />
                    <div style={styles.photoActions}>
                      <button onClick={() => handleDownload(photo.url, idx)} style={styles.downloadBtn}>
                        ⬇️ Download
                      </button>
                      <a href={photo.url} target="_blank" rel="noreferrer" style={styles.viewLink}>
                        View full size
                      </a>
                    </div>
                    <p style={styles.expiryText}>Link valid until {new Date(photo.expiresAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  title: { fontSize: '28px', fontWeight: '400', color: '#3a3a3a', margin: '0 0 8px' },
  subtitle: { color: '#888', marginBottom: '28px' },
  layout: { display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '24px', alignItems: 'start' },
  uploadPanel: { position: 'sticky', top: '80px' },
  panelTitle: { fontSize: '18px', fontWeight: '400', color: '#3a3a3a', margin: '0 0 8px' },
  hint: { fontSize: '13px', color: '#888', margin: '0 0 20px', lineHeight: '1.5' },
  selfiePreview: { width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #d4a7a7', marginBottom: '12px' },
  clearBtn: { display: 'block', margin: '0 auto', background: 'none', border: 'none', color: '#aaa', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' },
  selfieOptions: { display: 'flex', gap: '12px', marginBottom: '20px' },
  optionBtn: {
    flex: 1, display: 'block', padding: '12px', border: '1px solid #d4a7a7', borderRadius: '8px',
    textAlign: 'center', cursor: 'pointer', fontSize: '14px', color: '#c49a9a', background: '#fdf8f8',
  },
  privacyNote: { fontSize: '12px', color: '#aaa', textAlign: 'center', marginTop: '12px', lineHeight: '1.5' },
  resultsPanel: { minHeight: '300px' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#aaa' },
  resultsTitle: { fontSize: '20px', fontWeight: '400', color: '#3a3a3a', margin: '0 0 16px' },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' },
  photoCard: { background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
  photoThumb: { width: '100%', height: '160px', objectFit: 'cover', display: 'block' },
  photoActions: { padding: '10px', display: 'flex', gap: '8px', alignItems: 'center' },
  downloadBtn: { background: 'none', border: '1px solid #d4a7a7', color: '#c49a9a', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' },
  viewLink: { fontSize: '12px', color: '#aaa', textDecoration: 'none' },
  expiryText: { fontSize: '11px', color: '#ccc', padding: '0 10px 8px', margin: 0 },
};
