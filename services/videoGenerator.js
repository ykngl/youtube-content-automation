'use strict';

/**
 * services/videoGenerator.js — Phase 3
 * Generates a YouTube Shorts MP4 from the daily script:
 *   1. Google Cloud TTS → voiceover MP3
 *   2. Pollinations.ai → 5 scene background images
 *   3. fluent-ffmpeg  → assemble 9:16 vertical MP4 with captions + NGL watermark
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');
const http  = require('http');
const { execSync } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

ffmpeg.setFfmpegPath(ffmpegPath);

// ── Output directories ────────────────────────────────────────────────────────
const VIDEOS_DIR = path.join(__dirname, '..', 'outputs', 'videos');
const FRAMES_DIR = path.join(__dirname, '..', 'outputs', 'frames');
[VIDEOS_DIR, FRAMES_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));

const CHANNEL_NAME = process.env.CHANNEL_NAME || 'NGL';
const WIDTH  = 1080;
const HEIGHT = 1920;

// ── Scene definitions (5 sections of the Short) ──────────────────────────────
function buildScenes(script) {
  return [
    { id: 'hook', text: script.hook,   imagePrompt: `${script.hook} — dramatic cinematic tech background, dark blue purple gradient, AI neural network visualization` },
    { id: 'p1',   text: script.point1, imagePrompt: `${script.point1} — futuristic holographic display, glowing circuits, deep space AI visualization` },
    { id: 'p2',   text: script.point2, imagePrompt: `${script.point2} — vibrant neon technology background, AI code streams, modern Indian tech workspace` },
    { id: 'p3',   text: script.point3, imagePrompt: `${script.point3} — bold AI concept illustration, professional bright gradient, tech innovation India` },
    { id: 'cta',  text: script.cta,    imagePrompt: `Call to action AI channel ${CHANNEL_NAME} — bold subscribe graphic, glowing notification bell, dark tech background` },
  ];
}

// ── Step 1: Microsoft Edge TTS → voiceover.mp3 (FREE — no API key needed) ────
async function generateVoiceover(fullScript, outputPath) {
  console.log('🎤 Generating voiceover with Microsoft Edge TTS (Indian English)...');

  const tts = new MsEdgeTTS();
  // en-IN-PrabhatNeural — Indian English male neural voice (free)
  await tts.setMetadata('en-IN-PrabhatNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  await new Promise((resolve, reject) => {
    const { audioStream } = tts.toStream(fullScript);
    const output = fs.createWriteStream(outputPath);
    audioStream.pipe(output);
    output.on('finish', resolve);
    output.on('error', reject);
    audioStream.on('error', reject);
  });

  console.log(`✅ Voiceover saved: ${path.basename(outputPath)}`);
}

// ── Step 2: Pollinations.ai → scene background images ────────────────────────
async function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // follow redirect
        return downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (e) => { fs.unlink(destPath, () => {}); reject(e); });
  });
}

async function generateSceneImage(prompt, destPath) {
  const encoded = encodeURIComponent(
    `${prompt}, vertical 9:16 portrait orientation, ${WIDTH}x${HEIGHT}, ultra HD, cinematic, no text overlays`
  );
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${WIDTH}&height=${HEIGHT}&nologo=true&model=flux`;
  await downloadImage(url, destPath);
  console.log(`  🖼  Scene image: ${path.basename(destPath)}`);
}

async function generateAllSceneImages(scenes, framesDir) {
  console.log('🖼  Generating 5 scene background images...');
  for (const scene of scenes) {
    const imgPath = path.join(framesDir, `scene_${scene.id}.jpg`);
    scene.imagePath = imgPath;
    await generateSceneImage(scene.imagePrompt, imgPath);
    await new Promise((r) => setTimeout(r, 1000)); // small delay between requests
  }
  console.log('✅ All scene images generated.');
}

// ── Step 3: Get audio duration in seconds ────────────────────────────────────
function getAudioDuration(audioPath) {
  try {
    const result = execSync(
      `"${ffmpegPath}" -i "${audioPath}" 2>&1 | findstr Duration`,
      { encoding: 'utf8', shell: true }
    ).trim();
    const match = result.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    if (match) {
      return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
    }
  } catch (_) {}
  return 55; // default fallback
}

// ── Step 4: Wrap long caption text for ffmpeg drawtext ───────────────────────
function wrapText(text, maxChars = 28) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.join('\n');
}

// ── Step 5: fluent-ffmpeg assembly ───────────────────────────────────────────
async function assembleVideo(scenes, audioPath, outputPath, totalDuration) {
  console.log('🎬 Assembling video with ffmpeg...');

  const sceneDuration = totalDuration / scenes.length;
  const tempVideos = [];

  // Build one clip per scene
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const captionText = wrapText(scene.text, 26);
    const tempOut = path.join(FRAMES_DIR, `clip_${i}.mp4`);
    tempVideos.push(tempOut);

    // Escape special chars for ffmpeg drawtext
    const safeCaption = captionText
      .replace(/'/g, "\u2019")
      .replace(/:/g, '\\:')
      .replace(/\*/g, '')
      .replace(/\[/g, '(')
      .replace(/\]/g, ')');

    const safeChannel = CHANNEL_NAME.replace(/'/g, '');

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(scene.imagePath)
        .inputOptions(['-loop 1'])
        .outputOptions([
          `-t ${sceneDuration.toFixed(2)}`,
          '-vf',
          [
            // Scale/pad to 9:16
            `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase`,
            `crop=${WIDTH}:${HEIGHT}`,
            // Caption — bold white text, black outline, bottom third
            `drawtext=text='${safeCaption}':fontsize=68:fontcolor=white:borderw=5:bordercolor=black:x=(w-text_w)/2:y=h*0.72:line_spacing=12:font=Arial Bold`,
            // NGL watermark — top right
            `drawtext=text='${safeChannel}':fontsize=52:fontcolor=white:borderw=4:bordercolor=black:x=w-text_w-40:y=40:font=Arial Bold`,
          ].join(','),
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-r 30',
        ])
        .noAudio()
        .output(tempOut)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    console.log(`  ✂️  Clip ${i + 1}/${scenes.length} done`);
  }

  // Concat all clips
  const concatList = path.join(FRAMES_DIR, 'concat.txt');
  fs.writeFileSync(concatList, tempVideos.map((v) => `file '${v.replace(/\\/g, '/')}'`).join('\n'));
  const silentVideo = path.join(FRAMES_DIR, 'silent.mp4');

  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatList)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy'])
      .output(silentVideo)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  // Merge audio + video
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(silentVideo)
      .input(audioPath)
      .outputOptions([
        '-c:v copy',
        '-c:a aac',
        '-shortest',
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  console.log(`✅ Video assembled: ${path.basename(outputPath)}`);

  // Cleanup temp clips
  tempVideos.forEach((f) => { try { fs.unlinkSync(f); } catch (_) {} });
  try { fs.unlinkSync(concatList); } catch (_) {}
  try { fs.unlinkSync(silentVideo); } catch (_) {}
}

// ── Main entry point ──────────────────────────────────────────────────────────
async function generateVideo(shortScript, date) {
  const dateStr = date || new Date().toISOString().split('T')[0];
  console.log('\n🎬 Phase 3: Video generation started...');

  const audioPath  = path.join(FRAMES_DIR, `voiceover_${dateStr}.mp3`);
  const outputPath = path.join(VIDEOS_DIR, `short_${dateStr}.mp4`);

  if (fs.existsSync(outputPath)) {
    console.log(`⚡ Video already exists for ${dateStr}, skipping generation.`);
    return outputPath;
  }

  const scenes = buildScenes(shortScript);

  // Steps run sequentially
  await generateVoiceover(shortScript.fullScript, audioPath);
  await generateAllSceneImages(scenes, FRAMES_DIR);
  const duration = getAudioDuration(audioPath);
  console.log(`⏱  Audio duration: ${duration.toFixed(1)}s`);
  await assembleVideo(scenes, audioPath, outputPath, duration);

  // Cleanup voiceover temp
  try { fs.unlinkSync(audioPath); } catch (_) {}

  console.log(`\n🎉 Video ready: ${outputPath}`);
  return outputPath;
}

module.exports = { generateVideo };
