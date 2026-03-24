// services/youtube.js
// YouTube Data API v3 integration
// Fetches top 10 AI-related videos from the last 48 hours

const axios = require('axios');

const TOPICS = [
  'AI agent tutorial',
  'AI app development',
  'AI game development',
  'AI automation tools',
  'build app using AI',
  'no code AI agent',
];

/**
 * Returns the ISO 8601 timestamp for 48 hours ago.
 */
function getPublishedAfter() {
  const date = new Date();
  date.setHours(date.getHours() - 48);
  return date.toISOString();
}

/**
 * Searches YouTube for a single topic and returns video IDs + basic info.
 */
async function searchTopic(topic, publishedAfter) {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const url = 'https://www.googleapis.com/youtube/v3/search';

  const response = await axios.get(url, {
    params: {
      part: 'snippet',
      q: topic,
      type: 'video',
      order: 'date',
      publishedAfter,
      maxResults: 50,
      key: API_KEY,
    },
  });

  return response.data.items.map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnail: item.snippet.thumbnails.high.url,
  }));
}

/**
 * Splits an array into chunks of a given size.
 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Fetches view counts for a list of video IDs.
 * Batches requests in groups of 50 (YouTube API limit).
 */
async function fetchVideoStats(videoIds) {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const url = 'https://www.googleapis.com/youtube/v3/videos';

  const chunks = chunkArray(videoIds, 50);

  const responses = await Promise.all(
    chunks.map((chunk) =>
      axios.get(url, {
        params: {
          part: 'statistics',
          id: chunk.join(','),
          key: API_KEY,
        },
      })
    )
  );

  const statsMap = {};
  responses.forEach((response) => {
    response.data.items.forEach((item) => {
      statsMap[item.id] = parseInt(item.statistics.viewCount || '0', 10);
    });
  });

  return statsMap;
}


/**
 * Main function: fetches, deduplicates, sorts, and returns top 10 AI videos.
 */
async function fetchTopAIVideos() {
  const publishedAfter = getPublishedAfter();
  console.log(`🔎 Searching for videos published after: ${publishedAfter}`);

  // Fetch all results across all topics in parallel
  const allResults = await Promise.all(
    TOPICS.map((topic) => searchTopic(topic, publishedAfter))
  );

  // Flatten and deduplicate by videoId
  const seen = new Set();
  const unique = allResults.flat().filter((video) => {
    if (seen.has(video.videoId)) return false;
    seen.add(video.videoId);
    return true;
  });

  console.log(`📦 Unique videos found across all topics: ${unique.length}`);

  // Fetch view counts for all unique videos
  const videoIds = unique.map((v) => v.videoId);
  const statsMap = await fetchVideoStats(videoIds);

  // Merge view counts into video objects
  const withStats = unique.map((video) => ({
    ...video,
    viewCount: statsMap[video.videoId] || 0,
  }));

  // Sort by viewCount descending and pick top 10
  const top10 = withStats
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 10);

  return top10;
}

module.exports = { fetchTopAIVideos };
