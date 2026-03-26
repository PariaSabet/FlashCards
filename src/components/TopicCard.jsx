export default function TopicCard({ topic, index, stats, masteryPct, onOpen }) {
  const cards = [
    ...topic.words,
    ...topic.collocations,
    ...topic.phrases,
  ];
  const total = cards.length;

  let statusText = "coming soon";
  let statusClass = "topic-card__status--soon";
  if (topic.available) {
    statusClass = "topic-card__status--available";
    if (!stats || stats.due === total) {
      statusText = "Start \u2192";
    } else if (stats.due > 0) {
      statusText = stats.due + " due";
    } else {
      statusText = "All caught up";
    }
  }

  const className =
    "topic-card" + (topic.available ? "" : " topic-card--locked");

  function handleClick() {
    if (topic.available) onOpen(topic);
  }

  function handleKeyDown(e) {
    if (topic.available && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onOpen(topic);
    }
  }

  return (
    <article
      className={className}
      role="button"
      tabIndex={topic.available ? 0 : -1}
      aria-label={`${topic.fr} — ${topic.en}${topic.available ? "" : " (coming soon)"}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {!topic.available && (
        <span className="topic-card__lock" aria-hidden="true">
          {"\u{1F512}"}
        </span>
      )}
      <div className="topic-card__number" aria-hidden="true">
        0{index + 1}
      </div>
      <span className="topic-card__icon" aria-hidden="true">
        {topic.icon}
      </span>
      <div className="topic-card__title-fr">{topic.fr}</div>
      <div className="topic-card__title-en">{topic.en}</div>
      <div className="topic-card__meta">
        <span className="topic-card__count">{total} cards</span>
        <span className={statusClass}>{statusText}</span>
      </div>
      {topic.available && total > 0 && (
        <div className="topic-card__progress">
          <div
            className="topic-card__progress-fill"
            style={{ width: `${masteryPct}%` }}
          />
        </div>
      )}
    </article>
  );
}
