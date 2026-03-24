import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const WEDDING_DATE = new Date('2026-04-11T11:00:00');

function Countdown() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

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

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) return <p style={styles.countdownDone}>The celebration has begun!</p>;

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
          <p style={styles.preTitle}>Wedding Solemnization of</p>
          <h1 style={styles.coupleTitle}>Bamai Judith Bako</h1>
          <p style={styles.ampersand}>&amp;</p>
          <h1 style={styles.coupleTitle}>Kazah Emmanuel Patrick</h1>

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
              <div style={styles.swatch}>
                <div style={{ ...styles.swatchDot, background: '#7A1428' }} />
                <span>Burgundy</span>
              </div>
              <div style={styles.swatch}>
                <div style={{ ...styles.swatchDot, background: '#C4956A' }} />
                <span>Onion</span>
              </div>
              <div style={styles.swatch}>
                <div style={{ ...styles.swatchDot, background: '#5C3D2E' }} />
                <span>Brown</span>
              </div>
            </div>
          </div>

          <Countdown />

          <div style={styles.heroCTA}>
            <Link to="/register" className="btn btn-primary" style={{ padding: '14px 36px', fontSize: '16px' }}>
              Join & Share Photos
            </Link>
            <Link to="/search" className="btn btn-secondary" style={{ padding: '14px 36px', fontSize: '16px' }}>
              Find My Photos
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>How It Works</h2>
        <div style={styles.steps}>
          {[
            { num: '1', icon: '📱', title: 'Register', desc: 'Create your guest account with just your name and email. It takes under a minute.' },
            { num: '2', icon: '📸', title: 'Upload Photos', desc: 'Share your favourite moments from the ceremony and reception directly from your phone.' },
            { num: '3', icon: '🤳', title: 'Find Yourself', desc: 'Upload a selfie and our AI instantly finds every photo you appear in across all uploads.' },
            { num: '4', icon: '💌', title: 'Get Notified', desc: 'Receive an automatic email alert whenever the couple appears in a newly uploaded photo.' },
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
        <h2 style={styles.ctaTitle}>Ready to share your memories?</h2>
        <p style={styles.ctaSubtitle}>Every moment captured is a memory that lasts forever.</p>
        <Link to="/register" className="btn" style={styles.ctaBtn}>Get Started</Link>
      </section>
    </div>
  );
}

