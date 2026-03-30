const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const OUTPUT_DIR = path.join(__dirname, '../output');

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 844 }
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
  // Nuke fixed overlays
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      if ((style.position === 'fixed' || style.position === 'sticky') &&
          el !== document.body && el !== document.documentElement) {
        const rect = el.getBoundingClientRect();
        if (rect.width > window.innerWidth * 0.3 && rect.height > window.innerHeight * 0.2) {
          el.style.display = 'none';
        }
      }
    });
  });
}

// Smoothly scroll to a target Y position pixel by pixel
async function smoothScrollTo(page, targetY, duration = 1200) {
  await page.evaluate(async (target, dur) => {
    const start = window.scrollY;
    const distance = target - start;
    const startTime = performance.now();
    await new Promise(resolve => {
      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / dur, 1);
        // Ease in-out
        const ease = progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;
        window.scrollTo(0, start + distance * ease);
        if (progress < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }, targetY, duration);
}

// Record frames during a browser session, return array of PNG paths
async function recordFrames(page, sessionDir, fps, durationMs) {
  const frameInterval = 1000 / fps;
  const totalFrames = Math.ceil((durationMs / 1000) * fps);
  const frames = [];

  for (let i = 0; i < totalFrames; i++) {
    const file = path.join(sessionDir, `frame_${String(i).padStart(5, '0')}.png`);
    await page.screenshot({ path: file });
    frames.push(file);
    await new Promise(r => setTimeout(r, frameInterval));
  }
  return frames;
}

// Convert frames to MP4 using ffmpeg
function framesToVideo(sessionDir, outputFile, fps) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, [
      '-y',
      '-framerate', String(fps),
      '-i', path.join(sessionDir, 'frame_%05d.png'),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outputFile
    ]);
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
    proc.on('error', reject);
  });
}

