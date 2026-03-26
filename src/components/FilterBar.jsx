import { isWordDue } from "../hooks/useStorage";

export default function FilterBar({ cards, activeFilter, topicData, onSetFilter }) {
  const dueCount = cards.filter((c) =>
    isWordDue(topicData[c.word] || null)
  ).length;

  const catSet = new Set(cards.map((c) => c.cat));
  const cats = ["all", "due", ...catSet];

  return (
    <div className="filter-bar" role="toolbar" aria-label="Filter by category">
      {cats.map((cat) => {
        let label;
        let extraClass = "";
        if (cat === "all") {
          label = `All (${cards.length})`;
        } else if (cat === "due") {
          label = `Due (${dueCount})`;
          extraClass = " filter-btn--due";
        } else {
          const count = cards.filter((c) => c.cat === cat).length;
          label = `${cat} (${count})`;
        }

        return (
          <button
            key={cat}
            className={
              "filter-btn" +
              extraClass +
              (cat === activeFilter ? " filter-btn--active" : "")
            }
            data-cat={cat}
            type="button"
            onClick={() => onSetFilter(cat)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
