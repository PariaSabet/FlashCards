export default function ProgressBar({ currentIdx, total }) {
  const pct = total > 0 ? Math.round((currentIdx / total) * 100) : 0;

  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="progress-track__fill"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
