# Instagram Video Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web app that captures any website visually and exports a polished Instagram-ready MP4 video with format, style, music, and duration controls.

**Architecture:** Node.js/Express backend handles Puppeteer site capture and FFmpeg video assembly. A plain HTML/CSS/JS frontend served at `http://localhost:3000` provides the UI. A `start.bat` launcher starts the server and opens the browser in one double-click.

**Tech Stack:** Node.js, Express, Puppeteer, fluent-ffmpeg, ffmpeg-static, plain HTML/CSS/JS

---

## File Map

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies and npm scripts |
| `start.bat` | Windows launcher — starts server + opens browser |
| `server/index.js` | Express server, API routes, static file serving |
| `server/capture.js` | Puppeteer logic — scroll recording + screenshots |
| `server/render.js` | FFmpeg logic — assemble clips, transitions, branding, audio |
| `public/index.html` | Main UI shell |
| `public/style.css` | All styles |
| `public/app.js` | Frontend logic — API calls, preview, options, download |
| `assets/branding/overlay.png` | QQ Solutions logo/branding overlay (placeholder PNG) |
| `assets/music/` | Royalty-free MP3 tracks |
| `output/` | Generated MP4s saved here |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `server/index.js`
- Create: `start.bat`
- Create: `output/.gitkeep`
- Create: `assets/branding/.gitkeep`
- Create: `assets/music/.gitkeep`

- [ ] **Step 1: Initialize project**

```bash
cd C:/Users/rafae/QQVideoGen
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install express puppeteer fluent-ffmpeg ffmpeg-static
```

- [ ] **Step 3: Create folder structure**

```bash
mkdir -p server public assets/branding assets/music output
```

- [ ] **Step 4: Create `server/index.js` — Express server skeleton**

```js
const express = require('express');
const path = require('path');
const { captureWebsite } = require('./capture');
const { renderVideo } = require('./render');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/output', express.static(path.join(__dirname, '../output')));

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

const PORT = 3000;
app.listen(PORT, () => console.log(`QQ VideoGen running at http://localhost:${PORT}`));
```

- [ ] **Step 5: Create `start.bat`**

```bat
@echo off
start "" http://localhost:3000
node server/index.js
```

- [ ] **Step 6: Create placeholder files**

```bash
touch output/.gitkeep assets/branding/.gitkeep assets/music/.gitkeep
```

- [ ] **Step 7: Verify server starts**

```bash
node server/index.js
```
Expected output: `QQ VideoGen running at http://localhost:3000`
Stop with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: project scaffold with Express server"
```

---

## Task 2: Website Capture (Puppeteer)

**Files:**
- Create: `server/capture.js`

- [ ] **Step 1: Create `server/capture.js`**

```js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '../output');

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 844 }
};