async function captureWebsite(url, viewport = 'desktop') {
  let browser;
  const FPS = 24;
  const sessionId = Date.now();
  const sessionDir = path.join(OUTPUT_DIR, `session_${sessionId}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-notifications', '--disable-infobars']
    });
    const page = await browser.newPage();
    const vp = VIEWPORTS[viewport] || VIEWPORTS.desktop;
    await page.setViewport(vp);

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (/cookiebot|onetrust|cookiepro|quantcast|trustarc/.test(req.url())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1200));
    await dismissOverlays(page);
    await new Promise(r => setTimeout(r, 600));

    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = vp.height;

    // --- Step 1: Detect nav links/tabs ---
    const navLinks = await page.evaluate(() => {
      const candidates = [];
      const seen = new Set();

      // Look for nav, header, tabs
      const navEls = document.querySelectorAll('nav a, header a, [role="tablist"] [role="tab"], .nav a, .navbar a, .menu a, .tabs a, [class*="nav"] a, [class*="tab"]:not(input)');
      navEls.forEach(el => {
        const text = el.innerText?.trim();
        const href = el.href || '';
        if (text && text.length < 40 && !seen.has(text) && !href.includes('mailto') && !href.includes('tel')) {
          seen.add(text);
          candidates.push({ text, selector: null }); // can't pass element refs
        }
      });
      return candidates.slice(0, 6); // max 6 nav items
    });

    const allFrames = [];

    // --- Step 2: Record opening (scroll from top to bottom) ---
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 400));

    // Capture top section (2s)
    const topFrames = await recordFrames(page, sessionDir, FPS, 2000);
    allFrames.push(...topFrames);

    // Scroll through the page smoothly
    const scrollStops = [];
    for (let y = viewportHeight * 0.6; y < pageHeight; y += viewportHeight * 0.7) {
      scrollStops.push(Math.floor(y));
    }

    for (const targetY of scrollStops.slice(0, 5)) {
      // Smooth scroll — capture frames WHILE scrolling
      const scrollDur = 1400;
      const scrollFrames = Math.ceil((scrollDur / 1000) * FPS);
      const startY = await page.evaluate(() => window.scrollY);
      const dist = targetY - startY;

      for (let f = 0; f < scrollFrames; f++) {
        const progress = f / scrollFrames;
        const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        await page.evaluate((y) => window.scrollTo(0, y), Math.round(startY + dist * ease));
        const file = path.join(sessionDir, `frame_${String(allFrames.length).padStart(5, '0')}.png`);
        await page.screenshot({ path: file });
        allFrames.push(file);
        await new Promise(r => setTimeout(r, 1000 / FPS));
      }

      // Pause and hold on this section (1.5s)
      const holdFrames = await recordFrames(page, sessionDir, FPS, 1500);
      allFrames.push(...holdFrames);
    }

    // --- Step 3: Click nav tabs if found, show each section ---
    if (navLinks.length > 1) {
      // Scroll back to top first
      await smoothScrollTo(page, 0, 800);
      await new Promise(r => setTimeout(r, 500));

      const tabSelectors = [
        'nav a', 'header a', '[role="tab"]', '.nav a', '.navbar a',
        '.menu a', '.tabs a', '[class*="nav"] a', '[class*="tab"]:not(input)'
      ];

      for (let t = 0; t < Math.min(navLinks.length, 5); t++) {
        try {
          // Find and click the nth nav link
          let clicked = false;
          for (const sel of tabSelectors) {
            const els = await page.$$(sel);
            if (els[t]) {
              // Hover first (human-like)
              await els[t].hover();
              await new Promise(r => setTimeout(r, 300));
              await els[t].click();
              clicked = true;
              break;
            }
          }
          if (!clicked) continue;

          await new Promise(r => setTimeout(r, 1000));
          await dismissOverlays(page);

          // Capture this tab/page (2s hold + scroll)
          const tabTop = await recordFrames(page, sessionDir, FPS, 1500);
          allFrames.push(...tabTop);

          // Scroll down a bit on this tab
          const tabHeight = await page.evaluate(() => document.body.scrollHeight);
          if (tabHeight > viewportHeight * 1.5) {
            const midY = Math.floor(viewportHeight * 0.8);
            const startY2 = await page.evaluate(() => window.scrollY);
            const scrollFrames2 = Math.ceil((1200 / 1000) * FPS);
            for (let f = 0; f < scrollFrames2; f++) {
              const progress = f / scrollFrames2;
              const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
              await page.evaluate((y) => window.scrollTo(0, y), Math.round(startY2 + midY * ease));
              const file = path.join(sessionDir, `frame_${String(allFrames.length).padStart(5, '0')}.png`);
              await page.screenshot({ path: file });
              allFrames.push(file);
              await new Promise(r => setTimeout(r, 1000 / FPS));
            }
            const holdFrames2 = await recordFrames(page, sessionDir, FPS, 1000);
            allFrames.push(...holdFrames2);
          }
        } catch (_) {}
      }
    }

    // --- Step 4: Convert frames to video ---
    // Rename frames sequentially (they may have gaps)
    allFrames.forEach((f, i) => {
      const newName = path.join(sessionDir, `final_${String(i).padStart(5, '0')}.png`);
      if (f !== newName) fs.renameSync(f, newName);
    });

    const videoFile = path.join(OUTPUT_DIR, `capture_${sessionId}.mp4`);
    await new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, [
        '-y',
        '-framerate', String(FPS),
        '-i', path.join(sessionDir, 'final_%05d.png'),
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-movflags', '+faststart',
        videoFile
      ]);
      proc.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
      proc.on('error', reject);
    });

    // Cleanup frames
    try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (_) {}

    // Return as a single "screenshot" that's actually a video
    return {
      sessionId,
      screenshots: [{ file: path.relative(path.join(__dirname, '..'), videoFile), index: 0, isVideo: true }],
      videoFile: path.relative(path.join(__dirname, '..'), videoFile),
      viewport
    };

  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { captureWebsite };
