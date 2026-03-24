// index.js
// Main entry point for the YouTube AI Content Automation Agent

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { fetchTopAIVideos } = require('./services/youtube');
const { sendEmailDigest } = require('./services/mail');
const { analyzeTopVideos, generateShortScript, generateLongVideoOutline } = require('./services/gemini');
const { sendScriptDigest } = require('./services/scriptMailer');

/**
 * Returns true if today is Monday (1) or Thursday (4) — long-form outline days.
 */
function isLongFormDay() {
  const day = new Date().getDay();
  return day === 1 || day === 4;
}

/**
 * Saves a JSON output file to the outputs/ folder.
 */
function saveOutput(filename, data) {
  const outputDir = path.join(__dirname, 'outputs');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`💾 Saved: outputs/${filename}`);
}

async function main() {
  const dateStr = new Date().toISOString().split('T')[0];
  console.log('🚀 YouTube AI Content Agent started...');

  // ── Step 1: Fetch top AI videos ──────────────────────────────────────────
  const videos = await fetchTopAIVideos();
  console.log(`✅ Fetched ${videos.length} top videos.`);

  // ── Step 2: Send research email ───────────────────────────────────────────
  await sendEmailDigest(videos);
  console.log('📧 Research email sent!');

  // ── Step 3: Gemini content analysis ──────────────────────────────────────
  console.log('🤖 Gemini analyzing top content...');
  const angle = await analyzeTopVideos(videos);
  console.log(`✅ Content angle: "${angle.angle}"`);

  // ── Step 4: Generate daily Shorts script ─────────────────────────────────
  console.log('📝 Generating Shorts script...');
  const shortScript = await generateShortScript(angle);
  saveOutput(`short_${dateStr}.json`, { angle, shortScript });
  console.log('✅ Shorts script generated.');

  // ── Step 5: Generate long-form outline (Mon & Thu only) ───────────────────
  let longOutline = null;
  if (isLongFormDay()) {
    console.log('🎬 Generating long-form video outline (Mon/Thu)...');
    longOutline = await generateLongVideoOutline(angle);
    saveOutput(`outline_${dateStr}.json`, { angle, longOutline });
    console.log('✅ Long-form outline generated.');
  }

  // ── Step 6: Send scripts email ────────────────────────────────────────────
  await sendScriptDigest(angle, shortScript, longOutline);
  console.log('📧 Scripts email sent!');

  console.log('🎉 All done!');
}

main().catch((err) => {
  console.error('❌ Agent failed:', err.message);
  process.exit(1);
});

