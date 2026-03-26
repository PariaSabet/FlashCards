export default function FeedbackButtons({ enabled, onKnow, onAgain }) {
  return (
    <div
      className={"feedback" + (enabled ? " feedback--enabled" : "")}
      role="toolbar"
      aria-label="Rate your knowledge"
    >
      <button className="btn btn-know" type="button" onClick={onKnow}>
        &#x2713; I know this
      </button>
      <button className="btn btn-again" type="button" onClick={onAgain}>
        &#x21A9; Study again
      </button>
    </div>
  );
}
