// services/mail.js
// Nodemailer integration - builds and sends the HTML email digest

const nodemailer = require('nodemailer');

/**
 * Formats a number into a readable string (e.g. 1200000 -> "1.2M")
 */
function formatViews(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Formats an ISO date string into a human-readable date (e.g. "Mar 22, 2026")
 */
function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Builds the HTML email body from the top 10 video list.
 */
function buildEmailHTML(videos) {
  const rows = videos
    .map(
      (v, i) => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #e8e8e8; vertical-align: top; width: 36px;">
        <div style="background: #4F46E5; color: #fff; font-weight: 700; font-size: 15px;
                    width: 32px; height: 32px; border-radius: 50%; display: flex;
                    align-items: center; justify-content: center; text-align: center; line-height: 32px;">
          ${i + 1}
        </div>
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #e8e8e8; vertical-align: top; width: 160px;">
        <a href="https://www.youtube.com/watch?v=${v.videoId}" target="_blank">
          <img src="${v.thumbnail}" alt="Thumbnail" width="150"
               style="border-radius: 8px; display: block; border: none;" />
        </a>
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #e8e8e8; vertical-align: top;">
        <a href="https://www.youtube.com/watch?v=${v.videoId}" target="_blank"
           style="font-size: 15px; font-weight: 600; color: #1a1a1a; text-decoration: none; line-height: 1.4;">
          ${v.title}
        </a>
        <div style="margin-top: 8px; font-size: 13px; color: #555;">
          📺 <strong>${v.channelTitle}</strong>
        </div>
        <div style="margin-top: 4px; font-size: 13px; color: #555;">
          👁 <strong>${formatViews(v.viewCount)} views</strong>
          &nbsp;&nbsp;|&nbsp;&nbsp;
          📅 ${formatDate(v.publishedAt)}
        </div>
      </td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>YouTube AI Digest</title>
</head>
<body style="margin: 0; padding: 0; background: #f4f4f7; font-family: 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f4f4f7; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px;
               box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; max-width: 640px;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
                        padding: 32px 40px; text-align: center;">
              <div style="font-size: 13px; color: rgba(255,255,255,0.75); letter-spacing: 2px;
                          text-transform: uppercase; margin-bottom: 8px;">Daily AI Digest</div>
              <h1 style="margin: 0; font-size: 26px; color: #ffffff; font-weight: 700;">
                🤖 Top 10 AI YouTube Videos
              </h1>
              <div style="margin-top: 10px; font-size: 14px; color: rgba(255,255,255,0.85);">
                Trending in the last 48 hours · Sorted by View Count
              </div>
            </td>
          </tr>

          <!-- Video List -->
          <tr>
            <td style="padding: 8px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${rows}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f9f9fb; padding: 24px 40px; text-align: center;
                        border-top: 1px solid #e8e8e8;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                Generated automatically by <strong>YouTube AI Monitoring Agent</strong><br/>
                Runs daily at 6:00 AM IST via GitHub Actions
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends the email digest using Gmail and Nodemailer.
 */
async function sendEmailDigest(videos) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const mailOptions = {
    from: `"YouTube AI Agent" <${process.env.GMAIL_USER}>`,
    to: process.env.RECIPIENT_EMAIL,
    subject: `🤖 Top 10 AI YouTube Videos – ${today}`,
    html: buildEmailHTML(videos),
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendEmailDigest };
