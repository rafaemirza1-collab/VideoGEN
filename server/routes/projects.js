const express = require('express');
const db = require('../db');

const router = express.Router();

// List projects
router.get('/', (req, res) => {
  const projects = db.prepare('SELECT id, name, createdAt, updatedAt FROM projects ORDER BY updatedAt DESC').all();
  res.json({ projects });
});

// Get project
router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json({ ...project, data: JSON.parse(project.data) });
});

// Create/update project
router.put('/:id', (req, res) => {
  const { name, data } = req.body;
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);

  if (existing) {
    db.prepare('UPDATE projects SET name = ?, data = ?, updatedAt = ? WHERE id = ?')
      .run(name, JSON.stringify(data), now, req.params.id);
  } else {
    db.prepare('INSERT INTO projects (id, name, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.id, name, JSON.stringify(data), now, now);
  }
  res.json({ ok: true });
});

// Delete project
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
