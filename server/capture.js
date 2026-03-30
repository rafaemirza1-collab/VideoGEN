const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '../output');

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 844 }
};

// Selectors to try clicking to dismiss cookie banners / popups
const DISMISS_SELECTORS = [
  // Common accept/close button patterns
  '[id*="accept"]', '[class*="accept"]',
  '[id*="cookie"] button', '[class*="cookie"] button',
  '[id*="consent"] button', '[class*="consent"] button',
  '[id*="gdpr"] button', '[class*="gdpr"] button',
  '[aria-label*="Accept"]', '[aria-label*="Close"]', '[aria-label*="Dismiss"]',
  'button[class*="close"]', 'button[class*="dismiss"]',
  '.cc-accept', '.cc-btn', '#onetrust-accept-btn-handler',
  '.cookie-notice button', '.cookie-banner button',
  '[data-testid*="accept"]', '[data-testid*="close"]',
];

async function dismissOverlays(page) {
  for (const selector of DISMISS_SELECTORS) {
    try {
      const el = await page.$(selector);
      if (el) {
        await el.click();
        await new Promise(r => setTimeout(r, 400));
        break;
      }
    } catch (_) {}
  }

  // Also remove fixed/sticky overlays that block content via JS
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      if (
        (style.position === 'fixed' || style.position === 'sticky') &&
        el !== document.body &&
        el !== document.documentElement
      ) {
        const rect = el.getBoundingClientRect();
        // Only remove if it's a large overlay (>30% screen width and height)
        if (rect.width > window.innerWidth * 0.3 && rect.height > window.innerHeight * 0.2) {
          el.style.display = 'none';
        }
      }
    });
  });
}

async function captureWebsite(url, viewport = 'desktop') {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-notifications']
    });
    const page = await browser.newPage();
    const vp = VIEWPORTS[viewport] || VIEWPORTS.desktop;
    await page.setViewport(vp);

    // Block cookie consent scripts from loading where possible
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (/cookiebot|onetrust|cookiepro|quantcast|trustarc/.test(url)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for page to settle then dismiss overlays
    await new Promise(r => setTimeout(r, 1000));
    await dismissOverlays(page);
    await new Promise(r => setTimeout(r, 500));

    const sessionId = Date.now();
    const sessionDir = path.join(OUTPUT_DIR, `session_${sessionId}`);
    fs.mkdirSync(sessionDir, { recursive: true });

    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const screenshots = [];
    let index = 0;

    // Smooth scroll: scroll in small increments, capturing every viewportHeight * 0.75
    const step = Math.floor(vp.height * 0.75);
    const maxShots = 20;

    for (let scrollY = 0; scrollY < pageHeight && index < maxShots; scrollY += step) {
      // Smooth scroll to position
      await page.evaluate((targetY) => {
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }, scrollY);

      // Wait for scroll and any lazy-loaded content
      await new Promise(r => setTimeout(r, 600));

      // Dismiss any overlays that appeared during scroll
      if (index === 0) await dismissOverlays(page);

      const file = path.join(sessionDir, `shot_${String(index).padStart(3, '0')}.png`);
      await page.screenshot({ path: file });
      screenshots.push({ file: path.relative(path.join(__dirname, '..'), file), index });
      index++;
    }

    return { sessionId, screenshots, viewport };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { captureWebsite };
