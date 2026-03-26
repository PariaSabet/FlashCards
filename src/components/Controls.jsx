export default function Controls({
  canPrev,
  canNext,
  shuffleMode,
  onPrev,
  onNext,
  onFlip,
  onShuffle,
}) {
  return (
    <div className="controls" role="toolbar" aria-label="Card navigation">
      <button
        className="btn btn-nav"
        type="button"
        aria-label="Previous card"
        disabled={!canPrev}
        onClick={onPrev}
      >
        &larr;
      </button>
      <button className="btn btn-flip" type="button" onClick={onFlip}>
        Flip card
      </button>
      <button
        className="btn btn-nav"
        type="button"
        aria-label="Next card"
        disabled={!canNext}
        onClick={onNext}
      >
        &rarr;
      </button>
      <button
        className={"btn btn-shuffle" + (shuffleMode ? " btn-shuffle--active" : "")}
        type="button"
        title="Shuffle"
        aria-label="Toggle shuffle"
        onClick={onShuffle}
      >
        {"\u{1F500}"}
      </button>
    </div>
  );
}
