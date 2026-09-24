// A scripted 5v5 on Dust II that loops forever, shown on /web-radar when no
// session is open. It emits the same payload the client pushes, including the
// planned fields (grenade ids, full inventories, shots), so it doubles as an
// example of that contract. Routes were computed from the radar image, so the
// players stay inside corridors.

import type { Bomb, Grenade, Kill, NadeType, Player, RadarData } from "./radar";

type Pt = [number, number];

const ROUTES: Record<string, Pt[]> = {"t1":[[-830,-747],[-760,-818],[-74,-818],[226,-501],[226,-360],[243,-343],[243,-307],[402,-149],[402,27],[595,221],[595,273],[666,326],[666,537],[595,608],[595,696],[613,731],[806,942],[1070,942],[1106,960],[1405,1259],[1405,1365],[1422,1382],[1422,2051],[1158,2315],[1158,2385],[1106,2456]],"t1b":[[1106,2456],[1141,2421],[1141,2262],[1229,2174],[1229,2121]],"t2":[[-690,-818],[-74,-818],[190,-554],[226,-501],[226,-360],[243,-343],[243,-307],[402,-149],[402,27],[595,221],[595,273],[666,326],[666,537],[595,608],[595,696],[613,731],[806,942],[1070,942],[1106,960],[1405,1259],[1405,1365],[1422,1382],[1422,2297]],"t3":[[-619,-730],[-566,-783],[-56,-783],[226,-501],[226,-360],[243,-343],[243,-307],[402,-149],[402,27],[595,221],[595,273],[666,326],[666,537],[595,608],[595,696],[613,731],[806,942],[1070,942],[1106,960],[1405,1259],[1405,1365],[1422,1382]],"t4":[[-883,-835],[-619,-835],[-602,-818],[-74,-818],[226,-501],[226,-360],[243,-343],[243,-307],[314,-219],[314,185],[102,397],[-126,397],[-179,432],[-232,432],[-373,573],[-373,1206],[-338,1241],[-373,1206],[-373,837],[-285,749],[-232,749],[-179,801],[-179,1312],[-56,1435],[102,1435],[173,1505],[190,1488],[261,1488],[366,1593],[366,2104],[384,2121],[384,2192]],"t5":[[-1024,-783],[-1728,-783],[-1922,-589],[-1922,-79],[-1904,-61],[-1904,-8],[-1869,62],[-1658,273],[-1658,1065],[-1746,1153],[-1816,1153],[-1904,1241],[-1904,1329]],"ct1":[[120,2368],[155,2403],[331,2403],[419,2491],[613,2491],[701,2579],[894,2579],[1246,2931],[1370,2931],[1405,2896]],"ct1b":[[1405,2896],[1370,2931],[1246,2931],[930,2614],[630,2614],[560,2667],[454,2667],[402,2614],[366,2614]],"ct1c":[[366,2614],[402,2614],[454,2667],[560,2667],[666,2597],[824,2579],[1018,2385],[1123,2385],[1141,2403]],"ct2":[[190,2297],[190,2350],[243,2403],[331,2403],[419,2491],[613,2491],[666,2544],[859,2544],[1176,2209],[1370,2192],[1475,2086],[1493,2086]],"ct3":[[155,2245],[50,2139],[-144,2139],[-214,2104],[-302,2104],[-426,1981],[-426,1822]],"ct4":[[208,2421],[155,2368],[155,2262],[32,2139],[-408,2139],[-531,2262],[-690,2280],[-742,2315],[-901,2315],[-971,2350],[-1288,2667],[-1358,2667],[-1464,2561],[-1482,2456],[-1798,2139],[-1851,2139]],"ct4b":[[-1851,2139],[-1798,2139],[-1482,2456],[-1482,2561],[-1376,2667],[-1288,2667],[-971,2350],[-531,2262],[-408,2139],[32,2139],[155,2262],[155,2333],[226,2403],[331,2403],[419,2491],[613,2491],[789,2667]],"ct5":[[138,2174],[67,2139],[-408,2139],[-531,2262],[-690,2280],[-742,2315],[-901,2315],[-971,2350],[-1288,2667],[-1640,2649],[-1710,2702],[-1798,2720],[-1957,2878],[-1957,2913],[-1992,2966]],"ct5b":[[-1992,2966],[-1957,2913],[-1957,2878],[-1816,2737],[-1746,2702],[-1710,2702],[-1675,2667],[-1640,2667],[-1622,2649],[-1288,2667],[-971,2350],[-531,2262],[-408,2139],[32,2139],[155,2262],[155,2333],[226,2403],[349,2403],[419,2473],[595,2473],[613,2456]]};

