# KICKFLIP — Master Build Prompt
### An Infinite Skating PWA for iPhone (HTML/JS/Three.js)
> Built for: You & Benjamin | Deployed via GitHub Pages → Safari → Add to Home Screen

---

## 🎯 VISION IN ONE SENTENCE
An infinite, never-ending skateboarding game — no character, just a board — that runs in the browser, installs like an app, and never stops giving you more to unlock, master, and flex.

---

## 🏗️ TECH STACK

| Layer | Tool |
|---|---|
| Renderer | Three.js (r160+) |
| Language | Vanilla JS (ES Modules) |
| PWA | `manifest.json` + Service Worker (offline-first) |
| Hosting | GitHub Pages |
| Install | Safari → Share → Add to Home Screen |
| Leaderboard | Firebase Firestore (free tier) — async score/combo sharing between users |
| Audio | Howler.js |
| Storage | localStorage for progression, board state, unlocks |

---

## 📐 CAMERA & PERSPECTIVE

- **Isometric-ish 3D angle** — camera sits high and to the side (like a classic skate video filming angle: low and 45°), tilted so you can clearly see the board flip, rotate, and land
- Board travels **left to right** across an infinite procedurally generated street
- Camera follows the board with **slight lag/smoothing** (cinematic feel)
- On trick execution, camera can **slightly zoom in** and then snap back on land
- On combos, the camera **slowly pulls back** to show how far you've gone

---

## 🎨 ART STYLE — Retro Pixel-ish 3D

- Use **Three.js with a pixelated renderer** (`renderer.setPixelRatio(0.5)` + low-res render target upscaled) for that chunky retro look
- All geometry is **low-poly, blocky** — board, obstacles, ground tiles are all made of flat-shaded geometry with no smoothing
- Ground: tiled pixel-art-style concrete slabs, hand-drawn-looking cracks and seams
- Color palette: muted urban tones (grey asphalt, faded yellow lines) with **neon accents** for trick flashes and UI
- **Impact frames**: on landing, freeze 1–2 frames and flash a pixelated shockwave ring around the board — Skate Story-inspired hit-stop effect
- Font: a pixel/retro font (e.g. Press Start 2P from Google Fonts) for all UI, trick names, and rank display
- Trick name callouts appear in large pixel text mid-air then dissolve upward
- Inspired by: **Skate Story** (atmosphere, board-only, rawness) + **classic Tony Hawk** (trick logic, combo system)

---

## 🛹 THE BOARD (Only Thing On Screen)

- No skater. Only the board. It is the hero.
- Rendered as a low-poly deck with trucks and wheels visible from the 3/4 angle
- **Every part of the board upgrades visually based on mastery:**

| Part | Upgrade Path |
|---|---|
| Deck | Worn wood → painted graphic → cleaner graphic → glowing graphic → golden graphic → mythic animated graphic |
| Wheels | Grey → colored → chrome → glowing → particle trail emitting |
| Trucks | Matte black → brushed silver → gold → holographic sheen |
| Grip tape | Plain black → subtle pattern → neon color → animated noise texture |

- Upgrades are **per-trick-mastery**: landing a kickflip clean 10 times improves deck color slightly; 50 times it gets a graphic; 100+ it glows; 500+ it becomes golden/metallic
- Each part has its own mastery counter — you can have gold trucks but grey wheels if you grind more than you flip
- Parts have **~10 visual tiers** each, with the top tiers being animated (shimmer, glow pulse, particle effects)
- Use Three.js materials: MeshToonMaterial base, upgrade to MeshStandardMaterial with emissive maps at higher tiers, custom ShaderMaterial for glow/metallic at top tiers

---

## 🎮 INPUT SYSTEM — The Button Layout

### Default Layout (Based on Sketch)
- **Left side of screen**: 3 stacked buttons (top-left cluster)
- **Right side of screen**: 2 stacked buttons (right cluster)
- Buttons are **semi-transparent pixel-art styled rectangles** with icons/labels

### Button Actions (Default)
| Button | Single Tap | Double Tap | Hold |
|---|---|---|---|
| Left Top | Kickflip | Heelflip | — |
| Left Mid | Pop Shuvit | Backside 180 | — |
| Left Bot | Varial Flip | Hardflip | — |
| Right Top | Frontside Grind | — | Hold for longer grind |
| Right Bot | Jump / Ollie | — | Hold for higher ollie |

### Combo System
- Trick inputs can be **chained mid-air** for combo tricks:
  - Pop Shuvit → Kickflip input = **Tre Flip (360 Flip)**
  - Ollie → 180 input = **Frontside/Backside 180**
  - Double tap any flip = **Double Flip**
  - Grind → Flip out = **Grind + Flip Out**
- Combos are read as **input sequences within a time window** (~400ms)
- Show combo name in large pixel text above the board as it executes

### Button Customization (Settings)
- Drag-and-drop button repositioning anywhere on screen
- Slider for **opacity** (10% → 100%)
- Toggle button **style**: Minimal (outline only) / Retro (filled pixel blocks) / Invisible (haptic only)
- Button **size** adjustment (S / M / L)
- All saved to localStorage

---

## 🏆 PROGRESSION SYSTEM — Infinite & Never Stops

### Three Parallel Systems (All Running Simultaneously)

#### 1. XP + Named Ranks
- Every landed trick earns XP (base value × combo multiplier × clean landing bonus)
- Slam = lose current combo multiplier, small XP penalty
- Ranks (never-ending, always more above):
  ```
  Parking Lot → Weekend Warrior → Street Rat → Local Am → Flow Rider →
  Sponsored Am → Shop Pro → Regional Pro → National Pro → Legend →
  Hall of Fame → Myth → Ghost → [Procedurally generated titles beyond]
  ```
- Each rank unlocks: new trick type, new obstacle type, or new board tier access

#### 2. Combo Multiplier Score
- Land tricks back-to-back without slamming = multiplier builds (1x → 2x → 5x → 10x → MAX 99x)
- Score is session-based; **best combo ever** is saved to leaderboard
- Each session shows: current score, best combo length, highest multiplier hit
- Leaderboard syncs to Firebase — you and Benjamin can see each other's runs

#### 3. Trick Mastery (Unlock Tree)
- Every trick has a **mastery level** (0–∞)
- Early tricks must be mastered before advanced tricks unlock:
  ```
  Ollie → Kickflip / Heelflip / Shuvit
  Kickflip → Varial Flip / Hardflip
  Shuvit → Tre Flip (with Kickflip mastered)
  Mastery 50+ any trick → Manual variants unlock
  Mastery 100+ → Grind variants start appearing
  Mastery 200+ → Nollie/Switch variants unlock
  ```
- Mastery is **permanent** — never resets, always saved
- Buttons on screen **swap and evolve** as mastery grows — at low levels you have 5 buttons, at high levels you can have up to 8, with tricks rotating based on what you've unlocked

---

## 🚧 OBSTACLES & WORLD

- World is **procedurally generated**, infinite scroll
- Obstacles appear more frequently and in harder patterns as rank increases
- Early game: wide open, just flat ground — learn the basics
- Mid game: traffic cones, gaps, curbs, ledges, manual pads
- Late game: stairs, rails, gaps between buildings, moving traffic
- **Grinds**: rails and ledges randomly appear after sufficient rank — when near one, grind buttons become available (they temporarily replace 1–2 flip buttons)
- **Prompted tricks**: sometimes a ghost outline of a trick appears above an obstacle — nail it for **3x XP bonus**; ignore it for normal play
- Between prompted and free-skate sections, the game alternates so it never feels on-rails

---

## 💥 FEEL & JUICE

