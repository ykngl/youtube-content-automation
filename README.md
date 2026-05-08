# 🤖 YouTube AI Content Automation Agent

> **Fully automated YouTube Shorts pipeline** — fetches trending AI videos, analyzes them with Gemini, generates a branded script + voiceover + thumbnail, and uploads directly to your YouTube channel every morning.

---

## ✨ What It Does

Every day at **6:00 AM IST** (runs automatically on GitHub Actions):

| Step | What Happens |
|---|---|
| 🔎 **Fetch** | Finds top 10 AI videos from India (last 48h, 8+ min, high relevance) |
| 🤖 **Analyze** | Gemini AI identifies the viral angle, content gap, and emotional hook |
| 📝 **Script** | Generates a branded 45–60s Shorts script (hook → 3 points → CTA with your channel name) |
| 🎤 **Voiceover** | Microsoft Edge Neural TTS creates an Indian English voiceover (FREE, no API key) |
| 🖼 **Thumbnail** | AI-generates a 1280×720 branded thumbnail via Pollinations.ai (FREE) |
| 🎬 **Video** | ffmpeg assembles a 9:16 vertical MP4 with captions and your channel watermark |
| 📋 **Notion** | Logs the content brief to your Notion Content Calendar |
| 🟣 **Discord** | Sends a rich embed notification to your Discord server |
| 📧 **Email** | Sends the full script + thumbnail to your inbox |
| 📺 **Upload** | Auto-uploads the video to your YouTube channel |

---

## 🏗 Architecture

```
index.js                    ← Main pipeline orchestrator
services/
  ├── youtube.js            ← YouTube Data API v3 fetch + semantic scoring
  ├── gemini.js             ← Gemini 2.5 Flash analysis + script generation
  ├── videoGenerator.js     ← TTS voiceover + AI images + ffmpeg assembly
  ├── youtubeUploader.js    ← YouTube OAuth 2.0 auto-upload
  ├── thumbnailGenerator.js ← Pollinations.ai thumbnail generation
  ├── notion.js             ← Notion database sync
  ├── notifier.js           ← Discord webhook notifications
  ├── scriptMailer.js       ← Gmail email delivery
  ├── mail.js               ← Research email digest
  └── history.js            ← 14-day topic deduplication (Jaccard similarity)
scripts/
  ├── setup.js              ← Interactive first-time setup wizard
  └── auth_youtube.js       ← One-time YouTube OAuth authorization
.github/workflows/
  └── daily.yml             ← GitHub Actions cron schedule
```

---

## 🚀 Quick Start — New Channel Setup

### Step 1 — Fork / Clone the Repository

```bash
# Option A: Fork on GitHub (recommended for each new channel)
# Go to github.com/ykngl/youtube-content-automation → Fork

# Option B: Clone directly
git clone https://github.com/ykngl/youtube-content-automation.git my-new-channel
cd my-new-channel
```

### Step 2 — Run the Setup Wizard

```bash
node scripts/setup.js
```

The wizard will guide you through all API keys interactively. Or follow the manual steps below.

---

## 🔑 Manual Setup — All API Keys

### 1. YouTube Data API v3 Key (`YOUTUBE_API_KEY`)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (one per channel is recommended)
3. **APIs & Services → Library** → search **"YouTube Data API v3"** → Enable
4. **APIs & Services → Credentials → Create Credentials → API Key**
5. Copy the key → paste as `YOUTUBE_API_KEY`

> 💡 **Free quota:** 10,000 units/day. The agent uses ~3,000 units/day.

---

### 2. Gemini API Key (`GEMINI_API_KEY`)

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API Key**
3. Copy → paste as `GEMINI_API_KEY`

> 💡 **Free tier:** 1,500 requests/day with Gemini 2.5 Flash (more than enough).

---

### 3. Gmail App Password (`GMAIL_USER` + `GMAIL_PASS`)

1. Use a Gmail account for sending emails
2. Enable 2-Factor Authentication: [myaccount.google.com/security](https://myaccount.google.com/security)
3. Go to **App Passwords**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. App: **Mail** → Device: **Other (custom name)** → name it "YouTube Agent"
5. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)
6. Set `GMAIL_USER=your@gmail.com` and `GMAIL_PASS=xxxx xxxx xxxx xxxx`

