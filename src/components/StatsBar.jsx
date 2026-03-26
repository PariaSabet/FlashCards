export default function StatsBar({ currentIdx, total, knownCount, dueCount, streak }) {
  return (
    <div className="stats-bar" aria-live="polite">
      <div className="stat-pill">
        Card <span className="stat-pill__value">{currentIdx + 1}</span> of{" "}
        <span className="stat-pill__value">{total}</span>
      </div>
      <div className="stat-pill">
        &#x2713; Known: <span className="stat-pill__value">{knownCount}</span>
      </div>
      <div className="stat-pill stat-pill--due">
        Due: <span className="stat-pill__value">{dueCount}</span>
      </div>
      <div className="streak" aria-label="Current streak">
        {"\u{1F525}"} Streak: <span>{streak}</span>
      </div>
    </div>
  );
}
