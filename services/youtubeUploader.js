'use strict';

/**
 * services/youtubeUploader.js — Phase 3
 * Uploads the generated Shorts MP4 to YouTube using OAuth 2.0 refresh token.
 *
 * Prerequisites:
 *   - Run `node scripts/auth_youtube.js` once to get YOUTUBE_OAUTH_REFRESH_TOKEN
 *   - Set YOUTUBE_OAUTH_CLIENT_ID, YOUTUBE_OAUTH_CLIENT_SECRET, YOUTUBE_OAUTH_REFRESH_TOKEN in .env
 */

const fs   = require('fs');
const path = require('path');
const { google } = require('googleapis');

const VIDEOS_DIR = path.join(__dirname, '..', 'outputs', 'videos');
const THUMBS_DIR = path.join(__dirname, '..', 'outputs', 'thumbnails');

// ── Build OAuth2 client from env ──────────────────────────────────────────────
function getOAuthClient() {
  const clientId     = process.env.YOUTUBE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing YouTube OAuth credentials.\n' +
      'Set YOUTUBE_OAUTH_CLIENT_ID, YOUTUBE_OAUTH_CLIENT_SECRET, YOUTUBE_OAUTH_REFRESH_TOKEN in .env\n' +
      'Run `node scripts/auth_youtube.js` to get your refresh token.'
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}

// ── Build YouTube metadata from script data ───────────────────────────────────
function buildMetadata(shortScript, angle, date) {
  const channelName = process.env.CHANNEL_NAME || 'NGL';
  const title = shortScript.title || angle.suggestedTitle || 'AI Short — Daily Update';

  // Truncate title to 100 chars (YouTube limit)
  const safeTitle = title.length > 100 ? title.substring(0, 97) + '...' : title;

  const description = [
    `${angle.hook || ''}`,
    '',
    `📌 Today's topic: ${angle.angle || ''}`,
    '',
    `🔍 Why this matters: ${(angle.whyTrending || '').substring(0, 300)}`,
    '',
    `📺 Subscribe to ${channelName} for daily AI insights!`,
    '',
    '#AIShorts #AIIndia #ArtificialIntelligence #MachineLearning #TechIndia',
    `#${channelName} #AITools #BuildWithAI #IndianCreator`,
  ].join('\n');

  const tags = [
    'AI', 'artificial intelligence', 'AI India', 'machine learning',
    'AI tutorial', 'AI tools 2026', 'AI agent', 'build with AI',
    channelName, 'tech India', 'AI shorts', 'daily AI',
  ];

  return { safeTitle, description, tags };
}

// ── Upload video to YouTube ───────────────────────────────────────────────────
async function uploadToYouTube(videoPath, thumbnailPath, shortScript, angle, date, privacy = 'private') {
  console.log('\n📤 Uploading video to YouTube...');

  const auth = getOAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });

  const { safeTitle, description, tags } = buildMetadata(shortScript, angle, date);

  console.log(`  📋 Title: ${safeTitle}`);
  console.log(`  🔒 Privacy: ${privacy}`);

  // Insert video
  const videoResponse = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: safeTitle,
        description,
        tags,
        categoryId: '28', // Science & Technology
        defaultLanguage: 'en',
        defaultAudioLanguage: 'en',
      },
      status: {
        privacyStatus: privacy,           // 'private' | 'unlisted' | 'public'
        selfDeclaredMadeForKids: false,
        madeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(videoPath),
    },
  });

  const videoId = videoResponse.data.id;
  const videoUrl = `https://youtu.be/${videoId}`;
  console.log(`  ✅ Video uploaded: ${videoUrl}`);

  // Upload thumbnail if available
  if (thumbnailPath && fs.existsSync(thumbnailPath)) {
    try {
      await youtube.thumbnails.set({
        videoId,
        media: {
          mimeType: 'image/png',
          body: fs.createReadStream(thumbnailPath),
        },
      });
      console.log('  🖼  Thumbnail set successfully');
    } catch (thumbErr) {
      console.warn('  ⚠️  Thumbnail upload failed (non-fatal):', thumbErr.message);
    }
  }

  return { videoId, videoUrl };
}

// ── Safe wrapper (won't crash pipeline if credentials missing) ────────────────
async function uploadToYouTubeSafe(shortScript, angle, date, privacy) {
  const dateStr     = date || new Date().toISOString().split('T')[0];
  const videoPath   = path.join(VIDEOS_DIR, `short_${dateStr}.mp4`);
  const thumbPath   = path.join(THUMBS_DIR, `thumbnail_${dateStr}.png`);

  if (!fs.existsSync(videoPath)) {
    console.log('⚠️  No video file found for today — skipping YouTube upload.');
    return null;
  }

  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
  const refreshToken = process.env.YOUTUBE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !refreshToken) {
    console.log('⚠️  YouTube OAuth credentials not set — skipping upload.');
    console.log('   Run `node scripts/auth_youtube.js` to set up.');
    return null;
  }

  try {
    return await uploadToYouTube(videoPath, thumbPath, shortScript, angle, dateStr, privacy || 'public');
  } catch (err) {
    console.error('❌ YouTube upload failed (non-fatal):', err.message);
    return null;
  }
}

module.exports = { uploadToYouTubeSafe, uploadToYouTube };
