// Display layer: reads core state, sends Input. Never changes game rules (same step() as headless).
import * as THREE from "three";
import { STD, TICK_HZ, TUNING } from "../core/config";
import { NIGHTS, TOWER, type NightDef } from "../core/maps";
import {
  capacity,
  createWorld,
  nextWindTick,
  step,
  timeLeft,
  within,
  type GameEvent,
  type Input,
  type World,
} from "../core/sim";
import { Audio, loadSettings, saveSettings } from "./audio";

// ---------- standard palette (Ticket-02) ----------
const C = {
  sky: 0x0e1430,
  fog: 0x1b2350,
  grass: 0x2f5d50,
  sand: 0xc9b48a,
  wood: 0x6b4a2f,
  sea: 0x12384a,
  litLamp: 0xffb347,
  litCore: 0xffe9b0,
  offLamp: 0x5b5f6e,
  moteCore: 0xfff6c2,
  moteHalo: 0xffe58a,
  shadeBody: 0x120a1a,
  shadeEdge: 0x7a3cff,
  shadeStun: 0x3a3450,
  robe: 0xe8e2d0,
  scarf: 0xc8102e,
  gold: 0xf2c14e,
  drifter: 0x8fa3b8,
  stone: 0x4a5068,
};

const params = new URLSearchParams(location.search);
const shadeEdgeColor = () => (settings.colorblind ? 0x00b3ff : C.shadeEdge);
const needLit = () => Math.ceil(TUNING.win_ratio * world.lanterns.length - 1e-9);
const settings = loadSettings();
if (params.get("cb") === "1") settings.colorblind = true; // screenshots/demo
const audio = new Audio();
audio.setVolume(settings.volume);

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.sky);
scene.fog = new THREE.Fog(C.fog, 25, 110);
const camera = new THREE.PerspectiveCamera(
  60,
  innerWidth / innerHeight,
  0.1,
  400,
);
const ambient = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambient);
const moon = new THREE.DirectionalLight(0x9fb0ff, 0.35);
moon.position.set(-30, 60, -20);
scene.add(moon);
const sea = new THREE.Mesh(
  new THREE.PlaneGeometry(1000, 1000),
  new THREE.MeshLambertMaterial({ color: C.sea }),
);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -8;
scene.add(sea);

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
const level = new THREE.Group();
scene.add(level);

function disc(r: number, y: number, x = 0, z = 0) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CircleGeometry(r, 64), mat(C.grass));
  top.rotation.x = -Math.PI / 2;
  top.position.set(x, y + 0.01, z);
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(r - 1.2, r, 64),
    mat(C.sand),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(x, y + 0.02, z);
  const side = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r * 0.7, 6, 64),
    mat(C.stone),
  );
  side.position.set(x, y - 3, z);
  g.add(top, rim, side);
  return g;
}

