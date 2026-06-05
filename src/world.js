import * as THREE from 'three';

const GROUND_COLOR = 0x2a2a3a;
const CRACK_COLOR  = 0x1a1a28;
const LINE_COLOR   = 0x4a4a1a;

const OBSTACLE_SETS = [
  [],
  ['cone'],
  ['cone', 'curb'],
  ['cone', 'curb', 'ledge'],
  ['cone', 'curb', 'ledge', 'gap', 'rail'],
  ['cone', 'curb', 'ledge', 'gap', 'rail', 'stairs'],
];

export class World {
  constructor(scene) {
    this.scene = scene;
    this.segments = [];
    this.obstacles = [];
    this.segmentWidth = 8;
    this.aheadCount = 14;
    this.behindCount = 3;
    this.rankTier = 0;
    this.speed = 6;
    this.distance = 0;
    this.groundY = -0.2;
    this._populate();
  }

  _populate() {
    for (let i = 0; i < this.aheadCount; i++) this._addSegment();
  }

  // Add one segment immediately to the right of the last segment (or at 0 if none)
  _addSegment() {
    const last = this.segments[this.segments.length - 1];
    const leftEdge = last ? last.mesh.position.x + this.segmentWidth / 2 : 0;

    const geo = new THREE.BoxGeometry(this.segmentWidth - 0.1, 0.3, 12);
    const mat = new THREE.MeshToonMaterial({ color: GROUND_COLOR });
    const slab = new THREE.Mesh(geo, mat);
    slab.position.set(leftEdge + this.segmentWidth / 2, this.groundY - 0.15, 0);
    slab.receiveShadow = true;
    this.scene.add(slab);

    const lineGeo = new THREE.BoxGeometry(0.06, 0.32, 12);
    const lineMat = new THREE.MeshBasicMaterial({ color: CRACK_COLOR });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.position.set(leftEdge, this.groundY - 0.15, 0);
    this.scene.add(line);

    const extras = [line];
    if (this.segments.length % 3 === 0) {
      const ylGeo = new THREE.BoxGeometry(this.segmentWidth - 0.1, 0.31, 0.12);
      const ylMat = new THREE.MeshBasicMaterial({ color: LINE_COLOR });
      const yl = new THREE.Mesh(ylGeo, ylMat);
      yl.position.set(leftEdge + this.segmentWidth / 2, this.groundY - 0.14, 0);
      this.scene.add(yl);
      extras.push(yl);
    }

    this.segments.push({ mesh: slab, extras });

    // Possibly spawn an obstacle on this segment
    const set = OBSTACLE_SETS[Math.min(this.rankTier, OBSTACLE_SETS.length - 1)];
    if (set.length > 0 && Math.random() < 0.28) {
      const type = set[Math.floor(Math.random() * set.length)];
      this._addObstacle(type, leftEdge + this.segmentWidth / 2);
    }
  }

  _addObstacle(type, cx) {
    const z = (Math.random() - 0.5) * 2;
    let mesh = null;
    const extras = [];

    if (type === 'cone') {
      const g = new THREE.ConeGeometry(0.2, 0.5, 6);
      mesh = new THREE.Mesh(g, new THREE.MeshToonMaterial({ color: 0xFF5500 }));
      mesh.position.set(cx, this.groundY + 0.25, z);
    } else if (type === 'curb') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.25, 0.5),
        new THREE.MeshToonMaterial({ color: 0x8888AA })
      );
      mesh.position.set(cx, this.groundY + 0.125, z);
    } else if (type === 'ledge') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.5, 0.6),
        new THREE.MeshToonMaterial({ color: 0x999999 })
      );
      mesh.position.set(cx, this.groundY + 0.25, z * 0.5);
    } else if (type === 'gap') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.1, 12),
        new THREE.MeshBasicMaterial({ color: 0x050510 })
      );
      mesh.position.set(cx, this.groundY - 0.2, 0);
    } else if (type === 'rail') {
      const railMat = new THREE.MeshToonMaterial({ color: 0xCCCCCC });
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.5, 8), railMat);
      mesh.rotation.z = Math.PI / 2;
      mesh.position.set(cx, this.groundY + 0.4, z);
      const supp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), railMat);
      supp.position.set(cx, this.groundY + 0.2, z);
      this.scene.add(supp);
      extras.push(supp);
    } else if (type === 'stairs') {
      const stepMat = new THREE.MeshToonMaterial({ color: 0x7a7a8a });
      for (let s = 0; s < 4; s++) {
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.2 + s * 0.2, 1.5), stepMat
        );
        step.position.set(cx - 0.75 + s * 0.5, this.groundY + (0.1 + s * 0.1), z);
        this.scene.add(step);
        extras.push(step);
      }
    }

    if (mesh) {
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.obstacles.push({ mesh, extras });
    } else if (extras.length > 0) {
      this.obstacles.push({ mesh: extras[0], extras: extras.slice(1) });
    }
  }

  setRankTier(tier) {
    this.rankTier = Math.min(tier, OBSTACLE_SETS.length - 1);
    // Gradually increase speed with rank
    this.speed = 6 + tier * 0.8;
  }

  update(dt, boardX) {
    this.distance += this.speed * dt;
    const scroll = this.speed * dt;

    for (const seg of this.segments) {
      seg.mesh.position.x -= scroll;
      for (const e of seg.extras) e.position.x -= scroll;
    }
    for (const obs of this.obstacles) {
      if (obs.mesh) obs.mesh.position.x -= scroll;
      for (const e of obs.extras) e.position.x -= scroll;
    }

    // Cull segments that have scrolled too far behind
    const cullX = boardX - this.behindCount * this.segmentWidth;
    while (this.segments.length > 0) {
      const first = this.segments[0];
      if (first.mesh.position.x + this.segmentWidth / 2 < cullX) {
        this.scene.remove(first.mesh);
        for (const e of first.extras) this.scene.remove(e);
        this.segments.shift();
      } else break;
    }

    // Cull old obstacles
    while (this.obstacles.length > 0) {
      const obs = this.obstacles[0];
      if (!obs.mesh || obs.mesh.position.x < cullX) {
        if (obs.mesh) this.scene.remove(obs.mesh);
        for (const e of obs.extras) this.scene.remove(e);
        this.obstacles.shift();
      } else break;
    }

    // Add segments until we have enough ahead
    const aheadTarget = boardX + this.aheadCount * this.segmentWidth;
    let safetyLimit = 20;
    while (safetyLimit-- > 0) {
      const last = this.segments[this.segments.length - 1];
      const lastRight = last ? last.mesh.position.x + this.segmentWidth / 2 : boardX;
      if (lastRight < aheadTarget) this._addSegment();
      else break;
    }
  }

  getGroundY() { return this.groundY; }

  getNearbyObstacles(x, radius = 4) {
    return this.obstacles.filter(o => o.mesh && Math.abs(o.mesh.position.x - x) < radius);
  }
}
