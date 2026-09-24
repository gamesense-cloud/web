// Radar model, map table and canvas drawing for /web-radar.
//
// The payload types mirror what the client pushes to /api/radar/push. Everything on
// a live radar is what the client reports; the page predicts nothing. Only the demo,
// which has no client, makes its data up (and marches view lines across the image).

export type NadeType = "smoke" | "flash" | "he" | "molotov" | "decoy";

export interface Player {
  x: number; y: number; z: number;
  team: number; alive: boolean; health: number;
  name: string; dormant: boolean; enemy: boolean;
  yaw?: number; pitch?: number;
  armor?: number; helmet?: boolean; defuser?: boolean;
  weapon?: string;
  weapons?: string[];              // everything carried, a grenade once per count
  aim?: [number, number, number];  // where the in-game view trace hits something
  pen?: [number, number, number, number][]; // past `aim`, each stretch the gun in hand shoots through a wall to
  fired?: number;                  // shots fired so far; a rise is a new shot
  scoped?: boolean; defusing?: boolean; hasBomb?: boolean;
  flashAlpha?: number;             // how blind, 0-255, as the game draws it
  money?: number; color?: number;
  kills?: number; deaths?: number; assists?: number; mvps?: number;
  ping?: number;
  slot?: number;
}

export interface Bomb {
  x: number; y: number; z: number;
  planted: boolean;
  site?: string;
  blowTime?: number; defuseEnd?: number; timerLength?: number;
  defuseLength?: number; // 10 s, or 5 with a kit
  defused?: boolean;
  exploded?: boolean;
}

export interface Grenade {
  x: number; y: number; z: number;
  type: NadeType;
  id?: number;       // entity index, so each tracer follows the right nade
  active?: boolean;  // smoke billowing / fire burning
  expires?: number;  // curtime the smoke or fire ends
  radius?: number;   // effect radius in world units
  fires?: [number, number][]; // a fire's burning patches
  boom?: number;     // curtime it went off: HE, flash, a molotov bursting in the air, a decoy
}

export interface Kill { killer: string; victim: string; weapon: string; hs: boolean; t: number }

export interface RadarData {
  status: "live" | "paused" | "waiting" | "stale" | "no_session" | "error";
  connected: boolean;
  paused?: boolean;   // the client is up but not in a match
  reason?: string;
  age_ms?: number;
  seq?: number;       // snapshot number, to skip repeats and late arrivals
  interval?: number;  // ms between the client's updates, which it picks itself
  map?: string;
  mode?: string;      // "competitive", "wingman", ...
  ffa?: boolean;      // free for all: every other player is an enemy
  localPlayer?: Player;
  players?: Player[];
  bomb?: Bomb;
  grenades?: Grenade[];
  curtime?: number;
  tScore?: number; ctScore?: number;
  phase?: string;
  roundTime?: number; roundStartTime?: number; roundsPlayed?: number;
  kills?: Kill[];
}

// ------------------------------------------------------------------- maps

export type Box = [number, number, number, number]; // x0, y0, x1, y1 in radar pixels

export interface MapInfo {
  name: string;
  x: number; y: number; scale: number; // overview calibration: world = x + px * scale
  image: string;
  fit: Box;                                  // where the drawn map is, so the fixed view fills the stage
  lower?: { image: string; below: number }; // second level, shown when z < below
  wingman?: Box;                             // the part of the map 2v2 uses
}

// Radars and calibration come straight from the game (panorama/images/overheadmaps
// and resource/overviews in pak01); maps that ship without a radar are left out.
export const MAPS: Record<string, MapInfo> = {
  de_dust2: { name: "Dust II", x: -2476, y: 3239, scale: 4.4, image: "/maps/de_dust2.webp", fit: [43, 3, 984, 1015] },
  de_mirage: { name: "Mirage", x: -3230, y: 1713, scale: 5, image: "/maps/de_mirage.webp", fit: [97, 146, 955, 876] },
  de_inferno: { name: "Inferno", x: -2087, y: 3870, scale: 4.9, image: "/maps/de_inferno.webp", fit: [58, 54, 984, 960], wingman: [300, 40, 740, 720] },
  de_nuke: { name: "Nuke", x: -3453, y: 2887, scale: 7, image: "/maps/de_nuke.webp", fit: [52, 269, 1005, 781], lower: { image: "/maps/de_nuke_lower.webp", below: -495 } },
  de_ancient: { name: "Ancient", x: -2953, y: 2164, scale: 5, image: "/maps/de_ancient.webp", fit: [117, 66, 884, 944] },
  de_ancient_night: { name: "Ancient Night", x: -2953, y: 2164, scale: 5, image: "/maps/de_ancient_night.webp", fit: [115, 64, 884, 944] },
  de_anubis: { name: "Anubis", x: -2796, y: 3328, scale: 5.22, image: "/maps/de_anubis.webp", fit: [154, 18, 895, 987] },
  de_overpass: { name: "Overpass", x: -4831, y: 1781, scale: 5.2, image: "/maps/de_overpass.webp", fit: [152, 16, 945, 1024], wingman: [500, 200, 950, 1010] },
  de_vertigo: { name: "Vertigo", x: -3168, y: 1762, scale: 4, image: "/maps/de_vertigo.webp", fit: [116, 133, 829, 877], lower: { image: "/maps/de_vertigo_lower.webp", below: 11700 }, wingman: [300, 330, 830, 870] },
  de_train: { name: "Train", x: -2308, y: 2078, scale: 4.08208, image: "/maps/de_train.webp", fit: [17, 57, 1017, 965], lower: { image: "/maps/de_train_lower.webp", below: -50 } },
  de_cache: { name: "Cache", x: -2000, y: 3250, scale: 5.5, image: "/maps/de_cache.webp", fit: [19, 164, 977, 887] },
  cs_office: { name: "Office", x: -1838, y: 1858, scale: 4.1, image: "/maps/cs_office.webp", fit: [0, 133, 1024, 1002] },
  cs_italy: { name: "Italy", x: -2647, y: 2592, scale: 4.6, image: "/maps/cs_italy.webp", fit: [345, 41, 778, 852] },
  ar_baggage: { name: "Baggage", x: -1316, y: 1288, scale: 2.53906, image: "/maps/ar_baggage.webp", fit: [59, 0, 998, 1024], lower: { image: "/maps/ar_baggage_lower.webp", below: -5 } },
  ar_shoots: { name: "Shoots", x: -1368, y: 1952, scale: 2.6875, image: "/maps/ar_shoots.webp", fit: [173, 139, 833, 884] },
  ar_shoots_night: { name: "Shoots Night", x: -1368, y: 1952, scale: 2.6875, image: "/maps/ar_shoots_night.webp", fit: [169, 139, 857, 885] },
  ar_pool_day: { name: "Pool Day", x: -1088, y: 1600, scale: 2.125, image: "/maps/ar_pool_day.webp", fit: [0, 0, 1024, 1024] },
};

