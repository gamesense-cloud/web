// Radar model, map table and canvas drawing for /web-radar.
//
// The payload types mirror what the DLL pushes to /api/radar/push. Fields marked
// "planned" are not sent yet: the page uses them as soon as the DLL does, and
// until then infers the same thing from positions (see NadeTracker, Walls).

export type NadeType = "smoke" | "flash" | "he" | "molotov" | "decoy";

export interface Player {
  x: number; y: number; z: number;
  team: number; alive: boolean; health: number;
  name: string; dormant: boolean; enemy: boolean;
  yaw?: number; pitch?: number;
  vx?: number; vy?: number;
  armor?: number; helmet?: boolean; defuser?: boolean;
  weapon?: string;
  weapons?: string[];              // planned: everything carried, a grenade once per count
  aim?: [number, number, number];  // planned: where the in-game view trace hits a wall
  fired?: number;                  // planned: curtime of the latest shot (weapon_fire)
  scoped?: boolean; defusing?: boolean; hasBomb?: boolean;
  flashAlpha?: number; money?: number; color?: number;
  kills?: number; deaths?: number; assists?: number; mvps?: number;
  ping?: number;
  slot?: number;
}

export interface Bomb {
  x: number; y: number; z: number;
  planted: boolean;
  site?: string;
  blowTime?: number; defuseEnd?: number; timerLength?: number;
  radius?: number;    // planned: blast radius in world units
  defused?: boolean;  // planned
  exploded?: boolean; // planned
}

export interface Grenade {
  x: number; y: number; z: number;
  type: NadeType;
  id?: number;       // planned: entity index, so each tracer follows the right nade
  active?: boolean;  // planned: smoke billowing / fire burning
  expires?: number;  // planned: curtime the smoke or fire ends
  radius?: number;   // planned: effect radius in world units
}

export interface Kill { killer: string; victim: string; weapon: string; hs: boolean; t: number }

export interface RadarData {
  status: "live" | "waiting" | "stale" | "no_session" | "error";
  connected: boolean;
  reason?: string;
  age_ms?: number;
  map?: string;
  mode?: string; // planned: "competitive", "wingman", ...
  localPlayer?: Player;
  players?: Player[];
  bomb?: Bomb;
  grenades?: Grenade[];
  curtime?: number;
  tickCount?: number;
  tScore?: number; ctScore?: number;
  phase?: string;
  roundTime?: number; roundStartTime?: number; roundsPlayed?: number;
  kills?: Kill[];
  debug?: Record<string, unknown>;
  entityScan?: { total: number; null: number; noPawn: number; badPos?: number; added: number };
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
  molotov: "Molotov", incgrenade: "Incendiary", decoy: "Decoy",
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
  knife: boolean; zeus: boolean; c4: boolean;
  held?: string;
  full: boolean;   // true when the DLL sent the whole inventory, false when only the held weapon is known
}

export const NADE_ORDER: NadeType[] = ["flash", "smoke", "he", "molotov", "decoy"];

