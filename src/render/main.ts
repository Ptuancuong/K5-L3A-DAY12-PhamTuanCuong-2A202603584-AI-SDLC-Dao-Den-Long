// Display layer: reads core state, sends Input. Never changes game rules.
import * as THREE from "three";
import { TICK_HZ, TUNING, WORLD } from "../core/config";
import {
  createWorld,
  isStunned,
  step,
  timeLeft,
  within,
  type GameEvent,
  type Input,
  type World,
} from "../core/sim";

// ---------- scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const fogColor = new THREE.Color(0x140a24);
scene.background = fogColor.clone();
scene.fog = new THREE.FogExp2(fogColor, 0.035);

const camera = new THREE.PerspectiveCamera(
  60,
  innerWidth / innerHeight,
  0.1,
  400,
);
const hemi = new THREE.HemisphereLight(0x6a4c9c, 0x1a0f2a, 0.6);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9a8cff, 0.4);
moon.position.set(-30, 50, -20);
scene.add(moon);

// Island + sea of clouds
const island = new THREE.Mesh(
  new THREE.CylinderGeometry(
    WORLD.islandRadius,
    WORLD.islandRadius * 0.8,
    4,
    64,
  ),
  new THREE.MeshStandardMaterial({ color: 0x3b3350, roughness: 0.95 }),
);
island.position.y = -2;
scene.add(island);
const grass = new THREE.Mesh(
  new THREE.CircleGeometry(WORLD.islandRadius, 64),
  new THREE.MeshStandardMaterial({ color: 0x2e3b3a, roughness: 1 }),
);
grass.rotation.x = -Math.PI / 2;
grass.position.y = 0.01;
scene.add(grass);
const clouds = new THREE.Mesh(
  new THREE.PlaneGeometry(800, 800),
  new THREE.MeshStandardMaterial({ color: 0x2a1d44, roughness: 1 }),
);
clouds.rotation.x = -Math.PI / 2;
clouds.position.y = -6;
scene.add(clouds);

// Mây: body, head, nón lá, small lantern hanging from the hat
function makeMay() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.6, 4, 12),
    new THREE.MeshStandardMaterial({ color: 0x4f7bbf }),
  );
  body.position.y = 0.7;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xf2c9a0 }),
  );
  head.position.y = 1.45;
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.75, 0.45, 24),
    new THREE.MeshStandardMaterial({ color: 0xd8b56a }),
  );
  hat.position.y = 1.85;
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffa040,
      emissive: 0xff8a20,
      emissiveIntensity: 2,
    }),
  );
  lamp.position.set(0.6, 1.45, 0.1);
  const string = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.3),
    new THREE.MeshBasicMaterial({ color: 0x222222 }),
  );
  string.position.set(0.6, 1.65, 0.1);
  const light = new THREE.PointLight(0xffa850, 6, 9, 1.2);
  light.position.copy(lamp.position);
  g.add(body, head, hat, lamp, string, light);
  return { g, light };
}
const may = makeMay();
scene.add(may.g);

// Lanterns
interface LanternView {
  group: THREE.Group;
  lamp: THREE.Mesh;
  light: THREE.PointLight;
  ring: THREE.Mesh;
  fill: THREE.Mesh;
}
function makeLantern(): LanternView {
  const group = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 3.2),
    new THREE.MeshStandardMaterial({ color: 0x5a3a28 }),
  );
  post.position.y = 1.6;
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x553344, emissive: 0x000000 }),
  );
  lamp.position.y = 3.6;
  lamp.scale.y = 1.3;
  const fill = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.06, 6, 32, 0.0001),
    new THREE.MeshBasicMaterial({ color: 0xffc46b }),
  );
  fill.position.y = 3.6;
  const light = new THREE.PointLight(0xffaa55, 0, 30, 1);
  light.position.y = 3.6;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(TUNING.safe_radius - 0.15, TUNING.safe_radius, 64),
    new THREE.MeshBasicMaterial({
      color: 0xffb860,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(post, lamp, fill, light, ring);
  return { group, lamp, light, ring, fill };
}

const moteGeo = new THREE.SphereGeometry(0.15, 8, 6);
const moteMat = new THREE.MeshStandardMaterial({
  color: 0xfff0a0,
  emissive: 0xffd060,
  emissiveIntensity: 3,
});
const shadeGeo = new THREE.SphereGeometry(0.8, 16, 12);
const shadeMat = new THREE.MeshStandardMaterial({
  color: 0x1a0a2a,
  emissive: 0x3a0f5a,
  emissiveIntensity: 0.6,
  roughness: 0.4,
});
const shadeStunMat = new THREE.MeshStandardMaterial({
  color: 0x5a4a7a,
  emissive: 0x8a70c0,
  emissiveIntensity: 0.5,
  transparent: true,
  opacity: 0.55,
});
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xc070ff });

