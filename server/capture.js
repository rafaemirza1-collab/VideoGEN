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

  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const screenshots = [];
  let scrollY = 0;
  let index = 0;

  while (scrollY < pageHeight) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await new Promise(r => setTimeout(r, 300));
    const file = path.join(sessionDir, `shot_${String(index).padStart(3, '0')}.png`);
    await page.screenshot({ path: file });
    screenshots.push({ file: path.relative(path.join(__dirname, '..'), file), index });
    scrollY += vp.height * 0.8;
    index++;
    if (index > 20) break;
  }

  await browser.close();
  return { sessionId, screenshots, viewport };
}

module.exports = { captureWebsite };
