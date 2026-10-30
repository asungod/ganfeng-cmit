import * as THREE from "three";
import { inkGoose } from "./guofeng";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { lowPower, shadowSize, Flight, loadHdri, makePost, particles, phMat, skyBand, type Post } from "./kit";
import type { ImageId, MoodId } from "../data/tengwang";

const MARK: Record<ImageId, THREE.Vector3> = {
  luoxia: new THREE.Vector3(-6, 5.0, -38), // v52: pin ON dusk band, not mid-sky ball
  guwu: new THREE.Vector3(-2.4, 3.4, -6),
  qiushui: new THREE.Vector3(0.2, 0.05, 2.2),
  changtian: new THREE.Vector3(1.5, 8.5, -10),
  yuzhou: new THREE.Vector3(-4.2, 0.12, 3.6),
  yanzhen: new THREE.Vector3(6.5, 7.2, -12),
  feige: new THREE.Vector3(3.4, 4.0, -12.5),
  hantan: new THREE.Vector3(-6.8, 0.04, 1.4),
};

export class PavilionScene {
  readonly canvas: HTMLCanvasElement;
  mood: MoodId = "luoxia";
  focus: ImageId = "luoxia";
  onProject: ((pts: Record<ImageId, { x: number; y: number; vis?: boolean }>) => void) | null = null;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private raf = 0;
  private disposed = false;
  private t0 = performance.now();
  private duck: THREE.Group;
  private sun: THREE.Object3D;
  private sunLight: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private water: THREE.Group;
  private waterMesh: THREE.Mesh;
  private waterOrig: Float32Array;
  private fog: THREE.FogExp2;
  private glow: THREE.Mesh;
  private glowBase = 1.15; // v52: ensure band reads full-width
  private glowRefl!: THREE.Mesh;
  private horizonBand!: THREE.Mesh;
  private warm = true;
  private ray = new THREE.Raycaster();
  private occ: Record<string, boolean> = {};
  private occN = 0;
  private markers = new Map<ImageId, THREE.Object3D>();
  private look = new THREE.Vector3(2.6, 3.2, -12.5);
  private post!: Post;
  private flight!: Flight;
  private mist!: ReturnType<typeof particles>;
  private started = false;
  private lastKey = "";
  private lastT = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower() ? 1 : 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.7; // v51: clearer dusk gradient + 阁 silhouette
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0xb0744a, 0.006); // v51: warmer thinner — 江面 catch not muddied
    this.scene.fog = this.fog;
    this.scene.background = new THREE.Color(0x1a1d38);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
    this.camera.position.set(-4.2, 3.0, 1.5);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.autoRotate = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 30;
    this.controls.minPolarAngle = Math.PI * 0.32;
    this.controls.maxPolarAngle = Math.PI * 0.62; // v29: allow a low 江面 eye (clamped above the water in loop)
    this.controls.target.copy(this.look);

    this.hemi = new THREE.HemisphereLight(0xffd0a8, 0x1a1418, 0.95);
    this.scene.add(this.hemi);

    this.sunLight = new THREE.DirectionalLight(0xffe2b0, 3.9); // v51
    this.sunLight.position.copy(MARK.luoxia);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(shadowSize(), shadowSize());
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 40;
    this.sunLight.shadow.camera.left = -16;
    this.sunLight.shadow.camera.right = 16;
    this.sunLight.shadow.camera.top = 12;
    this.sunLight.shadow.camera.bottom = -8;
    this.scene.add(this.sunLight);

    const fill = new THREE.PointLight(0x88aacc, 0.55, 40);
    fill.position.set(-8, 4, 6);
    this.scene.add(fill);

    this.water = makeWater();
    this.waterMesh = this.water.children[0] as THREE.Mesh;
    this.waterOrig = (this.waterMesh.geometry.attributes.position.array as Float32Array).slice();
    this.scene.add(this.water);
    this.scene.add(makeHills());
    const pavilion = makePavilion();
    pavilion.position.set(3.4, 0, -12.5);
    pavilion.rotation.y = -0.42;
    pavilion.scale.setScalar(1.22); // v50: stronger 阁楼 silhouette against 落霞
    this.scene.add(pavilion);
    // riverbank: terraced mud + stone face + willow fringe (not a flat box)
    this.scene.add(makeRiverbank());
    this.markers.set("feige", pavilion);

    this.scene.add(makeBoats());
    this.duck = makeDuck();
    this.scene.add(this.duck);
    this.markers.set("guwu", this.duck);
    this.markers.set("yuzhou", this.scene.getObjectByName("boats")!);
    this.markers.set("yanzhen", makeGeese());
    this.scene.add(this.markers.get("yanzhen")!);

    // v52: invisible marker only — NO SphereGeometry sun ball (用户: 落霞咋是个球)
    this.sun = new THREE.Object3D();
    this.sun.position.copy(MARK.luoxia);
    this.scene.add(this.sun);
    void skyBand;
    // v52: wide flat 国风 dusk wash — vermilion→gold ribbon along horizon, not an orb
    // v52c: bands BEHIND far hills (z<-34) so terrain never clips them into a sun-disc silhouette
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(220, 5.6), new THREE.MeshBasicMaterial({ map: luoxiaSky(), color: 0xffc898, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide, fog: false, depthTest: true })); // v53r4: depth so band sits behind pavilion
    this.glow.position.set(0, 5.35, -58); // v53r3: further behind so band not over pavilion
    this.glow.rotation.set(0, 0, 0); this.glow.renderOrder = -2;
    this.horizonBand = new THREE.Mesh(new THREE.PlaneGeometry(180, 4), new THREE.MeshBasicMaterial({ map: luoxiaSky(), color: 0xffe8c0, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide, fog: false, depthTest: true })); // v53r4
    this.horizonBand.position.set(0, 5.0, -55); this.horizonBand.rotation.set(0, 0, 0); this.horizonBand.renderOrder = -2; // v53r3
    this.glowRefl = new THREE.Mesh(new THREE.PlaneGeometry(56, 36), new THREE.MeshBasicMaterial({ map: luoxiaRefl(), transparent: true, opacity: 0.42, depthWrite: false, fog: false }));
    this.glowRefl.rotation.x = -Math.PI / 2; this.glowRefl.position.set(-4, 0.06, -10); this.glowRefl.renderOrder = 2;
    this.scene.add(this.glowRefl, this.glow, this.horizonBand);

    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 32),
      new THREE.MeshStandardMaterial({ color: 0x143038, roughness: 0.2, metalness: 0.15 }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.copy(MARK.hantan);
    pool.position.y = 0.02;
    this.scene.add(pool);
    this.markers.set("hantan", pool);
    this.markers.set("luoxia", this.sun);
    this.markers.set("qiushui", this.water);
    this.markers.set("changtian", this.glow);

    this.mist = particles(260, new THREE.Box3(new THREE.Vector3(-34, 0.15, -30), new THREE.Vector3(30, 1.4, -9)), 0xe8d0b8, 2.4, 0.055, "mist");
    this.scene.add(this.mist.points);
    // v52: HDRI for lighting only — dusk puresky sun disc was the "落霞球"
    loadHdri(this.renderer, this.scene, "qwantani_dusk_2_puresky", false);
    this.scene.background = new THREE.Color(0x2a2040); // v52d: soft dusk violet, not void
    this.scene.environmentIntensity = 0.42; // painted horizon band carries 落霞
    this.post = makePost(this.renderer, this.scene, this.camera, 0.12, 0.92); // v53r2: cut halo further
    this.flight = new Flight(this.camera, this.controls.target);
    this.resize();
    this.applyMood();
    // hero composition: pavilion right, setting sun left over the river
    this.camera.position.set(-11.8, 2.05, 7.6); // v51: left/low — warmer band + river catch + 阁
    this.controls.target.set(0.3, 1.45, -11.2);
    this.started = true;
    this.loop();
  }

  resize(): void {
    const w = this.canvas.clientWidth || 960;
    const h = this.canvas.clientHeight || 540;
    this.renderer.setSize(w, h, false);
    this.post?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.controls.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) m.dispose();
      }
    });
    this.renderer.dispose();
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const t = (performance.now() - this.t0) / 1000;
    this.duck.position.set(-2.4 + Math.sin(t * 0.35) * 3.2, 3.35 + Math.sin(t * 1.1) * 0.25, -6 + Math.cos(t * 0.28) * 1.4);
    this.duck.rotation.y = Math.sin(t * 0.35) * 0.4;
    const geese = this.markers.get("yanzhen");
    if (geese) geese.position.x = 6.5 + Math.sin(t * 0.12) * 0.8;
    const rw = this.water.userData.reflective as Water | undefined;
    if (rw) (rw.material as THREE.ShaderMaterial).uniforms.time.value = t * 0.5;
    if (!rw) {
    const pos = this.waterMesh.geometry.attributes.position as THREE.BufferAttribute;
    const orig = this.waterOrig;
    const amp = lowPower() ? 0.035 : 0.055;
    for (let i = 0; i < pos.count; i++) {
      const x = orig[i * 3];
      const y = orig[i * 3 + 1];
      const z =
        Math.sin(x * 0.18 + t * 1.15) * amp +
        Math.sin(y * 0.14 + t * 0.85) * amp * 0.7 +
        Math.sin((x + y) * 0.35 + t * 1.8) * amp * 0.35 +
        Math.sin(x * 0.55 - t * 2.2) * amp * 0.18;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    if (!lowPower() || (this.raf % 2 === 0)) this.waterMesh.geometry.computeVertexNormals();
    }
    // glitter path gently pulses with the sun path
    const glitter = this.water.getObjectByName("glitterPath") as THREE.Mesh | undefined;
    if (glitter) {
      const gm = glitter.material as THREE.MeshBasicMaterial;
      { const c = this.camera.position, tg = this.controls.target; const el = Math.max(0, Math.min(1, (c.y - tg.y) / c.distanceTo(tg))); gm.opacity = (0.12 + Math.sin(t * 0.6) * 0.04) * Math.max(0, 1 - el * 2.0); }
    }
    // wing flap on geese + lone duck
    const flap = (bird: THREE.Object3D, phase: number) => {
      const a = Math.sin(t * 4.5 + phase) * 0.35;
      const l = bird.getObjectByName("wingL");
      const r = bird.getObjectByName("wingR");
      if (l) l.rotation.x = -(0.1 + a * 1.4);
      if (r) r.rotation.x = 0.1 + a * 1.4;
    };
    flap(this.duck, 0);
    const geeseG = this.markers.get("yanzhen");
    if (geeseG) geeseG.children.forEach((c, i) => flap(c, i * 0.7));
    const now = performance.now();
    this.flight.step(Math.min(0.3, (now - this.lastT) / 1000));
    this.lastT = now;
    this.mist.update(t);
    this.controls.update();
    if (this.camera.position.y < 0.35) this.camera.position.y = 0.35; // v30: true 江面 eye, still above the river
    { // v30: when the eye drops near the water, ease the target down so the view is genuinely river-level
      const low = Math.max(0, Math.min(1, (2.4 - this.camera.position.y) / 2));
      const ty = this.look.y + (Math.min(this.look.y, 1.3) - this.look.y) * low;
      this.controls.target.y += (ty - this.controls.target.y) * 0.15;
    }
    {
      // v29: top-down views — calm the reflection distortion and the 落霞 sprite so they don't tear / look pasted
      const el = Math.max(0, Math.min(1, (this.camera.position.y - this.controls.target.y) / this.camera.position.distanceTo(this.controls.target)));
      const rw2 = this.water.userData.reflective as Water | undefined;
      if (rw2) (rw2.material as THREE.ShaderMaterial).uniforms.distortionScale.value = 1.2 * (1 - el * 0.8);
      if (rw2) (rw2.material as THREE.ShaderMaterial).uniforms.reflK.value = Math.max(0.08, 1 - el * 1.4); // v31: weaker mirror at high angles (no silver streaks)
      if (rw2) (rw2.material as THREE.ShaderMaterial).uniforms.sunColor.value.setRGB(1, 0.9, 0.68).multiplyScalar(Math.max(0.42, 1 - el * 1.2)); // v51b: clearer low-eye river catch
      { // v36: 江雾 only when camera stays on the near bank — past the pavilion it washed orbits white
        const zGate = Math.min(1, Math.max(0, (this.camera.position.z + 2) / 8));
        this.mist.material.opacity = 0.055 * Math.max(0, 1 - el * 1.6) * zGate; // v42: soft bank mist
        this.mist.points.visible = zGate > 0.05;
      }
      { // v35/v36: only show painted 落霞 + water reflection when looking toward it
        const tg = this.controls.target, cp = this.camera.position;
        const ax = this.glow.position.x - tg.x, az = this.glow.position.z - tg.z, bx = tg.x - cp.x, bz = tg.z - cp.z;
        const f = Math.max(0, (ax * bx + az * bz) / (Math.hypot(ax, az) * Math.hypot(bx, bz) + 1e-6));
        const ff = Math.max(0, (f - 0.05) / 0.95);
        const skyOp = this.glowBase * (1 - el * 0.55) * Math.pow(ff, 1.1);
        const gm = this.glow.material as THREE.MeshBasicMaterial;
        gm.opacity = skyOp; this.glow.visible = skyOp > 0.025;
        const hb = this.horizonBand.material as THREE.MeshBasicMaterial;
        hb.opacity = skyOp * 0.9; this.horizonBand.visible = hb.opacity > 0.02;
        // v51b: lift low-eye 江面 catch light
        (this.glowRefl.material as THREE.MeshBasicMaterial).opacity = (this.warm ? 0.62 : 0.16) * Math.max(0.32, 1 - el * 1.15) * Math.pow(ff, 1.05);
      }
    }
    this.post.render();
    this.emitProject();
  };

  private isMarker(o: THREE.Object3D, m?: THREE.Object3D): boolean {
    for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === m || p === this.water) return true;
    return false;
  }

  private emitProject(): void {
    if (!this.onProject) return;
    const pts = {} as Record<ImageId, { x: number; y: number; vis?: boolean }>;
    const doOcc = (this.occN++ % 6) === 0;
    (Object.keys(MARK) as ImageId[]).forEach((id) => {
      const obj = this.markers.get(id);
      const world = obj ? new THREE.Vector3() : MARK[id].clone();
      if (obj) obj.getWorldPosition(world);
      else world.copy(MARK[id]);
      if (doOcc) {
        // v29: label hidden when its subject is behind the pavilion from this angle
        const d = world.distanceTo(this.camera.position);
        this.ray.set(this.camera.position, world.clone().sub(this.camera.position).normalize());
        this.ray.far = d - 0.8;
        this.ray.camera = this.camera;
        const hit = this.ray.intersectObjects(this.scene.children, true).find((h) => (h.object as THREE.Mesh).isMesh && h.object.name !== "waterMain" && h.object.visible && !(h.object as THREE.Mesh & { isSprite?: boolean }).isSprite && !this.isMarker(h.object, obj));
        this.occ[id] = !!hit;
      }
      const v = world.project(this.camera);
      const on = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      pts[id] = { x: (v.x * 0.5 + 0.5) * 100, y: (-v.y * 0.5 + 0.5) * 100, vis: on && !this.occ[id] };
    });
    this.onProject(pts);
  }

  applyMood(): void {
    const pal = palette(this.mood, this.focus);
    this.fog.color.set(pal.haze);
    this.scene.backgroundIntensity = pal.sky;
    this.hemi.color.set(pal.sun);
    this.hemi.groundColor.set(pal.hill);
    this.sunLight.color.set(pal.sun);
    this.sunLight.intensity = pal.key;
    {
      const wmat = (this.water.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial & THREE.ShaderMaterial;
      if (wmat.uniforms?.waterColor) wmat.uniforms.waterColor.value.set(pal.water).multiplyScalar(0.42);
      else wmat.color.set(pal.water);
    }
    this.warm = pal.warm;
    const gm = this.glow.material as THREE.MeshBasicMaterial;
    if (this.warm) gm.color.set(0xffd9a8); else gm.color.set(pal.glow).lerp(new THREE.Color(0xffffff), 0.2);
    (this.glowRefl.material as THREE.MeshBasicMaterial).color.copy(gm.color);
    (this.horizonBand.material as THREE.MeshBasicMaterial).color.copy(gm.color).lerp(new THREE.Color(0xffffff), 0.15);
    this.look.copy(MARK[this.focus]);
    if (this.focus === "qiushui" || this.focus === "hantan") this.look.y = 0.4;
    if (this.focus === "changtian") this.look.set(2, 5.5, -8);
    if (this.focus === "feige") this.look.set(2.6, 3.2, -12.5);
    const key = this.focus + "|" + this.mood;
    if (this.started && this.lastKey && key !== this.lastKey) {
      const d = { luoxia: 20, guwu: 9, qiushui: 10, changtian: 15, yuzhou: 8, yanzhen: 12, feige: 15, hantan: 8 }[this.focus] ?? 10;
      const dir = new THREE.Vector3(-0.42, 0.07, 1).normalize(); // v23: low eye so the pavilion's reflection shows in the river
      const eye = this.look.clone().addScaledVector(dir, d);
      eye.y = Math.max(1.15, eye.y);
      const look = this.look.clone(); look.y -= 0.8;
      this.flight.go(eye, look, 2.0);
    }
    if (this.started) this.lastKey = key;
  }
}

