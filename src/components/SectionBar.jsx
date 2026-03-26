const SECTION_META = {
  all: { label: "All" },
  word: { label: "Words" },
  collocation: { label: "Collocations" },
  phrase: { label: "Phrases" },
};

export default function SectionBar({ topic, activeSection, onSetSection }) {
  const allCards = [
    ...topic.words,
    ...topic.collocations,
    ...topic.phrases,
  ];

  const sections = [
    { id: "all", count: allCards.length },
    { id: "word", count: topic.words.length },
    { id: "collocation", count: topic.collocations.length },
    { id: "phrase", count: topic.phrases.length },
  ];

  return (
    <div className="section-bar" role="tablist" aria-label="Filter by section">
      {sections.map((s) => {
        const isEmpty = s.id !== "all" && s.count === 0;
        return (
          <button
            key={s.id}
            className={
              "section-btn" +
              (s.id === activeSection ? " section-btn--active" : "") +
              (isEmpty ? " section-btn--disabled" : "")
            }
            data-section={s.id}
            type="button"
            disabled={isEmpty}
            onClick={() => onSetSection(s.id)}
          >
            {SECTION_META[s.id].label} ({s.count})
          </button>
        );
      })}
    </div>
  );
}
