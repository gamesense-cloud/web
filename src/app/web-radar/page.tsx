"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as I from "../icons";
import { demoFrame } from "./demo";
import {
  BOMB_RADIUS, COMP_COLORS, CT, MAPS, NadeTracker, SHOT_MS, T, Walls,
  drawBomb, drawMap, drawNades, drawPlayer, drawShots, drawViewLine, hpColor, iconSrc, loadout,
  radarToWorld, screenAngle, teamColor, toRadar, toScreen, unitsToPx, weaponName,
  type Box, type Bomb, type MapInfo, type NadeType, type Player, type RadarData, type Shot, type View,
} from "./radar";

type Status = "demo" | "connecting" | "live" | "waiting" | "stale" | "no_session" | "error";

const STATUS: Record<Status, { label: string; tone: string; text: string }> = {
  demo:       { label: "Demo",       tone: "accent", text: "" },
  connecting: { label: "Connecting", tone: "",       text: "Connecting to the session…" },
  live:       { label: "Live",       tone: "ok",     text: "" },
  waiting:    { label: "Waiting",    tone: "warn",   text: "Client connected, waiting for a match to start…" },
  stale:      { label: "Stale",      tone: "warn",   text: "The client stopped sending data. The session may have ended." },
  no_session: { label: "No session", tone: "bad",    text: "No active client session for this link. The client makes a new one each time it starts." },
  error:      { label: "Error",      tone: "bad",    text: "Could not reach the server." },
};

const LOCAL = "__local";
const keyOf = (p: Player, i: number) => (p.slot != null ? `s${p.slot}` : p.name || `p${i}`);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function lerpAngle(a: number | undefined, b: number | undefined, t: number) {
  if (a == null || b == null) return b;
  const d = ((b - a + 540) % 360) - 180;
  return a + d * t;
}

// ------------------------------------------------------------------ prefs

const PREFS = {
  lines:  { label: "View lines",     key: "L", on: true },
  warn:   { label: "Aim warning",    key: "A", on: true },
  names:  { label: "Names & weapons", key: "P", on: true },
  health: { label: "HP rings",       key: "B", on: true },
  radius: { label: "Bomb radius",    key: "R", on: true },
  rotate: { label: "Rotate with view", key: "O", on: false },
} as const;
type Pref = keyof typeof PREFS;
type Prefs = Record<Pref, boolean>;

function loadPrefs(): Prefs {
  const out = {} as Prefs;
  for (const k of Object.keys(PREFS) as Pref[]) {
    let v: string | null = null;
    try { v = localStorage.getItem(`radar:${k}`); } catch { /* private mode */ }
    out[k] = v === null ? PREFS[k].on : v === "1";
  }
  return out;
}

// ------------------------------------------------------------------ helpers

// Where a player's view ray meets a wall: the client's in-game trace when it sends one,
// otherwise a march across the radar image.
function aimEnd(p: Player, map: MapInfo, walls: Walls | null): [number, number] {
  if (p.aim) return [p.aim[0], p.aim[1]];
  const a = (-(p.yaw ?? 0) * Math.PI) / 180;
  const [mx, my] = toRadar(map, p.x, p.y);
  const d = walls ? walls.cast(mx, my, a) : 1500 / map.scale;
  return radarToWorld(map, mx + Math.cos(a) * d, my + Math.sin(a) * d);
}

// The first enemy whose view ray reaches `target` before a wall does.
function aimingAt(target: Player, others: Player[], map: MapInfo, walls: Walls | null) {
  for (const e of others) {
    if (!e.alive || e.dormant || e.yaw == null || e.team === target.team) continue;
    const dx = target.x - e.x, dy = target.y - e.y, dist = Math.hypot(dx, dy);
    if (dist < 1 || dist > 5000) continue;
    const off = Math.abs(((Math.atan2(dy, dx) * 180) / Math.PI - e.yaw + 540) % 360 - 180) * (Math.PI / 180);
    if (off > Math.atan2(36, dist) + 0.015) continue;
    const [ex, ey] = aimEnd(e, map, walls);
    if (Math.hypot(ex - e.x, ey - e.y) + 24 < dist) continue;
    return e;
  }
  return null;
}

const NADE_ICON: Record<NadeType, [string, string]> = { // [T, CT]
  flash: ["flashbang", "flashbang"], smoke: ["smokegrenade", "smokegrenade"], he: ["hegrenade", "hegrenade"],
  molotov: ["molotov", "incgrenade"], decoy: ["decoy", "decoy"],
};

