const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

const OUTPUT_DIR = path.join(__dirname, '../../output');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const RESOLUTIONS = {
  '720p': { '9:16': [720, 1280], '1:1': [720, 720], '16:9': [1280, 720] },
  '1080p': { '9:16': [1080, 1920], '1:1': [1080, 1080], '16:9': [1920, 1080] },
  '4k': { '9:16': [2160, 3840], '1:1': [2160, 2160], '16:9': [3840, 2160] },
};

/**
 * Renders a timeline-based project to MP4.
 * Strategy: For each track layer, create intermediate videos, then composite.
 * For text clips, render frames via Puppeteer.
 */
async function renderTimeline(project) {
  const { aspectRatio = '9:16', resolution = '1080p', fps = 30, duration, tracks } = project;
  const [width, height] = RESOLUTIONS[resolution]?.[aspectRatio] || RESOLUTIONS['1080p']['9:16'];
  const totalSeconds = duration / 1000;
  const sessionDir = path.join(OUTPUT_DIR, `render_${Date.now()}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  // Separate tracks by type
  const imageTracks = tracks.filter(t => t.visible && (t.type === 'image' || t.type === 'video'));
  const textTracks = tracks.filter(t => t.visible && t.type === 'text');
  const audioTracks = tracks.filter(t => t.visible && t.type === 'audio');

  // Collect all image clips sorted by time
  const imageClips = imageTracks.flatMap(t => t.clips).sort((a, b) => a.startTime - b.startTime);
  const textClips = textTracks.flatMap(t => t.clips).sort((a, b) => a.startTime - b.startTime);

  // Step 1: Build base video from image clips (slideshow)
  const baseVideo = path.join(sessionDir, 'base.mp4');

  if (imageClips.length > 0) {
    await buildSlideshow(imageClips, baseVideo, width, height, fps, totalSeconds, project);
  } else {
    // Black background
    await createBlackVideo(baseVideo, width, height, fps, totalSeconds);
  }

  // Step 2: Render text overlays as PNG frames using Puppeteer
  let finalVideo = baseVideo;

  if (textClips.length > 0) {
    const textOverlayVideo = path.join(sessionDir, 'with_text.mp4');
    await overlayTextClips(baseVideo, textClips, textOverlayVideo, width, height, fps, totalSeconds, sessionDir);
    finalVideo = textOverlayVideo;
  }

  // Step 3: Add audio if present
  const audioClips = audioTracks.flatMap(t => t.clips);
  if (audioClips.length > 0 && audioClips[0].source) {
    const withAudio = path.join(sessionDir, 'final.mp4');
    await addAudio(finalVideo, audioClips[0], withAudio, totalSeconds);
    finalVideo = withAudio;
  }

  // Move to output
  const outputFile = path.join(OUTPUT_DIR, `video_${Date.now()}.mp4`);
  fs.copyFileSync(finalVideo, outputFile);

  // Cleanup
  try {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  } catch {}

  return outputFile;
}

function resolveClipSource(source) {
  if (!source) return null;
  // Handle relative paths from different formats
  const cleaned = source.replace(/\\/g, '/');
  if (cleaned.startsWith('../uploads/')) {
    return path.join(UPLOADS_DIR, cleaned.replace('../uploads/', ''));
  }
  if (cleaned.startsWith('output/')) {
    return path.join(OUTPUT_DIR, '..', cleaned);
  }
  return path.join(OUTPUT_DIR, '..', cleaned);
}

function buildSlideshow(clips, outputFile, width, height, fps, totalSeconds, project) {
  return new Promise((resolve, reject) => {
    let cmd = ffmpeg();
    const n = clips.length;

    clips.forEach(clip => {
      const src = resolveClipSource(clip.source);
      if (!src || !fs.existsSync(src)) return;
      const clipDuration = clip.duration / 1000;
      cmd = cmd.input(src).inputOptions(['-loop 1', `-t ${clipDuration}`]);
    });

    const filterParts = [];
    for (let i = 0; i < n; i++) {
      filterParts.push(
        `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v${i}]`
      );
    }

    const concatInputs = clips.map((_, i) => `[v${i}]`).join('');
    filterParts.push(`${concatInputs}concat=n=${n}:v=1:a=0[vout]`);

    cmd.complexFilter(filterParts, ['vout'])
      .outputOptions(['-c:v libx264', '-preset fast', '-pix_fmt yuv420p', `-r ${fps}`, '-an'])
      .save(outputFile)
      .on('end', resolve)
      .on('error', (err, stdout, stderr) => reject(new Error(stderr || err.message)));
  });
}

function createBlackVideo(outputFile, width, height, fps, duration) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(`color=c=black:s=${width}x${height}:d=${duration}:r=${fps}`)
      .inputOptions(['-f lavfi'])
      .outputOptions(['-c:v libx264', '-preset fast', '-pix_fmt yuv420p', '-an'])
      .save(outputFile)
      .on('end', resolve)
      .on('error', (err, stdout, stderr) => reject(new Error(stderr || err.message)));
  });
}

async function overlayTextClips(baseVideo, textClips, outputFile, width, height, fps, totalSeconds, sessionDir) {
  // For simplicity, use FFmpeg drawtext filter instead of Puppeteer rendering
  // This is faster and doesn't require a browser instance
  return new Promise((resolve, reject) => {
    let cmd = ffmpeg().input(baseVideo);

    // Build drawtext filter chain
    const filters = [];
    let currentLabel = '0:v';

    textClips.forEach((clip, i) => {
      if (!clip.properties?.text?.content) return;
      const t = clip.properties.text;
      const startSec = clip.startTime / 1000;
      const endSec = (clip.startTime + clip.duration) / 1000;

      const fontSize = Math.round(t.fontSize * (width / 1080));
      const color = (t.color || '#ffffff').replace('#', '');
      const text = t.content.replace(/'/g, "\\'").replace(/:/g, "\\:");

      const outLabel = `txt${i}`;
      const x = t.alignment === 'center' ? '(w-text_w)/2' : t.alignment === 'right' ? 'w-text_w-40' : '40';
      const y = `${Math.round((clip.properties.y / 100) * height)}`;

      // Build drawtext with enable between timestamps
      let filter = `[${currentLabel}]drawtext=text='${text}':fontsize=${fontSize}:fontcolor=0x${color}:x=${x}:y=${y}:enable='between(t,${startSec},${endSec})'`;

      // Add background box if set
      if (t.backgroundColor) {
        const bgColor = t.backgroundColor.replace('#', '');
        filter += `:box=1:boxcolor=0x${bgColor}@0.7:boxborderw=8`;
      }

      filter += `[${outLabel}]`;
      filters.push(filter);
      currentLabel = outLabel;
    });

    if (filters.length === 0) {
      // No valid text clips, just copy
      fs.copyFileSync(baseVideo, outputFile);
      resolve();
      return;
    }

    cmd.complexFilter(filters, [currentLabel])
      .outputOptions(['-c:v libx264', '-preset fast', '-pix_fmt yuv420p', '-an'])
      .save(outputFile)
      .on('end', resolve)
      .on('error', (err, stdout, stderr) => reject(new Error(stderr || err.message)));
  });
}

function addAudio(videoFile, audioClip, outputFile, totalSeconds) {
  return new Promise((resolve, reject) => {
    const audioSrc = resolveClipSource(audioClip.source);
    if (!audioSrc || !fs.existsSync(audioSrc)) {
      fs.copyFileSync(videoFile, outputFile);
      resolve();
      return;
    }

    ffmpeg()
      .input(videoFile)
      .input(audioSrc)
      .outputOptions(['-c:v copy', '-c:a aac', '-map 0:v', '-map 1:a', '-shortest'])
      .save(outputFile)
      .on('end', resolve)
      .on('error', (err, stdout, stderr) => reject(new Error(stderr || err.message)));
  });
}

module.exports = { renderTimeline };