function palette(mood: MoodId, focus: ImageId) {
  // v51: warm flag (was stuck on obsolete 0xff7a3a) — dusk river catch / 落霞 tint depend on it
  const dusk = { zenith: 0x1c1a36, haze: 0xa06842, sky: 0.62, sun: 0xffd8a8, glow: 0xff9448, hill: 0x22141c, water: 0x4a7090, key: 3.4, warm: true };
  if (mood === "sanyan") return { zenith: 0x2a3348, haze: 0x8a8a94, sky: 0.8, sun: 0xd8c0a0, glow: 0x88aacc, hill: 0x3d4450, water: 0x5a7080, key: 2.2, warm: false };
  if (mood === "yuzhou") return { zenith: 0x1c2438, haze: 0x8a5a52, sky: 0.65, sun: 0xe0905a, glow: 0xc06030, hill: 0x241818, water: 0x4a5a70, key: 2.4, warm: true };
  if (mood === "yanzhen") return { zenith: 0x14182a, haze: 0x4a4458, sky: 0.4, sun: 0xb86a55, glow: 0x884030, hill: 0x1a1216, water: 0x34405a, key: 1.6, warm: true };
  if (focus === "changtian") return { ...dusk, zenith: 0x2a3a58, water: 0x5a88a8 };
  return dusk;
}

