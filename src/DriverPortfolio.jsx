import { useState } from "react";

const driverData = {
  name: "James H.",
  homeBase: "Fort Worth, TX 76105",
  cdlClass: "Class A",
  endorsements: ["Tanker (N)"],
  routePref: "Local / Regional",
  availability: "Home Daily Preferred",
  yearsExp: 2.5,
  mvr: "Clear",
  psp: "See Notes",
  criminal: "Clear",
  clearinghouse: "No Violations",
  avgTenure: "10 Months",
  experience: [
    { company: "4J Trucking LLC", role: "Company Driver", tenure: "19 months", verified: true, regulated: true },
    { company: "Legend Freights", role: "Company Driver", tenure: "6 months", verified: true, regulated: true },
    { company: "Di Kestro Trucking Co.", role: "Company Driver", tenure: "5 months", verified: true, regulated: true },
  ],
  equipment: [
    { type: "Tractor-Trailer", level: "Yes" },
    { type: "53' Dry Van", level: "Primary Experience" },
    { type: "Straight Truck", level: "Yes" },
    { type: "Tanker (Bulk)", level: "< 1 year" },
  ],
  training: {
    school: "TruckGod Training School",
    location: "Grand Prairie, TX",
    graduated: "2023",
    hours: 170,
  },
  videoUrl: "https://www.youtube.com/watch?v=7TEEFojS7Ds",
  aiNotes: "James is a licensed and active CDL-A driver with no felonies or misdemeanors in the last 15 years, no reported crashes, no drug or alcohol violations, and a clear MVR. Originally from Ardmore, Oklahoma and now based in Dallas, he's a family man with a wife and three kids who got into trucking through FreeWorld's CDL program. His father was a truck driver, and James takes pride in operating big equipment and treating every truck like he owns it. Former dispatchers describe him as a hard worker who genuinely cares about safety and taking care of customers. He meets baseline eligibility for safety-sensitive driving roles and brings a strong work ethic rooted in providing for his family.",
  story: "James grew up in Fort Worth and found his calling behind the wheel after completing CDL training in 2023. He takes pride in being a reliable, safety-first driver who shows up every day ready to work. He values companies that invest in their drivers and offer a path to grow.",
  whyTrucking: "I really believe in the covenant between a driver and employer. Your job is to get the customers, my job is to take care of them.",
  strengths: [
    { trait: "Reliability", score: 92, desc: "Consistent attendance and on-time performance across all verified employers" },
    { trait: "Safety Orientation", score: 88, desc: "Clean MVR, no crashes, no driver OOS events. Strong pre-trip habits." },
    { trait: "Communication", score: 85, desc: "Responsive to dispatchers and proactive about route updates" },
    { trait: "Adaptability", score: 80, desc: "Experience across dry van, straight truck, and tanker operations" },
  ],
  cultureFit: {
    workStyle: "Structured & Reliable",
    teamPref: "Supportive team environment with clear expectations",
    growthGoal: "Wants to grow into specialized hauling (tanker/hazmat)",
    values: ["Respect", "Safety-first culture", "Career development", "Work-life balance"],
  },
  jobFit: {
    employer: "ABC Freight Solutions",
    role: "Regional Dry Van Driver — Home Weekly",
    overallScore: 91,
    dimensions: [
      { name: "Route & Schedule Match", score: 94, note: "Local/regional preference aligns with home-weekly schedule" },
      { name: "Equipment Match", score: 90, note: "Primary dry van experience matches fleet requirements" },
      { name: "Culture Alignment", score: 92, note: "Values safety-first culture; employer ranks top-quartile in driver satisfaction" },
      { name: "Compensation Fit", score: 85, note: "Target range aligns with employer's posted pay band" },
      { name: "Background Eligibility", score: 95, note: "Clean criminal record and MVR meet all employer thresholds" },
    ],
  },
  mvrDetails: {
    violations: 0,
    accidents: 0,
    suspensions: 0,
    lastPull: "January 2026",
    summary: "No moving violations, no at-fault accidents, no license suspensions or revocations in the past 3 years.",
  },
};

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

function SectionTitle({ children, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: "2px solid #004751" }}>
      {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#004751", fontFamily: "Georgia, serif" }}>{children}</h2>
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 10, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E8ECEE", ...style }}>
      {children}
    </div>
  );
}

