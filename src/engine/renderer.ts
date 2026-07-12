import * as THREE from 'three';
import type { WardState } from '../rooms/types';
import { TUNING } from '../tuning';

interface MoodTarget {
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
  hemi: number;
  amb: number;
  pointIntensity: number;
  pointColor: THREE.Color;
}

// Lucid/unmed target values, lerped toward each frame in update() — ported
// from v0.1's moodTargets()/animate() mood section.
//
// Fog distances tuned to room scale (rooms run roughly 6-14m across, up to a
// ~19m diagonal in room5): lucid fog now sits close enough to actually haze
// the far end of the bigger rooms instead of never being reached, keeping
// the "flat, clean, fluorescent-even" read up close. Unmed is pulled in
// tighter still for a denser, more claustrophobic haze. hemi/amb nudged up
// slightly in both states so the new procedural wall/floor textures have
// enough fill light to read instead of going flat-black or flat-white.
function moodTargets(state: WardState): MoodTarget {
  return state === 'lucid'
    ? {
        fogColor: new THREE.Color(0xd7e4df),
        fogNear: 9,
        fogFar: 30,
        hemi: 0.85,
        amb: 0.28,
        pointIntensity: 0.7,
        pointColor: new THREE.Color(0xf2fffb),
      }
    : {
        fogColor: new THREE.Color(0x170b0a),
        fogNear: 2.6,
        fogFar: 13,
        hemi: 0.17,
        amb: 0.13,
        pointIntensity: 0.5,
        pointColor: new THREE.Color(0xff3324),
      };
}

export class Renderer {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;

  private webgl: THREE.WebGLRenderer;
  private hemi: THREE.HemisphereLight;
  private amb: THREE.AmbientLight;
  private roomLights: THREE.PointLight[] = [];
  private moodInitialized = false;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(TUNING.camera.fov, window.innerWidth / window.innerHeight, 0.05, 100);
    this.camera.rotation.order = 'YXZ';

    this.webgl = new THREE.WebGLRenderer({ antialias: true });
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.webgl.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.webgl.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.webgl.setSize(window.innerWidth, window.innerHeight);
    });

    this.hemi = new THREE.HemisphereLight(0xeafffa, 0x2c3835, 0.85);
    this.scene.add(this.hemi);
    this.amb = new THREE.AmbientLight(0xffffff, 0.28);
    this.scene.add(this.amb);

    this.scene.fog = new THREE.Fog(0xdfe8e4, 9, 30);
  }

  setRoomLights(positions: Array<[number, number]>): void {
    for (const l of this.roomLights) {
      this.scene.remove(l);
      const disposable = l as unknown as { dispose?: () => void };
      disposable.dispose?.();
    }
    this.roomLights = positions.map(([x, z]) => {
      const l = new THREE.PointLight(0xf2fffb, 0.7, 12);
      l.position.set(x, 2.7, z);
      this.scene.add(l);
      return l;
    });
  }

  fovKick(): void {
    this.camera.fov = TUNING.camera.shiftFovKick;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, t: number, state: WardState): void {
    const tgt = moodTargets(state);
    const fog = this.scene.fog as THREE.Fog;

    if (!this.moodInitialized) {
      // Snap to the starting state's mood instead of lerping in from the
      // constructor's placeholder fog, matching v0.1's startup behaviour.
      fog.color.copy(tgt.fogColor);
      fog.near = tgt.fogNear;
      fog.far = tgt.fogFar;
      this.hemi.intensity = tgt.hemi;
      this.amb.intensity = tgt.amb;
      for (const l of this.roomLights) {
        l.color.copy(tgt.pointColor);
        l.intensity = tgt.pointIntensity;
      }
      this.moodInitialized = true;
    }

    const k = Math.min(1, dt * 2.2);
    fog.color.lerp(tgt.fogColor, k);
    fog.near += (tgt.fogNear - fog.near) * k;
    fog.far += (tgt.fogFar - fog.far) * k;
    this.hemi.intensity += (tgt.hemi - this.hemi.intensity) * k;
    this.amb.intensity += (tgt.amb - this.amb.intensity) * k;
    this.webgl.setClearColor(fog.color);

    this.roomLights.forEach((l, i) => {
      l.color.lerp(tgt.pointColor, k);
      const flick =
        state === 'unmed' ? (Math.random() < 0.06 ? 0.25 : 1) * (0.8 + 0.2 * Math.sin(t * 13 + i * 7)) : 1;
      l.intensity += (tgt.pointIntensity * flick - l.intensity) * Math.min(1, dt * 8);
    });

    // FOV recovers from the shift kick back to the resting value.
    if (this.camera.fov > TUNING.camera.fov + 0.05) {
      this.camera.fov += (TUNING.camera.fov - this.camera.fov) * Math.min(1, dt * 6);
      this.camera.updateProjectionMatrix();
    }
  }

  render(): void {
    this.webgl.render(this.scene, this.camera);
  }
}
