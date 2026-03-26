import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const WEDDING_DATE = new Date('2026-04-11T11:00:00');

function getTimeLeft() {
  const diff = WEDDING_DATE - Date.now();
  if (diff <= 0) return null;
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function Countdown() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!timeLeft) return null;
  return (
    <div style={styles.countdown}>
      {[
        { label: 'Days',    value: timeLeft.days },
        { label: 'Hours',   value: timeLeft.hours },
        { label: 'Minutes', value: timeLeft.minutes },
        { label: 'Seconds', value: timeLeft.seconds },
      ].map(({ label, value }) => (
        <div key={label} style={styles.countdownBox}>
          <span style={styles.countdownNum}>{String(value).padStart(2, '0')}</span>
          <span style={styles.countdownLabel}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div>
      {/* ── Hero ─────────────────────────────────── */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <p style={styles.preTitle}>Bamai &amp; Kazah Wedding · 11 April 2026</p>
          <h1 style={styles.heroTitle}>Your Wedding, Captured &amp; Shared Instantly</h1>
          <p style={styles.heroSubtitle}>
            Upload photos, find yourself using face recognition,<br />
            and get your attendance ticket — all in one place.
          </p>

          <div style={styles.heroCTA}>
            <Link to="/upload" className="btn btn-primary" style={styles.ctaBtnPrimary}>
              📸 Upload Photos
            </Link>
            <Link to="/search" className="btn btn-secondary" style={styles.ctaBtnSecondary}>
              🤳 Find My Photos
            </Link>
            <Link to="/get-ticket" className="btn" style={styles.ctaBtnTicket}>
              🎟️ Get My Ticket
            </Link>
          </div>

          <Countdown />
        </div>
      </section>

      {/* ── Three primary actions ─────────────────── */}
      <section style={styles.actionsSection}>
        <p style={styles.actionsPre}>What would you like to do?</p>
        <div style={styles.actionCards}>

          <div style={styles.actionCard}>
            <div style={styles.actionEmoji}>📸</div>
            <h2 style={styles.actionTitle}>Upload Photos</h2>
            <p style={styles.actionDesc}>
              Share photos you took at the ceremony or reception. Our AI automatically detects every face so guests can find themselves.
            </p>
            <div style={styles.actionSteps}>
              <span style={styles.actionStep}>→ Register with your phone number</span>
              <span style={styles.actionStep}>→ Drop your photos in</span>
              <span style={styles.actionStep}>→ AI indexes every face instantly</span>
            </div>
            <Link to="/upload" className="btn btn-primary" style={styles.actionBtn}>
              Upload Photos
            </Link>
          </div>

          <div style={{ ...styles.actionCard, borderColor: '#C4956A' }}>
            <div style={styles.actionEmoji}>🤳</div>
            <h2 style={styles.actionTitle}>Find My Photos</h2>
            <p style={styles.actionDesc}>
              Take a selfie and our AI scans every uploaded photo to find the ones you appear in — no manual searching needed.
            </p>
            <div style={styles.actionSteps}>
              <span style={styles.actionStep}>→ Register with your phone number</span>
              <span style={styles.actionStep}>→ Upload a clear selfie</span>
              <span style={styles.actionStep}>→ Download every photo of you</span>
            </div>
            <Link to="/search" className="btn btn-secondary" style={styles.actionBtn}>
              Find My Photos
            </Link>
          </div>

          <div style={{ ...styles.actionCard, borderColor: '#5C3D2E' }}>
            <div style={styles.actionEmoji}>🎟️</div>
            <h2 style={styles.actionTitle}>Get My Ticket</h2>
            <p style={styles.actionDesc}>
              Generate your personal attendance ticket with a unique ID and QR code. Download it, share it, or show it at the venue.
            </p>
            <div style={styles.actionSteps}>
              <span style={styles.actionStep}>→ Enter your name and phone</span>
              <span style={styles.actionStep}>→ Take a quick selfie</span>
              <span style={styles.actionStep}>→ Download your QR ticket instantly</span>
            </div>
            <Link to="/get-ticket" className="btn" style={{ ...styles.actionBtn, background: '#5C3D2E', color: 'white', border: 'none' }}>
              Get My Ticket
            </Link>
          </div>

        </div>
      </section>

      {/* ── How it works ─────────────────────────── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>How It Works</h2>
        <div style={styles.steps}>
          {[
            { num: '1', icon: '📱', title: 'Register Free', desc: 'Create a guest account with just your name and phone number. No password, no verification — done in seconds.' },
            { num: '2', icon: '📸', title: 'Upload Photos', desc: 'Share photos you took. Our AI detects and indexes every face automatically.' },
            { num: '3', icon: '🤳', title: 'Find Yourself', desc: 'Take a selfie and our AI finds every photo you appear in across all uploads.' },
            { num: '4', icon: '🎟️', title: 'Get Your Ticket', desc: 'Generate a personal QR attendance ticket with your name and unique ID.' },
          ].map((s) => (
            <div key={s.num} style={styles.stepCard}>
              <div style={styles.stepNum}>{s.num}</div>
              <div style={styles.stepIcon}>{s.icon}</div>
              <h3 style={styles.stepTitle}>{s.title}</h3>
              <p style={styles.stepDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Wedding details ───────────────────────── */}
      <section style={styles.weddingSection}>
        <div style={styles.weddingCard}>
          <p style={styles.weddingPre}>The Celebration</p>
          <h2 style={styles.coupleTitle}>Bamai Judith Bako</h2>
          <p style={styles.ampersand}>&amp;</p>
          <h2 style={styles.coupleTitle}>Kazah Emmanuel Patrick</h2>

          <div style={styles.divider} />

          <div style={styles.details}>
            <div style={styles.detailItem}>
              <span style={styles.detailIcon}>📅</span>
              <div>
                <p style={styles.detailLabel}>Ceremony</p>
                <p style={styles.detailValue}>11th April, 2026 · 11:00am</p>
              </div>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailIcon}>📍</span>
              <div>
                <p style={styles.detailLabel}>Venue</p>
                <p style={styles.detailValue}>Our Lady of Fatima Chaplaincy, Sabon Tasha, Kaduna</p>
              </div>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailIcon}>🥂</span>
              <div>
                <p style={styles.detailLabel}>Reception</p>
                <p style={styles.detailValue}>Epitome Event Center, Barnawa Kaduna</p>
              </div>
            </div>
          </div>

          <div style={styles.colours}>
            <span style={styles.coloursLabel}>Colours of the Day</span>
            <div style={styles.swatches}>
              {[
                { color: '#7A1428', name: 'Burgundy' },
                { color: '#C4956A', name: 'Onion' },
                { color: '#5C3D2E', name: 'Brown' },
              ].map(({ color, name }) => (
                <div key={name} style={styles.swatch}>
                  <div style={{ ...styles.swatchDot, background: color }} />
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Sendforth info ───────────────────────── */}
      <section style={styles.sendforthSection}>
        <div style={styles.sendforthCard}>
          <p style={styles.sendforthPre}>Also Join Us For</p>
          <h2 style={styles.sendforthTitle}>Sendforth Prayer</h2>
          <p style={styles.sendforthDetail}>9th April, 2026 · 12:00 noon</p>
          <p style={styles.sendforthDetail}>St. Augustine's Catholic Church, Mahuta, Kaduna</p>
          <div style={styles.rsvp}>
            <p style={styles.rsvpLabel}>RSVP</p>
            <p style={styles.rsvpNumbers}>07061340133 · 07031150932 · 07066580062</p>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────── */}
      <section style={styles.ctaSection}>
        <h2 style={styles.ctaTitle}>Ready to join the celebration?</h2>
        <p style={styles.ctaSubtitle}>Register in seconds — no password, no email verification needed.</p>
        <Link to="/register" className="btn" style={styles.ctaBtn}>Get Started Free</Link>
      </section>
    </div>
  );
}

const styles = {
  /* Hero */
  hero: {
    background: 'linear-gradient(160deg, #1a0609 0%, #3d0f1a 50%, #5c1a28 100%)',
    padding: '80px 20px 72px',
    textAlign: 'center',
  },
  heroContent: { maxWidth: '720px', margin: '0 auto' },
  preTitle: {
    fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase',
    color: '#C4956A', margin: '0 0 20px',
  },
  heroTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(32px, 5.5vw, 58px)',
    fontWeight: '600', color: 'white',
    margin: '0 0 20px', lineHeight: 1.15,
  },
  heroSubtitle: {
    fontSize: 'clamp(15px, 2vw, 18px)',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: '1.7', margin: '0 0 36px',
  },
  heroCTA: { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '40px' },
  ctaBtnPrimary: { padding: '15px 32px', fontSize: '16px', fontWeight: '700' },
  ctaBtnSecondary: { padding: '15px 32px', fontSize: '16px', fontWeight: '700' },
  ctaBtnTicket: {
    padding: '15px 32px', fontSize: '16px', fontWeight: '700',
    background: 'transparent', border: '2px solid rgba(255,255,255,0.5)',
    color: 'white', borderRadius: '50px',
  },

  /* Countdown — compact, below CTA */
  countdown: { display: 'inline-flex', justifyContent: 'center', gap: '10px' },
  countdownBox: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px', padding: '10px 14px',
    minWidth: '58px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  countdownNum: { fontSize: '22px', fontWeight: '700', color: 'white', lineHeight: 1 },
  countdownLabel: { fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#C4956A', marginTop: '3px' },

  /* Action cards */
  actionsSection: {
    maxWidth: '1060px', margin: '0 auto', padding: '72px 20px 48px',
    textAlign: 'center',
  },
  actionsPre: {
    fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase',
    color: '#C4956A', marginBottom: '32px', fontWeight: '600',
  },
  actionCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px', textAlign: 'left',
  },
  actionCard: {
    background: 'white', borderRadius: '20px', padding: '36px 28px',
    border: '2px solid #7A1428',
    boxShadow: '0 8px 32px rgba(122,20,40,0.10)',
    display: 'flex', flexDirection: 'column', gap: '16px',
  },
  actionEmoji: { fontSize: '44px', lineHeight: 1 },
  actionTitle: { fontSize: '24px', color: '#2D2020', margin: 0, fontFamily: "'Cormorant Garamond', Georgia, serif" },
  actionDesc: { fontSize: '14px', color: '#7A6060', lineHeight: '1.7', margin: 0 },
  actionSteps: { display: 'flex', flexDirection: 'column', gap: '6px' },
  actionStep: { fontSize: '13px', color: '#5C3D2E', fontWeight: '500' },
  actionBtn: { alignSelf: 'flex-start', marginTop: '4px', padding: '12px 28px' },

  /* How it works */
  section: { maxWidth: '1060px', margin: '0 auto', padding: '72px 20px' },
  sectionTitle: {
    textAlign: 'center', fontSize: 'clamp(26px, 4vw, 38px)',
    color: '#2D2020', marginBottom: '48px',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
  steps: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' },
  stepCard: {
    background: 'white', borderRadius: '16px', padding: '32px 24px',
    textAlign: 'center', boxShadow: '0 4px 24px rgba(122,20,40,0.06)',
    border: '1px solid #EDE0D8',
  },
  stepNum: {
    display: 'inline-block', width: '30px', height: '30px', lineHeight: '30px',
    borderRadius: '50%', background: '#7A1428', color: 'white',
    fontSize: '13px', fontWeight: '700', marginBottom: '14px',
  },
  stepIcon: { fontSize: '34px', marginBottom: '12px' },
  stepTitle: { fontSize: '20px', color: '#7A1428', margin: '0 0 10px' },
  stepDesc: { fontSize: '14px', color: '#7A6060', lineHeight: '1.7', margin: 0 },

  /* Wedding details */
  weddingSection: {
    background: 'linear-gradient(180deg, #fff5f5 0%, #FDF6EE 100%)',
    borderTop: '1px solid #EDE0D8',
    borderBottom: '1px solid #EDE0D8',
    padding: '72px 20px',
  },
  weddingCard: { maxWidth: '560px', margin: '0 auto', textAlign: 'center' },
  weddingPre: {
    fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase',
    color: '#C4956A', marginBottom: '16px',
  },
  coupleTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(28px, 5vw, 48px)',
    fontWeight: '600', color: '#7A1428', margin: 0, lineHeight: 1.15,
  },
  ampersand: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '30px', color: '#C4956A', margin: '6px 0', lineHeight: 1, fontStyle: 'italic',
  },
  divider: {
    width: '50px', height: '2px',
    background: 'linear-gradient(90deg, #7A1428, #C4956A)',
    margin: '24px auto', borderRadius: '2px',
  },
  details: {
    display: 'flex', flexDirection: 'column', gap: '14px',
    textAlign: 'left', background: 'white',
    border: '1px solid #EDE0D8', borderRadius: '14px',
    padding: '24px', marginBottom: '24px',
    boxShadow: '0 4px 20px rgba(122,20,40,0.06)',
  },
  detailItem: { display: 'flex', alignItems: 'flex-start', gap: '14px' },
  detailIcon: { fontSize: '20px', marginTop: '2px' },
  detailLabel: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#C4956A', margin: '0 0 2px', fontWeight: '600' },
  detailValue: { fontSize: '15px', color: '#2D2020', margin: 0, fontWeight: '500' },
  colours: { marginTop: '4px' },
  coloursLabel: { display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: '#7A6060', marginBottom: '12px' },
  swatches: { display: 'flex', justifyContent: 'center', gap: '24px' },
  swatch: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#5C3D2E', fontWeight: '500' },
  swatchDot: { width: '22px', height: '22px', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },

  /* Sendforth */
  sendforthSection: {
    background: '#F7EDE0', padding: '60px 20px',
    borderBottom: '1px solid #EDE0D8',
  },
  sendforthCard: { maxWidth: '480px', margin: '0 auto', textAlign: 'center' },
  sendforthPre: { fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#C4956A', marginBottom: '10px' },
  sendforthTitle: { fontSize: '32px', color: '#5C3D2E', marginBottom: '14px', fontFamily: "'Cormorant Garamond', Georgia, serif" },
  sendforthDetail: { fontSize: '15px', color: '#7A6060', margin: '4px 0' },
  rsvp: { marginTop: '24px', background: 'white', borderRadius: '12px', padding: '16px 24px', border: '1px solid #EDE0D8' },
  rsvpLabel: { fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#7A1428', marginBottom: '6px', fontWeight: '600' },
  rsvpNumbers: { fontSize: '15px', color: '#5C3D2E', fontWeight: '600' },

  /* CTA */
  ctaSection: {
    background: 'linear-gradient(135deg, #7A1428 0%, #5C0F1E 100%)',
    padding: '80px 20px', textAlign: 'center',
  },
  ctaTitle: { color: 'white', fontSize: 'clamp(26px, 4vw, 40px)', marginBottom: '10px' },
  ctaSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: '16px', marginBottom: '36px' },
  ctaBtn: {
    background: 'white', color: '#7A1428',
    padding: '16px 48px', fontSize: '16px', fontWeight: '700',
    borderRadius: '50px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    textDecoration: 'none', display: 'inline-block',
  },
};
