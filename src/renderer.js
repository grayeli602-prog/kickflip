import * as THREE from 'three';

export class Renderer {
  constructor(container) {
    this.container = container;
    this.pixelLevel = 'medium'; // kept for settings compatibility, but no longer affects rendering

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xb8d8f0);
    this.scene.fog = new THREE.FogExp2(0xb8d8f0, 0.016);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    this.cameraPreset = 'standard';
    this._setCameraPreset('standard');

    this._setupLights();
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _setCameraPreset(preset) {
    this.cameraPreset = preset;
    if (preset === 'cinematic') {
      this.cameraOffset = new THREE.Vector3(-8, 5, 12);
      this.camera.fov = 45;
    } else if (preset === 'overhead') {
      this.cameraOffset = new THREE.Vector3(-4, 14, 8);
      this.camera.fov = 60;
    } else {
      this.cameraOffset = new THREE.Vector3(-6, 7, 14);
      this.camera.fov = 50;
    }
    this.camera.updateProjectionMatrix();
  }

  setCameraPreset(preset) { this._setCameraPreset(preset); }

  _setupLights() {
    const ambient = new THREE.AmbientLight(0xfff4e0, 0.85);
    this.scene.add(ambient);

    this.sunLight = new THREE.DirectionalLight(0xfff8e0, 2.8);
    this.sunLight.position.set(20, 30, 15);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 120;
    this.sunLight.shadow.camera.left = -30;
    this.sunLight.shadow.camera.right = 30;
    this.sunLight.shadow.camera.top = 20;
    this.sunLight.shadow.camera.bottom = -20;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const fillLight = new THREE.DirectionalLight(0xaad4ff, 0.4);
    fillLight.position.set(-10, 8, -5);
    this.scene.add(fillLight);
  }

  _resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  setPixelLevel(level) {
    this.pixelLevel = level;
    // No-op — pixelation removed. Kept so settings screen doesn't break.
  }

  followTarget(targetPos, dt) {
    const lag = 0.08;
    const desired = new THREE.Vector3().addVectors(targetPos, this.cameraOffset);
    this.camera.position.lerp(desired, lag * 60 * dt);
    const lookAt = targetPos.clone().add(new THREE.Vector3(4, 0, 0));
    this.camera.lookAt(lookAt);

    // Move sun with the board so shadows always cover the action
    this.sunLight.position.set(targetPos.x + 20, 30, targetPos.z + 15);
    this.sunLight.target.position.set(targetPos.x + 2, 0, targetPos.z);
    this.sunLight.target.updateMatrixWorld();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
