const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const OUTPUT_DIR = path.join(__dirname, '../output');

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile:  { width: 390,  height: 844 }
};

const DISMISS_SELECTORS = [
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

// ─── helpers ────────────────────────────────────────────────────────────────

async function dismissOverlays(page) {
  for (const sel of DISMISS_SELECTORS) {
    try {
      const el = await page.$(sel);
      if (el) { await el.click(); await sleep(400); break; }
    } catch (_) {}
  }
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach(el => {
      const s = window.getComputedStyle(el);
      if ((s.position === 'fixed' || s.position === 'sticky') &&
          el !== document.body && el !== document.documentElement) {
        const r = el.getBoundingClientRect();
        if (r.width > window.innerWidth * 0.3 && r.height > window.innerHeight * 0.2)
          el.style.display = 'none';
      }
    });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Eased scroll — captures frames WHILE scrolling for fluid motion
async function easeScroll(page, frames, sessionDir, fromY, toY, durationMs, fps) {
  const totalFrames = Math.ceil((durationMs / 1000) * fps);
  for (let i = 0; i < totalFrames; i++) {
    const t = i / totalFrames;
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out
    const y = Math.round(fromY + (toY - fromY) * ease);
    await page.evaluate(y => window.scrollTo(0, y), y);
    await captureFrame(page, frames, sessionDir);
    await sleep(1000 / fps);
  }
}

// Move cursor smoothly from (x1,y1) to (x2,y2) while capturing
async function easeMouseMove(page, frames, sessionDir, x1, y1, x2, y2, durationMs, fps) {
  const totalFrames = Math.ceil((durationMs / 1000) * fps);
  for (let i = 0; i < totalFrames; i++) {
    const t = i / totalFrames;
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const x = Math.round(x1 + (x2 - x1) * ease);
    const y = Math.round(y1 + (y2 - y1) * ease);
    await page.mouse.move(x, y);
    await captureFrame(page, frames, sessionDir);
    await sleep(1000 / fps);
  }
}

let _frameIndex = 0;
async function captureFrame(page, frames, sessionDir) {
  const file = path.join(sessionDir, `frame_${String(_frameIndex).padStart(5, '0')}.png`);
  await page.screenshot({ path: file });
  frames.push(file);
  _frameIndex++;
}

// Hold still for N ms, capturing frames
async function hold(page, frames, sessionDir, ms, fps) {
  const n = Math.ceil((ms / 1000) * fps);
  for (let i = 0; i < n; i++) {
    await captureFrame(page, frames, sessionDir);
    await sleep(1000 / fps);
  }
}

// Inject a visible cursor overlay into the page
async function injectCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('__qq_cursor')) return;
    const el = document.createElement('div');
    el.id = '__qq_cursor';
    el.style.cssText = `
      position: fixed; top: 0; left: 0; width: 18px; height: 18px;
      border-radius: 50%; background: rgba(255,255,255,0.9);
      border: 2px solid rgba(0,0,0,0.4); pointer-events: none;
      z-index: 999999; transform: translate(-50%,-50%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3); transition: transform 0.1s;
    `;
    document.body.appendChild(el);

    document.addEventListener('mousemove', e => {
      el.style.left = e.clientX + 'px';
      el.style.top  = e.clientY + 'px';
    }, { passive: true });
  });
}

// ─── main export ────────────────────────────────────────────────────────────

