import {
  Scene,
  PerspectiveCamera,
  DirectionalLight,
  AmbientLight,
  PointLight,
  Fog,
  WebGLRenderer,
  Color,
  Timer,
  Vector3,
  Vector2,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  Mesh,
  LineSegments,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createHouseModel } from './houseModel';

export interface Hero3DConfig {
  canvas: HTMLCanvasElement;
  onReady: () => void;
  reducedMotion: boolean;
}

export class Hero3DScene {
  private scene: Scene;
  private camera: PerspectiveCamera;
  private renderer: WebGLRenderer;
  private composer: EffectComposer;
  private timer: Timer;
  private house: ReturnType<typeof createHouseModel>;
  private animationId: number | null = null;
  private config: Hero3DConfig;
  private targetPosition = new Vector3();
  private currentPosition = new Vector3();
  private isDisposed = false;
  private isContextLost = false;
  private introProgress = 0;
  private introDuration: number;
  // Stored as arrow-function properties so addEventListener/removeEventListener get the SAME reference.
  private onResize = (): void => this.handleResize();
  private onVisibilityChange = (): void => this.handleVisibility();

  constructor(config: Hero3DConfig) {
    this.config = config;
    this.timer = new Timer();
    this.introDuration = 1800;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer(config.canvas);
    this.composer = this.createComposer(this.renderer);
    this.house = createHouseModel();

    this.scene.add(this.house);
    this.setupLights();
    this.handleResize();

    window.addEventListener('resize', this.onResize);
    config.canvas.addEventListener('webglcontextlost', this.onContextLost);
    config.canvas.addEventListener('webglcontextrestored', this.onContextRestored);

    this.timer.reset();

    if (!config.reducedMotion) {
      this.animate();
      this.bindVisibility();
    } else {
      this.camera.position.set(0, 8, 22);
      this.camera.lookAt(0, 4, 0);
      this.renderFrame();
      config.onReady();
    }
  }

  private createScene(): Scene {
    const scene = new Scene();
    scene.background = new Color('#0b0d0e');
    scene.fog = new Fog('#0b0d0e', 8, 26);
    return scene;
  }

  private createCamera(): PerspectiveCamera {
    const camera = new PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 8, 35);
    camera.lookAt(0, 4, 0);
    return camera;
  }

  private createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
    const renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputColorSpace = SRGBColorSpace;
    return renderer;
  }

  private setupLights(): void {
    const moonLight = new DirectionalLight(new Color('#8fa3ad'), 0.15);
    moonLight.position.set(10, 30, 15);
    this.scene.add(moonLight);

    const ambientLight = new AmbientLight(new Color('#1a1f24'), 0.35);
    this.scene.add(ambientLight);

    const interiorLight = new PointLight(new Color('#ffedd6'), 0.8, 25);
    interiorLight.position.set(0, 5, 2);
    this.scene.add(interiorLight);

    const interiorLight2 = new PointLight(new Color('#ffedd6'), 0.4, 20);
    interiorLight2.position.set(-4, 4, -5);
    this.scene.add(interiorLight2);
  }

  private createComposer(renderer: WebGLRenderer): EffectComposer {
    const renderPass = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new Vector2(window.innerWidth, window.innerHeight),
      0.55,
      0.4,
      0.15
    );
    const composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    return composer;
  }

  private handleResize(): void {
    if (this.isDisposed || this.isContextLost) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private animate = (): void => {
    if (this.isDisposed) return;
    if (this.isContextLost) {
      // Wait for restore; schedule a re-check next frame.
      this.animationId = requestAnimationFrame(this.animate);
      return;
    }
    this.animationId = requestAnimationFrame(this.animate);

    this.timer.update();
    const elapsed = this.timer.getElapsed();

    if (this.introProgress < 1) {
      this.introProgress = Math.min(1, elapsed / (this.introDuration / 1000));
      const eased = 1 - Math.pow(1 - this.introProgress, 5);
      this.camera.position.z = 35 - 13 * eased;
      this.camera.lookAt(0, 4, 0);

      if (this.introProgress >= 1) {
        this.config.onReady();
      }
    }

    if (this.introProgress >= 1 && this.targetPosition.length() > 0) {
      this.currentPosition.lerp(this.targetPosition, 0.04);
      this.camera.position.x = this.currentPosition.x;
      this.camera.position.y = 8 + this.currentPosition.y;
      this.camera.lookAt(0, 4, 0);
    }

    this.renderFrame();
  };

  private renderFrame(): void {
    if (this.isContextLost) return;
    this.composer.render();
  }

  private bindVisibility(): void {
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private handleVisibility = (): void => {
    if (document.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  };

  private onContextLost = (event: Event): void => {
    event.preventDefault();
    this.isContextLost = true;
    this.pause();
  };

  private onContextRestored = (): void => {
    this.isContextLost = false;
    this.timer.reset();
    this.introProgress = 0;
    if (!this.config.reducedMotion) this.animate();
  };

  public pause(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public resume(): void {
    if (this.animationId !== null || this.isDisposed) return;
    if (document.hidden) return;
    this.timer.reset();
    this.introProgress = 0;
    this.animate();
  }

  public setMousePosition(x: number, y: number): void {
    if (this.config.reducedMotion || this.introProgress < 1) return;
    this.targetPosition.x = x * 1.5;
    this.targetPosition.y = y * 0.8;
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.config.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.config.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);

    this.house.traverse((obj) => {
      if (obj instanceof Mesh || obj instanceof LineSegments) {
        obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });

    this.composer.dispose();
    this.renderer.dispose();
  }
}