- **Impact frames on land**: 1–2 frame freeze + white pixel shockwave ring + board briefly flashes
- **Slam animation**: board tumbles, bounces, slides — pixelated dust cloud
- **Clean landing bonus**: perfect timing window (~100ms) = "CLEAN" flash + extra XP + board part mastery tick
- **Combo text**: trick names stack on screen, each new one pushing the last one up
- **Screen shake**: subtle on land, more on slams, massive on max-multiplier tricks
- **Particles**: small pixel sparks on grinds, pop dust on ollie, color burst on clean lands
- Trick animations should feel **snappy and readable** — board flips fast and clearly, not floaty

---

## 🔊 SOUND DESIGN

- **Board pop**: sharp clack on every ollie/trick pop
- **Flip sounds**: woosh/whir based on trick type (kickflip vs heelflip have different sounds)
- **Landing thud**: varies by height — small pop = light thud, big air = heavy slam
- **Impact crunch on slams**: gnarly crunch + crowd wince sound
- **Grind sounds**: metal scrape that loops while grinding, pitch shifts based on speed
- **Clean land bonus**: satisfying high-pitch ding
- **Combo milestones**: crowd "oooh" at 5x, "ahhh" at 10x, siren at 25x+
- **Background music**: optional lo-fi skate beat (toggle in settings), 2–3 tracks that cycle
- All audio via **Howler.js**, fully preloaded for instant response
- Master volume + music volume sliders in settings

---

## ⚙️ SETTINGS SCREEN

- Button layout editor (drag, resize, opacity, style)
- Master volume / Music volume
- Pixelation level (Low / Medium / High — affects renderer resolution)
- Show/hide trick name callouts
- Show/hide combo counter
- Camera angle preset (Low & cinematic / Standard / High overhead)
- Toggle prompted tricks on/off
- Leaderboard: enter your name (stored locally), view yours vs Benjamin's best runs
- Board viewer: spin your current board and see all part tiers + mastery progress per part
- Reset run (keeps all progression/mastery, just resets session score)

---

## 📁 FILE STRUCTURE

```
kickflip/
├── index.html
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker (offline cache)
├── icons/                 # App icons (192px, 512px) for homescreen
├── src/
│   ├── main.js            # Entry point, game loop
│   ├── renderer.js        # Three.js setup, pixel render target
│   ├── board.js           # Board mesh, part tiers, mastery materials
│   ├── tricks.js          # Trick definitions, input combos, animations
│   ├── input.js           # Touch button system, layout manager
│   ├── world.js           # Procedural world generation, obstacles
│   ├── progression.js     # XP, ranks, mastery, unlock tree
│   ├── combo.js           # Combo chain logic, multiplier, score
│   ├── audio.js           # Howler.js sound manager
│   ├── leaderboard.js     # Firebase async score sync
│   ├── settings.js        # All settings, localStorage persistence
│   └── ui.js              # HUD, trick callouts, rank display, impact frames
├── assets/
│   ├── sounds/            # All audio files (mp3/webm)
│   └── textures/          # Pixel art textures for board parts, ground
└── README.md              # How to fork, deploy to GitHub Pages, install on iPhone
```

---

## 📲 DEPLOYMENT — GitHub Pages → iPhone Homescreen

1. Create a GitHub repo: `kickflip`
2. Push all files to `main` branch
3. Go to repo Settings → Pages → Deploy from `main` branch root
4. GitHub gives you: `https://yourusername.github.io/kickflip`
5. On iPhone: open that URL in **Safari** → tap Share → **Add to Home Screen**
6. App installs with icon, runs fullscreen, works offline via service worker
7. To update: push to GitHub → service worker auto-updates on next open

---

## 🔥 NORTH STAR PRINCIPLES

1. **It never ends.** There is always a higher rank, a better board part, a new trick to unlock.
2. **The board tells your story.** Look at someone's board and you know exactly what they've been practicing.
3. **One thumb is enough.** Every trick is one or two taps. Combos come from timing and sequence, not complexity.
4. **Landing clean feels incredible.** The impact frame, the sound, the mastery tick — every clean land is a micro-reward.
5. **Benjamin can always see your score.** The async leaderboard means there's always someone to chase.
