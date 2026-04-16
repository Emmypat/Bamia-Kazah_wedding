import React, { useState } from 'react';

const RECEPTION = [
  'Musical interlude',
  'Arrival of guests',
  'Recognition of guests',
  'Entrance of groom\'s parents',
  'Entrance of bride\'s parents',
  'Entrance of the couple',
  'Opening prayer',
  'Chairman\'s opening remark',
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
  'Couple and bride\'s parents',
  'Couple and groom\'s parents',
  'Couple with both parents',
  'Couple with little brides',
  'Couple with little grooms',
  'Couple with bride\'s family',
  'Couple with groom\'s family',
  'Couple with both families',
  'Couple with best man & chief bridesmaid',
  'Couple with KSM',
  'Couple with LSM',
  'Couple with Sacred Heart of Jesus and Immaculate Heart of Mary',
  'Couple with VOF Choir',
  'Couple with Fatima Chaplaincy members',
  'Couple with Ladies in waiting',
  'Couple with groom\'s friends',
  'Couple with bride\'s friends in onion',
  'Couple with bride\'s friends in burgundy',
  'Couple with FOGA',
  'Couple with SAFOSA',
  'Couple with Wise men',
  'Couple with staff of First Bank',
  'Couple with staff of GGJSS',
  'Couple with KASU family (PG and ALUMNI)',
];

const TABS = ['Order of Reception', 'Order of Photographs', 'Church Readings'];

