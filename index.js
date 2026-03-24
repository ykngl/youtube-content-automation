// index.js
// Main entry point for the YouTube AI Monitoring Agent

require('dotenv').config();
const { fetchTopAIVideos } = require('./services/youtube');
const { sendEmailDigest } = require('./services/mail');

async function main() {
  console.log('🚀 YouTube AI Monitoring Agent started...');

  const videos = await fetchTopAIVideos();
  console.log(`✅ Fetched ${videos.length} top videos.`);

  await sendEmailDigest(videos);
  console.log('📧 Email digest sent successfully!');
}

main().catch((err) => {
  console.error('❌ Agent failed:', err.message);
  process.exit(1);
});
