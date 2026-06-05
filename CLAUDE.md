# KICKFLIP — Build Notes

## Design decisions (recorded per spec instructions)

- **Renderer**: Vite + Three.js r184. Pixelated look via low render resolution (`setSize` at 0.45× pixel ratio) upscaled via CSS `image-rendering: pixelated`.
- **Audio**: Pure Web Audio API oscillators (no external sound files). Avoids download/format issues. Sounds are synthesized at runtime.
- **Icons**: Generated via `node scripts/gen-icons.js` (pure Node.js PNG encoder, no native deps).
- **Camera**: Three offset presets (cinematic / standard / overhead). Lerp follow with lag=0.08.
- **Board**: MeshToonMaterial at all tiers for flat-shaded retro look. 10 visual tiers per part.
- **Tricks**: Physics-based air time (real gravity). Combo detection via input sequence matching.
- **Leaderboard**: localStorage now. Firebase stub with clear comment block in `src/leaderboard.js`.
- **PWA**: `manifest.json` and `sw.js` live in `public/` so Vite copies them unhashed to `dist/` root. `base: './'` in vite.config.js for relative paths.
- **GitHub Pages**: GitHub Actions workflow in `.github/workflows/deploy.yml`. Builds on push to main, deploys `dist/` to Pages.

## Firebase setup (later)
See `src/leaderboard.js` — look for `FIREBASE_CONFIG` comment block. Fill in config and uncomment the firebase imports.

## Deployment
```
git push origin main
# → GitHub Actions builds and deploys to https://<username>.github.io/kickflip
```

## Local dev
```
npm run dev    # hot-reload dev server
npm run build  # production build to dist/
```
