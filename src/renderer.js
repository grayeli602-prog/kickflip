import * as THREE from 'three';

export class Renderer {
  constructor(container) {
    this.container = container;
    this.pixelLevel = 'medium'; // low/medium/high

    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.setPixelRatio(1);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 30, 80);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
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
    } else { // standard
      this.cameraOffset = new THREE.Vector3(-6, 7, 14);
      this.camera.fov = 50;
    }
    this.camera.updateProjectionMatrix();
  }

  setCameraPreset(preset) { this._setCameraPreset(preset); }

  _setupLights() {
    const ambient = new THREE.AmbientLight(0x404060, 1.2);
    this.scene.add(ambient);

    this.sunLight = new THREE.DirectionalLight(0xfff0d0, 2.0);
    this.sunLight.position.set(10, 20, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(512, 512);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 80;
    this.sunLight.shadow.camera.left = -20;
    this.sunLight.shadow.camera.right = 20;
    this.sunLight.shadow.camera.top = 10;
    this.sunLight.shadow.camera.bottom = -10;
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0x8080ff, 0.5);
    this.fillLight.position.set(-5, 3, -5);
    this.scene.add(this.fillLight);
  }

  _resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const pixelScale = this.pixelLevel === 'low' ? 0.35
      : this.pixelLevel === 'high' ? 0.6 : 0.45;
    this.renderer.setSize(Math.floor(w * pixelScale), Math.floor(h * pixelScale), false);
    this.renderer.domElement.style.width = w + 'px';
    this.renderer.domElement.style.height = h + 'px';
  }

  setPixelLevel(level) {
    this.pixelLevel = level;
    this._resize();
  }

  // Smooth camera follow
  followTarget(targetPos, dt) {
    const lag = 0.08;
    const desired = new THREE.Vector3().addVectors(targetPos, this.cameraOffset);
    this.camera.position.lerp(desired, lag * 60 * dt);
    const lookAt = targetPos.clone().add(new THREE.Vector3(4, 0, 0));
    this.camera.lookAt(lookAt);
  }

  zoomIn(amount = 0.85) {
    this._zoomFactor = amount;
  }
  zoomOut() {
    this._zoomFactor = 1.0;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
