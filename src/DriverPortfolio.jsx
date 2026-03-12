import { useState, useEffect, useRef } from "react";
import { getPortfolio } from "./lib/api";

// Responsive CSS - injected once
const responsiveStyles = `
  @media (max-width: 768px) {
    .dfp-content {
      padding: 12px !important;
      max-width: 100% !important;
    }
    .dfp-content > * {
      width: 100% !important;
      box-sizing: border-box !important;
    }
    .dfp-grid {
      grid-template-columns: 1fr !important;
    }
    .dfp-grid > * {
      width: 100% !important;
    }
    .dfp-action-bar {
      flex-direction: column !important;
      align-items: flex-start !important;
    }
    .dfp-driver-info {
      text-align: left !important;
    }
    .dfp-employment-table {
      overflow-x: auto;
    }
    .dfp-employment-header,
    .dfp-employment-row {
      min-width: 500px;
    }
  }
`;

// Inject responsive styles once
if (typeof document !== 'undefined' && !document.getElementById('dfp-responsive-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'dfp-responsive-styles';
  styleEl.textContent = responsiveStyles;
  document.head.appendChild(styleEl);
}

// Format name as "First L." for privacy
function formatName(fullName) {
  if (!fullName) return 'Driver';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0];
  return `${firstName} ${lastInitial}.`;
}

function getScoreStyle(score) {
  if (score >= 85) return { background: '#D1FAE5', color: '#059669' };
  if (score >= 70) return { background: '#FEF3C7', color: '#D97706' };
  return { background: '#FEE2E2', color: '#DC2626' };
}

function getScoreColor(score) {
  if (score >= 85) return '#059669';
  if (score >= 70) return '#D97706';
  return '#DC2626';
}

function LoadingState() {
  return (
    <div style={styles.loadingScreen}>
      <img src="/fw-logo.svg" alt="FreeWorld" style={{ height: 48, width: 48, marginBottom: 20 }} />
      <p style={{ color: "#5A7A82", fontSize: 16 }}>Loading portfolio...</p>
    </div>
  );
}

function NotFoundState({ slug }) {
  return (
    <div style={styles.loadingScreen}>
      <img src="/fw-logo.svg" alt="FreeWorld" style={{ height: 48, width: 48, marginBottom: 20 }} />
      <h1 style={{ color: "#004751", fontSize: 24, fontFamily: "Georgia, serif", marginBottom: 12 }}>Portfolio Not Found</h1>
      <p style={{ color: "#5A7A82", fontSize: 15, lineHeight: 1.6, maxWidth: 400 }}>
        No driver portfolio found for "{slug}". The portfolio may not exist or may not be published yet.
      </p>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div style={styles.loadingScreen}>
      <img src="/fw-logo.svg" alt="FreeWorld" style={{ height: 48, width: 48, marginBottom: 20 }} />
      <h1 style={{ color: "#004751", fontSize: 24, fontFamily: "Georgia, serif", marginBottom: 12 }}>Error Loading Portfolio</h1>
      <p style={{ color: "#5A7A82", fontSize: 15, lineHeight: 1.6 }}>{error}</p>
    </div>
  );
}

