import { useCallback, useMemo } from "react";

const STORAGE_KEY = "tcf-flashcards";

const BOX_INTERVALS = [
  0,
  4 * 3600000,
  24 * 3600000,
  3 * 24 * 3600000,
  7 * 24 * 3600000,
];

export const BOX_LABELS = ["New", "Learning", "Familiar", "Confident", "Mastered"];
export const MAX_BOX = BOX_INTERVALS.length - 1;

function readData() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return migrate(raw);
  } catch {
    return {};
  }
}

function writeData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function migrate(data) {
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
  if (changed) writeData(data);
  return data;
}

function isWordDue(wordInfo) {
  if (!wordInfo) return true;
  const elapsed = Date.now() - wordInfo.ts;
  return elapsed >= BOX_INTERVALS[wordInfo.box];
}

export function useStorage() {
  const getTopicData = useCallback((topicId) => {
    const data = readData();
    return data[topicId] || {};
  }, []);

  const getWordInfo = useCallback((topicId, word) => {
    const topic = getTopicData(topicId);
    return topic[word] || null;
  }, [getTopicData]);

  const promoteWord = useCallback((topicId, word) => {
    const data = readData();
    if (!data[topicId]) data[topicId] = {};
    const current = data[topicId][word] || { box: 0, ts: 0 };
    data[topicId][word] = {
      box: Math.min(current.box + 1, MAX_BOX),
      ts: Date.now(),
    };
    writeData(data);
  }, []);

  const demoteWord = useCallback((topicId, word) => {
    const data = readData();
    if (!data[topicId]) data[topicId] = {};
    data[topicId][word] = { box: 0, ts: Date.now() };
    writeData(data);
  }, []);

  const getTopicStats = useCallback((topicId, cards) => {
    const topicData = getTopicData(topicId);
    const boxes = [0, 0, 0, 0, 0];
    let due = 0;

    cards.forEach((c) => {
      const info = topicData[c.word] || null;
      const box = info ? info.box : 0;
      boxes[box]++;
      if (isWordDue(info)) due++;
    });

    return { boxes, due, total: cards.length };
  }, [getTopicData]);

  const getMasteryPct = useCallback((topicId, cards) => {
    const topicData = getTopicData(topicId);
    if (!cards.length) return 0;
    let mastered = 0;
    cards.forEach((c) => {
      const info = topicData[c.word];
      if (info && info.box >= 3) mastered++;
    });
    return Math.round((mastered / cards.length) * 100);
  }, [getTopicData]);

  const resetTopic = useCallback((topicId) => {
    const data = readData();
    delete data[topicId];
    writeData(data);
  }, []);

  return useMemo(
    () => ({
      getTopicData,
      getWordInfo,
      promoteWord,
      demoteWord,
      isWordDue,
      getTopicStats,
      getMasteryPct,
      resetTopic,
    }),
    [getTopicData, getWordInfo, promoteWord, demoteWord, getTopicStats, getMasteryPct, resetTopic]
  );
}

export { isWordDue };