function makeShade() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(shadeGeo, shadeMat);
  body.scale.set(1, 1.2, 1);
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), eyeMat);
  const e2 = e1.clone();
  e1.position.set(-0.25, 0.25, 0.7);
  e2.position.set(0.25, 0.25, 0.7);
  g.add(body, e1, e2);
  return g;
}

// Pulse effect (display only)
const pulseRing = new THREE.Mesh(
  new THREE.RingGeometry(0.9, 1, 64),
  new THREE.MeshBasicMaterial({
    color: 0xffd080,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  }),
);
pulseRing.rotation.x = -Math.PI / 2;
pulseRing.position.y = 0.1;
scene.add(pulseRing);
let pulseFx = 1;

// ---------- game state ----------
let world: World;
let lanternViews: LanternView[] = [];
const moteMeshes = new Map<string, THREE.Mesh>();
const shadeMeshes = new Map<string, THREE.Group>();
let flash = 0;

let firstGame = true;
function newGame() {
  const params = new URLSearchParams(location.search);
  const seed = Number(params.get("seed") ?? Math.floor(Math.random() * 1e9));
  // ?scenario=<json> uses the same scenario format as the headless contract (for demos/screenshots).
  // It applies to the first game only; "play again" starts the normal Đêm 1.
  const raw = firstGame ? params.get("scenario") : null;
  firstGame = false;
  world = createWorld({ seed, scenario: raw ? JSON.parse(raw) : undefined });
  for (const v of lanternViews) scene.remove(v.group);
  lanternViews = world.lanterns.map((l) => {
    const v = makeLantern();
    v.group.position.set(l.pos[0], l.pos[1], l.pos[2]);
    scene.add(v.group);
    return v;
  });
  for (const m of moteMeshes.values()) scene.remove(m);
  for (const m of shadeMeshes.values()) scene.remove(m);
  moteMeshes.clear();
  shadeMeshes.clear();
  overlay.style.display = "none";
}

