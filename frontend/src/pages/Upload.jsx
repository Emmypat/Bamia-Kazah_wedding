import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadPhoto } from '../utils/api';

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  // Accept dropped or selected files
  const onDrop = useCallback((acceptedFiles) => {
    const previews = acceptedFiles.map((file) =>
      Object.assign(file, { preview: URL.createObjectURL(file), progress: 0, status: 'pending' })
    );
    setFiles((prev) => [...prev, ...previews]);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  async function handleUpload() {
    if (!files.length) return;
    setUploading(true);
    setError('');
    const uploadResults = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' } : f))
        );

        const result = await uploadPhoto(file, (progress) => {
          setFiles((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, progress } : f))
          );
        });

        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'done', progress: 100 } : f))
        );
        uploadResults.push({ name: file.name, ...result, success: true });
      } catch (err) {
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'error' } : f))
        );
        uploadResults.push({ name: file.name, success: false, error: err.message });
      }
    }

    setResults(uploadResults);
    setUploading(false);
  }

  function removeFile(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalFaces = results.reduce((sum, r) => sum + (r.facesDetected || 0), 0);

  return (
    <div className="page">
      <h1 style={styles.title}>📸 Upload Photos</h1>
      <p style={styles.subtitle}>Share your favourite moments from the celebration</p>

      {/* Dropzone */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div {...getRootProps()} style={{ ...styles.dropzone, ...(isDragActive ? styles.dropzoneActive : {}) }}>
          <input {...getInputProps()} />
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📁</div>
          <p style={styles.dropText}>
            {isDragActive ? 'Drop photos here...' : 'Drag & drop photos here, or tap to select'}
          </p>
          <p style={styles.dropHint}>Supports JPG, PNG, WEBP, HEIC • Max 20MB each</p>
          {/* Camera button for mobile */}
          <label style={{ ...styles.cameraBtn, marginTop: '12px', cursor: 'pointer' }}>
            📷 Take a Photo
            <input type="file" accept="image/*" capture="environment" onChange={(e) => onDrop([...e.target.files])} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={styles.sectionHeading}>Selected Photos ({files.length})</h3>
          <div style={styles.grid}>
            {files.map((file, idx) => (
              <div key={idx} style={styles.fileCard}>
                <img src={file.preview} alt={file.name} style={styles.thumb} />
                <div style={styles.fileInfo}>
                  <p style={styles.fileName}>{file.name}</p>
                  {file.status === 'uploading' && (
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${file.progress}%` }} />
                    </div>
                  )}
                  {file.status === 'done' && <span style={styles.statusDone}>✅ Uploaded</span>}
                  {file.status === 'error' && <span style={styles.statusError}>❌ Failed</span>}
                  {file.status === 'pending' && (
                    <button onClick={() => removeFile(idx)} style={styles.removeBtn}>Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && <div className="alert alert-error" style={{ marginTop: '16px' }}>{error}</div>}

          {results.length === 0 && (
            <button
              className="btn-primary"
              onClick={handleUpload}
              disabled={uploading || files.every(f => f.status === 'done')}
              style={{ marginTop: '16px' }}
            >
              {uploading ? 'Uploading...' : `Upload ${files.length} Photo${files.length > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="alert alert-success">
          ✅ {results.filter(r => r.success).length} photos uploaded! {totalFaces} faces detected across all photos.
          Your guests can now find themselves using the{' '}
          <a href="/search" style={{ color: '#27ae60' }}>selfie search</a>.
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { fontSize: '28px', fontWeight: '400', color: '#3a3a3a', margin: '0 0 8px' },
  subtitle: { color: '#888', marginBottom: '28px' },
  dropzone: {
    border: '2px dashed #d4a7a7',
    borderRadius: '12px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s',
    background: '#fdf8f8',
  },
  dropzoneActive: { background: '#fdf0f0', borderColor: '#c49a9a' },
  dropText: { fontSize: '16px', color: '#666', margin: '0 0 8px' },
  dropHint: { fontSize: '13px', color: '#aaa', margin: 0 },
  cameraBtn: {
    display: 'inline-block',
    background: '#fff',
    border: '1px solid #d4a7a7',
    color: '#c49a9a',
    padding: '8px 20px',
    borderRadius: '20px',
    fontSize: '14px',
  },
  sectionHeading: { fontSize: '16px', color: '#3a3a3a', marginBottom: '16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' },
  fileCard: { border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' },
  thumb: { width: '100%', height: '100px', objectFit: 'cover', display: 'block' },
  fileInfo: { padding: '8px' },
  fileName: { fontSize: '12px', color: '#666', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  progressBar: { background: '#eee', borderRadius: '4px', height: '4px' },
  progressFill: { background: '#c49a9a', height: '100%', borderRadius: '4px', transition: 'width 0.3s' },
  statusDone: { fontSize: '12px', color: '#27ae60' },
  statusError: { fontSize: '12px', color: '#e74c3c' },
  removeBtn: { background: 'none', border: 'none', color: '#aaa', fontSize: '12px', cursor: 'pointer', padding: 0 },
};