export const radarToWorld = (m: MapInfo, mx: number, my: number): [number, number] => [m.x + mx * m.scale, m.y - my * m.scale];

export const toRadar = (m: MapInfo, x: number, y: number): [number, number] => [(x - m.x) / m.scale, (m.y - y) / m.scale];

// ------------------------------------------------------------------ teams

export const CT = 3, T = 2;
export const TEAM_COLOR: Record<number, string> = { [CT]: "#4a9eff", [T]: "#e0b04b" };
export const teamColor = (team: number) => TEAM_COLOR[team] ?? "#8a8a93";
// In a free for all the teams mean nothing: every player but the local one is an enemy.
export const ENEMY = "#e0656a";
export const markColor = (p: Player, ffa?: boolean) => (ffa && p.enemy ? ENEMY : teamColor(p.team));
export const COMP_COLORS = ["#4a9eff", "#5fc98a", "#e0b04b", "#e08840", "#a597ff"];

// ---------------------------------------------------------------- weapons

const WEAPON_NAMES: Record<string, string> = {
  ak47: "AK-47", m4a1: "M4A4", m4a1_silencer: "M4A1-S", awp: "AWP", famas: "FAMAS", galilar: "Galil AR",
  aug: "AUG", sg556: "SG 553", ssg08: "SSG 08", scar20: "SCAR-20", g3sg1: "G3SG1",
  mp9: "MP9", mac10: "MAC-10", mp7: "MP7", mp5sd: "MP5-SD", ump45: "UMP-45", p90: "P90", bizon: "PP-Bizon",
  nova: "Nova", xm1014: "XM1014", mag7: "MAG-7", sawedoff: "Sawed-Off", negev: "Negev", m249: "M249",
  glock: "Glock-18", hkp2000: "P2000", usp_silencer: "USP-S", elite: "Dual Berettas", p250: "P250",
  fiveseven: "Five-SeveN", tec9: "Tec-9", cz75a: "CZ75", deagle: "Deagle", revolver: "R8",
  taser: "Zeus", c4: "C4", planted_c4: "C4", hegrenade: "HE", flashbang: "Flash", smokegrenade: "Smoke",
  molotov: "Molotov", incgrenade: "Incendiary", decoy: "Decoy", healthshot: "Healthshot",
};

const PISTOLS = new Set(["glock", "hkp2000", "usp_silencer", "elite", "p250", "fiveseven", "tec9", "cz75a", "deagle", "revolver"]);

const NADE_OF: Record<string, NadeType> = {
  hegrenade: "he", flashbang: "flash", smokegrenade: "smoke", molotov: "molotov", incgrenade: "molotov", decoy: "decoy",
};

export const weaponKey = (raw: string) => raw.replace(/^weapon_/, "").toLowerCase();
const isKnife = (k: string) => k.includes("knife") || k === "bayonet";

export function weaponName(raw: string) {
  const k = weaponKey(raw);
  if (isKnife(k)) return "Knife";
  return WEAPON_NAMES[k] ?? k.charAt(0).toUpperCase() + k.slice(1);
}

export interface Loadout {
  guns: string[];  // primary first, then secondary
  nades: NadeType[];
  healthshots: number;
  knife: boolean; zeus: boolean; c4: boolean;
  held?: string;
  full: boolean;   // true when the client sent the whole inventory, false when only the held weapon is known
}

export const NADE_ORDER: NadeType[] = ["flash", "smoke", "he", "molotov", "decoy"];

export function loadout(p: Player): Loadout {
  const full = !!p.weapons?.length;
  const items = full ? p.weapons! : p.weapon ? [p.weapon] : [];
  const out: Loadout = { guns: [], nades: [], healthshots: 0, knife: false, zeus: false, c4: !!p.hasBomb, held: p.weapon && weaponKey(p.weapon), full };
  let primary: string | undefined, secondary: string | undefined;
  for (const raw of items) {
    const k = weaponKey(raw);
    if (NADE_OF[k]) out.nades.push(NADE_OF[k]);
    else if (k === "healthshot") out.healthshots++;
    else if (k === "c4") out.c4 = true;
    else if (k === "taser") out.zeus = true;
    else if (isKnife(k)) out.knife = true;
    else if (PISTOLS.has(k)) secondary = k;
    else primary = k;
  }
  out.guns = [primary, secondary].filter((g): g is string => !!g);
  out.nades.sort((a, b) => NADE_ORDER.indexOf(a) - NADE_ORDER.indexOf(b));
  return out;
}

// ------------------------------------------------------------------ nades

export const NADES: Record<NadeType, { name: string; label: string; color: string; rgb: string; radius?: number; ms?: number }> = {
  smoke:   { name: "Smoke",   label: "S", color: "#b9b9c2", rgb: "185,185,194", radius: 144, ms: 18000 },
  flash:   { name: "Flash",   label: "F", color: "#f2e28a", rgb: "242,226,138" },
  he:      { name: "HE",      label: "H", color: "#e0656a", rgb: "224,101,106" },
  molotov: { name: "Molotov", label: "M", color: "#f08a3c", rgb: "240,138,60", radius: 130, ms: 7000 },
  decoy:   { name: "Decoy",   label: "D", color: "#7cc08a", rgb: "124,192,138" },
};

const TRACER_MS = 3000; // a tracer fades out this long after its last point

interface TracePoint { x: number; y: number; t: number }

export interface Track {
  key: string; type: NadeType;
  x: number; y: number; z: number;
  pts: TracePoint[];
  landed: number; // when it went off, or its smoke or fire started; 0 in flight
  until: number;  // when that smoke or fire ends; Infinity when the client sent no end
  gone: number;   // when it dropped out of the data; only its tracer is left
  radius?: number;
  fires?: [number, number][];
}

// A blast the client reported (HE, flash, a molotov bursting in the air, a decoy).
export interface Burst { type: NadeType; x: number; y: number; z: number; t0: number; t1: number }

const BLAST_MS: Record<NadeType, number> = { he: 1500, flash: 700, molotov: 900, decoy: 400, smoke: 0 };