---

### 4. Notion Integration (OPTIONAL)

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New Integration** → Name it → Select your workspace → Submit
3. Copy **Internal Integration Token** → paste as `NOTION_API_KEY`
4. Create a new Notion database with these columns:
   - **Name** (Title)
   - **Date** (Date)
   - **Status** (Select: Draft, In Progress, Published)
   - **Angle** (Text)
5. Open the database page → click `···` (top right) → **Add connections** → select your integration
6. Copy the database ID from the URL:
   `https://notion.so/xxxxxxxx` → the 32-char ID after the last `/` → paste as `NOTION_DATABASE_ID`

---

### 5. Discord Webhook (OPTIONAL)

1. Open your Discord server → right-click a channel → **Edit Channel**
2. **Integrations → Webhooks → New Webhook**
3. Name it (e.g. "YouTube AI Agent") → **Copy Webhook URL**
4. Paste as `DISCORD_WEBHOOK_URL`

---

### 6. YouTube OAuth 2.0 (for auto-upload)

This is a **one-time setup** that lets the agent upload videos to your YouTube channel forever.

#### 6a. Create OAuth credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → same project as your YouTube API Key
2. **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create
   - App name: `YouTube AI Agent`
   - Support email: your email
   - Developer contact: your email
   - Save and Continue through all steps
   - **Test Users** tab → **Add Users** → add your YouTube channel's Google email
3. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**:
   - Application type: **Desktop app**
   - Name: `YouTube AI Agent`
   - Click **Create**
4. Copy **Client ID** → paste as `YOUTUBE_OAUTH_CLIENT_ID`
5. Copy **Client Secret** → paste as `YOUTUBE_OAUTH_CLIENT_SECRET`

#### 6b. Get your Refresh Token (one-time)

```bash
node scripts/auth_youtube.js
```

1. Open the URL printed in your terminal
2. Log in with the Google account that owns your YouTube channel
3. Click **Allow**
4. Copy the authorization code → paste it back in the terminal
5. Copy the **REFRESH TOKEN** printed → paste as `YOUTUBE_OAUTH_REFRESH_TOKEN`

> ✅ This token never expires. You only need to do this once per channel.

---

## 📋 Your `.env` File

After setup, your `.env` should look like this:

```env
CHANNEL_NAME=YourChannelName

YOUTUBE_API_KEY=AIzaSy...
GMAIL_USER=you@gmail.com
GMAIL_PASS=xxxx xxxx xxxx xxxx
RECIPIENT_EMAIL=you@gmail.com
GEMINI_API_KEY=AIzaSy...

# Optional
NOTION_API_KEY=ntn_...
NOTION_DATABASE_ID=xxxxxxxx...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# YouTube auto-upload
YOUTUBE_OAUTH_CLIENT_ID=xxxxxxx.apps.googleusercontent.com
YOUTUBE_OAUTH_CLIENT_SECRET=GOCSPX-...
YOUTUBE_OAUTH_REFRESH_TOKEN=1//0g...
```

---

## ⚙️ GitHub Actions — Automated Daily Run

### Step 1 — Push to GitHub

```bash
git add -A
git commit -m "Initial setup for [Channel Name]"
git push origin main
```

### Step 2 — Add GitHub Secrets

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

Add each key from your `.env` file as a separate secret:

| Secret Name | Where to find the value |
|---|---|
| `CHANNEL_NAME` | Your channel name |
| `YOUTUBE_API_KEY` | Google Cloud Console |
| `GMAIL_USER` | Your Gmail address |
| `GMAIL_PASS` | Gmail App Password |
| `RECIPIENT_EMAIL` | Report recipient email |
| `GEMINI_API_KEY` | Google AI Studio |
| `NOTION_API_KEY` | Notion integrations page |
| `NOTION_DATABASE_ID` | Notion database URL |
| `DISCORD_WEBHOOK_URL` | Discord channel webhook |
| `YOUTUBE_OAUTH_CLIENT_ID` | Google Cloud Console |
| `YOUTUBE_OAUTH_CLIENT_SECRET` | Google Cloud Console |
| `YOUTUBE_OAUTH_REFRESH_TOKEN` | From `node scripts/auth_youtube.js` |

