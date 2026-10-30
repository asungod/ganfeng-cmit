// 门厅背景：暮色赣江 — 远处滕王阁剪影、薄雾、河灯，镜头缓慢漂移。Light scene: no shadows, low particle counts.
import * as THREE from "three";
import { makeBoats, makeHills, makePavilion } from "./pavilion";
import { disposeScene, loadHdri, lowPower, makePost, makeRenderer, particles, type Post } from "./kit";

export class LobbyScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);
  private post: Post;
  private raf = 0;
  private disposed = false;
  private lanterns: ReturnType<typeof particles>;
  private mist: ReturnType<typeof particles>;
  private water: THREE.Mesh;
  private t0 = performance.now();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = makeRenderer(canvas, 0.75);
    this.renderer.shadowMap.enabled = false;
    this.scene.fog = new THREE.FogExp2(0x6a4a50, 0.016);
    this.scene.background = new THREE.Color(0x241830);
    // v52: env only — dusk HDRI sun disc looked like 落霞球 behind cards
    loadHdri(this.renderer, this.scene, "qwantani_dusk_2_puresky", false);
    this.scene.environmentIntensity = 0.55;
    this.scene.backgroundIntensity = 1;
    this.scene.add(new THREE.HemisphereLight(0xffc8a0, 0x1a1418, 0.7));
    const sun = new THREE.DirectionalLight(0xffb070, 2.0);
    sun.position.set(-20, 6, -30);
    this.scene.add(sun);
    // flat vermilion→gold horizon wash behind pavilion (no orb)
    {
      const c = document.createElement("canvas"); c.width = 512; c.height = 128;
      const x = c.getContext("2d")!;
      const g = x.createLinearGradient(0, 128, 0, 0);
      g.addColorStop(0, "rgba(255,220,140,0.95)"); g.addColorStop(0.35, "rgba(240,100,55,0.85)");
      g.addColorStop(0.7, "rgba(140,50,90,0.35)"); g.addColorStop(1, "rgba(40,30,70,0)");
      x.fillStyle = g; x.fillRect(0, 0, 512, 128);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const band = new THREE.Mesh(new THREE.PlaneGeometry(160, 28), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false, fog: false, depthTest: false }));
      band.position.set(-8, 10, -48); band.renderOrder = -2; this.scene.add(band);
    }
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x4a5060, roughness: 0.08, metalness: 0.9, envMapIntensity: 1.3 }),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.scene.add(this.water);
    this.scene.add(makeHills());
    const pav = makePavilion();
    pav.position.set(15, 0, -26);
    pav.rotation.y = -0.6;
    pav.scale.setScalar(1.2);
    this.scene.add(pav);
    const boats = makeBoats();
    boats.position.set(-2, 0, -6);
    this.scene.add(boats);
    this.lanterns = particles(lowPower() ? 30 : 70, new THREE.Box3(new THREE.Vector3(-20, 0.1, -26), new THREE.Vector3(20, 0.5, 4)), 0xffa050, 0.5, 0.95, "fly");
    this.scene.add(this.lanterns.points);
    this.mist = particles(120, new THREE.Box3(new THREE.Vector3(-40, 0.3, -40), new THREE.Vector3(40, 2.5, -5)), 0xe8c8c0, 4, 0.06, "mist");
    this.scene.add(this.mist.points);
    this.post = makePost(this.renderer, this.scene, this.camera, 0.5, 0.85);
    this.resize();
    this.loop();
  }

  resize(): void {
    const w = this.canvas.clientWidth || 1280, h = this.canvas.clientHeight || 800;
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const t = (performance.now() - this.t0) / 1000;
    // slow drift along the river bank
    this.camera.position.set(-6 + Math.sin(t * 0.03) * 5, 2.2 + Math.sin(t * 0.05) * 0.3, 8 + Math.cos(t * 0.025) * 2);
    this.camera.lookAt(0 + Math.sin(t * 0.03) * 1.5, 4.6, -24);
    this.lanterns.update(t);
    this.mist.update(t);
    this.post.render();
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    disposeScene(this.scene);
    this.renderer.dispose();
  }
}
