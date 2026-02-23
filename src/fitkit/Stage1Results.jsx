/**
 * Stage1Results - RIASEC hexagon, career matches, trucking gate
 */
import RIASECHexagon from './RIASECHexagon';

const RIASEC_INFO = {
  R: { name: 'Realistic', desc: 'Hands-on, practical work with tools and machines' },
  I: { name: 'Investigative', desc: 'Analyzing, researching, and solving problems' },
  A: { name: 'Artistic', desc: 'Creating, expressing, and designing' },
  S: { name: 'Social', desc: 'Helping, teaching, and working with people' },
  E: { name: 'Enterprising', desc: 'Leading, persuading, and managing' },
  C: { name: 'Conventional', desc: 'Organizing data and following procedures' },
};

export default function Stage1Results({ results, onContinue, onExploreAlternatives }) {
  const { riasec, workValues, occupations, truckingGatePassed } = results;
  const topTypes = riasec.code.split('');

  return (
    <div className="fitkit-results">
      <div className="fitkit-results-header">
        <h1 className="fitkit-results-title">Your Career Profile</h1>
        <p className="fitkit-results-subtitle">
          Based on your interests and work values
        </p>
      </div>

      {/* RIASEC Hexagon */}
      <div className="fitkit-hexagon-container">
        <RIASECHexagon scores={riasec.raw} primaryCode={riasec.code} />
      </div>

      {/* RIASEC Code */}
      <div className="fitkit-riasec-code">
        <div className="fitkit-riasec-code-label">Your Interest Profile</div>
        <div className="fitkit-riasec-code-value">{riasec.code}</div>
      </div>

      {/* Type cards */}
      <div className="fitkit-type-cards">
        {topTypes.map((type, index) => {
          const info = RIASEC_INFO[type];
          const rank = index === 0 ? 'primary' : index === 1 ? 'secondary' : 'tertiary';
          return (
            <div key={type} className={`fitkit-type-card ${rank}`}>
              <div className="fitkit-type-badge">{type}</div>
              <div className="fitkit-type-info">
                <div className="fitkit-type-name">{info.name}</div>
                <div className="fitkit-type-desc">{info.desc}</div>
              </div>
              <div className="fitkit-type-score">{riasec.raw[type]}</div>
            </div>
          );
        })}
      </div>

      {/* Work Values */}
      <div className="fitkit-careers-section">
        <h2 className="fitkit-careers-title">What Matters to You</h2>
        <div className="fitkit-values-list">
          {workValues.top3.map((value) => (
            <div key={value.value} className="fitkit-value-item">
              <div className="fitkit-value-rank">{value.rank}</div>
              <div className="fitkit-value-bar-container">
                <div className="fitkit-value-label">{value.name}</div>
                <div className="fitkit-value-bar">
                  <div
                    className="fitkit-value-bar-fill"
                    style={{ width: `${value.normalized}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Career Matches */}
      <div className="fitkit-careers-section">
        <h2 className="fitkit-careers-title">Career Matches</h2>
        <div className="fitkit-careers-list">
          {occupations.topMatches.slice(0, 8).map((career, index) => (
            <div key={career.code} className="fitkit-career-item">
              <div>
                <div className="fitkit-career-title">{career.title}</div>
                <div className="fitkit-career-cluster">{career.cluster}</div>
              </div>
              <div className="fitkit-career-match">#{index + 1}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trucking Gate */}
      <div className="fitkit-gate">
        {truckingGatePassed ? (
          <>
            <div className="fitkit-gate-icon pass">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="fitkit-gate-title">Trucking is a Great Fit!</h2>
            <p className="fitkit-gate-message">
              Your profile aligns well with trucking careers. Heavy and tractor-trailer
              truck driving ranks high in your career matches. Let's learn more about
              your trucking style with a few more questions.
            </p>
            <button className="fitkit-btn fitkit-btn-primary" onClick={onContinue}>
              Continue to Trucking Fit
            </button>
          </>
        ) : (
          <>
            <div className="fitkit-gate-icon fail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="fitkit-gate-title">Other Paths May Fit Better</h2>
            <p className="fitkit-gate-message">
              Based on your profile, you might find more satisfaction in careers like
              logistics coordination, warehouse management, or equipment operation.
              These careers still involve transportation but may better match your
              interests.
            </p>
            <div className="fitkit-nav">
              <button className="fitkit-btn fitkit-btn-secondary" onClick={onExploreAlternatives}>
                Explore Alternatives
              </button>
              <button className="fitkit-btn fitkit-btn-primary" onClick={onContinue}>
                Continue Anyway
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
