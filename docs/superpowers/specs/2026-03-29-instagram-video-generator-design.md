# QQ Solutions Instagram Video Generator — Design Spec
Date: 2026-03-29

## Overview
A local web app that takes a website URL, captures the site visually, and generates a polished Instagram-ready MP4 video. For internal use by QQ Solutions only — no domain, no hosting required.

## Architecture
- **Frontend:** Single HTML/CSS/JS page (no frameworks) at `http://localhost:3000`
- **Backend:** Node.js + Express server handling capture and video assembly
- **Launch:** `start.bat` double-click starts the server and opens the browser automatically

## Core Flow
1. User pastes a website URL
2. Backend launches Puppeteer (headless Chromium), captures a scroll recording + section screenshots (desktop or mobile viewport)
3. Frontend shows captured clips/screenshots — user can deselect any
4. User chooses options:
   - **Format:** 9:16 vertical (Reels) or 1:1 square
   - **Style:** Clean/minimal, Branded (QQ logo + text callouts), Bold/energetic
   - **Music:** pick from royalty-free library or none
   - **Duration:** ~15s, ~30s, or ~60s
5. User clicks Generate — FFmpeg assembles clips, applies transitions, overlays branding if selected, mixes in music
6. Download button appears — user saves MP4 and posts to Instagram

## Tech Stack
- Node.js + Express (server)
- Puppeteer (headless browser for site capture)
- FFmpeg (video assembly, transitions, audio mixing)
- Plain HTML/CSS/JS (frontend)
- `start.bat` (Windows launcher)

## File Structure
```
QQVideoGen/
  server/
    index.js          # Express server + API routes
    capture.js        # Puppeteer capture logic
    render.js         # FFmpeg video assembly logic
  public/
    index.html        # Main UI
    style.css
    app.js
  assets/
    music/            # Royalty-free tracks
    branding/         # QQ Solutions logo, fonts, colors
  output/             # Generated videos saved here
  start.bat           # Windows launcher
  package.json
```

## API Endpoints
- `POST /capture` — accepts URL + viewport, returns list of captured clip/screenshot paths
- `POST /generate` — accepts selected clips + options, triggers FFmpeg, returns video path
- `GET /output/:filename` — serves generated video for download

## Video Output Specs
- Format: MP4 (H.264)
- Resolutions: 1080x1920 (9:16) or 1080x1080 (1:1)
- Frame rate: 30fps
- Audio: AAC

## Out of Scope
- Multi-user / client access
- Cloud hosting or domain
- Scheduling or auto-posting to Instagram
