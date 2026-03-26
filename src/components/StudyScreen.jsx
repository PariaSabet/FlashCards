import { useReducer, useCallback, useEffect } from "react";
import { useStorage, isWordDue } from "../hooks/useStorage";
import { useAudio } from "../hooks/useAudio";
import StatsBar from "./StatsBar";
import ProgressBar from "./ProgressBar";
import SectionBar from "./SectionBar";
import FilterBar from "./FilterBar";
import Flashcard from "./Flashcard";
import Controls from "./Controls";
import FeedbackButtons from "./FeedbackButtons";
import DoneScreen from "./DoneScreen";
import KeyboardHint from "./KeyboardHint";

function getAllCards(topic) {
  return [
    ...topic.words.map((c) => ({ ...c, section: "word" })),
    ...topic.collocations.map((c) => ({ ...c, section: "collocation" })),
    ...topic.phrases.map((c) => ({ ...c, section: "phrase" })),
  ];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sortByPriority(cards, topicData) {
  return [...cards].sort((a, b) => {
    const da = topicData[a.word] || { box: 0, ts: 0 };
    const db = topicData[b.word] || { box: 0, ts: 0 };
    if (da.box !== db.box) return da.box - db.box;
    return da.ts - db.ts;
  });
}

function buildDeck(fullDeck, filter, shuffleMode, topicData) {
  let deck;
  if (filter === "due") {
    deck = fullDeck.filter((c) => isWordDue(topicData[c.word] || null));
    if (shuffleMode) {
      deck = shuffle(deck);
    } else {
      deck = sortByPriority(deck, topicData);
    }
  } else if (filter === "all") {
    deck = shuffleMode ? shuffle(fullDeck) : [...fullDeck];
  } else {
    deck = fullDeck.filter((c) => c.cat === filter);
    if (shuffleMode) deck = shuffle(deck);
  }
  return deck;
}

const initialState = {
  topic: null,
  allTopicCards: [],
  fullDeck: [],
  deck: [],
  currentIdx: 0,
  isFlipped: false,
  shuffleMode: false,
  knownSet: new Set(),
  againSet: new Set(),
  streak: 0,
  activeSection: "all",
  activeFilter: "all",
  showDone: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "OPEN_TOPIC": {
      const topic = action.topic;
      const all = getAllCards(topic);
      return {
        ...initialState,
        topic,
        allTopicCards: all,
        fullDeck: [...all],
        deck: [...all],
      };
    }

    case "SET_SECTION": {
      const section = action.section;
      const filtered =
        section === "all"
          ? [...state.allTopicCards]
          : state.allTopicCards.filter((c) => c.section === section);
      const deck = buildDeck(filtered, "all", state.shuffleMode, action.topicData);
      return {
        ...state,
        activeSection: section,
        activeFilter: "all",
        fullDeck: filtered,
        deck,
        currentIdx: 0,
        isFlipped: false,
        knownSet: new Set(),
        againSet: new Set(),
        streak: 0,
        showDone: false,
      };
    }

    case "SET_FILTER": {
      const filter = action.filter;
      const deck = buildDeck(state.fullDeck, filter, state.shuffleMode, action.topicData);
      return {
        ...state,
        activeFilter: filter,
        deck,
        currentIdx: 0,
        isFlipped: false,
        knownSet: new Set(),
        againSet: new Set(),
        streak: 0,
        showDone: false,
      };
    }

    case "FLIP":
      if (state.showDone || state.currentIdx >= state.deck.length) return state;
      return { ...state, isFlipped: !state.isFlipped };

    case "NEXT": {
      if (state.currentIdx < state.deck.length - 1) {
        return {
          ...state,
          currentIdx: state.currentIdx + 1,
          isFlipped: false,
        };
      }
      return { ...state, showDone: true, isFlipped: false };
    }

    case "PREV":
      if (state.currentIdx > 0) {
        return {
          ...state,
          currentIdx: state.currentIdx - 1,
          isFlipped: false,
        };
      }
      return state;

    case "MARK_KNOWN": {
      if (!state.isFlipped) return state;
      const known = new Set(state.knownSet);
      const again = new Set(state.againSet);
      known.add(state.currentIdx);
      again.delete(state.currentIdx);
      const nextIdx = state.currentIdx + 1;
      const done = nextIdx >= state.deck.length;
      return {
        ...state,
        knownSet: known,
        againSet: again,
        streak: state.streak + 1,
        currentIdx: done ? state.currentIdx : nextIdx,
        isFlipped: false,
        showDone: done,
      };
    }

    case "MARK_AGAIN": {
      if (!state.isFlipped) return state;
      const known = new Set(state.knownSet);
      const again = new Set(state.againSet);
      again.add(state.currentIdx);
      known.delete(state.currentIdx);
      const nextIdx = state.currentIdx + 1;
      const done = nextIdx >= state.deck.length;
      return {
        ...state,
        knownSet: known,
        againSet: again,
        streak: 0,
        currentIdx: done ? state.currentIdx : nextIdx,
        isFlipped: false,
        showDone: done,
      };
    }

    case "TOGGLE_SHUFFLE": {
      const newShuffle = !state.shuffleMode;
      const deck = buildDeck(state.fullDeck, state.activeFilter, newShuffle, action.topicData);
      return {
        ...state,
        shuffleMode: newShuffle,
        deck,
        currentIdx: 0,
        isFlipped: false,
        knownSet: new Set(),
        againSet: new Set(),
        streak: 0,
        showDone: false,
      };
    }

    case "RESTART": {
      const deck = buildDeck(state.fullDeck, state.activeFilter, state.shuffleMode, action.topicData);
      return {
        ...state,
        deck,
        currentIdx: 0,
        isFlipped: false,
        knownSet: new Set(),
        againSet: new Set(),
        streak: 0,
        showDone: false,
      };
    }

    case "RESET_PROGRESS": {
      const deck = buildDeck(state.fullDeck, state.activeFilter, state.shuffleMode, {});
      return {
        ...state,
        deck,
        currentIdx: 0,
        isFlipped: false,
        knownSet: new Set(),
        againSet: new Set(),
        streak: 0,
        showDone: false,
      };
    }

    default:
      return state;
  }
}

