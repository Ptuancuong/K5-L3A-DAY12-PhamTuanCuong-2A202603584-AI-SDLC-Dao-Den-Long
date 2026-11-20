// Ticket-04 §4: rebindable controls (KeyboardEvent.code per action).
export const ACTIONS = [
  "up",
  "down",
  "left",
  "right",
  "jump",
  "dash",
  "interact",
  "pulse",
  "pause",
  "camLeft",
  "camRight",
] as const;
export type Action = (typeof ACTIONS)[number];
export type KeyMap = Record<Action, string>;

export const ACTION_LABEL: KeyMap = {
  up: "Đi tới",
  down: "Đi lùi",
  left: "Sang trái",
  right: "Sang phải",
  jump: "Nhảy",
  dash: "Lướt",
  interact: "Tương tác (nạp/châm đèn)",
  pulse: "Tỏa sáng",
  pause: "Tạm dừng",
  camLeft: "Xoay camera trái",
  camRight: "Xoay camera phải",
};

export const DEFAULT_KEYS: KeyMap = {
  up: "KeyW",
  down: "KeyS",
  left: "KeyA",
  right: "KeyD",
  jump: "Space",
  dash: "ShiftLeft",
  interact: "KeyE",
  pulse: "KeyF",
  pause: "Escape",
  camLeft: "ArrowLeft",
  camRight: "ArrowRight",
};

const NAMES: Record<string, string> = {
  Space: "Space",
  Escape: "Esc",
  ShiftLeft: "Shift trái",
  ShiftRight: "Shift phải",
  ControlLeft: "Ctrl trái",
  ControlRight: "Ctrl phải",
  AltLeft: "Alt trái",
  AltRight: "Alt phải",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Enter: "Enter",
  Tab: "Tab",
  Backspace: "Backspace",
};
export function keyLabel(code: string): string {
  if (NAMES[code]) return NAMES[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad/.test(code)) return `Num ${code.slice(6)}`;
  return code;
}

/** The other action already using this key, or null. */
export function conflictOf(
  keys: KeyMap,
  action: Action,
  code: string,
): Action | null {
  return ACTIONS.find((a) => a !== action && keys[a] === code) ?? null;
}

/** Keys reserved by menus (Enter confirms) cannot be bound. */
export const RESERVED = new Set(["Enter", "NumpadEnter", "Tab"]);

/** Saved key map -> valid key map (unknown or duplicated entries fall back to the defaults). */
export function sanitizeKeys(raw: unknown): KeyMap {
  const k: KeyMap = { ...DEFAULT_KEYS };
  if (typeof raw !== "object" || raw === null) return k;
  for (const a of ACTIONS) {
    const v = (raw as Record<string, unknown>)[a];
    if (typeof v === "string" && v && !RESERVED.has(v)) k[a] = v;
  }
  const codes = ACTIONS.map((a) => k[a]);
  return new Set(codes).size === codes.length ? k : { ...DEFAULT_KEYS };
}