export function loadout(p: Player): Loadout {
  const full = !!p.weapons?.length;
  const items = full ? p.weapons! : p.weapon ? [p.weapon] : [];
  const out: Loadout = { guns: [], nades: [], knife: false, zeus: false, c4: !!p.hasBomb, held: p.weapon && weaponKey(p.weapon), full };
  let primary: string | undefined, secondary: string | undefined;
  for (const raw of items) {
    const k = weaponKey(raw);
    if (NADE_OF[k]) out.nades.push(NADE_OF[k]);
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
  still: number;  // when it stopped moving, 0 while moving
  landed: number; // when its smoke/fire started, 0 in flight
  until: number;  // when that effect ends
  gone: number;   // when it dropped out of the data; only its tracer is left
  radius?: number;
}

export interface Burst { type: NadeType; x: number; y: number; z: number; t0: number; t1: number; radius?: number }

export class NadeTracker {
  tracks = new Map<string, Track>();
  bursts: Burst[] = [];
  private seq = 0;

  reset() { this.tracks.clear(); this.bursts = []; }

  update(nades: Grenade[], now: number, curtime?: number) {
    const seen = new Set<string>();
    for (const g of nades) {
      const key = g.id != null ? `#${g.id}` : this.match(g, seen);
      let tr = this.tracks.get(key);
      if (!tr) {
        tr = { key, type: g.type, x: g.x, y: g.y, z: g.z, pts: [], still: 0, landed: 0, until: 0, gone: 0 };
        this.tracks.set(key, tr);
      }
      const last = tr.pts[tr.pts.length - 1];
      if (!tr.landed && (!last || Math.hypot(g.x - last.x, g.y - last.y) > 3)) {
        tr.pts.push({ x: g.x, y: g.y, t: now });
        tr.still = 0;
      } else if (!tr.still) tr.still = now;
      tr.x = g.x; tr.y = g.y; tr.z = g.z;
      if (g.radius) tr.radius = g.radius;

      // Smokes and fires sit where they land; without the planned `active` flag,
      // a smoke that has stopped moving has popped.
      const lingers = g.type === "smoke" || g.type === "molotov";
      if (!tr.landed && (g.active || (g.type === "smoke" && tr.still && now - tr.still > 250))) tr.landed = now;
      if (tr.landed && lingers) {
        if (g.expires != null && curtime != null) tr.until = now + (g.expires - curtime) * 1000;
        else if (!tr.until) tr.until = tr.landed + (NADES[g.type].ms ?? 0);
      }
      seen.add(key);
    }

    for (const tr of this.tracks.values()) {
      if (seen.has(tr.key) || tr.gone) continue;
      tr.gone = now;
      // Dropped out mid-flight: it went off where it was last seen.
      if (!tr.landed && tr.pts.length > 1) {
        const base = { x: tr.x, y: tr.y, z: tr.z, t0: now };
        if (tr.type === "molotov") this.bursts.push({ ...base, type: "molotov", t1: now + NADES.molotov.ms!, radius: tr.radius });
        else if (tr.type === "he") this.bursts.push({ ...base, type: "he", t1: now + 700 });
        else if (tr.type === "flash") this.bursts.push({ ...base, type: "flash", t1: now + 500 });
      }
    }
    for (const [key, tr] of this.tracks)
      if (tr.gone && now - (tr.pts[tr.pts.length - 1]?.t ?? tr.gone) > TRACER_MS && now - tr.gone > 400) this.tracks.delete(key);
    this.bursts = this.bursts.filter((b) => b.t1 > now);
  }

  // Without the planned entity id, follow each nade by the nearest one of its kind.
  private match(g: Grenade, seen: Set<string>) {
    let best = "", bestDist = 700;
    for (const tr of this.tracks.values()) {
      if (tr.gone || tr.type !== g.type || seen.has(tr.key) || tr.key.startsWith("#")) continue;
      const d = Math.hypot(g.x - tr.x, g.y - tr.y);
      if (d < bestDist) { best = tr.key; bestDist = d; }
    }
    return best || `~${++this.seq}`;
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
}

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
  ctx.drawImage(img, 0, 0, 1024, 1024);
  ctx.restore();
}

// ------------------------------------------------------------------- bomb

// Blast damage falls off as a gaussian with sigma = radius / 3 from a peak of
// radius / 3.5; these are the distances that still kill at 100 hp.
export function blast(radius: number) {
  const sigma = radius / 3, peak = radius / 3.5;
  const reach = (need: number) => (peak > need ? sigma * Math.sqrt(2 * Math.log(peak / need)) : 0);
  return { lethal: reach(100), lethalArmored: reach(200) };
}

export const BOMB_RADIUS = 1750;

export function drawBomb(
  ctx: CanvasRenderingContext2D, v: View, b: Bomb,
  o: { remaining?: number; total: number; defuseLeft?: number; defuseTotal?: number; now: number; radius: boolean },
) {
  const [x, y] = toScreen(v, b.x, b.y);
  const live = b.planted && !b.defused && !b.exploded;

  if (live && o.radius) {
    const radius = b.radius ?? BOMB_RADIUS;
    const R = unitsToPx(v, radius);
    const L = unitsToPx(v, blast(radius).lethal);
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, "rgba(224,101,106,0.22)");
    g.addColorStop(Math.min(0.99, L / R), "rgba(224,101,106,0.09)");
    g.addColorStop(1, "rgba(224,101,106,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(224,101,106,0.6)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, L, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, "lethal", x, y - L - 4, "rgba(224,101,106,0.8)", "center");
  }

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

export function drawNades(ctx: CanvasRenderingContext2D, v: View, tracker: NadeTracker, now: number, alpha: (z: number) => number) {
  // smokes and fires under everything else
  for (const tr of tracker.tracks.values()) {
    if (!tr.landed || tr.gone || tr.until <= now) continue;
    area(ctx, v, tr.type, tr.x, tr.y, tr.radius, tr.landed, tr.until, now, alpha(tr.z));
  }
  for (const b of tracker.bursts) {
    ctx.globalAlpha = alpha(b.z);
    if (b.type === "molotov") area(ctx, v, "molotov", b.x, b.y, b.radius, b.t0, b.t1, now, alpha(b.z));
    else burst(ctx, v, b, now);
  }
  ctx.globalAlpha = 1;

  for (const tr of tracker.tracks.values()) {
    const a = alpha(tr.z);
    const n = NADES[tr.type];
    // tracer: only the recent path, fading with age
    for (let i = 1; i < tr.pts.length; i++) {
      const p0 = tr.pts[i - 1], p1 = tr.pts[i];
      const fade = 1 - (now - p1.t) / TRACER_MS;
      if (fade <= 0) continue;
      const [x0, y0] = toScreen(v, p0.x, p0.y);
      const [x1, y1] = toScreen(v, p1.x, p1.y);
      ctx.strokeStyle = `rgba(${n.rgb},${(0.8 * fade * a).toFixed(3)})`;
      ctx.lineWidth = 1.75;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    if (tr.landed || tr.gone) continue;
    // in flight: the grenade's own icon, over a soft glow in its colour
    const [x, y] = toScreen(v, tr.x, tr.y);
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
) {
  const n = NADES[type];
  const [x, y] = toScreen(v, wx, wy);
  const R = unitsToPx(v, radius ?? n.radius ?? 140);
  const grow = Math.min(1, (now - t0) / 450);
  const fade = Math.min(1, (t1 - now) / 900);
  const k = grow * fade * a;
  const r = R * (0.55 + 0.45 * grow);
  const fire = type === "molotov";
  const flicker = fire ? 0.82 + 0.18 * Math.sin(now / 90) * Math.sin(now / 157) : 1;

  const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
  g.addColorStop(0, `rgba(${n.rgb},${(0.42 * k * flicker).toFixed(3)})`);
  g.addColorStop(0.8, `rgba(${n.rgb},${(0.28 * k * flicker).toFixed(3)})`);
  g.addColorStop(1, `rgba(${n.rgb},${(0.08 * k).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `rgba(${n.rgb},${(0.55 * k).toFixed(3)})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // time left, as a draining arc and a number
  const left = Math.max(0, t1 - now);
  const frac = left / (t1 - t0);
  ctx.strokeStyle = `rgba(${n.rgb},${(0.9 * k).toFixed(3)})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r + 3, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = k;
  const iconed = nadeIcon(ctx, type, x, y - 5, 14);
  label(ctx, `${Math.ceil(left / 1000)}`, x, iconed ? y + 14 : y + 4, fire ? "#ffd2b0" : "#f0f0f4", "center", true, iconed ? 9 : 10);
  ctx.globalAlpha = 1;
}

function burst(ctx: CanvasRenderingContext2D, v: View, b: Burst, now: number) {
  const [x, y] = toScreen(v, b.x, b.y);
  const t = (now - b.t0) / (b.t1 - b.t0);
  const n = NADES[b.type];
  if (b.type === "flash") {
    const r = unitsToPx(v, 260) * (0.3 + 0.7 * t);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,240,${(0.85 * (1 - t)).toFixed(3)})`);
    g.addColorStop(1, "rgba(255,255,240,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  } else {
    const r = unitsToPx(v, 350) * Math.sqrt(t);
    ctx.fillStyle = `rgba(${n.rgb},${(0.25 * (1 - t)).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(${n.rgb},${(0.9 * (1 - t)).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const keep = ctx.globalAlpha;
  ctx.globalAlpha = keep * Math.max(0, 1 - t * 1.6);
  nadeIcon(ctx, b.type, x, y, 14);
  ctx.globalAlpha = keep;
}

// ----------------------------------------------------------- weapon icons

// Equipment icons from the game (panorama/images/icons/equipment), white on transparent.
const ICON_KEYS = new Set((
  "ak47 m4a1 m4a1_silencer awp famas galilar aug sg556 ssg08 scar20 g3sg1 mp9 mac10 mp7 mp5sd ump45 p90 bizon " +
  "nova xm1014 mag7 sawedoff negev m249 glock hkp2000 usp_silencer elite p250 fiveseven tec9 cz75a deagle revolver " +
  "taser c4 hegrenade flashbang smokegrenade molotov incgrenade decoy knife knife_t defuser"
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
  names: boolean; health: boolean;
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

export const hpColor = (hp: number) => (hp > 60 ? "#5fc98a" : hp > 25 ? "#e0b04b" : "#e0656a");

// A filled dot in the team colour, a thin HP ring around it, a notch for where
// they face, the name above and the held weapon's icon below.
export function drawPlayer(ctx: CanvasRenderingContext2D, m: PlayerMark, now: number) {
  const { p, x, y } = m;
  const color = teamColor(p.team);
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

  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 1; ctx.stroke();
  if ((p.flashAlpha ?? 0) > 10) {
    ctx.fillStyle = `rgba(255,255,255,${(Math.min(1, (p.flashAlpha ?? 0) / 255) * 0.8).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
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
      const h = 9, w = (h * icon.naturalWidth) / icon.naturalHeight;
      ctx.shadowColor = "rgba(0,0,0,0.95)"; ctx.shadowBlur = 2;
      ctx.globalAlpha = 0.9 * m.alpha;
      ctx.drawImage(icon, x - w / 2, y + ring + 4, w, h);
      ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
    } else if (p.weapon) {
      label(ctx, weaponName(p.weapon), x, y + ring + 12, "#a0a0a8", "center", false, 9);
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
