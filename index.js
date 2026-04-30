// index.js — Phase 2
// Main entry point for the YouTube AI Content Automation Agent
// Orchestrates: YouTube fetch → email digest → Gemini analysis → topic dedup →
//               Shorts script → long-form outline → thumbnail → Notion → Discord → email

require('dotenv').config();

const fs = require('fs');
const path = require('path');

// ── Services ──────────────────────────────────────────────────────────────────
const { fetchTopAIVideos } = require('./services/youtube');
const { sendEmailDigest } = require('./services/mail');
const {
  analyzeTopVideos,
  generateAlternativeAngle,
  generateShortScript,
  generateLongVideoOutline,
} = require('./services/gemini');
const { sendScriptDigest } = require('./services/scriptMailer');
const { isDuplicateTopic, saveTopicToHistory, getRecentTopicsSummary, loadHistory } = require('./services/history');
const { generateThumbnailSafe } = require('./services/thumbnailGenerator');
const { pushToNotionSafe } = require('./services/notion');
const { sendDiscordNotificationSafe } = require('./services/notifier');

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
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`💾 Saved: outputs/${filename}`);
}

async function main() {
  const dateStr = new Date().toISOString().split('T')[0];
  console.log('\n🚀 YouTube AI Content Agent — Phase 2 — started...');
  console.log(`📅 Date: ${dateStr}\n`);

  // ── Step 1: Show recent topic history ─────────────────────────────────────
  const recentSummary = getRecentTopicsSummary(7);
  if (recentSummary) {
    console.log('📚 Recent topics (last 7 days):');
    console.log(recentSummary);
    console.log('');
  }

  // ── Step 2: Fetch top AI videos (India, semantic scoring, long-form only) ──
  const videos = await fetchTopAIVideos();
  console.log(`\n✅ Fetched ${videos.length} top videos.\n`);

  // ── Step 3: Send research email ────────────────────────────────────────────
  await sendEmailDigest(videos);
  console.log('📧 Research email sent!\n');

  // ── Step 4: Gemini content analysis (upgraded prompts) ─────────────────────
  console.log('🤖 Gemini analyzing top content...');
  let angle = await analyzeTopVideos(videos);
  console.log(`✅ Content angle: "${angle.angle}"`);
  console.log(`🎭 Emotional trigger: ${angle.emotionalTrigger || 'N/A'}`);
  console.log(`🔍 Content gap: ${angle.contentGap || 'N/A'}\n`);

  // ── Step 5: Topic history dedup check ─────────────────────────────────────
  console.log('📅 Checking topic history...');
  const dupCheck = isDuplicateTopic(angle);

  if (dupCheck.isDuplicate) {
    console.log('♻️  Requesting alternative angle from Gemini...');
    // Build the recent topic list from history (last 14 days)
    const recentTopics = loadHistory()
      .map((entry) => entry.angle)
      .filter(Boolean);

    angle = await generateAlternativeAngle(angle, recentTopics);
    console.log(`✅ Alternative angle: "${angle.angle}"\n`);
  }

  // ── Step 6: Generate daily Shorts script ──────────────────────────────────
  console.log('📝 Generating Shorts script...');
  const shortScript = await generateShortScript(angle);
  saveOutput(`short_${dateStr}.json`, { angle, shortScript });
  console.log(`✅ Shorts script: "${shortScript.title}" (${shortScript.estimatedDuration})\n`);

  // ── Step 7: Generate long-form outline (Mon & Thu only) ────────────────────
  let longOutline = null;
  if (isLongFormDay()) {
    console.log('🎬 Generating long-form video outline (Mon/Thu)...');
    longOutline = await generateLongVideoOutline(angle);
    saveOutput(`outline_${dateStr}.json`, { angle, longOutline });
    console.log(`✅ Long-form outline: "${longOutline.title}"\n`);
  }

  // ── Step 8: Generate thumbnail image (only when long-form outline exists) ──
  let thumbnailPath = null;
  if (longOutline?.thumbnailConcept) {
    thumbnailPath = await generateThumbnailSafe(
      longOutline.thumbnailConcept,
      longOutline.title,
      dateStr
    );
  }

  // ── Step 9: Save topic to history (after successful generation) ────────────
  saveTopicToHistory(angle);

  // ── Step 10: Push to Notion ────────────────────────────────────────────────
  const notionUrl = await pushToNotionSafe(angle, shortScript, longOutline);

  // ── Step 11: Send scripts email (with thumbnail attachment if available) ───
  await sendScriptDigest(angle, shortScript, longOutline, thumbnailPath);
  console.log('📧 Scripts email sent!\n');

  // ── Step 12: Send Discord notification ────────────────────────────────────
  await sendDiscordNotificationSafe(angle, shortScript, longOutline, notionUrl);

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log('🎉 Phase 2 pipeline complete!\n');
  console.log('─'.repeat(60));
  console.log(`📌 Today's angle:  ${angle.angle}`);
  console.log(`📱 Shorts title:   ${shortScript.title}`);
  if (longOutline) console.log(`🎬 Long-form:      ${longOutline.title}`);
  if (thumbnailPath) console.log(`🖼  Thumbnail:      ${thumbnailPath}`);
  if (notionUrl) console.log(`📋 Notion page:    ${notionUrl}`);
  console.log('─'.repeat(60));
}

main().catch((err) => {
  console.error('❌ Agent failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
