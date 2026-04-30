// services/youtube.js
// YouTube Data API v3 integration — Phase 2A
// Smart fetching: India region, semantic scoring, pagination, duration filter

const axios = require('axios');

// ─── Search Topics ──────────────────────────────────────────────────────────
const TOPICS = [
  'AI agent tutorial',
  'AI app development',
  'AI automation tools',
  'build app using AI',
  'no code AI agent',
  'GPT coding tutorial',
  'LLM app build',
  'AI SaaS build',
];

// ─── Semantic Scoring System ────────────────────────────────────────────────

const AI_TERMS = [
  'ai', 'gpt', 'gemini', 'claude', 'llm', 'ai agent', 'automation',
  'chatgpt', 'openai', 'langchain', 'rag', 'generative ai',
];

const DEV_INTENT_TERMS = [
  'build', 'create', 'tutorial', 'step by step', 'full guide', 'coding',
  'development', 'android', 'app', 'game', 'saas', 'automation', 'workflow',
  'api', 'bot', 'software', 'project', 'how to', 'deploy', 'integrate',
];

const PENALTY_TERMS = [
  'stock market', 'news', 'prediction', 'motivation', 'business ideas',
  'earn money', 'make money fast', 'get rich', 'crypto', 'investment',
];

/**
 * Scores a video for semantic relevance to AI development content.
 * AI match = +2, Dev intent match = +2, Tutorial/guide intent = +1, Penalty = -3
 */
function scoreRelevance(title, description = '') {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;

  const hasAI = AI_TERMS.some((t) => text.includes(t));
  const hasDev = DEV_INTENT_TERMS.some((t) => text.includes(t));
  const hasPenalty = PENALTY_TERMS.some((t) => text.includes(t));

  if (hasAI) score += 2;
  if (hasDev) score += 2;
  if (text.includes('tutorial') || text.includes('guide') || text.includes('step by step')) score += 1;
  if (hasPenalty) score -= 3;

  return score;
}

// ─── Time Helpers ────────────────────────────────────────────────────────────

/**
 * Returns the ISO 8601 timestamp for 48 hours ago.
 */
function getPublishedAfter() {
  const date = new Date();
  date.setHours(date.getHours() - 48);
  return date.toISOString();
}

/**
 * Parses ISO 8601 duration (e.g. "PT12M30S") into total seconds.
 */
function parseDurationToSeconds(iso) {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const mins = parseInt(match[2] || '0', 10);
  const secs = parseInt(match[3] || '0', 10);
  return hours * 3600 + mins * 60 + secs;
}

// ─── Chunk Helper ────────────────────────────────────────────────────────────

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─── Search Single Topic (with Pagination) ───────────────────────────────────

/**
 * Searches YouTube for a single topic with up to `maxPages` of results.
 * Uses regionCode=IN for India-specific results.
 */
async function searchTopic(topic, publishedAfter, maxPages = 2) {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const url = 'https://www.googleapis.com/youtube/v3/search';
  const results = [];
  let pageToken = null;
  let page = 0;

  while (page < maxPages) {
    const params = {
      part: 'snippet',
      q: topic,
      type: 'video',
      order: 'viewCount',
      publishedAfter,
      maxResults: 50,
      regionCode: 'IN',
      key: API_KEY,
    };
    if (pageToken) params.pageToken = pageToken;

    try {
      const response = await axios.get(url, { params });
      const items = response.data.items || [];

      results.push(
        ...items.map((item) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          thumbnail: item.snippet.thumbnails?.high?.url || '',
          description: item.snippet.description || '',
        }))
      );

      pageToken = response.data.nextPageToken;
      if (!pageToken) break;
      page++;
    } catch (err) {
      if (err.response?.status === 403) {
        console.error(`\n❌ YouTube API Quota Exhausted (403)! You have used up your daily 10,000-unit quota.`);
        console.error(`   The quota resets at midnight Pacific Time. Try again tomorrow.`);
        console.error(`   To increase quota: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas`);
        throw err;
      }
      throw err;
    }
  }

  return results;
}

// ─── Fetch Full Stats + ContentDetails ───────────────────────────────────────

/**
 * Fetches statistics, snippet, and contentDetails for a batch of video IDs.
 * Returns a map: videoId → { viewCount, duration, durationSeconds }
 */
