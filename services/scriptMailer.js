// services/scriptMailer.js
// Sends a beautifully formatted HTML email containing the AI-generated scripts
// Phase 2C: supports inline thumbnail image attachment

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

/**
 * Formats a date string for display
 */
function today() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

/**
 * Builds the section HTML for a long-form video outline
 */
function buildOutlineHTML(outline, hasThumbnailImage = false) {
  if (!outline) return '';

  const sections = outline.sections
    .map(
      (s) => `
      <div style="margin-bottom: 16px; padding: 12px 16px; background: #f9f9fb; border-radius: 8px; border-left: 3px solid #7C3AED;">
        <div style="font-weight: 700; font-size: 13px; color: #4F46E5;">${s.timestamp} — ${s.title}</div>
        <ul style="margin: 6px 0 0 0; padding-left: 18px; color: #444; font-size: 13px;">
          ${s.talkingPoints.map((p) => `<li style="margin-bottom: 4px;">${p}</li>`).join('')}
        </ul>
      </div>`
    )
    .join('');

  const tags = outline.tags.map((t) => `<span style="display:inline-block; background:#EEF2FF; color:#4F46E5; border-radius:20px; padding:3px 10px; font-size:12px; margin: 3px;">#${t}</span>`).join('');

  const thumbnailSection = hasThumbnailImage
    ? `<div style="margin-top: 16px; text-align: center;">
        <img src="cid:thumbnail" alt="Generated Thumbnail" width="560"
             style="border-radius: 10px; max-width: 100%; display: block; margin: 0 auto; border: 2px solid #e8e8e8;" />
        <div style="font-size: 11px; color: #888; margin-top: 6px;">AI-Generated Thumbnail Preview</div>
      </div>`
    : `<div style="margin-top: 16px; padding: 12px 16px; background: #FFFBEB; border-radius: 8px; border-left: 3px solid #F59E0B;">
        <div style="font-size: 12px; font-weight: 700; color: #92400E; margin-bottom: 4px;">🖼 Thumbnail Concept</div>
        <div style="font-size: 13px; color: #555;">${outline.thumbnailConcept}</div>
      </div>`;

  return `
    <div style="background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); overflow: hidden; margin-top: 24px;">
      <div style="background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%); padding: 20px 28px;">
        <div style="font-size: 11px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">🎬 Weekly Long-Form Video Outline</div>
        <div style="font-size: 20px; font-weight: 700; color: #fff;">${outline.title}</div>
      </div>
      <div style="padding: 20px 28px;">
        <p style="color: #555; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">${outline.description}</p>
        ${sections}
        <div style="margin-top: 16px;">${tags}</div>
        ${thumbnailSection}
      </div>
    </div>`;
}

/**
 * Builds the full HTML email body with Short script + optional Long outline
 */