// Dust II radar pixel -> world, for authoring targets against the image.
const px = (x: number, y: number): Pt => [-2476 + x * 4.4, 3239 - y * 4.4];

ROUTES.ct4c = [ROUTES.ct4b[ROUTES.ct4b.length - 1], px(806, 182)];

const SPEED = 220;  // units per second
const LOOP = 76;    // seconds per round
const FREEZE = 4;
const BOMB_AT = 30.2, BOMB_TIMER = 40, BLOW = BOMB_AT + BOMB_TIMER;
const CT = 3, T = 2;

interface Actor {
  name: string; team: number; color: number; money: number; kda: [number, number, number]; ping: number;
  gear: string[]; helmet?: boolean; defuser?: boolean;
  legs: { at: number; route: string; look: Pt }[]; // `look`: radar px to watch once the leg is walked
}

const ACTORS: Actor[] = [
  { name: "kronos", team: CT, color: 4, money: 4250, kda: [14, 9, 4], ping: 18, helmet: true, defuser: true,
    gear: ["weapon_m4a1_silencer", "weapon_usp_silencer", "weapon_knife", "weapon_flashbang", "weapon_smokegrenade", "weapon_incgrenade"],
    legs: [{ at: 4.0, route: "ct1", look: [650, 238] }, { at: 24.5, route: "ct1b", look: [812, 176] }, { at: 50.0, route: "ct1c", look: [812, 176] }] },
  { name: "vex", team: CT, color: 1, money: 1350, kda: [11, 10, 2], ping: 32, helmet: true,
    gear: ["weapon_awp", "weapon_deagle", "weapon_knife", "weapon_flashbang", "weapon_smokegrenade"],
    legs: [{ at: 4.2, route: "ct2", look: [885, 560] }] },
  { name: "noir", team: CT, color: 2, money: 2900, kda: [8, 12, 5], ping: 41, helmet: true,
    gear: ["weapon_m4a1", "weapon_usp_silencer", "weapon_knife", "weapon_hegrenade", "weapon_flashbang"],
    legs: [{ at: 4.1, route: "ct3", look: [486, 600] }] },
  { name: "halcyon", team: CT, color: 0, money: 3100, kda: [12, 11, 3], ping: 27, helmet: true,
    gear: ["weapon_famas", "weapon_p250", "weapon_knife", "weapon_smokegrenade", "weapon_flashbang"],
    legs: [{ at: 4.3, route: "ct4", look: [120, 340] }, { at: 30.0, route: "ct4b", look: [812, 176] }, { at: 55.0, route: "ct4c", look: [650, 238] }] },
  { name: "ember", team: CT, color: 3, money: 1900, kda: [6, 13, 7], ping: 55, defuser: true,
    gear: ["weapon_mp9", "weapon_usp_silencer", "weapon_knife", "weapon_flashbang", "weapon_hegrenade"],
    legs: [{ at: 4.0, route: "ct5", look: [255, 240] }, { at: 31.0, route: "ct5b", look: [812, 176] }] },
  { name: "rook", team: T, color: 3, money: 3800, kda: [15, 10, 3], ping: 23, helmet: true,
    gear: ["weapon_ak47", "weapon_glock", "weapon_knife_t", "weapon_flashbang", "weapon_hegrenade"],
    legs: [{ at: 4.0, route: "t1", look: [812, 176] }, { at: 30.6, route: "t1b", look: [700, 140] }] },
  { name: "sable", team: T, color: 1, money: 2600, kda: [10, 11, 6], ping: 37, helmet: true,
    gear: ["weapon_ak47", "weapon_glock", "weapon_knife_t", "weapon_smokegrenade", "weapon_hegrenade", "weapon_flashbang"],
    legs: [{ at: 4.2, route: "t2", look: [700, 140] }] },
  { name: "mako", team: T, color: 0, money: 750, kda: [9, 12, 2], ping: 48,
    gear: ["weapon_awp", "weapon_p250", "weapon_knife_t", "weapon_flashbang", "weapon_healthshot"],
    legs: [{ at: 4.4, route: "t3", look: [900, 262] }] },
  { name: "juno", team: T, color: 4, money: 3350, kda: [13, 9, 4], ping: 29, helmet: true,
    gear: ["weapon_ak47", "weapon_tec9", "weapon_knife_t", "weapon_molotov", "weapon_flashbang", "weapon_smokegrenade"],
    legs: [{ at: 4.1, route: "t4", look: [760, 140] }] },
  { name: "drift", team: T, color: 2, money: 1500, kda: [7, 11, 8], ping: 61,
    gear: ["weapon_galilar", "weapon_glock", "weapon_knife_t", "weapon_smokegrenade", "weapon_flashbang"],
    legs: [{ at: 4.3, route: "t5", look: [110, 330] }] },
];

