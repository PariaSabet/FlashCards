const fs = require("fs");
const path = require("path");

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error("Set OPENAI_API_KEY environment variable first.");
  process.exit(1);
}

const DATA_FILE = path.join(__dirname, "js", "data.js");
const AUDIO_DIR = path.join(__dirname, "audio");
const VOICE = "verse";
const MODEL = "gpt-4o-mini-tts";
const DELAY_MS = 300;

const WORD_INSTRUCTIONS =
  "You are a native French speaker providing clear vocabulary pronunciation for a language learner. " +
  "Speak in natural, authentic French with perfect pronunciation. " +
  "Pace: Slow and deliberate, so the learner can hear every syllable clearly. " +
  "Tone: Warm and encouraging, like a patient tutor. " +
  "Articulation: Crisp and precise — emphasize nasal vowels, liaisons, and silent letters correctly. " +
  "Do not add any extra words or commentary.";

const SENTENCE_INSTRUCTIONS =
  "You are a native French speaker reading an example sentence for a language learner. " +
  "Speak in natural, authentic French with perfect pronunciation. " +
  "Pace: Moderate and clear — slightly slower than conversational speed so the learner can follow along. " +
  "Tone: Calm, natural, and conversational. " +
  "Articulation: Precise but flowing — maintain natural French rhythm and intonation. " +
  "Do not add any extra words or commentary.";

function slug(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseTopics() {
  const src = fs.readFileSync(DATA_FILE, "utf-8");
  const fn = new Function(src + "\nreturn TOPICS;");
  return fn();
}

async function tts(text, instructions, outPath) {
  if (fs.existsSync(outPath)) {
    console.log("  SKIP (exists):", path.basename(outPath));
    return;
  }

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      voice: VOICE,
      input: text,
      instructions,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS failed for "${text}": ${res.status} ${err}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log("  OK:", path.basename(outPath));
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const topics = parseTopics();
  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  for (const topic of topics) {
    if (!topic.cards.length) continue;

    const topicDir = path.join(AUDIO_DIR, topic.id);
    fs.mkdirSync(topicDir, { recursive: true });
    console.log(`\n=== ${topic.fr} (${topic.cards.length} cards) ===`);

    for (const card of topic.cards) {
      const s = slug(card.word);
      const wordText = card.article + " " + card.word;

      await tts(wordText, WORD_INSTRUCTIONS, path.join(topicDir, s + "-word.mp3"));
      await sleep(DELAY_MS);

      await tts(card.fr, SENTENCE_INSTRUCTIONS, path.join(topicDir, s + "-sentence.mp3"));
      await sleep(DELAY_MS);
    }
  }

  console.log("\nDone! Audio files saved to:", AUDIO_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
