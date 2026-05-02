// services/thumbnailGenerator.js
// Thumbnail Image Generator — Phase 2C
// Converts Gemini's thumbnail concept text into a real image using Pollinations.ai
// Free API, no key required, production-quality images.

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const THUMBNAILS_DIR = path.join(__dirname, '..', 'outputs', 'thumbnails');

/**
 * Ensures the thumbnails output directory exists.
 */
function ensureThumbnailsDir() {
  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
  }
}

/**
 * Builds an enhanced prompt from the thumbnail concept and video title.
 * Includes NGL channel branding on every thumbnail.
 */
function buildImagePrompt(thumbnailConcept, title) {
  const channelName = process.env.CHANNEL_NAME || 'NGL';
  return [
    `YouTube thumbnail for a video titled "${title}" by the channel "${channelName}"`,
    `Concept: ${thumbnailConcept}`,
    `Branding: Include the text "${channelName}" prominently in the thumbnail — bold white text with a dark outline or colored background badge, positioned in the bottom-left or top-right corner.`,
    'Style: bold typography, high contrast, vivid colors, professional tech/AI aesthetic.',
    'Format: 16:9 widescreen, eye-catching, no extra watermarks beyond the channel name.',
    'Mood: energetic, modern, futuristic tech feeling.',
  ].join(' ');
}

/**
 * Generates a thumbnail image using Pollinations.ai free API.
 * Returns the local file path where the image was saved.
 *
 * API: GET https://image.pollinations.ai/prompt/{encoded_prompt}?width=1280&height=720&nologo=true
 */
async function generateThumbnail(thumbnailConcept, title, dateStr) {
  ensureThumbnailsDir();

  const prompt = buildImagePrompt(thumbnailConcept, title);
  const encodedPrompt = encodeURIComponent(prompt);

  // Pollinations.ai endpoint — free, no API key, returns image bytes directly
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${Date.now()}`;

  console.log(`🖼  Generating thumbnail image...`);
  console.log(`    Concept: "${thumbnailConcept.substring(0, 80)}..."`);

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000, // 60s timeout — image generation can take time
  });

  const filename = `thumbnail_${dateStr}.png`;
  const filepath = path.join(THUMBNAILS_DIR, filename);

  fs.writeFileSync(filepath, Buffer.from(response.data));
  console.log(`💾 Thumbnail saved: outputs/thumbnails/${filename}`);

  return filepath;
}

/**
 * Safe wrapper — returns null if generation fails (don't crash the pipeline).
 */
async function generateThumbnailSafe(thumbnailConcept, title, dateStr) {
  try {
    return await generateThumbnail(thumbnailConcept, title, dateStr);
  } catch (err) {
    console.warn(`⚠️  Thumbnail generation failed (non-fatal): ${err.message}`);
    return null;
  }
}

module.exports = { generateThumbnailSafe };