// Draws what the client reports and nothing else: flights from positions, blasts from
// `boom`, smokes and fires from `active`, their end from `expires`, and a grenade that
// drops out of the data is simply gone (the client reports its blast, if it had one).
export class NadeTracker {
  tracks = new Map<string, Track>();
  bursts: Burst[] = [];
  private seq = 0;
  private byId = new Map<number, string>(); // entity index -> the track following it

  reset() { this.tracks.clear(); this.bursts = []; this.byId.clear(); }

  update(nades: Grenade[], now: number, curtime?: number) {
    const seen = new Set<string>();
    for (const g of nades) {
      if (g.id == null) continue;
      // the game reuses entity indices, so a finished or different nade starts a new track
      const k = this.byId.get(g.id);
      const old = k ? this.tracks.get(k) : undefined;
      const key = k && old && !old.gone && old.type === g.type ? k : `#${g.id}:${++this.seq}`;
      this.byId.set(g.id, key);
      let tr = this.tracks.get(key);
      if (!tr) {
        tr = { key, type: g.type, x: g.x, y: g.y, z: g.z, pts: [], landed: 0, until: 0, gone: 0 };
        this.tracks.set(key, tr);
      }
      seen.add(key);

      // Gone off: the blast plays from the moment the client says it did, the tracer ends there.
      if (g.boom != null) {
        if (!tr.landed) {
          const t0 = curtime != null ? now - Math.min(1000, Math.max(0, (curtime - g.boom) * 1000)) : now;
          tr.pts.push({ x: g.x, y: g.y, t: Math.max(t0, tr.pts[tr.pts.length - 1]?.t ?? 0) });
          tr.x = g.x; tr.y = g.y; tr.z = g.z;
          tr.landed = t0;
          if (BLAST_MS[g.type]) this.bursts.push({ type: g.type, x: g.x, y: g.y, z: g.z, t0, t1: t0 + BLAST_MS[g.type] });
        }
        continue;
      }

      const last = tr.pts[tr.pts.length - 1];
      if (!tr.landed && (!last || Math.hypot(g.x - last.x, g.y - last.y) > 3)) tr.pts.push({ x: g.x, y: g.y, t: now });
      tr.x = g.x; tr.y = g.y; tr.z = g.z;
      if (g.radius) tr.radius = g.radius;
      if (g.fires) tr.fires = g.fires;

      // a smoke billowing or a fire burning, as the client says
      if (g.active && !tr.landed) tr.landed = now;
      if (g.active) tr.until = g.expires != null && curtime != null ? now + (g.expires - curtime) * 1000 : Infinity;
    }

    for (const tr of this.tracks.values())
      if (!seen.has(tr.key) && !tr.gone) tr.gone = now;
    // kept a little past their end: the page draws them up to half a second late
    for (const [key, tr] of this.tracks)
      if (tr.gone && now - (tr.pts[tr.pts.length - 1]?.t ?? tr.gone) > TRACER_MS + 600 && now - tr.gone > 1000) this.tracks.delete(key);
    this.bursts = this.bursts.filter((b) => b.t1 + 600 > now);
  }
}

// ------------------------------------------------------------------ walls

// Open floor vs. wall, read off the radar image: outside the map is transparent
// and props are light neutral grey, floors are tinted or dark.
export class Walls {
  private open = new Uint8Array(1024 * 1024);

  constructor(img: HTMLImageElement) {
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(img, 0, 0, 1024, 1024);
    const d = g.getImageData(0, 0, 1024, 1024).data;
    for (let i = 0, p = 0; i < this.open.length; i++, p += 4) {
      const r = d[p], gr = d[p + 1], b = d[p + 2];
      const prop = Math.max(r, gr, b) - Math.min(r, gr, b) < 8 && r * 0.2126 + gr * 0.7152 + b * 0.0722 > 100;
      this.open[i] = d[p + 3] > 128 && !prop ? 1 : 0;
    }
  }

  private isOpen(x: number, y: number) {
    return x >= 0 && y >= 0 && x < 1024 && y < 1024 && this.open[(y | 0) * 1024 + (x | 0)] === 1;
  }

  // Radar-pixel distance from (x, y) along `angle` to the first wall.
  cast(x: number, y: number, angle: number, limit = 1500) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let t = 3;
    while (t < 12 && !this.isOpen(x + dx * t, y + dy * t)) t += 1; // step off a prop the player stands next to
    for (; t < limit; t += 1.25) if (!this.isOpen(x + dx * t, y + dy * t)) return t;
    return limit;
  }

  private field = { key: "", canvas: null as HTMLCanvasElement | null };

  // The bomb's blast as a 1024px overlay, following open floor out from (x, y):
  // path distance on 4px cells (5/7 chamfer steps, no cutting wall corners), red
  // where it kills, fading out to where it dies. Null when the image gives too
  // little floor to go on, and the caller falls back to a circle.
  blast(x: number, y: number, unitsPerPx: number) {
    const key = `${x | 0},${y | 0},${unitsPerPx}`;
    if (this.field.key === key) return this.field.canvas;
    const N = 256, S = 4;
    const cell = new Uint8Array(N * N);
    for (let cy = 0; cy < N; cy++)
      for (let cx = 0; cx < N; cx++) {
        let open = 1;
        for (let py = 0; py < S && open; py++)
          for (let px = 0; px < S; px++)
            if (!this.open[(cy * S + py) * 1024 + cx * S + px]) { open = 0; break; }
        cell[cy * N + cx] = open;
      }

    const step = (S * unitsPerPx) / 5; // world units per chamfer unit
    const limit = Math.ceil((BLAST.lethal + BLAST.fade) / step);
    const dist = new Uint16Array(N * N).fill(0xffff);
    const start = Math.min(N - 1, Math.max(0, (y / S) | 0)) * N + Math.min(N - 1, Math.max(0, (x / S) | 0));
    cell[start] = 1; // the bomb's own cell, whatever is drawn there
    dist[start] = 0;
    const buckets: number[][] = [[start]];
    let reached = 0;
    for (let d = 0; d < buckets.length; d++) {
      for (const i of buckets[d] ?? []) {
        if (dist[i] !== d) continue;
        reached++;
        const cx = i % N, cy = (i - cx) / N;
        for (const [dx, dy, w] of STEPS) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          const j = ny * N + nx, nd = d + w;
          if (!cell[j] || nd > limit || nd >= dist[j]) continue;
          if (dx && dy && !(cell[cy * N + nx] && cell[ny * N + cx])) continue;
          dist[j] = nd;
          (buckets[nd] ??= []).push(j);
        }
      }
    }

    let canvas: HTMLCanvasElement | null = null;
    if (reached > 200) {
      canvas = document.createElement("canvas");
      canvas.width = canvas.height = N;
      const g = canvas.getContext("2d")!;
      const img = g.createImageData(N, N);
      for (let i = 0; i < N * N; i++) {
        if (dist[i] === 0xffff) continue;
        const u = dist[i] * step;
        const t = u < BLAST.lethal ? 0 : Math.min(1, (u - BLAST.lethal) / BLAST.fade);
        const p = i * 4;
        img.data[p] = 224;
        img.data[p + 1] = 101 + 75 * t;
        img.data[p + 2] = 106 - 31 * t;
        img.data[p + 3] = 255 * (u < BLAST.lethal ? 0.24 : 0.17 * Math.pow(1 - t, 1.6));
      }
      g.putImageData(img, 0, 0);
    }
    this.field = { key, canvas };
    return canvas;
  }
}

