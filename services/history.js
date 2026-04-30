// services/history.js
// Content Calendar — Topic History Tracker
// Prevents the agent from generating scripts on a repeated topic within 14 days.

const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '..', 'outputs', 'topic_history.json');
const LOOKBACK_DAYS = 14;

/**
 * Ensures the outputs directory and topic_history.json file exist.
 */
function ensureHistoryFile() {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

/**
 * Loads the topic history array from disk.
 * Each entry: { date: "YYYY-MM-DD", angle: "...", hook: "..." }
 */
function loadHistory() {
  ensureHistoryFile();
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch {
    return [];
  }
}

/**
 * Saves the full history array back to disk.
 */
function saveHistory(history) {
  ensureHistoryFile();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
}

/**
 * Returns the cutoff date (LOOKBACK_DAYS ago) for duplicate checking.
 */
function getCutoffDate() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);
  return cutoff;
}

/**
 * Computes a simple word-overlap similarity score between two angle strings.
 * Returns a value between 0 (no overlap) and 1 (identical).
 */
function computeSimilarity(a, b) {
  const normalize = (str) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3); // ignore short words

  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.length / union.size; // Jaccard similarity
}

/**
 * Checks if the given angle is too similar to a topic used in the last LOOKBACK_DAYS.
 * Returns { isDuplicate: boolean, matchedEntry: object|null, similarity: number }
 */
function isDuplicateTopic(angle) {
  const history = loadHistory();
  const cutoff = getCutoffDate();
  const SIMILARITY_THRESHOLD = 0.35; // 35% word overlap = considered duplicate

  const recent = history.filter((entry) => new Date(entry.date) >= cutoff);

  let bestMatch = null;
  let bestScore = 0;

  for (const entry of recent) {
    const score = computeSimilarity(angle, entry.angle);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  const isDup = bestScore >= SIMILARITY_THRESHOLD;

  if (isDup) {
    console.log(`⚠️  Duplicate topic detected! Similarity: ${(bestScore * 100).toFixed(1)}%`);
    console.log(`   Current:  "${angle}"`);
    console.log(`   Previous: "${bestMatch.angle}" (used on ${bestMatch.date})`);
  } else {
    console.log(`✅ Topic is fresh (best similarity to recent: ${(bestScore * 100).toFixed(1)}%)`);
  }

  return { isDuplicate: isDup, matchedEntry: bestMatch, similarity: bestScore };
}

/**
 * Saves a newly used content angle to the topic history.
 */
function saveTopicToHistory(angle) {
  const history = loadHistory();
  const today = new Date().toISOString().split('T')[0];

  // Remove entries older than LOOKBACK_DAYS to keep file small
  const cutoff = getCutoffDate();
  const pruned = history.filter((entry) => new Date(entry.date) >= cutoff);

  pruned.push({
    date: today,
    angle: angle.angle,
    hook: angle.hook || '',
    suggestedTitle: angle.suggestedTitle || '',
  });

  saveHistory(pruned);
  console.log(`📅 Saved today's topic to history: "${angle.angle}"`);
}

/**
 * Returns a summary of the last N history entries for logging.
 */
function getRecentTopicsSummary(n = 7) {
  const history = loadHistory();
  return history
    .slice(-n)
    .reverse()
    .map((e) => `  • [${e.date}] ${e.angle}`)
    .join('\n');
}

module.exports = {
  loadHistory,
  isDuplicateTopic,
  saveTopicToHistory,
  getRecentTopicsSummary,
};
