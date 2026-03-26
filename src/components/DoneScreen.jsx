import { BOX_LABELS } from "../hooks/useStorage";

export default function DoneScreen({
  visible,
  knownCount,
  againCount,
  boxes,
  onGoHome,
  onRestart,
  onReset,
}) {
  if (!visible) return null;

  return (
    <div className="done done--visible" aria-live="polite">
      <h2 className="done__title">Bien jou&eacute; ! {"\u{1F33F}"}</h2>
      <p className="done__subtitle">
        You&apos;ve been through all the cards in this set.
      </p>
      <div className="done__scores">
        <div className="score-item score-item--known">
          <span className="score-item__value">{knownCount}</span>
          <span className="score-item__label">Known</span>
        </div>
        <div className="score-item score-item--review">
          <span className="score-item__value">{againCount}</span>
          <span className="score-item__label">Review again</span>
        </div>
      </div>
      <div className="done__mastery" aria-label="Mastery distribution">
        {boxes.map((count, i) => (
          <span className="mastery-item" data-box={i} key={i}>
            <span className="mastery-item__dot" />
            <span className="mastery-item__label">{BOX_LABELS[i]}</span>
            <span className="mastery-item__count">{count}</span>
          </span>
        ))}
      </div>
      <div className="done__actions">
        <button className="btn-home" type="button" onClick={onGoHome}>
          &larr; All topics
        </button>
        <button className="btn-restart" type="button" onClick={onRestart}>
          Start again
        </button>
        <button className="btn-reset" type="button" onClick={onReset}>
          Reset progress
        </button>
      </div>
    </div>
  );
}
