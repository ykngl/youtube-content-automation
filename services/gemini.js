// services/gemini.js
// Google Gemini AI integration
// Analyzes top YouTube videos and generates content scripts

const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;

function getClient() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Formats top videos into a compact text summary for Gemini prompts.
 */
function formatVideosForPrompt(videos) {
  return videos
    .map(
      (v, i) =>
        `${i + 1}. Title: "${v.title}" | Channel: ${v.channelTitle} | Views: ${v.viewCount.toLocaleString()}`
    )
    .join('\n');
}

/**
 * Analyzes top 10 videos and returns the best content angle + hook idea.
 */
async function analyzeTopVideos(videos) {
  const model = getClient().getGenerativeModel({ model: 'gemini-2.0-flash' });

  const videoList = formatVideosForPrompt(videos);

  const prompt = `
You are an expert YouTube content strategist specializing in AI and tech content.

Here are the top 10 trending AI YouTube videos from the last 48 hours (sorted by views):

${videoList}

Analyze these videos and identify:
1. The single best content ANGLE or TOPIC that a new creator can cover with a fresh perspective
2. A powerful HOOK sentence that would grab attention in the first 3 seconds
3. Why this angle is trending right now (1-2 sentences)
4. The target AUDIENCE for this content

Respond in this exact JSON format (no markdown, no code blocks):
{
  "angle": "...",
  "hook": "...",
  "whyTrending": "...",
  "targetAudience": "...",
  "suggestedTitle": "..."
}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini did not return valid JSON for content angle');
  return JSON.parse(jsonMatch[0]);
}

/**
 * Generates a 45-60 second YouTube Shorts script from a content angle.
 */
async function generateShortScript(angle) {
  const model = getClient().getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
You are a top YouTube Shorts scriptwriter. Write a punchy, engaging 45–60 second YouTube Shorts script.

Content angle: "${angle.angle}"
Hook: "${angle.hook}"
Target audience: "${angle.targetAudience}"

Rules:
- The script must be spoken word (no stage directions)
- Start with the hook IMMEDIATELY — no intro, no "hey guys"
- 3 key insight points, each 1-2 sentences
- End with a strong CTA: "Follow for daily AI updates"
- Total word count: 120–160 words

Respond in this exact JSON format (no markdown, no code blocks):
{
  "title": "...",
  "hook": "...",
  "point1": "...",
  "point2": "...",
  "point3": "...",
  "cta": "...",
  "fullScript": "...",
  "estimatedDuration": "..."
}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini did not return valid JSON for short script');
  return JSON.parse(jsonMatch[0]);
}

/**
 * Generates a full long-form video outline (used on Mon & Thu only).
 */
async function generateLongVideoOutline(angle) {
  const model = getClient().getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
You are a senior YouTube content strategist. Create a detailed long-form video outline (8–12 minute video).

Content angle: "${angle.angle}"
Suggested title: "${angle.suggestedTitle}"
Target audience: "${angle.targetAudience}"
Why it's trending: "${angle.whyTrending}"

Deliver a complete video outline with:
- Attention-grabbing title (SEO optimized)
- Video description (YouTube-ready, 150 words)
- 5 sections with timestamps and talking points
- 10 SEO tags
- Thumbnail concept description

Respond in this exact JSON format (no markdown, no code blocks):
{
  "title": "...",
  "description": "...",
  "sections": [
    { "timestamp": "0:00", "title": "...", "talkingPoints": ["...", "...", "..."] },
    { "timestamp": "2:30", "title": "...", "talkingPoints": ["...", "...", "..."] },
    { "timestamp": "5:00", "title": "...", "talkingPoints": ["...", "...", "..."] },
    { "timestamp": "8:00", "title": "...", "talkingPoints": ["...", "...", "..."] },
    { "timestamp": "10:30", "title": "...", "talkingPoints": ["...", "...", "..."] }
  ],
  "tags": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "..."],
  "thumbnailConcept": "..."
}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini did not return valid JSON for long video outline');
  return JSON.parse(jsonMatch[0]);
}

module.exports = { analyzeTopVideos, generateShortScript, generateLongVideoOutline };
