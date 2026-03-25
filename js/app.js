/* ================================================================
   TCF French Flashcards — Application Logic
   Leitner-box spaced repetition system
   ================================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "tcf-flashcards";

  const BOX_INTERVALS = [
    0,
    4 * 3600000,
    24 * 3600000,
    3 * 24 * 3600000,
    7 * 24 * 3600000,
  ];

  const BOX_LABELS = ["New", "Learning", "Familiar", "Confident", "Mastered"];
  const MAX_BOX = BOX_INTERVALS.length - 1;

  /* --- Persistence (Leitner SRS) --- */

  const Storage = {
    _read() {
      try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        return this._migrate(raw);
      } catch {
        return {};
      }
    },

    _write(data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    _migrate(data) {
      let changed = false;
      for (const topicId in data) {
        const entry = data[topicId];
        if (Array.isArray(entry.known) || Array.isArray(entry.review)) {
          const words = {};
          const now = Date.now();
          if (entry.known) {
            entry.known.forEach((w) => {
              words[w] = { box: 3, ts: now };
            });
          }
          if (entry.review) {
            entry.review.forEach((w) => {
              words[w] = { box: 0, ts: now };
            });
          }
          data[topicId] = words;
          changed = true;
        }
      }
      if (changed) this._write(data);
      return data;
    },

    getTopicData(topicId) {
      const data = this._read();
      return data[topicId] || {};
    },

    getWordInfo(topicId, word) {
      const topic = this.getTopicData(topicId);
      return topic[word] || null;
    },

    promoteWord(topicId, word) {
      const data = this._read();
      if (!data[topicId]) data[topicId] = {};
      const current = data[topicId][word] || { box: 0, ts: 0 };
      data[topicId][word] = {
        box: Math.min(current.box + 1, MAX_BOX),
        ts: Date.now(),
      };
      this._write(data);
    },

    demoteWord(topicId, word) {
      const data = this._read();
      if (!data[topicId]) data[topicId] = {};
      data[topicId][word] = { box: 0, ts: Date.now() };
      this._write(data);
    },

    isWordDue(wordInfo) {
      if (!wordInfo) return true;
      const elapsed = Date.now() - wordInfo.ts;
      return elapsed >= BOX_INTERVALS[wordInfo.box];
    },

    getTopicStats(topicId, cards) {
      const topicData = this.getTopicData(topicId);
      const boxes = [0, 0, 0, 0, 0];
      let due = 0;

      cards.forEach((c) => {
        const info = topicData[c.word] || null;
        const box = info ? info.box : 0;
        boxes[box]++;
        if (this.isWordDue(info)) due++;
      });

      return { boxes, due, total: cards.length };
    },

    getMasteryPct(topicId, cards) {
      const topicData = this.getTopicData(topicId);
      if (!cards.length) return 0;
      let mastered = 0;
      cards.forEach((c) => {
        const info = topicData[c.word];
        if (info && info.box >= 3) mastered++;
      });
      return Math.round((mastered / cards.length) * 100);
    },

    resetTopic(topicId) {
      const data = this._read();
      delete data[topicId];
      this._write(data);
    },
  };

  /* --- Text-to-Speech --- */

  let frenchVoice = null;
  let currentAudio = null;

  function loadFrenchVoice() {
    const voices = speechSynthesis.getVoices();
    frenchVoice =
      voices.find((v) => v.lang.startsWith("fr") && v.localService) ||
      voices.find((v) => v.lang.startsWith("fr")) ||
      null;
  }

  loadFrenchVoice();
  speechSynthesis.addEventListener("voiceschanged", loadFrenchVoice);

  function slugify(text) {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function speakFallback(text) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 0.85;
    if (frenchVoice) utterance.voice = frenchVoice;
    speechSynthesis.speak(utterance);
  }

  function playAudio(topicId, word, suffix, fallbackText) {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    speechSynthesis.cancel();

    const file = `audio/${topicId}/${slugify(word)}-${suffix}.mp3`;
    const audio = new Audio(file);
    currentAudio = audio;

    audio.play().catch(() => {
      speakFallback(fallbackText);
    });
  }

  /* --- DOM Cache --- */

  const dom = {
    homeScreen: document.getElementById("home-screen"),
    studyScreen: document.getElementById("study-screen"),
    tocGrid: document.getElementById("toc-grid"),
    studyTitle: document.getElementById("study-title"),
    studySubtitle: document.getElementById("study-subtitle"),
    sectionBar: document.getElementById("section-bar"),
    filterBar: document.getElementById("filter-bar"),
    cardScene: document.getElementById("card-scene"),
    cardInner: document.getElementById("card-inner"),
    cardCat: document.getElementById("card-cat"),
    cardArticle: document.getElementById("card-article"),
    cardWord: document.getElementById("card-word"),
    cardMeaning: document.getElementById("card-meaning"),
    cardNote: document.getElementById("card-note"),
    cardFr: document.getElementById("card-fr"),
    cardEn: document.getElementById("card-en"),
    cardBoxBadge: document.getElementById("card-box-badge"),
    statCurrent: document.getElementById("stat-current"),
    statTotal: document.getElementById("stat-total"),
    statKnown: document.getElementById("stat-known"),
    statStreak: document.getElementById("stat-streak"),
    statDue: document.getElementById("stat-due"),
    progressFill: document.getElementById("progress-fill"),
    btnPrev: document.getElementById("btn-prev"),
    btnNext: document.getElementById("btn-next"),
    btnFlip: document.getElementById("btn-flip"),
    btnShuffle: document.getElementById("btn-shuffle"),
    btnKnow: document.getElementById("btn-know"),
    btnAgain: document.getElementById("btn-again"),
    feedbackBtns: document.getElementById("feedback-btns"),
    doneScreen: document.getElementById("done-screen"),
    finalKnown: document.getElementById("final-known"),
    finalReview: document.getElementById("final-review"),
    doneMastery: document.getElementById("done-mastery"),
    btnRestart: document.getElementById("btn-restart"),
    btnReset: document.getElementById("btn-reset"),
    btnBack: document.getElementById("btn-back"),
    btnGoHome: document.getElementById("btn-go-home"),
    btnSpeakWord: document.getElementById("btn-speak-word"),
    btnSpeakSentence: document.getElementById("btn-speak-sentence"),
  };

  /* --- Section Helpers --- */

  function getAllCards(topic) {
    return [
      ...topic.words.map((c) => ({ ...c, section: "word" })),
      ...topic.collocations.map((c) => ({ ...c, section: "collocation" })),
      ...topic.phrases.map((c) => ({ ...c, section: "phrase" })),
    ];
  }

  const SECTION_META = {
    all: { label: "All" },
    word: { label: "Words" },
    collocation: { label: "Collocations" },
    phrase: { label: "Phrases" },
  };

  /* --- Study State --- */

  let activeTopic = null;
  let allTopicCards = [];
  let fullDeck = [];
  let deck = [];
  let currentIdx = 0;
  let isFlipped = false;
  let shuffleMode = false;
  let knownSet = new Set();
  let againSet = new Set();
  let streak = 0;
  let activeSection = "all";
  let activeFilter = "all";

  /* --- Home Screen --- */

  function buildHome() {
    dom.tocGrid.innerHTML = "";

    TOPICS.forEach((topic, i) => {
      const cards = getAllCards(topic);
      const total = cards.length;
      const pct = Storage.getMasteryPct(topic.id, cards);
      const stats = total ? Storage.getTopicStats(topic.id, cards) : null;

      const card = document.createElement("article");
      card.className =
        "topic-card" + (topic.available ? "" : " topic-card--locked");
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", topic.available ? "0" : "-1");
      card.setAttribute(
        "aria-label",
        `${topic.fr} — ${topic.en}${topic.available ? "" : " (coming soon)"}`,
      );

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

      card.innerHTML = `
        ${!topic.available ? '<span class="topic-card__lock" aria-hidden="true">&#x1F512;</span>' : ""}
        <div class="topic-card__number" aria-hidden="true">0${i + 1}</div>
        <span class="topic-card__icon" aria-hidden="true">${topic.icon}</span>
        <div class="topic-card__title-fr">${topic.fr}</div>
        <div class="topic-card__title-en">${topic.en}</div>
        <div class="topic-card__meta">
          <span class="topic-card__count">${total} cards</span>
          <span class="${statusClass}">${statusText}</span>
        </div>
        ${
          topic.available && total
            ? `<div class="topic-card__progress"><div class="topic-card__progress-fill" style="width:${pct}%"></div></div>`
            : ""
        }
      `;

      if (topic.available) {
        card.addEventListener("click", () => openTopic(topic));
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openTopic(topic);
          }
        });
      }

      dom.tocGrid.appendChild(card);
    });
  }

  /* --- Study Screen --- */

  function openTopic(topic) {
    activeTopic = topic;
    allTopicCards = getAllCards(topic);
    activeSection = "all";
    fullDeck = [...allTopicCards];
    deck = [...fullDeck];
    currentIdx = 0;
    isFlipped = false;
    shuffleMode = false;
    knownSet.clear();
    againSet.clear();
    streak = 0;
    activeFilter = "all";

    dom.btnShuffle.classList.remove("btn-shuffle--active");
    dom.studyTitle.textContent = topic.fr;
    dom.studySubtitle.textContent = topic.en;

    buildSectionBar();
    buildFilterBar(fullDeck);
    updateDueStat();

    dom.homeScreen.hidden = true;
    dom.studyScreen.classList.add("study--active");

    hideDone();
    renderCard();
  }

  function goHome() {
    dom.studyScreen.classList.remove("study--active");
    dom.homeScreen.hidden = false;
    buildHome();
  }

  /* --- Due Count --- */

  function updateDueStat() {
    if (!activeTopic) return;
    const stats = Storage.getTopicStats(activeTopic.id, allTopicCards);
    dom.statDue.textContent = stats.due;
  }

  /* --- Section Bar --- */

  function buildSectionBar() {
    const sections = [
      { id: "all", count: allTopicCards.length },
      { id: "word", count: activeTopic.words.length },
      { id: "collocation", count: activeTopic.collocations.length },
      { id: "phrase", count: activeTopic.phrases.length },
    ];

    dom.sectionBar.innerHTML = "";
    sections.forEach((s) => {
      const btn = document.createElement("button");
      btn.className =
        "section-btn" + (s.id === activeSection ? " section-btn--active" : "");
      btn.dataset.section = s.id;
      btn.type = "button";
      btn.textContent = `${SECTION_META[s.id].label} (${s.count})`;
      btn.addEventListener("click", () => setSection(s.id));
      dom.sectionBar.appendChild(btn);
    });
  }

  function setSection(section) {
    activeSection = section;
    dom.sectionBar.querySelectorAll(".section-btn").forEach((b) => {
      b.classList.toggle(
        "section-btn--active",
        b.dataset.section === section,
      );
    });

    if (section === "all") {
      fullDeck = [...allTopicCards];
    } else {
      fullDeck = allTopicCards.filter((c) => c.section === section);
    }

    activeFilter = "all";
    deck = [...fullDeck];
    if (shuffleMode) shuffle(deck);

    buildFilterBar(fullDeck);
    currentIdx = 0;
    knownSet.clear();
    againSet.clear();
    streak = 0;
    hideDone();
    renderCard();
  }

  /* --- Filter Bar --- */

  function buildFilterBar(cards) {
    const topicData = Storage.getTopicData(activeTopic.id);
    const dueCount = cards.filter((c) =>
      Storage.isWordDue(topicData[c.word] || null),
    ).length;

    const cats = ["all", "due", ...new Set(cards.map((c) => c.cat))];
    dom.filterBar.innerHTML = "";

    cats.forEach((cat) => {
      const btn = document.createElement("button");
      btn.className =
        "filter-btn" + (cat === activeFilter ? " filter-btn--active" : "");
      btn.dataset.cat = cat;
      btn.type = "button";

      if (cat === "all") {
        btn.textContent = `All (${cards.length})`;
      } else if (cat === "due") {
        btn.textContent = `Due (${dueCount})`;
        btn.classList.add("filter-btn--due");
      } else {
        const count = cards.filter((c) => c.cat === cat).length;
        btn.textContent = `${cat} (${count})`;
      }

      btn.addEventListener("click", () => setFilter(cat));
      dom.filterBar.appendChild(btn);
    });
  }

  function setFilter(cat) {
    activeFilter = cat;
    dom.filterBar.querySelectorAll(".filter-btn").forEach((b) => {
      b.classList.toggle("filter-btn--active", b.dataset.cat === cat);
    });

    if (cat === "due") {
      const topicData = Storage.getTopicData(activeTopic.id);
      deck = fullDeck.filter((c) =>
        Storage.isWordDue(topicData[c.word] || null),
      );
      sortByPriority(deck);
    } else if (cat === "all") {
      deck = [...fullDeck];
    } else {
      deck = fullDeck.filter((c) => c.cat === cat);
    }

    if (shuffleMode && cat !== "due") shuffle(deck);
    currentIdx = 0;
    knownSet.clear();
    againSet.clear();
    streak = 0;
    hideDone();
    renderCard();
  }

  function sortByPriority(cards) {
    const topicData = Storage.getTopicData(activeTopic.id);
    cards.sort((a, b) => {
      const da = topicData[a.word] || { box: 0, ts: 0 };
      const db = topicData[b.word] || { box: 0, ts: 0 };
      if (da.box !== db.box) return da.box - db.box;
      return da.ts - db.ts;
    });
  }

  /* --- Shuffle --- */

  function toggleShuffle() {
    shuffleMode = !shuffleMode;
    dom.btnShuffle.classList.toggle("btn-shuffle--active", shuffleMode);

    if (activeFilter === "due") {
      const topicData = Storage.getTopicData(activeTopic.id);
      deck = fullDeck.filter((c) =>
        Storage.isWordDue(topicData[c.word] || null),
      );
      if (shuffleMode) shuffle(deck);
      else sortByPriority(deck);
    } else if (activeFilter === "all") {
      deck = [...fullDeck];
      if (shuffleMode) shuffle(deck);
    } else {
      deck = fullDeck.filter((c) => c.cat === activeFilter);
      if (shuffleMode) shuffle(deck);
    }

    currentIdx = 0;
    knownSet.clear();
    againSet.clear();
    streak = 0;
    hideDone();
    renderCard();
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  /* --- Card Rendering --- */

  function renderCard() {
    if (currentIdx >= deck.length) {
      showDone();
      return;
    }

    const c = deck[currentIdx];
    dom.cardCat.textContent = c.cat;
    dom.cardArticle.textContent = c.section === "word" ? c.article : "";
    dom.cardWord.textContent = c.word;
    dom.cardMeaning.textContent = c.meaning;
    dom.cardNote.textContent = c.note || "";
    dom.cardFr.textContent = c.fr;
    dom.cardEn.textContent = c.en;

    const wordInfo = Storage.getWordInfo(activeTopic.id, c.word);
    const box = wordInfo ? wordInfo.box : 0;
    dom.cardBoxBadge.textContent = BOX_LABELS[box];
    dom.cardBoxBadge.dataset.box = box;

    dom.statCurrent.textContent = currentIdx + 1;
    dom.statTotal.textContent = deck.length;
    dom.statKnown.textContent = knownSet.size;
    dom.statStreak.textContent = streak;
    dom.progressFill.style.width =
      Math.round((currentIdx / deck.length) * 100) + "%";

    dom.btnPrev.disabled = currentIdx === 0;
    dom.btnNext.disabled = currentIdx >= deck.length - 1;

    setFlipped(false);
  }

  /* --- Card Interaction --- */

  function setFlipped(state) {
    isFlipped = state;
    dom.cardInner.classList.toggle("card-inner--flipped", isFlipped);
    dom.feedbackBtns.classList.toggle("feedback--enabled", isFlipped);
    dom.cardScene.setAttribute(
      "aria-label",
      isFlipped ? "Card back — click to flip" : "Card front — click to flip",
    );
  }

  function flipCard() {
    if (currentIdx < deck.length) setFlipped(!isFlipped);
  }

  function nextCard() {
    if (currentIdx < deck.length - 1) {
      currentIdx++;
      renderCard();
    } else {
      showDone();
    }
  }

  function prevCard() {
    if (currentIdx > 0) {
      currentIdx--;
      renderCard();
    }
  }

  /* --- Feedback (SRS) --- */

  function markKnown() {
    if (!isFlipped) return;
    knownSet.add(currentIdx);
    againSet.delete(currentIdx);
    streak++;
    if (activeTopic) {
      Storage.promoteWord(activeTopic.id, deck[currentIdx].word);
      updateDueStat();
    }
    nextCard();
  }

  function markAgain() {
    if (!isFlipped) return;
    againSet.add(currentIdx);
    knownSet.delete(currentIdx);
    streak = 0;
    if (activeTopic) {
      Storage.demoteWord(activeTopic.id, deck[currentIdx].word);
      updateDueStat();
    }
    nextCard();
  }

  /* --- Done / Restart --- */

  function showDone() {
    dom.cardScene.hidden = true;
    dom.doneScreen.classList.add("done--visible");
    dom.finalKnown.textContent = knownSet.size;
    dom.finalReview.textContent = againSet.size;

    if (activeTopic) {
      const stats = Storage.getTopicStats(activeTopic.id, allTopicCards);
      dom.doneMastery.innerHTML = stats.boxes
        .map(
          (count, i) =>
            `<span class="mastery-item" data-box="${i}">` +
            `<span class="mastery-item__dot"></span>` +
            `<span class="mastery-item__label">${BOX_LABELS[i]}</span>` +
            `<span class="mastery-item__count">${count}</span>` +
            `</span>`,
        )
        .join("");
    }
  }

  function hideDone() {
    dom.cardScene.hidden = false;
    dom.doneScreen.classList.remove("done--visible");
  }

  function restart() {
    currentIdx = 0;
    knownSet.clear();
    againSet.clear();
    streak = 0;

    if (activeFilter === "due") {
      const topicData = Storage.getTopicData(activeTopic.id);
      deck = fullDeck.filter((c) =>
        Storage.isWordDue(topicData[c.word] || null),
      );
      if (shuffleMode) shuffle(deck);
      else sortByPriority(deck);
    } else {
      if (shuffleMode) shuffle(deck);
    }

    buildSectionBar();
    buildFilterBar(fullDeck);
    updateDueStat();
    hideDone();
    renderCard();
  }

  function resetProgress() {
    if (!activeTopic) return;
    Storage.resetTopic(activeTopic.id);
    restart();
  }

  /* --- Event Listeners --- */

  dom.btnBack.addEventListener("click", goHome);
  dom.btnGoHome.addEventListener("click", goHome);
  dom.btnRestart.addEventListener("click", restart);
  dom.btnReset.addEventListener("click", resetProgress);
  dom.btnPrev.addEventListener("click", prevCard);
  dom.btnNext.addEventListener("click", nextCard);
  dom.btnFlip.addEventListener("click", flipCard);
  dom.cardScene.addEventListener("click", flipCard);
  dom.btnShuffle.addEventListener("click", toggleShuffle);
  dom.btnKnow.addEventListener("click", markKnown);
  dom.btnAgain.addEventListener("click", markAgain);

  dom.btnSpeakWord.addEventListener("click", (e) => {
    e.stopPropagation();
    if (currentIdx < deck.length && activeTopic) {
      const c = deck[currentIdx];
      const spokenWord = c.section === "word" ? c.article + " " + c.word : c.word;
      playAudio(activeTopic.id, c.word, "word", spokenWord);
    }
  });

  dom.btnSpeakSentence.addEventListener("click", (e) => {
    e.stopPropagation();
    if (currentIdx < deck.length && activeTopic) {
      const c = deck[currentIdx];
      playAudio(activeTopic.id, c.word, "sentence", c.fr);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (dom.homeScreen.hidden === false) return;

    switch (e.key) {
      case " ":
      case "Enter":
        e.preventDefault();
        flipCard();
        break;
      case "ArrowRight":
        nextCard();
        break;
      case "ArrowLeft":
        prevCard();
        break;
      case "k":
      case "K":
        markKnown();
        break;
      case "r":
      case "R":
        markAgain();
        break;
    }
  });

  /* --- Init --- */

  buildHome();
})();
