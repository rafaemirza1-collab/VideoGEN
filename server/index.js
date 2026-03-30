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

app.get('/music-list', (req, res) => {
  const musicDir = path.join(__dirname, '../assets/music');
  const files = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3') || f.endsWith('.m4a'));
  res.json({ tracks: files });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`QQ VideoGen API running at http://localhost:${PORT}`));
