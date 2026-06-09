// Physics-based trick system: motion primitives add angular velocity,
// trick name is determined by measuring net rotation at landing.

const GRAVITY = -22;
const POP_VELOCITY = 8.5;          // vertical launch speed (→ ~0.77s air time)

// Angular velocity impulses (rad/s) per button press
const FLIP_IMPULSE = 8.5;          // ≈ one 360° flip per air time
const SHUV_IMPULSE = 4.3;          // ≈ one 180° shuvit per air time
const SPIN_IMPULSE = 4.3;          // ≈ one 180° body spin per air time

// Landing thresholds (radians)
const SLAM_THRESHOLD  = Math.PI / 4;   // >45° off-flat = slam
const CLEAN_THRESHOLD = Math.PI / 8;   // <22.5° off-flat = clean bonus

// XP awarded per named trick
const TRICK_XP = new Map([
  ['Ollie', 10],
  ['Kickflip', 25],        ['Heelflip', 25],
  ['FS Shuvit', 20],       ['Pop Shuvit', 20],
  ['FS 180', 30],          ['BS 180', 30],
  ['FS 360', 60],          ['BS 360', 60],
  ['360 FS Shuvit', 45],   ['360 Pop Shuvit', 45],
  ['Double Kickflip', 70], ['Double Heelflip', 70],
  ['Varial Kickflip', 40], ['Varial Heelflip', 40],
  ['Hardflip', 55],        ['Inward Heel', 55],
  ['Tre Flip', 90],        ['360 Inward Heel', 90],
  ['Bigspin', 75],         ['FS Bigspin', 75],
  ['BS Bigspin', 75],      ['FS Bigspin BS', 75],
  ['Kickflip FS 180', 65], ['Heelflip BS 180', 65],
  ['Kickflip BS 180', 65], ['Heelflip FS 180', 65],
  ['Varial KF BS 180', 80],['Varial HF FS 180', 80],
  ['Hardflip FS 180', 85], ['Inward Heel BS 180', 85],
]);

// Lookup table: [roll360s, shuv180s, spin180s] → trick name
// roll: positive = kickflip direction, negative = heelflip direction
// shuv: positive = FS shuvit direction, negative = pop shuvit direction
// spin: positive = frontside body spin, negative = backside body spin
const TRICK_TABLE = [
  [0,  0,  0, 'Ollie'],
  [1,  0,  0, 'Kickflip'],
  [-1, 0,  0, 'Heelflip'],
  [0,  1,  0, 'FS Shuvit'],
  [0, -1,  0, 'Pop Shuvit'],
  [0,  0,  1, 'FS 180'],
  [0,  0, -1, 'BS 180'],
  [0,  0,  2, 'FS 360'],
  [0,  0, -2, 'BS 360'],
  [0,  2,  0, '360 FS Shuvit'],
  [0, -2,  0, '360 Pop Shuvit'],
  [2,  0,  0, 'Double Kickflip'],
  [-2, 0,  0, 'Double Heelflip'],
  [1, -1,  0, 'Varial Kickflip'],
  [-1, 1,  0, 'Varial Heelflip'],
  [1,  1,  0, 'Hardflip'],
  [-1,-1,  0, 'Inward Heel'],
  [1, -2,  0, 'Tre Flip'],
  [-1, 2,  0, '360 Inward Heel'],
  [0, -1, -1, 'Bigspin'],
  [0,  1,  1, 'FS Bigspin'],
  [0,  1, -1, 'BS Bigspin'],
  [0, -1,  1, 'FS Bigspin BS'],
  [1,  0,  1, 'Kickflip FS 180'],
  [-1, 0, -1, 'Heelflip BS 180'],
  [1,  0, -1, 'Kickflip BS 180'],
  [-1, 0,  1, 'Heelflip FS 180'],
  [1, -1, -1, 'Varial KF BS 180'],
  [-1, 1,  1, 'Varial HF FS 180'],
  [1,  1,  1, 'Hardflip FS 180'],
  [-1,-1, -1, 'Inward Heel BS 180'],
];

function nameFromRotation(totalRoll, totalShuv, totalSpin) {
  const roll = Math.round(totalRoll / (2 * Math.PI));
  const shuv = Math.round(totalShuv / Math.PI);
  const spin = Math.round(totalSpin / Math.PI);

  for (const [r, y, s, name] of TRICK_TABLE) {
    if (r === roll && y === shuv && s === spin) return name;
  }

  // Fallback name for unusual combos
  const parts = [];
  const ar = Math.abs(roll), ay = Math.abs(shuv), as_ = Math.abs(spin);
  if (ar >= 3) parts.push(`${ar}× ${roll > 0 ? 'Kickflip' : 'Heelflip'}`);
  else if (ar === 2) parts.push(roll > 0 ? 'Double Kickflip' : 'Double Heelflip');
  else if (ar === 1) parts.push(roll > 0 ? 'Kickflip' : 'Heelflip');
  if (ay >= 3) parts.push(`${ay * 180}° Shuvit`);
  else if (ay === 2) parts.push(shuv > 0 ? '360 FS Shuvit' : '360 Pop Shuvit');
  else if (ay === 1) parts.push(shuv > 0 ? 'FS Shuvit' : 'Pop Shuvit');
  if (as_ >= 3) parts.push(`${as_ * 180}°`);
  else if (as_ === 2) parts.push(spin > 0 ? 'FS 360' : 'BS 360');
  else if (as_ === 1) parts.push(spin > 0 ? 'FS 180' : 'BS 180');
  return parts.length ? parts.join(' ') : 'Ollie';
}