async function captureWebsite(url, viewport = 'desktop') {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const vp = VIEWPORTS[viewport] || VIEWPORTS.desktop;
  await page.setViewport(vp);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  const sessionId = Date.now();
  const sessionDir = path.join(OUTPUT_DIR, `session_${sessionId}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  // Take screenshots every 400px of scroll depth
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const screenshots = [];
  let scrollY = 0;
  let index = 0;

  while (scrollY < pageHeight) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await new Promise(r => setTimeout(r, 300)); // wait for lazy-load
    const file = path.join(sessionDir, `shot_${String(index).padStart(3, '0')}.png`);
    await page.screenshot({ path: file });
    screenshots.push({ file: path.relative(path.join(__dirname, '..'), file), index });
    scrollY += vp.height * 0.8; // 80% overlap scroll
    index++;
    if (index > 20) break; // cap at 20 shots
  }

  await browser.close();
  return { sessionId, screenshots, viewport };
}

module.exports = { captureWebsite };
```

- [ ] **Step 2: Test capture manually**

Create a temporary test file `test-capture.js` in the project root:

```js
const { captureWebsite } = require('./server/capture');
captureWebsite('https://example.com', 'desktop').then(r => {
  console.log('Captured:', r.screenshots.length, 'screenshots');
  console.log(r);
}).catch(console.error);
```

Run:
```bash
node test-capture.js
```
Expected: prints captured screenshot count and file paths. Check `output/session_*/` folder for PNG files.

- [ ] **Step 3: Delete test file**

```bash
rm test-capture.js
```

- [ ] **Step 4: Commit**

```bash
git add server/capture.js
git commit -m "feat: puppeteer website capture with scroll screenshots"
```

---

## Task 3: Video Rendering (FFmpeg)

**Files:**
- Create: `server/render.js`

- [ ] **Step 1: Create `server/render.js`**

```js
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

function buildSlideshow(clips, resolution, totalDuration) {
  // Each clip gets equal time
  const perClip = totalDuration / clips.length;
  return clips.map(c => ({ file: c, duration: perClip }));
}

async function renderVideo({ clips, format = '9:16', style = 'minimal', music = null, duration = '30' }) {
  const res = RESOLUTIONS[format] || RESOLUTIONS['9:16'];
  const totalDuration = DURATIONS[duration] || 30;
  const slides = buildSlideshow(clips, res, totalDuration);
  const outputFile = path.join(OUTPUT_DIR, `video_${Date.now()}.mp4`);

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg();

    // Add each screenshot as input with its duration
    slides.forEach(slide => {
      cmd = cmd.input(path.join(__dirname, '..', slide.file))
               .inputOptions([`-loop 1`, `-t ${slide.duration}`]);
    });

    // Add branding overlay if style is 'branded' and overlay exists
    const useBranding = style === 'branded' && fs.existsSync(BRANDING_OVERLAY);
    if (useBranding) {
      cmd = cmd.input(BRANDING_OVERLAY);
    }

    // Add music if provided
    const musicPath = music ? path.join(__dirname, '../assets/music', music) : null;
    if (musicPath && fs.existsSync(musicPath)) {
      cmd = cmd.input(musicPath);
    }

    // Build filter_complex for concatenation + scale + branding
    const n = slides.length;
    let filterParts = [];

    // Scale each input to target resolution with padding
    for (let i = 0; i < n; i++) {
      filterParts.push(
        `[${i}:v]scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease,` +
        `pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v${i}]`
      );
    }

    // Concat all video streams
    const concatInputs = slides.map((_, i) => `[v${i}]`).join('');
    filterParts.push(`${concatInputs}concat=n=${n}:v=1:a=0[vcat]`);

    // Apply branding overlay if needed
    let finalVideo = '[vcat]';
    if (useBranding) {
      filterParts.push(`[vcat][${n}:v]overlay=W-w-20:H-h-20[vout]`);
      finalVideo = '[vout]';
    }

    cmd = cmd.complexFilter(filterParts, [finalVideo.replace('[','').replace(']','')])
             .outputOptions([
               '-c:v libx264',
               '-preset fast',
               '-pix_fmt yuv420p',
               '-r 30'
             ]);

    // Mix audio if music provided
    if (musicPath && fs.existsSync(musicPath)) {
      const audioIndex = useBranding ? n + 1 : n;
      cmd = cmd.outputOptions([
        `-c:a aac`,
        `-map 0:v?`,
        `-map ${audioIndex}:a`,
        `-shortest`
      ]);
    } else {
      cmd = cmd.outputOptions(['-an']); // no audio
    }

    cmd.save(outputFile)
       .on('end', () => resolve(outputFile))
       .on('error', reject);
  });
}

module.exports = { renderVideo };
```

- [ ] **Step 2: Create a placeholder branding overlay**

In `assets/branding/`, add a PNG file named `overlay.png`. For now create a 200x80 transparent placeholder using Node:

```bash
node -e "
const fs = require('fs');
// 1x1 transparent PNG (minimal valid PNG)
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync('assets/branding/overlay.png', png);
console.log('placeholder overlay created');
"
```

- [ ] **Step 3: Test render manually**

First run a capture to get some screenshots, then test render. Create `test-render.js`:

```js
const { captureWebsite } = require('./server/capture');
const { renderVideo } = require('./server/render');

async function run() {
  console.log('Capturing...');
  const { screenshots } = await captureWebsite('https://example.com', 'desktop');
  const clips = screenshots.slice(0, 3).map(s => s.file);
  console.log('Rendering...');
  const out = await renderVideo({ clips, format: '9:16', style: 'minimal', music: null, duration: '15' });
  console.log('Video saved to:', out);
}
run().catch(console.error);
```

Run:
```bash
node test-render.js
```
Expected: `Video saved to: C:/Users/rafae/QQVideoGen/output/video_<timestamp>.mp4`
Verify the MP4 opens and plays correctly.

- [ ] **Step 4: Delete test file**

```bash
rm test-render.js
```

- [ ] **Step 5: Commit**

```bash
git add server/render.js assets/branding/overlay.png
git commit -m "feat: ffmpeg video renderer with scale, concat, branding overlay, audio"
```

---

## Task 4: Frontend UI

**Files:**
- Create: `public/index.html`
- Create: `public/style.css`
- Create: `public/app.js`

- [ ] **Step 1: Create `public/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QQ VideoGen</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="app">
    <header>
      <h1>QQ VideoGen</h1>
      <p class="tagline">Instagram-ready videos from any website</p>
    </header>

    <!-- Step 1: URL Input -->
    <section id="step-capture" class="card">
      <h2>1. Website URL</h2>
      <div class="row">
        <input type="url" id="url-input" placeholder="https://clientwebsite.com" />
        <div class="viewport-toggle">
          <button class="toggle active" data-vp="desktop">Desktop</button>
          <button class="toggle" data-vp="mobile">Mobile</button>
        </div>
        <button id="btn-capture" class="btn-primary">Capture Site</button>
      </div>
      <div id="capture-status" class="status"></div>
    </section>

    <!-- Step 2: Preview & Select -->
    <section id="step-preview" class="card hidden">
      <h2>2. Select Shots</h2>
      <p class="hint">Click to deselect any shots you don't want in the video.</p>
      <div id="preview-grid" class="preview-grid"></div>
    </section>

    <!-- Step 3: Options -->
    <section id="step-options" class="card hidden">
      <h2>3. Video Options</h2>
      <div class="options-grid">
        <div class="option-group">
          <label>Format</label>
          <select id="opt-format">
            <option value="9:16">9:16 Vertical (Reels)</option>
            <option value="1:1">1:1 Square</option>
          </select>
        </div>
        <div class="option-group">
          <label>Style</label>
          <select id="opt-style">
            <option value="minimal">Clean & Minimal</option>
            <option value="branded">Branded (QQ Logo)</option>
            <option value="bold">Bold & Energetic</option>
          </select>
        </div>
        <div class="option-group">
          <label>Duration</label>
          <select id="opt-duration">
            <option value="15">~15 seconds</option>
            <option value="30">~30 seconds</option>
            <option value="60">~60 seconds</option>
          </select>
        </div>
        <div class="option-group">
          <label>Music</label>
          <select id="opt-music">
            <option value="">No music</option>
          </select>
        </div>
      </div>
      <button id="btn-generate" class="btn-primary">Generate Video</button>
      <div id="generate-status" class="status"></div>
    </section>

    <!-- Step 4: Download -->
    <section id="step-download" class="card hidden">
      <h2>4. Download</h2>
      <p id="download-msg">Your video is ready.</p>
      <a id="download-link" class="btn-primary" download>Download MP4</a>
      <button id="btn-reset" class="btn-secondary">Start Over</button>
    </section>
  </div>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `public/style.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0f0f0f;
  color: #f0f0f0;
  min-height: 100vh;
  padding: 2rem;
}