async function captureWebsite(url, viewport = 'desktop') {
  _frameIndex = 0;
  const FPS = 24;
  const sessionId = Date.now();
  const sessionDir = path.join(OUTPUT_DIR, `session_${sessionId}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', '--disable-setuid-sandbox',
        '--disable-notifications', '--disable-infobars',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();
    const vp = VIEWPORTS[viewport] || VIEWPORTS.desktop;
    await page.setViewport(vp);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Block consent managers
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (/cookiebot|onetrust|cookiepro|quantcast|trustarc/.test(req.url())) req.abort();
      else req.continue();
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Wait a bit for JS to render after DOM loads
    await sleep(2000);
    await sleep(1500);
    await dismissOverlays(page);
    await sleep(500);
    await injectCursor(page);

    const frames = [];
    const pageH   = await page.evaluate(() => document.body.scrollHeight);
    const vph     = vp.height;
    const vpw     = vp.width;

    // ── SCENE 1: Hero — cursor drifts in, holds ──────────────────────────
    await page.mouse.move(vpw * 0.1, vph * 0.1);
    await easeMouseMove(page, frames, sessionDir, vpw * 0.1, vph * 0.1, vpw * 0.5, vph * 0.35, 900, FPS);
    await hold(page, frames, sessionDir, 1200, FPS);

    // Hover over first CTA button if present
    try {
      const cta = await page.$('a[href], button, .btn, [class*="cta"], [class*="hero"] a');
      if (cta) {
        const box = await cta.boundingBox();
        if (box) {
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          await easeMouseMove(page, frames, sessionDir, vpw * 0.5, vph * 0.35, cx, cy, 700, FPS);
          await hold(page, frames, sessionDir, 600, FPS); // hover pause
        }
      }
    } catch (_) {}

    // ── SCENE 2: Scroll through sections ─────────────────────────────────
    const scrollStops = [];
    for (let y = Math.floor(vph * 0.65); y < pageH - vph; y += Math.floor(vph * 0.72)) {
      scrollStops.push(y);
      if (scrollStops.length >= 5) break;
    }

    let currentScrollY = 0;
    for (let i = 0; i < scrollStops.length; i++) {
      const targetY = scrollStops[i];

      // Scroll into section
      await easeScroll(page, frames, sessionDir, currentScrollY, targetY, 1300, FPS);
      currentScrollY = targetY;

      // Subtle cursor drift while reading
      const mx1 = vpw * (0.2 + Math.random() * 0.3);
      const my1 = vph * (0.3 + Math.random() * 0.3);
      const mx2 = vpw * (0.3 + Math.random() * 0.4);
      const my2 = vph * (0.4 + Math.random() * 0.2);
      await easeMouseMove(page, frames, sessionDir, mx1, my1, mx2, my2, 800, FPS);

      // Hover over an interactive element in viewport if found
      try {
        const interactives = await page.$$('a, button, [class*="card"], [class*="feature"], [class*="service"], [class*="item"]');
        for (const el of interactives) {
          const box = await el.boundingBox();
          if (box && box.y > currentScrollY && box.y < currentScrollY + vph - 100) {
            await easeMouseMove(page, frames, sessionDir, mx2, my2, box.x + box.width / 2, box.y + box.height / 2 - currentScrollY, 600, FPS);
            await hold(page, frames, sessionDir, 500, FPS);
            break;
          }
        }
      } catch (_) {}

      // Hold on section
      await hold(page, frames, sessionDir, i === 0 ? 1800 : 1200, FPS);
    }

    // ── SCENE 3: Navigate via nav links ──────────────────────────────────
    await easeScroll(page, frames, sessionDir, currentScrollY, 0, 900, FPS);
    currentScrollY = 0;
    await sleep(300);

    const navSelectors = ['nav a', 'header a', '[role="tab"]', '.nav-link', '.navbar a', '[class*="menu"] a'];
    const clickedLinks = new Set();

    for (const sel of navSelectors) {
      try {
        const links = await page.$$(sel);
        for (const link of links.slice(1, 5)) { // skip first (usually logo/home)
          const box = await link.boundingBox();
          const text = await page.evaluate(el => el.innerText?.trim(), link);
          if (!box || !text || clickedLinks.has(text) || text.length > 30) continue;
          clickedLinks.add(text);

          // Move cursor to nav link
          await easeMouseMove(page, frames, sessionDir,
            vpw * 0.5, 30,
            box.x + box.width / 2, box.y + box.height / 2,
            500, FPS
          );
          await hold(page, frames, sessionDir, 300, FPS); // hover
          await link.click();
          await sleep(1000);
          await dismissOverlays(page);

          // Hold on new section/page
          const newH = await page.evaluate(() => document.body.scrollHeight);
          await hold(page, frames, sessionDir, 1200, FPS);

          // Scroll down a bit in this section
          if (newH > vph * 1.3) {
            await easeScroll(page, frames, sessionDir, 0, Math.floor(vph * 0.7), 1100, FPS);
            await hold(page, frames, sessionDir, 900, FPS);
            await easeScroll(page, frames, sessionDir, Math.floor(vph * 0.7), 0, 800, FPS);
          }

          currentScrollY = 0;
          if (clickedLinks.size >= 3) break;
        }
        if (clickedLinks.size >= 3) break;
      } catch (_) {}
    }

    // ── SCENE 4: Final scroll to footer ──────────────────────────────────
    const finalH = await page.evaluate(() => document.body.scrollHeight);
    if (finalH > vph * 2) {
      await easeScroll(page, frames, sessionDir, 0, finalH - vph, 2000, FPS);
      await hold(page, frames, sessionDir, 1000, FPS);
    }

    // ── Build MP4 from frames ─────────────────────────────────────────────
    const videoFile = path.join(OUTPUT_DIR, `capture_${sessionId}.mp4`);
    await new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, [
        '-y',
        '-framerate', String(FPS),
        '-i', path.join(sessionDir, 'frame_%05d.png'),
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-movflags', '+faststart',
        videoFile
      ]);
      let stderr = '';
      proc.stderr.on('data', d => stderr += d);
      proc.on('close', code => code === 0 ? resolve() : reject(new Error(stderr.slice(-300))));
      proc.on('error', reject);
    });

    // Cleanup frames
    try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (_) {}

    // Return just the filename, not a relative path — served via /output/:file
    const videoFilename = path.basename(videoFile);
    return {
      sessionId,
      screenshots: [{ file: videoFilename, index: 0, isVideo: true }],
      videoFile: videoFilename,
      viewport
    };

  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { captureWebsite };
