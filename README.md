# Caravan 2 — Fresh Install

Touch-friendly Caravan card game with Vite + React and GitHub Pages deploy.

## Quick Start

1. Create a clean folder and add these files (preserve structure).
2. Install:
   ```bash
   npm install
   ```
3. Run:
   ```bash
   npm run dev
   ```
   Open the Network URL on your phone to test touch.

## Deploy to GitHub Pages

- Set `base` in `vite.config.js` to `/<repo-name>/` (already `/caravan2/`).
- In GitHub repo: Settings → Pages → Build and deployment → Source: GitHub Actions.
- Push to `main`. Workflow publishes `dist/` automatically.

## Play

- Desktop: drag from Hand to a pile (numbers/Ace) or onto a specific card (faces).
- Mobile: tap a hand card to select, then tap a pile container (numbers/Ace) or a specific card in a pile (faces).
- Jack removes targeted card from scoring; King doubles the targeted number/Ace.