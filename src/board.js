import * as THREE from 'three';

// Tier colors for each board part (10 tiers each)
const DECK_TIERS = [
  { color: 0x8B6914, emissive: 0x000000, name: 'Worn Wood' },
  { color: 0xA07828, emissive: 0x000000, name: 'Raw Wood' },
  { color: 0xCC3300, emissive: 0x000000, name: 'Red Graphic' },
  { color: 0x0055CC, emissive: 0x000000, name: 'Blue Graphic' },
  { color: 0x9900CC, emissive: 0x110011, name: 'Purple Graphic' },
  { color: 0x00AAFF, emissive: 0x002244, name: 'Neon Graphic' },
  { color: 0xFFAA00, emissive: 0x221100, name: 'Gold Graphic' },
  { color: 0xFFDD00, emissive: 0x332200, name: 'Shining Gold' },
  { color: 0xFF4400, emissive: 0x441100, name: 'Glowing Inferno' },
  { color: 0xFF00FF, emissive: 0x440044, name: 'Mythic' },
];
const WHEEL_TIERS = [
  { color: 0xdddddd, emissive: 0x000000, name: 'White' },
  { color: 0xbbbbcc, emissive: 0x000000, name: 'Off-White' },
  { color: 0xFFAA00, emissive: 0x000000, name: 'Yellow' },
  { color: 0xFF4400, emissive: 0x000000, name: 'Orange' },
  { color: 0x00FFAA, emissive: 0x001111, name: 'Teal' },
  { color: 0xDDDDFF, emissive: 0x111122, name: 'Chrome' },
  { color: 0xFFFFFF, emissive: 0x222222, name: 'Glowing White' },
  { color: 0x00FFFF, emissive: 0x003333, name: 'Cyan Glow' },
  { color: 0xFF00FF, emissive: 0x330033, name: 'Magenta Glow' },
  { color: 0xFFFF00, emissive: 0x333300, name: 'Particle Trail' },
];
const TRUCK_TIERS = [
  { color: 0x222222, emissive: 0x000000, name: 'Matte Black' },
  { color: 0x555555, emissive: 0x000000, name: 'Dark Grey' },
  { color: 0x888888, emissive: 0x000000, name: 'Silver' },
  { color: 0xAAAAAA, emissive: 0x000000, name: 'Brushed Silver' },
  { color: 0xCCCCCC, emissive: 0x111111, name: 'Polished' },
  { color: 0xFFCC44, emissive: 0x111100, name: 'Gold' },
  { color: 0xFFDD66, emissive: 0x221100, name: 'Shining Gold' },
  { color: 0x88FFFF, emissive: 0x112222, name: 'Holographic' },
  { color: 0xFFAAFF, emissive: 0x220022, name: 'Rainbow Holo' },
  { color: 0xFFFFFF, emissive: 0x444444, name: 'Prismatic' },
];
const GRIP_TIERS = [
  { color: 0x111111, emissive: 0x000000, name: 'Plain Black' },
  { color: 0x1a1a1a, emissive: 0x000000, name: 'Fine Grit' },
  { color: 0x222244, emissive: 0x000000, name: 'Dark Blue' },
  { color: 0x330033, emissive: 0x000000, name: 'Dark Purple' },
  { color: 0x003300, emissive: 0x000000, name: 'Dark Green' },
  { color: 0x002244, emissive: 0x001122, name: 'Neon Pattern' },
  { color: 0x003322, emissive: 0x001111, name: 'Teal Pattern' },
  { color: 0x440000, emissive: 0x110000, name: 'Red Pattern' },
  { color: 0x330044, emissive: 0x110022, name: 'Animated Noise' },
  { color: 0x000044, emissive: 0x000033, name: 'Galaxy' },
];

export class Board {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.deckTier = 0;
    this.wheelTier = 0;
    this.truckTier = 0;
    this.gripTier = 0;

    this._buildMeshes();

