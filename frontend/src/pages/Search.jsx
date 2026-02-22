import React, { useState } from 'react'
import { searchBySelfie } from '../utils/api'
import toast from 'react-hot-toast'

export default function Search() {
  const [selfie, setSelfie] = useState(null)       // { file, preview }
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)     // null = not searched yet

  function handleFileChange(file) {
    if (!file) return
    setSelfie({
      file,
      preview: URL.createObjectURL(file),
    })
    setResults(null) // Reset previous results
  }

  async function handleSearch() {
    if (!selfie) {
      toast.error('Please select a selfie first')
      return
    }
    setLoading(true)
    try {
      const data = await searchBySelfie(selfie.file)
      setResults(data)
      if (data.matchCount === 0) {
        toast('No photos found yet — try again later as more guests upload!', { icon: '🤷' })
      } else {
        toast.success(`Found ${data.matchCount} photo${data.matchCount !== 1 ? 's' : ''} with you in them!`)
      }
    } catch (err) {
      toast.error('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 style={styles.title}>Find My Photos</h1>
        <p style={styles.subtitle}>
          Upload a selfie and we'll find every photo you appear in using AI facial recognition.
          <br />
          <span style={{ fontSize: 13, color: '#bbb' }}>
            🔒 Your selfie is never stored — it's only used for matching.
          </span>
        </p>

        {/* Selfie Upload */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={styles.stepTitle}>Step 1: Upload a Selfie</h3>
          <div style={styles.selfieArea}>
            {selfie ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={selfie.preview} alt="Your selfie" style={styles.selfiePreview} />
                <button
                  onClick={() => { setSelfie(null); setResults(null) }}
                  style={styles.removeSelfie}
                >✕</button>
              </div>
            ) : (
              <div style={styles.selfiePrompt}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🤳</div>
                <p style={{ color: '#aaa', fontSize: 14 }}>Select or take a selfie</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 }}>
            {/* Camera selfie (front camera on mobile) */}
            <label className="btn btn-primary">
              📷 Take Selfie
              <input type="file" accept="image/*" capture="user" style={{ display: 'none' }}
                onChange={e => handleFileChange(e.target.files?.[0])} />
            </label>

            {/* File picker */}
            <label className="btn btn-secondary">
              🖼️ Choose Photo
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleFileChange(e.target.files?.[0])} />
            </label>
          </div>
        </div>

        {/* Search button */}
        <button
          className="btn btn-primary"
          onClick={handleSearch}
          disabled={!selfie || loading}
          style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '14px' }}
        >
          {loading ? (
            <><span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Searching...</>
          ) : (
            '🔍 Find My Photos'
          )}
        </button>

        {/* Results */}
        {results && (
          <div style={{ marginTop: 40 }}>
            <h2 style={styles.stepTitle}>
              {results.matchCount > 0
                ? `Found ${results.matchCount} Photo${results.matchCount !== 1 ? 's' : ''} 🎉`
                : 'No Photos Found Yet'}
            </h2>

            {results.matchCount === 0 && (
              <div className="alert" style={{ background: '#fdf8f0', color: '#92400e', border: '1px solid #fde68a' }}>
                You haven't been captured yet, or the photos with you haven't been uploaded. 
                Check back later as more guests share their photos!
              </div>
            )}

            <div className="photo-grid" style={{ marginTop: 20 }}>
              {results.photos?.map((photo, i) => (
                <PhotoResult key={i} photo={photo} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PhotoResult({ photo }) {
  return (
    <div className="photo-card">
      <img
        src={photo.url}
        alt="Wedding photo"
        loading="lazy"
        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
        onError={e => { e.target.style.background = '#f0e4e4'; e.target.alt = '(expired)' }}
      />
      <div className="photo-card-footer">
        <a
          href={photo.url}
          download
          className="btn btn-secondary"
          style={{ fontSize: 12, padding: '6px 14px' }}
        >
          ⬇️ Download
        </a>
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
  subtitle: { color: '#888', marginBottom: 32, lineHeight: 1.7 },
  stepTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 24,
    fontWeight: 400,
    color: '#3a3a3a',
    marginBottom: 20,
  },
  selfieArea: { display: 'flex', justifyContent: 'center', minHeight: 160 },
  selfiePrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
    background: '#fdf7f7',
    borderRadius: 12,
    border: '2px dashed #e8c5c5',
  },
  selfiePreview: {
    width: 160,
    height: 160,
    objectFit: 'cover',
    borderRadius: 12,
    border: '3px solid #d4a7a7',
  },
  removeSelfie: {
    position: 'absolute',
    top: -8,
    right: -8,
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: 24,
    height: 24,
    cursor: 'pointer',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
