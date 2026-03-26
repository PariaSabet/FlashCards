import { useCallback, useEffect, useRef } from "react";

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function useAudio() {
  const audioRef = useRef(null);
  const voiceRef = useRef(null);

  useEffect(() => {
    function loadFrenchVoice() {
      const voices = speechSynthesis.getVoices();
      voiceRef.current =
        voices.find((v) => v.lang.startsWith("fr") && v.localService) ||
        voices.find((v) => v.lang.startsWith("fr")) ||
        null;
    }

    loadFrenchVoice();
    speechSynthesis.addEventListener("voiceschanged", loadFrenchVoice);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", loadFrenchVoice);
    };
  }, []);

  const speakFallback = useCallback((text) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 0.85;
    if (voiceRef.current) utterance.voice = voiceRef.current;
    speechSynthesis.speak(utterance);
  }, []);

  const playAudio = useCallback(
    (topicId, word, suffix, fallbackText) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      speechSynthesis.cancel();

      const file = `audio/${topicId}/${slugify(word)}-${suffix}.mp3`;
      const audio = new Audio(file);
      audioRef.current = audio;

      audio.play().catch(() => {
        speakFallback(fallbackText);
      });
    },
    [speakFallback]
  );

  return playAudio;
}
