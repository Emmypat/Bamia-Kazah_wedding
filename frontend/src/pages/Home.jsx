import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const WEDDING_DATE = new Date('2026-04-11T11:00:00');

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAMME DATA  — edit these constants; no JSX changes needed.
// ─────────────────────────────────────────────────────────────────────────────

const TIMELINE = [
  { time: '10:00 AM', event: 'Guests arrive at church',    note: 'Our Lady of Fatima Chaplaincy, Sabon Tasha, Kaduna' },
  { time: '10:45 AM', event: 'Bridal party assembles',     note: 'Procession preparation' },
  { time: '11:00 AM', event: 'Wedding Mass begins',        note: 'Entrance of the Groom & groomsmen' },
  { time: '11:10 AM', event: 'Entrance of the Bride',      note: 'Bridal procession down the aisle' },
  { time: '11:20 AM', event: 'Liturgy of the Word',        note: 'First Reading · Psalm · Second Reading · Gospel' },
  { time: '11:45 AM', event: 'Rite of Marriage',           note: 'Exchange of vows, rings, and blessing of the couple' },
  { time: '12:10 PM', event: 'Nuptial Mass continues',     note: 'Offertory · Consecration · Communion' },
  { time: '12:40 PM', event: 'Signing of the Register',    note: 'Official documentation witnessed by sponsors' },
  { time: '1:00 PM',  event: 'Church Photography Session', note: 'See the Photos tab for the order of pictures' },
  { time: '2:00 PM',  event: 'Reception begins',           note: 'Epitome Event Center, Barnawa, Kaduna' },
];

const RECEPTION = [
  'Musical interlude',
  'Arrival of guests',
  'Recognition of guests',
  "Entrance of groom's parents",
  "Entrance of bride's parents",
  'Entrance of the couple',
  'Opening prayer',
  "Chairman's opening remark",
  'Cutting of cake / refreshment',
  'Nuptial dance',
  'Toast',
  'Dance! Dance!! Dance!!!',
  'Vote of thanks',
  'Closing prayers',
  'Dance continues',
];

const PHOTOGRAPHS = [
  'Couple with officiating priests',
  'Couple with sponsor',
  'Bride and groom',
  "Couple and bride's parents",
  "Couple and groom's parents",
  'Couple with both parents',
  'Couple with little brides',
  'Couple with little grooms',
  "Couple with bride's family",
  "Couple with groom's family",
  'Couple with both families',
  'Couple with best man & chief bridesmaid',
  'Couple with KSM',
  'Couple with LSM',
  'Couple with Sacred Heart of Jesus and Immaculate Heart of Mary',
  'Couple with VOF Choir',
  'Couple with Fatima Chaplaincy members',
  'Couple with Ladies in waiting',
  "Couple with groom's friends",
  "Couple with bride's friends in onion",
  "Couple with bride's friends in burgundy",
  'Couple with FOGA',
  'Couple with SAFOSA',
  'Couple with Wise men',
  'Couple with staff of First Bank',
  'Couple with staff of GGJSS',
  'Couple with KASU family (PG and ALUMNI)',
];

