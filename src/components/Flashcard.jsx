import { BOX_LABELS } from "../hooks/useStorage";

export default function Flashcard({
  card,
  box,
  isFlipped,
  onFlip,
  onSpeakWord,
  onSpeakSentence,
}) {
  return (
    <div
      className="card-scene"
      role="button"
      tabIndex={0}
      aria-label={isFlipped ? "Card back — click to flip" : "Card front — click to flip"}
      onClick={onFlip}
    >
      <div className={"card-inner" + (isFlipped ? " card-inner--flipped" : "")}>
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
            click to reveal &#x21BA;
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
  );
}