function buildLevel(n: NightDef) {
  level.clear();
  if (n.night === 1) level.add(disc(40, 0));
  if (n.night === 2) {
    level.add(disc(28, 0), disc(28, 0, 70, 0));
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.3, 4),
      mat(C.wood),
    );
    bridge.position.set(35, -0.14, 0);
    level.add(bridge);
    for (let x = 27; x <= 43; x += 2) {
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.05, 4),
        mat(0x8a6a47),
      );
      plank.position.set(x, 0.03, 0);
      level.add(plank);
    }
  }
  if (n.night === 3) {
    level.add(disc(45, 0));
    // Tier 1: half annulus r 12..24, z > 0, y = 3.
    const t1 = new THREE.Mesh(
      new THREE.RingGeometry(12, 24, 48, 1, Math.PI, Math.PI),
      mat(C.grass),
    );
    t1.rotation.x = -Math.PI / 2;
    t1.position.y = 3.01;
    const wallO = new THREE.Mesh(
      new THREE.CylinderGeometry(24, 24, 3, 48, 1, true, -Math.PI / 2, Math.PI),
      mat(C.stone, { side: THREE.DoubleSide }),
    );
    wallO.position.y = 1.5;
    const wallI = new THREE.Mesh(
      new THREE.CylinderGeometry(12, 12, 3, 32, 1, true, -Math.PI / 2, Math.PI),
      mat(C.stone, { side: THREE.DoubleSide }),
    );
    wallI.position.y = 1.5;
    const capL = new THREE.Mesh(
      new THREE.BoxGeometry(12, 3, 0.2),
      mat(C.stone),
    );
    capL.position.set(-18, 1.5, 0);
    const capR = capL.clone();
    capR.position.x = 18;
    // Tier 2 disc r 8, y = 6, and the bell tower.
    const t2 = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 8, 6, 48),
      mat(C.stone),
    );
    t2.position.y = 3;
    const t2top = new THREE.Mesh(new THREE.CircleGeometry(8, 48), mat(C.grass));
    t2top.rotation.x = -Math.PI / 2;
    t2top.position.y = 6.01;
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(TOWER.r, TOWER.r, TOWER.h, 24),
      mat(C.wood),
    );
    tower.position.y = 6 + TOWER.h / 2;
    const bell = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      mat(C.gold, { metalness: 0.6 }),
    );
    bell.position.y = 6 + TOWER.h + 0.2;
    level.add(t1, wallO, wallI, capL, capR, t2, t2top, tower, bell);
    for (const deg of [30, 150]) {
      const a = (deg * Math.PI) / 180;
      const ramp = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.25, Math.hypot(6, 3)),
        mat(C.sand),
      );
      ramp.rotation.order = "YXZ";
      ramp.rotation.y = Math.PI / 2 - a;
      ramp.rotation.x = Math.atan2(3, 6);
      ramp.position.set(27 * Math.cos(a), 1.4, 27 * Math.sin(a));
      level.add(ramp);
    }
  }
  for (const pad of n.pads) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.15, 24),
      mat(C.gold, { emissive: C.gold, emissiveIntensity: 0.6 }),
    );
    m.position.set(pad.pos[0], pad.pos[1] + 0.08, pad.pos[2]);
    level.add(m);
  }
}

// ---------- actors ----------
function makeMay() {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 1.1, 16),
    mat(C.robe),
  );
  robe.position.y = 0.55;
  const scarf = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.07, 8, 16),
    mat(C.scarf),
  );
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.12;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 16, 12),
    mat(0xf2c9a0),
  );
  head.position.y = 1.35;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.4, 24), mat(C.sand));
  hat.position.y = 1.72;
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 8),
    mat(C.litLamp, { emissive: C.litLamp, emissiveIntensity: 2 }),
  );
  lamp.position.set(0.55, 1.35, 0.1);
  const light = new THREE.PointLight(C.litLamp, 6, 10, 1.2);
  light.position.copy(lamp.position);
  g.add(robe, scarf, head, hat, lamp, light);
  return { g, light };
}
const may = makeMay();
scene.add(may.g);

interface LanternView {
  group: THREE.Group;
  lamp: THREE.Mesh;
  core: THREE.Mesh;
  light: THREE.PointLight;
  ring: THREE.Mesh;
  bar: THREE.Mesh;
  barBg: THREE.Mesh;
  tear: THREE.Mesh;
}
function makeLantern(): LanternView {
  const group = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 3.2),
    mat(C.wood),
  );
  post.position.y = 1.6;
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 16, 12),
    mat(C.offLamp),
  );
  lamp.position.y = 3.6;
  lamp.scale.y = 1.3;
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 8),
    new THREE.MeshBasicMaterial({ color: C.litCore }),
  );
  core.position.y = 3.6;
  const light = new THREE.PointLight(C.litLamp, 0, 30, 1);
  light.position.y = 3.6;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(TUNING.safe_radius - 0.15, TUNING.safe_radius, 64),
    new THREE.MeshBasicMaterial({
      color: C.litLamp,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  // Fuel bar (v1.2) and a torn-paper mark for unlit lanterns (colour-independent cue).
  const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.18), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  barBg.position.y = 4.75;
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.12), new THREE.MeshBasicMaterial({ color: C.litLamp, side: THREE.DoubleSide }));
  bar.position.y = 4.75;
  const tear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.7), new THREE.MeshBasicMaterial({ color: 0x15151c }));
  tear.position.set(0.3, 3.55, 0.35);
  tear.rotation.z = 0.5;
  group.add(post, lamp, core, light, ring, barBg, bar, tear);
  return { group, lamp, core, light, ring, bar, barBg, tear };
}