function grow(box: Box | null, x: number, y: number, pad: number): Box {
  return box
    ? [Math.min(box[0], x - pad), Math.min(box[1], y - pad), Math.max(box[2], x + pad), Math.max(box[3], y + pad)]
    : [x - pad, y - pad, x + pad, y + pad];
}

const clock = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;

// ------------------------------------------------------------------ types

interface Row { key: string; p: Player; local: boolean }
interface Hud {
  map?: MapInfo; mapKey?: string;
  rows: Row[];
  ctScore?: number; tScore?: number;
  phase?: string; round?: number; roundStart?: number; roundTime?: number;
  bomb?: Bomb; age?: number; wingman: boolean;
}
interface FeedItem { id: string; killer: string; victim: string; weapon: string; hs: boolean; kt: number; vt: number; at: number }

// ------------------------------------------------------------------ page

export default function RadarPage() {
  return (
    <Suspense fallback={<div className="flex-1 grid place-items-center text-text-muted">Loading radar…</div>}>
      <Radar />
    </Suspense>
  );
}

function Radar() {
  const session = useSearchParams().get("session");
  const demo = !session;

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dataRef = useRef<RadarData | null>(null);
  const currRef = useRef(new Map<string, Player>());
  // Recent frames, so the map can be drawn a moment in the past and eased
  // between the two frames around that moment, whatever rate they arrive at.
  const snaps = useRef<{ t: number; players: Map<string, Player> }[]>([]);
  const net = useRef({ last: 0, interval: 150 });
  const clockRef = useRef({ server: 0, at: 0 });
  const tracker = useRef(new NadeTracker()).current;
  const shots = useRef<Shot[]>([]);
  const fired = useRef(new Map<string, number>());
  const seenKills = useRef(new Set<string>());
  const round = useRef(-1);
  const wingBox = useRef<{ map: string; box: Box | null }>({ map: "", box: null });
  const defuse = useRef({ end: 0, total: 10 });
  const blastFx = useRef<{ x: number; y: number; t: number } | null>(null);
  const mapImg = useRef<{ src: string; img: HTMLImageElement | null; walls: Walls | null }>({ src: "", img: null, walls: null });
  const rendered = useRef<{ key: string; x: number; y: number }[]>([]);
  const zoom = useRef(2.4);
  const lastLevel = useRef<boolean | null>(null);

  const [status, setStatus] = useState<Status>(demo ? "demo" : "connecting");
  const [hud, setHud] = useState<Hud>({ rows: [], wingman: false });
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [follow, setFollow] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ by: string; at: string; you: boolean } | null>(null);
  const [lower, setLower] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(() => {
    const out = {} as Prefs;
    for (const k of Object.keys(PREFS) as Pref[]) out[k] = PREFS[k].on;
    return out;
  });
  const [help, setHelp] = useState(false);
  const [debug, setDebug] = useState(false);
  const [display, setDisplay] = useState(false);
  const [connect, setConnect] = useState(true);
  const [sessionInput, setSessionInput] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // the render loop and data callbacks read the latest UI state through these
  const live = useRef({ prefs, follow, hover, lower, alertKey: "" });
  live.current.prefs = prefs;
  live.current.follow = follow;
  live.current.hover = hover;
  live.current.lower = lower;
  const hudRef = useRef(hud);
  hudRef.current = hud;

  useEffect(() => setPrefs(loadPrefs()), []);

  const togglePref = useCallback((k: Pref) => {
    setPrefs((p) => {
      const next = { ...p, [k]: !p[k] };
      try { localStorage.setItem(`radar:${k}`, next[k] ? "1" : "0"); } catch { /* private mode */ }
      return next;
    });
  }, []);

  // ---- one frame of data, from the client or the demo
  const ingest = useCallback((data: RadarData) => {
    const now = performance.now();
    if (net.current.last) {
      const gap = Math.min(1000, now - net.current.last);
      net.current.interval += (gap - net.current.interval) * 0.1;
    }
    net.current.last = now;

    const next = new Map<string, Player>();
    if (data.localPlayer) next.set(LOCAL, data.localPlayer);
    data.players?.forEach((p, i) => next.set(keyOf(p, i), p));
    currRef.current = next;
    snaps.current.push({ t: now, players: next });
    while (snaps.current.length > 2 && snaps.current[1].t < now - 1500) snaps.current.shift();
    dataRef.current = data;
    if (data.curtime) clockRef.current = { server: data.curtime, at: now };

    const map = data.map ? MAPS[data.map] : undefined;
    const rounds = data.roundsPlayed ?? -1;
    if (round.current !== rounds) {
      round.current = rounds;
      tracker.reset();
      shots.current = [];
      seenKills.current.clear();
      blastFx.current = null;
      setFeed([]);
    }

    tracker.update(data.grenades ?? [], now, data.curtime);

    // every new shot: muzzle flash plus a tracer to wherever the view line ends
    for (const [k, p] of next) {
      const last = fired.current.get(k);
      fired.current.set(k, p.fired ?? -1);
      if (last == null || p.fired == null || p.fired <= last || !map || !p.alive) continue;
      const [ex, ey] = aimEnd(p, map, mapImg.current.walls);
      shots.current.push({ x: p.x, y: p.y, ex, ey, t: now });
    }
    shots.current = shots.current.filter((s) => now - s.t < SHOT_MS + 600); // they play out after the render delay

    // bomb: remember how long the current defuse takes, and blow it up once
    const bomb = data.bomb;
    if (bomb?.defuseEnd && data.curtime && bomb.defuseEnd !== defuse.current.end) {
      defuse.current = { end: bomb.defuseEnd, total: bomb.defuseEnd - data.curtime > 5.5 ? 10 : 5 };
    }
    if (bomb?.exploded && !blastFx.current) blastFx.current = { x: bomb.x, y: bomb.y, t: now };

    // kill feed
    const fresh: FeedItem[] = [];
    const teamOf = (name: string) => [...next.values()].find((p) => p.name === name)?.team ?? 0;
    for (const k of data.kills ?? []) {
      const id = `${k.killer}|${k.victim}|${k.weapon}|${k.t}`;
      if (seenKills.current.has(id)) continue;
      seenKills.current.add(id);
      fresh.push({ id, killer: k.killer, victim: k.victim, weapon: k.weapon, hs: k.hs, kt: teamOf(k.killer), vt: teamOf(k.victim), at: Date.now() });
    }
    setFeed((f) => {
      const kept = f.filter((x) => Date.now() - x.at < 8000);
      return fresh.length || kept.length !== f.length ? [...kept, ...fresh].slice(-6) : f;
    });

    // wingman: fit the part of the map the match actually uses
    const total = next.size;
    const wingman = data.mode ? data.mode === "wingman" : total > 0 && total <= 4;
    if (map && wingman) {
      if (wingBox.current.map !== data.map) wingBox.current = { map: data.map!, box: map.wingman ?? null };
      for (const p of next.values()) {
        const [mx, my] = toRadar(map, p.x, p.y);
        wingBox.current.box = grow(wingBox.current.box, mx, my, 90);
      }
    }

    // which level to show on two-level maps: wherever the focused player is
    const focus = next.get(live.current.follow ?? LOCAL) ?? data.localPlayer;
    if (map?.lower && focus) {
      const below = focus.z < map.lower.below;
      if (lastLevel.current !== below) { lastLevel.current = below; setLower(below); }
    }

    // aim warning for the focused player
    const targetKey = live.current.follow ?? LOCAL;
    const target = next.get(targetKey);
    let by: Player | null = null;
    if (map && target?.alive && live.current.prefs.warn)
      by = aimingAt(target, [...next.values()].filter((p) => p !== target), map, mapImg.current.walls);
    live.current.alertKey = by ? [...next].find(([, p]) => p === by)?.[0] ?? "" : "";
    setAlert((a) => {
      if (!by || !target) return a ? null : a;
      const n = { by: by.name, at: target.name, you: targetKey === LOCAL };
      return a && a.by === n.by && a.at === n.at ? a : n;
    });

    setHud({
      map, mapKey: data.map,
      rows: [...next].map(([key, p]) => ({ key, p, local: key === LOCAL })),
      ctScore: data.ctScore, tScore: data.tScore,
      phase: data.phase, round: data.roundsPlayed, roundStart: data.roundStartTime, roundTime: data.roundTime,
      bomb, age: data.age_ms, wingman,
    });
  }, [tracker]);

  // ---- data sources
  useEffect(() => {
    if (!demo) return;
    const start = performance.now();
    const id = setInterval(() => ingest(demoFrame(performance.now() - start)), 100);
    return () => clearInterval(id);
  }, [demo, ingest]);

  useEffect(() => {
    if (demo) return;
    let alive = true;
    (async () => {
      while (alive) {
        try {
          const res = await fetch(`/api/radar/data?session=${encodeURIComponent(session!)}`);
          const data = (await res.json()) as RadarData;
          const s: Status = !res.ok ? "error" : data.status === "no_session" ? "no_session" : data.status === "stale" ? "stale"
            : data.status === "waiting" || !data.connected ? "waiting" : "live";
          if (!alive) break;
          setStatus(s);
          if (s === "live") ingest(data);
          else { dataRef.current = null; currRef.current = new Map(); snaps.current = []; }
        } catch {
          if (alive) setStatus("error");
        }
        await new Promise((r) => setTimeout(r, 200));
      }
    })();
    return () => { alive = false; };
  }, [demo, session, ingest]);

  // ---- radar image and its walls, per map and level
  const src = hud.map ? (lower && hud.map.lower ? hud.map.lower.image : hud.map.image) : "";
  useEffect(() => {
    if (!src || mapImg.current.src === src) return;
    const img = new Image();
    mapImg.current = { src, img: null, walls: null };
    img.onload = () => { if (mapImg.current.src === src) mapImg.current = { src, img, walls: new Walls(img) }; };
    img.src = src;
  }, [src]);

  // ---- render loop
  useEffect(() => {
    let raf = 0, last = performance.now();
    const cam = { cx: 512, cy: 512, scale: 0, rot: 0 };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const stage = stageRef.current, canvas = canvasRef.current;
      if (!stage || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = stage.clientWidth, h = stage.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      }
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const data = dataRef.current;
      const map = data?.map ? MAPS[data.map] : undefined;
      if (!data || !map) { rendered.current = []; return; }
      const { prefs, follow, hover, lower, alertKey } = live.current;

      // Draw the world ~1.5 update intervals in the past and ease players
      // between the two frames either side of that moment.
      const rt = now - Math.min(500, Math.max(60, net.current.interval * 1.5));
      const S = snaps.current;
      let ia = 0;
      for (let i = S.length - 1; i >= 0; i--) if (S[i].t <= rt) { ia = i; break; }
      const A = S[ia], B = S[Math.min(ia + 1, S.length - 1)];
      const f = A && B && B.t > A.t ? Math.min(1, Math.max(0, (rt - A.t) / (B.t - A.t))) : 1;
      const players: [string, Player][] = B ? [...B.players].map(([k, p]) => {
        const q = A.players.get(k);
        if (!q) return [k, p];
        if (!(q.alive && p.alive)) return [k, f < 1 ? q : p];
        return [k, { ...p, x: lerp(q.x, p.x, f), y: lerp(q.y, p.y, f), z: lerp(q.z, p.z, f), yaw: lerpAngle(q.yaw, p.yaw, f) }];
      }) : [];

      // camera: the whole map (or the wingman part), or a followed player
      const wing = hudRef.current.wingman && wingBox.current.map === data.map ? wingBox.current.box : null;
      const fit = wing ?? map.fit;
      const fitScale = Math.min(w / (fit[2] - fit[0]), h / (fit[3] - fit[1])) * 0.95;
      const target = { cx: (fit[0] + fit[2]) / 2, cy: (fit[1] + fit[3]) / 2, scale: fitScale, rot: 0 };
      const followed = follow ? players.find(([k]) => k === follow)?.[1] : undefined;
      if (followed) {
        [target.cx, target.cy] = toRadar(map, followed.x, followed.y);
        target.scale = (Math.min(w, h) / 1024) * zoom.current;
        target.rot = prefs.rotate && followed.yaw != null ? (followed.yaw * Math.PI) / 180 - Math.PI / 2 : 0;
      }
      if (!cam.scale) Object.assign(cam, target);
      const k = 1 - Math.exp(-dt * 9);
      cam.cx += (target.cx - cam.cx) * k;
      cam.cy += (target.cy - cam.cy) * k;
      cam.scale *= Math.pow(target.scale / cam.scale, k);
      cam.rot += Math.atan2(Math.sin(target.rot - cam.rot), Math.cos(target.rot - cam.rot)) * k;
      const v: View = { map, scale: cam.scale, rot: cam.rot, cx: cam.cx, cy: cam.cy, sx: w / 2, sy: h / 2 };

      const img = mapImg.current.img;
      if (img) drawMap(ctx, v, img, wing ? [wing[0] - 40, wing[1] - 40, wing[2] + 40, wing[3] + 40] : undefined);

      const levelAlpha = (z: number) => (!map.lower ? 1 : (z < map.lower.below) === lower ? 1 : 0.28);
      drawNades(ctx, v, tracker, rt, levelAlpha);

      if (prefs.lines) {
        for (const [key, p] of players) {
          if (!p.alive || p.dormant || p.yaw == null) continue;
          const [x, y] = toScreen(v, p.x, p.y);
          const [ex, ey] = aimEnd(p, map, mapImg.current.walls);
          const [x2, y2] = toScreen(v, ex, ey);
          ctx.globalAlpha = levelAlpha(p.z);
          drawViewLine(ctx, x, y, x2, y2, teamColor(p.team), prefs.warn && key === alertKey);
          ctx.globalAlpha = 1;
        }
      }

      const bomb = data.bomb;
      if (bomb && !bomb.exploded) {
        const cur = clockRef.current.server + (now - clockRef.current.at) / 1000;
        const remaining = bomb.planted && bomb.blowTime ? Math.max(0, bomb.blowTime - cur) : undefined;
        const defuseLeft = bomb.defuseEnd && bomb.defuseEnd > cur ? bomb.defuseEnd - cur : undefined;
        ctx.globalAlpha = levelAlpha(bomb.z);
        drawBomb(ctx, v, bomb, {
          remaining, total: bomb.timerLength || 40, defuseLeft, defuseTotal: defuse.current.total, now, radius: prefs.radius,
        });
        ctx.globalAlpha = 1;
      }
      const fx = blastFx.current;
      if (fx && now - fx.t < 1600) {
        const [x, y] = toScreen(v, fx.x, fx.y);
        const e = (now - fx.t) / 1600;
        const R = unitsToPx(v, (bomb?.radius ?? BOMB_RADIUS) * 0.7) * Math.sqrt(e);
        const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, R));
        g.addColorStop(0, `rgba(255,244,214,${(0.9 * (1 - e)).toFixed(3)})`);
        g.addColorStop(0.5, `rgba(240,138,60,${(0.55 * (1 - e)).toFixed(3)})`);
        g.addColorStop(1, "rgba(224,101,106,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, Math.max(1, R), 0, Math.PI * 2); ctx.fill();
      }

      drawShots(ctx, v, shots.current, rt);

      const order = [...players].sort(([ka, a], [kb, b]) =>
        Number(a.alive) - Number(b.alive) || Number(ka === follow || ka === LOCAL) - Number(kb === follow || kb === LOCAL));
      const hits: { key: string; x: number; y: number }[] = [];
      for (const [key, p] of order) {
        const [x, y] = toScreen(v, p.x, p.y);
        drawPlayer(ctx, {
          p, x, y, angle: p.yaw != null ? screenAngle(v, p.yaw) : undefined,
          local: key === LOCAL, followed: key === follow, hovered: key === hover,
          names: prefs.names, health: prefs.health, alpha: levelAlpha(p.z),
        }, now);
        if (p.alive) hits.push({ key, x, y });
      }
      rendered.current = hits;
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [tracker]);

  // ---- pointer and keys
  const pick = (e: React.MouseEvent) => {
    const r = stageRef.current!.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best: string | null = null, bestD = 16;
    for (const h of rendered.current) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < bestD) { best = h.key; bestD = d; }
    }
    return best;
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      if (!live.current.follow) return;
      e.preventDefault();
      zoom.current = Math.min(7, Math.max(1.2, zoom.current * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      const k = e.key.toLowerCase();
      if (k === "escape") { setFollow(null); setHelp(false); return; }
      if (k === "h" || k === "?") setHelp((v) => !v);
      else if (k === "f") setFollow((f) => (f === LOCAL ? null : currRef.current.has(LOCAL) ? LOCAL : f));
      else if (k === "n") setLower((v) => !v);
      else if (k === "d" && !demo) setDebug((v) => !v);
      else {
        const pref = (Object.keys(PREFS) as Pref[]).find((p) => PREFS[p].key.toLowerCase() === k);
        if (pref) togglePref(pref);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [demo, togglePref]);

  // ---- derived UI state
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  const cur = clockRef.current.server + (now - clockRef.current.at) / 1000;
  const bomb = hud.bomb;
  const planted = !!bomb?.planted;
  const bombLeft = planted && bomb?.blowTime ? Math.max(0, bomb.blowTime - cur) : undefined;
  const defuseLeft = bomb?.defuseEnd && bomb.defuseEnd > cur ? bomb.defuseEnd - cur : undefined;
  const followRow = hud.rows.find((r) => r.key === follow);
  const connectTo = (value: string) => {
    const v = value.trim();
    const id = v.match(/session=([a-f0-9]{16,64})/i)?.[1] ?? (/^[a-f0-9]{16,64}$/i.test(v) ? v : null);
    if (id) window.location.href = `/web-radar?session=${id}`;
  };

  let timer = "", timerTone = "";
  if (hud.phase === "freezetime" && hud.roundStart) { timer = clock(hud.roundStart - cur); timerTone = "text-ok"; }
  else if (planted && bombLeft != null && !bomb?.defused && !bomb?.exploded) { timer = bombLeft.toFixed(1); timerTone = "text-bad"; }
  else if (hud.roundStart != null && hud.roundTime) { const r = hud.roundTime - (cur - hud.roundStart); timer = clock(r); timerTone = r < 30 ? "text-bad" : ""; }

  const st = STATUS[status];

  return (
    <div className="rd" ref={rootRef}>
      <div className="rd-hud">
        <div className="rd-hud-side">
          <b>{hud.map?.name ?? "Web Radar"}</b>
          {hud.round != null && <span className="text-text-faint">Round {hud.round + 1}</span>}
          {hud.wingman && <span className="badge">Wingman</span>}
          {hud.phase === "warmup" && <span className="badge warn">Warmup</span>}
          {hud.phase === "freezetime" && <span className="badge ok">Freeze time</span>}
        </div>
        <div className="rd-score">
          <b style={{ color: teamColor(CT) }}>{hud.ctScore ?? "–"}</b>
          <span className={`rd-timer ${timerTone}`}>{timer || "–:––"}</span>
          <b style={{ color: teamColor(T) }}>{hud.tScore ?? "–"}</b>
        </div>
        <div className="rd-hud-side justify-end">
          <button type="button" className={`badge ${st.tone}`} onClick={() => { if (demo) { setConnect(true); setDisplay(false); } }} title={demo ? "Connect your own session" : undefined}>
            <span className={`dot ${st.tone} ${status === "live" || status === "demo" ? "pulse" : ""}`} />
            {st.label}
            {status === "live" && hud.age != null && <span className="opacity-70">{Math.round(hud.age)}ms</span>}
          </button>
          <button
            type="button" className="btn rd-icon-btn" aria-label="Full screen" title="Full screen"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : rootRef.current?.requestFullscreen())}
          >
            <I.Expand size={14} />
          </button>
          <button type="button" className="btn rd-icon-btn" aria-label="Keyboard shortcuts" onClick={() => setHelp(true)}>?</button>
        </div>
      </div>

      <div className="rd-body">
        <TeamPanel team={CT} rows={hud.rows} score={hud.ctScore} follow={follow} hover={hover} onFollow={setFollow} onHover={setHover} alertAt={alert?.at} />

        <div
          ref={stageRef}
          className={`rd-stage${followRow ? " following" : ""}`}
          onMouseMove={(e) => { const k = pick(e); if (k !== live.current.hover) setHover(k); }}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => { const k = pick(e); if (k) setFollow((f) => (f === k ? null : k)); }}
          style={{ cursor: hover ? "pointer" : "default" }}
        >
          <canvas ref={canvasRef} className="rd-canvas" />

          <div className="rd-top">
            {alert && prefs.warn && (
              <div className="rd-alert" key={`${alert.by}-${alert.at}`}>
                <I.Bolt size={14} />
                <b>{alert.by}</b> is aiming at {alert.you ? "you" : <b>{alert.at}</b>}
              </div>
            )}
            {planted && (
              <div className={`rd-bomb${bomb?.defused ? " ok" : ""}`}>
                {bomb?.defused ? <b>Bomb defused</b> : bomb?.exploded ? <b>Bomb exploded</b> : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <b>Bomb {bomb?.site ?? ""}</b>
                      <span className="font-mono">{bombLeft?.toFixed(1)}s</span>
                      {defuseLeft != null && (
                        <span className={defuseLeft <= (bombLeft ?? 0) ? "text-ok" : "text-bad"}>
                          defusing {defuseLeft.toFixed(1)}s · {defuseLeft <= (bombLeft ?? 0) ? "in time" : "too late"}
                        </span>
                      )}
                    </div>
                    <div className="rd-bomb-bar">
                      <i style={{ width: `${Math.min(100, ((bombLeft ?? 0) / (bomb?.timerLength || 40)) * 100)}%` }} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {feed.length > 0 && (
            <div className="rd-feed">
              {feed.map((k) => (
                <div key={k.id} className="rd-kill">
                  <b style={{ color: teamColor(k.kt) }}>{k.killer || "C4"}</b>
                  {k.weapon && iconSrc(k.weapon) ? <img src={iconSrc(k.weapon)!} alt={weaponName(k.weapon)} /> : <span>{weaponName(k.weapon)}</span>}
                  {k.hs && <span className="text-bad">HS</span>}
                  <b style={{ color: teamColor(k.vt) }}>{k.victim}</b>
                </div>
              ))}
            </div>
          )}

          <div className="rd-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="rd-display">
              {display && (
                <div className="panel rd-tools">
                  {(Object.keys(PREFS) as Pref[]).map((k) => (
                    <label key={k} className={`check${k === "rotate" && !follow ? " opacity-40" : ""}`}>
                      <input type="checkbox" checked={prefs[k]} onChange={() => togglePref(k)} />
                      {PREFS[k].label}
                      <kbd className="kbd push">{PREFS[k].key}</kbd>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" className={`btn${display ? " is-on" : ""}`} onClick={() => { setDisplay(!display); if (!display) setConnect(false); }} aria-expanded={display}>
                  <I.Sliders size={14} />Display
                </button>
                {hud.map?.lower && (
                  <span className="rd-level">
                    <button type="button" className={!lower ? "on" : ""} onClick={() => setLower(false)}>Upper</button>
                    <button type="button" className={lower ? "on" : ""} onClick={() => setLower(true)}>Lower</button>
                  </span>
                )}
              </div>
            </div>
            <div className="rd-follow">
              {followRow ? (
                <button type="button" className="btn" onClick={() => setFollow(null)}>
                  Following <b>{followRow.local ? "you" : followRow.p.name}</b> <span className="text-text-faint">Esc</span>
                </button>
              ) : (
                <span className="text-text-faint">Click a player to follow them</span>
              )}
            </div>
          </div>

          {demo && connect && (
            <form className="panel rd-connect" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); connectTo(sessionInput); }}>
              <div className="flex items-center gap-2">
                <span className="badge accent">Demo</span><b>This is a simulated match</b>
                <button type="button" className="push text-text-faint hover:text-text" aria-label="Hide" onClick={() => setConnect(false)}><I.Close size={12} /></button>
              </div>
              <p>Start a radar from the client (<b>Web</b> in the menu → <b>Start Web Radar</b>), then paste the link or session ID.</p>
              <div className="flex gap-2">
                <input className="field flex-1 font-mono" placeholder="Session link or ID" aria-label="Session link or ID" value={sessionInput} onChange={(e) => setSessionInput(e.target.value)} />
                <button type="submit" className="btn primary">Connect</button>
              </div>
            </form>
          )}

          {!demo && status !== "live" && (
            <div className="rd-overlay" onClick={(e) => e.stopPropagation()}>
              <div className="panel rd-status">
                <div className="panel-head"><span className={`dot ${st.tone} pulse`} />{st.label}</div>
                <div className="p-3.5 flex flex-col gap-3">
                  <p className="m-0 text-text-muted leading-relaxed">{st.text}</p>
                  {(status === "no_session" || status === "error" || status === "stale") && (
                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); connectTo(sessionInput); }}>
                      <input className="field flex-1 font-mono" placeholder="New session link or ID" aria-label="Session link or ID" value={sessionInput} onChange={(e) => setSessionInput(e.target.value)} />
                      <button type="submit" className="btn primary">Connect</button>
                    </form>
                  )}
                  <a href="/web-radar" className="link text-[11px]">Watch the demo instead</a>
                </div>
              </div>
            </div>
          )}

          {debug && (
            <pre className="rd-debug">{JSON.stringify({ status, map: hud.mapKey, age: hud.age, players: hud.rows.length, nades: tracker.tracks.size, scan: dataRef.current?.entityScan, sdk: dataRef.current?.debug }, null, 1)}</pre>
          )}
        </div>

        <TeamPanel team={T} rows={hud.rows} score={hud.tScore} follow={follow} hover={hover} onFollow={setFollow} onHover={setHover} alertAt={alert?.at} />
      </div>

      {help && (
        <div className="rd-overlay rd-help-wrap" onClick={() => setHelp(false)}>
          <div className="panel rd-help" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">Keyboard shortcuts<button type="button" className="push text-text-faint" onClick={() => setHelp(false)}>Esc</button></div>
            <dl className="kv">
              <div><dt>Click a player</dt><dd>Follow them, click again to stop</dd></div>
              <div><dt><kbd className="kbd">F</kbd></dt><dd>Follow yourself</dd></div>
              <div><dt>Wheel</dt><dd>Zoom while following</dd></div>
              {(Object.keys(PREFS) as Pref[]).map((k) => (
                <div key={k}><dt><kbd className="kbd">{PREFS[k].key}</kbd></dt><dd>{PREFS[k].label}</dd></div>
              ))}
              <div><dt><kbd className="kbd">N</kbd></dt><dd>Upper / lower level</dd></div>
              {!demo && <div><dt><kbd className="kbd">D</kbd></dt><dd>Debug info</dd></div>}
              <div><dt><kbd className="kbd">Esc</kbd></dt><dd>Stop following</dd></div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ panels

function TeamPanel({ team, rows, score, follow, hover, onFollow, onHover, alertAt }: {
  team: number; rows: Row[]; score?: number; follow: string | null; hover: string | null;
  onFollow: (k: string | null) => void; onHover: (k: string | null) => void; alertAt?: string;
}) {
  const list = rows.filter((r) => r.p.team === team).sort((a, b) => (a.p.slot ?? 99) - (b.p.slot ?? 99));
  const alive = list.filter((r) => r.p.alive);
  const money = list.reduce((s, r) => s + (r.p.money ?? 0), 0);
  const avg = list.length ? money / list.length : 0;
  const buy = !list.length || !money ? "" : avg >= 4000 ? "Full buy" : avg >= 2000 ? "Force" : "Eco";
  const color = teamColor(team);

  return (
    <aside className="tp" style={{ "--team": color } as React.CSSProperties}>
      <div className="tp-head">
        <span>{team === CT ? "Counter-Terrorists" : "Terrorists"}</span>
        <b>{score ?? ""}</b>
      </div>
      <div className="tp-sub">
        {alive.length}/{list.length} alive{money > 0 && <> · ${money.toLocaleString()}</>}{buy && <> · {buy}</>}
      </div>
      <div className="tp-list">
        {list.map((r) => <PlayerCard key={r.key} row={r} follow={follow} hover={hover} onFollow={onFollow} onHover={onHover} aimed={alertAt === r.p.name} />)}
        {!list.length && <div className="tp-empty">No players yet</div>}
      </div>
    </aside>
  );
}

function PlayerCard({ row, follow, hover, onFollow, onHover, aimed }: {
  row: Row; follow: string | null; hover: string | null;
  onFollow: (k: string | null) => void; onHover: (k: string | null) => void; aimed: boolean;
}) {
  const { key, p, local } = row;
  const gear = loadout(p);
  const hp = Math.max(0, Math.min(100, p.health));
  const side = p.team === CT ? 1 : 0;
  const cls = ["pc", follow === key && "following", hover === key && "hover", !p.alive && "dead", local && "local", aimed && p.alive && "aimed"]
    .filter(Boolean).join(" ");

  return (
    <div
      className={cls}
      role="button"
      tabIndex={0}
      onClick={() => onFollow(follow === key ? null : key)}
      onKeyDown={(e) => { if (e.key === "Enter") onFollow(follow === key ? null : key); }}
      onMouseEnter={() => onHover(key)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="pc-top">
        <span className="dot" style={{ "--c": COMP_COLORS[p.color ?? -1] ?? teamColor(p.team) } as React.CSSProperties} />
        <b className="pc-name">{p.name}</b>
        {local && <span className="badge accent">You</span>}
        {follow === key && <I.Radar size={12} className="text-text" />}
        {p.money != null && <span className="pc-money">${p.money.toLocaleString()}</span>}
      </div>
      {p.alive ? (
        <>
          <div className="pc-hp">
            <div className="pc-bar"><i style={{ width: `${hp}%`, background: hpColor(hp) }} /></div>
            <b>{hp}</b>
            {(p.armor ?? 0) > 0 && (
              <span className="pc-armor" title={p.helmet ? "Kevlar + helmet" : "Kevlar"}>
                <I.Shield size={11} />{p.armor}{p.helmet && "H"}
              </span>
            )}
          </div>
          <div className="pc-gear">
            {gear.guns.map((g) => (
              <span key={g} className={g === gear.held ? "on" : ""} title={weaponName(g)}>
                {iconSrc(g) ? <img src={iconSrc(g)!} alt={weaponName(g)} /> : weaponName(g)}
              </span>
            ))}
            {gear.zeus && <span className={gear.held === "taser" ? "on" : ""}><img src="/weapons/taser.svg" alt="Zeus" /></span>}
            {!gear.full && !gear.guns.length && gear.held && <span className="on">{weaponName(gear.held)}</span>}
          </div>
          {(gear.nades.length > 0 || gear.c4 || p.defuser) && (
            <div className="pc-util">
              {gear.nades.map((n, i) => (
                <img key={`${n}${i}`} className={gear.held && NADE_ICON[n].includes(gear.held) ? "on" : ""} src={`/weapons/${NADE_ICON[n][side]}.svg`} alt={n} title={n} />
              ))}
              {gear.c4 && <img className="c4" src="/weapons/c4.svg" alt="C4" title="Carrying the bomb" />}
              {p.defuser && <img src="/weapons/defuser.svg" alt="Defuse kit" title="Defuse kit" />}
            </div>
          )}
        </>
      ) : (
        <div className="pc-dead">Dead</div>
      )}
      <div className="pc-stats">
        <span>{p.kills ?? 0} / {p.deaths ?? 0} / {p.assists ?? 0}</span>
        {(p.mvps ?? 0) > 0 && <span>★ {p.mvps}</span>}
        {p.ping != null && p.ping > 0 && <span className="push">{p.ping}ms</span>}
      </div>
    </div>
  );
}