const STEPS = [[1, 0, 5], [-1, 0, 5], [0, 1, 5], [0, -1, 5], [1, 1, 7], [1, -1, 7], [-1, 1, 7], [-1, -1, 7]] as const;

// ------------------------------------------------------------------ camera

export interface View {
  map: MapInfo;
  scale: number;          // screen px per radar px
  rot: number;            // radians
  cx: number; cy: number; // camera centre, radar px
  sx: number; sy: number; // camera centre on screen
}

export function toScreen(v: View, wx: number, wy: number): [number, number] {
  const [mx, my] = toRadar(v.map, wx, wy);
  return radarToScreen(v, mx, my);
}

export function radarToScreen(v: View, mx: number, my: number): [number, number] {
  const dx = mx - v.cx, dy = my - v.cy;
  const c = Math.cos(v.rot), s = Math.sin(v.rot);
  return [v.sx + (dx * c - dy * s) * v.scale, v.sy + (dx * s + dy * c) * v.scale];
}

export const unitsToPx = (v: View, units: number) => (units / v.map.scale) * v.scale;
// World yaw (degrees, counter-clockwise from +x) to a screen angle.
export const screenAngle = (v: View, yaw: number) => (-yaw * Math.PI) / 180 + v.rot;

export function drawMap(ctx: CanvasRenderingContext2D, v: View, img: HTMLImageElement, clip?: Box) {
  ctx.save();
  ctx.translate(v.sx, v.sy);
  ctx.rotate(v.rot);
  ctx.scale(v.scale, v.scale);
  ctx.translate(-v.cx, -v.cy);
  if (clip) {
    ctx.beginPath();
    ctx.rect(clip[0], clip[1], clip[2] - clip[0], clip[3] - clip[1]);
    ctx.clip();
  }
  ctx.globalAlpha = 0.85;
  ctx.imageSmoothingQuality = "high"; // the radars are 4096px (AI-upscaled), drawn into the 1024 radar space
  ctx.drawImage(img, 0, 0, 1024, 1024);
  ctx.restore();
}

// ------------------------------------------------------------------- bomb

// Since July 2026 the C4 blast is a shockwave that runs through the map instead
// of a plain radius: walls stop it and corners weaken it, from damage fields baked
// into each map. Out in the open it kills to about 35 m and fades to nothing over
// roughly 32 m more (world units, ~52.5 to the metre); Walls.blast follows it along
// open floor, and the circle is the fallback.
export const BLAST = { lethal: 1800, fade: 1700 };

// The blast of a planted bomb, drawn under everything but the map.
export function drawBlast(ctx: CanvasRenderingContext2D, v: View, b: Bomb, walls: Walls | null) {
  if (!b.planted || b.defused || b.exploded) return;
  const [mx, my] = toRadar(v.map, b.x, b.y);
  const field = walls?.blast(mx, my, v.map.scale);
  if (field) {
    ctx.save();
    ctx.translate(v.sx, v.sy);
    ctx.rotate(v.rot);
    ctx.scale(v.scale, v.scale);
    ctx.translate(-v.cx, -v.cy);
    ctx.drawImage(field, 0, 0, 1024, 1024);
    ctx.restore();
    return;
  }
  const [x, y] = toScreen(v, b.x, b.y);
  const L = unitsToPx(v, BLAST.lethal), R = unitsToPx(v, BLAST.lethal + BLAST.fade);
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, "rgba(224,101,106,0.24)");
  g.addColorStop(L / R, "rgba(224,101,106,0.18)");
  g.addColorStop(1, "rgba(224,176,75,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
}

export function drawBomb(
  ctx: CanvasRenderingContext2D, v: View, b: Bomb,
  o: { remaining?: number; total: number; defuseLeft?: number; defuseTotal?: number; now: number },
) {
  const [x, y] = toScreen(v, b.x, b.y);
  const live = b.planted && !b.defused && !b.exploded;

  const pulse = 0.5 + 0.5 * Math.sin(o.now / (live ? 220 : 900));
  if (live && o.remaining != null) {
    const frac = Math.max(0, Math.min(1, o.remaining / o.total));
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = o.remaining < 10 ? "#e0656a" : "#e0b04b";
    ctx.beginPath(); ctx.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    if (o.defuseLeft != null && o.defuseTotal) {
      const done = 1 - Math.max(0, Math.min(1, o.defuseLeft / o.defuseTotal));
      ctx.strokeStyle = "#5fc98a";
      ctx.beginPath(); ctx.arc(x, y, 18, -Math.PI / 2, -Math.PI / 2 + done * Math.PI * 2); ctx.stroke();
    }
  }

  const r = live ? 7 : 5;
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fillStyle = live ? `rgba(224,101,106,${(0.65 + pulse * 0.35).toFixed(2)})` : "#e0b04b";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 1; ctx.stroke();

  const text = live
    ? `${b.site ?? "BOMB"}${o.remaining != null ? ` ${o.remaining.toFixed(1)}s` : ""}`
    : b.planted ? "" : "C4";
  if (text) label(ctx, text, x + (live ? 22 : 10), y + 3, live ? "#e0656a" : "#e0b04b", "left", true);
}

// ----------------------------------------------------------------- nades