// ---------- input ----------
const keys = new Set<string>();
const tapped = new Set<string>();
const held = (code: string) => keys.has(code) || tapped.has(code);
let camYaw = 0; // degrees, same meaning as contract cam_yaw_deg
let camPitch = 0.45;
addEventListener("keydown", (e) => {
  keys.add(e.code);
  tapped.add(e.code); // a press shorter than one tick still counts once
  if ((e.code === "KeyR" || e.code === "Enter") && world.state !== "playing")
    newGame();
  else if (e.code === "KeyR" && e.shiftKey) newGame();
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
let dragging = false;
addEventListener("mousedown", () => (dragging = true));
addEventListener("mouseup", () => (dragging = false));
addEventListener("mousemove", (e) => {
  if (!dragging) return;
  camYaw -= e.movementX * 0.3;
  camPitch = Math.min(1.2, Math.max(0.1, camPitch + e.movementY * 0.004));
});

function readInput(): Input {
  // Camera looks along (sin yaw, cos yaw); screen-right is move x = -1 in contract terms.
  const fwd =
    (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
    (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
  const right = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
  return {
    move: [-right, fwd],
    cam_yaw_deg: camYaw,
    jump: held("Space"),
    interact: held("KeyE"),
    pulse: held("KeyF"),
  };
}

// ---------- HUD ----------
const hud = document.getElementById("hud")!;
const prompt = document.getElementById("prompt")!;
const overlay = document.getElementById("overlay")!;
const reasonText: Record<string, string> = {
  all_lit: "Mọi Đèn Lồng Lớn đã sáng. Đảo Bến được cứu!",
  dawn: "Trời đã sáng mà đảo vẫn chìm trong sương đen.",
  no_flames: "Mây đã mất hết ngọn lửa.",
};

function drawHud() {
  const p = world.player;
  const lit = world.lanterns.filter((l) => l.lit).length;
  const tl = Math.ceil(timeLeft(world));
  const cd = Math.max(0, (p.pulseReadyAt - world.tick) / TICK_HZ);
  const pulseTxt =
    p.carried < TUNING.pulse_cost
      ? "thiếu sáng"
      : cd > 0
        ? `${cd.toFixed(1)}s`
        : "sẵn sàng";
  hud.innerHTML = [
    `Lửa <b>${"🔥".repeat(p.flames)}${"·".repeat(Math.max(0, TUNING.flames - p.flames))}</b>`,
    `Đom đóm <b>${p.carried}/${TUNING.carry_capacity}</b>`,
    `Đèn <b>${lit}/${world.lanterns.length}</b>`,
    `Điểm <b>${world.score}</b>`,
    `Bình minh sau <b>${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, "0")}</b>`,
    `Tỏa sáng (F) <b>${pulseTxt}</b>`,
  ]
    .map((s) => `<div class="chip">${s}</div>`)
    .join("");
  const near = world.lanterns.find(
    (l) => !l.lit && within(l.pos, p.pos, TUNING.interact_radius),
  );
  prompt.textContent = near
    ? p.carried > 0
      ? `Nhấn E để nạp ánh sáng vào đèn ${near.id} (${near.deposited}/${TUNING.lantern_cost})`
      : `Đèn ${near.id} cần ${TUNING.lantern_cost - near.deposited} đom đóm nữa`
    : "";
  if (world.state !== "playing") {
    overlay.style.display = "flex";
    document.getElementById("ov-title")!.textContent =
      world.state === "won" ? "Chiến thắng!" : "Thua rồi…";
    document.getElementById("ov-reason")!.textContent =
      reasonText[world.result?.reason ?? ""] ?? "";
    document.getElementById("ov-score")!.textContent = `Điểm: ${world.score}`;
  }
}

function onEvents(evs: GameEvent[]) {
  for (const e of evs) {
    if (e.name === "pulse") pulseFx = 0;
    if (e.name === "player_hit") flash = 1;
  }
}

// ---------- sync visuals ----------
function sync(dt: number, time: number) {
  const p = world.player;
  may.g.position.set(p.pos[0], p.pos[1], p.pos[2]);
  may.g.rotation.y = (camYaw * Math.PI) / 180;
  const blink = world.tick < p.invulnUntil && Math.floor(time * 12) % 2 === 0;
  may.g.visible = !blink;

  const lit = world.lanterns.filter((l) => l.lit).length;
  world.lanterns.forEach((l, i) => {
    const v = lanternViews[i];
    v.group.position.set(l.pos[0], l.pos[1], l.pos[2]);
    const m = v.lamp.material as THREE.MeshStandardMaterial;
    m.emissive.setHex(l.lit ? 0xff8a2a : 0x000000);
    m.emissiveIntensity = l.lit ? 2 : 0;
    v.light.intensity = l.lit ? 60 : 0;
    (v.ring.material as THREE.MeshBasicMaterial).opacity = l.lit ? 0.35 : 0;
    v.fill.geometry.dispose();
    v.fill.geometry = new THREE.TorusGeometry(
      0.9,
      0.06,
      6,
      32,
      Math.max(0.0001, (Math.PI * 2 * l.deposited) / TUNING.lantern_cost),
    );
    v.fill.visible = !l.lit && l.deposited > 0;
    v.fill.lookAt(camera.position);
  });
  // The island brightens as lanterns are lit.
  const k = lit / world.lanterns.length;
  hemi.intensity = 0.6 + 1.6 * k;
  (scene.fog as THREE.FogExp2).density = 0.035 - 0.022 * k;
  (scene.background as THREE.Color)
    .copy(fogColor)
    .lerp(new THREE.Color(0x3a2a55), k);
  (scene.fog as THREE.FogExp2).color.copy(scene.background as THREE.Color);

  const seenM = new Set<string>();
  for (const mo of world.motes) {
    seenM.add(mo.id);
    let mesh = moteMeshes.get(mo.id);
    if (!mesh) {
      mesh = new THREE.Mesh(moteGeo, moteMat);
      moteMeshes.set(mo.id, mesh);
      scene.add(mesh);
    }
    const phase = mo.id.length + Number(mo.id.slice(1));
    mesh.position.set(
      mo.pos[0],
      0.8 + 0.25 * Math.sin(time * 2 + phase),
      mo.pos[2],
    );
  }
  for (const [id, mesh] of moteMeshes)
    if (!seenM.has(id)) (scene.remove(mesh), moteMeshes.delete(id));

  const seenS = new Set<string>();
  for (const s of world.shades) {
    seenS.add(s.id);
    let g = shadeMeshes.get(s.id);
    if (!g) {
      g = makeShade();
      shadeMeshes.set(s.id, g);
      scene.add(g);
    }
    g.position.set(
      s.pos[0],
      s.pos[1] + 0.15 * Math.sin(time * 3 + s.id.length),
      s.pos[2],
    );
    g.lookAt(p.pos[0], g.position.y, p.pos[2]);
    (g.children[0] as THREE.Mesh).material = isStunned(world, s)
      ? shadeStunMat
      : shadeMat;
  }
  for (const [id, g] of shadeMeshes)
    if (!seenS.has(id)) (scene.remove(g), shadeMeshes.delete(id));

  if (pulseFx < 1) {
    pulseFx = Math.min(1, pulseFx + dt * 2.5);
    const r = 1 + pulseFx * TUNING.pulse_radius;
    pulseRing.scale.set(r, r, r);
    pulseRing.position.set(p.pos[0], 0.1, p.pos[2]);
    (pulseRing.material as THREE.MeshBasicMaterial).opacity =
      0.8 * (1 - pulseFx);
  }
  if (flash > 0) {
    flash = Math.max(0, flash - dt * 3);
    renderer.domElement.style.filter = `saturate(${1 - flash * 0.6}) brightness(${1 + flash * 0.4})`;
  }
  may.light.intensity = 4 + Math.min(p.carried, 10) * 0.6;

  // Third-person camera behind Mây.
  const yaw = (camYaw * Math.PI) / 180;
  const dist = 9;
  camera.position.set(
    p.pos[0] - Math.sin(yaw) * dist * Math.cos(camPitch),
    p.pos[1] + 1.5 + dist * Math.sin(camPitch),
    p.pos[2] - Math.cos(yaw) * dist * Math.cos(camPitch),
  );
  camera.lookAt(p.pos[0], p.pos[1] + 1.2, p.pos[2]);
}

// ---------- loop (fixed 60 Hz logic, same step() as headless) ----------
newGame();
let acc = 0;
let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  // Arrow left/right turn the camera (mouse drag also works).
  const turn =
    (keys.has("ArrowLeft") ? 1 : 0) - (keys.has("ArrowRight") ? 1 : 0);
  camYaw += turn * 120 * dt;
  acc += dt;
  while (acc >= 1 / TICK_HZ) {
    acc -= 1 / TICK_HZ;
    if (world.state === "playing") onEvents(step(world, readInput()));
    tapped.clear();
  }
  sync(dt, now / 1000);
  drawHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
