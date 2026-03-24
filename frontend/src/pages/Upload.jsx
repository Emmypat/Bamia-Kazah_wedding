import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadPhoto } from '../utils/api';

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [totalFaces, setTotalFaces] = useState(0);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(null);

  // Auto-reset 5 seconds after a successful upload
  useEffect(() => {
    if (!done || successCount === 0) return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); resetAll(); return null; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [done]);

  const onDrop = useCallback((acceptedFiles) => {
    if (uploading) return;
    const previews = acceptedFiles.map(file =>
      Object.assign(file, { preview: URL.createObjectURL(file), progress: 0, status: 'pending' })
    );
    setFiles(prev => {
      // Drop already-done files when adding new ones after a reset
      const pending = prev.filter(f => f.status === 'pending');
      return [...pending, ...previews];
    });
    setError('');
  }, [uploading]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxSize: 20 * 1024 * 1024,
    disabled: uploading,
  });

  async function handleUpload() {
    const pending = files.filter(f => f.status === 'pending');
    if (!pending.length) return;
    setUploading(true); setError('');

    // Upload all files in parallel
    const results = await Promise.all(
      files.map((file, idx) => {
        if (file.status !== 'pending') return Promise.resolve(null);
        setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status: 'uploading' } : f));
        return uploadPhoto(file, (progress) => {
          setFiles(prev => prev.map((f, i) => i === idx ? { ...f, progress } : f));
        })
          .then(result => {
            const status = result.duplicate ? 'duplicate' : 'done';
            setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status, progress: 100 } : f));
            return { success: true, ...result };
          })
          .catch(err => {
            setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status: 'error' } : f));
            return { success: false, error: err.message };
          });
      })
    );

    const validResults = results.filter(Boolean);
    const sc = validResults.filter(r => r.success).length;
    const tf = validResults.reduce((sum, r) => sum + (r.facesDetected || 0), 0);
    setSuccessCount(sc);
    setTotalFaces(tf);
    setUploading(false);
    setDone(true);
  }

  function resetAll() {
    setFiles([]); setDone(false); setSuccessCount(0);
    setTotalFaces(0); setError(''); setCountdown(null);
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const hasFiles = files.length > 0;

  return (
    <div className="page">
      <div style={styles.header}>
        <h1 style={styles.title}>Upload Photos</h1>
        <p style={styles.subtitle}>Share your favourite moments from Bamai &amp; Kazah's celebration</p>
      </div>

      <div style={styles.infoBanner}>
        <span style={styles.infoIcon}>💡</span>
        <p style={styles.infoText}>
          Upload photos <strong>you took at the wedding</strong>. Once uploaded, every guest can use a selfie to instantly find all photos they appear in — including yours!
        </p>
      </div>

      {/* Success banner */}
      {done && successCount > 0 && (
        <div style={styles.successBanner}>
          <div style={styles.successIcon}>🎉</div>
          <div style={{ flex: 1 }}>
            <p style={styles.successTitle}>
              {successCount} photo{successCount !== 1 ? 's' : ''} uploaded successfully!
            </p>
            <p style={styles.successSub}>
              {totalFaces} face{totalFaces !== 1 ? 's' : ''} detected — guests can find themselves using{' '}
              <a href="/search" style={{ color: '#7A1428', fontWeight: 600 }}>selfie search</a>.
              {countdown && <span style={{ color: '#C4956A' }}> Resetting in {countdown}s...</span>}
            </p>
          </div>
          <button className="btn btn-secondary" onClick={resetAll} style={{ whiteSpace: 'nowrap' }}>
            Upload More
          </button>
        </div>
      )}

      {/* Dropzone — hidden once files are selected */}
      {!hasFiles && (
        <div
          {...getRootProps()}
          style={{ ...styles.dropzone, ...(isDragActive ? styles.dropzoneActive : {}) }}
        >
          <input {...getInputProps()} />
          <div style={styles.dropIcon}>📁</div>
          <p style={styles.dropText}>
            {isDragActive ? 'Drop your photos here...' : 'Drag & drop photos here, or tap to select'}
          </p>
          <p style={styles.dropHint}>JPG, PNG, WEBP, HEIC · Max 20MB per photo</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <label style={styles.cameraLabel}>
              📷 Take a Photo
              <input type="file" accept="image/*" capture="environment" onChange={e => onDrop([...e.target.files])} style={{ display: 'none' }} />
            </label>
            <span style={styles.cameraLabel}>🖼️ Choose Photos</span>
          </div>
        </div>
      )}

      {/* File list */}
      {hasFiles && (
        <div style={styles.fileSection}>
          <div style={styles.fileSectionHeader}>
            <h3 style={styles.sectionTitle}>
              {files.length} photo{files.length !== 1 ? 's' : ''} selected
              {uploading && <span style={styles.uploadingBadge}>Uploading...</span>}
            </h3>
            {!uploading && !done && (
              <button onClick={resetAll} style={styles.clearBtn}>Clear all</button>
            )}
          </div>

          <div style={styles.grid}>
            {files.map((file, idx) => (
              <div key={idx} style={styles.fileCard}>
                <div style={styles.thumbWrap}>
                  <img src={file.preview} alt={file.name} style={styles.thumb} />
                  {file.status === 'uploading' && (
                    <div style={styles.uploadingOverlay}>
                      <div style={styles.miniSpinner} />
                    </div>
                  )}
                  {(file.status === 'done' || file.status === 'duplicate') && <div style={styles.doneOverlay}>✓</div>}
                  {file.status === 'error' && <div style={{ ...styles.doneOverlay, background: 'rgba(155,28,28,0.8)' }}>✕</div>}
                </div>
                <div style={styles.fileInfo}>
                  <p style={styles.fileName}>{file.name}</p>
                  {file.status === 'uploading' && (
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${file.progress}%` }} />
                    </div>
                  )}
                  {file.status === 'done' && <span style={styles.statusDone}>Uploaded</span>}
                  {file.status === 'duplicate' && <span style={styles.statusDuplicate}>Already saved</span>}
                  {file.status === 'error' && <span style={styles.statusError}>Failed</span>}
                  {file.status === 'pending' && !uploading && (
                    <button onClick={() => removeFile(idx)} style={styles.removeBtn}>Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && <div className="alert alert-error" style={{ marginTop: '16px' }}>{error}</div>}

          {/* Add more + Upload buttons */}
          {!uploading && !done && (
            <div style={styles.actionRow}>
              <label style={styles.addMoreBtn}>
                + Add more photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => onDrop([...e.target.files])}
                  style={{ display: 'none' }}
                />
              </label>
              {pendingCount > 0 && (
                <button
                  className="btn btn-primary"
                  onClick={handleUpload}
                  style={{ padding: '14px 40px', fontSize: '16px' }}
                >
                  Upload {pendingCount} Photo{pendingCount !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  header: { marginBottom: '28px' },
  title: { fontSize: 'clamp(24px, 4vw, 34px)', color: '#2D2020', margin: '0 0 8px' },
  subtitle: { color: '#7A6060', fontSize: '15px', margin: 0 },
  dropzone: {
    border: '2px dashed #C4956A', borderRadius: '16px',
    padding: '52px 24px', textAlign: 'center', cursor: 'pointer',
    transition: 'all 0.2s', background: '#FDF6EE', marginBottom: '28px',
  },
  dropzoneActive: { background: '#F7EDE0', borderColor: '#7A1428', transform: 'scale(1.01)' },
  dropIcon: { fontSize: '52px', marginBottom: '14px' },
  dropText: { fontSize: '17px', color: '#5C3D2E', margin: '0 0 8px', fontWeight: '500' },
  dropHint: { fontSize: '13px', color: '#C4956A', margin: '0 0 18px' },
  cameraLabel: {
    display: 'inline-block', background: 'white', border: '1.5px solid #C4956A',
    color: '#5C3D2E', padding: '10px 24px', borderRadius: '50px',
    fontSize: '14px', cursor: 'pointer', fontWeight: '500',
  },
  fileSection: {
    background: 'white', borderRadius: '16px', padding: '24px',
    border: '1px solid #EDE0D8', boxShadow: '0 2px 16px rgba(122,20,40,0.05)',
    marginBottom: '24px',
  },
  fileSectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  sectionTitle: { fontSize: '16px', color: '#2D2020', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' },
  uploadingBadge: { background: '#F5E6E9', color: '#7A1428', fontSize: '12px', padding: '3px 10px', borderRadius: '20px', fontWeight: '600' },
  clearBtn: { background: 'none', border: 'none', color: '#C4956A', fontSize: '13px', cursor: 'pointer', fontWeight: '500' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' },
  fileCard: { border: '1px solid #EDE0D8', borderRadius: '10px', overflow: 'hidden', background: '#FDF6EE' },
  thumbWrap: { position: 'relative', height: '110px' },
  thumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  uploadingOverlay: {
    position: 'absolute', inset: 0, background: 'rgba(45,32,32,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  miniSpinner: {
    width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  doneOverlay: {
    position: 'absolute', inset: 0, background: 'rgba(22,101,52,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontSize: '28px', fontWeight: '700',
  },
  fileInfo: { padding: '8px 10px' },
  fileName: { fontSize: '11px', color: '#7A6060', margin: '0 0 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  progressBar: { background: '#EDE0D8', borderRadius: '4px', height: '5px' },
  progressFill: { background: 'linear-gradient(90deg, #7A1428, #C4956A)', height: '100%', borderRadius: '4px', transition: 'width 0.2s' },
  infoBanner: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    background: '#EFF6FF', border: '1px solid #BFDBFE',
    borderRadius: '12px', padding: '14px 18px', marginBottom: '24px',
  },
  infoIcon: { fontSize: '18px', flexShrink: 0 },
  infoText: { fontSize: '14px', color: '#1E40AF', margin: 0, lineHeight: '1.6' },
  statusDone: { fontSize: '12px', color: '#166534', fontWeight: '600' },
  statusDuplicate: { fontSize: '12px', color: '#92400E', fontWeight: '600' },
  statusError: { fontSize: '12px', color: '#9B1C1C', fontWeight: '600' },
  removeBtn: { background: 'none', border: 'none', color: '#C4956A', fontSize: '12px', cursor: 'pointer', padding: 0 },
  actionRow: { display: 'flex', gap: '16px', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap' },
  addMoreBtn: {
    display: 'inline-block', background: 'none', border: '1.5px dashed #C4956A',
    color: '#C4956A', padding: '12px 24px', borderRadius: '50px',
    fontSize: '14px', cursor: 'pointer', fontWeight: '500',
  },
  successBanner: {
    display: 'flex', alignItems: 'center', gap: '16px',
    background: 'linear-gradient(135deg, #FDF6EE, #F7EDE0)',
    border: '1px solid #EDE0D8', borderRadius: '16px', padding: '24px',
    flexWrap: 'wrap', marginBottom: '24px',
  },
  successIcon: { fontSize: '40px' },
  successTitle: { fontSize: '17px', fontWeight: '600', color: '#2D2020', margin: '0 0 4px' },
  successSub: { fontSize: '14px', color: '#7A6060', margin: 0 },
};