const styles = {
  /* Hero */
  hero: {
    background: 'linear-gradient(180deg, #fff5f5 0%, #FDF6EE 100%)',
    borderBottom: '1px solid #EDE0D8',
    padding: '72px 20px 80px',
    textAlign: 'center',
  },
  heroContent: { maxWidth: '680px', margin: '0 auto' },
  preTitle: {
    fontSize: '13px',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    color: '#C4956A',
    margin: '0 0 18px',
    fontFamily: 'Inter, sans-serif',
  },
  coupleTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(34px, 7vw, 62px)',
    fontWeight: '600',
    color: '#7A1428',
    margin: '0',
    lineHeight: 1.1,
  },
  ampersand: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '36px',
    color: '#C4956A',
    margin: '6px 0',
    lineHeight: 1,
    fontStyle: 'italic',
  },
  divider: {
    width: '60px',
    height: '2px',
    background: 'linear-gradient(90deg, #7A1428, #C4956A)',
    margin: '28px auto',
    borderRadius: '2px',
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    textAlign: 'left',
    background: 'white',
    border: '1px solid #EDE0D8',
    borderRadius: '14px',
    padding: '24px',
    marginBottom: '28px',
    boxShadow: '0 4px 20px rgba(122,20,40,0.06)',
  },
  detailItem: { display: 'flex', alignItems: 'flex-start', gap: '14px' },
  detailIcon: { fontSize: '20px', marginTop: '2px' },
  detailLabel: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#C4956A', margin: '0 0 2px', fontWeight: '600' },
  detailValue: { fontSize: '15px', color: '#2D2020', margin: 0, fontWeight: '500' },

  colours: { marginBottom: '28px' },
  coloursLabel: {
    display: 'block',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    color: '#7A6060',
    marginBottom: '12px',
  },
  swatches: { display: 'flex', justifyContent: 'center', gap: '24px' },
  swatch: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#5C3D2E', fontWeight: '500' },
  swatchDot: { width: '24px', height: '24px', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },

  /* Countdown */
  countdown: { display: 'flex', justifyContent: 'center', gap: '16px', margin: '28px 0' },
  countdownBox: {
    background: 'white',
    border: '1px solid #EDE0D8',
    borderRadius: '12px',
    padding: '14px 20px',
    minWidth: '72px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 2px 12px rgba(122,20,40,0.07)',
  },
  countdownNum: { fontSize: '28px', fontWeight: '700', color: '#7A1428', fontFamily: "'Cormorant Garamond', Georgia, serif", lineHeight: 1 },
  countdownLabel: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#C4956A', marginTop: '4px' },
  countdownDone: { color: '#7A1428', fontSize: '18px', margin: '20px 0', fontStyle: 'italic' },

  heroCTA: { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '12px' },

  /* How it works */
  section: { maxWidth: '1060px', margin: '0 auto', padding: '72px 20px' },
  sectionTitle: {
    textAlign: 'center',
    fontSize: 'clamp(28px, 4vw, 40px)',
    color: '#2D2020',
    marginBottom: '48px',
  },
  steps: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' },
  stepCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px 24px',
    textAlign: 'center',
    boxShadow: '0 4px 24px rgba(122,20,40,0.06)',
    border: '1px solid #EDE0D8',
  },
  stepNum: {
    display: 'inline-block',
    width: '30px', height: '30px', lineHeight: '30px',
    borderRadius: '50%',
    background: '#7A1428',
    color: 'white',
    fontSize: '13px',
    fontWeight: '700',
    marginBottom: '14px',
  },
  stepIcon: { fontSize: '34px', marginBottom: '12px' },
  stepTitle: { fontSize: '20px', color: '#7A1428', margin: '0 0 10px' },
  stepDesc: { fontSize: '14px', color: '#7A6060', lineHeight: '1.7', margin: 0 },

  /* Sendforth */
  sendforthSection: {
    background: '#F7EDE0',
    padding: '60px 20px',
    borderTop: '1px solid #EDE0D8',
    borderBottom: '1px solid #EDE0D8',
  },
  sendforthCard: {
    maxWidth: '480px',
    margin: '0 auto',
    textAlign: 'center',
  },
  sendforthPre: {
    fontSize: '11px',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    color: '#C4956A',
    marginBottom: '10px',
  },
  sendforthTitle: { fontSize: '34px', color: '#5C3D2E', marginBottom: '14px' },
  sendforthDetail: { fontSize: '15px', color: '#7A6060', margin: '4px 0' },
  rsvp: {
    marginTop: '24px',
    background: 'white',
    borderRadius: '12px',
    padding: '16px 24px',
    border: '1px solid #EDE0D8',
  },
  rsvpLabel: { fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#7A1428', marginBottom: '6px', fontWeight: '600' },
  rsvpNumbers: { fontSize: '15px', color: '#5C3D2E', fontWeight: '600' },

  /* CTA */
  ctaSection: {
    background: 'linear-gradient(135deg, #7A1428 0%, #5C0F1E 100%)',
    padding: '80px 20px',
    textAlign: 'center',
  },
  ctaTitle: { color: 'white', fontSize: 'clamp(26px, 4vw, 40px)', marginBottom: '10px' },
  ctaSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: '16px', marginBottom: '36px' },
  ctaBtn: {
    background: 'white',
    color: '#7A1428',
    padding: '15px 44px',
    fontSize: '16px',
    fontWeight: '700',
    borderRadius: '50px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
};
