/**
 * ProgressBar - Section progress indicator
 */
export default function ProgressBar({ current, total, label }) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="fitkit-progress">
      <div className="fitkit-progress-header">
        <span className="fitkit-progress-label">{label}</span>
        <span className="fitkit-progress-count">
          {current} of {total}
        </span>
      </div>
      <div className="fitkit-progress-bar">
        <div
          className="fitkit-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
