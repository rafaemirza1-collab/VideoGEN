# QQ VideoGen — Progress Log

## What We Built
A local web app that captures any website visually and exports an Instagram-ready MP4 video.

## Status: In Progress

### Completed
- [x] Task 1: Project scaffold (Node.js + Express server, folder structure, start.bat)
- [x] Task 2: Puppeteer website capture (scroll screenshots, desktop + mobile viewport)
- [x] Task 3: FFmpeg video renderer (scale, concat, branding overlay, audio support)
- [x] Task 4: Frontend UI (dark theme, capture → preview → options → download flow)

### In Progress
- [ ] Task 5: Deploy to Google Cloud VPS
- [ ] Task 6: Windows launcher polish

## App Location
`C:/Users/rafae/QQVideoGen/`

## Server Details
- Provider: Google Cloud (free $300 trial)
- Instance: `qq-videogen`
- External IP: `34.24.58.8`
- OS: Ubuntu 24.04 LTS
- Size: e2-small (2GB RAM)

## How to Run Locally
1. Open cmd
2. `cd C:\Users\rafae\QQVideoGen`
3. `node server/index.js`
4. Open browser → `http://localhost:3000`

## Next Steps
1. Set up GitHub account to push code
2. Pull code onto Google Cloud server
3. Install Node.js + dependencies on server
4. Run app on server with PM2 (keeps it running 24/7)
5. Access via `http://34.24.58.8`

## Pending Feature Upgrades (requested)
- Video preview in app before downloading
- Smoother human-like scrolling
- Auto-click through website tabs/navigation
