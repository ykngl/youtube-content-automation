# 🤖 YouTube AI Content Agent

> **Fully automated YouTube content pipeline** — fetches trending AI videos daily, generates viral Shorts scripts with Gemini AI, creates voiceover videos, and uploads them to your YouTube channel automatically. Built for Indian creators. Zero manual work after setup.

---

## ✨ What It Does (Daily at 6:00 AM IST — Automatic)

| Step | What Happens |
|------|-------------|
| 🔎 **Fetch** | Searches YouTube India for top AI/tech videos from last 48h |
| 🤖 **Analyze** | Gemini 2.5 Flash identifies viral angles, content gaps & hooks |
| 📝 **Script** | Generates a 50-60 sec Shorts script with NGL/your branding |
| 🎤 **Voiceover** | Microsoft Edge Neural TTS (Indian English, free) |
| 🖼 **Visuals** | 5 AI-generated scene images via Pollinations.ai (free) |
| 🎬 **Video** | ffmpeg assembles 9:16 MP4 with captions + channel watermark |
| 📧 **Email** | Research digest + scripts emailed to you |
| 📋 **Notion** | Content brief logged to your Notion content calendar |
| 🟣 **Discord** | Rich embed notification sent to your server |
| 📺 **Upload** | Video auto-uploaded to your YouTube channel |

---

## 📁 Project Structure

```
youtube-ai-agent/
├── index.js                    # Main pipeline orchestrator
├── .env                        # Your credentials (never commit this!)
├── .env.example                # Template for all required variables
├── package.json
│
├── services/
│   ├── youtube.js              # YouTube Data API — semantic video search (India)
│   ├── gemini.js               # Gemini 2.5 Flash — content analysis & script generation
│   ├── videoGenerator.js       # TTS voiceover + AI images + ffmpeg video assembly
│   ├── youtubeUploader.js      # YouTube Data API — OAuth upload
│   ├── thumbnailGenerator.js   # Pollinations.ai thumbnail images
│   ├── history.js              # 14-day topic dedup (Jaccard similarity)
│   ├── notion.js               # Notion content calendar integration
│   ├── notifier.js             # Discord webhook notifications
│   ├── mail.js                 # Gmail research email digest
│   └── scriptMailer.js         # Gmail scripts + thumbnail email
│
├── scripts/
│   ├── setup.js                # ⭐ Interactive setup wizard (run this first!)
│   └── auth_youtube.js         # One-time YouTube OAuth authorization
│
└── .github/workflows/
    └── daily.yml               # GitHub Actions — runs daily at 6:00 AM IST
```

---

## 🚀 Quick Start — New Channel Setup

