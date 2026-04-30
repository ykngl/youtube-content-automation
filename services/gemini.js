// services/gemini.js
// Google Gemini AI integration — Phase 2G (upgraded prompts)
// Analyzes top YouTube videos and generates content scripts with competitor gap analysis,
// viral formula detection, emotional trigger identification, and alternative angle fallback.

const { GoogleGenerativeAI } = require('@google/generative-ai');

// gemini-2.5-flash — latest fast model (SDK auto-adds 'models/' prefix)
const MODEL_NAME = 'gemini-2.5-flash';

let genAI;

function getClient() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Wraps a Gemini API call with retry logic (up to 3 attempts, exponential backoff).
 */
async function callWithRetry(fn, retries = 4, delayMs = 10000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err.message && err.message.includes('429');
      const is503 = err.message && err.message.includes('503');
      const isRetryable = is429 || is503;

      if (isRetryable && attempt < retries) {
        const waitMs = is429 ? Math.max(delayMs * 3, 30000) : delayMs; // 429 = longer wait
        console.log(`⏳ Gemini ${is503 ? 'overloaded (503)' : 'rate limited (429)'}. Retrying in ${waitMs / 1000}s... (attempt ${attempt}/${retries})`);
        await new Promise((r) => setTimeout(r, waitMs));
        delayMs = Math.min(delayMs * 2, 60000); // cap at 60s
      } else {
        throw err;
      }
    }
  }
}

/**
 * Formats top videos into a compact text summary for Gemini prompts.
 */