    this.baseY = 0;
    this.isAirborne = false;
    this.flipAngle = 0;
    this.bodyRotation = 0;
    this.tiltAngle = 0;
    this.landFlash = 0;
    this.slamTime = 0;
    this.isSlamming = false;
  }

  _buildMeshes() {
    while (this.group.children.length) this.group.remove(this.group.children[0]);

    // Grip tape
    const gripGeo = new THREE.BoxGeometry(2.8, 0.06, 0.82);
    this.gripMesh = new THREE.Mesh(gripGeo, this._makeMat(GRIP_TIERS[this.gripTier], 'grip'));
    this.gripMesh.position.y = 0.08;
    this.group.add(this.gripMesh);

    // Deck
    const deckGeo = new THREE.BoxGeometry(2.8, 0.12, 0.8);
    this.deckMesh = new THREE.Mesh(deckGeo, this._makeMat(DECK_TIERS[this.deckTier], 'deck'));
    this.deckMesh.position.y = 0;
    this.deckMesh.castShadow = true;
    this.group.add(this.deckMesh);

    // Nose/tail kick
    const kickGeo = new THREE.BoxGeometry(0.3, 0.08, 0.7);
    const kickMat = this._makeMat(DECK_TIERS[this.deckTier], 'deck');
    for (const s of [-1, 1]) {
      const kick = new THREE.Mesh(kickGeo, kickMat);
      kick.position.set(s * 1.45, 0.06, 0);
      kick.rotation.z = s * 0.2;
      kick.castShadow = true;
      this.group.add(kick);
    }

    // Trucks
    this.truckMeshes = [];
    for (const s of [-1, 1]) {
      const baseGeo = new THREE.BoxGeometry(0.4, 0.1, 0.9);
      const base = new THREE.Mesh(baseGeo, this._makeMat(TRUCK_TIERS[this.truckTier], 'truck'));
      base.position.set(s * 0.95, -0.12, 0);
      base.castShadow = true;
      this.group.add(base);
      this.truckMeshes.push(base);

      const axleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8);
      const axle = new THREE.Mesh(axleGeo, this._makeMat(TRUCK_TIERS[this.truckTier], 'truck'));
      axle.position.set(s * 0.95, -0.18, 0);
      axle.rotation.x = Math.PI / 2;
      axle.castShadow = true;
      this.group.add(axle);

      for (const ws of [-1, 1]) {
        const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.14, 12);
        const wheel = new THREE.Mesh(wheelGeo, this._makeMat(WHEEL_TIERS[this.wheelTier], 'wheel'));
        wheel.position.set(s * 0.95, -0.18, ws * 0.52);
        wheel.rotation.x = Math.PI / 2;
        wheel.castShadow = true;
        this.group.add(wheel);
        this.truckMeshes.push(wheel);
      }
    }
  }

  _makeMat(tier, type) {
    const roughness = type === 'truck' ? 0.3 : type === 'wheel' ? 0.45 : type === 'grip' ? 0.95 : 0.82;
    const metalness = type === 'truck' ? 0.8 : type === 'wheel' ? 0.15 : 0.02;
    return new THREE.MeshStandardMaterial({
      color: tier.color,
      emissive: new THREE.Color(tier.emissive),
      emissiveIntensity: tier.emissive > 0 ? 0.5 : 0,
      roughness,
      metalness,
    });
  }

  upgradeToTier(part, tier) {
    const t = Math.min(9, Math.max(0, tier));
    if (part === 'deck') this.deckTier = t;
    else if (part === 'wheel') this.wheelTier = t;
    else if (part === 'truck') this.truckTier = t;
    else if (part === 'grip') this.gripTier = t;
    this._buildMeshes();
  }

  setPosition(x, y, z) { this.group.position.set(x, y, z); }
  getPosition() { return this.group.position; }

  update(dt) {
    if (this.landFlash > 0) {
      this.landFlash -= dt * 4;
      const f = Math.max(0, this.landFlash);
      this.deckMesh.material.emissiveIntensity = f * 3;
    }

    if (this.isSlamming) {
      this.slamTime += dt;
      this.group.rotation.x += dt * 8;
      this.group.rotation.z += dt * 5;
      const dropY = this.group.position.y - dt * 6;
      this.group.position.y = Math.max(this.baseY - 0.3, dropY);
      if (this.slamTime > 0.6) {
        this.isSlamming = false;
        this.slamTime = 0;
        this.group.rotation.set(0, 0, 0);
        this.group.position.y = this.baseY;
      }
    } else {
      this.group.rotation.z += (this.tiltAngle - this.group.rotation.z) * 0.15;
      this.group.rotation.x = this.flipAngle;
      this.group.rotation.y = this.bodyRotation;
    }
  }

  triggerLandFlash() { this.landFlash = 1.0; }
  triggerSlam() { this.isSlamming = true; this.slamTime = 0; }
}
