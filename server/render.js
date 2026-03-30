const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

const OUTPUT_DIR = path.join(__dirname, '../output');
const BRANDING_OVERLAY = path.join(__dirname, '../assets/branding/overlay.png');

const RESOLUTIONS = {
  '9:16': { width: 1080, height: 1920 },
  '1:1':  { width: 1080, height: 1080 }
};

const DURATIONS = { '15': 15, '30': 30, '60': 60 };

function buildSlideshow(clips, totalDuration) {
  const perClip = totalDuration / clips.length;
  return clips.map(c => ({ file: c, duration: perClip }));
}

async function renderVideo({ clips, format = '9:16', style = 'minimal', music = null, duration = '30' }) {
  const res = RESOLUTIONS[format] || RESOLUTIONS['9:16'];
  const totalDuration = DURATIONS[duration] || 30;
  const slides = buildSlideshow(clips, totalDuration);
  const outputFile = path.join(OUTPUT_DIR, `video_${Date.now()}.mp4`);

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg();

    slides.forEach(slide => {
      cmd = cmd.input(path.join(__dirname, '..', slide.file))
               .inputOptions([`-loop 1`, `-t ${slide.duration}`]);
    });

    const useBranding = style === 'branded' && fs.existsSync(BRANDING_OVERLAY);
    if (useBranding) {
      cmd = cmd.input(BRANDING_OVERLAY);
    }

    const musicPath = music ? path.join(__dirname, '../assets/music', music) : null;
    if (musicPath && fs.existsSync(musicPath)) {
      cmd = cmd.input(musicPath);
    }

    const n = slides.length;
    let filterParts = [];

    for (let i = 0; i < n; i++) {
      filterParts.push(
        `[${i}:v]scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease,` +
        `pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v${i}]`
      );
    }

    const concatInputs = slides.map((_, i) => `[v${i}]`).join('');
    filterParts.push(`${concatInputs}concat=n=${n}:v=1:a=0[vcat]`);

    let finalVideo = 'vcat';
    if (useBranding) {
      filterParts.push(`[vcat][${n}:v]overlay=W-w-20:H-h-20[vout]`);
      finalVideo = 'vout';
    }

    cmd = cmd.complexFilter(filterParts, [finalVideo])
             .outputOptions([
               '-c:v libx264',
               '-preset fast',
               '-pix_fmt yuv420p',
               '-r 30'
             ]);

    if (musicPath && fs.existsSync(musicPath)) {
      const audioIndex = useBranding ? n + 1 : n;
      cmd = cmd.outputOptions([
        `-c:a aac`,
        `-map 0:v?`,
        `-map ${audioIndex}:a`,
        `-shortest`
      ]);
    } else {
      cmd = cmd.outputOptions(['-an']);
    }

    cmd.save(outputFile)
       .on('end', () => resolve(outputFile))
       .on('error', (err, stdout, stderr) => reject(new Error(stderr || err.message)));
  });
}

module.exports = { renderVideo };
