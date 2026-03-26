import { TOPICS } from "../data";
import { useStorage } from "../hooks/useStorage";
import TopicCard from "./TopicCard";

function getAllCards(topic) {
  return [
    ...topic.words,
    ...topic.collocations,
    ...topic.phrases,
  ];
}

export default function HomeScreen({ onOpenTopic }) {
  const storage = useStorage();

  return (
    <main className="home">
      <header className="home__header">
        <p className="home__eyebrow">TCF Vocabulary Practice</p>
        <h1 className="home__title">Mes fiches de vocabulaire</h1>
        <p className="home__subtitle">Choose a topic to begin studying</p>
      </header>
      <p className="home__toc-label">Table des mati&egrave;res</p>
      <div className="topic-grid" role="list" aria-label="Available topics">
        {TOPICS.map((topic, i) => {
          const cards = getAllCards(topic);
          const stats = cards.length
            ? storage.getTopicStats(topic.id, cards)
            : null;
          const pct = storage.getMasteryPct(topic.id, cards);

          return (
            <TopicCard
              key={topic.id}
              topic={topic}
              index={i}
              stats={stats}
              masteryPct={pct}
              onOpen={onOpenTopic}
            />
          );
        })}
      </div>
    </main>
  );
}