const moteGeo = new THREE.SphereGeometry(0.13, 8, 6);
const haloGeo = new THREE.SphereGeometry(0.3, 8, 6);
const moteMat = new THREE.MeshBasicMaterial({ color: C.moteCore });
const haloMat = new THREE.MeshBasicMaterial({
  color: C.moteHalo,
  transparent: true,
  opacity: 0.35,
});
function makeMote() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(moteGeo, moteMat), new THREE.Mesh(haloGeo, haloMat));
  return g;
}
const shadeGeo = new THREE.SphereGeometry(0.8, 16, 12);
const edgeGeo = new THREE.SphereGeometry(0.86, 16, 12);
function makeShade() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    shadeGeo,
    new THREE.MeshStandardMaterial({
      color: C.shadeBody,
      transparent: true,
      opacity: 1,
    }),
  );
  const edge = new THREE.Mesh(
    edgeGeo,
    new THREE.MeshBasicMaterial({
      color: shadeEdgeColor(),
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
    }),
  );
  body.scale.y = edge.scale.y = 1.2;
  const eyeMat = new THREE.MeshBasicMaterial({ color: shadeEdgeColor() });
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), eyeMat);
  const e2 = e1.clone();
  e1.position.set(-0.25, 0.25, 0.72);
  e2.position.set(0.25, 0.25, 0.72);
  g.add(body, edge, e1, e2);
  return g;
}
function makeDrifter() {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.35, 8, 1),
    new THREE.MeshBasicMaterial({
      color: C.drifter,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    }),
  );
  return m;
}
function makeCharm() {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.8, 0.04),
    new THREE.MeshBasicMaterial({ color: C.scarf }),
  );
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.9, 0.02),
    new THREE.MeshBasicMaterial({ color: C.gold }),
  );
  g.add(rim, paper);
  return g;
}

const pulseRing = new THREE.Mesh(
  new THREE.RingGeometry(0.9, 1, 64),
  new THREE.MeshBasicMaterial({
    color: C.litCore,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  }),
);
pulseRing.rotation.x = -Math.PI / 2;
scene.add(pulseRing);
let pulseFx = 1;
const leaves: THREE.Mesh[] = [];
for (let i = 0; i < 40; i++) {
  const l = new THREE.Mesh(
    new THREE.PlaneGeometry(0.25, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x9bbf6a, side: THREE.DoubleSide }),
  );
  l.visible = false;
  scene.add(l);
  leaves.push(l);
}

// ---------- game flow ----------
type Screen = "menu" | "intro" | "play" | "result" | "dawn";
let screen: Screen = "menu";
let night = 1;
let world: World;
let wonScores: number[] = [];
let lanternViews: LanternView[] = [];
const moteMeshes = new Map<string, THREE.Group>();
const shadeMeshes = new Map<string, THREE.Group>();
const drifterMeshes = new Map<string, THREE.Mesh>();
const charmMeshes = new Map<string, THREE.Group>();
let flash = 0;
let lastSecond = -1;
let pauseRequest = false;
let settingsReturn: "menu" | "pause" = "menu";

const INTRO: Record<number, string> = {
  1: '"Đảo Bến là nơi thuyền mây cập bến. Gom đom đóm, thắp năm ngọn đèn, và đừng để Bóng Mực chạm vào cháu." — Ông Đăng',
  2: '"Đảo Cau có hai nửa, nối bằng cây cầu tre cũ. Bục đá vàng sẽ bắn cháu sang đảo bên kia. Coi chừng Gió Lạc, nó thích cướp ánh sáng." — Ông Đăng',
  3: '"Đảo Chuông có ba tầng. Tháp chuông ở giữa đã im tiếng từ khi sương xuống. Gió ở đây mạnh lắm, nghe tiếng lá bay thì bám chắc vào." — Ông Đăng',
};

