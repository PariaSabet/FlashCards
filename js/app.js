/* ================================================================
   TCF French Flashcards — Application Logic
   ================================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "tcf-flashcards";

  /* --- Persistence --- */

  const Storage = {
    _read() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      } catch {
        return {};
      }
    },

    _write(data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    getTopicProgress(topicId) {
      const data = this._read();
      return data[topicId] || { known: [], review: [] };
    },

    markWord(topicId, word, status) {
      const data = this._read();
      if (!data[topicId]) data[topicId] = { known: [], review: [] };
      const entry = data[topicId];

      entry.known = entry.known.filter((w) => w !== word);
      entry.review = entry.review.filter((w) => w !== word);

      if (status === "known") entry.known.push(word);
      else if (status === "review") entry.review.push(word);

      this._write(data);
    },

    getKnownCount(topicId) {
      const progress = this.getTopicProgress(topicId);
      return progress.known.length;
    },

    resetTopic(topicId) {
      const data = this._read();
      delete data[topicId];
      this._write(data);
    },
  };

  /* --- DOM Cache --- */

  const dom = {
    homeScreen: document.getElementById("home-screen"),
    studyScreen: document.getElementById("study-screen"),
    tocGrid: document.getElementById("toc-grid"),
    studyTitle: document.getElementById("study-title"),
    studySubtitle: document.getElementById("study-subtitle"),
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
    statCurrent: document.getElementById("stat-current"),
    statTotal: document.getElementById("stat-total"),
    statKnown: document.getElementById("stat-known"),
    statStreak: document.getElementById("stat-streak"),
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
    btnRestart: document.getElementById("btn-restart"),
    btnReset: document.getElementById("btn-reset"),
    btnBack: document.getElementById("btn-back"),
    btnGoHome: document.getElementById("btn-go-home"),
  };

  /* --- Study State --- */

  let activeTopic = null;
  let fullDeck = [];
  let deck = [];
  let currentIdx = 0;
  let isFlipped = false;
  let shuffleMode = false;
  let knownSet = new Set();
  let againSet = new Set();
  let streak = 0;
  let activeFilter = "all";

  /* --- Home Screen --- */

  function buildHome() {
    dom.tocGrid.innerHTML = "";

    TOPICS.forEach((topic, i) => {
      const known = Storage.getKnownCount(topic.id);
      const total = topic.cards.length;
      const pct = total ? Math.round((known / total) * 100) : 0;

      const card = document.createElement("article");
      card.className =
        "topic-card" + (topic.available ? "" : " topic-card--locked");
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", topic.available ? "0" : "-1");
      card.setAttribute(
        "aria-label",
        `${topic.fr} — ${topic.en}${topic.available ? "" : " (coming soon)"}`,
      );

      card.innerHTML = `
        ${!topic.available ? '<span class="topic-card__lock" aria-hidden="true">&#x1F512;</span>' : ""}
        <div class="topic-card__number" aria-hidden="true">0${i + 1}</div>
        <span class="topic-card__icon" aria-hidden="true">${topic.icon}</span>
        <div class="topic-card__title-fr">${topic.fr}</div>
        <div class="topic-card__title-en">${topic.en}</div>
        <div class="topic-card__meta">
          <span class="topic-card__count">${total} words</span>
          <span class="${topic.available ? "topic-card__status--available" : "topic-card__status--soon"}">
            ${topic.available ? (pct > 0 ? pct + "% known" : "Start \u2192") : "coming soon"}
          </span>
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
    fullDeck = [...topic.cards];
    deck = [...fullDeck];
    currentIdx = 0;
    isFlipped = false;
    shuffleMode = false;
    knownSet.clear();
    againSet.clear();
    streak = 0;
    activeFilter = "all";

    const saved = Storage.getTopicProgress(topic.id);
    deck.forEach((card, idx) => {
      if (saved.known.includes(card.word)) knownSet.add(idx);
      else if (saved.review.includes(card.word)) againSet.add(idx);
    });

    dom.btnShuffle.classList.remove("btn-shuffle--active");
    dom.studyTitle.textContent = topic.fr;
    dom.studySubtitle.textContent = topic.en;

    buildFilterBar(topic.cards);

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

  /* --- Filter Bar --- */

  function buildFilterBar(cards) {
    const cats = ["all", ...new Set(cards.map((c) => c.cat))];
    dom.filterBar.innerHTML = "";

    cats.forEach((cat) => {
      const btn = document.createElement("button");
      btn.className =
        "filter-btn" + (cat === "all" ? " filter-btn--active" : "");
      btn.dataset.cat = cat;
      btn.type = "button";
      const count =
        cat === "all"
          ? cards.length
          : cards.filter((c) => c.cat === cat).length;
      btn.textContent = cat === "all" ? `All (${count})` : `${cat} (${count})`;
      btn.addEventListener("click", () => setFilter(cat));
      dom.filterBar.appendChild(btn);
    });
  }

  function setFilter(cat) {
    activeFilter = cat;
    dom.filterBar.querySelectorAll(".filter-btn").forEach((b) => {
      b.classList.toggle("filter-btn--active", b.dataset.cat === cat);
    });
    deck =
      cat === "all" ? [...fullDeck] : fullDeck.filter((c) => c.cat === cat);
    if (shuffleMode) shuffle(deck);
    currentIdx = 0;
    knownSet.clear();
    againSet.clear();
    streak = 0;
    hideDone();
    renderCard();
  }

  /* --- Shuffle --- */

  function toggleShuffle() {
    shuffleMode = !shuffleMode;
    dom.btnShuffle.classList.toggle("btn-shuffle--active", shuffleMode);
    deck =
      activeFilter === "all"
        ? [...fullDeck]
        : fullDeck.filter((c) => c.cat === activeFilter);
    if (shuffleMode) shuffle(deck);
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
    dom.cardArticle.textContent = c.article;
    dom.cardWord.textContent = c.word;
    dom.cardMeaning.textContent = c.meaning;
    dom.cardNote.textContent = c.note || "";
    dom.cardFr.textContent = c.fr;
    dom.cardEn.textContent = c.en;

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

  /* --- Feedback --- */

  function markKnown() {
    if (!isFlipped) return;
    knownSet.add(currentIdx);
    againSet.delete(currentIdx);
    streak++;
    if (activeTopic) {
      Storage.markWord(activeTopic.id, deck[currentIdx].word, "known");
    }
    nextCard();
  }

  function markAgain() {
    if (!isFlipped) return;
    againSet.add(currentIdx);
    knownSet.delete(currentIdx);
    streak = 0;
    if (activeTopic) {
      Storage.markWord(activeTopic.id, deck[currentIdx].word, "review");
    }
    nextCard();
  }

  /* --- Done / Restart --- */

  function showDone() {
    dom.cardScene.hidden = true;
    dom.doneScreen.classList.add("done--visible");
    dom.finalKnown.textContent = knownSet.size;
    dom.finalReview.textContent = againSet.size;
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
    if (shuffleMode) shuffle(deck);
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