async function fetchVideoDetails(videoIds) {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const url = 'https://www.googleapis.com/youtube/v3/videos';

  const chunks = chunkArray(videoIds, 50);

  const responses = await Promise.all(
    chunks.map((chunk) =>
      axios.get(url, {
        params: {
          part: 'statistics,contentDetails',
          id: chunk.join(','),
          key: API_KEY,
        },
      })
    )
  );

  const detailsMap = {};
  responses.forEach((response) => {
    (response.data.items || []).forEach((item) => {
      const durationSec = parseDurationToSeconds(item.contentDetails?.duration);
      detailsMap[item.id] = {
        viewCount: parseInt(item.statistics?.viewCount || '0', 10),
        duration: item.contentDetails?.duration || 'PT0S',
        durationSeconds: durationSec,
      };
    });
  });

  return detailsMap;
}

// ─── Main Fetch Function ─────────────────────────────────────────────────────

/**
 * Main function: fetches, deduplicates, semantic-scores, filters duration,
 * ranks by views, and returns top 10 AI development videos from India.
 */
async function fetchTopAIVideos() {
  const publishedAfter = getPublishedAfter();
  const publishedAfterDate = new Date(publishedAfter);
  console.log(`🔎 Searching for videos published after: ${publishedAfter}`);
  console.log(`🌏 Region: India (IN) | Pages per topic: up to 3`);

  // ── Step 1: Fetch all results across all topics in parallel ────────────────
  const allResults = await Promise.all(
    TOPICS.map((topic) => searchTopic(topic, publishedAfter, 3))
  );

  const rawTotal = allResults.reduce((sum, r) => sum + r.length, 0);
  console.log(`📦 Total raw results collected: ${rawTotal}`);

  // ── Step 2: Deduplicate by videoId ────────────────────────────────────────
  const seen = new Set();
  const unique = allResults.flat().filter((video) => {
    if (seen.has(video.videoId)) return false;
    seen.add(video.videoId);
    return true;
  });
  console.log(`🔁 After deduplication: ${unique.length} unique videos`);

  // ── Step 3: Strict 48-hour filter (manual verification) ───────────────────
  const withinWindow = unique.filter((v) => {
    return new Date(v.publishedAt) >= publishedAfterDate;
  });
  console.log(`⏰ After 48-hour filter: ${withinWindow.length} videos`);

  // ── Step 4: Semantic relevance scoring ────────────────────────────────────
  const MIN_RELEVANCE_SCORE = 2; // must have at least one AI + one dev match
  const scored = withinWindow
    .map((v) => ({ ...v, relevanceScore: scoreRelevance(v.title, v.description) }))
    .filter((v) => v.relevanceScore >= MIN_RELEVANCE_SCORE);
  console.log(`🧠 After semantic scoring (min score ${MIN_RELEVANCE_SCORE}): ${scored.length} videos`);

  if (scored.length === 0) {
    console.warn('⚠️  No videos passed semantic filter. Falling back to raw unique set.');
    scored.push(...withinWindow.slice(0, 30).map((v) => ({ ...v, relevanceScore: 0 })));
  }

  // ── Step 5: Fetch stats + duration (top 100 by relevance score only) ────────
  // Cap to avoid YouTube API quota exhaustion — we only need the best candidates
  const TOP_CANDIDATES = 100;
  const topCandidates = scored
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, TOP_CANDIDATES);
  console.log(`📋 Fetching video details for top ${topCandidates.length} candidates...`);

  const videoIds = topCandidates.map((v) => v.videoId);
  const detailsMap = await fetchVideoDetails(videoIds);

  // ── Step 6: Merge + duration filter (exclude < 8 minutes = 480 seconds) ───
  const MIN_DURATION_SECONDS = 480; // 8 minutes
  const longForm = topCandidates
    .map((v) => ({
      ...v,
      ...(detailsMap[v.videoId] || { viewCount: 0, duration: 'PT0S', durationSeconds: 0 }),
    }))
    .filter((v) => v.durationSeconds >= MIN_DURATION_SECONDS);

  console.log(`🎬 After duration filter (≥8 min): ${longForm.length} videos`);

  // ── Step 7: Sort by viewCount ──────────────────────────────────────────────
  const sorted = longForm.sort((a, b) => b.viewCount - a.viewCount);

  // ── Step 8: Minimum quality check — if top video < 5000 views, log warning ─
  if (sorted.length > 0 && sorted[0].viewCount < 5000) {
    console.warn(`⚠️  Top video has only ${sorted[0].viewCount} views. Data may be sparse for today.`);
  }

  // ── Step 9: Pick top 10 ────────────────────────────────────────────────────
  const top10 = sorted.slice(0, 10);

  console.log(`\n🏆 Final Top ${top10.length} Videos (India, last 48h, long-form, AI-dev):`);
  top10.forEach((v, i) => {
    console.log(
      `  ${i + 1}. [Score: ${v.relevanceScore}] [Views: ${v.viewCount.toLocaleString()}] [Duration: ${v.duration}] ${v.title}`
    );
  });

  return top10;
}

module.exports = { fetchTopAIVideos };
