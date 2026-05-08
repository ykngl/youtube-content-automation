'use strict';

/**
 * scripts/auth_youtube.js — ONE-TIME SETUP
 * ==========================================
 * Run this script ONCE locally to authorize your YouTube channel
 * and get a long-lived OAuth 2.0 refresh token.
 *
 * HOW TO USE:
 *   1. Go to https://console.cloud.google.com
 *   2. Select your project (the one with YouTube Data API v3 enabled)
 *   3. Go to APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
 *   4. Application type: Desktop app
 *   5. Download the credentials JSON file
 *   6. Set in your .env:
 *        YOUTUBE_OAUTH_CLIENT_ID=your-client-id
 *        YOUTUBE_OAUTH_CLIENT_SECRET=your-client-secret
 *   7. Run: node scripts/auth_youtube.js
 *   8. Open the URL shown in your browser
 *   9. Log in with yknawal@gmail.com (your YouTube channel account)
 *   10. Copy the code from the browser and paste it in the terminal
 *   11. Copy the printed REFRESH TOKEN and add to .env + GitHub Secrets
 */

require('dotenv').config();
const { google } = require('googleapis');
const readline  = require('readline');

const CLIENT_ID     = process.env.YOUTUBE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI  = 'urn:ietf:wg:oauth:2.0:oob'; // Desktop app flow

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ Missing credentials! Set these in .env first:\n');
  console.error('   YOUTUBE_OAUTH_CLIENT_ID=your-client-id');
  console.error('   YOUTUBE_OAUTH_CLIENT_SECRET=your-client-secret\n');
  console.error('Then re-run: node scripts/auth_youtube.js\n');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // forces refresh token to be issued
});

console.log('\n════════════════════════════════════════════════');
console.log('  YouTube OAuth 2.0 — One-Time Setup');
console.log('════════════════════════════════════════════════\n');
console.log('STEP 1: Open this URL in your browser:\n');
console.log(authUrl);
console.log('\nSTEP 2: Log in with yknawal@gmail.com');
console.log('STEP 3: Click "Allow"');
console.log('STEP 4: Copy the code shown and paste it below\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Paste the authorization code here: ', async (code) => {
  rl.close();

  try {
    const { tokens } = await oauth2Client.getToken(code.trim());

    console.log('\n════════════════════════════════════════════════');
    console.log('  ✅ SUCCESS! Add this to your .env file:');
    console.log('════════════════════════════════════════════════\n');
    console.log(`YOUTUBE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n────────────────────────────────────────────────');
    console.log('  Also add it as a GitHub Secret named:');
    console.log('  YOUTUBE_OAUTH_REFRESH_TOKEN');
    console.log('────────────────────────────────────────────────\n');
    console.log('⚠️  Keep this token secret — it gives upload access to your channel!\n');
  } catch (err) {
    console.error('\n❌ Failed to get token:', err.message);
    console.error('Make sure you copied the full code correctly and try again.\n');
    process.exit(1);
  }
});
