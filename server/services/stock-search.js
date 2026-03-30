/**
 * Stock Visual Search Service
 * Uses Pexels API to find stock photos matching scene descriptions.
 * Falls back to placeholder colors if no API key.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const CACHE_DIR = path.join(__dirname, '../../uploads/stock');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

async function searchStock(query, count = 1) {
  if (!PEXELS_API_KEY) {
    return generatePlaceholders(query, count);
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=portrait`;
    const res = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
    });
    const data = await res.json();
    if (!res.ok || !data.photos?.length) {
      return generatePlaceholders(query, count);
    }

    const results = [];
    for (const photo of data.photos.slice(0, count)) {
      const imageUrl = photo.src.large2x || photo.src.large || photo.src.medium;
      const filename = `stock_${photo.id}.jpg`;
      const filepath = path.join(CACHE_DIR, filename);

      if (!fs.existsSync(filepath)) {
        await downloadFile(imageUrl, filepath);
      }
      results.push({
        id: photo.id,
        filename,
        path: `../uploads/stock/${filename}`,
        source: 'pexels',
        photographer: photo.photographer,
      });
    }
    return results;
  } catch (err) {
    console.error('Pexels search failed:', err.message);
    return generatePlaceholders(query, count);
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function generatePlaceholders(query, count) {
  // Generate colored placeholder images using a simple approach
  const colors = ['#1e3a5f', '#2d4a22', '#5f1e3a', '#3a1e5f', '#5f4a1e', '#1e5f5f'];
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push({
      id: `placeholder_${Date.now()}_${i}`,
      filename: null,
      path: null,
      source: 'placeholder',
      color: colors[i % colors.length],
      query,
    });
  }
  return results;
}

module.exports = { searchStock };
