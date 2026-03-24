import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadPhoto } from '../utils/api';

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    const previews = acceptedFiles.map(file =>
      Object.assign(file, { preview: URL.createObjectURL(file), progress: 0, status: 'pending' })
    );
    setFiles(prev => [...prev, ...previews]);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxSize: 20 * 1024 * 1024,
  });

  async function handleUpload() {
    if (!files.length) return;
    setUploading(true); setError('');
    const uploadResults = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.status === 'done') continue;
      try {
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f));
        const result = await uploadPhoto(file, (progress) => {
          setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress } : f));
        });
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done', progress: 100 } : f));
        uploadResults.push({ name: file.name, ...result, success: true });
      } catch (err) {
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error' } : f));
        uploadResults.push({ name: file.name, success: false, error: err.message });
      }
    }

    setResults(uploadResults);
    setUploading(false);
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function clearAll() {
    setFiles([]); setResults([]); setError('');
  }

  const successCount = results.filter(r => r.success).length;
  const totalFaces = results.reduce((sum, r) => sum + (r.facesDetected || 0), 0);
  const pendingFiles = files.filter(f => f.status === 'pending');

  return (
    <div className="page">
      <div style={styles.header}>
        <h1 style={styles.title}>Upload Photos</h1>
        <p style={styles.subtitle}>Share your favourite moments from Bamai &amp; Kazah's celebration</p>
      </div>

      {/* Dropzone */}
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
        <label style={styles.cameraLabel}>
          📷 Take a Photo
          <input type="file" accept="image/*" capture="environment" onChange={e => onDrop([...e.target.files])} style={{ display: 'none' }} />
        </label>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div style={styles.fileSection}>
          <div style={styles.fileSectionHeader}>
            <h3 style={styles.sectionTitle}>
              {files.length} photo{files.length !== 1 ? 's' : ''} selected
            </h3>
            {results.length === 0 && (
              <button onClick={clearAll} style={styles.clearBtn}>Clear all</button>
            )}
          </div>

          <div style={styles.grid}>
            {files.map((file, idx) => (
              <div key={idx} style={styles.fileCard}>
                <div style={styles.thumbWrap}>
                  <img src={file.preview} alt={file.name} style={styles.thumb} />
                  {file.status === 'done' && <div style={styles.doneOverlay}>✓</div>}
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
                  {file.status === 'error' && <span style={styles.statusError}>Failed</span>}
                  {file.status === 'pending' && (
                    <button onClick={() => removeFile(idx)} style={styles.removeBtn}>Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && <div className="alert alert-error" style={{ marginTop: '16px' }}>{error}</div>}

          {results.length === 0 && pendingFiles.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploading}
              style={{ marginTop: '20px', padding: '14px 40px', fontSize: '16px' }}
            >
              {uploading ? 'Uploading...' : `Upload ${pendingFiles.length} Photo${pendingFiles.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}

      {/* Success result */}
      {results.length > 0 && successCount > 0 && (
        <div style={styles.successBanner}>
          <div style={styles.successIcon}>🎉</div>
          <div>
            <p style={styles.successTitle}>
              {successCount} photo{successCount !== 1 ? 's' : ''} uploaded successfully!
            </p>
            <p style={styles.successSub}>
              {totalFaces} face{totalFaces !== 1 ? 's' : ''} detected — guests can now find themselves using{' '}
              <a href="/search" style={{ color: '#7A1428', fontWeight: 600 }}>selfie search</a>.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={clearAll} style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            Upload More
          </button>
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
    border: '2px dashed #C4956A',
    borderRadius: '16px',
    padding: '52px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: '#FDF6EE',
    marginBottom: '28px',
  },
  dropzoneActive: { background: '#F7EDE0', borderColor: '#7A1428', transform: 'scale(1.01)' },
  dropIcon: { fontSize: '52px', marginBottom: '14px' },
  dropText: { fontSize: '17px', color: '#5C3D2E', margin: '0 0 8px', fontWeight: '500' },
  dropHint: { fontSize: '13px', color: '#C4956A', margin: '0 0 18px' },
  cameraLabel: {
    display: 'inline-block',
    background: 'white',
    border: '1.5px solid #C4956A',
    color: '#5C3D2E',
    padding: '10px 24px',
    borderRadius: '50px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  fileSection: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #EDE0D8',
    boxShadow: '0 2px 16px rgba(122,20,40,0.05)',
    marginBottom: '24px',
  },
  fileSectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  sectionTitle: { fontSize: '16px', color: '#2D2020', margin: 0 },
  clearBtn: { background: 'none', border: 'none', color: '#C4956A', fontSize: '13px', cursor: 'pointer', fontWeight: '500' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' },
  fileCard: { border: '1px solid #EDE0D8', borderRadius: '10px', overflow: 'hidden', background: '#FDF6EE' },
  thumbWrap: { position: 'relative', height: '110px' },
  thumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  doneOverlay: {
    position: 'absolute', inset: 0,
    background: 'rgba(92,61,46,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontSize: '28px', fontWeight: '700',
  },
  fileInfo: { padding: '8px 10px' },
  fileName: { fontSize: '11px', color: '#7A6060', margin: '0 0 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  progressBar: { background: '#EDE0D8', borderRadius: '4px', height: '5px' },
  progressFill: { background: 'linear-gradient(90deg, #7A1428, #C4956A)', height: '100%', borderRadius: '4px', transition: 'width 0.3s' },
  statusDone: { fontSize: '12px', color: '#166534', fontWeight: '600' },
  statusError: { fontSize: '12px', color: '#9B1C1C', fontWeight: '600' },
  removeBtn: { background: 'none', border: 'none', color: '#C4956A', fontSize: '12px', cursor: 'pointer', padding: 0 },
  successBanner: {
    display: 'flex', alignItems: 'center', gap: '16px',
    background: 'linear-gradient(135deg, #FDF6EE, #F7EDE0)',
    border: '1px solid #EDE0D8',
    borderRadius: '16px', padding: '24px',
    flexWrap: 'wrap',
  },
  successIcon: { fontSize: '40px' },
  successTitle: { fontSize: '17px', fontWeight: '600', color: '#2D2020', margin: '0 0 4px' },
  successSub: { fontSize: '14px', color: '#7A6060', margin: 0 },
};