export class TrickSystem {
  constructor(board, audio, ui) {
    this.board = board;
    this.audio = audio;
    this.ui = ui;

    this.isAirborne = false;
    this.boardBaseY = 0;
    this.velocityY = 0;

    // Angular velocities (rad/s)
    this.angVel = { roll: 0, shuv: 0, spin: 0 };

    // Accumulated rotations for each axis (radians)
    this.totalRoll = 0;
    this.totalShuv = 0;
    this.totalSpin = 0;

    this.onTrickComplete = null;
    this.onSlam = null;
  }

  setBaseY(y) {
    this.boardBaseY = y;
    this.board.baseY = y;
  }

  // Called by input system on every button press
  handleButton(action) {
    if (action === 'pop') {
      if (!this.isAirborne) {
        this._launch();
        this.audio?.play('pop');
      }
      return;
    }

    // Non-POP buttons auto-launch if grounded
    if (!this.isAirborne) {
      this._launch();
      this.audio?.play('pop');
    }

    switch (action) {
      case 'flip_l':
        this.angVel.roll += FLIP_IMPULSE;
        this.audio?.play('flip');
        break;
      case 'flip_r':
        this.angVel.roll -= FLIP_IMPULSE;
        this.audio?.play('flip');
        break;
      case 'shuv_f':
        this.angVel.shuv += SHUV_IMPULSE;
        break;
      case 'shuv_b':
        this.angVel.shuv -= SHUV_IMPULSE;
        break;
      case 'spin_l':
        this.angVel.spin += SPIN_IMPULSE;
        break;
      case 'spin_r':
        this.angVel.spin -= SPIN_IMPULSE;
        break;
    }
  }

  _launch() {
    this.isAirborne = true;
    this.velocityY = POP_VELOCITY;
    this.totalRoll = 0;
    this.totalShuv = 0;
    this.totalSpin = 0;
    this.angVel = { roll: 0, shuv: 0, spin: 0 };
    this.board.isAirborne = true;
  }

  update(dt) {
    if (!this.isAirborne) return;

    // Vertical physics
    this.velocityY += GRAVITY * dt;
    this.board.group.position.y += this.velocityY * dt;

    // Accumulate rotations
    this.totalRoll += this.angVel.roll * dt;
    this.totalShuv += this.angVel.shuv * dt;
    this.totalSpin += this.angVel.spin * dt;

    // Apply to board visual
    this.board.flipAngle   = this.totalRoll;
    this.board.bodyRotation = this.totalShuv + this.totalSpin;

    // Check landing
    if (this.board.group.position.y <= this.boardBaseY) {
      this.board.group.position.y = this.boardBaseY;
      this.isAirborne = false;
      this.board.isAirborne = false;
      this._handleLanding();
    }
  }

  _handleLanding() {
    const { totalRoll, totalShuv, totalSpin } = this;

    // How close to flat is each axis on landing?
    const rollMod = ((totalRoll % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const yawMod  = (((totalShuv + totalSpin) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const PI2 = 2 * Math.PI;

    const rollNearFlat = rollMod < SLAM_THRESHOLD || rollMod > PI2 - SLAM_THRESHOLD;
    const yawNearFlat  = yawMod  < SLAM_THRESHOLD || yawMod  > PI2 - SLAM_THRESHOLD;

    const rollClean = rollMod < CLEAN_THRESHOLD || rollMod > PI2 - CLEAN_THRESHOLD;
    const yawClean  = yawMod  < CLEAN_THRESHOLD || yawMod  > PI2 - CLEAN_THRESHOLD;

    // Slam if a flip was in progress and board isn't level
    const wasFlipping = Math.abs(totalRoll) > 0.3;
    const isSlam = wasFlipping && !rollNearFlat;

    // Reset board visual rotation
    this.board.flipAngle = 0;
    this.board.bodyRotation = 0;
    this.angVel = { roll: 0, shuv: 0, spin: 0 };

    if (isSlam) {
      this.audio?.play('slam');
      if (this.onSlam) this.onSlam();
      return;
    }

    const isClean = rollClean && yawClean;
    const name = nameFromRotation(totalRoll, totalShuv, totalSpin);
    const xp = TRICK_XP.get(name) ?? Math.max(10,
      Math.abs(Math.round(totalRoll / (2 * Math.PI))) * 25 +
      (Math.abs(Math.round(totalShuv / Math.PI)) + Math.abs(Math.round(totalSpin / Math.PI))) * 20
    );

    const trick = { name, xp };

    this.board.triggerLandFlash();
    this.audio?.play(isClean ? 'land_clean' : 'land');
    this.ui?.showTrickName(name);

    if (this.onTrickComplete) this.onTrickComplete(trick, isClean);
  }
}