function buildScriptEmailHTML(angle, shortScript, longOutline, thumbnailPath = null) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>YouTube Content Scripts</title>
</head>
<body style="margin:0; padding:0; background:#f4f4f7; font-family:'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7; padding:32px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px; width:100%;">

        <!-- Header -->
        <tr><td style="background: linear-gradient(135deg, #059669 0%, #0D9488 100%); border-radius: 12px 12px 0 0; padding: 28px 36px; text-align:center;">
          <div style="font-size:12px; color:rgba(255,255,255,0.75); letter-spacing:2px; text-transform:uppercase; margin-bottom:8px;">AI Content Engine</div>
          <h1 style="margin:0; font-size:24px; color:#fff; font-weight:700;">✍️ Your Daily Content Scripts</h1>
          <div style="margin-top:8px; font-size:13px; color:rgba(255,255,255,0.85);">${today()}</div>
        </td></tr>

        <!-- Content Angle Card -->
        <tr><td style="background:#fff; padding: 24px 28px 0 28px;">
          <div style="background: #EFF6FF; border-radius: 10px; padding: 18px 20px; border-left: 4px solid #3B82F6;">
            <div style="font-size:12px; font-weight:700; color:#1D4ED8; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">🎯 Today's Content Angle</div>
            <div style="font-size:15px; font-weight:600; color:#1a1a1a; margin-bottom:8px;">${angle.angle}</div>
            <div style="font-size:13px; color:#555; margin-bottom:6px;">💡 <strong>Why it's trending:</strong> ${angle.whyTrending}</div>
            <div style="font-size:13px; color:#555;">👥 <strong>Target audience:</strong> ${angle.targetAudience}</div>
          </div>
        </td></tr>

        <!-- Shorts Script Card -->
        <tr><td style="background:#fff; padding: 24px 28px;">
          <div style="background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); overflow:hidden;">
            <div style="background: linear-gradient(135deg, #059669 0%, #0D9488 100%); padding: 18px 24px;">
              <div style="font-size:11px; color:rgba(255,255,255,0.75); text-transform:uppercase; letter-spacing:2px; margin-bottom:6px;">📱 Daily YouTube Shorts Script</div>
              <div style="font-size:18px; font-weight:700; color:#fff;">${shortScript.title}</div>
              <div style="font-size:12px; color:rgba(255,255,255,0.8); margin-top:4px;">⏱ ${shortScript.estimatedDuration}</div>
            </div>
            <div style="padding: 20px 24px;">
              <div style="margin-bottom:14px; padding:12px 16px; background:#F0FDF4; border-radius:8px; border-left:3px solid #059669;">
                <div style="font-size:11px; font-weight:700; color:#065F46; text-transform:uppercase; margin-bottom:4px;">Hook</div>
                <div style="font-size:14px; color:#1a1a1a; font-style:italic;">"${shortScript.hook}"</div>
              </div>
              <div style="margin-bottom:10px; padding:10px 14px; background:#f9f9fb; border-radius:8px;">
                <div style="font-size:11px; font-weight:700; color:#555; text-transform:uppercase; margin-bottom:4px;">Point 1</div>
                <div style="font-size:13px; color:#333;">${shortScript.point1}</div>
              </div>
              <div style="margin-bottom:10px; padding:10px 14px; background:#f9f9fb; border-radius:8px;">
                <div style="font-size:11px; font-weight:700; color:#555; text-transform:uppercase; margin-bottom:4px;">Point 2</div>
                <div style="font-size:13px; color:#333;">${shortScript.point2}</div>
              </div>
              <div style="margin-bottom:10px; padding:10px 14px; background:#f9f9fb; border-radius:8px;">
                <div style="font-size:11px; font-weight:700; color:#555; text-transform:uppercase; margin-bottom:4px;">Point 3</div>
                <div style="font-size:13px; color:#333;">${shortScript.point3}</div>
              </div>
              <div style="padding:12px 16px; background:#FFF7ED; border-radius:8px; border-left:3px solid #F97316;">
                <div style="font-size:11px; font-weight:700; color:#9A3412; text-transform:uppercase; margin-bottom:4px;">CTA</div>
                <div style="font-size:13px; color:#333;">${shortScript.cta}</div>
              </div>
              <div style="margin-top:18px; padding:16px; background:#1a1a1a; border-radius:8px;">
                <div style="font-size:11px; font-weight:700; color:#888; text-transform:uppercase; margin-bottom:8px;">📋 Full Script (copy-paste ready)</div>
                <div style="font-size:13px; color:#e5e5e5; line-height:1.7; white-space:pre-line;">${shortScript.fullScript}</div>
              </div>
            </div>
          </div>
          ${buildOutlineHTML(longOutline, !!thumbnailPath)}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9f9fb; padding:20px 36px; text-align:center; border-radius: 0 0 12px 12px; border-top:1px solid #e8e8e8;">
          <p style="margin:0; font-size:12px; color:#999;">
            Generated by <strong>YouTube AI Content Engine</strong><br/>
            Powered by Gemini 2.0 Flash · Runs daily at 6:00 AM IST
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Sends the script digest email.
 */
async function sendScriptDigest(angle, shortScript, longOutline, thumbnailPath = null) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const dayLabel = longOutline ? ' + 🎬 Weekly Video Outline' : '';

  // Build mail options with optional inline thumbnail attachment
  const mailOptions = {
    from: `"YouTube AI Content Engine" <${process.env.GMAIL_USER}>`,
    to: process.env.RECIPIENT_EMAIL,
    subject: `✍️ Daily Shorts Script${dayLabel} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    html: buildScriptEmailHTML(angle, shortScript, longOutline, thumbnailPath),
  };

  // Attach thumbnail as inline image if generated
  if (thumbnailPath && fs.existsSync(thumbnailPath)) {
    mailOptions.attachments = [
      {
        filename: path.basename(thumbnailPath),
        path: thumbnailPath,
        cid: 'thumbnail', // referenced in HTML as cid:thumbnail
      },
    ];
    console.log(`📎 Thumbnail attached to email: ${path.basename(thumbnailPath)}`);
  }

  await transporter.sendMail(mailOptions);
}

module.exports = { sendScriptDigest };