export default function Program() {
  const [tab, setTab] = useState(0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <p style={styles.preTitle}>Bamai &amp; Kazah · 11 April 2026</p>
        <h1 style={styles.title}>Programme of Events</h1>
        <div style={styles.divider} />
      </div>

      {/* Tab bar */}
      <div style={styles.tabBar}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{ ...styles.tabBtn, ...(tab === i ? styles.tabActive : {}) }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={styles.content}>

        {/* ── Order of Reception ── */}
        {tab === 0 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Order of Reception</h2>
            <p style={styles.cardSub}>Epitome Event Center, Barnawa Kaduna</p>
            <ol style={styles.ol}>
              {RECEPTION.map((item, i) => (
                <li key={i} style={styles.li}>
                  <span style={styles.liNum}>{i + 1}</span>
                  <span style={styles.liText}>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── Order of Photographs ── */}
        {tab === 1 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Order of Photographs</h2>
            <p style={styles.cardSub}>Please follow the sequence for a smooth photo session</p>
            <ol style={styles.ol}>
              {PHOTOGRAPHS.map((item, i) => (
                <li key={i} style={styles.li}>
                  <span style={styles.liNum}>{i + 1}</span>
                  <span style={styles.liText}>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── Church Readings ── */}
        {tab === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* First Reading */}
            <div style={styles.card}>
              <div style={styles.readingLabel}>First Reading</div>
              <h2 style={styles.readingTitle}>A reading from the Book of Tobit</h2>
              <div style={styles.readingBody}>
                <p>On their wedding night, Tobias said to Sarah:</p>
                <p>"Sister, get up, and let us pray and implore our Lord that he grant us mercy and safety." And they began to say:</p>
                <p style={styles.prayer}>
                  "Blessed are you, O God of our fathers,<br />
                  and blessed be your holy and glorious name for ever.<br /><br />
                  Let the heavens and all your creatures bless you.<br />
                  You made Adam and gave him Eve his wife as a helper and support.<br />
                  From them the race of mankind has sprung.<br />
                  You said, 'It is not good that the man should be alone,<br />
                  let us make a helper for him like himself.'<br /><br />
                  And now, O Lord, I am not taking this sister of mine because of lust,<br />
                  but with sincerity. Grant that I may find mercy<br />
                  and may grow old together with her."
                </p>
                <p>And they both said, "Amen, Amen."</p>
              </div>
              <div style={styles.response}>The word of the Lord.</div>
            </div>

            {/* Responsorial Psalm */}
            <div style={styles.card}>
              <div style={styles.readingLabel}>Responsorial Psalm</div>
              <div style={styles.refrain}>
                <em>How good the Lord to all.</em>
              </div>
              <div style={styles.readingBody}>
                <p style={styles.verse}>
                  The LORD is kind and full of compassion,<br />
                  slow to anger, abounding in mercy.<br />
                  How good is the LORD to all,<br />
                  compassionate to all his creatures.
                </p>
                <div style={styles.refrainInline}>℟. <em>How good the Lord to all.</em></div>

                <p style={styles.verse}>
                  All your works shall thank you, O LORD,<br />
                  and all your faithful ones bless you.<br />
                  The eyes of all look to you,<br />
                  and you give them their food in due season.
                </p>
                <div style={styles.refrainInline}>℟. <em>How good the Lord to all.</em></div>

                <p style={styles.verse}>
                  The LORD is just in all his ways,<br />
                  and holy in all his deeds.<br />
                  The LORD is close to all who call him,<br />
                  who call on him in truth.
                </p>
                <div style={styles.refrainInline}>℟. <em>How good the Lord to all.</em></div>
              </div>
            </div>

            {/* Second Reading */}
            <div style={styles.card}>
              <div style={styles.readingLabel}>Second Reading</div>
              <h2 style={styles.readingTitle}>A reading from the Letter of Saint Paul to the Colossians</h2>
              <div style={styles.readingBody}>
                <p>Brethren:</p>
                <p>
                  Put on, as God's chosen ones, holy and beloved, compassion, kindness, lowliness, meekness, and patience,
                  forbearing one another and, if one has a complaint against another, forgiving each other;
                  as the Lord has forgiven you, so you also must forgive.
                </p>
                <p>
                  And over all these put on love, which binds everything together in perfect harmony.
                  And let the peace of Christ rule in your hearts, which indeed you were called in the one body. And be thankful.
                </p>
                <p>
                  Let the word of Christ dwell in you richly, as you teach and admonish one another in all wisdom,
                  and as you sing psalms and hymns and spiritual songs with thankfulness in your hearts to God.
                  And whatever you do, in word or deed, do everything in the name of the Lord Jesus,
                  giving thanks to God the Father through him.
                </p>
              </div>
              <div style={styles.response}>The word of the Lord.</div>
            </div>

            {/* Gospel Acclamation */}
            <div style={{ ...styles.card, background: '#FDF0F3', borderColor: '#7A1428' }}>
              <div style={styles.refrainInline}>
                <em>He who abides in love, abides in God, and God abides in him.</em>
              </div>
            </div>

            {/* Gospel */}
            <div style={styles.card}>
              <div style={styles.readingLabel}>Gospel</div>
              <h2 style={styles.readingTitle}>A reading from the holy Gospel according to Mark</h2>
              <div style={styles.readingBody}>
                <p>At that time, Jesus said:</p>
                <p style={styles.prayer}>
                  "From the beginning of creation, 'God made them male and female.'<br />
                  For this reason, a man shall leave his father and mother<br />
                  and be joined to his wife, and the two shall become one flesh.<br />
                  So they are no longer two but one flesh.<br />
                  What therefore God has joined together, let not man put asunder."
                </p>
              </div>
              <div style={styles.response}>The Gospel of the Lord.</div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: '760px',
    margin: '0 auto',
    padding: 'clamp(24px, 5vw, 48px) clamp(16px, 4vw, 24px)',
    fontFamily: 'Georgia, serif',
  },
  header: { textAlign: 'center', marginBottom: '32px' },
  preTitle: {
    fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase',
    color: '#C4956A', margin: '0 0 12px', fontFamily: 'system-ui, sans-serif',
  },
  title: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(28px, 5vw, 42px)',
    color: '#2D2020', margin: '0 0 20px', fontWeight: '600',
  },
  divider: { width: '60px', height: '2px', background: 'linear-gradient(90deg, transparent, #C4956A, transparent)', margin: '0 auto' },

  tabBar: {
    display: 'flex', gap: '4px', flexWrap: 'wrap',
    borderBottom: '2px solid #EDE0D8', marginBottom: '28px',
  },
  tabBtn: {
    padding: 'clamp(8px, 2vw, 10px) clamp(10px, 3vw, 18px)',
    background: 'none', border: 'none', borderBottom: '3px solid transparent',
    marginBottom: '-2px', cursor: 'pointer',
    fontSize: 'clamp(12px, 2.5vw, 14px)', fontWeight: '600',
    color: '#7A6060', fontFamily: 'system-ui, sans-serif',
    transition: 'color 0.2s',
    minHeight: '44px',
  },
  tabActive: { color: '#7A1428', borderBottomColor: '#7A1428' },

  content: { },

  card: {
    background: 'white', borderRadius: '16px',
    padding: 'clamp(20px, 5vw, 36px)',
    border: '1px solid #EDE0D8',
    boxShadow: '0 4px 24px rgba(122,20,40,0.06)',
  },
  cardTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(20px, 4vw, 28px)', color: '#7A1428',
    margin: '0 0 4px',
  },
  cardSub: { fontSize: '13px', color: '#C4956A', margin: '0 0 24px', fontFamily: 'system-ui, sans-serif' },

  ol: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  li: {
    display: 'flex', alignItems: 'flex-start', gap: '14px',
    padding: '10px 12px', borderRadius: '8px',
    transition: 'background 0.15s',
  },
  liNum: {
    flexShrink: 0,
    width: '28px', height: '28px', lineHeight: '28px',
    borderRadius: '50%', background: '#F5E6E9',
    color: '#7A1428', fontWeight: '700', fontSize: '12px',
    textAlign: 'center', fontFamily: 'system-ui, sans-serif',
  },
  liText: { fontSize: 'clamp(14px, 2.5vw, 16px)', color: '#2D2020', lineHeight: '1.6', paddingTop: '4px' },

  readingLabel: {
    fontSize: '10px', letterSpacing: '2.5px', textTransform: 'uppercase',
    color: '#C4956A', fontWeight: '700', marginBottom: '8px',
    fontFamily: 'system-ui, sans-serif',
  },
  readingTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(17px, 3vw, 22px)', color: '#2D2020',
    margin: '0 0 20px', fontWeight: '600', fontStyle: 'italic',
  },
  readingBody: {
    fontSize: 'clamp(14px, 2.5vw, 16px)', color: '#3D2020',
    lineHeight: '1.85', display: 'flex', flexDirection: 'column', gap: '14px',
  },
  prayer: {
    borderLeft: '3px solid #C4956A', paddingLeft: '16px',
    color: '#2D2020', fontStyle: 'italic', margin: 0,
  },
  verse: { margin: 0, paddingLeft: '8px' },
  refrain: {
    background: '#FDF6EE', borderRadius: '8px', padding: '12px 16px',
    fontSize: 'clamp(14px, 2.5vw, 16px)', color: '#7A1428',
    marginBottom: '16px', textAlign: 'center',
  },
  refrainInline: {
    color: '#7A1428', fontSize: 'clamp(13px, 2.5vw, 15px)',
    marginBottom: '16px', fontFamily: 'system-ui, sans-serif',
  },
  response: {
    marginTop: '20px', paddingTop: '16px',
    borderTop: '1px solid #EDE0D8',
    color: '#7A1428', fontWeight: '700', fontSize: '14px',
    fontFamily: 'system-ui, sans-serif', letterSpacing: '0.3px',
  },
};