// `now` is the render time, which trails the data a little so that flights,
// tracers and effects can be eased between frames.
export function drawNades(ctx: CanvasRenderingContext2D, v: View, tracker: NadeTracker, now: number, alpha: (z: number) => number) {
  const over = (t: number) => t > 0 && t <= now;

  // smokes and fires under everything else
  for (const tr of tracker.tracks.values()) {
    if (!over(tr.landed) || over(tr.gone) || tr.until <= now) continue;
    area(ctx, v, tr.type, tr.x, tr.y, tr.radius, tr.landed, tr.until, now, alpha(tr.z), seedOf(tr.key), tr.fires);
  }
  for (const b of tracker.bursts) {
    if (b.t0 > now || b.t1 <= now) continue;
    ctx.globalAlpha = alpha(b.z);
    burst(ctx, v, b, now);
  }
  ctx.globalAlpha = 1;

  for (const tr of tracker.tracks.values()) {
    const a = alpha(tr.z);
    const n = NADES[tr.type];
    const pts = tr.pts;
    let last = -1;
    for (let i = 0; i < pts.length; i++) if (pts[i].t <= now) last = i;
    if (last < 0) continue; // not thrown yet, as of the render time
    const next = pts[last + 1];
    const f = next ? (now - pts[last].t) / (next.t - pts[last].t) : 0;
    const head = next
      ? { x: pts[last].x + (next.x - pts[last].x) * f, y: pts[last].y + (next.y - pts[last].y) * f, t: now }
      : pts[last];

    // tracer: the path so far, fading with age
    ctx.lineWidth = 1.75;
    for (let i = 1; i <= last + 1; i++) {
      const p0 = pts[i - 1], p1 = i <= last ? pts[i] : head;
      if (i > last && !next) break;
      const fade = 1 - (now - p1.t) / TRACER_MS;
      if (fade <= 0) continue;
      const [x0, y0] = toScreen(v, p0.x, p0.y);
      const [x1, y1] = toScreen(v, p1.x, p1.y);
      ctx.strokeStyle = `rgba(${n.rgb},${(0.8 * fade * a).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    if (over(tr.landed) || over(tr.gone) || (tr.landed && pts.length < 2)) continue;
    // in flight: the grenade's own icon, over a soft glow in its colour
    const [x, y] = toScreen(v, head.x, head.y);
    ctx.globalAlpha = a;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 11);
    glow.addColorStop(0, `rgba(${n.rgb},0.45)`);
    glow.addColorStop(1, `rgba(${n.rgb},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
    if (!nadeIcon(ctx, tr.type, x, y, 14)) {
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = n.color; ctx.fill();
      label(ctx, n.label, x + 6, y + 3, n.color, "left", true);
    }
    ctx.globalAlpha = 1;
  }
}

const NADE_ICONS: Record<NadeType, string> = { smoke: "smokegrenade", flash: "flashbang", he: "hegrenade", molotov: "molotov", decoy: "decoy" };

function nadeIcon(ctx: CanvasRenderingContext2D, type: NadeType, x: number, y: number, h: number) {
  const img = weaponIcon(NADE_ICONS[type]);
  if (!img) return false;
  const w = (h * img.naturalWidth) / img.naturalHeight;
  ctx.shadowColor = "rgba(0,0,0,0.95)";
  ctx.shadowBlur = 3;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  return true;
}

function area(
  ctx: CanvasRenderingContext2D, v: View, type: NadeType, wx: number, wy: number,
  radius: number | undefined, t0: number, t1: number, now: number, a: number,
  seed: number, fires?: [number, number][],
) {
  const n = NADES[type];
  const [x, y] = toScreen(v, wx, wy);
  const R = unitsToPx(v, radius ?? n.radius ?? 140);
  const grow = Math.min(1, (now - t0) / 450);
  const fade = Math.min(1, (t1 - now) / 900);
  const k = grow * fade * a;
  if (k <= 0) return;
  const r = R * (0.55 + 0.45 * grow);
  const fire = type === "molotov";

  if (fire) drawFire(ctx, v, x, y, r, k, now, seed, grow, fires);
  else drawCloud(ctx, x, y, r, k, now, seed);

  // time left, as a draining arc and a number, when the client sent when it ends
  if (!Number.isFinite(t1)) return;
  const left = Math.max(0, t1 - now);
  const frac = left / (t1 - t0);
  ctx.strokeStyle = `rgba(${n.rgb},${(0.9 * k).toFixed(3)})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = k;
  label(ctx, `${Math.ceil(left / 1000)}`, x, y + 4, fire ? "#ffd2b0" : "#f0f0f4", "center", true, 10);
  ctx.globalAlpha = 1;
}

const TAU = Math.PI * 2;
const hash = (n: number) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
const seedOf = (key: string) => { let h = 7; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 9973; return h; };

let cloudLayer: HTMLCanvasElement | null = null;

// A smoke seen from above, as it looks in game: a lumpy grey-white mass of puffs,
// lit from the top left and slowly billowing. Drawn opaque on a scratch canvas and
// laid down in one go, so overlapping puffs keep their edges but never stack alpha.
function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, k: number, now: number, seed: number) {
  const size = Math.ceil(r * 2.7) + 4;
  if (size < 6) return;
  cloudLayer ??= document.createElement("canvas");
  if (cloudLayer.width < size) cloudLayer.width = cloudLayer.height = Math.max(size, 64);
  const g = cloudLayer.getContext("2d")!;
  g.clearRect(0, 0, size, size);
  const c = size / 2;

  const puffs = [{ dx: 0, dy: 0, rr: 0.6 }];
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * TAU + hash(seed + i) * 0.7;
    const breathe = 1 + 0.05 * Math.sin(now / 650 + i * 1.7 + seed);
    const d = 0.46 + 0.1 * hash(seed + i * 3.1);
    puffs.push({ dx: Math.cos(ang) * d, dy: Math.sin(ang) * d, rr: (0.4 + 0.14 * hash(seed + i * 7.3)) * breathe });
  }
  puffs.sort((p, q) => p.dy - q.dy); // nearer (lower) puffs over farther ones

  g.fillStyle = "#565a63"; // the shaded underside, peeking out bottom right
  for (const p of puffs) { g.beginPath(); g.arc(c + (p.dx + 0.05) * r, c + (p.dy + 0.07) * r, p.rr * r * 1.03, 0, TAU); g.fill(); }
  for (const p of puffs) {
    const px = c + p.dx * r, py = c + p.dy * r, pr = p.rr * r;
    const body = g.createRadialGradient(px - pr * 0.32, py - pr * 0.38, pr * 0.08, px, py, pr);
    body.addColorStop(0, "#f1f2f5");
    body.addColorStop(0.65, "#c6c9d0");
    body.addColorStop(1, "#9ca1ab");
    g.fillStyle = body;
    g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
  }

  ctx.globalAlpha = 0.86 * k;
  ctx.drawImage(cloudLayer, 0, 0, size, size, x - c, y - c, size, size);
  ctx.globalAlpha = 1;
}

// Burning patches: a warm glow on the ground under each and a flickering flame on
// top, lower flames drawn over higher ones. The client sends where each patch is;
// without that they spread out from the centre as the fire takes.
function drawFire(
  ctx: CanvasRenderingContext2D, v: View, x: number, y: number, r: number, k: number,
  now: number, seed: number, grow: number, fires?: [number, number][],
) {
  const pts: [number, number][] = fires?.length
    ? fires.map(([fx, fy]) => toScreen(v, fx, fy))
    : Array.from({ length: 11 }, (_, i) => {
        const ang = i * 2.39996 + seed, d = r * 0.8 * Math.sqrt((i + 0.5) / 11) * grow;
        return [x + Math.cos(ang) * d, y + Math.sin(ang) * d] as [number, number];
      });

  const glow = Math.max(6, unitsToPx(v, 60));
  for (const [fx, fy] of pts) {
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, glow);
    g.addColorStop(0, `rgba(255,120,40,${(0.3 * k).toFixed(3)})`);
    g.addColorStop(1, "rgba(200,50,20,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx, fy, glow, 0, TAU); ctx.fill();
  }

  const h0 = Math.min(16, Math.max(5, unitsToPx(v, 30)));
  const order = pts.map(([fx, fy], i) => [fx, fy, i] as const).sort((p, q) => p[1] - q[1]);
  for (const [fx, fy, i] of order) {
    const ph = seed + i * 1.93;
    const flick = 0.82 + 0.18 * Math.sin(now / 70 + ph) * Math.sin(now / 113 + ph * 1.7);
    flame(ctx, fx, fy, h0 * flick * (0.8 + 0.35 * hash(ph)), Math.sin(now / 160 + ph) * 0.18, k);
  }
}

function flame(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, sway: number, a: number) {
  const tip = x + sway * h;
  const outer = ctx.createLinearGradient(0, y - h, 0, y + h * 0.3);
  outer.addColorStop(0, "rgba(220,50,20,0)");
  outer.addColorStop(0.35, `rgba(240,105,35,${(0.92 * a).toFixed(3)})`);
  outer.addColorStop(1, `rgba(255,185,70,${a.toFixed(3)})`);
  ctx.fillStyle = outer;
  teardrop(ctx, x, y, tip, h, h * 0.46);
  ctx.fillStyle = `rgba(255,236,160,${(0.9 * a).toFixed(3)})`;
  teardrop(ctx, x, y + h * 0.06, x + (tip - x) * 0.6, h * 0.5, h * 0.24);
}

function teardrop(ctx: CanvasRenderingContext2D, x: number, y: number, tip: number, h: number, w: number) {
  ctx.beginPath();
  ctx.moveTo(tip, y - h);
  ctx.bezierCurveTo(x + w * 0.3, y - h * 0.55, x + w, y - h * 0.15, x + w * 0.6, y + h * 0.12);
  ctx.quadraticCurveTo(x, y + h * 0.32, x - w * 0.6, y + h * 0.12);
  ctx.bezierCurveTo(x - w, y - h * 0.15, x - w * 0.3, y - h * 0.55, tip, y - h);
  ctx.fill();
}

function burst(ctx: CanvasRenderingContext2D, v: View, b: Burst, now: number) {
  const [x, y] = toScreen(v, b.x, b.y);
  const ms = now - b.t0;
  const seed = hash(b.x * 0.137 + b.y * 0.071) * 100;
  if (b.type === "he") drawExplosion(ctx, x, y, unitsToPx(v, 350), ms, seed, false); // the HE's damage radius
  else if (b.type === "molotov") drawExplosion(ctx, x, y, unitsToPx(v, 170), ms, seed, true);
  else if (b.type === "flash") flashBurst(ctx, x, y, unitsToPx(v, 260), ms);
  else {
    const t = ms / (b.t1 - b.t0), n = NADES[b.type];
    ctx.strokeStyle = `rgba(${n.rgb},${(0.9 * (1 - t)).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, unitsToPx(v, 90) * Math.sqrt(t), 0, TAU); ctx.stroke();
    const keep = ctx.globalAlpha;
    ctx.globalAlpha = keep * Math.max(0, 1 - t * 1.6);
    nadeIcon(ctx, b.type, x, y, 14);
    ctx.globalAlpha = keep;
  }
}

const easeOut = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
const a3 = (n: number) => Math.max(0, n).toFixed(3);

// An explosion seen from above, `R` its reach in screen px and `ms` its age: a white-hot
// flash, lumpy fireball swelling and cooling from yellow to red, a shockwave ring out to
// R, sparks thrown out and smoke left hanging as the fire dies. `small` (a molotov
// bursting in the air) is all fire, with no shockwave. Gone after 1.5 s.
export function drawExplosion(
  ctx: CanvasRenderingContext2D, x: number, y: number, R: number, ms: number, seed: number, small: boolean,
) {
  if (ms < 0 || ms > 1500 || R < 1) return;

  // smoke, spreading slowly under the fire
  const s = ms / 1500;
  const smoke = Math.min(1, ms / 300) * (1 - s) ** 1.5 * (small ? 0.35 : 0.5);
  for (let i = 0; i < 6 && smoke > 0.01; i++) {
    const a = hash(seed + i) * TAU, d = R * (0.1 + 0.22 * easeOut(s)) * (0.5 + 0.5 * hash(seed + i * 2.3));
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    const pr = R * (small ? 0.22 : 0.18 + 0.2 * easeOut(s)) * (0.8 + 0.4 * hash(seed + i * 4.1));
    const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
    g.addColorStop(0, `rgba(46,44,48,${a3(smoke)})`);
    g.addColorStop(1, "rgba(46,44,48,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
  }

  ctx.globalCompositeOperation = "lighter"; // light adds up, as fire does

  // shockwave: a bright ring racing out to the edge, a faint wash behind it
  if (!small && ms < 520) {
    const k = ms / 520, r = R * easeOut(k);
    const w = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
    w.addColorStop(0, "rgba(255,140,70,0)");
    w.addColorStop(1, `rgba(255,140,70,${a3(0.2 * (1 - k))})`);
    ctx.fillStyle = w;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,220,170,${a3(0.9 * (1 - k) ** 1.5)})`;
    ctx.lineWidth = 1 + 3 * (1 - k);
    ctx.stroke();
  }

  // fireball: a few lumps around the centre, cooling as it grows
  if (ms < 950) {
    const heat = 1 - ms / 950;
    const size = R * (small ? 0.5 : 0.36) * (0.35 + 0.65 * easeOut(ms / 200));
    for (let i = 0; i < 5; i++) {
      const a = hash(seed + i * 5.7) * TAU, d = i ? size * 0.5 * (0.6 + 0.4 * hash(seed + i)) : 0;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d, pr = size * (i ? 0.65 : 0.9);
      const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, `rgba(255,${Math.round(190 + 60 * heat)},${Math.round(90 + 140 * heat)},${a3(0.85 * heat)})`);
      g.addColorStop(0.5, `rgba(255,${Math.round(90 + 70 * heat)},30,${a3(0.6 * heat)})`);
      g.addColorStop(1, "rgba(150,25,10,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
    }
  }

  // the first instant: white
  if (ms < 150) {
    const r = R * (small ? 0.4 : 0.3);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a3(1 - ms / 150)})`);
    g.addColorStop(1, "rgba(255,240,200,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  // sparks: short streaks flying out and burning out
  if (ms < 650) {
    const k = ms / 650, n = small ? 7 : 12;
    ctx.strokeStyle = `rgba(255,215,140,${a3(0.95 * (1 - k))})`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + hash(seed + i * 3.3) * 0.5;
      const d1 = R * (small ? 0.55 : 0.8) * (0.5 + 0.5 * hash(seed + i * 9.1)) * easeOut(k), d0 = Math.max(0, d1 - R * 0.1);
      ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0);
      ctx.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1);
    }
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "source-over";
}

// A flash going off: a white bloom and short rays, gone in a blink.
function flashBurst(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, ms: number) {
  const k = Math.min(1, ms / 700);
  ctx.globalCompositeOperation = "lighter";
  const r = R * (0.3 + 0.7 * easeOut(ms / 250));
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,250,${a3(0.95 * (1 - k) ** 1.5)})`);
  g.addColorStop(0.3, `rgba(255,248,215,${a3(0.45 * (1 - k) ** 2)})`);
  g.addColorStop(1, "rgba(255,248,215,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  if (ms < 300) {
    const q = ms / 300;
    ctx.strokeStyle = `rgba(255,255,240,${a3(0.85 * (1 - q))})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2, d0 = R * 0.12, d1 = R * (0.3 + 0.45 * easeOut(q));
      ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0);
      ctx.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
}

