const express = require('express');
const fs = require('fs');
const path = require('path');
const { captureWebsite } = require('./capture');
const { renderVideo } = require('./render');

const app = express();
app.use(express.json());

// CORS for Next.js dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.static(path.join(__dirname, '../public')));
app.use('/output', express.static(path.join(__dirname, '../output')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
const assetsRouter = require('./routes/assets');
const projectsRouter = require('./routes/projects');
const brandsRouter = require('./routes/brands');
const templatesRouter = require('./routes/templates');
app.use('/api/assets', assetsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/brands', brandsRouter);
app.use('/api/templates', templatesRouter);

app.post('/capture', async (req, res) => {
  const { url, viewport } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const result = await captureWebsite(url, viewport || 'desktop');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/generate', async (req, res) => {
  const { clips, format, style, music, duration } = req.body;
  if (!clips || clips.length === 0) return res.status(400).json({ error: 'clips is required' });
  try {
    const videoPath = await renderVideo({ clips, format, style, music, duration });
    res.json({ file: path.basename(videoPath) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Video Generation (Phase 4)
const { generateScript } = require('./services/ai-script');
const { searchStock } = require('./services/stock-search');
const { generateCaptions, captionsToClips } = require('./services/caption-gen');

app.post('/api/ai/generate', async (req, res) => {
  const { businessName, businessType, description, tone, duration, aspectRatio } = req.body;
  if (!businessName || !businessType) {
    return res.status(400).json({ error: 'businessName and businessType are required' });
  }

  try {
    // Step 1: Generate script
    const script = await generateScript({ businessName, businessType, description, tone, duration });

    // Step 2: Search stock visuals for each scene
    const scenesWithVisuals = [];
    let currentTime = 0;
    for (const scene of script.scenes) {
      const stockResults = await searchStock(scene.visualDescription, 1);
      scenesWithVisuals.push({
        ...scene,
        startTime: currentTime,
        visual: stockResults[0] || null,
      });
      currentTime += scene.duration;
    }

    // Step 3: Generate captions
    const captions = generateCaptions(scenesWithVisuals, businessName);
    const captionClips = captionsToClips(captions);

    // Step 4: Assemble into project structure
    const totalDuration = scenesWithVisuals.reduce((sum, s) => sum + s.duration, 0);
    const project = assembleProject({
      businessName,
      scenesWithVisuals,
      captionClips,
      totalDuration,
      aspectRatio: aspectRatio || '9:16',
    });

    res.json({ script: script.script, scenes: scenesWithVisuals, project });
  } catch (err) {
    console.error('AI generation failed:', err);
    res.status(500).json({ error: err.message });
  }
});

function assembleProject({ businessName, scenesWithVisuals, captionClips, totalDuration, aspectRatio }) {
  const imageTrack = {
    id: 'track_images',
    name: 'Visuals',
    type: 'image',
    locked: false,
    visible: true,
    clips: scenesWithVisuals.map((scene, i) => ({
      id: `clip_img_${i}`,
      trackId: 'track_images',
      type: 'image',
      startTime: scene.startTime,
      duration: scene.duration,
      source: scene.visual?.path || '',
      properties: {
        x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1,
        animation: {
          entrance: i === 0 ? 'fade-in' : 'slide-left',
          exit: 'fade-out',
          entranceDuration: 400,
          exitDuration: 300,
        },
      },
    })),
  };

  const overlayTrack = {
    id: 'track_overlays',
    name: 'Text Overlays',
    type: 'text',
    locked: false,
    visible: true,
    clips: scenesWithVisuals.map((scene, i) => ({
      id: `clip_overlay_${i}`,
      trackId: 'track_overlays',
      type: 'text',
      startTime: scene.startTime + 300,
      duration: scene.duration - 600,
      source: '',
      properties: {
        x: 10, y: 20, width: 80, height: 20, rotation: 0, opacity: 1,
        text: {
          content: scene.textOverlay,
          fontFamily: 'sans-serif',
          fontSize: 36,
          fontWeight: 700,
          color: '#ffffff',
          backgroundColor: '',
          alignment: 'center',
          lineHeight: 1.2,
        },
        animation: {
          entrance: 'fade-in',
          exit: 'fade-out',
          entranceDuration: 400,
          exitDuration: 300,
        },
      },
    })),
  };

  const captionTrack = {
    id: 'track_captions',
    name: 'Captions',
    type: 'text',
    locked: false,
    visible: true,
    clips: captionClips.map((clip, i) => ({
      id: `clip_caption_${i}`,
      trackId: 'track_captions',
      ...clip,
    })),
  };

  return {
    name: `${businessName} Promo`,
    aspectRatio,
    resolution: '1080p',
    fps: 30,
    duration: totalDuration,
    tracks: [imageTrack, overlayTrack, captionTrack],
  };
}

// Timeline-aware render (Phase 2)
const { renderTimeline } = require('./services/render-engine');

app.post('/api/render', async (req, res) => {
  const { project } = req.body;
  if (!project) return res.status(400).json({ error: 'project data is required' });
  try {
    const videoPath = await renderTimeline(project);
    res.json({ file: path.basename(videoPath) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/music-list', (req, res) => {
  const musicDir = path.join(__dirname, '../assets/music');
  const files = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3') || f.endsWith('.m4a'));
  res.json({ tracks: files });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`QQ VideoGen API running at http://localhost:${PORT}`));