export default function DriverPortfolio() {
  const [activeTab, setActiveTab] = useState("overview");
  const d = driverData;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "jobfit", label: "Job Fit Assessment" },
    { id: "strengths", label: "Skills & Character" },
    { id: "compliance", label: "MVR & Compliance" },
    { id: "story", label: "Driver Story" },
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: "#F4F4F4", minHeight: "100vh", padding: 0 }}>
      {/* Header */}
      <div style={{ background: "#004751", padding: "28px 32px 20px", color: "#FFFFFF" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <span style={{ background: "#CDF95C", color: "#191931", fontWeight: 800, fontSize: 13, padding: "3px 10px", borderRadius: 4, letterSpacing: 1 }}>FW.</span>
              <span style={{ fontSize: 12, color: "#8AAFB8", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>Driver Talent Portfolio</span>
            </div>
            <h1 style={{ margin: "12px 0 4px", fontSize: 32, fontWeight: 700, fontFamily: "Georgia, serif" }}>{d.name}</h1>
            <p style={{ margin: 0, fontSize: 15, color: "#B0CDD4" }}>
              {d.homeBase} · CDL {d.cdlClass} · {d.yearsExp} Years Experience
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
            <Badge variant="clear">MVR: {d.mvr} ✓</Badge>
            <Badge variant="clear">Clearinghouse: {d.clearinghouse} ✓</Badge>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div style={{ display: "flex", gap: 20, marginTop: 20, flexWrap: "wrap" }}>
          {[
            { label: "Route Pref", value: d.routePref },
            { label: "Availability", value: d.availability },
            { label: "Endorsements", value: d.endorsements.join(", ") },
            { label: "Avg Tenure", value: d.avgTenure },
          ].map((s, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 16px", minWidth: 140 }}>
              <div style={{ fontSize: 11, color: "#8AAFB8", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", padding: "0 32px", display: "flex", gap: 0, overflowX: "auto" }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "14px 20px",
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
      <div style={{ padding: "24px 32px", maxWidth: 960, margin: "0 auto" }}>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Job Fit Banner */}
            {d.jobFit && (
              <Card style={{ background: "#004751", color: "#FFFFFF", border: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#CDF95C", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 4 }}>Job Fit Assessment</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "Georgia, serif" }}>{d.jobFit.role}</div>
                    <div style={{ fontSize: 14, color: "#B0CDD4", marginTop: 2 }}>{d.jobFit.employer}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, fontWeight: 800, color: "#CDF95C", lineHeight: 1, fontFamily: "Georgia, serif" }}>{d.jobFit.overallScore}</div>
                    <div style={{ fontSize: 12, color: "#B0CDD4", marginTop: 2 }}>Overall Fit Score</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Experience Table */}
            <Card>
              <SectionTitle icon="📋">Employment History</SectionTitle>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
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
                          {exp.verified && <Badge variant="clear">✓ DOT-Regulated</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Equipment & Training side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <Card>
                <SectionTitle icon="🚛">Equipment Experience</SectionTitle>
                {d.equipment.map((eq, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < d.equipment.length - 1 ? "1px solid #F0F2F4" : "none" }}>
                    <span style={{ fontWeight: 600, color: "#1A2A30", fontSize: 14 }}>{eq.type}</span>
                    <span style={{ color: "#5A7A82", fontSize: 14 }}>{eq.level}</span>
                  </div>
                ))}
              </Card>
              <Card>
                <SectionTitle icon="🎓">Training</SectionTitle>
                {[
                  { label: "CDL School", value: d.training.school },
                  { label: "Location", value: d.training.location },
                  { label: "Graduated", value: d.training.graduated },
                  { label: "Instruction Hours", value: `${d.training.hours} hours` },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 3 ? "1px solid #F0F2F4" : "none" }}>
                    <span style={{ color: "#5A7A82", fontSize: 14 }}>{item.label}</span>
                    <span style={{ fontWeight: 600, color: "#1A2A30", fontSize: 14 }}>{item.value}</span>
                  </div>
                ))}
              </Card>
            </div>

            {/* AI Notes */}
            <Card style={{ background: "#F8FAFB", borderLeft: "4px solid #004751" }}>
              <div style={{ fontSize: 12, color: "#004751", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>AI Recruiter Notes</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#3A5A64" }}>{d.aiNotes}</p>
            </Card>
          </div>
        )}

        {/* JOB FIT TAB */}
        {activeTab === "jobfit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card style={{ background: "#004751", color: "#FFFFFF", border: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#CDF95C", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 6 }}>Matched Position</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "Georgia, serif" }}>{d.jobFit.role}</div>
                  <div style={{ fontSize: 15, color: "#B0CDD4", marginTop: 4 }}>{d.jobFit.employer}</div>
                </div>
                <div style={{ textAlign: "center", background: "rgba(205,249,92,0.12)", borderRadius: 12, padding: "16px 24px" }}>
                  <div style={{ fontSize: 56, fontWeight: 800, color: "#CDF95C", lineHeight: 1, fontFamily: "Georgia, serif" }}>{d.jobFit.overallScore}</div>
                  <div style={{ fontSize: 13, color: "#B0CDD4", marginTop: 4 }}>Overall Fit</div>
                </div>
              </div>
            </Card>

            <Card>
              <SectionTitle icon="📊">Fit Dimensions</SectionTitle>
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

            <Card style={{ background: "#F8FAFB", borderLeft: "4px solid #CDF95C" }}>
              <div style={{ fontSize: 12, color: "#004751", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>Career Agent Recommendation</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#3A5A64" }}>
                James is a strong match for this position. His local/regional preference aligns perfectly with the home-weekly schedule, and his primary dry van experience matches the fleet. His clean compliance record and consistent work history demonstrate the reliability this employer values. We recommend moving to interview.
              </p>
            </Card>
          </div>
        )}

        {/* SKILLS & CHARACTER TAB */}
        {activeTab === "strengths" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card>
              <SectionTitle icon="💪">Skills & Character Assessment</SectionTitle>
              <p style={{ margin: "0 0 20px", fontSize: 14, color: "#5A7A82" }}>
                Based on FreeWorld's scientifically vetted assessment of driver capabilities, work habits, and character traits.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                {d.strengths.map((s, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: "#1A2A30", fontSize: 15 }}>{s.trait}</span>
                    </div>
                    <ScoreBar score={s.score} />
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "#5A7A82" }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle icon="🧭">Culture & Work Preferences</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#5A7A82", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>Work Style</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#1A2A30" }}>{d.cultureFit.workStyle}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#5A7A82", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>Growth Goal</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#1A2A30" }}>{d.cultureFit.growthGoal}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 12, color: "#5A7A82", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>Team Preference</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#1A2A30" }}>{d.cultureFit.teamPref}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 12, color: "#5A7A82", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>Core Values</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {d.cultureFit.values.map((v, i) => <Badge key={i} variant="teal">{v}</Badge>)}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* MVR & COMPLIANCE TAB */}
        {activeTab === "compliance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card>
              <SectionTitle icon="📄">Motor Vehicle Record (MVR)</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
                {[
                  { label: "Moving Violations", value: d.mvrDetails.violations, status: "clear" },
                  { label: "At-Fault Accidents", value: d.mvrDetails.accidents, status: "clear" },
                  { label: "Suspensions", value: d.mvrDetails.suspensions, status: "clear" },
                  { label: "Last MVR Pull", value: d.mvrDetails.lastPull, status: "info" },
                ].map((item, i) => (
                  <div key={i} style={{ background: item.status === "clear" ? "#F0FAF0" : "#F4F4F4", borderRadius: 8, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: item.status === "clear" ? "#004751" : "#1A2A30", fontFamily: "Georgia, serif" }}>
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

            <Card>
              <SectionTitle icon="✅">Compliance Status</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { item: "MVR (Motor Vehicle Record)", status: "Clear", ok: true },
                  { item: "PSP (Pre-Employment Screening)", status: "See Notes — vehicle inspections only, no driver OOS", ok: true },
                  { item: "Criminal Background", status: "Clear", ok: true },
                  { item: "FMCSA Clearinghouse", status: "No Violations", ok: true },
                  { item: "Drug & Alcohol Testing", status: "No Violations", ok: true },
                  { item: "DOT Medical Card", status: "Current", ok: true },
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
                Full DOT application on file and available upon employer request. Application includes complete 10-year employment history, residence history, and all required disclosures. FreeWorld has verified employment history directly with previous carriers.
              </p>
            </Card>
          </div>
        )}

        {/* DRIVER STORY TAB */}
        {activeTab === "story" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Video Embed */}
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ background: "#004751", padding: "24px 24px 8px" }}>
                <div style={{ fontSize: 12, color: "#CDF95C", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 6 }}>Video Introduction</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF", fontFamily: "Georgia, serif" }}>Hear James's Story</div>
              </div>
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                <iframe
                  src="https://www.youtube.com/embed/7TEEFojS7Ds"
                  title="James's Story"
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </Card>

            <Card>
              <SectionTitle icon="📝">About James</SectionTitle>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: "#2A3A40" }}>{d.story}</p>
            </Card>

            <Card style={{ background: "#004751", color: "#FFFFFF", border: "none" }}>
              <div style={{ fontSize: 12, color: "#CDF95C", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 10 }}>In His Own Words</div>
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.8, fontStyle: "italic", fontFamily: "Georgia, serif", color: "#E8EDF0" }}>
                "{d.whyTrucking}"
              </p>
              <p style={{ margin: "12px 0 0", fontSize: 14, color: "#B0CDD4" }}>— {d.name}, CDL-A Driver</p>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: "#004751", padding: "16px 32px", marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ background: "#CDF95C", color: "#191931", fontWeight: 800, fontSize: 12, padding: "2px 8px", borderRadius: 3 }}>FW.</span>
          <span style={{ fontSize: 13, color: "#8AAFB8" }}>FreeWorld Driver Talent Portfolio</span>
        </div>
        <span style={{ fontSize: 12, color: "#5A7A82" }}>Confidential · Generated February 2026</span>
      </div>
    </div>
  );
}