### Prerequisites
- **Node.js 18+** installed → [nodejs.org](https://nodejs.org)
- A **Gmail account** (for sending daily emails)
- A **Google Cloud project** (free) for YouTube + Gemini APIs
- A **GitHub account** (for automated daily runs)

---

### Step 1 — Clone / Download the Project

```bash
# Clone from GitHub
git clone https://github.com/ykngl/youtube-content-automation.git my-channel-agent
cd my-channel-agent

# OR download ZIP and extract, then:
cd youtube-ai-agent
```

---

### Step 2 — Install Dependencies

```bash
npm install
```

---

### Step 3 — Run the Setup Wizard

```bash
node scripts/setup.js
```

The wizard will guide you through collecting all API keys interactively and create your `.env` file automatically.

---

## 🔑 API Keys — Where to Get Each One

### 1. YouTube Data API v3 Key (Required — Free)
> Used to search YouTube for trending AI videos

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. **APIs & Services** → **Library** → search `YouTube Data API v3` → **Enable**
4. **APIs & Services** → **Credentials** → **Create Credentials** → **API Key**
5. Copy the key (starts with `AIza...`)

> **Free quota:** 10,000 units/day. The agent uses ~3,000/day.

---

### 2. Google Gemini API Key (Required — Free)
> Used for AI content analysis and script generation

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API Key**
3. Copy the key (starts with `AIza...`)

> **Free quota:** 1,500 requests/day on Gemini 2.5 Flash. The agent uses ~5-10/day.

---

### 3. Gmail App Password (Required — Free)
> Used to send daily email digests

1. Go to your Google Account → **Security**
2. Enable **2-Step Verification** (required for App Passwords)
3. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. App name: `YouTube AI Agent`
5. Copy the 16-character password

> **Tip:** Use a dedicated Gmail account for the agent, not your personal one.

---

### 4. Notion Integration (Optional — Free)
> Logs each day's content brief to a Notion database

1. Go to [notion.so/profile/integrations](https://www.notion.so/profile/integrations)
2. Click **+ New integration** → **Internal**
3. Name: `YouTube AI Agent` → **Save**
4. Copy the **Internal Integration Token** (starts with `ntn_` or `secret_`)

**Get your Database ID:**
1. Create a new database page in Notion (or use existing)
2. Add columns: `Name` (title), `Date` (date), `Status` (select), `Angle` (rich text)
3. Click **Share** → copy the URL
4. The Database ID is the 32-character string in the URL:
   `https://notion.so/your-workspace/**DATABASE_ID_HERE**?v=...`

**Connect the integration to your database:**
1. Open the database page in Notion
2. Click `···` (top right) → **Connections** → Add your `YouTube AI Agent` integration

---

### 5. Discord Webhook (Optional — Free)
> Sends rich notifications to your Discord server

1. Open Discord → go to your server
2. Right-click a channel → **Edit Channel** → **Integrations** → **Webhooks**
3. Click **New Webhook** → name it `YouTube AI Agent`
4. Click **Copy Webhook URL**

---

### 6. YouTube Auto-Upload OAuth 2.0 (Optional)
> Automatically uploads the daily video to your YouTube channel

This requires a 2-part setup:

#### Part A — Create OAuth Credentials
1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. **Enable** the **YouTube Data API v3** on your project (if not done already)
3. Click **Create Credentials** → **OAuth client ID**
4. If prompted, configure the **OAuth Consent Screen** first:
   - User Type: **External**
   - App name: `YouTube AI Agent`
   - Add your YouTube channel email as a **Test User**
5. Application type: **Desktop app**
6. Name: `YouTube AI Agent`
7. Click **Create** → copy the **Client ID** and **Client Secret**

#### Part B — Authorize Your Channel (One-Time)
```bash
# Add to .env first:
# YOUTUBE_OAUTH_CLIENT_ID=your-client-id
# YOUTUBE_OAUTH_CLIENT_SECRET=your-client-secret

node scripts/auth_youtube.js
```
1. Copy the URL shown in the terminal
2. Open it in your browser
3. **Log in with the Google account that owns your YouTube channel**
4. Click **Allow**
5. Copy the authorization code shown
6. Paste it in the terminal
7. Copy the `YOUTUBE_OAUTH_REFRESH_TOKEN` shown and add it to `.env`

> **Important:** After authorizing, the refresh token works permanently — you never need to do this again.

---

## ⚙️ Environment Variables Reference

```bash
# .env — Complete reference

# ── Required ──────────────────────────────────────────────────────────────────
YOUTUBE_API_KEY=AIza...           # YouTube Data API v3 key
GEMINI_API_KEY=AIza...            # Google Gemini AI key
GMAIL_USER=you@gmail.com          # Gmail account for sending emails
GMAIL_PASS=xxxx xxxx xxxx xxxx    # Gmail App Password (16 chars)
RECIPIENT_EMAIL=you@gmail.com     # Where to receive daily digests
CHANNEL_NAME=YourChannelName      # Shown on thumbnails & in scripts

# ── Optional: Notion ──────────────────────────────────────────────────────────
NOTION_API_KEY=ntn_...            # Leave blank to skip Notion
NOTION_DATABASE_ID=32chars...     # Leave blank to skip Notion

# ── Optional: Discord ─────────────────────────────────────────────────────────
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...  # Leave blank to skip

# ── Optional: YouTube Auto-Upload ─────────────────────────────────────────────
YOUTUBE_OAUTH_CLIENT_ID=...apps.googleusercontent.com
YOUTUBE_OAUTH_CLIENT_SECRET=GOCSPX-...
YOUTUBE_OAUTH_REFRESH_TOKEN=1//...   # From: node scripts/auth_youtube.js
```

---

## 🧪 Test Locally

```bash
# Run the full pipeline once
node index.js
```

**What to check:**
- ✅ Email received in your inbox
- ✅ `outputs/short_YYYY-MM-DD.json` created
- ✅ `outputs/videos/short_YYYY-MM-DD.mp4` created
- ✅ Notion page created (if configured)
- ✅ Discord notification received (if configured)
- ✅ Video uploaded to YouTube (if OAuth configured)

---

## 🤖 GitHub Actions — Automated Daily Runs

### Step 1 — Fork / Push to GitHub

```bash
# If starting fresh:
git init
git add -A
git commit -m "Initial commit — YouTube AI Agent"
git remote add origin https://github.com/YOUR_USERNAME/your-repo-name.git
git push -u origin main
```

### Step 2 — Add GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add ALL values from your `.env` file as individual secrets:

| Secret Name | Description |
|-------------|-------------|
| `YOUTUBE_API_KEY` | YouTube Data API key |
| `GEMINI_API_KEY` | Gemini AI key |
| `GMAIL_USER` | Gmail address |
| `GMAIL_PASS` | Gmail App Password |
| `RECIPIENT_EMAIL` | Email recipient |
| `CHANNEL_NAME` | Your channel brand name |
| `NOTION_API_KEY` | (optional) |
| `NOTION_DATABASE_ID` | (optional) |
| `DISCORD_WEBHOOK_URL` | (optional) |
| `YOUTUBE_OAUTH_CLIENT_ID` | (optional) |
| `YOUTUBE_OAUTH_CLIENT_SECRET` | (optional) |
| `YOUTUBE_OAUTH_REFRESH_TOKEN` | (optional) |

### Step 3 — The workflow runs automatically!

The pipeline triggers at **6:00 AM IST (00:30 UTC)** every day.

To trigger manually: Go to **Actions** tab → **YouTube AI Daily Pipeline** → **Run workflow**

---

## 🎨 Customization

### Change Target Region
In `services/youtube.js`, change:
```js
regionCode: 'IN',   // Change to: US, GB, CA, AU, etc.
```

### Change Content Topics
In `services/youtube.js`, update the `TOPICS` array:
```js
const TOPICS = [
  'AI tools 2026',
  'machine learning tutorial',
  // Add your niche topics here
];
```

### Change Upload Schedule
In `.github/workflows/daily.yml`:
```yaml
# 6:00 AM IST = 00:30 UTC
- cron: '30 0 * * *'

# Change to 8:00 AM IST = 02:30 UTC
- cron: '30 2 * * *'
```

### Change TTS Voice
In `services/videoGenerator.js`:
```js
// Indian English male (default)
await tts.setMetadata('en-IN-PrabhatNeural', ...);

// Other options:
// en-IN-NeerjaNeural        → Indian English female
// en-US-GuyNeural           → US English male
// en-US-JennyNeural         → US English female
// hi-IN-MadhurNeural        → Hindi male
// hi-IN-SwaraNeural         → Hindi female
```

### Change Long-Form Days
In `index.js`:
```js
function isLongFormDay() {
  const day = new Date().getDay();
  return day === 1 || day === 4; // Mon & Thu → change as needed
}
```

---

## 📊 API Quotas & Limits (Free Tier)

| API | Free Limit | Agent Usage |
|-----|-----------|-------------|
| YouTube Data API v3 | 10,000 units/day | ~3,000/day |
| Gemini 2.5 Flash | 1,500 req/day | ~10/day |
| Pollinations.ai | Unlimited | 5 images/day |
| Microsoft Edge TTS | Unlimited | 1 request/day |
| Gmail SMTP | 500 emails/day | 2 emails/day |
| YouTube Upload API | 1,600 units/upload | 1 upload/day |

> All free tiers are sufficient for daily use. No credit card required for core features.

---

## 🐛 Troubleshooting

### ❌ YouTube API quota exceeded
```
403 quotaExceeded
```
→ Quota resets daily at midnight Pacific Time. Wait and retry.

### ❌ Gemini 503 / 429 errors
→ Built-in retry logic handles this automatically (up to 5 retries with backoff).

### ❌ Video not generated
```
⚠️ Video generation failed (non-fatal)
```
→ Check your internet connection (needed for Pollinations.ai image generation).
→ The pipeline continues without video — email + Notion + Discord still work.

### ❌ YouTube upload fails
```
⚠️ YouTube OAuth credentials not set — skipping upload.
```
→ Run `node scripts/auth_youtube.js` to complete OAuth setup.

### ❌ Notion "API token is invalid"
→ Make sure the token starts with `ntn_` (not `secret_` for older integrations).
→ Verify the integration is connected to the database (open DB → ··· → Connections).

---

## 📜 License

MIT — Free to use, modify, and distribute for any channel.

---

## 🙏 Built With

- [Google Gemini AI](https://ai.google.dev/) — Content analysis & scripting
- [YouTube Data API v3](https://developers.google.com/youtube/v3) — Video search & upload
- [Microsoft Edge TTS](https://github.com/Ealenn/Echo-Server) (`msedge-tts`) — Free neural voiceover
- [Pollinations.ai](https://pollinations.ai/) — Free AI image generation
- [ffmpeg](https://ffmpeg.org/) — Video assembly
- [Notion API](https://developers.notion.com/) — Content calendar
- [Nodemailer](https://nodemailer.com/) — Email delivery

---

*Made with ❤️ for Indian YouTube creators — automate your content, focus on growing.*