const NADE_ITEM: Record<NadeType, string> = {
  smoke: "weapon_smokegrenade", flash: "weapon_flashbang", he: "weapon_hegrenade", molotov: "weapon_molotov", decoy: "weapon_decoy",
};

// thrower, type, time, target (radar px); incendiaries are "molotov" on the radar
const NADES: { by: string; type: NadeType; at: number; to: Pt; item?: string }[] = [
  { by: "noir", type: "he", at: 10.0, to: [486, 520] },
  { by: "sable", type: "smoke", at: 14.0, to: [880, 300] },
  { by: "rook", type: "flash", at: 16.0, to: [885, 350] },
  { by: "juno", type: "molotov", at: 23.0, to: [870, 95] },
  { by: "rook", type: "he", at: 25.0, to: [700, 140] },
  { by: "halcyon", type: "smoke", at: 43.0, to: [850, 230] },
  { by: "ember", type: "flash", at: 44.5, to: [820, 215] },
  { by: "sable", type: "he", at: 45.0, to: [730, 140] },
  { by: "kronos", type: "molotov", at: 48.0, to: [884, 214], item: "weapon_incgrenade" },
];
const FLIGHT = 1.2;
const LINGER: Partial<Record<NadeType, number>> = { smoke: 18, molotov: 7 };

const KILLS: { at: number; by: string; victim: string; weapon: string; hs?: boolean }[] = [
  { at: 21.4, by: "vex", victim: "mako", weapon: "awp" },
  { at: 23.0, by: "sable", victim: "vex", weapon: "ak47", hs: true },
  { at: 27.5, by: "juno", victim: "noir", weapon: "ak47" },
  { at: 46.6, by: "halcyon", victim: "rook", weapon: "famas", hs: true },
  { at: 48.2, by: "sable", victim: "ember", weapon: "ak47", hs: true },
  { at: 49.6, by: "kronos", victim: "sable", weapon: "m4a1_silencer" },
  { at: 57.2, by: "juno", victim: "kronos", weapon: "ak47" },
  { at: 58.7, by: "halcyon", victim: "juno", weapon: "famas", hs: true },
];

const HURT: { at: number; victim: string; dmg: number }[] = [
  { at: 24.6, victim: "kronos", dmg: 14 }, { at: 26.2, victim: "kronos", dmg: 21 },
  { at: 46.2, victim: "halcyon", dmg: 38 }, { at: 46.2, victim: "ember", dmg: 24 },
  { at: 49.3, victim: "sable", dmg: 9 }, { at: 22.4, victim: "sable", dmg: 19 },
];

// Extra spells of aiming without a kill, so the aim warning has something to show.
const AIMS: { from: number; to: number; by: string; at: string }[] = [
  { from: 52.0, to: 53.2, by: "juno", at: "kronos" },
];

const byName = new Map(ACTORS.map((a) => [a.name, a]));
const deathOf = new Map(KILLS.map((k) => [k.victim, k]));
const deg = (r: number) => (r * 180) / Math.PI;

function along(route: Pt[], dist: number) {
  for (let i = 1; i < route.length; i++) {
    const [ax, ay] = route[i - 1], [bx, by] = route[i];
    const seg = Math.hypot(bx - ax, by - ay);
    if (dist <= seg) {
      const k = seg ? dist / seg : 0;
      return { p: [ax + (bx - ax) * k, ay + (by - ay) * k] as Pt, dir: Math.atan2(by - ay, bx - ax), done: false };
    }
    dist -= seg;
  }
  const [ax, ay] = route[Math.max(0, route.length - 2)], [bx, by] = route[route.length - 1];
  return { p: [bx, by] as Pt, dir: Math.atan2(by - ay, bx - ax), done: true };
}