export default function StudyScreen({ topic, onGoHome }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const storage = useStorage();
  const playAudio = useAudio();

  useEffect(() => {
    if (topic) {
      dispatch({ type: "OPEN_TOPIC", topic });
    }
  }, [topic]);

  const topicData = state.topic ? storage.getTopicData(state.topic.id) : {};
  const dueStats = state.topic
    ? storage.getTopicStats(state.topic.id, state.allTopicCards)
    : { due: 0 };
  const masteryBoxes = state.topic
    ? storage.getTopicStats(state.topic.id, state.allTopicCards).boxes
    : [0, 0, 0, 0, 0];

  const currentCard = state.deck[state.currentIdx] || null;
  const nextCard = state.deck[state.currentIdx + 1] || null;
  const wordInfo = currentCard
    ? storage.getWordInfo(state.topic.id, currentCard.word)
    : null;
  const currentBox = wordInfo ? wordInfo.box : 0;

  const handleFlip = useCallback(() => {
    dispatch({ type: "FLIP" });
  }, []);

  const handlePrev = useCallback(() => {
    dispatch({ type: "PREV" });
  }, []);

  const handleNext = useCallback(() => {
    dispatch({ type: "NEXT" });
  }, []);

  const handleKnow = useCallback(() => {
    if (state.isFlipped && state.topic) {
      storage.promoteWord(state.topic.id, state.deck[state.currentIdx].word);
    }
    dispatch({ type: "MARK_KNOWN" });
  }, [state.isFlipped, state.topic, state.deck, state.currentIdx, storage]);

  const handleAgain = useCallback(() => {
    if (state.isFlipped && state.topic) {
      storage.demoteWord(state.topic.id, state.deck[state.currentIdx].word);
    }
    dispatch({ type: "MARK_AGAIN" });
  }, [state.isFlipped, state.topic, state.deck, state.currentIdx, storage]);

  const handleSetSection = useCallback(
    (section) => {
      dispatch({ type: "SET_SECTION", section, topicData });
    },
    [topicData]
  );

  const handleSetFilter = useCallback(
    (filter) => {
      dispatch({ type: "SET_FILTER", filter, topicData });
    },
    [topicData]
  );

  const handleShuffle = useCallback(() => {
    dispatch({ type: "TOGGLE_SHUFFLE", topicData });
  }, [topicData]);

  const handleRestart = useCallback(() => {
    dispatch({ type: "RESTART", topicData });
  }, [topicData]);

  const handleReset = useCallback(() => {
    if (state.topic) {
      storage.resetTopic(state.topic.id);
    }
    dispatch({ type: "RESET_PROGRESS" });
  }, [state.topic, storage]);

  const handleSpeakWord = useCallback(
    (e) => {
      e.stopPropagation();
      if (currentCard && state.topic) {
        const spokenWord =
          currentCard.section === "word"
            ? currentCard.article + " " + currentCard.word
            : currentCard.word;
        playAudio(state.topic.id, currentCard.word, "word", spokenWord);
      }
    },
    [currentCard, state.topic, playAudio]
  );

  const handleSpeakSentence = useCallback(
    (e) => {
      e.stopPropagation();
      if (currentCard && state.topic) {
        playAudio(state.topic.id, currentCard.word, "sentence", currentCard.fr);
      }
    },
    [currentCard, state.topic, playAudio]
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          dispatch({ type: "FLIP" });
          break;
        case "ArrowRight":
          dispatch({ type: "NEXT" });
          break;
        case "ArrowLeft":
          dispatch({ type: "PREV" });
          break;
        case "k":
        case "K":
          handleKnow();
          break;
        case "r":
        case "R":
          handleAgain();
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKnow, handleAgain]);

  if (!state.topic) return null;

  return (
    <section className="study study--active" aria-label="Study session">
      <nav className="study__topbar">
        <button
          className="btn-back"
          type="button"
          aria-label="Back to topics"
          onClick={onGoHome}
        >
          &larr; Topics
        </button>
        <div>
          <h2 className="study__heading">{state.topic.fr}</h2>
          <p className="study__subheading">{state.topic.en}</p>
        </div>
      </nav>

      <StatsBar
        currentIdx={state.currentIdx}
        total={state.deck.length}
        knownCount={state.knownSet.size}
        dueCount={dueStats.due}
        streak={state.streak}
      />

      <ProgressBar currentIdx={state.currentIdx} total={state.deck.length} />

      <SectionBar
        topic={state.topic}
        activeSection={state.activeSection}
        onSetSection={handleSetSection}
      />

      <FilterBar
        cards={state.fullDeck}
        activeFilter={state.activeFilter}
        topicData={topicData}
        onSetFilter={handleSetFilter}
      />

      {state.showDone ? (
        <DoneScreen
          visible
          knownCount={state.knownSet.size}
          againCount={state.againSet.size}
          boxes={masteryBoxes}
          onGoHome={onGoHome}
          onRestart={handleRestart}
          onReset={handleReset}
        />
      ) : currentCard ? (
        <>
          <Flashcard
            key={state.currentIdx}
            card={currentCard}
            box={currentBox}
            isFlipped={state.isFlipped}
            onFlip={handleFlip}
            onPrev={handlePrev}
            onNext={handleNext}
            onSpeakWord={handleSpeakWord}
            onSpeakSentence={handleSpeakSentence}
            nextCard={nextCard}
          />

          <Controls
            canPrev={state.currentIdx > 0}
            canNext={state.currentIdx < state.deck.length - 1}
            shuffleMode={state.shuffleMode}
            onPrev={handlePrev}
            onNext={handleNext}
            onFlip={handleFlip}
            onShuffle={handleShuffle}
          />

          <FeedbackButtons
            enabled={state.isFlipped}
            onKnow={handleKnow}
            onAgain={handleAgain}
          />
        </>
      ) : null}

      <KeyboardHint />
    </section>
  );
}