function mat(color: number, roughness = 0.7, metalness = 0.05): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function makeWater(): THREE.Group {
  const g = new THREE.Group();
  const segs = lowPower() ? 64 : 96;
  if (!lowPower()) {
    // v19: planar-reflection water (three.js Water.js) with a procedurally generated normal map
    const nt = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets3d/water_normal_gen.jpg`);
    nt.wrapS = nt.wrapT = THREE.RepeatWrapping;
    const w = new Water(new THREE.PlaneGeometry(100, 100), {
      textureWidth: 1024, textureHeight: 1024, waterNormals: nt,
      sunDirection: new THREE.Vector3(-0.55, 0.15, -0.8).normalize(), sunColor: 0xffc090,
      waterColor: 0x1a3040, distortionScale: 1.05, alpha: 1, fog: false,
    });
    w.rotation.x = -Math.PI / 2;
    w.name = "waterMain";
    const wm = w.material as THREE.ShaderMaterial;
    wm.uniforms.size.value = 4.0;
    // guard against HDR inf/NaN from the reflected sun disc (would blacken the bloom chain)
    wm.fragmentShader = wm.fragmentShader
      .replace("vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );",
        "vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) ); reflectionSample = (any(isnan(reflectionSample)) || any(isinf(reflectionSample))) ? vec3(0.11, 0.2, 0.27) : min(reflectionSample, vec3(6.0 * reflK)) * 0.62 * reflK;")
      .replace("float rf0 = 0.3;", "float rf0 = 0.18;")
      .replace("vec3( 0.1 ) + reflectionSample * 0.9", "vec3( 0.02 ) + reflectionSample * 0.95")
      .replace("vec3 outgoingLight = albedo;", "vec3 outgoingLight = (any(isnan(albedo)) || any(isinf(albedo))) ? waterColor : min(albedo, vec3(8.0));");
    wm.fragmentShader = "uniform float reflK;\n" + wm.fragmentShader;
    wm.uniforms.reflK = { value: 1 };
    wm.fog = false;
    g.add(w);
    g.userData.reflective = w;
    // v20: shoreline strip removed (it read as a dark line)
    return g;
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100, segs, segs),
    new THREE.MeshStandardMaterial({
      color: 0x5a7088,
      roughness: 0.08,
      metalness: 0.85,
      envMapIntensity: 1.85,
      flatShading: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  m.name = "waterMain";
  g.add(m);
  // deeper tint layer underneath for river body
  const deep = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x1a2838, roughness: 1, metalness: 0, transparent: true, opacity: 0.35 }),
  );
  deep.rotation.x = -Math.PI / 2;
  deep.position.y = -0.35;
  g.add(deep);
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd0a0, transparent: true, opacity: 0.28, depthWrite: false, alphaMap: glitterAlpha() }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(-6.4, 0.08, -4.2);
  path.name = "glitterPath";
  g.add(path);
  const rim = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 14),
    new THREE.MeshBasicMaterial({ color: 0xf2d7a2, transparent: true, opacity: 0.12, depthWrite: false }),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(0, 0.05, -18);
  g.add(rim);
  return g;
}

function glitterAlpha(): THREE.Texture | null {
  // 落日水面反光：横向两侧淡出 + 细碎波光条纹，避免一整块亮板
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 1024;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 256, 1024);
  ctx.filter = "blur(3px)";
  ctx.scale(2, 2);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 300; i++) {
    const y = rnd() * 512;
    const spread = 18 + (y / 512) * 40;
    const x = 64 + (rnd() - 0.5) * 2 * spread;
    const v = Math.round(120 + rnd() * 135);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x - 6 - rnd() * 8, y, 12 + rnd() * 16, 1.5 + rnd() * 2);
  }
  ctx.filter = "none";
  const fade = ctx.createLinearGradient(0, 0, 128, 0);
  fade.addColorStop(0, "rgba(0,0,0,1)");
  fade.addColorStop(0.3, "rgba(0,0,0,0)");
  fade.addColorStop(0.7, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 128, 512);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export function makeHills(): THREE.Group {
  // 层叠山脊（远淡近浓），替代早期的压扁球体，避免“积木感”
  const g = new THREE.Group();
  const layers: { z: number; base: number; amp: number; color: number; seed: number; gap?: [number, number] }[] = [
    { z: -34, base: 2.0, amp: 2.2, color: 0x7a4a48, seed: 1.7 }, // v52f: softer ridge under band
    { z: -27, base: 1.5, amp: 2.2, color: 0x4a3038, seed: 4.1 },
    { z: -20, base: 0.9, amp: 2.0, color: 0x30283a, seed: 7.3, gap: [-13, 2] },
    { z: -14, base: 0.4, amp: 1.5, color: 0x1e1a26, seed: 9.9, gap: [-16, 11] },
  ];
  for (const L of layers) {
    const shape = new THREE.Shape();
    const x0 = -70;
    const x1 = 70;
    shape.moveTo(x0, -1);
    for (let x = x0; x <= x1; x += 0.6) {
      const n =
        Math.sin(x * 0.11 + L.seed) * 0.5 +
        Math.sin(x * 0.27 + L.seed * 2.3) * 0.28 +
        Math.sin(x * 0.63 + L.seed * 0.7) * 0.12 +
        Math.abs(Math.sin(x * 0.045 + L.seed)) * 0.6;
      let y = L.base + L.amp * Math.max(0, n);
      if (L.gap && x > L.gap[0] && x < L.gap[1]) {
        const k = Math.min(x - L.gap[0], L.gap[1] - x) / 3;
        y *= Math.max(0.05, 1 - Math.min(1, k));
      }
      shape.lineTo(x, y);
    }
    shape.lineTo(x1, -1);
    shape.closePath();
    const m = new THREE.Mesh(
      new THREE.ShapeGeometry(shape, 1),
      new THREE.MeshStandardMaterial({
        color: L.color, roughness: 0.95, metalness: 0, side: THREE.DoubleSide,
        // v52c: far ridge catches vermilion dusk (band, not a point sun)
        emissive: L.z <= -30 ? 0x4a1818 : 0x000000,
        emissiveIntensity: L.z <= -30 ? 0.35 : 0,
      }),
    );
    m.position.z = L.z;
    m.castShadow = L.z > -22;
    g.add(m);
  }
  return g;
}

export function makePavilion(): THREE.Group {
  const g = new THREE.Group();
  const stone = phMat("stone_tiles", [2, 2], { color: 0x9a948a });
  const stoneDark = phMat("stone_tiles", [3, 3], { color: 0x6a645c });
  const wood = phMat("dark_wooden_planks", [1, 1], { color: 0x5a3a2c }); // v50: darker body = sharper dusk silhouette
  const dan = phMat("lacquered_cherry_wood", [1, 2], { color: 0xb03828 });
  const gold = mat(0xd4b06a, 0.38, 0.42); // v50: brighter 金线 eaves
  const tile = new THREE.MeshStandardMaterial({ color: 0x24302c, roughness: 0.48, metalness: 0.22, side: THREE.DoubleSide });

  // 高台：两级台基 + 正面踏步
  const base = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.5, 7.6), stoneDark);
  base.position.y = 0.25;
  base.receiveShadow = true;
  g.add(base);
  const terrace = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.6, 6.4), stone);
  terrace.position.y = 0.8;
  terrace.castShadow = true;
  terrace.receiveShadow = true;
  g.add(terrace);
  for (let i = 0; i < 5; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.32), stone);
    step.position.set(0, 0.11 + i * 0.22, 3.2 + 0.9 - i * 0.28);
    g.add(step);
  }
  balustrade(g, 7.2, 6.4, 1.1, stone, 0.32);

  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffc070, emissive: 0xff7a30, emissiveIntensity: 1.1, roughness: 0.4 });
  for (const [lx, lz] of [[-3.9, 3.4], [3.9, 3.4], [-1.3, 4.2], [1.3, 4.2]] as [number, number][]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.2, 6), wood);
    pole.position.set(lx, 1.1, lz);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.26, 8), lampMat);
    lamp.position.set(lx, 1.8, lz);
    g.add(pole, lamp);
  }

  const paper = new THREE.MeshStandardMaterial({ color: 0xffe6b8, emissive: 0xd08038, emissiveIntensity: 0.55, roughness: 0.55 }); // v50: warmer window glow
  const stories = [
    { y0: 1.1, w: 4.8, d: 4.3, h: 1.45, roofW: 7.0, roofD: 6.3, rise: 1.0 },
    { y0: 3.0, w: 3.9, d: 3.5, h: 1.2, roofW: 5.8, roofD: 5.2, rise: 0.95 },
    { y0: 4.65, w: 3.0, d: 2.7, h: 1.05, roofW: 4.6, roofD: 4.2, rise: 1.35 },
  ];
  for (const s of stories) {
    const yc = s.y0 + s.h / 2;
    // 平座（楼层台面）
    const floor = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.7, 0.14, s.d + 0.7), wood);
    floor.position.y = s.y0 + 0.07;
    floor.castShadow = true;
    g.add(floor);
    if (s !== stories[0]) balustrade(g, s.w + 0.6, s.d + 0.6, s.y0 + 0.14, dan, 0.36);
    // 内收的墙身
    const body = new THREE.Mesh(new THREE.BoxGeometry(s.w * 0.78, s.h, s.d * 0.78), wood);
    body.position.y = yc;
    body.castShadow = true;
    g.add(body);
    // 四面格扇窗
    const bw = s.w * 0.78;
    const bd = s.d * 0.78;
    for (const face of [0, 1, 2, 3]) {
      const along = face % 2 === 0 ? bw : bd;
      const n = 4;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * (along / n);
        const win = new THREE.Mesh(new THREE.BoxGeometry((along / n) * 0.72, s.h * 0.56, 0.04), paper);
        const out = (face % 2 === 0 ? bd : bw) / 2 + 0.02;
        if (face === 0) win.position.set(off, yc + 0.05, out);
        if (face === 1) { win.position.set(out, yc + 0.05, off); win.rotation.y = Math.PI / 2; }
        if (face === 2) win.position.set(off, yc + 0.05, -out);
        if (face === 3) { win.position.set(-out, yc + 0.05, off); win.rotation.y = Math.PI / 2; }
        g.add(win);
      }
    }
    // 回廊檐柱：每面 5 柱
    const cw = s.w * 0.5;
    const cd = s.d * 0.5;
    for (let i = 0; i < 5; i++) {
      const k = -1 + (i * 2) / 4;
      for (const [x, z] of [[k * cw, cd], [k * cw, -cd], [cw, k * cd], [-cw, k * cd]] as [number, number][]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, s.h, 10), dan);
        col.position.set(x, yc, z);
        col.castShadow = true;
        g.add(col);
      }
    }
    // 额枋 + 斗拱层
    const beam = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.16, 0.12, s.d + 0.16), dan);
    beam.position.y = s.y0 + s.h - 0.06;
    g.add(beam);
    brackets(g, s.w + 0.3, s.d + 0.3, s.y0 + s.h + 0.06, gold);
    const roof = curvedRoof(s.roofW, s.roofD, s.rise, tile, gold, s === stories[2]);
    roof.position.y = s.y0 + s.h + 0.16;
    g.add(roof);
  }
  return g;
}

function balustrade(g: THREE.Group, w: number, d: number, y: number, m: THREE.Material, hgt: number): void {
  const hw = w / 2;
  const hd = d / 2;
  for (const [len, x, z, rot] of [
    [w, 0, hd, 0],
    [w, 0, -hd, 0],
    [d, hw, 0, Math.PI / 2],
    [d, -hw, 0, Math.PI / 2],
  ] as [number, number, number, number][]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.06), m);
    rail.position.set(x, y + hgt, z);
    rail.rotation.y = rot;
    g.add(rail);
    const lower = rail.clone();
    lower.position.y = y + hgt * 0.4;
    g.add(lower);
    const n = Math.max(3, Math.round(len / 0.45));
    for (let i = 0; i <= n; i++) {
      const t = -len / 2 + (len * i) / n;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, hgt + 0.06, 0.06), m);
      if (rot === 0) post.position.set(t, y + hgt / 2, z);
      else post.position.set(x, y + hgt / 2, t);
      g.add(post);
    }
  }
}

function brackets(g: THREE.Group, w: number, d: number, y: number, m: THREE.Material): void {
  const hw = w / 2;
  const hd = d / 2;
  const geo = new THREE.BoxGeometry(0.16, 0.12, 0.16);
  const cap = new THREE.BoxGeometry(0.26, 0.06, 0.12);
  const per = (len: number) => Math.max(4, Math.round(len / 0.42));
  const put = (x: number, z: number, rot: number) => {
    const b = new THREE.Mesh(geo, m);
    b.position.set(x, y, z);
    const c = new THREE.Mesh(cap, m);
    c.position.set(x, y + 0.09, z);
    c.rotation.y = rot;
    g.add(b, c);
  };
  for (let i = 0; i <= per(w); i++) {
    const x = -hw + (w * i) / per(w);
    put(x, hd, 0);
    put(x, -hd, 0);
  }
  for (let i = 1; i < per(d); i++) {
    const z = -hd + (d * i) / per(d);
    put(hw, z, Math.PI / 2);
    put(-hw, z, Math.PI / 2);
  }
}

// 曲面屋顶：举折（上陡下缓）+ 翼角起翘，取代平直四坡面
export function curvedRoof(w: number, d: number, rise: number, tile: THREE.Material, gold: THREE.Material, top: boolean): THREE.Group {
  const g = new THREE.Group();
  const hw = w / 2;
  const hd = d / 2;
  const N = 36;
  const lift = top ? 0.5 : 0.42;
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  const P = (u: number, v: number): [number, number, number] => {
    const x = u * hw;
    const z = v * hd;
    const dist = Math.min(hw - Math.abs(x), hd - Math.abs(z));
    const q = Math.min(1, dist / Math.min(hw, hd));
    const corner = Math.pow(Math.abs(u) * Math.abs(v), 5);
    const edge = Math.pow(Math.max(Math.abs(u), Math.abs(v)), 8);
    const y = rise * Math.pow(q, 1.7) + lift * corner + 0.06 * edge;
    const spread = 1 + 0.07 * corner;
    return [x * spread, y, z * spread];
  };
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const u = -1 + (2 * i) / N, v = -1 + (2 * j) / N;
      pos.push(...P(u, v));
      // v29: UVs so tile textures run in rows parallel to each eave (metres / 3)
      if (hd - Math.abs(v) * hd <= hw - Math.abs(u) * hw) uvs.push((u * hw) / 3, ((1 - Math.abs(v)) * hd) / 3);
      else uvs.push((v * hd) / 3, ((1 - Math.abs(u)) * hw) / 3);
    }
  }
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i;
      const b = a + 1;
      const c = a + N + 1;
      const e = c + 1;
      idx.push(a, c, b, b, c, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, tile);
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  // 檐口金线：沿四边取样，随起翘一起弯
  const pts: THREE.Vector3[] = [];
  const M = 64;
  for (let k = 0; k < M * 4; k++) {
    const t = (k % M) / M;
    const side = Math.floor(k / M);
    const [u, v] = side === 0 ? [-1 + 2 * t, 1] : side === 1 ? [1, 1 - 2 * t] : side === 2 ? [1 - 2 * t, -1] : [-1, -1 + 2 * t];
    const [x, y, z] = P(u, v);
    pts.push(new THREE.Vector3(x, y - 0.02, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 256, 0.045, 6, true), gold));
  // 正脊 / 宝顶
  if (top) {
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), gold);
    finial.position.y = rise + 0.18;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.3, 8), gold);
    stem.position.y = rise + 0.02;
    g.add(finial, stem);
  } else {
    const len = Math.max(0.4, (hw - hd) * 2 + 0.3);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.14), gold);
    ridge.position.y = rise + 0.04;
    g.add(ridge);
    for (const sx of [-1, 1]) {
      const chi = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 6), gold);
      chi.position.set((sx * len) / 2, rise + 0.2, 0);
      chi.rotation.z = -sx * 0.35;
      g.add(chi);
    }
  }
  return g;
}

export function makeBoats(): THREE.Group {
  // 乌篷小舟：侧面月牙形船身挤出 + 半圆篷 + 细桅，替代胶囊体
  const g = new THREE.Group();
  g.name = "boats";
  const hull = mat(0x2a1a12, 0.78, 0);
  const awning = mat(0x15100c, 0.9, 0);
  const prof = new THREE.Shape();
  prof.moveTo(-0.75, 0.16);
  prof.quadraticCurveTo(-0.45, -0.1, 0, -0.12);
  prof.quadraticCurveTo(0.45, -0.1, 0.75, 0.2);
  prof.lineTo(0.62, 0.1);
  prof.lineTo(-0.62, 0.08);
  prof.closePath();
  const hullGeo = new THREE.ExtrudeGeometry(prof, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2, curveSegments: 12 });
  hullGeo.translate(0, 0, -0.15);
  const awnGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.42, 12, 1, true, 0, Math.PI);
  awnGeo.rotateZ(Math.PI / 2);
  awnGeo.rotateY(Math.PI / 2);
  for (const [x, z, s, r] of [
    [-4.2, 3.6, 1, 0.3],
    [-2.6, 4.4, 0.72, -0.5],
    [-5.1, 4.8, 0.55, 0.9],
  ] as [number, number, number, number][]) {
    const boat = new THREE.Group();
    const h = new THREE.Mesh(hullGeo, hull);
    h.castShadow = true;
    const aw = new THREE.Mesh(awnGeo, awning);
    aw.rotation.y = Math.PI / 2;
    aw.position.set(0.05, 0.1, 0);
    aw.scale.set(1, 1, 1);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.8, 6), hull);
    mast.position.set(-0.35, 0.5, 0);
    boat.add(h, aw, mast);
    boat.scale.setScalar(s);
    boat.rotation.y = r;
    boat.position.set(x, 0.06, z);
    g.add(boat);
  }
  return g;
}

/** Low-poly goose / 孤鹜: body + neck + head + flared wings (not a cone). */
function makeBird(scale = 1, _dark = 0x1a1410): THREE.Group {
  return inkGoose(scale * 0.9); // v23: 水墨雁
}

function makeDuck(): THREE.Group {
  // 孤鹜 — single wild goose silhouette against the dusk
  return makeBird(1.3, 0x18120e);
}

function makeGeese(): THREE.Group {
  // 雁阵 — loose V of articulated geese, not cone placeholders
  const g = new THREE.Group();
  g.position.copy(MARK.yanzhen);
  g.name = "geese";
  const slots: [number, number, number, number][] = [
    [0, 0, 0, 1.8],
    [-1.2, -0.45, 0.25, 1.55],
    [1.2, -0.45, 0.25, 1.55],
    [-2.3, -0.95, 0.4, 1.4],
    [2.3, -0.95, 0.4, 1.4],
    [-3.3, -1.5, 0.55, 1.25],
    [3.3, -1.5, 0.55, 1.25],
    [-4.2, -2.1, 0.7, 1.15],
    [4.2, -2.1, 0.7, 1.15],
  ];
  for (let i = 0; i < slots.length; i++) {
    const [x, y, z, sc] = slots[i];
    const b = makeBird(sc, i === 0 ? 0x1c1410 : 0x15100c);
    b.position.set(x, y, z);
    b.rotation.y = Math.PI * 0.5 + (i % 2 ? -0.08 : 0.08);
    b.rotation.z = (i % 2 ? -0.05 : 0.05);
    g.add(b);
  }
  return g;
}

/** Terraced riverbank with irregular waterline — replaces flat embankment box. */
function makeRiverbank(): THREE.Group {
  const g = new THREE.Group();
  // v25: cool 青石/灰岸 instead of warm Western brown_mud_dry
  const mud = phMat("earth_grey", [6, 3], { color: 0x6a7068 });
  const stone = phMat("stone_tiles", [8, 2], { color: 0x6e746c });
  // main terrace under pavilion
  const top = new THREE.Mesh(new THREE.BoxGeometry(16, 0.55, 7.5), mud);
  top.position.set(4.0, 0.35, -14.0);
  top.rotation.y = -0.42;
  top.receiveShadow = true;
  top.castShadow = true;
  g.add(top);
  // stone retaining face toward the river
  const face = new THREE.Mesh(new THREE.BoxGeometry(16.2, 1.1, 0.45), stone);
  face.position.set(2.6, 0.05, -10.6);
  face.rotation.y = -0.42;
  face.castShadow = true;
  g.add(face);
  // sloping mud steps into water (irregular boxes)
  const steps: [number, number, number, number][] = [
    [1.2, -0.15, -9.2, 10],
    [-0.5, -0.28, -8.0, 12],
    [-2.0, -0.38, -6.8, 14],
  ];
  for (const [x, y, z, w] of steps) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, 1.6), mud);
    step.position.set(x + 3.5, y, z - 4);
    step.rotation.y = -0.38 + (x * 0.02);
    step.receiveShadow = true;
    g.add(step);
  }
  // rocky waterline scatter
  const rockM = new THREE.MeshStandardMaterial({ color: 0x5a544c, roughness: 0.92 });
  for (let i = 0; i < 14; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + (i % 4) * 0.06, 0), rockM);
    r.position.set(-4 + i * 1.15 + (i % 3) * 0.2, -0.35, -7.5 - (i % 5) * 0.4);
    r.rotation.set(i * 0.4, i * 0.7, i * 0.2);
    r.scale.set(1 + (i % 3) * 0.3, 0.6 + (i % 2) * 0.3, 1);
    r.castShadow = true;
    g.add(r);
  }
  return g;
}

/** v52 落霞: horizontal 国风 dusk band — gold→vermilion wash along horizon; NO circular sun core/orb. */
function luoxiaSky(): THREE.Texture {
  const W = 1024, H = 320, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d")!;
  const v = x.createLinearGradient(0, H, 0, 0);
  // flat ribbon: thick gold at bottom → vermilion → rose → mauve dissolve (no ball hotspot)
  v.addColorStop(0, "rgba(255,236,160,1)"); v.addColorStop(0.1, "rgba(255,195,95,1)"); v.addColorStop(0.22, "rgba(250,130,55,0.98)");
  v.addColorStop(0.38, "rgba(220,70,55,0.88)"); v.addColorStop(0.55, "rgba(175,60,95,0.48)"); v.addColorStop(0.75, "rgba(100,60,120,0.18)"); v.addColorStop(1, "rgba(55,50,95,0)");
  x.fillStyle = v; x.fillRect(0, 0, W, H);
  // v52b: wide soft gold ribbon only — no ellipse/orb core
  x.save(); x.filter = "blur(12px)";
  const eg = x.createLinearGradient(0, H * 0.55, 0, H);
  eg.addColorStop(0, "rgba(255,190,100,0)"); eg.addColorStop(0.5, "rgba(255,200,120,0.35)"); eg.addColorStop(1, "rgba(255,230,165,0.55)"); // v53r3
  x.fillStyle = eg; x.fillRect(W * 0.02, H * 0.55, W * 0.96, H * 0.45);
  x.restore();
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // v53r2: even fewer softer 横抹 — hero still read as streaky sausage
  for (let i = 0; i < 7; i++) {
    const cy = H * (0.35 + rnd() * 0.45), cx = W * (0.08 + rnd() * 0.84), len = W * (0.22 + rnd() * 0.38), th = 10 + rnd() * 18;
    const near = 1 - Math.abs(cx / W - 0.45) * 1.2;
    x.save(); x.filter = "blur(8px)";
    x.fillStyle = `rgba(${100 + near * 40},${50 + near * 20},${90},${0.16 + rnd() * 0.14})`; // v53r2
    x.beginPath(); x.ellipse(cx, cy, len / 2, th, (rnd() - 0.5) * 0.02, 0, Math.PI * 2); x.fill();
    x.filter = "blur(5px)";
    x.fillStyle = `rgba(255,${130 + near * 70},${70 + near * 40},${0.22 + near * 0.12})`; // v53r2
    x.beginPath(); x.ellipse(cx + len * 0.03, cy + th * 0.55, len * 0.4, th * 0.35, 0, 0, Math.PI * 2); x.fill();
    x.restore();
  }
  // a distant 孤鹜 brushed against the glow
  x.save(); x.strokeStyle = "rgba(40,24,30,0.85)"; x.lineCap = "round"; x.lineWidth = 3;
  const gx = W * 0.56, gy = H * 0.5; x.beginPath(); x.moveTo(gx - 16, gy - 6); x.quadraticCurveTo(gx - 6, gy - 9, gx, gy); x.quadraticCurveTo(gx + 7, gy - 10, gx + 18, gy - 8); x.stroke(); x.restore();
  // feather all four edges
  x.globalCompositeOperation = "destination-in";
  const h = x.createLinearGradient(0, 0, W, 0); h.addColorStop(0, "rgba(0,0,0,0)"); h.addColorStop(0.2, "rgba(0,0,0,1)"); h.addColorStop(0.8, "rgba(0,0,0,1)"); h.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = h; x.fillRect(0, 0, W, H);
  const t = x.createLinearGradient(0, 0, 0, H); t.addColorStop(0, "rgba(0,0,0,0)"); t.addColorStop(0.3, "rgba(0,0,0,1)"); t.addColorStop(1, "rgba(0,0,0,1)");
  x.fillStyle = t; x.fillRect(0, 0, W, H);
  // v53r1: reset composite before foot wash (was destination-in punching holes)
  x.globalCompositeOperation = "source-over";
  const foot = x.createLinearGradient(0, H, 0, H * 0.55);
  foot.addColorStop(0, "rgba(42,32,64,0.55)"); foot.addColorStop(0.55, "rgba(42,32,64,0.12)"); foot.addColorStop(1, "rgba(42,32,64,0)");
  x.fillStyle = foot; x.fillRect(0, 0, W, H);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
/** glow mirrored on the river: broken horizontal ripple dashes, brightest on the far side under the sunset */
function luoxiaRefl(): THREE.Texture {
  const W = 256, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d")!;
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // soft warm wash under the sunset (lifts dark abstract 江面 at low eye)
  const wash = x.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, "rgba(255,190,110,0.78)"); wash.addColorStop(0.35, "rgba(255,150,75,0.4)"); wash.addColorStop(0.7, "rgba(255,130,65,0.18)"); wash.addColorStop(1, "rgba(255,120,60,0)");
  x.fillStyle = wash; x.fillRect(W * 0.15, 0, W * 0.7, H);
  // v51: denser broken ripple dashes, brighter far + some near-bank catch
  for (let i = 0; i < 340; i++) {
    const y = rnd() * H, far = 1 - y / H; // top of texture = far
    const spread = W * (0.14 + (1 - far) * 0.34), cx = W / 2 + (rnd() - 0.5) * spread * 2;
    const a = (Math.pow(far, 0.95) * 0.55 + 0.12) * (0.4 + rnd() * 0.55) * (1 - Math.abs(cx - W / 2) / (spread * 1.25));
    if (a <= 0) continue;
    x.fillStyle = `rgba(255,${155 + rnd() * 75},${95 + rnd() * 45},${Math.min(0.95, a)})`;
    x.fillRect(cx - (7 + rnd() * 30) / 2, y, 7 + rnd() * 30, 1.6 + rnd() * 2.8);
  }
  x.globalCompositeOperation = "destination-in";
  const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.5, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // v52f: soft foot fade so band meets hills without hard shelf
  const foot = x.createLinearGradient(0, H, 0, H * 0.55);
  foot.addColorStop(0, "rgba(42,32,64,0.95)"); foot.addColorStop(0.55, "rgba(42,32,64,0.25)"); foot.addColorStop(1, "rgba(42,32,64,0)");
  x.fillStyle = foot; x.fillRect(0, 0, W, H);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