const READINGS = [
  {
    id: 'first-reading',
    label: 'First Reading',
    title: 'A reading from the Book of Tobit',
    response: 'The word of the Lord.',
    content: [
      { type: 'text',   text: 'On their wedding night, Tobias said to Sarah:' },
      { type: 'text',   text: '"Sister, get up, and let us pray and implore our Lord that he grant us mercy and safety." And they began to say:' },
      { type: 'prayer', text: 'Blessed are you, O God of our fathers,\nand blessed be your holy and glorious name for ever.\n\nLet the heavens and all your creatures bless you.\nYou made Adam and gave him Eve his wife as a helper and support.\nFrom them the race of mankind has sprung.\nYou said, "It is not good that the man should be alone,\nlet us make a helper for him like himself."\n\nAnd now, O Lord, I am not taking this sister of mine because of lust,\nbut with sincerity. Grant that I may find mercy\nand may grow old together with her.' },
      { type: 'text',   text: 'And they both said, "Amen, Amen."' },
    ],
  },
  {
    id: 'psalm',
    label: 'Responsorial Psalm',
    refrain: 'How good the Lord to all.',
    verses: [
      'The LORD is kind and full of compassion,\nslow to anger, abounding in mercy.\nHow good is the LORD to all,\ncompassionate to all his creatures.',
      'All your works shall thank you, O LORD,\nand all your faithful ones bless you.\nThe eyes of all look to you,\nand you give them their food in due season.',
      'The LORD is just in all his ways,\nand holy in all his deeds.\nThe LORD is close to all who call him,\nwho call on him in truth.',
    ],
  },
  {
    id: 'second-reading',
    label: 'Second Reading',
    title: 'A reading from the Letter of Saint Paul to the Colossians',
    response: 'The word of the Lord.',
    content: [
      { type: 'text', text: 'Brethren:' },
      { type: 'text', text: "Put on, as God's chosen ones, holy and beloved, compassion, kindness, lowliness, meekness, and patience, forbearing one another and, if one has a complaint against another, forgiving each other; as the Lord has forgiven you, so you also must forgive." },
      { type: 'text', text: 'And over all these put on love, which binds everything together in perfect harmony. And let the peace of Christ rule in your hearts, which indeed you were called in the one body. And be thankful.' },
      { type: 'text', text: 'Let the word of Christ dwell in you richly, as you teach and admonish one another in all wisdom, and as you sing psalms and hymns and spiritual songs with thankfulness in your hearts to God. And whatever you do, in word or deed, do everything in the name of the Lord Jesus, giving thanks to God the Father through him.' },
    ],
  },
  {
    id: 'acclamation',
    label: 'Gospel Acclamation',
    acclamation: 'He who abides in love, abides in God, and God abides in him.',
  },
  {
    id: 'gospel',
    label: 'Gospel',
    title: 'A reading from the holy Gospel according to Mark',
    response: 'The Gospel of the Lord.',
    content: [
      { type: 'text',   text: 'At that time, Jesus said:' },
      { type: 'prayer', text: '"From the beginning of creation, \'God made them male and female.\'\nFor this reason, a man shall leave his father and mother\nand be joined to his wife, and the two shall become one flesh.\nSo they are no longer two but one flesh.\nWhat therefore God has joined together, let not man put asunder."' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COUNTDOWN
// ─────────────────────────────────────────────────────────────────────────────

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
    const t = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!timeLeft) return null;
  return (
    <div style={s.countdown}>
      {[
        { label: 'Days',    value: timeLeft.days },
        { label: 'Hours',   value: timeLeft.hours },
        { label: 'Minutes', value: timeLeft.minutes },
        { label: 'Seconds', value: timeLeft.seconds },
      ].map(({ label, value }) => (
        <div key={label} style={s.countdownBox}>
          <span style={s.countdownNum}>{String(value).padStart(2, '0')}</span>
          <span style={s.countdownLabel}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// READING BLOCK
// ─────────────────────────────────────────────────────────────────────────────

function ReadingBlock({ reading }) {
  if (reading.acclamation) {
    return (
      <div style={{ ...s.readingCard, background: '#FDF0F3', borderColor: '#800020' }}>
        <div style={s.readingLabel}>{reading.label}</div>
        <p style={s.acclamationText}><em>{reading.acclamation}</em></p>
      </div>
    );
  }
  if (reading.refrain) {
    return (
      <div style={s.readingCard}>
        <div style={s.readingLabel}>{reading.label}</div>
        <div style={s.refrain}><em>℟. {reading.refrain}</em></div>
        <div style={s.readingBody}>
          {reading.verses.map((verse, i) => (
            <React.Fragment key={i}>
              <p style={s.verse}>{verse}</p>
              <div style={s.refrainInline}>℟. <em>{reading.refrain}</em></div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={s.readingCard}>
      <div style={s.readingLabel}>{reading.label}</div>
      {reading.title && <h3 style={s.readingTitle}>{reading.title}</h3>}
      <div style={s.readingBody}>
        {reading.content.map((block, i) =>
          block.type === 'prayer'
            ? <p key={i} style={s.prayerBlock}>{block.text}</p>
            : <p key={i} style={s.readingPara}>{block.text}</p>
        )}
      </div>
      {reading.response && <div style={s.readingResponse}>{reading.response}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME
// ─────────────────────────────────────────────────────────────────────────────

const PROGRAMME_TABS = [
  { key: 'timeline',  label: 'Timeline',  icon: '🕐' },
  { key: 'reception', label: 'Reception', icon: '🥂' },
  { key: 'photos',    label: 'Photos',    icon: '📷' },
  { key: 'readings',  label: 'Readings',  icon: '✝️' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('timeline');
  const programmeRef = useRef(null);
  const thankYouRef  = useRef(null);

  function openTab(tab) {
    setActiveTab(tab);
    setTimeout(() => {
      programmeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  }

  function scrollToThankYou() {
    thankYouRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const actionLinks = [
    {
      icon: '📖',
      label: 'Readings of the Day',
      desc: 'Follow along with the Mass',
      action: () => openTab('readings'),
    },
    {
      icon: '📸',
      label: 'Upload Memories',
      desc: 'Share photos you took today',
      to: '/upload',
    },
    {
      icon: '🤳',
      label: 'Find My Photos',
      desc: 'Locate photos you appear in',
      to: '/search',
    },
    {
      icon: '🖼️',
      label: 'Order of Photographs',
      desc: 'Who stands with whom',
      action: () => openTab('photos'),
    },
    {
      icon: '🙏',
      label: 'A Special Thank You',
      desc: 'A note from Bamai & Kazah',
      action: scrollToThankYou,
    },
  ];

  return (
    <div style={s.page}>

      {/* ── Welcome Card ─────────────────────────────── */}
      <section style={s.hero}>
        <div style={s.heroInner}>

          {/* Top ornament */}
          <div style={s.ornamentRow}>
            <div style={s.ornamentLine} />
            <span style={s.ornamentCross}>✦</span>
            <div style={s.ornamentLine} />
          </div>

          <p style={s.eyebrow}>Bamai &amp; Kazah · 11 April 2026</p>

          <h1 style={s.welcomeTitle}>
            Welcome to<br />Our Wedding
          </h1>

          <div style={s.heroDivider} />

          <p style={s.welcomeMessage}>
            Our greatest hope for today is simple — that you feel celebrated,
            cherished, and completely present in this moment with us.
          </p>
          <p style={s.welcomeMessage}>
            We have set up this little corner of the internet to make sure that
            every smile, every tear of joy, and every embrace is captured and
            shared. Help us document this day so that we can all relive these
            beautiful memories together, forever.
          </p>

          <p style={s.signature}>With love, <em>Bamai &amp; Kazah</em></p>

          <div style={s.countdownWrap}>
            <p style={s.countdownPre}>Begins in</p>
            <Countdown />
          </div>

        </div>
      </section>

      {/* ── Action Links ─────────────────────────────── */}
      <section style={s.actionsSection}>
        <p style={s.actionsPre}>Today, you can</p>
        <div style={s.actionsGrid}>
          {actionLinks.map(({ icon, label, desc, to, action }) => {
            const inner = (
              <>
                <span style={s.actionIcon}>{icon}</span>
                <span style={s.actionLabel}>{label}</span>
                <span style={s.actionDesc}>{desc}</span>
              </>
            );
            const cardStyle = s.actionCard;
            if (to) {
              return (
                <Link key={label} to={to} style={{ ...cardStyle, textDecoration: 'none' }}>
                  {inner}
                </Link>
              );
            }
            return (
              <button key={label} onClick={action} style={{ ...cardStyle, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                {inner}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Venue Strip ──────────────────────────────── */}
      <div style={s.venueStrip}>
        <span style={s.venueItem}>⛪ <strong>Ceremony</strong> · Our Lady of Fatima Chaplaincy, Sabon Tasha · 11:00 AM</span>
        <span style={s.venueSep}>·</span>
        <span style={s.venueItem}>
          🥂 <strong>Reception</strong> · Epitome Event Center, Barnawa · 2:00 PM
        </span>
        <a
          href="https://maps.google.com/?q=Epitome+Event+Center+Barnawa+Kaduna"
          target="_blank"
          rel="noopener noreferrer"
          style={s.mapsPill}
        >
          📍 Get Directions
        </a>
      </div>

      {/* ── Digital Programme ────────────────────────── */}
      <section ref={programmeRef} style={s.programmeSection}>
        <div style={s.programmeInner}>

          <p style={s.programmePre}>Digital Programme</p>
          <h2 style={s.programmeTitle}>Celebration Guide</h2>
          <p style={s.programmeSub}>Tap a tab to navigate — works right here in the pew.</p>

          {/* Tab bar */}
          <div style={s.tabBar} role="tablist">
            {PROGRAMME_TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => setActiveTab(key)}
                style={{ ...s.tabBtn, ...(activeTab === key ? s.tabActive : {}) }}
              >
                <span style={s.tabIcon}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Timeline */}
          {activeTab === 'timeline' && (
            <div style={s.tabCard}>
              <h3 style={s.cardHeading}>Programme of Events</h3>
              <p style={s.cardSub}>Saturday, 11th April 2026</p>
              <div>
                {TIMELINE.map((item, i) => (
                  <div key={i} style={s.timelineRow}>
                    <div style={s.timelineLeft}>
                      <span style={s.timeTag}>{item.time}</span>
                      {i < TIMELINE.length - 1 && <div style={s.timelineLine} />}
                    </div>
                    <div style={s.timelineRight}>
                      <p style={s.timelineEvent}>{item.event}</p>
                      <p style={s.timelineNote}>{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reception */}
          {activeTab === 'reception' && (
            <div style={s.tabCard}>
              <h3 style={s.cardHeading}>Order of Reception</h3>
              <p style={s.cardSub}>Epitome Event Center, Barnawa, Kaduna</p>
              <a
                href="https://maps.google.com/?q=Epitome+Event+Center+Barnawa+Kaduna"
                target="_blank"
                rel="noopener noreferrer"
                style={s.mapsBtn}
              >
                📍 Get Directions
              </a>
              <ol style={s.numberedList}>
                {RECEPTION.map((item, i) => (
                  <li key={i} style={s.numberedItem}>
                    <span style={s.itemNum}>{i + 1}</span>
                    <span style={s.itemText}>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Photographs */}
          {activeTab === 'photos' && (
            <div style={s.tabCard}>
              <h3 style={s.cardHeading}>Order of Photographs</h3>
              <p style={s.cardSub}>Please follow the sequence for a smooth photo session</p>
              <ol style={s.numberedList}>
                {PHOTOGRAPHS.map((item, i) => (
                  <li key={i} style={s.numberedItem}>
                    <span style={s.itemNum}>{i + 1}</span>
                    <span style={s.itemText}>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Readings */}
          {activeTab === 'readings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ ...s.cardSub, textAlign: 'center' }}>
                Our Lady of Fatima Chaplaincy · 11 April 2026
              </p>
              {READINGS.map((reading) => (
                <ReadingBlock key={reading.id} reading={reading} />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* ── Photo App CTA ────────────────────────────── */}
      <section style={s.ctaSection}>
        <div style={s.ctaInner}>
          <p style={s.ctaPre}>Memories in the making</p>
          <h2 style={s.ctaTitle}>Capture & Share Every Moment</h2>
          <p style={s.ctaBody}>
            Our face recognition platform lets any guest upload photos and
            instantly find every picture they appear in. No app download, no
            hassle — just memories, shared.
          </p>
          <div style={s.ctaLinks}>
            <Link to="/upload" className="btn btn-primary" style={s.ctaBtn}>
              📸 Upload Photos
            </Link>
            <Link to="/search" className="btn btn-secondary" style={s.ctaBtn}>
              🤳 Find My Photos
            </Link>
          </div>
          <Link to="/register" style={s.registerLink}>
            New here? Register in seconds — no password needed →
          </Link>
        </div>
      </section>

      {/* ── Thank You ────────────────────────────────── */}
      <section ref={thankYouRef} style={s.thankYouSection}>
        <div style={s.thankYouInner}>

          <div style={s.ornamentRow}>
            <div style={{ ...s.ornamentLine, borderColor: 'rgba(255,255,255,0.25)' }} />
            <span style={{ ...s.ornamentCross, color: '#C4956A' }}>✦</span>
            <div style={{ ...s.ornamentLine, borderColor: 'rgba(255,255,255,0.25)' }} />
          </div>

          <p style={s.tyPre}>From Bamai &amp; Kazah</p>
          <h2 style={s.tyTitle}>A Special Thank You</h2>
          <div style={s.tyDivider} />

          <p style={s.tyBody}>
            To every person in this room — thank you. You have crossed distances,
            rearranged schedules, and chosen to be present at the most sacred
            moment of our lives. That is not a small thing, and we do not take it
            lightly.
          </p>
          <p style={s.tyBody}>
            Your prayers, your laughter, and your love have made this day complete.
            May God reward you abundantly for your kindness, and may the joy you
            have brought to us return to you a hundredfold.
          </p>
          <p style={s.tyBody}>
            This celebration belongs to all of us. Now — let's make it one to
            remember.
          </p>

          <p style={s.tySignature}><em>With all our love,</em></p>
          <p style={s.tyCoupleNames}>Bamai &amp; Kazah</p>

          <div style={s.tyDivider} />

          <p style={s.tyContact}>
            RSVP / Enquiries &nbsp;·&nbsp;
            07061340133 &nbsp;·&nbsp; 07031150932 &nbsp;·&nbsp; 07066580062
          </p>

        </div>
      </section>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const BURGUNDY     = '#800020';
const BURGUNDY_BG  = '#F5E6E9';
const ONION        = '#C4956A';
const ONION_LIGHT  = '#F7EDE0';
const CREAM        = '#FDFAF6';
const TEXT         = '#2D1A14';
const TEXT_MUTED   = '#7A6060';
const BORDER       = '#E8D8CC';

const s = {

  page: { background: CREAM, minHeight: '100vh' },

  /* ── Welcome Hero ── */
  hero: {
    background: CREAM,
    borderBottom: `1px solid ${BORDER}`,
    padding: 'clamp(56px, 10vw, 100px) 24px clamp(48px, 8vw, 80px)',
    textAlign: 'center',
  },
  heroInner: { maxWidth: '640px', margin: '0 auto' },

  ornamentRow: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' },
  ornamentLine: { flex: 1, borderTop: `1px solid ${BORDER}` },
  ornamentCross: { fontSize: '14px', color: ONION, flexShrink: 0 },

  eyebrow: {
    fontSize: '11px', letterSpacing: '3.5px', textTransform: 'uppercase',
    color: ONION, margin: '0 0 20px', fontWeight: '600',
  },

  welcomeTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(38px, 7vw, 68px)',
    fontWeight: '400', color: TEXT, margin: '0 0 28px', lineHeight: 1.1,
    letterSpacing: '-0.5px',
  },

  heroDivider: {
    width: '40px', height: '1px',
    background: `linear-gradient(90deg, transparent, ${ONION}, transparent)`,
    margin: '0 auto 32px',
  },

  welcomeMessage: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(17px, 2.5vw, 21px)',
    color: TEXT_MUTED, lineHeight: '1.9', margin: '0 0 18px',
  },

  signature: {
    fontSize: 'clamp(15px, 2vw, 18px)', color: TEXT_MUTED,
    margin: '28px 0 40px', fontFamily: "'Cormorant Garamond', Georgia, serif",
  },

  countdownWrap: { marginTop: '8px' },
  countdownPre: {
    fontSize: '10px', letterSpacing: '2.5px', textTransform: 'uppercase',
    color: TEXT_MUTED, marginBottom: '14px',
  },
  countdown: { display: 'inline-flex', justifyContent: 'center', gap: '10px' },
  countdownBox: {
    background: 'white', border: `1px solid ${BORDER}`,
    borderRadius: '10px', padding: 'clamp(8px, 2vw, 12px) clamp(10px, 3vw, 16px)',
    minWidth: 'clamp(48px, 14vw, 62px)', flex: 1,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  countdownNum:   { fontSize: '22px', fontWeight: '700', color: BURGUNDY, lineHeight: 1 },
  countdownLabel: { fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: TEXT_MUTED, marginTop: '3px' },

  /* ── Action Links ── */
  actionsSection: {
    padding: 'clamp(40px, 6vw, 64px) 24px',
    maxWidth: '840px', margin: '0 auto',
    textAlign: 'center',
  },
  actionsPre: {
    fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase',
    color: ONION, marginBottom: '24px', fontWeight: '600',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))',
    gap: '12px',
  },
  actionCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
    background: 'white',
    border: `1.5px solid ${BORDER}`,
    borderRadius: '16px',
    padding: 'clamp(18px, 4vw, 24px) 12px',
    textAlign: 'center',
    color: TEXT,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    WebkitTapHighlightColor: 'transparent',
    // hover handled inline — can't do pseudo-classes in inline styles
  },
  actionIcon:  { fontSize: 'clamp(26px, 5vw, 32px)', lineHeight: 1 },
  actionLabel: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(14px, 2.5vw, 17px)', fontWeight: '600',
    color: BURGUNDY, lineHeight: 1.3,
  },
  actionDesc: {
    fontSize: 'clamp(10px, 1.8vw, 12px)', color: TEXT_MUTED,
    lineHeight: 1.4,
  },

  /* ── Venue Strip ── */
  venueStrip: {
    background: BURGUNDY,
    padding: '14px 24px',
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
    alignItems: 'center', gap: '8px 16px',
    textAlign: 'center',
  },
  venueItem: { fontSize: 'clamp(11px, 2vw, 13px)', color: 'rgba(255,255,255,0.88)' },
  venueSep:  { color: 'rgba(255,255,255,0.3)', fontWeight: '300', display: 'none' },
  // Venue strip pill — sits on the dark burgundy band
  mapsPill: {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.35)',
    color: '#ffffff', textDecoration: 'none',
    fontSize: 'clamp(11px, 2vw, 13px)', fontWeight: '700',
    padding: '6px 14px', borderRadius: '50px',
    whiteSpace: 'nowrap', letterSpacing: '0.3px',
  },
  // Reception tab button — sits on a white card
  mapsBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: BURGUNDY, color: '#ffffff', textDecoration: 'none',
    fontSize: '13px', fontWeight: '700',
    padding: '9px 18px', borderRadius: '50px',
    marginBottom: '20px', letterSpacing: '0.3px',
  },

  /* ── Digital Programme ── */
  programmeSection: {
    borderTop: `1px solid ${BORDER}`,
    padding: 'clamp(40px, 7vw, 80px) 24px',
    background: ONION_LIGHT,
  },
  programmeInner: { maxWidth: '760px', margin: '0 auto' },
  programmePre: {
    textAlign: 'center', fontSize: '11px', letterSpacing: '3px',
    textTransform: 'uppercase', color: ONION, marginBottom: '10px',
  },
  programmeTitle: {
    textAlign: 'center',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(28px, 5vw, 42px)',
    fontWeight: '400', color: TEXT, margin: '0 0 8px',
  },
  programmeSub: {
    textAlign: 'center', fontSize: '13px', color: TEXT_MUTED, margin: '0 0 32px',
  },

  tabBar: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    borderBottom: `2px solid ${BORDER}`, marginBottom: '28px',
  },
  tabBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
    padding: 'clamp(10px, 2.5vw, 14px) 4px',
    background: 'none', border: 'none',
    borderBottom: '3px solid transparent', marginBottom: '-2px',
    cursor: 'pointer', fontSize: 'clamp(11px, 2.5vw, 13px)',
    fontWeight: '600', color: TEXT_MUTED, letterSpacing: '0.3px',
    transition: 'color 0.2s', minHeight: '56px',
    WebkitTapHighlightColor: 'transparent',
  },
  tabActive: { color: BURGUNDY, borderBottomColor: BURGUNDY },
  tabIcon:   { fontSize: 'clamp(18px, 4vw, 22px)' },

  tabCard: {
    background: 'white', borderRadius: '16px',
    padding: 'clamp(20px, 5vw, 36px)',
    border: `1px solid ${BORDER}`,
    boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
  },
  cardHeading: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(20px, 4vw, 28px)', color: BURGUNDY, margin: '0 0 4px',
  },
  cardSub: { fontSize: '13px', color: ONION, margin: '0 0 24px' },

  /* Timeline */
  timelineRow: { display: 'flex', alignItems: 'flex-start', gap: '16px' },
  timelineLeft: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    flexShrink: 0, width: 'clamp(72px, 18vw, 88px)',
  },
  timeTag: {
    fontSize: 'clamp(10px, 2.5vw, 12px)', fontWeight: '700',
    color: BURGUNDY, background: BURGUNDY_BG, borderRadius: '6px',
    padding: '4px 8px', textAlign: 'center', width: '100%',
  },
  timelineLine: {
    width: '2px', flex: 1, minHeight: '24px',
    background: `linear-gradient(to bottom, ${BORDER}, transparent)`,
    margin: '4px 0',
  },
  timelineRight: { paddingBottom: '20px', flex: 1 },
  timelineEvent: {
    fontSize: 'clamp(14px, 2.5vw, 16px)', color: TEXT,
    fontWeight: '600', margin: '0 0 3px', paddingTop: '3px',
  },
  timelineNote: { fontSize: 'clamp(12px, 2vw, 13px)', color: TEXT_MUTED, margin: 0, lineHeight: 1.5 },

  /* Numbered list (reception & photos) */
  numberedList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  numberedItem: { display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '10px 8px', borderRadius: '8px' },
  itemNum: {
    flexShrink: 0, width: '28px', height: '28px', lineHeight: '28px',
    borderRadius: '50%', background: BURGUNDY_BG,
    color: BURGUNDY, fontWeight: '700', fontSize: '12px', textAlign: 'center',
  },
  itemText: { fontSize: 'clamp(14px, 2.5vw, 16px)', color: TEXT, lineHeight: '1.6', paddingTop: '4px' },

  /* Church readings */
  readingCard: {
    background: 'white', borderRadius: '16px',
    padding: 'clamp(20px, 5vw, 32px)',
    border: `1px solid ${BORDER}`,
    boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
  },
  readingLabel: {
    fontSize: '10px', letterSpacing: '2.5px', textTransform: 'uppercase',
    color: ONION, fontWeight: '700', marginBottom: '8px',
  },
  readingTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(16px, 3vw, 21px)', color: TEXT,
    margin: '0 0 20px', fontWeight: '600', fontStyle: 'italic',
  },
  readingBody: {
    fontSize: 'clamp(14px, 2.5vw, 16px)', color: '#3D2020',
    lineHeight: '1.9', display: 'flex', flexDirection: 'column', gap: '14px',
  },
  readingPara: { margin: 0 },
  prayerBlock: {
    borderLeft: `3px solid ${ONION}`, paddingLeft: '16px',
    color: TEXT, fontStyle: 'italic', margin: 0, whiteSpace: 'pre-line',
  },
  readingResponse: {
    marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${BORDER}`,
    color: BURGUNDY, fontWeight: '700', fontSize: '14px', letterSpacing: '0.3px',
  },
  verse:         { margin: 0, paddingLeft: '8px', whiteSpace: 'pre-line' },
  refrain: {
    background: '#FDF6EE', borderRadius: '8px', padding: '12px 16px',
    fontSize: 'clamp(14px, 2.5vw, 16px)', color: BURGUNDY,
    marginBottom: '16px', textAlign: 'center',
  },
  refrainInline: { color: BURGUNDY, fontSize: 'clamp(13px, 2.5vw, 15px)', marginBottom: '16px' },
  acclamationText: {
    fontSize: 'clamp(15px, 2.5vw, 18px)', color: BURGUNDY,
    textAlign: 'center', margin: 0, lineHeight: 1.7,
  },

  /* ── Photo App CTA ── */
  ctaSection: {
    background: 'white', borderTop: `1px solid ${BORDER}`,
    padding: 'clamp(48px, 7vw, 80px) 24px', textAlign: 'center',
  },
  ctaInner: { maxWidth: '560px', margin: '0 auto' },
  ctaPre: {
    fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase',
    color: ONION, marginBottom: '12px',
  },
  ctaTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(26px, 4vw, 38px)', color: TEXT, margin: '0 0 16px',
  },
  ctaBody: { fontSize: '15px', color: TEXT_MUTED, lineHeight: '1.7', margin: '0 0 32px' },
  ctaLinks: { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' },
  ctaBtn:   { padding: '14px 28px', fontSize: '15px', fontWeight: '700' },
  registerLink: {
    display: 'block', fontSize: '13px', color: TEXT_MUTED,
    textDecoration: 'none', marginTop: '8px',
  },

  /* ── Thank You ── */
  thankYouSection: {
    background: `linear-gradient(160deg, #1a0609 0%, #3d0f1a 50%, #2a0810 100%)`,
    padding: 'clamp(60px, 10vw, 100px) 24px',
    textAlign: 'center',
    borderTop: `4px solid ${BURGUNDY}`,
  },
  thankYouInner: { maxWidth: '600px', margin: '0 auto' },
  tyPre: {
    fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase',
    color: ONION, marginBottom: '12px',
  },
  tyTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(32px, 5.5vw, 52px)',
    fontWeight: '400', color: 'white', margin: '0 0 24px', lineHeight: 1.1,
  },
  tyDivider: {
    width: '40px', height: '1px',
    background: `linear-gradient(90deg, transparent, ${ONION}, transparent)`,
    margin: '0 auto 32px',
  },
  tyBody: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(17px, 2.5vw, 21px)',
    color: 'rgba(255,255,255,0.78)', lineHeight: '1.9', margin: '0 0 20px',
  },
  tySignature: {
    fontSize: '16px', color: 'rgba(255,255,255,0.55)',
    margin: '36px 0 8px',
  },
  tyCoupleNames: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(28px, 4.5vw, 44px)', color: 'white',
    fontWeight: '400', margin: '0 0 32px',
  },
  tyContact: {
    fontSize: '12px', color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.5px', lineHeight: 1.8,
  },
};
