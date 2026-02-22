import { useState, useEffect } from "react";
import { getPortfolio } from "./lib/api";

function ScoreBar({ score, color = "#004751" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#E8ECEE", overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", borderRadius: 4, background: score >= 90 ? "#004751" : score >= 80 ? "#006575" : "#5A7A82", transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 15, color, minWidth: 36, textAlign: "right" }}>{score}</span>
    </div>
  );
}

function Badge({ children, variant = "default" }) {
  const styles = {
    default: { background: "#E8F5E9", color: "#004751", border: "1px solid #C8E6C9" },
    green: { background: "#CDF95C", color: "#191931", border: "none" },
    teal: { background: "#004751", color: "#FFFFFF", border: "none" },
    violet: { background: "#C5C7E4", color: "#191931", border: "none" },
    clear: { background: "#E8F5E9", color: "#2E7D32", border: "1px solid #A5D6A7" },
    warn: { background: "#FFF8E1", color: "#F57F17", border: "1px solid #FFECB3" },
  };
  const s = styles[variant] || styles.default;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, letterSpacing: 0.3, ...s }}>
      {children}
    </span>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: "2px solid #004751" }}>
      <h2 style={{ margin: 0, fontSize: "clamp(16px, 4vw, 20px)", fontWeight: 700, color: "#004751", fontFamily: "Georgia, serif" }}>{children}</h2>
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 10, padding: "20px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E8ECEE", ...style }}>
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: "#F4F4F4", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <img src="/fw-logo.svg" alt="FreeWorld" style={{ height: 48, width: 48, marginBottom: 20 }} />
        <p style={{ color: "#5A7A82", fontSize: 16 }}>Loading portfolio...</p>
      </div>
    </div>
  );
}

function NotFoundState({ slug }) {
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: "#F4F4F4", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 20 }}>
        <img src="/fw-logo.svg" alt="FreeWorld" style={{ height: 48, width: 48, marginBottom: 20 }} />
        <h1 style={{ color: "#004751", fontSize: 24, fontFamily: "Georgia, serif", marginBottom: 12 }}>Portfolio Not Found</h1>
        <p style={{ color: "#5A7A82", fontSize: 15, lineHeight: 1.6 }}>
          No driver portfolio found for "{slug}". The portfolio may not exist or may not be published yet.
        </p>
      </div>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: "#F4F4F4", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 20 }}>
        <img src="/fw-logo.svg" alt="FreeWorld" style={{ height: 48, width: 48, marginBottom: 20 }} />
        <h1 style={{ color: "#004751", fontSize: 24, fontFamily: "Georgia, serif", marginBottom: 12 }}>Error Loading Portfolio</h1>
        <p style={{ color: "#5A7A82", fontSize: 15, lineHeight: 1.6 }}>
          {error}
        </p>
      </div>
    </div>
  );
}