.app { max-width: 900px; margin: 0 auto; }

header { margin-bottom: 2rem; }
header h1 { font-size: 2rem; font-weight: 700; color: #fff; }
header .tagline { color: #888; margin-top: 0.25rem; }

.card {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
.card h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; color: #ccc; }

.hidden { display: none; }

.row { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }

#url-input {
  flex: 1;
  min-width: 200px;
  padding: 0.6rem 1rem;
  background: #111;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 0.95rem;
}
#url-input:focus { outline: none; border-color: #555; }

.viewport-toggle { display: flex; gap: 0.25rem; }
.viewport-toggle .toggle {
  padding: 0.5rem 0.9rem;
  background: #222;
  border: 1px solid #333;
  border-radius: 6px;
  color: #888;
  cursor: pointer;
  font-size: 0.85rem;
}
.viewport-toggle .toggle.active { background: #333; color: #fff; border-color: #555; }

.btn-primary {
  padding: 0.6rem 1.4rem;
  background: #fff;
  color: #000;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.95rem;
  text-decoration: none;
  display: inline-block;
}
.btn-primary:hover { background: #e0e0e0; }
.btn-primary:disabled { background: #444; color: #888; cursor: not-allowed; }

.btn-secondary {
  padding: 0.6rem 1.4rem;
  background: transparent;
  color: #aaa;
  border: 1px solid #444;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  font-size: 0.95rem;
  margin-left: 1rem;
}
.btn-secondary:hover { border-color: #666; color: #fff; }

.status {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: #888;
  min-height: 1.2rem;
}
.status.error { color: #f87171; }
.status.success { color: #4ade80; }

.hint { color: #666; font-size: 0.85rem; margin-bottom: 1rem; }

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
}
.preview-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #333;
  cursor: pointer;
  transition: border-color 0.15s;
}
.preview-item img { width: 100%; display: block; }
.preview-item.deselected { opacity: 0.3; border-color: #222; }
.preview-item .badge {
  position: absolute; top: 6px; left: 6px;
  background: #fff; color: #000;
  font-size: 0.7rem; font-weight: 700;
  padding: 2px 6px; border-radius: 4px;
}
.preview-item.deselected .badge { background: #444; color: #888; }

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.option-group label {
  display: block;
  font-size: 0.8rem;
  color: #888;
  margin-bottom: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.option-group select {
  width: 100%;
  padding: 0.6rem 0.8rem;
  background: #111;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
}
.option-group select:focus { outline: none; border-color: #555; }
```

- [ ] **Step 3: Create `public/app.js`**

```js
let capturedShots = [];
let viewport = 'desktop';

// Viewport toggle
document.querySelectorAll('.toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    viewport = btn.dataset.vp;
  });
});

// Capture
document.getElementById('btn-capture').addEventListener('click', async () => {
  const url = document.getElementById('url-input').value.trim();
  if (!url) return setStatus('capture-status', 'Please enter a URL.', 'error');

  const btn = document.getElementById('btn-capture');
  btn.disabled = true;
  setStatus('capture-status', 'Capturing website... this may take 20-30 seconds.', '');

  try {
    const res = await fetch('/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, viewport })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    capturedShots = data.screenshots.map(s => ({ ...s, selected: true }));
    renderPreview();
    show('step-preview');
    show('step-options');
    setStatus('capture-status', `Captured ${capturedShots.length} shots.`, 'success');
    loadMusicOptions();
  } catch (err) {
    setStatus('capture-status', 'Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

function renderPreview() {
  const grid = document.getElementById('preview-grid');
  grid.innerHTML = '';
  capturedShots.forEach((shot, i) => {
    const div = document.createElement('div');
    div.className = 'preview-item' + (shot.selected ? '' : ' deselected');
    div.innerHTML = `<img src="/${shot.file}" loading="lazy"><div class="badge">${i + 1}</div>`;
    div.addEventListener('click', () => {
      capturedShots[i].selected = !capturedShots[i].selected;
      div.classList.toggle('deselected');
    });
    grid.appendChild(div);
  });
}

async function loadMusicOptions() {
  try {
    const res = await fetch('/music-list');
    const { tracks } = await res.json();
    const sel = document.getElementById('opt-music');
    tracks.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t.replace(/\.[^.]+$/, '').replace(/-/g, ' ');
      sel.appendChild(opt);
    });
  } catch (_) {}
}

// Generate
document.getElementById('btn-generate').addEventListener('click', async () => {
  const selected = capturedShots.filter(s => s.selected).map(s => s.file);
  if (selected.length === 0) return setStatus('generate-status', 'Select at least one shot.', 'error');

  const btn = document.getElementById('btn-generate');
  btn.disabled = true;
  setStatus('generate-status', 'Generating video... this may take a minute.', '');

  try {
    const res = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clips: selected,
        format: document.getElementById('opt-format').value,
        style: document.getElementById('opt-style').value,
        duration: document.getElementById('opt-duration').value,
        music: document.getElementById('opt-music').value || null
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const link = document.getElementById('download-link');
    link.href = `/output/${data.file}`;
    link.download = data.file;
    document.getElementById('download-msg').textContent = `Video ready: ${data.file}`;
    show('step-download');
    setStatus('generate-status', 'Done!', 'success');
  } catch (err) {
    setStatus('generate-status', 'Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

// Reset
document.getElementById('btn-reset').addEventListener('click', () => {
  capturedShots = [];
  document.getElementById('url-input').value = '';
  document.getElementById('preview-grid').innerHTML = '';
  ['step-preview', 'step-options', 'step-download'].forEach(hide);
  setStatus('capture-status', '', '');
  setStatus('generate-status', '', '');
  document.getElementById('opt-music').innerHTML = '<option value="">No music</option>';
});

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }
function setStatus(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'status' + (type ? ' ' + type : '');
}
```

- [ ] **Step 4: Add `/music-list` endpoint to `server/index.js`**

Add this route before `app.listen`:

```js
const fs = require('fs');
app.get('/music-list', (req, res) => {
  const musicDir = path.join(__dirname, '../assets/music');
  const files = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3') || f.endsWith('.m4a'));
  res.json({ tracks: files });
});
```

Also add `const fs = require('fs');` at the top of `server/index.js` if not already there.

- [ ] **Step 5: Start server and verify UI**

```bash
node server/index.js
```

Open `http://localhost:3000` in browser. Verify:
- URL input and Capture button visible
- Desktop/Mobile toggle works
- Preview and Options sections are hidden initially

- [ ] **Step 6: Commit**

```bash
git add public/ server/index.js
git commit -m "feat: frontend UI with capture, preview, options, download sections"
```

---

## Task 5: End-to-End Test

**Files:** No new files — integration test of the full flow.

- [ ] **Step 1: Start the server**

```bash
node server/index.js
```

- [ ] **Step 2: Run full flow in browser**

1. Open `http://localhost:3000`
2. Paste `https://example.com`, select Desktop, click Capture
3. Wait for screenshots to appear in preview grid
4. Deselect one screenshot
5. Choose Format: 9:16, Style: Minimal, Duration: 15s, Music: none
6. Click Generate Video
7. Wait for generation to complete
8. Click Download MP4
9. Open the downloaded file and verify it plays correctly

Expected: A 15-second MP4 showing scrolling shots of example.com, 1080x1920, no audio.

- [ ] **Step 3: Test mobile viewport**

Repeat step 2 with Mobile selected. Verify screenshots are narrower (390px wide).

- [ ] **Step 4: Add a royalty-free music track (optional smoke test)**

Download any royalty-free MP3 (e.g. from pixabay.com/music), place it in `assets/music/`. Restart server. Verify it appears in the Music dropdown. Generate a video with it selected. Verify audio plays in the output MP4.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: end-to-end verified — capture, preview, generate, download working"
```

---

## Task 6: Windows Launcher Polish

**Files:**
- Modify: `start.bat`

- [ ] **Step 1: Update `start.bat` to wait for server before opening browser**

```bat
@echo off
echo Starting QQ VideoGen...
start "" /B node server/index.js
timeout /t 2 /nobreak > nul
start "" http://localhost:3000
echo Server running at http://localhost:3000
echo Close this window to stop the server.
node server/index.js
```

Note: The first `node server/index.js` runs in background (`/B`), then we wait 2s, open browser, then run it again in foreground to keep the window alive and show logs. Replace both lines with a single approach:

```bat
@echo off
echo Starting QQ VideoGen...
start "" /B cmd /c "timeout /t 2 /nobreak > nul && start http://localhost:3000"
node server/index.js
```

- [ ] **Step 2: Verify `start.bat` works**

Double-click `start.bat` in Windows Explorer. Verify:
- Terminal window opens
- Browser opens to `http://localhost:3000` after ~2 seconds
- Closing the terminal window stops the server

- [ ] **Step 3: Commit**

```bash
git add start.bat
git commit -m "feat: start.bat opens browser automatically after server starts"
```

---

## Notes

- **FFmpeg is bundled** via `ffmpeg-static` — no manual FFmpeg install needed.
- **Puppeteer downloads Chromium** on first `npm install` — this is ~170MB and is expected.
- **Bold/energetic style** currently uses the same render path as minimal (branding overlay only differs). A future enhancement could add zoom-pan (Ken Burns) effects via FFmpeg's `zoompan` filter.
- **Music tracks** must be placed manually in `assets/music/` — the app lists whatever is in that folder.
- **Output videos** accumulate in `output/` — delete old ones manually to save disk space.