// ----------------------------------------------------------- weapon icons

// Equipment icons from the game (panorama/images/icons/equipment), white on transparent.
const ICON_KEYS = new Set((
  "ak47 m4a1 m4a1_silencer awp famas galilar aug sg556 ssg08 scar20 g3sg1 mp9 mac10 mp7 mp5sd ump45 p90 bizon " +
  "nova xm1014 mag7 sawedoff negev m249 glock hkp2000 usp_silencer elite p250 fiveseven tec9 cz75a deagle revolver " +
  "taser c4 hegrenade flashbang smokegrenade molotov incgrenade decoy healthshot knife knife_t defuser"
).split(" "));

export function iconSrc(raw: string) {
  const key = weaponKey(raw).replace(/^planted_/, "");
  const k = key === "knife_t" ? key : isKnife(key) ? "knife" : key.replace(/_off$/, "");
  return ICON_KEYS.has(k) ? `/weapons/${k}.svg` : null;
}

const icons = new Map<string, HTMLImageElement | null>();

// The icon as a drawable image once it has loaded, else null.
export function weaponIcon(key: string) {
  if (!icons.has(key)) {
    const src = iconSrc(key);
    const img = src ? new Image() : null;
    if (img && src) img.src = src;
    icons.set(key, img);
  }
  const img = icons.get(key);
  return img && img.complete && img.naturalWidth ? img : null;
}

