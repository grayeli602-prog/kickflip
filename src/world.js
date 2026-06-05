import * as THREE from 'three';

const GROUND_COLOR = 0x2a2a3a;
const CRACK_COLOR  = 0x1a1a28;
const LINE_COLOR   = 0x4a4a1a;

// Obstacle types available at each rank tier
const OBSTACLE_SETS = [
  [],                                               // rank 0: nothing
  ['cone'],                                         // rank 1
  ['cone', 'curb'],                                 // rank 2
  ['cone', 'curb', 'ledge'],                        // rank 3
  ['cone', 'curb', 'ledge', 'gap', 'rail'],         // rank 4
  ['cone', 'curb', 'ledge', 'gap', 'rail', 'stairs'],// rank 5+
];

export class World {
  constructor(scene) {
    this.scene = scene;
    this.segments = [];
    this.obstacles = [];
    this.segmentWidth = 8;
    this.aheadSegments = 12;
    this.behindSegments = 3;
    this.nextX = 0;
    this.rankTier = 0;
    this.speed = 6; // world scroll speed
    this.distance = 0;
    this.groundY = -0.2;

    this._buildInitialGround();
  }

  _buildInitialGround() {
    for (let i = 0; i < this.aheadSegments; i++) {
      this._addSegment();
    }
  }

  _addSegment() {
    const x = this.nextX;
    this.nextX += this.segmentWidth;

    // Ground slab
    const geo = new THREE.BoxGeometry(this.segmentWidth - 0.1, 0.3, 12);
    const mat = new THREE.MeshToonMaterial({ color: GROUND_COLOR });
    const slab = new THREE.Mesh(geo, mat);
    slab.position.set(x + this.segmentWidth / 2, this.groundY - 0.15, 0);
    slab.receiveShadow = true;
    this.scene.add(slab);

    // Crack lines
    const lineGeo = new THREE.BoxGeometry(0.06, 0.32, 12);
    const lineMat = new THREE.MeshBasicMaterial({ color: CRACK_COLOR });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.position.set(x, this.groundY - 0.15, 0);
    this.scene.add(line);

    // Yellow center line (occasional)
    if (Math.floor(x / this.segmentWidth) % 3 === 0) {
      const ylGeo = new THREE.BoxGeometry(this.segmentWidth - 0.1, 0.31, 0.12);
      const ylMat = new THREE.MeshBasicMaterial({ color: LINE_COLOR });
      const yl = new THREE.Mesh(ylGeo, ylMat);
      yl.position.set(x + this.segmentWidth / 2, this.groundY - 0.14, 0);
      this.scene.add(yl);
    }

    const seg = { mesh: slab, x: x + this.segmentWidth / 2, extras: [line] };
    this.segments.push(seg);

    // Maybe add obstacle
    const set = OBSTACLE_SETS[Math.min(this.rankTier, OBSTACLE_SETS.length - 1)];
    if (set.length > 0 && Math.random() < 0.3) {
      const type = set[Math.floor(Math.random() * set.length)];
      this._addObstacle(type, x + this.segmentWidth / 2);
    }
  }

  _addObstacle(type, x) {
    let mesh, meta;
    const z = (Math.random() - 0.5) * 2;

    if (type === 'cone') {
      const g = new THREE.ConeGeometry(0.2, 0.5, 6);
      const m = new THREE.MeshToonMaterial({ color: 0xFF5500 });
      mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, this.groundY + 0.25, z);
      meta = { type, canGrind: false, xpBonus: 1.2 };
    } else if (type === 'curb') {
      const g = new THREE.BoxGeometry(1.5, 0.25, 0.5);
      const m = new THREE.MeshToonMaterial({ color: 0x8888AA });
      mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, this.groundY + 0.125, z);
      meta = { type, canGrind: true, topY: this.groundY + 0.25 };
    } else if (type === 'ledge') {
      const g = new THREE.BoxGeometry(3, 0.5, 0.6);
      const m = new THREE.MeshToonMaterial({ color: 0x999999 });
      mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, this.groundY + 0.25, z * 0.5);
      meta = { type, canGrind: true, topY: this.groundY + 0.5 };
    } else if (type === 'gap') {
      // Visual gap: dark stripe
      const g = new THREE.BoxGeometry(1.2, 0.1, 12);
      const m = new THREE.MeshBasicMaterial({ color: 0x050510 });
      mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, this.groundY - 0.2, 0);
      meta = { type, canGrind: false, isGap: true };
    } else if (type === 'rail') {
      const g = new THREE.CylinderGeometry(0.05, 0.05, 3.5, 8);
      const m = new THREE.MeshToonMaterial({ color: 0xCCCCCC });
      mesh = new THREE.Mesh(g, m);
      mesh.rotation.z = Math.PI / 2;
      mesh.position.set(x, this.groundY + 0.4, z);

      const suppGeo = new THREE.BoxGeometry(0.08, 0.4, 0.08);
      const supp = new THREE.Mesh(suppGeo, m);
      supp.position.set(x, this.groundY + 0.2, z);
      this.scene.add(supp);
      meta = { type, canGrind: true, topY: this.groundY + 0.4 };
    } else if (type === 'stairs') {
      const group = new THREE.Group();
      for (let s = 0; s < 4; s++) {
        const g = new THREE.BoxGeometry(0.5, 0.2 + s * 0.2, 1.5);
        const m = new THREE.MeshToonMaterial({ color: 0x7a7a8a });
        const step = new THREE.Mesh(g, m);
        step.position.set(x - 0.75 + s * 0.5, this.groundY + (0.1 + s * 0.1), z);
        this.scene.add(step);
      }
      meta = { type, canGrind: false };
    }

    if (mesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.obstacles.push({ mesh, meta, x, baseX: x });
    }
  }

  setRankTier(tier) {
    this.rankTier = Math.min(tier, OBSTACLE_SETS.length - 1);
  }

  update(dt, boardX) {
    this.distance += this.speed * dt;

    // Scroll all segments and obstacles
    const scroll = this.speed * dt;
    for (const seg of this.segments) {
      seg.mesh.position.x -= scroll;
      seg.x -= scroll;
      for (const e of seg.extras) e.position.x -= scroll;
    }
    for (const obs of this.obstacles) {
      if (obs.mesh) {
        obs.mesh.position.x -= scroll;
        obs.x -= scroll;
      }
    }

    // Cull behind-camera segments
    while (this.segments.length > 0 && this.segments[0].x < boardX - this.behindSegments * this.segmentWidth) {
      const seg = this.segments.shift();
      this.scene.remove(seg.mesh);
      for (const e of seg.extras) this.scene.remove(e);
    }
    while (this.obstacles.length > 0 && this.obstacles[0].x < boardX - this.behindSegments * this.segmentWidth) {
      const obs = this.obstacles.shift();
      if (obs.mesh) this.scene.remove(obs.mesh);
    }

    // Add new segments ahead
    const farthest = this.segments.length > 0 ? this.segments[this.segments.length - 1].x + this.segmentWidth / 2 : boardX;
    while (farthest + this.nextX < boardX + this.aheadSegments * this.segmentWidth) {
      this._addSegment();
    }
    // Simpler: just keep a count ahead
    while (this.segments.length < this.aheadSegments + this.behindSegments) {
      this._addSegment();
    }
  }

  getGroundY() { return this.groundY; }

  getNearbyObstacles(x, radius = 4) {
    return this.obstacles.filter(o => Math.abs(o.x - x) < radius);
  }
}
