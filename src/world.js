import * as THREE from 'three';

const GROUND_COLOR  = 0x8a8a8a;
const CRACK_COLOR   = 0x666666;
const LINE_COLOR    = 0xc8b84a;

// Building facade colors — muted urban tones
const WALL_COLORS = [0x8a7c6e, 0x7a8a7a, 0x888880, 0x7a8294, 0x8a8070, 0x7c8a80];
const WALL_Z = -8;  // depth offset behind road

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

  _addSegment() {
    const last = this.segments[this.segments.length - 1];
    const leftEdge = last ? last.mesh.position.x + this.segmentWidth / 2 : 0;
    const cx = leftEdge + this.segmentWidth / 2;

    // Ground slab
    const geo = new THREE.BoxGeometry(this.segmentWidth - 0.1, 0.3, 12);
    const mat = new THREE.MeshStandardMaterial({ color: GROUND_COLOR, roughness: 0.92, metalness: 0.0 });
    const slab = new THREE.Mesh(geo, mat);
    slab.position.set(cx, this.groundY - 0.15, 0);
    slab.receiveShadow = true;
    this.scene.add(slab);

    const extras = [];

    // Crack line between segments
    const lineGeo = new THREE.BoxGeometry(0.06, 0.32, 12);
    const lineMat = new THREE.MeshStandardMaterial({ color: CRACK_COLOR, roughness: 0.9, metalness: 0 });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.position.set(leftEdge, this.groundY - 0.15, 0);
    this.scene.add(line);
    extras.push(line);

    // Yellow lane line every 3 segments
    if (this.segments.length % 3 === 0) {
      const ylGeo = new THREE.BoxGeometry(this.segmentWidth - 0.1, 0.31, 0.12);
      const ylMat = new THREE.MeshStandardMaterial({ color: LINE_COLOR, roughness: 0.8, metalness: 0 });
      const yl = new THREE.Mesh(ylGeo, ylMat);
      yl.position.set(cx, this.groundY - 0.14, 0);
      this.scene.add(yl);
      extras.push(yl);
    }

    // Background wall / building facade
    const wallMeshes = this._buildWallSection(leftEdge, cx);
    extras.push(...wallMeshes);

    this.segments.push({ mesh: slab, extras });

    // Possibly spawn obstacle
    const set = OBSTACLE_SETS[Math.min(this.rankTier, OBSTACLE_SETS.length - 1)];
    if (set.length > 0 && Math.random() < 0.28) {
      const type = set[Math.floor(Math.random() * set.length)];
      this._addObstacle(type, cx);
    }
  }

  _buildWallSection(leftEdge, cx) {
    const meshes = [];
    const wallH = 3.5 + Math.random() * 2.5;
    const wallColor = WALL_COLORS[Math.floor(Math.random() * WALL_COLORS.length)];

    // Main building face
    const wallGeo = new THREE.BoxGeometry(this.segmentWidth - 0.05, wallH, 0.5);
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.88, metalness: 0.04 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(cx, this.groundY + wallH / 2, WALL_Z);
    wall.receiveShadow = true;
    wall.castShadow = false;
    this.scene.add(wall);
    meshes.push(wall);

    // Roof cap
    const roofGeo = new THREE.BoxGeometry(this.segmentWidth - 0.05, 0.22, 0.75);
    const roofMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(wallColor).multiplyScalar(0.75).getHex(),
      roughness: 0.85, metalness: 0.0,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(cx, this.groundY + wallH + 0.11, WALL_Z + 0.05);
    this.scene.add(roof);
    meshes.push(roof);

    // Windows (1-3 per section)
    const numWin = 1 + Math.floor(Math.random() * 3);
    const winMat = new THREE.MeshStandardMaterial({ color: 0x4477aa, roughness: 0.05, metalness: 0.6 });
    const winW = 0.9, winH = 1.3;
    const availW = this.segmentWidth - 1.6;
    for (let w = 0; w < numWin; w++) {
      const wx = numWin === 1
        ? cx
        : leftEdge + 0.8 + (w / (numWin - 1)) * availW;
      const minWy = this.groundY + 1.2;
      const maxWy = this.groundY + wallH - 1.0;
      const wy = minWy + Math.random() * Math.max(0, maxWy - minWy);
      const winGeo = new THREE.BoxGeometry(winW, winH, 0.12);
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(wx, wy, WALL_Z - 0.22);
      this.scene.add(win);
      meshes.push(win);
    }

    return meshes;
  }

  _addObstacle(type, cx) {
    const z = (Math.random() - 0.5) * 2;
    let mesh = null;
    const extras = [];

    if (type === 'cone') {
      const g = new THREE.ConeGeometry(0.2, 0.5, 6);
      mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xFF5500, roughness: 0.7, metalness: 0 }));
      mesh.position.set(cx, this.groundY + 0.25, z);
    } else if (type === 'curb') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.25, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x999aaa, roughness: 0.8, metalness: 0 })
      );
      mesh.position.set(cx, this.groundY + 0.125, z);
    } else if (type === 'ledge') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.5, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.75, metalness: 0 })
      );
      mesh.position.set(cx, this.groundY + 0.25, z * 0.5);
    } else if (type === 'gap') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.1, 12),
        new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 1, metalness: 0 })
      );
      mesh.position.set(cx, this.groundY - 0.2, 0);
    } else if (type === 'rail') {
      const railMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.25, metalness: 0.85 });
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.5, 8), railMat);
      mesh.rotation.z = Math.PI / 2;
      mesh.position.set(cx, this.groundY + 0.4, z);
      const supp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), railMat);
      supp.position.set(cx, this.groundY + 0.2, z);
      this.scene.add(supp);
      extras.push(supp);
    } else if (type === 'stairs') {
      const stepMat = new THREE.MeshStandardMaterial({ color: 0x8a8a9a, roughness: 0.8, metalness: 0 });
      for (let s = 0; s < 4; s++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2 + s * 0.2, 1.5), stepMat);
        step.position.set(cx - 0.75 + s * 0.5, this.groundY + (0.1 + s * 0.1), z);
        this.scene.add(step);
        extras.push(step);
      }
    }

    if (mesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.obstacles.push({ mesh, extras });
    } else if (extras.length > 0) {
      this.obstacles.push({ mesh: extras[0], extras: extras.slice(1) });
    }
  }

  setRankTier(tier) {
    this.rankTier = Math.min(tier, OBSTACLE_SETS.length - 1);
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

    // Cull old segments
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

    // Add new segments ahead
    const aheadTarget = boardX + this.aheadCount * this.segmentWidth;
    let safety = 20;
    while (safety-- > 0) {
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