const $ = (id: string) => document.getElementById(id)!;
function show(s: string | null) {
  document
    .querySelectorAll(".screen")
    .forEach((e) => e.classList.remove("show"));
  if (s) $(`scr-${s}`).classList.add("show");
}

function startNight(n: number) {
  night = n;
  const seed = Number(params.get("seed") ?? Math.floor(Math.random() * 1e9));
  const raw = params.get("scenario");
  world = createWorld({
    seed,
    night: n,
    scenario:
      raw && n === Number(params.get("night") ?? 1)
        ? JSON.parse(raw)
        : undefined,
  });
  params.delete("scenario");
  buildLevel(world.n);
  for (const v of lanternViews) scene.remove(v.group);
  lanternViews = world.lanterns.map((l) => {
    const v = makeLantern();
    v.group.position.set(l.pos[0], l.pos[1], l.pos[2]);
    scene.add(v.group);
    return v;
  });
  for (const m of [
    ...moteMeshes.values(),
    ...shadeMeshes.values(),
    ...drifterMeshes.values(),
    ...charmMeshes.values(),
  ])
    scene.remove(m);
  moteMeshes.clear();
  shadeMeshes.clear();
  drifterMeshes.clear();
  charmMeshes.clear();
  camYaw = 0;
  lastSecond = -1;
}
function showIntro(n: number) {
  startNight(n);
  screen = "intro";
  $("intro-night").textContent = `Đêm ${n}`;
  $("intro-name").textContent = world.n.name;
  $("intro-quote").textContent = INTRO[n];
  show("intro");
}
function play() {
  screen = "play";
  show(null);
  audio.startMusic();
}
function endNight() {
  screen = "result";
  const won = world.state === "won";
  audio.play(won ? "win" : "lose");
  if (won) wonScores[night - 1] = world.score;
  if (won && night === 3) {
    screen = "dawn";
    $("dawn-score").textContent =
      `Tổng điểm: ${wonScores.reduce((a, b) => a + (b ?? 0), 0)}`;
    show("dawn");
    return;
  }
  $("res-title").textContent = won ? `Đêm ${night} đã sáng!` : "Thua rồi…";
  const reasons: Record<string, string> = {
    dawn_survived: `Bình minh! ${world.n.name} vẫn còn ${world.lanterns.filter((l) => l.lit).length}/${world.lanterns.length} đèn sáng.`,
    dawn: `Trời đã sáng nhưng chưa đủ ${needLit()} đèn sáng.`,
    no_flames: "Mây đã mất hết Ngọn Lửa.",
  };
  $("res-reason").textContent = reasons[world.result?.reason ?? ""] ?? "";
  $("res-score").textContent =
    `Điểm Đêm này: ${world.score} · Tổng (các Đêm đã thắng): ${wonScores.reduce((a, b) => a + (b ?? 0), 0)}`;
  ($("res-next") as HTMLButtonElement).style.display = won ? "" : "none";
  show("result");
}
function act(a: string) {
  audio.play("tick");
  if (a === "start") {
    wonScores = [];
    showIntro(Number(params.get("night") ?? 1));
  } else if (a === "play") play();
  else if (a === "next") showIntro(night + 1);
  else if (a === "retry") {
    startNight(night);
    play();
  } else if (a === "menu") {
    screen = "menu";
    audio.stopMusic();
    show("menu");
  } else if (a === "resume") pauseRequest = true;
  else if (a === "settings") {
    settingsReturn = screen === "play" ? "pause" : "menu";
    show("settings");
  } else if (a === "back") show(settingsReturn);
}
document
  .querySelectorAll<HTMLButtonElement>("[data-act]")
  .forEach((b) => b.addEventListener("click", () => act(b.dataset.act!)));