### Step 3 — Enable Actions

Go to your repo → **Actions** tab → Click **Enable GitHub Actions**

The pipeline will now run automatically every day at **6:00 AM IST** (00:30 UTC).

### Manual Trigger

You can trigger it anytime:
**Actions tab → "YouTube AI Daily Pipeline" → Run workflow**

---

## 🧪 Test Locally

```bash
# Run the full pipeline once
node index.js

# Run just the OAuth setup
node scripts/auth_youtube.js

# Run interactive setup wizard
node scripts/setup.js
```

---

## 🔧 Customization

### Change Content Topics / Niche

Edit `services/youtube.js` → `SEARCH_TOPICS` array:

```js
const SEARCH_TOPICS = [
  'fitness AI',
  'personal finance AI',
  'cooking automation',
  // ... add your niche topics
];
```

### Change Region

Edit `services/youtube.js`:
```js
const REGION = 'US'; // Change from 'IN' to your country code
```

### Change Posting Schedule

Edit `.github/workflows/daily.yml`:
```yaml
- cron: '30 0 * * *'  # 6:00 AM IST = 00:30 UTC
# Change to your preferred time (UTC)
```

### Change Voice

Edit `services/videoGenerator.js`:
```js
await tts.setMetadata('en-IN-PrabhatNeural', ...);
// Other options:
// en-IN-NeerjaNeural   (Indian English female)
// en-US-GuyNeural      (US English male)
// en-GB-RyanNeural     (British English male)
// hi-IN-MadhurNeural   (Hindi male)
```

---

## 💰 Cost Breakdown

| Service | Cost |
|---|---|
| YouTube Data API v3 | **FREE** (10K units/day quota) |
| Gemini 2.5 Flash | **FREE** (1,500 req/day free tier) |
| Microsoft Edge TTS (voiceover) | **FREE** (no API key needed) |
| Pollinations.ai (images) | **FREE** (no API key needed) |
| GitHub Actions | **FREE** (2,000 min/month free tier) |
| Gmail SMTP | **FREE** |
| Notion API | **FREE** |
| Discord Webhooks | **FREE** |
| **Total** | **$0/month** |

---

## 🐛 Troubleshooting

### "YouTube API quota exceeded"
- The free quota is 10,000 units/day, reset at midnight Pacific time
- The agent uses ~3,000 units/run — safe for 1 run/day
- If you hit limits, wait until next day or reduce `PAGES_PER_TOPIC` in `youtube.js`

### "Notion: API token is invalid"
- Make sure the token starts with `ntn_` (not `secret_`)
- Verify you shared the database with your integration in Notion
- Check character accuracy — `O` (letter) vs `0` (zero) are common mistakes

### "YouTube upload failed: The caller does not have permission"
- Re-run `node scripts/auth_youtube.js` to refresh the OAuth token
- Make sure you added your account as a **Test User** in the OAuth consent screen
- Confirm the YouTube channel is associated with the Google account you authorized

### Gemini 503 / 429 errors
- These are transient — the agent automatically retries with exponential backoff
- If persistent, check your Gemini API key quota at aistudio.google.com

---

## 📁 Project Structure for Multiple Channels

To run this for multiple channels, create one GitHub repo per channel:

```
github.com/yourorg/channel-ngl-agent      ← CHANNEL_NAME=NGL
github.com/yourorg/channel-techbro-agent  ← CHANNEL_NAME=TechBro
github.com/yourorg/channel-hindi-agent    ← CHANNEL_NAME=HindiTech
```

Each repo has its own:
- GitHub Secrets (different CHANNEL_NAME, YOUTUBE_OAUTH_REFRESH_TOKEN, etc.)
- Notion database
- Discord server/channel
- Recipient email

The code is identical — only the secrets differ.

---

## 📬 Support

Built with ❤️ by the NGL automation pipeline.
