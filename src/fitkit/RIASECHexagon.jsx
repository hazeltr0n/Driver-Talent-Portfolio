/**
 * RIASECHexagon - SVG radar chart for RIASEC visualization
 */

const RIASEC_ORDER = ['R', 'I', 'A', 'S', 'E', 'C'];
const RIASEC_LABELS = {
  R: 'Realistic',
  I: 'Investigative',
  A: 'Artistic',
  S: 'Social',
  E: 'Enterprising',
  C: 'Conventional',
};

export default function RIASECHexagon({ scores, primaryCode }) {
  const cx = 140;
  const cy = 140;
  const maxRadius = 100;
  const labelRadius = 120;

  // Normalize scores to 0-1 range (raw scores are 5-25)
  const normalizedScores = {};
  for (const type of RIASEC_ORDER) {
    const raw = scores[type] || 15;
    normalizedScores[type] = Math.max(0, Math.min(1, (raw - 5) / 20));
  }

  // Calculate points for hexagon
  const getPoint = (index, radius) => {
    const angle = (Math.PI / 3) * index - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // Background hexagon rings
  const rings = [0.25, 0.5, 0.75, 1];
  const ringPaths = rings.map((scale) => {
    const points = RIASEC_ORDER.map((_, i) => getPoint(i, maxRadius * scale));
    return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
  });

  // Data polygon
  const dataPoints = RIASEC_ORDER.map((type, i) => {
    const radius = Math.max(10, normalizedScores[type] * maxRadius);
    return getPoint(i, radius);
  });
  const dataPath = dataPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';

  // Axis lines
  const axisLines = RIASEC_ORDER.map((_, i) => {
    const point = getPoint(i, maxRadius);
    return { x1: cx, y1: cy, x2: point.x, y2: point.y };
  });

  // Labels
  const labels = RIASEC_ORDER.map((type, i) => {
    const point = getPoint(i, labelRadius);
    const isPrimary = primaryCode?.includes(type);
    return { type, ...point, isPrimary, label: RIASEC_LABELS[type] };
  });

  return (
    <svg className="fitkit-hexagon" viewBox="0 0 280 280">
      {/* Background rings */}
      {ringPaths.map((path, i) => (
        <path
          key={i}
          d={path}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {axisLines.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
      ))}

      {/* Data polygon */}
      <path
        d={dataPath}
        fill="rgba(205, 249, 92, 0.3)"
        stroke="#CDF95C"
        strokeWidth="2"
      />

      {/* Data points */}
      {dataPoints.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="5"
          fill="#CDF95C"
        />
      ))}

      {/* Labels */}
      {labels.map((label) => (
        <text
          key={label.type}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={label.isPrimary ? '#CDF95C' : 'rgba(255, 255, 255, 0.7)'}
          fontSize={label.isPrimary ? '12' : '10'}
          fontWeight={label.isPrimary ? '600' : '400'}
        >
          {label.type}
        </text>
      ))}
    </svg>
  );
}
