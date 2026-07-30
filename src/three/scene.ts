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
  private introProgress = 0;
  private introDuration: number;

  constructor(config: Hero3DConfig) {
    this.config = config;
    this.timer = new Timer();
    this.introDuration = 1800; // ms

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer(config.canvas);
    this.composer = this.createComposer(this.renderer);
    this.house = createHouseModel();

    this.scene.add(this.house);
    this.setupLights();
    this.handleResize();
    window.addEventListener('resize', this.handleResize.bind(this));

    this.timer.start();

    if (!config.reducedMotion) {
      this.animate();
    } else {
      // Posición final inmediata en reduced motion
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
    camera.position.set(0, 8, 35); // posición inicial alejada para dolly-in
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
    // Luz direccional "luna" - fría, tenue
    const moonLight = new DirectionalLight(new Color('#8fa3ad'), 0.15);
    moonLight.position.set(10, 30, 15);
    this.scene.add(moonLight);

    // Luz ambiental tenue, grisácea azulada
    const ambientLight = new AmbientLight(new Color('#1a1f24'), 0.35);
    this.scene.add(ambientLight);

    // Point light interior (ventanas) - cálida
    const interiorLight = new PointLight(new Color('#ffedd6'), 0.8, 25);
    interiorLight.position.set(0, 5, 2);
    this.scene.add(interiorLight);

    // Point light secundaria (esquina opuesta)
    const interiorLight2 = new PointLight(new Color('#ffedd6'), 0.4, 20);
    interiorLight2.position.set(-4, 4, -5);
    this.scene.add(interiorLight2);
  }

  private createComposer(renderer: WebGLRenderer): EffectComposer {
    const renderPass = new RenderPass(this.scene, this.camera);

    const bloomPass = new UnrealBloomPass(
      new Vector2(window.innerWidth, window.innerHeight),
      0.55,   // strength
      0.4,    // radius
      0.15    // threshold - alto para que solo emissive Signal lo dispare
    );

    const composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    return composer;
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private animate(): void {
    if (this.isDisposed) return;
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    this.timer.update();
    const elapsed = this.timer.getElapsedTime();

    // Dolly-in de entrada (easeOutExpo)
    if (this.introProgress < 1) {
      this.introProgress = Math.min(1, elapsed / (this.introDuration / 1000));
      const eased = 1 - Math.pow(1 - this.introProgress, 5); // easeOutExpo aproximado

      // Interpolar desde posición inicial (0, 8, 35) a final (0, 8, 22)
      this.camera.position.z = 35 - 13 * eased;
      this.camera.lookAt(0, 4, 0);

      if (this.introProgress >= 1) {
        this.config.onReady();
      }
    }

    // Parallax de mouse suave (solo después del intro)
    if (this.introProgress >= 1 && this.targetPosition.length() > 0) {
      this.currentPosition.lerp(this.targetPosition, 0.04);
      this.camera.position.x = this.currentPosition.x;
      this.camera.position.y = 8 + this.currentPosition.y;
      this.camera.lookAt(0, 4, 0);
    }

    this.renderFrame();
  }

  private renderFrame(): void {
    this.composer.render();
  }

  public setMousePosition(x: number, y: number): void {
    if (this.config.reducedMotion || this.introProgress < 1) return;
    // Normalizar a [-1, 1] y aplicar factor pequeño
    this.targetPosition.x = x * 1.5;
    this.targetPosition.y = y * 0.8;
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('resize', this.handleResize.bind(this));

    this.house.traverse((obj) => {
      if (obj instanceof Mesh) {
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

    this.renderer.dispose();
    this.composer.dispose();
  }
}