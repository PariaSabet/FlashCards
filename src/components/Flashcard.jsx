import { BOX_LABELS } from "../hooks/useStorage";
import { useSwipe } from "../hooks/useSwipe";

export default function Flashcard({
  card,
  box,
  isFlipped,
  onFlip,
  onPrev,
  onNext,
  onSpeakWord,
  onSpeakSentence,
  nextCard,
}) {
  const {
    cardRef,
    peekRef,
    swipeProgress,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onClick,
  } = useSwipe({
    onSwipeLeft: onNext,
    onSwipeRight: onPrev,
    onTap: onFlip,
  });

  const absProgress = Math.abs(swipeProgress);
  const indicatorOpacity = Math.min(absProgress * 1.8, 1);

  return (
    <div
      className="card-stack"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {nextCard && (
        <div className="card-peek" ref={peekRef} aria-hidden="true">
          <div className="card-face card-front">
            <span className="card-front__article">
              {nextCard.section === "word" ? nextCard.article : ""}
            </span>
            <span className="card-front__word">{nextCard.word}</span>
          </div>
        </div>
      )}

      <div
        className="card-scene"
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-label={
          isFlipped ? "Card back — click to flip" : "Card front — click to flip"
        }
        onClick={onClick}
        onMouseDown={onMouseDown}
      >
        {/* Swipe direction indicators */}
        {absProgress > 0.05 && (
          <>
            <div
              className="swipe-indicator swipe-indicator--prev"
              style={{ opacity: swipeProgress > 0 ? indicatorOpacity : 0 }}
              aria-hidden="true"
            >
              <span className="swipe-indicator__icon">{"\u2190"}</span>
              <span className="swipe-indicator__text">Prev</span>
            </div>
            <div
              className="swipe-indicator swipe-indicator--next"
              style={{ opacity: swipeProgress < 0 ? indicatorOpacity : 0 }}
              aria-hidden="true"
            >
              <span className="swipe-indicator__text">Next</span>
              <span className="swipe-indicator__icon">{"\u2192"}</span>
            </div>
          </>
        )}

        <div
          className={
            "card-inner" + (isFlipped ? " card-inner--flipped" : "")
          }
        >
          <div className="card-face card-front">
            <span className="card-front__category">{card.cat}</span>
            <span className="card-front__box-badge" data-box={box}>
              {BOX_LABELS[box]}
            </span>
            <span className="card-front__article">
              {card.section === "word" ? card.article : ""}
            </span>
            <span className="card-front__word">{card.word}</span>
            <button
              className="btn-speak btn-speak--front"
              type="button"
              aria-label="Listen to pronunciation"
              onClick={onSpeakWord}
            >
              {"\u{1F50A}"}
            </button>
            <span className="card-front__hint" aria-hidden="true">
              tap to reveal · swipe to navigate
            </span>
          </div>
          <div className="card-face card-back">
            <span className="card-back__meaning">{card.meaning}</span>
            <span className="card-back__note">{card.note || ""}</span>
            <div className="card-back__divider" aria-hidden="true" />
            <span className="card-back__example-label">Example</span>
            <span className="card-back__example-fr">{card.fr}</span>
            <button
              className="btn-speak btn-speak--back"
              type="button"
              aria-label="Listen to example sentence"
              onClick={onSpeakSentence}
            >
              {"\u{1F50A}"}
            </button>
            <span className="card-back__example-en">{card.en}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
