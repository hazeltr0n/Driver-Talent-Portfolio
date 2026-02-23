/**
 * Stage2Results - Trucking fit score, retention risk, vertical match
 */

const VERTICAL_DESCRIPTIONS = {
  'Over-the-Road (OTR)': 'Long-haul routes across the country, weeks away from home',
  Regional: 'Multi-state routes with weekly home time',
  Local: 'Daily routes returning home each night',
  Dedicated: 'Same route or customer, predictable schedule',
  'Tanker/Hazmat': 'Specialized cargo requiring extra certifications',
};

export default function Stage2Results({ results, onComplete }) {
  const {
    truckingFitScore,
    retentionRisk,
    verticalFit,
    coachingNotes,
    aiCoachingNotes,
  } = results;

  // Calculate circle stroke
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (truckingFitScore / 100) * circumference;

  // Color based on score
  let scoreColor = '#22c55e'; // green
  if (truckingFitScore < 45) scoreColor = '#ef4444'; // red
  else if (truckingFitScore < 60) scoreColor = '#eab308'; // yellow

  return (
    <div className="fitkit-results">
      <div className="fitkit-results-header">
        <h1 className="fitkit-results-title">Your Trucking Fit</h1>
        <p className="fitkit-results-subtitle">
          How well you match trucking career demands
        </p>
      </div>

      {/* Fit Score Gauge */}
      <div className="fitkit-score-gauge">
        <div className="fitkit-score-circle">
          <svg viewBox="0 0 180 180">
            <circle
              className="fitkit-score-bg"
              cx="90"
              cy="90"
              r={radius}
            />
            <circle
              className="fitkit-score-fill"
              cx="90"
              cy="90"
              r={radius}
              stroke={scoreColor}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="fitkit-score-value">
            <div className="fitkit-score-number" style={{ color: scoreColor }}>
              {truckingFitScore}
            </div>
            <div className="fitkit-score-label">Fit Score</div>
          </div>
        </div>
      </div>

      {/* Retention Risk */}
      <div className="fitkit-retention">
        <div className={`fitkit-retention-badge ${retentionRisk.level}`}>
          <span>Retention Risk:</span>
          <strong>{retentionRisk.label}</strong>
        </div>
        <p className="fitkit-retention-message">{retentionRisk.message}</p>
      </div>

      {/* Best Fit Verticals */}
      <div className="fitkit-verticals">
        <h2 className="fitkit-verticals-title">Best Fit Trucking Roles</h2>
        {verticalFit.verticals.slice(0, 4).map((vertical, index) => (
          <div
            key={vertical.id}
            className={`fitkit-vertical-item ${index === 0 ? 'best' : ''}`}
          >
            <div className="fitkit-vertical-rank">{index + 1}</div>
            <div className="fitkit-vertical-info">
              <div className="fitkit-vertical-name">{vertical.name}</div>
              <div className="fitkit-vertical-desc">
                {VERTICAL_DESCRIPTIONS[vertical.name] || ''}
              </div>
            </div>
            <div className="fitkit-vertical-score">{vertical.score}</div>
          </div>
        ))}
      </div>

      {/* Coaching Notes */}
      {coachingNotes && coachingNotes.length > 0 && (
        <div className="fitkit-coaching">
          <h2 className="fitkit-coaching-title">Insights</h2>
          {coachingNotes.map((note, index) => (
            <div key={index} className={`fitkit-coaching-note ${note.type}`}>
              <div className="fitkit-coaching-note-title">{note.title}</div>
              <div className="fitkit-coaching-note-text">{note.text}</div>
            </div>
          ))}
        </div>
      )}

      {/* AI Coaching Notes */}
      {aiCoachingNotes && (
        <div className="fitkit-ai-coaching">
          <div className="fitkit-ai-coaching-header">
            <span className="fitkit-ai-coaching-badge">AI Coach</span>
            <span className="fitkit-ai-coaching-title">Personalized Guidance</span>
          </div>
          <div className="fitkit-ai-coaching-content">{aiCoachingNotes}</div>
        </div>
      )}

      {/* Complete Button */}
      <div className="fitkit-nav">
        <button className="fitkit-btn fitkit-btn-primary" onClick={onComplete}>
          Complete Assessment
        </button>
      </div>
    </div>
  );
}