function place(a: Actor, t: number): { p: Pt; yaw: number; moving: boolean } {
  let leg = -1;
  for (let i = 0; i < a.legs.length; i++) if (a.legs[i].at <= t) leg = i;
  if (leg < 0) {
    const s = along(ROUTES[a.legs[0].route], 0);
    return { p: s.p, yaw: s.dir, moving: false };
  }
  const L = a.legs[leg];
  const s = along(ROUTES[L.route], (t - L.at) * SPEED);
  if (!s.done) return { p: s.p, yaw: s.dir, moving: true };
  const [lx, ly] = px(...L.look);
  const sway = Math.sin(t * 0.9 + a.name.length) * 0.12;
  return { p: s.p, yaw: Math.atan2(ly - s.p[1], lx - s.p[0]) + sway, moving: false };
}

// Where an actor stands at t; the dead stay where they fell.
function spot(a: Actor, t: number) {
  const death = deathOf.get(a.name);
  return place(a, death && t >= death.at ? death.at : t);
}

const faceTo = (from: Pt, to: Pt) => Math.atan2(to[1] - from[1], to[0] - from[0]);

export function demoFrame(ms: number): RadarData {
  const loop = Math.floor(ms / 1000 / LOOP);
  const t = (ms / 1000) % LOOP;
  const cur = (s: number) => 1200 + loop * LOOP + s;
  const odd = loop % 2 === 1;
  const retake = odd ? 60.6 : 59.6;              // halcyon's no-kit defuse: in time on even rounds
  const end = odd ? BLOW : retake + 10;
  const over = t >= end;

  const players: Player[] = [];
  let local: Player | undefined;

  ACTORS.forEach((a, slot) => {
    const death = deathOf.get(a.name);
    const bombDeath = odd && a.name === "halcyon" && t >= BLOW;
    const alive = !(death && t >= death.at) && !bombDeath;
    const s = spot(a, bombDeath ? BLOW : t);
    let yaw = s.yaw;

    const kill = KILLS.find((k) => k.by === a.name && t >= k.at - 1.5 && t <= k.at + 0.2);
    const aim = AIMS.find((x) => x.by === a.name && t >= x.from && t <= x.to);
    const target = kill ? byName.get(kill.victim) : aim ? byName.get(aim.at) : undefined;
    if (target && alive) yaw = faceTo(s.p, spot(target, t).p);

    const defusing = alive && ((a.name === "kronos" && t >= 54.5 && t < 57.2) || (a.name === "halcyon" && t >= retake && t < end));
    const planting = a.name === "rook" && t >= 27.0 && t < BOMB_AT;
    if (defusing) yaw = faceTo(s.p, ROUTES.t1[ROUTES.t1.length - 1]);

    const thrown = NADES.filter((n) => n.by === a.name && n.at <= t);
    const throwing = NADES.find((n) => n.by === a.name && t >= n.at - 0.7 && t < n.at);
    const items = a.gear.filter((g) => !thrown.some((n) => (n.item ?? NADE_ITEM[n.type]) === g));
    if (a.name === "rook" && t < BOMB_AT) items.push("weapon_c4");

    let hp = 100 - HURT.filter((h) => h.victim === a.name && h.at <= t).reduce((sum, h) => sum + h.dmg, 0);
    if (!alive) hp = 0;

    const shots = KILLS.filter((k) => k.by === a.name).flatMap((k) =>
      k.weapon === "awp" ? [k.at] : [k.at - 0.36, k.at - 0.24, k.at - 0.12, k.at]);
    if (a.name === "sable") shots.push(22.0, 22.12, 22.24);
    if (a.name === "juno") shots.push(52.6, 52.72, 52.84);
    const fired = Math.max(-1, ...shots.filter((x) => x <= t));

    let flash = 0;
    for (const n of NADES) {
      if (n.type !== "flash") continue;
      const pop = n.at + FLIGHT, age = t - pop;
      if (age < 0 || age > 2.5) continue;
      const d = Math.hypot(...(px(...n.to).map((v, i) => v - s.p[i]) as Pt));
      if (d < 700) flash = Math.max(flash, 255 * (1 - d / 700) * (1 - age / 2.5));
    }

    const kills = KILLS.filter((k) => k.by === a.name && k.at <= t).length;
    const scoped = alive && a.gear[0] === "weapon_awp" && !s.moving && !throwing && t >= FREEZE; // AWPs holding an angle
    const p: Player = {
      x: s.p[0], y: s.p[1], z: 0,
      yaw: deg(yaw),
      team: a.team, alive, health: hp, name: a.name, dormant: false, enemy: a.team !== CT,
      armor: alive ? Math.max(0, 100 - Math.round((100 - hp) * 0.6)) : 0, helmet: a.helmet, defuser: a.defuser,
      weapon: !alive ? undefined : planting ? "weapon_c4" : throwing ? (throwing.item ?? NADE_ITEM[throwing.type]) : a.gear[0],
      weapons: alive ? items : [],
      hasBomb: alive && a.name === "rook" && t < BOMB_AT,
      defusing, scoped, flashAlpha: flash, money: a.money, color: a.color,
      kills: a.kda[0] + kills, deaths: a.kda[1] + (alive ? 0 : 1), assists: a.kda[2], mvps: a.name === "kronos" ? 3 : 1,
      ping: a.ping, slot: slot + 1,
      fired: fired >= 0 ? cur(fired) : undefined,
    };
    if (a.name === "kronos") local = p;
    else players.push(p);
  });

  const grenades: Grenade[] = [];
  NADES.forEach((n, i) => {
    if (t < n.at) return;
    const from = spot(byName.get(n.by)!, n.at).p;
    const to = px(...n.to);
    const land = n.at + FLIGHT;
    const id = loop * 100 + i + 1;
    if (t < land) {
      const u = 1 - Math.pow(1 - (t - n.at) / FLIGHT, 1.7);
      grenades.push({ id, type: n.type, x: from[0] + (to[0] - from[0]) * u, y: from[1] + (to[1] - from[1]) * u, z: 0 });
    } else if (LINGER[n.type] && t < land + LINGER[n.type]!) {
      grenades.push({ id, type: n.type, x: to[0], y: to[1], z: 0, active: true, expires: cur(land + LINGER[n.type]!) });
    } else if (!LINGER[n.type] && t < land + 1.5) {
      // an HE or flash going off, reported for a moment as the client does
      grenades.push({ id, type: n.type, x: to[0], y: to[1], z: 0, boom: cur(land) });
    }
  });

  const carrier = spot(byName.get("rook")!, t).p;
  const site = ROUTES.t1[ROUTES.t1.length - 1];
  let bomb: Bomb | undefined;
  if (t < BOMB_AT) bomb = { x: carrier[0], y: carrier[1], z: 0, planted: false };
  else {
    bomb = { x: site[0], y: site[1], z: 0, planted: true, site: "A", blowTime: cur(BLOW), timerLength: BOMB_TIMER };
    if (t >= 54.5 && t < 57.2) { bomb.defuseEnd = cur(59.5); bomb.defuseLength = 5; }
    else if (t >= retake && t < end) { bomb.defuseEnd = cur(retake + 10); bomb.defuseLength = 10; }
    if (over) { if (odd) bomb.exploded = true; else bomb.defused = true; }
  }

  const kills: Kill[] = KILLS.filter((k) => k.at <= t).map((k) => ({ killer: k.by, victim: k.victim, weapon: k.weapon, hs: !!k.hs, t: cur(k.at) }));
  if (odd && t >= BLOW) kills.push({ killer: "", victim: "halcyon", weapon: "planted_c4", hs: false, t: cur(BLOW) });

  const r = loop % 8;
  return {
    status: "live", connected: true, age_ms: 34 + 8 * Math.sin(t * 1.3),
    map: "de_dust2", mode: "competitive",
    localPlayer: local, players, bomb, grenades, kills,
    curtime: cur(t),
    phase: t < FREEZE ? "freezetime" : over ? "over" : "live",
    roundTime: 115, roundStartTime: cur(FREEZE), roundsPlayed: 14 + r,
    ctScore: 7 + Math.ceil(r / 2), tScore: 7 + Math.floor(r / 2),
  };
}
