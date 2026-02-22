import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadPhoto } from '../utils/api'
import toast from 'react-hot-toast'

export default function Upload() {
  const [files, setFiles] = useState([])       // Selected files with preview URLs
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState([])   // Upload results
  const [progress, setProgress] = useState({}) // Per-file progress

  // useDropzone: handles drag-and-drop and file selection
  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).slice(2),
      preview: URL.createObjectURL(file), // Local preview URL
      status: 'pending', // pending | uploading | done | error
    }))
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    multiple: true,
    maxSize: 20 * 1024 * 1024, // 20MB
    onDropRejected: (rejected) => {
      rejected.forEach(r => {
        const error = r.errors[0]
        if (error.code === 'file-too-large') toast.error('File too large (max 20MB)')
        if (error.code === 'file-invalid-type') toast.error('Invalid file type')
      })
    }
  })

  function removeFile(id) {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  async function handleUploadAll() {
    const pending = files.filter(f => f.status === 'pending')
    if (!pending.length) return

    setUploading(true)

    // Upload files one at a time (to avoid overwhelming the API)
    for (const fileItem of pending) {
      setFiles(prev => prev.map(f =>
        f.id === fileItem.id ? { ...f, status: 'uploading' } : f
      ))

      try {
        const result = await uploadPhoto(fileItem.file, (pct) => {
          setProgress(prev => ({ ...prev, [fileItem.id]: pct }))
        })

        setFiles(prev => prev.map(f =>
          f.id === fileItem.id ? { ...f, status: 'done' } : f
        ))
        setResults(prev => [...prev, { ...result, fileName: fileItem.file.name }])
        toast.success(`✅ ${fileItem.file.name} uploaded (${result.facesDetected} faces detected)`)

      } catch (err) {
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id ? { ...f, status: 'error' } : f
        ))
        toast.error(`Failed to upload ${fileItem.file.name}`)
      }
    }

    setUploading(false)
  }

  const pendingCount = files.filter(f => f.status === 'pending').length

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 style={styles.title}>Upload Photos</h1>
        <p style={styles.subtitle}>Share your wedding memories with all the guests</p>

        {/* Dropzone */}
        <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`} style={styles.dropzone}>
          <input {...getInputProps()} />
          <div className="dropzone-icon">📸</div>
          {isDragActive ? (
            <p style={styles.dropText}>Drop your photos here...</p>
          ) : (
            <>
              <p style={styles.dropText}>Drag & drop photos here, or click to select</p>
              <p style={styles.dropHint}>JPEG, PNG, WebP, HEIC · Max 20MB each</p>
            </>
          )}
          {/* Camera capture (mobile) */}
          <div style={{ marginTop: 16 }}>
            <label style={styles.cameraBtn}>
              📷 Take a Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files?.[0]) {
                    onDrop([e.target.files[0]])
                  }
                }}
              />
            </label>
          </div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={styles.fileList}>
            {files.map(fileItem => (
              <div key={fileItem.id} style={styles.fileItem}>
                <img src={fileItem.preview} alt="" style={styles.fileThumb} />
                <div style={styles.fileInfo}>
                  <span style={styles.fileName}>{fileItem.file.name}</span>
                  <span style={styles.fileSize}>{(fileItem.file.size / 1024 / 1024).toFixed(1)} MB</span>
                  {fileItem.status === 'uploading' && (
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${progress[fileItem.id] || 0}%` }} />
                    </div>
                  )}
                </div>
                <div style={styles.fileStatus}>
                  {fileItem.status === 'pending' && (
                    <button onClick={() => removeFile(fileItem.id)} style={styles.removeBtn}>✕</button>
                  )}
                  {fileItem.status === 'uploading' && <span style={{ fontSize: 18 }}>⏳</span>}
                  {fileItem.status === 'done' && <span style={{ fontSize: 18, color: '#22c55e' }}>✅</span>}
                  {fileItem.status === 'error' && <span style={{ fontSize: 18, color: '#ef4444' }}>❌</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        {pendingCount > 0 && (
          <button
            className="btn btn-primary"
            onClick={handleUploadAll}
            disabled={uploading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 20, fontSize: 16, padding: '14px' }}
          >
            {uploading
              ? 'Uploading...'
              : `Upload ${pendingCount} Photo${pendingCount !== 1 ? 's' : ''}`}
          </button>
        )}

        {/* Results summary */}
        {results.length > 0 && (
          <div className="alert alert-success" style={{ marginTop: 20 }}>
            🎉 {results.length} photo{results.length !== 1 ? 's' : ''} uploaded!
            Total faces detected: {results.reduce((sum, r) => sum + (r.facesDetected || 0), 0)}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 40,
    fontWeight: 400,
    color: '#3a3a3a',
    marginBottom: 8,
  },
  subtitle: { color: '#888', marginBottom: 32 },
  dropzone: {
    border: '2px dashed #d4a7a7',
    borderRadius: 12,
    padding: '48px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    background: '#fdf7f7',
    transition: 'all 0.2s',
    marginBottom: 24,
  },
  dropText: { fontSize: 16, color: '#555', marginBottom: 6 },
  dropHint: { fontSize: 13, color: '#aaa' },
  cameraBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'white',
    border: '1.5px solid #d4a7a7',
    borderRadius: '50px',
    padding: '8px 20px',
    fontSize: 14,
    color: '#d4a7a7',
    cursor: 'pointer',
    fontWeight: 500,
  },
  fileList: { display: 'flex', flexDirection: 'column', gap: 10 },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'white',
    borderRadius: 8,
    padding: '10px 14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  fileThumb: { width: 48, height: 48, objectFit: 'cover', borderRadius: 6 },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: { display: 'block', fontSize: 14, fontWeight: 500, color: '#3a3a3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileSize: { display: 'block', fontSize: 12, color: '#aaa' },
  fileStatus: { width: 32, textAlign: 'center' },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#ccc',
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
    padding: 4,
  },
  progressBar: { height: 3, background: '#f0e4e4', borderRadius: 2, marginTop: 4 },
  progressFill: { height: '100%', background: '#d4a7a7', borderRadius: 2, transition: 'width 0.3s' },
}
