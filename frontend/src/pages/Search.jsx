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
    setSearching(true); setError('');
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
    a.download = `bamai-kazah-photo-${idx + 1}.jpg`;
    a.click();
  }

  async function handleShare(url) {
    const text = "I found my photo from Bamai & Kazah's wedding!";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Bamai & Kazah's Wedding", text, url });
        return;
      } catch (_) {}
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
  }

  function shareToWhatsApp(url) {
    const text = `I found my photo from Bamai & Kazah's wedding! ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  function shareToFacebook(url) {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
  }

  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied!');
    } catch (_) {
      prompt('Copy this link:', url);
    }
  }

  return (
    <div className="page">
      <h1 style={styles.title}>Find My Photos</h1>
      <p style={styles.subtitle}>
        Upload a selfie and our AI will find every photo you appear in across all guest uploads.
      </p>

      <div style={styles.layout}>
        {/* Left panel */}
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Your Selfie</h3>
          <p style={styles.hint}>Use a clear, front-facing photo in good lighting for the best results.</p>

          {preview ? (
            <div style={styles.previewWrap}>
              <img src={preview} alt="Your selfie" style={styles.selfiePreview} />
              <button
                onClick={() => { setSelfie(null); setPreview(null); setResults(null); }}
                style={styles.changeBtn}
              >
                Choose a different photo
              </button>
            </div>
          ) : (
            <div style={styles.selfieOptions}>
              <label style={styles.optionBtn}>
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '6px' }}>📷</span>
                Take Selfie
                <input type="file" accept="image/*" capture="user" onChange={handleFileSelect} style={{ display: 'none' }} />
              </label>
              <label style={styles.optionBtn}>
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '6px' }}>🖼️</span>
                Upload Photo
                <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
              </label>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={!selfie || searching}
            style={styles.searchBtn}
          >
            {searching ? 'Searching...' : 'Find My Photos'}
          </button>

          <div style={styles.privacyNote}>
            <span style={{ fontSize: '16px' }}>🔒</span>
            <p style={{ margin: 0, fontSize: '12px', color: '#7A6060' }}>
              Your selfie is never stored or shared. It's used only for matching, then discarded immediately.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div style={styles.resultsPanel}>
          {results === null && !searching && (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '72px', marginBottom: '16px' }}>🤳</div>
              <h3 style={styles.emptyTitle}>Your photos will appear here</h3>
              <p style={styles.emptyDesc}>Upload a selfie on the left to get started.</p>
            </div>
          )}

          {searching && (
            <div style={styles.emptyState}>
              <div className="spinner" style={{ margin: '0 auto 20px' }} />
              <h3 style={styles.emptyTitle}>Scanning photos...</h3>
              <p style={styles.emptyDesc}>Our AI is searching for your face across all uploaded photos.</p>
            </div>
          )}

          {results && (
            <div>
              <div style={styles.resultsHeader}>
                <h3 style={styles.resultsTitle}>
                  {results.matchCount > 0
                    ? `Found ${results.matchCount} photo${results.matchCount !== 1 ? 's' : ''} of you`
                    : 'No photos found'}
                </h3>
                {results.matchCount > 0 && (
                  <span style={styles.matchBadge}>{results.matchCount} match{results.matchCount !== 1 ? 'es' : ''}</span>
                )}
              </div>

              {results.matchCount === 0 && (
                <div className="alert alert-info">
                  {results.message || 'No photos found yet. Try again after more photos have been uploaded, or use a clearer selfie.'}
                </div>
              )}

              <div style={styles.photoGrid}>
                {results.photos?.map((photo, idx) => (
                  <div key={idx} style={styles.photoCard}>
                    <div style={styles.photoThumbWrap}>
                      <img src={photo.url} alt={`Match ${idx + 1}`} style={styles.photoThumb} loading="lazy" />
                    </div>
                    <div style={styles.photoActions}>
                      <button onClick={() => handleDownload(photo.url, idx)} style={styles.downloadBtn}>
                        Download
                      </button>
                      <button onClick={() => handleShare(photo.url)} style={styles.shareBtn} title="Share">
                        Share
                      </button>
                    </div>
                    <div style={styles.photoSocial}>
                      <button onClick={() => shareToWhatsApp(photo.url)} style={{ ...styles.socialBtn, background: '#25D366' }}>
                        WhatsApp
                      </button>
                      <button onClick={() => shareToFacebook(photo.url)} style={{ ...styles.socialBtn, background: '#1877F2' }}>
                        Facebook
                      </button>
                      <button onClick={() => copyLink(photo.url)} style={{ ...styles.socialBtn, background: '#5C3D2E' }}>
                        Copy
                      </button>
                    </div>
                    <p style={styles.expiryText}>
                      Valid until {new Date(photo.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  title: { fontSize: 'clamp(24px, 4vw, 34px)', color: '#2D2020', margin: '0 0 8px' },
  subtitle: { color: '#7A6060', marginBottom: '32px', fontSize: '15px' },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(260px, 320px) 1fr',
    gap: '28px',
    alignItems: 'start',
  },
  panel: {
    background: 'white',
    borderRadius: '16px',
    padding: '28px',
    border: '1px solid #EDE0D8',
    boxShadow: '0 4px 24px rgba(122,20,40,0.06)',
    position: 'sticky',
    top: '84px',
  },
  panelTitle: { fontSize: '20px', color: '#2D2020', margin: '0 0 8px' },
  hint: { fontSize: '13px', color: '#7A6060', margin: '0 0 20px', lineHeight: '1.6' },
  previewWrap: { textAlign: 'center', marginBottom: '20px' },
  selfiePreview: {
    width: '140px', height: '140px',
    borderRadius: '50%', objectFit: 'cover',
    border: '3px solid #7A1428',
    marginBottom: '12px', display: 'block', margin: '0 auto 12px',
  },
  changeBtn: { background: 'none', border: 'none', color: '#C4956A', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', display: 'block', margin: '8px auto 0' },
  selfieOptions: { display: 'flex', gap: '12px', marginBottom: '20px' },
  optionBtn: {
    flex: 1, display: 'block', padding: '16px 8px',
    border: '1.5px solid #EDE0D8', borderRadius: '12px',
    textAlign: 'center', cursor: 'pointer',
    fontSize: '13px', color: '#5C3D2E', background: '#FDF6EE',
    fontWeight: '500', transition: 'all 0.2s',
  },
  searchBtn: { width: '100%', justifyContent: 'center', padding: '14px', marginBottom: '16px' },
  privacyNote: {
    display: 'flex', gap: '10px', alignItems: 'flex-start',
    background: '#F7EDE0', borderRadius: '10px', padding: '12px',
  },
  resultsPanel: { minHeight: '300px' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#7A6060' },
  emptyTitle: { fontSize: '20px', color: '#5C3D2E', marginBottom: '8px' },
  emptyDesc: { fontSize: '14px', color: '#7A6060' },
  resultsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' },
  resultsTitle: { fontSize: '22px', color: '#2D2020' },
  matchBadge: {
    background: '#F5E6E9', color: '#7A1428',
    fontSize: '12px', fontWeight: '700',
    padding: '4px 14px', borderRadius: '20px',
    border: '1px solid #e8c0ca',
  },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' },
  photoCard: { background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 16px rgba(122,20,40,0.07)', border: '1px solid #EDE0D8' },
  photoThumbWrap: { height: '160px', overflow: 'hidden' },
  photoThumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  photoActions: { padding: '10px 12px', display: 'flex', gap: '10px', alignItems: 'center' },
  downloadBtn: {
    background: 'linear-gradient(135deg, #7A1428, #5C0F1E)',
    border: 'none', color: 'white',
    padding: '7px 16px', borderRadius: '20px',
    cursor: 'pointer', fontSize: '12px', fontWeight: '500',
  },
  shareBtn: {
    background: '#7A1428', border: 'none', color: 'white',
    padding: '7px 12px', borderRadius: '20px',
    cursor: 'pointer', fontSize: '12px', fontWeight: '500',
  },
  photoSocial: { padding: '0 12px 10px', display: 'flex', gap: '6px', flexWrap: 'wrap' },
  socialBtn: {
    border: 'none', color: 'white',
    padding: '5px 10px', borderRadius: '20px',
    cursor: 'pointer', fontSize: '11px', fontWeight: '500',
  },
  expiryText: { fontSize: '11px', color: '#C4956A', padding: '0 12px 10px', margin: 0 },
};