export default function DriverPortfolio({ slug }) {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!slug) {
      setError("No portfolio slug provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Get submission ID from URL query params
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

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!driver) return <NotFoundState slug={slug} />;

  const d = driver;

  // Check if driver has story content
  const hasStoryContent = d.videoUrl || d.story || d.whyTrucking ||
    (d.storyResponses && Object.values(d.storyResponses).some(v => v));

  // Build tabs - only show tabs with content
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "compliance", label: "MVR & Compliance" },
  ];

  // Only show Driver Story tab if there's content
  if (hasStoryContent) {
    tabs.push({ id: "story", label: "Driver Story" });
  }

  // If we have job fit data, add that tab
  if (d.jobFit) {
    tabs.splice(1, 0, { id: "jobfit", label: "Job Fit Assessment" });
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: "#F4F4F4", minHeight: "100vh", padding: 0 }}>
      {/* Header */}
      <div style={{ background: "#004751", padding: "24px 16px 20px", color: "#FFFFFF" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <img src="/fw-logo-white.svg" alt="FreeWorld" style={{ height: 32, width: 32 }} />
              <span style={{ fontSize: 12, color: "#8AAFB8", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>Driver Fit Profile</span>
            </div>
            <h1 style={{ margin: "12px 0 4px", fontSize: "clamp(24px, 6vw, 32px)", fontWeight: 700, fontFamily: "Georgia, serif" }}>{d.name}</h1>
            <p style={{ margin: 0, fontSize: 15, color: "#B0CDD4" }}>
              {d.homeBase && `${d.homeBase} · `}{d.cdlClass}{d.yearsExp > 0 && ` · ${d.yearsExp} Years Experience`}
            </p>
          </div>
          </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", padding: "0 16px", display: "flex", gap: 0, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "14px 12px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? "#004751" : "#5A7A82",
              borderBottom: activeTab === tab.id ? "3px solid #004751" : "3px solid transparent",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px", maxWidth: 960, margin: "0 auto" }}>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Job Fit Banner - only if we have match data */}
            {d.jobFit && (
              <Card style={{ background: "#004751", color: "#FFFFFF", border: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ flex: "1 1 200px" }}>
                    <div style={{ fontSize: 12, color: "#CDF95C", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 4 }}>Job Fit Assessment</div>
                    <div style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 700, fontFamily: "Georgia, serif" }}>{d.jobFit.role}</div>
                    <div style={{ fontSize: 14, color: "#B0CDD4", marginTop: 2 }}>{d.jobFit.employer}</div>
                  </div>
                  <div style={{ textAlign: "center", flex: "0 0 auto" }}>
                    <div style={{ fontSize: "clamp(36px, 10vw, 48px)", fontWeight: 800, color: "#CDF95C", lineHeight: 1, fontFamily: "Georgia, serif" }}>{d.jobFit.overallScore}</div>
                    <div style={{ fontSize: 12, color: "#B0CDD4", marginTop: 2 }}>Overall Fit Score</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Experience Table */}
            {d.experience.length > 0 && (
              <Card>
                <SectionTitle>Employment History</SectionTitle>
                <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", margin: "0 -16px", padding: "0 16px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 480 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #E8ECEE" }}>
                        {["Company", "Role", "Tenure", "Verified"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#5A7A82", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.experience.map((exp, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #F0F2F4" }}>
                          <td style={{ padding: "12px", fontWeight: 600, color: "#1A2A30" }}>{exp.company}</td>
                          <td style={{ padding: "12px", color: "#5A7A82" }}>{exp.role}</td>
                          <td style={{ padding: "12px", color: "#1A2A30" }}>{exp.tenure}</td>
                          <td style={{ padding: "12px" }}>
                            {exp.verified && <Badge variant="clear">DOT-Regulated</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Equipment & Training side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              {d.equipment.length > 0 && (
                <Card>
                  <SectionTitle>Equipment Experience</SectionTitle>
                  {d.equipment.map((eq, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < d.equipment.length - 1 ? "1px solid #F0F2F4" : "none" }}>
                      <span style={{ fontWeight: 600, color: "#1A2A30", fontSize: 14 }}>{eq.type}</span>
                      <span style={{ color: "#5A7A82", fontSize: 14 }}>{eq.level}</span>
                    </div>
                  ))}
                </Card>
              )}
              {d.training.school && (
                <Card>
                  <SectionTitle>Training</SectionTitle>
                  {[
                    { label: "CDL School", value: d.training.school },
                    d.training.location && { label: "Location", value: d.training.location },
                    { label: "Graduated", value: d.training.graduated },
                    { label: "Instruction Hours", value: `${d.training.hours} hours` },
                  ].filter(Boolean).map((item, i, arr) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < arr.length - 1 ? "1px solid #F0F2F4" : "none" }}>
                      <span style={{ color: "#5A7A82", fontSize: 14 }}>{item.label}</span>
                      <span style={{ fontWeight: 600, color: "#1A2A30", fontSize: 14 }}>{item.value}</span>
                    </div>
                  ))}
                </Card>
              )}
            </div>

            {/* AI Notes */}
            {d.aiNotes && (
              <Card style={{ background: "#F8FAFB", borderLeft: "4px solid #004751" }}>
                <div style={{ fontSize: 12, color: "#004751", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>AI Recruiter Notes</div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#3A5A64" }}>{d.aiNotes}</p>
              </Card>
            )}
          </div>
        )}

        {/* JOB FIT TAB */}
        {activeTab === "jobfit" && d.jobFit && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card style={{ background: "#004751", color: "#FFFFFF", border: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
                <div style={{ flex: "1 1 200px" }}>
                  <div style={{ fontSize: 12, color: "#CDF95C", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 6 }}>Matched Position</div>
                  <div style={{ fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 700, fontFamily: "Georgia, serif" }}>{d.jobFit.role}</div>
                  <div style={{ fontSize: 15, color: "#B0CDD4", marginTop: 4 }}>{d.jobFit.employer}</div>
                </div>
                <div style={{ textAlign: "center", background: "rgba(205,249,92,0.12)", borderRadius: 12, padding: "16px 20px", flex: "0 0 auto" }}>
                  <div style={{ fontSize: "clamp(40px, 12vw, 56px)", fontWeight: 800, color: "#CDF95C", lineHeight: 1, fontFamily: "Georgia, serif" }}>{d.jobFit.overallScore}</div>
                  <div style={{ fontSize: 13, color: "#B0CDD4", marginTop: 4 }}>Overall Fit</div>
                </div>
              </div>
            </Card>

            {d.jobFit.dimensions && d.jobFit.dimensions.length > 0 && (
              <Card>
                <SectionTitle>Fit Dimensions</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {d.jobFit.dimensions.map((dim, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, color: "#1A2A30", fontSize: 15 }}>{dim.name}</span>
                      </div>
                      <ScoreBar score={dim.score} />
                      <p style={{ margin: "6px 0 0", fontSize: 13, color: "#5A7A82" }}>{dim.note}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {d.jobFit.recommendation && (
              <Card style={{ background: "#F8FAFB", borderLeft: "4px solid #CDF95C" }}>
                <div style={{ fontSize: 12, color: "#004751", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>Career Agent Recommendation</div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#3A5A64" }}>
                  {d.jobFit.recommendation}
                </p>
              </Card>
            )}
          </div>
        )}

        {/* MVR & COMPLIANCE TAB */}
        {activeTab === "compliance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card>
              <SectionTitle>Motor Vehicle Record (MVR)</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Moving Violations", value: d.mvrDetails.violations, status: d.mvrDetails.violations === 0 ? "clear" : "warn" },
                  { label: "At-Fault Accidents", value: d.mvrDetails.accidents, status: d.mvrDetails.accidents === 0 ? "clear" : "warn" },
                  { label: "Suspensions", value: d.mvrDetails.suspensions, status: d.mvrDetails.suspensions === 0 ? "clear" : "warn" },
                  { label: "Last MVR Pull", value: d.mvrDetails.lastPull, status: "info" },
                ].map((item, i) => (
                  <div key={i} style={{ background: item.status === "clear" ? "#F0FAF0" : item.status === "warn" ? "#FFF8E1" : "#F4F4F4", borderRadius: 8, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: item.status === "clear" ? "#004751" : item.status === "warn" ? "#F57F17" : "#1A2A30", fontFamily: "Georgia, serif" }}>
                      {typeof item.value === "number" ? item.value : item.value}
                    </div>
                    <div style={{ fontSize: 12, color: "#5A7A82", marginTop: 4, fontWeight: 600 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#F8FAFB", borderRadius: 8, padding: 16 }}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#3A5A64" }}>{d.mvrDetails.summary}</p>
              </div>
            </Card>

            {/* PSP Details */}
            <Card>
              <SectionTitle>Pre-Employment Screening (PSP)</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                {[
                  { label: "Crashes (5yr)", value: d.pspDetails.crashes5yr, status: d.pspDetails.crashes5yr === 0 ? "clear" : "warn" },
                  { label: "Inspections (3yr)", value: d.pspDetails.inspections3yr, status: "info" },
                  { label: "Driver OOS", value: d.pspDetails.driverOOS, status: d.pspDetails.driverOOS === 0 ? "clear" : "warn" },
                ].map((item, i) => (
                  <div key={i} style={{ background: item.status === "clear" ? "#F0FAF0" : item.status === "warn" ? "#FFF8E1" : "#F4F4F4", borderRadius: 8, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: item.status === "clear" ? "#004751" : item.status === "warn" ? "#F57F17" : "#1A2A30", fontFamily: "Georgia, serif" }}>
                      {item.value}
                    </div>
                    <div style={{ fontSize: 12, color: "#5A7A82", marginTop: 4, fontWeight: 600 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle>Compliance Status</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { item: "MVR (Motor Vehicle Record)", status: d.mvr, ok: d.mvr === "Clear" },
                  { item: "PSP (Pre-Employment Screening)", status: d.psp === "Clear" ? "Clear" : "See Notes", ok: d.psp === "Clear" },
                  { item: "FMCSA Clearinghouse", status: d.clearinghouse, ok: d.clearinghouse === "Not Prohibited" },
                  { item: "DOT Medical Card", status: d.license.medicalCardStatus, ok: d.license.medicalCardStatus === "Valid" },
                ].map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: c.ok ? "#F0FAF0" : "#FFF8E1", borderRadius: 8, border: `1px solid ${c.ok ? "#C8E6C9" : "#FFECB3"}` }}>
                    <span style={{ fontWeight: 600, color: "#1A2A30", fontSize: 14 }}>{c.item}</span>
                    <Badge variant={c.ok ? "clear" : "warn"}>{c.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card style={{ background: "#F8FAFB", borderLeft: "4px solid #004751" }}>
              <div style={{ fontSize: 12, color: "#004751", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>DOT Application Status</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#3A5A64" }}>
                Full DOT application on file and available upon employer request. Application includes complete 10-year employment history, residence history, and all required disclosures.
              </p>
            </Card>
          </div>
        )}

        {/* DRIVER STORY TAB */}
        {activeTab === "story" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Video Embed - only if video URL exists */}
            {d.videoUrl && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ background: "#004751", padding: "20px 16px 8px" }}>
                  <div style={{ fontSize: 12, color: "#CDF95C", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 6 }}>Video Introduction</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF", fontFamily: "Georgia, serif" }}>Hear {d.name.split(' ')[0]}'s Story</div>
                </div>
                {d.videoUrl.includes('youtube.com') || d.videoUrl.includes('youtu.be') ? (
                  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYouTubeId(d.videoUrl)}`}
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <video
                    controls
                    style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", display: "block", background: "#000" }}
                  >
                    <source src={d.videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                )}
              </Card>
            )}

            {/* Story/Narrative */}
            {d.story && (
              <Card>
                <SectionTitle>About {d.name.split(' ')[0]}</SectionTitle>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: "#2A3A40" }}>{d.story}</p>
              </Card>
            )}

            {/* Pull Quote */}
            {d.whyTrucking && (
              <Card style={{ background: "#004751", color: "#FFFFFF", border: "none" }}>
                <div style={{ fontSize: 12, color: "#CDF95C", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 10 }}>In Their Own Words</div>
                <p style={{ margin: 0, fontSize: "clamp(15px, 4vw, 17px)", lineHeight: 1.8, fontStyle: "italic", fontFamily: "Georgia, serif", color: "#E8EDF0" }}>
                  "{d.whyTrucking}"
                </p>
                <p style={{ margin: "12px 0 0", fontSize: 14, color: "#B0CDD4" }}>— {d.name}, CDL-{d.cdlClass.replace('Class ', '')} Driver</p>
              </Card>
            )}

            {/* If no AI narrative, show raw story responses */}
            {!d.story && d.storyResponses.whoAreYou && (
              <Card>
                <SectionTitle>About {d.name.split(' ')[0]}</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {d.storyResponses.whoAreYou && (
                    <div>
                      <div style={{ fontSize: 12, color: "#5A7A82", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>Who They Are</div>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#2A3A40" }}>{d.storyResponses.whoAreYou}</p>
                    </div>
                  )}
                  {d.storyResponses.whyTrucking && (
                    <div>
                      <div style={{ fontSize: 12, color: "#5A7A82", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>Why Trucking</div>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#2A3A40" }}>{d.storyResponses.whyTrucking}</p>
                    </div>
                  )}
                  {d.storyResponses.lookingFor && (
                    <div>
                      <div style={{ fontSize: 12, color: "#5A7A82", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>What They're Looking For</div>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#2A3A40" }}>{d.storyResponses.lookingFor}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: "#004751", padding: "16px", marginTop: 32, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/fw-logo-white.svg" alt="FreeWorld" style={{ height: 24, width: 24 }} />
          <span style={{ fontSize: 13, color: "#8AAFB8" }}>FreeWorld Driver Fit Profile</span>
        </div>
        <span style={{ fontSize: 12, color: "#5A7A82" }}>Confidential · Generated February 2026</span>
      </div>
    </div>
  );
}

function extractYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return match ? match[1] : '';
}