// PDF Layout Component - Single page with all elements
function PdfLayout({ driver }) {
  const d = driver;
  const displayName = formatName(d.name);

  return (
    <div style={pdf.page}>
      {/* Header */}
      <div style={pdf.header}>
        <div style={pdf.headerLeft}>
          <img src="/fw-logo-white.svg" alt="FreeWorld" style={{ height: 40, width: 40 }} />
          <span style={pdf.headerBrand}>Driver Fit Profile</span>
        </div>
        <div style={pdf.headerRight}>
          <div style={pdf.driverName}>{displayName}</div>
          <div style={pdf.driverMeta}>
            {d.homeBase && `${d.homeBase} · `}{d.cdlClass}{d.yearsExp > 0 ? ` · ${d.yearsExp} yrs exp` : ''}
            {d.endorsements?.length > 0 && ` · ${d.endorsements.join(', ')}`}
          </div>
        </div>
      </div>

      {/* Fit Score Banner */}
      {d.jobFit && (
        <div style={pdf.fitBanner}>
          <div>
            <div style={pdf.fitLabel}>Fit Score for {d.jobFit.role}</div>
            <div style={pdf.fitEmployer}>{d.jobFit.employer}</div>
          </div>
          <div style={pdf.fitScore}>{d.jobFit.overallScore}%</div>
        </div>
      )}

      {/* Two Column Layout */}
      <div style={pdf.columns}>
        {/* Left Column */}
        <div style={pdf.leftCol}>
          {/* Video Card - Clickable */}
          {d.videoUrl && (
            <a href={d.videoUrl} style={pdf.videoCard}>
              <div style={pdf.videoThumb}>
                <div style={pdf.playButton}>
                  <span style={pdf.playTriangle}>▶</span>
                </div>
              </div>
              <div style={pdf.videoCta}>
                <div style={pdf.videoCtaTitle}>Watch {displayName}'s Story</div>
                <div style={pdf.videoCtaSub}>Click to view video introduction</div>
              </div>
            </a>
          )}

          {/* Quote - right below video */}
          {d.whyTrucking && (
            <div style={pdf.quoteBox}>
              <div style={pdf.quoteIcon}>"</div>
              <p style={pdf.quoteText}>{d.whyTrucking}</p>
              <p style={pdf.quoteAttr}>— {displayName}</p>
            </div>
          )}

          {/* About */}
          {d.story && (
            <div style={pdf.section}>
              <h3 style={pdf.sectionTitle}>About</h3>
              <p style={pdf.text}>{d.story}</p>
            </div>
          )}

          {/* Employment History - last 3 employers */}
          {d.experience?.length > 0 && (
            <div style={pdf.section}>
              <h3 style={pdf.sectionTitle}>Employment History</h3>
              {d.experience.slice(0, 3).map((exp, i) => (
                <div key={i} style={pdf.expRow}>
                  <span style={pdf.expCompany}>{exp.company}</span>
                  <span style={pdf.expRole}>{exp.role}</span>
                  <span style={pdf.expTenure}>{exp.tenure || '—'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Safety Stats */}
          <div style={pdf.section}>
            <h3 style={pdf.sectionTitle}>Safety & Compliance</h3>
            <div style={pdf.statsGrid}>
              <div style={pdf.statBox}>
                <div style={pdf.statNum}>{d.mvrDetails?.violations ?? 0}</div>
                <div style={pdf.statLabel}>MVR Violations</div>
              </div>
              <div style={pdf.statBox}>
                <div style={pdf.statNum}>{d.mvrDetails?.accidents ?? 0}</div>
                <div style={pdf.statLabel}>At-Fault Accidents</div>
              </div>
              <div style={pdf.statBox}>
                <div style={pdf.statNum}>{d.pspDetails?.crashes5yr ?? 0}</div>
                <div style={pdf.statLabel}>PSP Crashes (5yr)</div>
              </div>
              <div style={pdf.statBox}>
                <div style={pdf.statNum}>{d.pspDetails?.violations3yr ?? 0}</div>
                <div style={pdf.statLabel}>PSP Violations</div>
              </div>
            </div>
            <div style={pdf.complianceRow}>
              <span>MVR: <strong style={d.mvr === 'Clear' ? pdf.good : pdf.warn}>{d.mvr}</strong></span>
              <span>Clearinghouse: <strong style={d.clearinghouse === 'Not Prohibited' ? pdf.good : pdf.warn}>{d.clearinghouse}</strong></span>
              <span>Medical: <strong style={d.license?.medicalCardStatus === 'Valid' ? pdf.good : pdf.warn}>{d.license?.medicalCardStatus}</strong></span>
            </div>
          </div>

          {/* Training - moved to left column to fill space */}
          {d.training?.school && (
            <div style={pdf.section}>
              <h3 style={pdf.sectionTitle}>CDL Training</h3>
              <div style={pdf.trainingInfo}>
                <span style={{fontWeight: 600}}>{d.training.school}</span>
                {d.training.location && <span style={pdf.textMuted}> · {d.training.location}</span>}
                {d.training.graduated && <span style={pdf.textMuted}> · Graduated {d.training.graduated}</span>}
                {d.training.hours > 0 && <span style={pdf.textMuted}> · {d.training.hours} instruction hours</span>}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={pdf.rightCol}>
          {/* Fit Dimensions */}
          {d.jobFit?.dimensions?.length > 0 && (
            <div style={pdf.section}>
              <h3 style={pdf.sectionTitle}>Fit Analysis</h3>
              {d.jobFit.dimensions.map((dim, i) => (
                <div key={i} style={pdf.dimRow}>
                  <div style={pdf.dimHeader}>
                    <span>{dim.name}</span>
                    <span style={{ color: getScoreColor(dim.score), fontWeight: 700 }}>{dim.score}</span>
                  </div>
                  <div style={pdf.dimBarBg}>
                    <div style={{ ...pdf.dimBarFill, width: `${dim.score}%`, background: getScoreColor(dim.score) }} />
                  </div>
                  {dim.note && <div style={pdf.dimNote}>{dim.note}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Equipment */}
          {d.equipment?.length > 0 && (
            <div style={pdf.section}>
              <h3 style={pdf.sectionTitle}>Equipment Experience</h3>
              {d.equipment.slice(0, 5).map((eq, i) => (
                <div key={i} style={pdf.eqRow}>
                  <span>{eq.type}</span>
                  <span style={pdf.eqLevel}>{eq.level}</span>
                </div>
              ))}
            </div>
          )}

          {/* AI Recommendation */}
          {d.jobFit?.recommendation && (
            <div style={pdf.aiBox}>
              <div style={pdf.aiHeader}>
                <span style={pdf.aiIcon}>AI</span>
                <span style={pdf.aiTitle}>Recruiter Recommendation</span>
              </div>
              <p style={pdf.aiText}>{d.jobFit.recommendation}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={pdf.footer}>
        <div style={pdf.footerLeft}>
          <img src="/fw-logo-white.svg" alt="" style={{ height: 14, width: 14 }} />
          <span>FreeWorld Driver Fit Profile</span>
        </div>
        <span>Confidential · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
      </div>
    </div>
  );
}

// PDF Styles - designed for single Letter page (8.5x11 with margins)
const pdf = {
  page: {
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    fontSize: 11,
    lineHeight: 1.4,
    color: '#1A2A30',
    padding: 0,
    background: '#fff',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #004751 0%, #006575 100%)',
    padding: '20px 22px',
    marginBottom: 20,
    borderRadius: 10,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  headerBrand: { color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  headerRight: { textAlign: 'right' },
  driverName: { color: '#fff', fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, serif' },
  driverMeta: { color: '#b0db2a', fontSize: 12, marginTop: 4 },

  // Video Card
  videoCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    background: 'linear-gradient(135deg, #004751 0%, #006575 100%)',
    padding: '14px 16px',
    borderRadius: 8,
    marginBottom: 16,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  videoThumb: {
    width: 72,
    height: 48,
    background: 'linear-gradient(135deg, #002830 0%, #004751 100%)',
    borderRadius: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playButton: {
    width: 30,
    height: 30,
    background: '#b0db2a',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: { color: '#004751', fontSize: 11, marginLeft: 2 },
  videoCta: { flex: 1 },
  videoCtaTitle: { color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 2 },
  videoCtaSub: { color: 'rgba(255,255,255,0.7)', fontSize: 9 },

  fitBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #b0db2a 0%, #9dd01e 100%)',
    padding: '14px 20px',
    borderRadius: 8,
    marginBottom: 20,
  },
  fitLabel: { color: '#004751', fontSize: 12, fontWeight: 600 },
  fitEmployer: { color: '#004751', fontSize: 10, opacity: 0.8 },
  fitScore: { color: '#004751', fontSize: 30, fontWeight: 800 },

  columns: { display: 'flex', gap: 20 },
  leftCol: { flex: 1 },
  rightCol: { width: 285 },

  section: { marginBottom: 20 },
  sectionTitle: { margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#004751', borderBottom: '1px solid #E8ECEE', paddingBottom: 5 },

  quoteBox: {
    position: 'relative',
    background: 'linear-gradient(135deg, #F0F9FF 0%, #E8F5E9 100%)',
    borderLeft: '3px solid #004751',
    padding: '14px 16px',
    marginBottom: 18,
    borderRadius: '0 8px 8px 0',
  },
  quoteIcon: { position: 'absolute', top: 4, left: 8, fontSize: 28, fontFamily: 'Georgia, serif', color: '#004751', opacity: 0.15 },
  quoteText: { margin: 0, fontSize: 12, fontStyle: 'italic', color: '#004751', lineHeight: 1.5 },
  quoteAttr: { margin: '6px 0 0', fontSize: 10, color: '#5A7A82' },

  text: { margin: 0, fontSize: 11, lineHeight: 1.5 },
  textMuted: { fontSize: 10, color: '#5A7A82' },

  expRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 70px', gap: 8, padding: '4px 0', borderBottom: '1px solid #F0F2F4', alignItems: 'center' },
  expCompany: { fontWeight: 600, fontSize: 11 },
  expRole: { fontSize: 10, color: '#5A7A82' },
  expTenure: { fontSize: 10, color: '#5A7A82', textAlign: 'right' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 },
  statBox: { background: '#F8FAFB', borderRadius: 6, padding: 8, textAlign: 'center' },
  statNum: { fontSize: 18, fontWeight: 800, color: '#004751', fontFamily: 'Georgia, serif' },
  statLabel: { fontSize: 8, color: '#5A7A82', textTransform: 'uppercase', letterSpacing: 0.3 },

  complianceRow: { display: 'flex', gap: 16, fontSize: 10 },
  good: { color: '#059669' },
  warn: { color: '#D97706' },

  dimRow: { marginBottom: 8 },
  dimHeader: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 },
  dimBarBg: { height: 4, background: '#E8ECEE', borderRadius: 2, overflow: 'hidden' },
  dimBarFill: { height: '100%', borderRadius: 2 },
  dimNote: { fontSize: 9, color: '#9CA3AF', fontStyle: 'italic', marginTop: 2 },

  eqRow: { display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #F0F2F4', fontSize: 11 },
  eqLevel: { color: '#5A7A82', fontStyle: 'italic' },

  aiBox: {
    background: '#F8FAFB',
    border: '1px solid #E8ECEE',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  aiHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  aiIcon: { background: 'linear-gradient(135deg, #004751, #006575)', color: '#b0db2a', fontSize: 8, fontWeight: 700, padding: '3px 5px', borderRadius: 4 },
  aiTitle: { fontSize: 10, fontWeight: 600, color: '#004751', textTransform: 'uppercase', letterSpacing: 0.5 },
  aiText: { margin: 0, fontSize: 10, color: '#5A7A82', lineHeight: 1.5 },

  trainingInfo: { fontSize: 11 },

  videoBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#004751',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: 6,
    marginTop: 12,
    marginBottom: 12,
    fontSize: 10,
  },
  playIcon: { color: '#b0db2a' },
  videoUrl: { color: '#b0db2a', wordBreak: 'break-all' },

  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#004751',
    color: 'rgba(255,255,255,0.6)',
    padding: '12px 16px',
    borderRadius: 6,
    fontSize: 9,
    marginTop: 'auto',
  },
  footerLeft: { display: 'flex', alignItems: 'center', gap: 6 },
};

export default function DriverPortfolio({ slug }) {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPdfMode, setIsPdfMode] = useState(false);
  const videoRef = useRef(null);

  // Detect mobile and PDF mode
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const urlParams = new URLSearchParams(window.location.search);
    setIsPdfMode(urlParams.get('pdf') === 'true');

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!slug) {
      setError("No portfolio slug provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const urlParams = new URLSearchParams(window.location.search);
    const submissionId = urlParams.get('submission');

    getPortfolio(slug, submissionId)
      .then((data) => {
        setDriver(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  const handlePlayVideo = () => {
    if (videoRef.current) {
      // Explicitly unmute and set volume for iOS Safari
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      videoRef.current.play();
      setIsVideoPlaying(true);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!driver) return <NotFoundState slug={slug} />;

  // Render PDF layout for single-page print
  if (isPdfMode) {
    return <PdfLayout driver={driver} />;
  }

  const d = driver;
  const displayName = formatName(d.name);

  return (
    <div style={styles.container}>
      {/* Main Content - everything constrained to same width */}
      <div style={isMobile ? styles.contentMobile : styles.content} className="dfp-content">
        {/* Video Hero or Text Hero */}
        {d.videoUrl ? (
          <div style={styles.videoHero}>
            <div style={styles.videoWrapper}>
              <video
                ref={videoRef}
                src={d.videoUrl}
                style={styles.video}
                controls
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                playsInline
                webkit-playsinline="true"
                preload="metadata"
                x-webkit-airplay="allow"
              />
              {!isVideoPlaying && (
                <div style={styles.videoOverlay} onClick={handlePlayVideo}>
                  <div style={styles.playButton}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="#004751">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.textHero}>
            <div style={styles.heroLogo}>
              <img src="/fw-logo-white.svg" alt="FreeWorld" style={{ height: 32, width: 32 }} />
              <span style={styles.heroLogoText}>Driver Fit Profile</span>
            </div>
            <div style={styles.heroName}>{displayName}</div>
            <div style={styles.heroMeta}>
              {d.homeBase && `${d.homeBase} · `}{d.cdlClass}{d.yearsExp > 0 && ` · ${d.yearsExp} Years Experience`}
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div style={styles.actionBar} className="dfp-action-bar">
          <div style={styles.actionBarLeft}>
            {d.jobFit && (
              <div style={styles.fitScoreDisplay}>
                <span style={styles.fitScoreNumber}>{d.jobFit.overallScore}%</span>
                <span style={styles.fitScoreLabel}>Fit Score</span>
              </div>
            )}
            <div style={styles.badges}>
              <span style={styles.badge}>{d.cdlClass}</span>
              {d.endorsements?.length > 0 && (
                <span style={styles.badge}>{d.endorsements.join(', ')}</span>
              )}
              {d.yearsExp > 0 && <span style={styles.badge}>{d.yearsExp} yrs exp</span>}
            </div>
          </div>
          {d.videoUrl && (
            <div style={styles.driverInfo} className="dfp-driver-info">
              <div style={styles.driverName}>{displayName}</div>
              <div style={styles.driverLocation}>{d.homeBase}</div>
            </div>
          )}
        </div>

        {/* Pull Quote */}
        {d.whyTrucking && (
          <div style={styles.pullQuoteSection}>
            <div style={styles.quoteIcon}>"</div>
            <p style={styles.pullQuote}>{d.whyTrucking}</p>
            <p style={styles.quoteAttribution}>— {displayName}</p>
          </div>
        )}

        <div style={isMobile ? styles.gridMobile : styles.grid} className="dfp-grid">
          {/* Left Column - Main Info */}
          <div style={styles.mainColumn}>
            {/* About / AI Narrative */}
            {d.story && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>About {displayName}</h2>
                <p style={styles.narrative}>{d.story}</p>
              </div>
            )}

            {/* Employment History */}
            {d.experience?.length > 0 && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Employment History</h2>
                <div style={styles.employmentTable} className="dfp-employment-table">
                  <div style={styles.employmentHeader} className="dfp-employment-header">
                    <span style={styles.employmentHeaderCell}>Company</span>
                    <span style={styles.employmentHeaderCell}>Role</span>
                    <span style={styles.employmentHeaderCell}>Tenure</span>
                    <span style={styles.employmentHeaderCell}></span>
                  </div>
                  {d.experience.map((exp, i) => (
                    <div key={i} style={styles.employmentRow} className="dfp-employment-row">
                      <span style={styles.employmentCompany}>{exp.company}</span>
                      <span style={styles.employmentRole}>{exp.role}</span>
                      <span style={styles.employmentTenure}>{exp.tenure || '-'}</span>
                      <span style={styles.employmentVerified}>
                        {exp.verified && <span style={styles.dotRegulatedBadge}>DOT-Regulated</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safety & Compliance */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Safety & Compliance</h2>
              <div style={styles.statsGrid}>
                <div style={{...styles.statBox, ...(d.mvrDetails.violations === 0 ? styles.statBoxGreen : styles.statBoxYellow)}}>
                  <div style={styles.statNumber}>{d.mvrDetails.violations}</div>
                  <div style={styles.statLabel}>MVR Violations (3yr)</div>
                </div>
                <div style={{...styles.statBox, ...(d.mvrDetails.accidents === 0 ? styles.statBoxGreen : styles.statBoxYellow)}}>
                  <div style={styles.statNumber}>{d.mvrDetails.accidents}</div>
                  <div style={styles.statLabel}>At-Fault Accidents</div>
                </div>
                <div style={{...styles.statBox, ...(d.pspDetails.crashes5yr === 0 ? styles.statBoxGreen : styles.statBoxYellow)}}>
                  <div style={styles.statNumber}>{d.pspDetails.crashes5yr}</div>
                  <div style={styles.statLabel}>PSP Crashes (5yr)</div>
                </div>
                <div style={styles.statBox}>
                  <div style={styles.statNumber}>{d.pspDetails.violations3yr}</div>
                  <div style={styles.statLabel}>PSP Violations (3yr)</div>
                </div>
              </div>

              <div style={styles.complianceList}>
                <div style={{...styles.complianceItem, ...(d.mvr === 'Clear' ? styles.complianceGreen : styles.complianceYellow)}}>
                  <span style={styles.complianceLabel}>MVR Status</span>
                  <span style={styles.complianceBadge}>{d.mvr}</span>
                </div>
                <div style={{...styles.complianceItem, ...(d.clearinghouse === 'Not Prohibited' ? styles.complianceGreen : styles.complianceYellow)}}>
                  <span style={styles.complianceLabel}>Clearinghouse</span>
                  <span style={styles.complianceBadge}>{d.clearinghouse}</span>
                </div>
                <div style={{...styles.complianceItem, ...(d.license.medicalCardStatus === 'Valid' ? styles.complianceGreen : styles.complianceYellow)}}>
                  <span style={styles.complianceLabel}>Medical Card</span>
                  <span style={styles.complianceBadge}>{d.license.medicalCardStatus}</span>
                </div>
              </div>

              {d.mvrDetails.summary && (
                <div style={styles.summaryBox}>
                  <p style={styles.summaryText}>{d.mvrDetails.summary}</p>
                </div>
              )}
            </div>

            {/* Training */}
            {d.training?.school && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>CDL Training</h2>
                <div style={styles.trainingList}>
                  <div style={styles.trainingRow}>
                    <span style={styles.trainingLabel}>School</span>
                    <span style={styles.trainingValue}>{d.training.school}</span>
                  </div>
                  {d.training.location && (
                    <div style={styles.trainingRow}>
                      <span style={styles.trainingLabel}>Location</span>
                      <span style={styles.trainingValue}>{d.training.location}</span>
                    </div>
                  )}
                  {d.training.graduated && (
                    <div style={styles.trainingRow}>
                      <span style={styles.trainingLabel}>Graduated</span>
                      <span style={styles.trainingValue}>{d.training.graduated}</span>
                    </div>
                  )}
                  {d.training.hours > 0 && (
                    <div style={styles.trainingRow}>
                      <span style={styles.trainingLabel}>Instruction Hours</span>
                      <span style={styles.trainingValue}>{d.training.hours} hours</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Recruiter Notes */}
            {d.aiNotes && (
              <div style={styles.notesCard}>
                <div style={styles.notesIcon}>AI</div>
                <div>
                  <div style={styles.notesTitle}>Recruiter Notes</div>
                  <p style={styles.notesText}>{d.aiNotes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div style={styles.sidebar}>
            {/* Job Fit Analysis */}
            {d.jobFit && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Job Fit Analysis</h2>
                <div style={styles.fitCard}>
                  <div style={styles.fitCardHeader}>
                    <div>
                      <div style={styles.fitJobTitle}>{d.jobFit.role}</div>
                      <div style={styles.fitEmployer}>{d.jobFit.employer}</div>
                    </div>
                    <span style={{ ...styles.fitScoreBadge, ...getScoreStyle(d.jobFit.overallScore) }}>
                      {d.jobFit.overallScore}%
                    </span>
                  </div>

                  {d.jobFit.dimensions?.length > 0 && (
                    <div style={styles.dimensionsList}>
                      {d.jobFit.dimensions.map((dim, j) => (
                        <div key={j} style={styles.dimensionRow}>
                          <div style={styles.dimensionLabel}>
                            <span>{dim.name}</span>
                            <span style={{ color: getScoreColor(dim.score), fontWeight: 700 }}>{dim.score}</span>
                          </div>
                          <div style={styles.dimensionBar}>
                            <div
                              style={{
                                ...styles.dimensionFill,
                                width: `${dim.score}%`,
                                background: getScoreColor(dim.score)
                              }}
                            />
                          </div>
                          {dim.note && <div style={styles.dimensionNote}>{dim.note}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {d.jobFit.recommendation && (
                    <div style={styles.fitRecommendation}>
                      <div style={styles.recommendationIcon}>AI</div>
                      <p style={styles.recommendationText}>{d.jobFit.recommendation}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Equipment Experience */}
            {d.equipment?.length > 0 && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Equipment Experience</h2>
                <div style={styles.equipmentList}>
                  {d.equipment.map((eq, i) => (
                    <div key={i} style={styles.equipmentRow}>
                      <span style={styles.equipmentType}>{eq.type}</span>
                      <span style={styles.equipmentLevel}>{eq.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact CTA */}
            <div style={styles.ctaCard}>
              <h3 style={styles.ctaTitle}>Interested in this driver?</h3>
              <p style={styles.ctaText}>
                Contact FreeWorld to learn more about this candidate and discuss hiring.
              </p>
              <a href="mailto:careers@freeworld.io" style={styles.ctaButton}>
                Contact FreeWorld
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerLeft}>
            <img src="/fw-logo-white.svg" alt="FreeWorld" style={{ height: 24, width: 24 }} />
            <span style={styles.footerText}>FreeWorld Driver Fit Profile</span>
          </div>
          <span style={styles.footerMeta}>Confidential · Generated February 2026</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    background: "#F4F4F4",
    minHeight: "100vh",
  },
  loadingScreen: {
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    background: "#F4F4F4",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 20,
  },

  // Video Hero
  videoHero: {
    background: '#004751',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  videoWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#000',
    maxHeight: '70vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    maxWidth: '100%',
    maxHeight: '70vh',
    objectFit: 'contain',
    display: 'block',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  playButton: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'rgba(205, 249, 92, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },

  // Text Hero (no video)
  textHero: {
    background: 'linear-gradient(135deg, #004751 0%, #006575 100%)',
    padding: '40px 20px',
    textAlign: 'center',
    borderRadius: 12,
    marginBottom: 20,
  },
  heroLogo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  heroLogoText: {
    fontSize: 12,
    color: '#8AAFB8',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  heroName: {
    fontSize: 'clamp(28px, 6vw, 42px)',
    fontWeight: 700,
    color: '#FFFFFF',
    fontFamily: 'Georgia, serif',
    marginBottom: 8,
  },
  heroMeta: {
    fontSize: 'clamp(14px, 2.5vw, 16px)',
    color: 'rgba(255,255,255,0.8)',
  },

  // Action Bar
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#FFFFFF',
    padding: '16px 24px',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  actionBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  fitScoreDisplay: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
  },
  fitScoreNumber: {
    fontSize: 32,
    fontWeight: 800,
    color: '#059669',
  },
  fitScoreLabel: {
    fontSize: 13,
    color: '#5A7A82',
    fontWeight: 500,
  },
  badges: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    background: '#F0F9FF',
    color: '#004751',
    borderRadius: 20,
  },
  driverInfo: {
    textAlign: 'right',
  },
  driverName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#004751',
    fontFamily: 'Georgia, serif',
  },
  driverLocation: {
    fontSize: 13,
    color: '#5A7A82',
  },

  // Content
  content: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '20px 20px 0',
  },
  contentMobile: {
    width: '100%',
    padding: 12,
    boxSizing: 'border-box',
  },

  // Pull Quote
  pullQuoteSection: {
    position: 'relative',
    background: 'linear-gradient(135deg, #F0F9FF 0%, #E8F5E9 100%)',
    borderRadius: 16,
    padding: '32px 40px',
    marginBottom: 24,
    borderLeft: '4px solid #004751',
  },
  quoteIcon: {
    position: 'absolute',
    top: 12,
    left: 20,
    fontSize: 64,
    fontFamily: 'Georgia, serif',
    color: '#004751',
    opacity: 0.15,
    lineHeight: 1,
  },
  pullQuote: {
    margin: 0,
    fontSize: 'clamp(18px, 3vw, 22px)',
    fontStyle: 'italic',
    color: '#004751',
    lineHeight: 1.6,
    position: 'relative',
    zIndex: 1,
  },
  quoteAttribution: {
    margin: '12px 0 0',
    fontSize: 14,
    color: '#5A7A82',
    fontWeight: 500,
  },

  // Grid
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: 24,
  },
  gridMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  mainColumn: {},
  sidebar: {},

  // Cards
  card: {
    background: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    border: '1px solid #E8ECEE',
  },
  cardTitle: {
    margin: '0 0 16px',
    fontSize: 18,
    fontWeight: 600,
    color: '#004751',
  },
  narrative: {
    margin: 0,
    fontSize: 15,
    color: '#1A2A30',
    lineHeight: 1.7,
  },

  // Employment Table
  employmentTable: {
    display: 'flex',
    flexDirection: 'column',
  },
  employmentHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.5fr 1fr 1fr',
    gap: 16,
    paddingBottom: 12,
    borderBottom: '1px solid #E8ECEE',
    marginBottom: 8,
    alignItems: 'center',
  },
  employmentHeaderCell: {
    fontSize: 11,
    fontWeight: 700,
    color: '#5A7A82',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  employmentRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.5fr 1fr 1fr',
    gap: 16,
    padding: '14px 0',
    borderBottom: '1px solid #F0F2F4',
    alignItems: 'center',
  },
  employmentCompany: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1A2A30',
  },
  employmentRole: {
    fontSize: 14,
    color: '#5A7A82',
  },
  employmentTenure: {
    fontSize: 14,
    color: '#1A2A30',
  },
  employmentVerified: {
    display: 'flex',
    alignItems: 'center',
  },
  dotRegulatedBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: '#059669',
    background: '#D1FAE5',
    padding: '4px 10px',
    borderRadius: 12,
    border: '1px solid #A7F3D0',
  },

  // Stats Grid
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    background: '#F8FAFB',
    borderRadius: 10,
    padding: 16,
    textAlign: 'center',
  },
  statBoxGreen: {
    background: '#F0FAF0',
    border: '1px solid #C8E6C9',
  },
  statBoxYellow: {
    background: '#FFF8E1',
    border: '1px solid #FFECB3',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 800,
    color: '#004751',
    fontFamily: 'Georgia, serif',
  },
  statLabel: {
    fontSize: 11,
    color: '#5A7A82',
    marginTop: 4,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Compliance List
  complianceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  complianceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: 8,
    background: '#F8FAFB',
  },
  complianceGreen: {
    background: '#F0FAF0',
    border: '1px solid #C8E6C9',
  },
  complianceYellow: {
    background: '#FFF8E1',
    border: '1px solid #FFECB3',
  },
  complianceLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1A2A30',
  },
  complianceBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.8)',
  },
  summaryBox: {
    background: '#F8FAFB',
    borderRadius: 8,
    padding: 16,
    borderLeft: '3px solid #004751',
  },
  summaryText: {
    margin: 0,
    fontSize: 14,
    color: '#3A5A64',
    lineHeight: 1.6,
  },

  // Training
  trainingList: {
    display: 'flex',
    flexDirection: 'column',
  },
  trainingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #F0F2F4',
    gap: 24,
  },
  trainingLabel: {
    fontSize: 13,
    color: '#5A7A82',
    flexShrink: 0,
  },
  trainingValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1A2A30',
    textAlign: 'right',
  },

  // Notes Card
  notesCard: {
    display: 'flex',
    gap: 16,
    background: '#F8FAFB',
    borderRadius: 12,
    padding: 20,
    borderLeft: '4px solid #004751',
    marginBottom: 20,
  },
  notesIcon: {
    width: 36,
    height: 36,
    background: 'linear-gradient(135deg, #004751, #006575)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    color: '#CDF95C',
    flexShrink: 0,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#004751',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  notesText: {
    margin: 0,
    fontSize: 14,
    color: '#3A5A64',
    lineHeight: 1.7,
  },

  // Fit Card
  fitCard: {
    background: '#F8FAFB',
    borderRadius: 10,
    padding: 16,
  },
  fitCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  fitJobTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1A2A30',
  },
  fitEmployer: {
    fontSize: 13,
    color: '#5A7A82',
    marginTop: 2,
  },
  fitScoreBadge: {
    padding: '6px 12px',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 16,
    flexShrink: 0,
  },
  dimensionsList: {
    marginBottom: 16,
  },
  dimensionRow: {
    marginBottom: 14,
  },
  dimensionLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    fontWeight: 500,
    color: '#5A7A82',
    marginBottom: 4,
  },
  dimensionBar: {
    height: 6,
    background: '#E8ECEE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  dimensionFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.5s ease',
  },
  dimensionNote: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  fitRecommendation: {
    display: 'flex',
    gap: 10,
    padding: 12,
    background: '#FFFFFF',
    borderRadius: 8,
    border: '1px solid #E8ECEE',
  },
  recommendationIcon: {
    width: 28,
    height: 28,
    background: 'linear-gradient(135deg, #004751, #006575)',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    color: '#CDF95C',
    flexShrink: 0,
  },
  recommendationText: {
    margin: 0,
    fontSize: 13,
    color: '#5A7A82',
    lineHeight: 1.5,
  },

  // Equipment
  equipmentList: {
    display: 'flex',
    flexDirection: 'column',
  },
  equipmentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #F0F2F4',
  },
  equipmentType: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1A2A30',
  },
  equipmentLevel: {
    fontSize: 14,
    color: '#5A7A82',
    fontStyle: 'italic',
  },

  // CTA Card
  ctaCard: {
    background: 'linear-gradient(135deg, #004751 0%, #006575 100%)',
    borderRadius: 12,
    padding: 24,
    textAlign: 'center',
  },
  ctaTitle: {
    margin: '0 0 8px',
    fontSize: 18,
    fontWeight: 600,
    color: '#FFFFFF',
  },
  ctaText: {
    margin: '0 0 16px',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 1.5,
  },
  ctaButton: {
    display: 'inline-block',
    width: '100%',
    padding: '14px 24px',
    fontSize: 15,
    fontWeight: 600,
    background: '#CDF95C',
    color: '#004751',
    border: 'none',
    borderRadius: 8,
    textDecoration: 'none',
    textAlign: 'center',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },

  // Footer
  footer: {
    background: '#004751',
    padding: '16px 20px',
    marginTop: 32,
    marginBottom: 20,
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
  },
  footerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  footerText: {
    fontSize: 13,
    color: '#8AAFB8',
  },
  footerMeta: {
    fontSize: 12,
    color: '#5A7A82',
  },

  // Responsive - Note: inline styles don't support media queries directly
  // Consider using CSS-in-JS library or external CSS for responsive design
};
