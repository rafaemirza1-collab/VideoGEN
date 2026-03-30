const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const TEMPLATES_DIR = path.join(__dirname, '../templates');

function loadTemplates() {
  const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf-8'));
    return data;
  });
}

// List all templates
router.get('/', (req, res) => {
  const templates = loadTemplates();
  const { category } = req.query;
  if (category && category !== 'all') {
    res.json({ templates: templates.filter(t => t.category === category) });
  } else {
    res.json({ templates });
  }
});

// Get single template
router.get('/:id', (req, res) => {
  const templates = loadTemplates();
  const template = templates.find(t => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Not found' });
  res.json(template);
});

module.exports = router;
