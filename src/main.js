import { Renderer } from './renderer.js';
import { Board } from './board.js';
import { TrickSystem } from './tricks.js';
import { InputSystem } from './input.js';
import { World } from './world.js';
import { Progression } from './progression.js';
import { ComboSystem } from './combo.js';
import { AudioSystem } from './audio.js';
import { Leaderboard } from './leaderboard.js';
import { Settings } from './settings.js';
import { UI } from './ui.js';

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}

let renderer, board, tricks, input, world, progression, combo, audio, leaderboard, settings, ui;
let lastTime = 0;
let gameRunning = true;
let prevRankIndex = 0;

function setLoadProgress(p) {
  const bar = document.getElementById('loading-bar');
  if (bar) bar.style.width = (p * 100) + '%';
}

async function init() {
  setLoadProgress(0.1);

  const container = document.getElementById('canvas-container');
  const overlay   = document.getElementById('ui-overlay');

  // Core systems
  renderer    = new Renderer(container);
  setLoadProgress(0.25);

  audio       = new AudioSystem();
  progression = new Progression();
  combo       = new ComboSystem();
  leaderboard = new Leaderboard();
  setLoadProgress(0.4);

  world       = new World(renderer.scene);
  world.setRankTier(progression.getRankTier());
  setLoadProgress(0.55);

  board = new Board(renderer.scene);
  board.setPosition(0, world.getGroundY(), 0);
  // Apply saved board tiers
  const tiers = progression.getBoardTiers();
  Object.entries(tiers).forEach(([part, tier]) => board.upgradeToTier(part, tier));
  setLoadProgress(0.65);

  ui = new UI(overlay);
  setLoadProgress(0.75);

  tricks = new TrickSystem(board, audio, ui);
  tricks.setBaseY(world.getGroundY());
  setLoadProgress(0.85);

  input = new InputSystem(overlay, handleInput);
  setLoadProgress(0.9);

  settings = new Settings(overlay, input, audio, renderer, leaderboard, progression, () => {
    gameRunning = true;
    // Re-apply board tiers in case they changed
    const t = progression.getBoardTiers();
    Object.entries(t).forEach(([part, tier]) => board.upgradeToTier(part, tier));
  });

  ui.onSettingsClick(() => {
    gameRunning = false;
    settings.show();
  });

  // Combo callbacks
  combo.onChange = (score, multiplier, chain) => {
    ui.updateScore(score, multiplier, chain, progression.getRankName(), progression.getRankProgress());
    progression.updateSessionBest(score, chain, multiplier);
    if ([5, 10, 25, 50].includes(chain)) {
      const soundMap = { 5: 'combo5', 10: 'combo10', 25: 'combo25', 50: 'combo25' };
      audio.play(soundMap[chain]);
      ui.showComboMilestone(chain);
    }
  };

  // Trick callbacks
  tricks.onTrickComplete = (trick, isClean) => {
    if (!trick) return;
    const result = combo.trickLanded(trick, isClean);
    progression.recordTrick(trick.name.toLowerCase().replace(/\s/g, ''), isClean);
    progression.addXP(result.earned);

    if (isClean) ui.showClean();

    // Rank up?
    const newRankIndex = progression.getRankIndex();
    if (newRankIndex > prevRankIndex) {
      prevRankIndex = newRankIndex;
      ui.showRankUp(progression.getRankName());
      world.setRankTier(progression.getRankTier());
      // Upgrade board
      const t = progression.getBoardTiers();
      Object.entries(t).forEach(([part, tier]) => board.upgradeToTier(part, tier));
    }

    // Impact frame
    ui.triggerImpactFrame(window.innerWidth / 2, window.innerHeight * 0.65);
    ui.triggerShake(isClean ? 0.25 : 0.15);
    ui.updateScore(combo.score, combo.multiplier, combo.chain,
      progression.getRankName(), progression.getRankProgress());
  };

  tricks.onSlam = () => {
    const lost = combo.slam();
    if (lost) audio.play('slam');
    ui.showSlam();
    board.triggerSlam();
  };

  setLoadProgress(1.0);

  // Hide loading screen
  await new Promise(r => setTimeout(r, 300));
  const ls = document.getElementById('loading-screen');
  if (ls) { ls.style.opacity = '0'; ls.style.transition = 'opacity 0.4s'; }
  setTimeout(() => { if (ls) ls.remove(); }, 450);

  prevRankIndex = progression.getRankIndex();
  audio.startMusic();

  // Start loop
  requestAnimationFrame(loop);
}

function handleInput(action) {
  if (!gameRunning) return;
  tricks.handleButton(action);
}

function loop(timestamp) {
  requestAnimationFrame(loop);

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (!gameRunning) return;

  // Update systems
  tricks.update(dt);
  board.update(dt);

  const boardPos = board.getPosition();
  world.update(dt, boardPos.x);

  // Camera follow
  renderer.followTarget(boardPos, dt);

  // UI
  ui.update(dt, document.getElementById('canvas-container'));

  // Render
  renderer.render();
}

init().catch(console.error);