// ---------------------------------------------------------------- players

export interface PlayerMark {
  p: Player;
  x: number; y: number;  // screen
  angle?: number;        // screen view angle
  local: boolean; followed: boolean; hovered: boolean;
  names: boolean; health: boolean; ffa: boolean;
  alpha: number;
}

export function drawViewLine(ctx: CanvasRenderingContext2D, x: number, y: number, x2: number, y2: number, color: string, alert: boolean) {
  const g = ctx.createLinearGradient(x, y, x2, y2);
  g.addColorStop(0, alert ? "rgba(224,101,106,0.95)" : `${color}b0`);
  g.addColorStop(1, alert ? "rgba(224,101,106,0.55)" : `${color}26`);
  ctx.strokeStyle = g;
  ctx.lineWidth = alert ? 2 : 1;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.fillStyle = alert ? "#e0656a" : `${color}99`;
  ctx.beginPath(); ctx.arc(x2, y2, alert ? 2.5 : 1.75, 0, Math.PI * 2); ctx.fill();
}

// A stretch of the view line past a wall the gun in hand shoots through: dashed pink,
// from a ring where it comes out of the wall.
export function drawWallbang(ctx: CanvasRenderingContext2D, x: number, y: number, x2: number, y2: number) {
  const g = ctx.createLinearGradient(x, y, x2, y2);
  g.addColorStop(0, "rgba(255,95,190,0.9)");
  g.addColorStop(1, "rgba(255,95,190,0.3)");
  ctx.strokeStyle = g;
  ctx.lineWidth = 1.25;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(255,95,190,0.9)";
  ctx.beginPath(); ctx.arc(x, y, 2.25, 0, TAU); ctx.stroke();
  ctx.fillStyle = "rgba(255,95,190,0.6)";
  ctx.beginPath(); ctx.arc(x2, y2, 1.75, 0, TAU); ctx.fill();
}

export const hpColor = (hp: number) => (hp > 60 ? "#5fc98a" : hp > 25 ? "#e0b04b" : "#e0656a");

