// All sounds are synthesized with WebAudio (no external audio assets).
export type Sfx =
  | "pick"
  | "lit"
  | "pulse"
  | "hit"
  | "jump"
  | "dash"
  | "win"
  | "lose"
  | "shade"
  | "tick"
  | "wind"
  | "charm"
  | "steal";

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: { stop: () => void } | null = null;
  volume = 0.6;

  private ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }
  setVolume(v: number) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }
  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    delay = 0,
    slideTo?: number,
  ) {
    const ctx = this.ensure();
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  private noise(dur: number, gain: number, filterHz: number) {
    const ctx = this.ensure();
    const buf = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * dur),
      ctx.sampleRate,
    );
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = filterHz;
    const g = ctx.createGain();
    g.gain.value = gain;
    s.connect(f).connect(g).connect(this.master!);
    s.start();
  }
  play(s: Sfx) {
    switch (s) {
      case "pick":
        return this.tone(1320, 0.12, "sine", 0.15);
      case "charm":
        return [880, 1175, 1568].forEach((f, i) =>
          this.tone(f, 0.2, "triangle", 0.12, i * 0.06),
        );
      case "lit":
        return [523, 659, 784, 1047].forEach((f, i) =>
          this.tone(f, 0.6, "triangle", 0.15, i * 0.08),
        );
      case "pulse":
        return this.tone(220, 0.5, "sine", 0.3, 0, 880);
      case "hit":
        this.noise(0.25, 0.4, 600);
        return this.tone(110, 0.3, "square", 0.15, 0, 60);
      case "jump":
        return this.tone(440, 0.15, "sine", 0.12, 0, 660);
      case "dash":
        return this.noise(0.18, 0.25, 2500);
      case "win":
        return [523, 659, 784, 1047, 1319].forEach((f, i) =>
          this.tone(f, 0.5, "triangle", 0.15, i * 0.12),
        );
      case "lose":
        return [392, 330, 262, 196].forEach((f, i) =>
          this.tone(f, 0.5, "sine", 0.15, i * 0.18),
        );
      case "shade":
        return this.tone(90, 0.8, "sawtooth", 0.06, 0, 70);
      case "tick":
        return this.tone(990, 0.06, "square", 0.08);
      case "wind":
        return this.noise(1.5, 0.25, 900);
      case "steal":
        return this.tone(700, 0.25, "sawtooth", 0.08, 0, 300);
    }
  }
  /** Slow night pad: a few soft notes repeating. */
  startMusic() {
    if (this.music) return;
    const ctx = this.ensure();
    const notes = [196, 233, 262, 233, 175, 196];
    let i = 0;
    const id = window.setInterval(() => {
      if (ctx.state !== "running") return;
      const f = notes[i++ % notes.length];
      this.tone(f, 2.6, "sine", 0.05);
      this.tone(f * 1.5, 2.6, "sine", 0.025, 0.1);
    }, 2400);
    this.music = { stop: () => window.clearInterval(id) };
  }
  stopMusic() {
    this.music?.stop();
    this.music = null;
  }
}

export interface Settings {
  volume: number;
  sensitivity: number;
  colorblind: boolean;
}
const KEY = "dao-den-long-settings";
export function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return {
      volume: typeof s.volume === "number" ? s.volume : 0.6,
      sensitivity: typeof s.sensitivity === "number" ? s.sensitivity : 0.3,
      colorblind: s.colorblind === true,
    };
  } catch {
    return { volume: 0.6, sensitivity: 0.3, colorblind: false };
  }
}
export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: settings last for this session only */
  }
}