function formatVideosForPrompt(videos) {
  return videos
    .map(
      (v, i) =>
        `${i + 1}. Title: "${v.title}" | Channel: ${v.channelTitle} | Views: ${v.viewCount.toLocaleString()} | Duration: ${v.duration || 'N/A'}`
    )
    .join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2G: UPGRADED analyzeTopVideos — adds competitor gap, viral formula,
// emotional triggers, and content differentiation angle.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyzes top 10 videos with advanced viral formula detection.
 * Returns best content angle, hook, why trending, audience, viral formula, and gap analysis.
 */
async function analyzeTopVideos(videos) {
  const model = getClient().getGenerativeModel({ model: MODEL_NAME });
  const videoList = formatVideosForPrompt(videos);

  const prompt = `
You are a world-class YouTube content strategist and growth hacker specializing in AI and tech content for the Indian market.

Here are the top ${videos.length} trending AI YouTube videos from the last 48 hours in India (sorted by views):

${videoList}

Your task is to perform a deep strategic analysis and identify:

1. **CONTENT GAP**: What important AI development topic is MISSING or underrepresented in this list? This is the best opportunity for a new creator.
2. **VIRAL FORMULA**: What pattern (format, title structure, emotional trigger) makes the most-viewed videos on this list successful?
3. **CONTENT ANGLE**: The single best fresh angle a new creator can cover — specific, actionable, not a clone of existing videos.
4. **HOOK SENTENCE**: A single sentence that creates immediate curiosity, urgency, or shock. Must be usable as-is in a video's first 3 seconds. Should include an emotional trigger (curiosity, fear of missing out, surprise).
5. **WHY TRENDING**: Why is this topic exploding right now? Reference real reasons (new tool, product launch, viral trend).
6. **TARGET AUDIENCE**: Precisely who this content is for (skill level, goal, demographic).
7. **EMOTIONAL TRIGGER**: Which primary emotion does this hook activate? (curiosity / FOMO / surprise / inspiration / fear)
8. **DIFFERENTIATION**: How should this creator position themselves differently from the top videos listed?

Respond in this exact JSON format (no markdown, no code blocks):
{
  "angle": "...",
  "hook": "...",
  "whyTrending": "...",
  "targetAudience": "...",
  "suggestedTitle": "...",
  "viralFormula": "...",
  "contentGap": "...",
  "emotionalTrigger": "...",
  "differentiation": "..."
}
`;

  const result = await callWithRetry(() => model.generateContent(prompt));
  const text = result.response.text().trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini did not return valid JSON for content angle');
  return JSON.parse(jsonMatch[0]);
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: generateAlternativeAngle — used when today's angle is a duplicate topic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates an alternative content angle when the primary one is a duplicate.
 * @param {object} originalAngle - The original (duplicate) angle object
 * @param {string[]} recentTopics - Array of topic strings used in the last 14 days
 */
async function generateAlternativeAngle(originalAngle, recentTopics) {
  const model = getClient().getGenerativeModel({ model: MODEL_NAME });

  const topicList = recentTopics.map((t, i) => `${i + 1}. ${t}`).join('\n');

  const prompt = `
You are a YouTube content strategist. The following content angle was identified as similar to recently used topics:

ORIGINAL ANGLE: "${originalAngle.angle}"

RECENTLY USED TOPICS (last 14 days — DO NOT repeat any of these):
${topicList}

Generate a COMPLETELY DIFFERENT content angle on AI development and automation that:
- Is NOT similar to any of the recently used topics above
- Is still relevant to the Indian AI creator market
- Has strong audience demand right now
- Covers a different subtopic of AI development (tools, tutorials, automation, app building)

Respond in this exact JSON format (no markdown, no code blocks):
{
  "angle": "...",
  "hook": "...",
  "whyTrending": "...",
  "targetAudience": "...",
  "suggestedTitle": "...",
  "viralFormula": "...",
  "contentGap": "...",
  "emotionalTrigger": "...",
  "differentiation": "..."
}
`;

  const result = await callWithRetry(() => model.generateContent(prompt));
  const text = result.response.text().trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini did not return valid JSON for alternative angle');
  return JSON.parse(jsonMatch[0]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2G: UPGRADED generateShortScript — vertical video rhythm, platform-
// specific formatting, stronger CTA, and emotional arc structure.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a 45-60 second YouTube Shorts script with vertical video rhythm.
 */
async function generateShortScript(angle) {
  const model = getClient().getGenerativeModel({ model: MODEL_NAME });

  const prompt = `
You are a top-tier YouTube Shorts scriptwriter who understands the VERTICAL VIDEO RHYTHM — the specific pacing and sentence structure that keeps viewers watching on mobile.

Content angle: "${angle.angle}"
Hook: "${angle.hook}"
Target audience: "${angle.targetAudience}"
Emotional trigger: "${angle.emotionalTrigger || 'curiosity'}"
Viral formula: "${angle.viralFormula || 'Tutorial-style with immediate value'}"

Write a punchy, engaging 45–60 second YouTube Shorts script following this EXACT structure:

VERTICAL VIDEO RHYTHM RULES:
- Every sentence is SHORT (max 12 words)
- Deliver one idea per sentence — never two
- Create a micro-hook after each point (a question, a stat, or a surprising statement)
- Build tension: start bold → escalate → resolve → CTA
- No filler words ("basically", "actually", "like", "you know")
- No intro ("Hey guys", "Welcome back") — START with the hook IMMEDIATELY
- End with a curiosity-gap CTA (make them feel they'll miss something if they don't follow)

SCRIPT STRUCTURE:
1. Hook (exact hook sentence above)
2. Point 1 + micro-hook (one surprising fact or question)
3. Point 2 + micro-hook  
4. Point 3 + micro-hook
5. CTA: Make it specific, not generic — mention what they'll get by following

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

  const result = await callWithRetry(() => model.generateContent(prompt));
  const text = result.response.text().trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini did not return valid JSON for short script');
  return JSON.parse(jsonMatch[0]);
}

// ─────────────────────────────────────────────────────────────────────────────
// generateLongVideoOutline — extended with SEO-optimized metadata
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a full long-form video outline (used on Mon & Thu only).
 */
async function generateLongVideoOutline(angle) {
  const model = getClient().getGenerativeModel({ model: MODEL_NAME });

  const prompt = `
You are a senior YouTube content strategist and SEO expert. Create a detailed long-form video outline (8–12 minute video) optimized for the Indian AI creator market.

Content angle: "${angle.angle}"
Suggested title: "${angle.suggestedTitle}"
Target audience: "${angle.targetAudience}"
Why it's trending: "${angle.whyTrending}"
Competitor gap: "${angle.contentGap || 'No specific gap identified'}"
Differentiation strategy: "${angle.differentiation || 'Unique creator perspective'}"

Deliver a COMPLETE, production-ready video outline with:
- SEO-optimized title (include high-search keywords naturally)
- YouTube-ready description (150 words, includes keywords, call-to-action, and timestamps)
- 5 sections with precise timestamps and 3-4 detailed talking points each
- 10 SEO-optimized tags (mix of broad + niche + long-tail)
- Thumbnail concept: describe exactly what should appear — text overlay, facial expression, background, colors
- Pattern interrupt moments: where to add B-roll, graphics, or screen recordings

Respond in this exact JSON format (no markdown, no code blocks):
{
  "title": "...",
  "description": "...",
  "sections": [
    { "timestamp": "0:00", "title": "...", "talkingPoints": ["...", "...", "..."], "patternInterrupt": "..." },
    { "timestamp": "2:30", "title": "...", "talkingPoints": ["...", "...", "..."], "patternInterrupt": "..." },
    { "timestamp": "5:00", "title": "...", "talkingPoints": ["...", "...", "..."], "patternInterrupt": "..." },
    { "timestamp": "8:00", "title": "...", "talkingPoints": ["...", "...", "..."], "patternInterrupt": "..." },
    { "timestamp": "10:30", "title": "...", "talkingPoints": ["...", "...", "..."], "patternInterrupt": "..." }
  ],
  "tags": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "..."],
  "thumbnailConcept": "..."
}
`;

  const result = await callWithRetry(() => model.generateContent(prompt));
  const text = result.response.text().trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini did not return valid JSON for long video outline');
  return JSON.parse(jsonMatch[0]);
}

module.exports = {
  analyzeTopVideos,
  generateAlternativeAngle,
  generateShortScript,
  generateLongVideoOutline,
};
