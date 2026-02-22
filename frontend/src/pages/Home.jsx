import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={styles.page}>
      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.emoji}>💒</div>
          <h1 style={styles.heroTitle}>Wedding Photo Platform</h1>
          <p style={styles.heroSubtitle}>
            Share memories, find yourself in photos, and relive every magical moment.
            Powered by AI facial recognition.
          </p>
          <div style={styles.heroCTA}>
            <Link to="/upload" className="btn-primary">📸 Upload Photos</Link>
            <Link to="/search" className="btn-secondary" style={{ marginLeft: '16px' }}>
              🔍 Find My Photos
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>How It Works</h2>
        <div style={styles.steps}>
          {[
            { icon: '📱', title: 'Register', desc: 'Create your guest account with just your email.' },
            { icon: '📸', title: 'Upload', desc: 'Share photos from the celebration directly from your phone.' },
            { icon: '🤳', title: 'Find Yourself', desc: 'Upload a selfie and our AI finds every photo you appear in.' },
            { icon: '💌', title: 'Get Notified', desc: "Receive automatic emails when the couple appears in new photos." },
          ].map((step) => (
            <div key={step.title} style={styles.stepCard}>
              <div style={styles.stepIcon}>{step.icon}</div>
              <h3 style={styles.stepTitle}>{step.title}</h3>
              <p style={styles.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={styles.ctaSection}>
        <h2 style={styles.ctaTitle}>Ready to share your memories?</h2>
        <Link to="/register" className="btn-primary">Get Started →</Link>
      </section>
    </div>
  );
}

const styles = {
  page: { fontFamily: 'Georgia, serif' },
  hero: {
    background: 'linear-gradient(135deg, #fdf0f0 0%, #f9f7f4 100%)',
    padding: '80px 20px',
    textAlign: 'center',
  },
  heroContent: { maxWidth: '700px', margin: '0 auto' },
  emoji: { fontSize: '64px', marginBottom: '16px' },
  heroTitle: {
    fontSize: 'clamp(28px, 5vw, 48px)',
    color: '#3a3a3a',
    margin: '0 0 16px',
    fontWeight: '400',
    letterSpacing: '1px',
  },
  heroSubtitle: {
    fontSize: '18px',
    color: '#777',
    lineHeight: '1.7',
    margin: '0 0 40px',
  },
  heroCTA: { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px' },
  section: { maxWidth: '1000px', margin: '0 auto', padding: '60px 20px' },
  sectionTitle: {
    textAlign: 'center',
    fontSize: '28px',
    color: '#3a3a3a',
    fontWeight: '400',
    marginBottom: '40px',
  },
  steps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
  },
  stepCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '28px 20px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  },
  stepIcon: { fontSize: '36px', marginBottom: '12px' },
  stepTitle: { fontSize: '18px', color: '#c49a9a', margin: '0 0 8px', fontWeight: '600' },
  stepDesc: { fontSize: '14px', color: '#777', lineHeight: '1.6', margin: 0 },
  ctaSection: {
    background: 'linear-gradient(135deg, #d4a7a7, #c49a9a)',
    padding: '60px 20px',
    textAlign: 'center',
  },
  ctaTitle: { color: '#fff', fontSize: '28px', fontWeight: '400', margin: '0 0 24px' },
};
