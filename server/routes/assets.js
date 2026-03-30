const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const id = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|mp4|mov|webm|mp3|m4a|wav|ogg|svg)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

// Upload asset
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = path.extname(req.file.originalname).toLowerCase();
  let type = 'other';
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(ext)) type = 'image';
  else if (/\.(mp4|mov|webm)$/i.test(ext)) type = 'video';
  else if (/\.(mp3|m4a|wav|ogg)$/i.test(ext)) type = 'audio';

  const id = path.parse(req.file.filename).name;
  const asset = {
    id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    type,
    createdAt: new Date().toISOString(),
  };

  db.prepare(
    'INSERT INTO assets (id, filename, originalName, mimetype, size, type, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(asset.id, asset.filename, asset.originalName, asset.mimetype, asset.size, asset.type, asset.createdAt);

  res.json(asset);
});

// List assets
router.get('/', (req, res) => {
  const { type } = req.query;
  let assets;
  if (type) {
    assets = db.prepare('SELECT * FROM assets WHERE type = ? ORDER BY createdAt DESC').all(type);
  } else {
    assets = db.prepare('SELECT * FROM assets ORDER BY createdAt DESC').all();
  }
  res.json({ assets });
});

// Delete asset
router.delete('/:id', (req, res) => {
  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Not found' });

  const filePath = path.join(UPLOADS_DIR, asset.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