// A filled dot in the team colour, a thin HP ring around it, a notch for where
// they face, the name above and the held weapon's icon below.
export function drawPlayer(ctx: CanvasRenderingContext2D, m: PlayerMark, now: number) {
  const { p, x, y } = m;
  const color = markColor(p, m.ffa);
  ctx.globalAlpha = m.alpha;

  if (!p.alive) {
    ctx.strokeStyle = color; ctx.globalAlpha = 0.45 * m.alpha; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4); ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }
  if (p.dormant) {
    ctx.strokeStyle = `${color}88`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke();
    label(ctx, "?", x + 8, y + 3, "#8a8a93");
    ctx.globalAlpha = 1;
    return;
  }

  const r = 6, ring = r + 3.5;

  if (p.defusing) {
    const k = 0.5 + 0.5 * Math.sin(now / 150);
    ctx.strokeStyle = `rgba(95,201,138,${(0.4 + 0.5 * k).toFixed(2)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, ring + 9, 0, Math.PI * 2); ctx.stroke();
  }
  if (m.followed || m.hovered) {
    ctx.strokeStyle = m.followed ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, ring + 5, 0, Math.PI * 2); ctx.stroke();
  }
  if (m.local) {
    const k = 0.5 + 0.5 * Math.sin(now / 500);
    ctx.strokeStyle = `rgba(143,127,245,${(0.35 + 0.45 * k).toFixed(2)})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, ring + 2.5, 0, Math.PI * 2); ctx.stroke();
  }

  if (m.angle != null) {
    const a = m.angle, tip = ring + 6, base = ring + 1.5, w = 0.3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * tip, y + Math.sin(a) * tip);
    ctx.lineTo(x + Math.cos(a - w) * base, y + Math.sin(a - w) * base);
    ctx.lineTo(x + Math.cos(a + w) * base, y + Math.sin(a + w) * base);
    ctx.closePath(); ctx.fill();
  }

  // flashed: a white glow as strong as they are blind, and how blind in per cent
  const blind = Math.min(1, (p.flashAlpha ?? 0) / 255);
  if (blind >= 0.01) {
    const g = ctx.createRadialGradient(x, y, r, x, y, ring + 9);
    g.addColorStop(0, `rgba(255,255,235,${(0.75 * blind).toFixed(3)})`);
    g.addColorStop(1, "rgba(255,255,235,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, ring + 9, 0, Math.PI * 2); ctx.fill();
  }

  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 1; ctx.stroke();
  if (blind >= 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${(0.8 * blind).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    label(ctx, `${Math.round(blind * 100)}%`, x + ring + 5, y + 3.5, "#f2e28a", "left", true, 9);
  }

  if (m.health) {
    const hp = Math.max(0, Math.min(100, p.health));
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath(); ctx.arc(x, y, ring, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = hpColor(hp);
    ctx.beginPath(); ctx.arc(x, y, ring, -Math.PI / 2, -Math.PI / 2 + (hp / 100) * Math.PI * 2); ctx.stroke();
  }

  if (p.hasBomb) {
    const bx = x + ring + 3, by = y - ring;
    ctx.fillStyle = "#e0b04b";
    ctx.beginPath(); ctx.moveTo(bx, by - 3.5); ctx.lineTo(bx + 3.5, by); ctx.lineTo(bx, by + 3.5); ctx.lineTo(bx - 3.5, by); ctx.closePath(); ctx.fill();
  }

  if (m.names) {
    label(ctx, p.name, x, y - ring - 6, m.local ? "#b3a8ff" : "#e6e6ea", "center", true);
    const key = p.weapon ? weaponKey(p.weapon) : "";
    const icon = key ? weaponIcon(key) : null;
    if (icon) {
      const h = 13, w = (h * icon.naturalWidth) / icon.naturalHeight;
      ctx.shadowColor = "rgba(0,0,0,0.95)"; ctx.shadowBlur = 2;
      ctx.globalAlpha = 0.92 * m.alpha;
      ctx.drawImage(icon, x - w / 2, y + ring + 8, w, h);
      ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
    } else if (p.weapon) {
      label(ctx, weaponName(p.weapon), x, y + ring + 18, "#a0a0a8", "center", false, 10);
    }
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ shots

export interface Shot { x: number; y: number; ex: number; ey: number; t: number }
export const SHOT_MS = 420;

// Muzzle flash, a tracer racing to where the view line meets a wall, and a
// burst of sparks where it lands.
export function drawShots(ctx: CanvasRenderingContext2D, v: View, shots: Shot[], now: number) {
  for (const s of shots) {
    const age = now - s.t;
    if (age < 0 || age > SHOT_MS) continue;
    const [x0, y0] = toScreen(v, s.x, s.y);
    const [x1, y1] = toScreen(v, s.ex, s.ey);
    const a = Math.atan2(y1 - y0, x1 - x0);
    const mx = x0 + Math.cos(a) * 11, my = y0 + Math.sin(a) * 11;
    const fly = 90;

    const head = Math.min(1, age / fly), tail = Math.max(0, head - 0.45);
    const fade = 1 - age / SHOT_MS;
    ctx.strokeStyle = `rgba(255,232,160,${(0.95 * fade).toFixed(3)})`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(mx + (x1 - mx) * tail, my + (y1 - my) * tail);
    ctx.lineTo(mx + (x1 - mx) * head, my + (y1 - my) * head);
    ctx.stroke();

    if (age < 80) {
      const k = 1 - age / 80;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, 3 + 7 * k);
      g.addColorStop(0, `rgba(255,248,220,${k.toFixed(3)})`);
      g.addColorStop(0.5, `rgba(255,190,90,${(0.7 * k).toFixed(3)})`);
      g.addColorStop(1, "rgba(255,150,60,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(mx, my, 3 + 7 * k, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,236,180,${k.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(a) * (8 + 6 * k), my + Math.sin(a) * (8 + 6 * k));
      ctx.lineTo(mx + Math.cos(a + 1.57) * 2, my + Math.sin(a + 1.57) * 2);
      ctx.lineTo(mx + Math.cos(a - 1.57) * 2, my + Math.sin(a - 1.57) * 2);
      ctx.closePath(); ctx.fill();
    }

    if (age >= fly) {
      const k = (age - fly) / (SHOT_MS - fly);
      ctx.strokeStyle = `rgba(255,214,140,${(0.9 * (1 - k)).toFixed(3)})`;
      ctx.lineWidth = 1.25;
      ctx.beginPath(); ctx.arc(x1, y1, 2 + 7 * k, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      for (const d of [-1.1, -0.45, 0.45, 1.1]) {
        const b = a + Math.PI + d;
        ctx.moveTo(x1 + Math.cos(b) * (2 + 3 * k), y1 + Math.sin(b) * (2 + 3 * k));
        ctx.lineTo(x1 + Math.cos(b) * (4 + 8 * k), y1 + Math.sin(b) * (4 + 8 * k));
      }
      ctx.stroke();
    }
  }
}

export function label(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string,
  align: CanvasTextAlign = "left", bold = false, size = 10,
) {
  ctx.font = `${bold ? "bold " : ""}${size}px Verdana, Tahoma, sans-serif`;
  ctx.textAlign = align;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(8,8,10,0.85)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.textAlign = "left";
}
