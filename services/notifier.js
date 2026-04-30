// services/notifier.js
// Discord Webhook Notifier — Phase 2E
// Sends a rich embed notification to a Discord channel after content generation.

const axios = require('axios');

/**
 * Builds a Discord webhook payload with an embedded message.
 */
function buildDiscordPayload(angle, shortScript, longOutline, notionUrl) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const fields = [
    {
      name: '🎯 Content Angle',
      value: angle.angle,
      inline: false,
    },
    {
      name: '🔥 Hook',
      value: `*"${angle.hook}"*`,
      inline: false,
    },
    {
      name: '👥 Target Audience',
      value: angle.targetAudience,
      inline: true,
    },
    {
      name: '📈 Why Trending',
      value: angle.whyTrending,
      inline: false,
    },
    {
      name: '📱 Shorts Script Title',
      value: shortScript.title,
      inline: true,
    },
    {
      name: '⏱ Duration',
      value: shortScript.estimatedDuration,
      inline: true,
    },
  ];

  if (longOutline) {
    fields.push({
      name: '🎬 Long-Form Video',
      value: longOutline.title,
      inline: false,
    });
  }

  if (notionUrl) {
    fields.push({
      name: '📋 Notion Page',
      value: `[Open in Notion](${notionUrl})`,
      inline: false,
    });
  }

  return {
    username: 'YouTube AI Agent',
    avatar_url: 'https://i.imgur.com/4M34hi2.png',
    embeds: [
      {
        title: `✍️ Daily Content Ready — ${today}`,
        description: `Your AI content pipeline has completed! Here's today's content brief:`,
        color: 0x059669, // emerald green
        fields,
        footer: {
          text: 'YouTube AI Content Engine • Powered by Gemini 2.0 Flash',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Sends a Discord webhook notification.
 * Graceful — if DISCORD_WEBHOOK_URL is not set, skips silently.
 */
async function sendDiscordNotification(angle, shortScript, longOutline, notionUrl = null) {
  if (!process.env.DISCORD_WEBHOOK_URL) {
    console.log('ℹ️  Discord notification skipped (DISCORD_WEBHOOK_URL not set).');
    return;
  }

  const payload = buildDiscordPayload(angle, shortScript, longOutline, notionUrl);

  await axios.post(process.env.DISCORD_WEBHOOK_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  });

  console.log('📣 Discord notification sent!');
}

/**
 * Safe wrapper — returns gracefully if Discord send fails.
 */
async function sendDiscordNotificationSafe(angle, shortScript, longOutline, notionUrl = null) {
  try {
    await sendDiscordNotification(angle, shortScript, longOutline, notionUrl);
  } catch (err) {
    console.warn(`⚠️  Discord notification failed (non-fatal): ${err.message}`);
  }
}

module.exports = { sendDiscordNotificationSafe };
