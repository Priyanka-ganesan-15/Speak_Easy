export type Topic = {
  id: string;
  title: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
};

const categories = [
  "Leadership",
  "Career",
  "Society",
  "Technology",
  "Education",
  "Health",
  "Creativity",
  "Ethics",
  "Future",
  "Business",
];

const stems = [
  "A moment that changed",
  "Should we normalize",
  "How to improve",
  "The hidden cost of",
  "What schools should teach about",
  "A practical framework for",
  "My unpopular opinion on",
  "Why people misunderstand",
  "The future of",
  "A better policy for",
];

const endings = [
  "team culture",
  "remote work",
  "AI in hiring",
  "public transportation",
  "financial literacy",
  "social media",
  "digital privacy",
  "mental health at work",
  "climate responsibility",
  "entrepreneurship",
];

export const topics: Topic[] = Array.from({ length: 1000 }).map((_, i) => {
  const category = categories[i % categories.length];
  const stem = stems[i % stems.length];
  const ending = endings[(i * 7) % endings.length];
  const difficulty: Topic["difficulty"] =
    i % 3 === 0 ? "Advanced" : i % 2 === 0 ? "Intermediate" : "Beginner";

  return {
    id: `topic-${i + 1}`,
    title: `${stem} ${ending}`,
    category,
    difficulty,
  };
});

export const statsCards = [
  { label: "Total Practice Sessions", value: "28", delta: "+4 this week" },
  { label: "Average Speech Rate", value: "134 WPM", delta: "-6 from last month" },
  { label: "Average Clarity Score", value: "82/100", delta: "+9 in 30 days" },
  { label: "Average Filler Words", value: "5.3", delta: "-1.7 in 30 days" },
];

export const recentSessions = [
  {
    date: "Apr 28, 2026",
    topic: "Why people misunderstand digital privacy",
    score: 86,
    duration: "5 min",
  },
  {
    date: "Apr 26, 2026",
    topic: "A practical framework for team culture",
    score: 79,
    duration: "3 min",
  },
  {
    date: "Apr 23, 2026",
    topic: "The future of public transportation",
    score: 83,
    duration: "10 min",
  },
];

export const trendData = [
  { week: "W1", speed: 118, volume: 62, pronunciation: 68 },
  { week: "W2", speed: 124, volume: 66, pronunciation: 71 },
  { week: "W3", speed: 129, volume: 69, pronunciation: 75 },
  { week: "W4", speed: 134, volume: 72, pronunciation: 79 },
  { week: "W5", speed: 131, volume: 74, pronunciation: 82 },
];

export const weeklyDeliverySeries = [
  { day: "Mon", wordsPerMinute: 122, fillerWordsPerMinute: 2.6 },
  { day: "Tue", wordsPerMinute: 129, fillerWordsPerMinute: 2.1 },
  { day: "Wed", wordsPerMinute: 136, fillerWordsPerMinute: 1.8 },
  { day: "Thu", wordsPerMinute: 132, fillerWordsPerMinute: 1.7 },
  { day: "Fri", wordsPerMinute: 138, fillerWordsPerMinute: 1.5 },
  { day: "Sat", wordsPerMinute: 134, fillerWordsPerMinute: 1.4 },
  { day: "Sun", wordsPerMinute: 131, fillerWordsPerMinute: 1.6 },
];

export const pauseDistribution = [
  { bucket: "< 1s", value: 54 },
  { bucket: "1-2s", value: 31 },
  { bucket: "2-3s", value: 10 },
  { bucket: "> 3s", value: 5 },
];

export const rubricScores = [
  { label: "Structure", score: 84 },
  { label: "Clarity", score: 81 },
  { label: "Pacing", score: 77 },
  { label: "Vocal Variety", score: 73 },
  { label: "Confidence", score: 86 },
];

export const coachingSignals = [
  {
    title: "Strong opening hooks",
    detail: "Your first 20 seconds now average 86/100 for attention retention.",
    tone: "positive",
  },
  {
    title: "Long pauses reducing",
    detail: "Pauses over 3 seconds dropped from 12% to 5% in the last 2 weeks.",
    tone: "positive",
  },
  {
    title: "Work on vocal variety",
    detail: "Pitch variation is flatter in the middle section of 5+ min talks.",
    tone: "focus",
  },
];

// Single source of truth for settings + dashboard goal widgets.
// Phase 2: replace these with Supabase-backed reads/writes.
export const userGoals = {
  targetWpm: 140,
  sessionsPerWeek: 3,
  minutesPerSession: 10,
};

export const weeklyActuals = {
  sessionsCompleted: 2,
  minutesPracticed: 23,
  avgWpm: 134,
};
