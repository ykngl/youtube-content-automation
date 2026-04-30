// services/notion.js
// Notion Database Integration — Phase 2D
// Pushes daily content (angle, scripts, outline) to a Notion database page.

const { Client } = require('@notionhq/client');

let notionClient = null;

function getClient() {
  if (!notionClient) {
    notionClient = new Client({ auth: process.env.NOTION_API_KEY });
  }
  return notionClient;
}

/**
 * Formats talking points as Notion bulleted list blocks.
 */
function makeBulletBlocks(points = []) {
  return points.map((point) => ({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [{ type: 'text', text: { content: String(point) } }],
    },
  }));
}

/**
 * Builds the full Notion page children blocks from our content data.
 */
function buildNotionBlocks(angle, shortScript, longOutline) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const blocks = [
    // ── Content Angle Section ──────────────────────────────────────────────
    {
      object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '🎯 Content Angle' } }] },
    },
    {
      object: 'block', type: 'callout',
      callout: {
        icon: { type: 'emoji', emoji: '💡' },
        rich_text: [{ type: 'text', text: { content: angle.angle } }],
      },
    },
    {
      object: 'block', type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: '📌 Hook: ' }, annotations: { bold: true } },
          { type: 'text', text: { content: angle.hook } },
        ],
      },
    },
    {
      object: 'block', type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: '📈 Why Trending: ' }, annotations: { bold: true } },
          { type: 'text', text: { content: angle.whyTrending } },
        ],
      },
    },
    {
      object: 'block', type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: '👥 Target Audience: ' }, annotations: { bold: true } },
          { type: 'text', text: { content: angle.targetAudience } },
        ],
      },
    },
    { object: 'block', type: 'divider', divider: {} },

    // ── Shorts Script Section ──────────────────────────────────────────────
    {
      object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '📱 YouTube Shorts Script' } }] },
    },
    {
      object: 'block', type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: '🎬 Title: ' }, annotations: { bold: true } },
          { type: 'text', text: { content: shortScript.title } },
        ],
      },
    },
    {
      object: 'block', type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: '⏱ Duration: ' }, annotations: { bold: true } },
          { type: 'text', text: { content: shortScript.estimatedDuration } },
        ],
      },
    },
    {
      object: 'block', type: 'quote',
      quote: { rich_text: [{ type: 'text', text: { content: `Hook: ${shortScript.hook}` } }] },
    },
    {
      object: 'block', type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: '📋 Full Script:' }, annotations: { bold: true } }] },
    },
    {
      object: 'block', type: 'code',
      code: {
        language: 'plain text',
        rich_text: [{ type: 'text', text: { content: shortScript.fullScript } }],
      },
    },
    { object: 'block', type: 'divider', divider: {} },
  ];

  // ── Long-Form Outline (optional, Mon/Thu) ────────────────────────────────
  if (longOutline) {
    blocks.push({
      object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '🎬 Long-Form Video Outline' } }] },
    });
    blocks.push({
      object: 'block', type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: '📝 Title: ' }, annotations: { bold: true } },
          { type: 'text', text: { content: longOutline.title } },
        ],
      },
    });
    blocks.push({
      object: 'block', type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: '📄 Description: ' }, annotations: { bold: true } },
          { type: 'text', text: { content: longOutline.description } },
        ],
      },
    });

    // Sections
    (longOutline.sections || []).forEach((section) => {
      blocks.push({
        object: 'block', type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: `${section.timestamp} — ${section.title}` } }],
        },
      });
      blocks.push(...makeBulletBlocks(section.talkingPoints));
    });

    // Tags
    if (longOutline.tags?.length) {
      blocks.push({
        object: 'block', type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: '🏷 Tags: ' }, annotations: { bold: true } },
            { type: 'text', text: { content: longOutline.tags.map((t) => `#${t}`).join(' ') } },
          ],
        },
      });
    }

    // Thumbnail concept
    if (longOutline.thumbnailConcept) {
      blocks.push({
        object: 'block', type: 'callout',
        callout: {
          icon: { type: 'emoji', emoji: '🖼' },
          rich_text: [
            { type: 'text', text: { content: 'Thumbnail Concept: ' }, annotations: { bold: true } },
            { type: 'text', text: { content: longOutline.thumbnailConcept } },
          ],
        },
      });
    }
  }

  return blocks;
}

/**
 * Pushes today's content to a Notion database as a new page.
 * Graceful — if NOTION_API_KEY or NOTION_DATABASE_ID is not set, skips silently.
 */
async function pushToNotion(angle, shortScript, longOutline) {
  if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
    console.log('ℹ️  Notion integration skipped (NOTION_API_KEY / NOTION_DATABASE_ID not set).');
    return null;
  }

  const notion = getClient();
  const today = new Date().toISOString().split('T')[0];
  const pageTitle = `[${today}] ${shortScript.title || angle.angle}`;

  console.log(`📋 Pushing content to Notion...`);

  const page = await notion.pages.create({
    parent: { database_id: process.env.NOTION_DATABASE_ID },
    icon: { type: 'emoji', emoji: '🤖' },
    properties: {
      Name: {
        title: [{ type: 'text', text: { content: pageTitle } }],
      },
      Date: {
        date: { start: today },
      },
      Angle: {
        rich_text: [{ type: 'text', text: { content: angle.angle } }],
      },
      Status: {
        select: { name: 'Draft' },
      },
    },
    children: buildNotionBlocks(angle, shortScript, longOutline),
  });

  console.log(`✅ Notion page created: ${page.url}`);
  return page.url;
}

/**
 * Safe wrapper — returns null if Notion push fails (don't crash the pipeline).
 */
async function pushToNotionSafe(angle, shortScript, longOutline) {
  try {
    return await pushToNotion(angle, shortScript, longOutline);
  } catch (err) {
    console.warn(`⚠️  Notion push failed (non-fatal): ${err.message}`);
    return null;
  }
}

module.exports = { pushToNotionSafe };
