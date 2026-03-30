const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

// List brands
router.get('/', (req, res) => {
  const brands = db.prepare('SELECT * FROM brands ORDER BY updatedAt DESC').all();
  res.json({ brands });
});

// Get brand
router.get('/:id', (req, res) => {
  const brand = db.prepare('SELECT * FROM brands WHERE id = ?').get(req.params.id);
  if (!brand) return res.status(404).json({ error: 'Not found' });
  res.json(brand);
});

// Create brand
router.post('/', (req, res) => {
  const { name, logo, primaryColor, secondaryColor, accentColor, headingFont, bodyFont } = req.body;
  const id = crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO brands (id, name, logo, primaryColor, secondaryColor, accentColor, headingFont, bodyFont, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name || 'Untitled Brand', logo || '', primaryColor || '#ffffff', secondaryColor || '#000000', accentColor || '#3b82f6', headingFont || 'sans-serif', bodyFont || 'sans-serif', now, now);
  res.json({ id, name, logo, primaryColor, secondaryColor, accentColor, headingFont, bodyFont });
});

// Update brand
router.put('/:id', (req, res) => {
  const { name, logo, primaryColor, secondaryColor, accentColor, headingFont, bodyFont } = req.body;
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE brands SET name=?, logo=?, primaryColor=?, secondaryColor=?, accentColor=?, headingFont=?, bodyFont=?, updatedAt=? WHERE id=?'
  ).run(name, logo || '', primaryColor, secondaryColor, accentColor, headingFont, bodyFont, now, req.params.id);
  res.json({ ok: true });
});

// Delete brand
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM brands WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