const vol = $("set-vol") as HTMLInputElement;
const sens = $("set-sens") as HTMLInputElement;
vol.value = String(settings.volume);
sens.value = String(settings.sensitivity);
vol.addEventListener("input", () => {
  settings.volume = Number(vol.value);
  audio.setVolume(settings.volume);
  saveSettings(settings);
});
sens.addEventListener("input", () => {
  settings.sensitivity = Number(sens.value);
  saveSettings(settings);
});
const cb = $("set-cb") as HTMLInputElement;
cb.checked = settings.colorblind;
cb.addEventListener("change", () => {
  settings.colorblind = cb.checked;
  saveSettings(settings);
  applyColorblind();
});
function applyColorblind() {
  document.documentElement.style.setProperty("--danger", settings.colorblind ? "#ffffff" : "#ff5a5f");
  for (const g of shadeMeshes.values()) for (const k of [1, 2, 3]) ((g.children[k] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(shadeEdgeColor());
}
applyColorblind();

// ---------- input ----------
const keys = new Set<string>();
const tapped = new Set<string>();
const held = (code: string) => keys.has(code) || tapped.has(code);
let camYaw = 0;
let camPitch = 0.42;
addEventListener("keydown", (e) => {
  if (e.repeat) return;
  keys.add(e.code);
  tapped.add(e.code);
  if (e.code === "Escape" || e.code === "KeyP") {
    if (screen === "play") pauseRequest = true;
  } else if (e.code === "Enter") {
    if (screen === "intro") play();
    else if (screen === "result") act(world.state === "won" ? "next" : "retry");
    else if (screen === "menu" && $("scr-menu").classList.contains("show"))
      act("start");
  } else if (e.code === "KeyR" && screen === "result") act("retry");
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
let dragging = false;
addEventListener("mousedown", () => (dragging = true));
addEventListener("mouseup", () => (dragging = false));
addEventListener("mousemove", (e) => {
  if (!dragging || screen !== "play") return;
  camYaw -= e.movementX * settings.sensitivity;
  camPitch = Math.min(
    1.2,
    Math.max(0.1, camPitch + e.movementY * settings.sensitivity * 0.012),
  );
});

function readInput(): Input {
  const fwd = (held("KeyW") ? 1 : 0) - (held("KeyS") ? 1 : 0);
  const right = (held("KeyD") ? 1 : 0) - (held("KeyA") ? 1 : 0);
  const pause = pauseRequest;
  pauseRequest = false;
  return {
    move: [-right, fwd], // camera looks along (sin yaw, cos yaw); screen-right is contract x = -1
    cam_yaw_deg: camYaw,
    jump: held("Space"),
    interact: held("KeyE"),
    pulse: held("KeyF"),
    dash: held("ShiftLeft") || held("ShiftRight"),
    pause,
  };
}

// ---------- HUD ----------
const moteCells: HTMLElement[] = [];
function ensureCells(n: number) {
  while (moteCells.length < n) {
    const c = document.createElement("i");
    $("motebar").appendChild(c);
    moteCells.push(c);
  }
  moteCells.forEach((c, i) => (c.style.display = i < n ? "" : "none"));
}
const proj = new THREE.Vector3();
function drawHud() {
  const p = world.player;
  $("flames").textContent =
    "🔥".repeat(p.flames) + "·".repeat(Math.max(0, TUNING.flames - p.flames));
  const tl = Math.ceil(timeLeft(world));
  const timer = $("timer");
  timer.textContent = `${String(Math.floor(tl / 60)).padStart(2, "0")}:${String(tl % 60).padStart(2, "0")}`;
  timer.classList.toggle("danger", tl <= 30);
  if (tl <= 30 && settings.colorblind) timer.textContent = `⚠ ${timer.textContent}`;
  const lit = world.lanterns.filter((l) => l.lit).length;
  $("topright").innerHTML =
    `Đèn <b>${lit}/${world.lanterns.length}</b> (giữ ≥ ${needLit()} tới bình minh)<br>Điểm <b>${world.score}</b><br>Mang <b>${p.carried}/${capacity(world)}</b>`;
  ensureCells(capacity(world));
  moteCells.forEach((c, i) => c.classList.toggle("on", i < p.carried));
  const dashFrac =
    p.charmTicks > 0 ? 0 : p.dashCdTicks / (TUNING.dash_cooldown_s * TICK_HZ);
  ($("cd-dash") as HTMLElement).style.setProperty("--p", `${dashFrac * 100}%`);
  ($("cd-pulse") as HTMLElement).style.setProperty(
    "--p",
    `${(p.pulseCdTicks / (TUNING.pulse_cooldown_s * TICK_HZ)) * 100}%`,
  );
  ($("cd-pulse") as HTMLElement).style.opacity =
    p.carried >= TUNING.pulse_cost ? "1" : "0.45";
  const near = world.lanterns.find(
    (l) => !l.lit && within(l.pos, p.pos, TUNING.interact_radius),
  );
  $("prompt").textContent = near
    ? `E — Nạp ánh sáng (${near.deposited}/${TUNING.lantern_cost})`
    : p.charmTicks > 0
      ? `Bùa Gió: ${Math.ceil(p.charmTicks / 60)} s`
      : "";
  // Wind: active or warning (2 s before).
  const nw = nextWindTick(world);
  const warn = nw !== null && nw - world.simTick <= 120;
  $("wind").textContent =
    world.wind.ticks > 0 ? "🍃 Gió mạnh!" : warn ? "🍃 Gió sắp nổi…" : "";
  // Arrow to the nearest unlit lantern when it is off-screen.
  const arrow = $("arrow");
  let target: (typeof world.lanterns)[number] | undefined;
  let bd = Infinity;
  for (const l of world.lanterns) {
    if (l.lit) continue;
    const d = Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]);
    if (d < bd) {
      bd = d;
      target = l;
    }
  }
  arrow.style.display = "none";
  if (target) {
    proj.set(target.pos[0], target.pos[1] + 3.6, target.pos[2]).project(camera);
    const behind = proj.z > 1;
    const off = behind || Math.abs(proj.x) > 0.95 || Math.abs(proj.y) > 0.95;
    if (off) {
      let x = proj.x;
      let y = proj.y;
      if (behind) {
        x = -x;
        y = -Math.abs(y) - 1;
      }
      const ang = Math.atan2(y, x);
      const r = Math.min(innerWidth, innerHeight) * 0.4;
      arrow.style.display = "block";
      arrow.style.left = `${innerWidth / 2 + Math.cos(ang) * r - 14}px`;
      arrow.style.top = `${innerHeight / 2 - Math.sin(ang) * r - 15}px`;
      arrow.style.transform = `rotate(${90 - (ang * 180) / Math.PI}deg)`;
    }
  }
}

function onEvents(evs: GameEvent[]) {
  for (const e of evs) {
    switch (e.name) {
      case "mote_picked":
        audio.play("pick");
        break;
      case "lantern_lit":
        audio.play("lit");
        break;
      case "refuel":
        audio.play("pick");
        break;
      case "lantern_out":
        audio.play("lose");
        break;
      case "pulse":
        pulseFx = 0;
        audio.play("pulse");
        break;
      case "player_hit":
        flash = 1;
        audio.play("hit");
        break;
      case "dash":
        audio.play("dash");
        break;
      case "shade_spawned":
        audio.play("shade");
        break;
      case "charm_picked":
        audio.play("charm");
        break;
      case "drifter_steal":
        audio.play("steal");
        break;
      case "paused":
        show("pause");
        break;
      case "resumed":
        show(null);
        break;
    }
  }
}

// ---------- sync visuals ----------
function syncMap<T extends { id: string }, M extends THREE.Object3D>(
  map: Map<string, M>,
  items: T[],
  make: () => M,
  update: (m: M, it: T) => void,
) {
  const seen = new Set<string>();
  for (const it of items) {
    seen.add(it.id);
    let m = map.get(it.id);
    if (!m) {
      m = make();
      map.set(it.id, m);
      scene.add(m);
    }
    update(m, it);
  }
  for (const [id, m] of map)
    if (!seen.has(id)) (scene.remove(m), map.delete(id));
}

function sync(dt: number, time: number) {
  const p = world.player;
  may.g.position.set(p.pos[0], p.pos[1], p.pos[2]);
  may.g.rotation.y = Math.atan2(p.facing[0], p.facing[1]);
  may.g.visible =
    p.fallWait === 0 && !(p.invulnTicks > 0 && Math.floor(time * 12) % 2 === 0);
  may.light.intensity = 4 + p.carried * 0.6;

  const lit = world.lanterns.filter((l) => l.lit).length;
  ambient.intensity = 0.15 + 0.55 * (lit / world.lanterns.length); // standard formula
  world.lanterns.forEach((l, i) => {
    const v = lanternViews[i];
    const m = v.lamp.material as THREE.MeshStandardMaterial;
    const fuel = l.fuel60 / TICK_HZ;
    const low = l.lit && fuel < TUNING.low_fuel_threshold;
    const blinkOff = low && Math.floor(time * 2) % 2 === 1; // 1 Hz slow blink
    m.color.setHex(l.lit ? C.litLamp : C.offLamp);
    m.emissive.setHex(l.lit ? C.litLamp : 0x000000);
    m.emissiveIntensity = l.lit ? (blinkOff ? 0.2 : 1.5) : 0;
    v.lamp.scale.y = l.lit ? 1.3 : 1.3 * 0.8; // unlit lantern is squashed 20%
    v.tear.visible = !l.lit;
    v.bar.visible = v.barBg.visible = l.lit && !blinkOff;
    v.bar.scale.x = Math.max(0.001, fuel / TUNING.fuel_max);
    v.bar.position.x = -0.75 * (1 - v.bar.scale.x);
    (v.bar.material as THREE.MeshBasicMaterial).color.setHex(low ? (settings.colorblind ? 0xffffff : 0xff5a5f) : C.litLamp);
    v.bar.quaternion.copy(camera.quaternion);
    v.barBg.quaternion.copy(camera.quaternion);
    v.core.visible = l.lit || l.deposited > 0;
    v.core.scale.setScalar(
      l.lit ? 1 : 0.3 + (0.7 * l.deposited) / TUNING.lantern_cost,
    );
    v.light.intensity = l.lit ? 60 : (l.deposited / TUNING.lantern_cost) * 8;
    (v.ring.material as THREE.MeshBasicMaterial).opacity = l.lit && !low ? 0.4 : 0; // zone only when fuel >= 30
  });

  syncMap(moteMeshes, world.motes, makeMote, (m, mo) => {
    const ph = Number(mo.id.slice(1));
    m.position.set(
      mo.pos[0],
      mo.pos[1] + 0.8 + 0.2 * Math.sin(time * 2 + ph),
      mo.pos[2],
    );
    m.visible = !(
      mo.kind === "dropped" &&
      mo.ttl !== null &&
      mo.ttl < 120 &&
      Math.floor(time * 8) % 2 === 0
    );
  });
  syncMap(shadeMeshes, world.shades, makeShade, (g, s) => {
    g.position.set(
      s.pos[0],
      s.pos[1] + 0.12 * Math.sin(time * 3 + s.id.length),
      s.pos[2],
    );
    g.lookAt(p.pos[0], g.position.y, p.pos[2]);
    const body = (g.children[0] as THREE.Mesh)
      .material as THREE.MeshStandardMaterial;
    body.color.setHex(s.state === "stunned" ? C.shadeStun : C.shadeBody);
    body.opacity =
      s.state === "spawning" ? 1 - s.stateTicks / STD.shadeSpawnTicks : 1;
    (
      (g.children[1] as THREE.Mesh).material as THREE.MeshBasicMaterial
    ).opacity = s.state === "spawning" ? 0.1 : s.state === "chase" ? 0.6 : 0.3;
  });
  syncMap(
    drifterMeshes,
    world.drifters.filter((d) => d.state !== "removed"),
    makeDrifter,
    (m, d) => {
      m.position.set(d.pos[0], d.pos[1] + 0.3 * Math.sin(time * 4), d.pos[2]);
      m.rotation.y = time * 2;
      m.rotation.z = 0.4 * Math.sin(time * 5);
    },
  );
  syncMap(charmMeshes, world.charms, makeCharm, (g, c) => {
    g.visible = c.available;
    g.position.set(
      c.pos[0],
      c.pos[1] + 1 + 0.15 * Math.sin(time * 2),
      c.pos[2],
    );
    g.rotation.y = time * 1.5;
  });

  if (pulseFx < 1) {
    pulseFx = Math.min(1, pulseFx + dt * 2.5);
    const r = 1 + pulseFx * TUNING.pulse_radius;
    pulseRing.scale.set(r, r, r);
    pulseRing.position.set(p.pos[0], p.pos[1] + 0.1, p.pos[2]);
    (pulseRing.material as THREE.MeshBasicMaterial).opacity =
      0.8 * (1 - pulseFx);
  }
  if (flash > 0) {
    flash = Math.max(0, flash - dt * 3);
    renderer.domElement.style.filter = `saturate(${1 - flash * 0.6}) brightness(${1 + flash * 0.4})`;
  }
  // Wind leaves: warning 2 s before and during a gust.
  const nw = nextWindTick(world);
  const windy =
    world.wind.ticks > 0 || (nw !== null && nw - world.simTick <= 120);
  const wa = ((world.wind.ticks > 0 ? world.wind.dir : 0) * Math.PI) / 180;
  leaves.forEach((l, i) => {
    l.visible = windy && screen === "play";
    if (!l.visible) return;
    const k = (time * 0.6 + i / leaves.length) % 1;
    const sx = Math.sin(i * 12.9898) * 12;
    const sz = Math.cos(i * 78.233) * 12;
    l.position.set(
      p.pos[0] + sx + Math.cos(wa) * (k * 20 - 10),
      p.pos[1] + 1 + ((i * 7) % 5) * 0.5,
      p.pos[2] + sz + Math.sin(wa) * (k * 20 - 10),
    );
    l.rotation.set(time * 3 + i, time * 2, 0);
  });

  const yaw = (camYaw * Math.PI) / 180;
  const dist = 9;
  camera.position.set(
    p.pos[0] - Math.sin(yaw) * dist * Math.cos(camPitch),
    Math.max(p.pos[1], -6) + 1.5 + dist * Math.sin(camPitch),
    p.pos[2] - Math.cos(yaw) * dist * Math.cos(camPitch),
  );
  camera.lookAt(p.pos[0], Math.max(p.pos[1], -6) + 1.2, p.pos[2]);
}

// ---------- loop: fixed 60 Hz logic ----------
startNight(Number(params.get("night") ?? 1));
if (params.get("autoplay") === "1") play();
else show("menu");
let acc = 0;
let last = performance.now();
let fpsFrames = 0;
let fpsTime = 0;
const fpsSamples: number[] = [];
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (screen === "play") {
    camYaw +=
      ((keys.has("ArrowLeft") ? 1 : 0) - (keys.has("ArrowRight") ? 1 : 0)) *
      120 *
      dt;
    acc += dt;
    while (acc >= 1 / TICK_HZ) {
      acc -= 1 / TICK_HZ;
      onEvents(step(world, readInput()));
      tapped.clear();
      if (world.state === "won" || world.state === "lost") {
        endNight();
        break;
      }
    }
    const sec = Math.ceil(timeLeft(world));
    if (world.state === "playing" && sec <= 10 && sec !== lastSecond)
      audio.play("tick");
    if (
      world.state === "playing" &&
      nextWindTick(world) === world.simTick + 120
    )
      audio.play("wind");
    lastSecond = sec;
  } else acc = 0;
  sync(dt, now / 1000);
  drawHud();
  renderer.render(scene, camera);
  fpsFrames++;
  fpsTime += dt;
  if (fpsTime >= 1) {
    fpsSamples.push(fpsFrames / fpsTime);
    if (fpsSamples.length > 60) fpsSamples.shift();
    const avg = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
    (window as unknown as { __fps: number }).__fps = avg;
    if (params.get("fps") === "1")
      $("fps").textContent =
        `FPS ${(fpsFrames / fpsTime).toFixed(0)} · TB ${avg.toFixed(1)} (${fpsSamples.length}s)`;
    fpsFrames = 0;
    fpsTime = 0;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
