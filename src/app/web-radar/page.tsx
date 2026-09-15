"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const MAPS: Record<string, { x: number; y: number; scale: number; display: string }> = {
  de_dust2:   { x: -2476, y: 3239, scale: 4.4, display: "Dust II" },
  de_mirage:  { x: -3230, y: 1713, scale: 5.0, display: "Mirage" },
  de_inferno: { x: -2087, y: 3870, scale: 4.9, display: "Inferno" },
  de_nuke:    { x: -3453, y: 2887, scale: 7.0, display: "Nuke" },
  de_ancient: { x: -2953, y: 2164, scale: 5.0, display: "Ancient" },
  de_anubis:  { x: -2796, y: 3328, scale: 5.22, display: "Anubis" },
  de_overpass:{ x: -4831, y: 1781, scale: 5.2, display: "Overpass" },
  de_vertigo: { x: -3168, y: 1762, scale: 4.0, display: "Vertigo" },
  de_train:   { x: -2477, y: 2392, scale: 4.7, display: "Train" },
};

// Radar image filenames — served from /maps/
const MAP_IMAGES: Record<string, string> = {
  de_dust2:   "/maps/de_dust2_radar.png",
  de_mirage:  "/maps/de_mirage_radar.png",
  de_inferno: "/maps/de_inferno_radar.png",
  de_nuke:    "/maps/de_nuke_radar.png",
  de_ancient: "/maps/de_ancient_radar.png",
  de_anubis:  "/maps/de_anubis_radar.png",
  de_overpass:"/maps/de_overpass_radar.png",
  de_vertigo: "/maps/de_vertigo_radar.png",
  de_train:   "/maps/de_train_radar.png",
};

const NUKE_Z_SPLIT = -495;
const NUKE_LOWER_IMAGE = "/maps/de_nuke_lower_radar.png";
const VERTIGO_Z_SPLIT = 11700;
const VERTIGO_LOWER_IMAGE = "/maps/de_vertigo_lower_radar.png";

interface Player {
  x: number; y: number; z: number;
  team: number; alive: boolean; health: number;
  name: string; dormant: boolean; enemy: boolean;
  yaw?: number; pitch?: number;
  vx?: number; vy?: number;
  armor?: number; weapon?: string;
  scoped?: boolean; helmet?: boolean; defuser?: boolean; defusing?: boolean;
  hasBomb?: boolean;
  flashAlpha?: number; money?: number;
  color?: number;
  kills?: number; deaths?: number; assists?: number; mvps?: number;
  ping?: number;
  slot?: number;
}

const COMP_COLORS = ["#4a9eff", "#5fc98a", "#e0b04b", "#e08840", "#a086ff"] as const;

interface EntDebug {
  i: number; ct: number; pt: number; h1: string; h2: string; pawn: boolean;
}

interface BombInfo {
  x: number; y: number; z: number; planted: boolean;
  site?: "A" | "B";
  blowTime?: number;
  defuseEnd?: number;
  timerLength?: number;
}

interface GrenadeInfo {
  x: number; y: number; z: number;
  type: "smoke" | "flash" | "he" | "molotov" | "decoy";
}

interface DeathMarker {
  x: number; y: number; z: number;
  team: number; name: string;
  time: number;
}

interface RoundPhase {
  freeze: boolean;
  warmup: boolean;
  bombPlanted: boolean;
  gamePhase: number;
  roundsPlayed: number;
  roundStartTime?: number;
  roundTime?: number;
}

interface ApiResponse {
  status: "live" | "waiting" | "stale" | "no_session" | "error";
  connected: boolean;
  reason?: string;
  age_ms?: number;
  map?: string;
  localPlayer?: Player & { yaw: number };
  players?: Player[];
  bomb?: BombInfo;
  grenades?: GrenadeInfo[];
  curtime?: number;
  tickCount?: number;
  tScore?: number;
  ctScore?: number;
  phase?: string;
  roundTime?: number;
  roundStartTime?: number;
  roundsPlayed?: number;
  debug?: Record<string, unknown>;
  entityScan?: { total: number; null: number; noPawn: number; badPos?: number; noTeam?: number; added: number };
  entDebug?: EntDebug[];
  kills?: { killer: string; victim: string; weapon: string; hs: boolean; t: number }[];
}

type RadarStatus = "connecting" | "no_session" | "stale" | "waiting" | "live" | "error";

const STATUS_CONFIG: Record<RadarStatus, { label: string; color: string }> = {
  connecting: { label: "CONNECTING", color: "#808080" },
  no_session: { label: "NO SESSION", color: "#e0656a" },
  stale:      { label: "STALE",      color: "#e0b04b" },
  waiting:    { label: "WAITING",    color: "#e0b04b" },
  live:       { label: "LIVE",       color: "#5fc98a" },
  error:      { label: "ERROR",      color: "#e0656a" },
};

function worldToCanvas(
  wx: number, wy: number,
  mapInfo: { x: number; y: number; scale: number },
  size: number, ox: number, oy: number
) {
  return {
    x: ox + (wx - mapInfo.x) / (mapInfo.scale * 1024) * size,
    y: oy + (mapInfo.y - wy) / (mapInfo.scale * 1024) * size,
  };
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

const WEAPON_DISPLAY: Record<string, string> = {
  ak47: "AK-47", m4a1: "M4A1-S", m4a1_silencer: "M4A1-S", m4a1_silencer_off: "M4A4",
  awp: "AWP", deagle: "Deagle", glock: "Glock", usp_silencer: "USP-S",
  famas: "FAMAS", galil: "Galil", aug: "AUG", sg556: "SG 553",
  ssg08: "Scout", scar20: "SCAR-20", g3sg1: "G3SG1",
  mp9: "MP9", mac10: "MAC-10", mp7: "MP7", mp5sd: "MP5-SD", ump45: "UMP-45", p90: "P90",
  nova: "Nova", xm1014: "XM1014", mag7: "MAG-7", sawedoff: "Sawed-Off", negev: "Negev", m249: "M249",
  hkp2000: "P2000", elite: "Dualies", p250: "P250", fiveseven: "Five-Seven", tec9: "Tec-9", cz75a: "CZ75",
  revolver: "R8", knife: "Knife", knife_t: "Knife", bayonet: "Knife",
  c4: "C4", hegrenade: "HE", flashbang: "Flash", smokegrenade: "Smoke",
  molotov: "Molotov", incgrenade: "Incendiary", decoy: "Decoy",
  taser: "Zeus",
};

function weaponDisplayName(raw: string): string {
  if (!raw) return "";
  const key = raw.replace(/^weapon_/, "").toLowerCase();
  return WEAPON_DISPLAY[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function weaponColor(raw: string): string {
  if (!raw) return "#666";
  const key = raw.replace(/^weapon_/, "").toLowerCase();
  if (key === "awp" || key === "ssg08" || key === "scar20" || key === "g3sg1") return "#e0656a99";
  if (key.includes("knife") || key === "bayonet") return "#e0b04b88";
  if (key === "c4") return "#e0b04bcc";
  if (["hegrenade", "flashbang", "smokegrenade", "molotov", "incgrenade", "decoy"].includes(key)) return "#5fc98a88";
  if (key === "taser") return "#4a9eff88";
  return "#88888899";
}

function loadPref(key: string, fallback: boolean): boolean {
  try { const v = localStorage.getItem(`radar:${key}`); return v === null ? fallback : v === "1"; } catch { return fallback; }
}
function savePref(key: string, val: boolean) {
  try { localStorage.setItem(`radar:${key}`, val ? "1" : "0"); } catch { /* noop */ }
}

function RadarCanvas() {
  const params = useSearchParams();
  const session = params.get("session");
  const [sessionInput, setSessionInput] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameDataRef = useRef<ApiResponse | null>(null);
  const prevPosRef = useRef<Record<string, Player>>({});
  const currPosRef = useRef<Record<string, Player>>({});
  const lastUpdateRef = useRef(0);
  const zoomRef = useRef(1.0);
  const panRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0 });
  const pollCountRef = useRef(0);
  const mapImgRef = useRef<HTMLImageElement | null>(null);
  const mapImgNameRef = useRef<string>("");
  const touchRef = useRef<{ id1: number; id2: number; dist: number; cx: number; cy: number }>({ id1: -1, id2: -1, dist: 0, cx: 0, cy: 0 });
  const [showDebug, setShowDebug] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLower, setShowLower] = useState(false);
  const [showNames, setShowNames] = useState(() => loadPref("names", true));
  const showNamesRef = useRef(loadPref("names", true));
  const [showHealth, setShowHealth] = useState(() => loadPref("health", true));
  const showHealthRef = useRef(loadPref("health", true));
  const showLowerRef = useRef(false);
  const nukeLowerImgRef = useRef<HTMLImageElement | null>(null);
  const [zoomDisplay, setZoomDisplay] = useState(100);
  const [followMode, setFollowMode] = useState(false);
  const followRef = useRef(false);
  const [flashOverlay, setFlashOverlay] = useState(0);
  const killFeedRef = useRef<{ killer: string; victim: string; weapon: string; headshot: boolean; killerTeam: number; victimTeam: number; time: number; gameTime?: number }[]>([]);
  const [killFeed, setKillFeed] = useState<{ killer: string; victim: string; weapon: string; headshot: boolean; killerTeam: number; victimTeam: number; time: number; gameTime?: number }[]>([]);
  const prevAliveRef = useRef<Record<string, boolean>>({});
  const deathsRef = useRef<DeathMarker[]>([]);
  const trailsRef = useRef<Record<string, { x: number; y: number; t: number }[]>>({});
  const mouseRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 });
  const renderedPlayersRef = useRef<{ sx: number; sy: number; player: Player; isLocal: boolean }[]>([]);
  const [hoveredPlayer, setHoveredPlayer] = useState<{ player: Player; isLocal: boolean; sx: number; sy: number } | null>(null);
  const lastReceiveRef = useRef(0);
  const serverCurtimeRef = useRef(0);
  const dataAgeRef = useRef(0);
  const latencyEmaRef = useRef(0);
  const prevRoundsRef = useRef(-1);
  const [clockTick, setClockTick] = useState(0);
  const [showVelocity, setShowVelocity] = useState(() => loadPref("velocity", true));
  const showVelocityRef = useRef(loadPref("velocity", true));

  const [hud, setHud] = useState<{
    status: RadarStatus; map: string; mapDisplay: string; ct: number; t: number;
    ctScore?: number; tScore?: number;
    ctAlive: number; tAlive: number;
    reason?: string; age?: number; pollCount: number;
    curtime?: number; tickCount?: number;
    roundPhase?: RoundPhase;
    debug?: Record<string, unknown>;
    entityScan?: { total: number; null: number; noPawn: number; badPos?: number; noTeam?: number; added: number };
    entDebug?: EntDebug[];
    players?: Player[];
    localPlayer?: Player;
    bomb?: BombInfo;
    grenades?: GrenadeInfo[];
  }>({
    status: "connecting", map: "---", mapDisplay: "---", ct: 0, t: 0, ctAlive: 0, tAlive: 0, pollCount: 0,
  });

  useEffect(() => { showLowerRef.current = showLower; }, [showLower]);
  useEffect(() => { followRef.current = followMode; }, [followMode]);

  const getInterpolated = useCallback((key: string, current: Player): Player => {
    const prev = prevPosRef.current[key];
    if (!prev) return current;
    const elapsed = performance.now() - lastUpdateRef.current;
    const t = Math.min(elapsed / 200, 1);
    return {
      ...current,
      x: lerp(prev.x, current.x, t),
      y: lerp(prev.y, current.y, t),
    };
  }, []);

  // Fetch loop
  useEffect(() => {
    if (!session) return;
    let alive = true;

    async function poll() {
      while (alive) {
        pollCountRef.current++;
        const n = pollCountRef.current;

        try {
          const res = await fetch(`/api/radar/data?session=${session}`);
          const raw = await res.json();
          const data = raw as ApiResponse;

          // Debug log every response (throttled after first 10)
          if (n <= 10 || n % 25 === 0) {
            console.log(
              `[radar] poll #${n} status=${data.status} connected=${data.connected} map=${data.map ?? "none"} players=${data.players?.length ?? 0} age=${data.age_ms ?? "?"}ms`,
              data.reason ? `reason=${data.reason}` : "",
              data.debug ? `debug=${JSON.stringify(data.debug)}` : ""
            );
          }

          // Determine radar status from API response
          let radarStatus: RadarStatus;
          if (!res.ok) {
            radarStatus = "error";
          } else if (data.status === "no_session") {
            radarStatus = "no_session";
          } else if (data.status === "stale") {
            radarStatus = "stale";
          } else if (data.status === "waiting" || !data.connected) {
            radarStatus = "waiting";
          } else {
            radarStatus = "live";
          }

          // Only store game data for rendering when actually live
          if (radarStatus === "live") {
            prevPosRef.current = currPosRef.current;
            const next: Record<string, Player> = {};
            if (data.localPlayer) next["__local"] = data.localPlayer;
            if (data.players) {
              for (let i = 0; i < data.players.length; i++) {
                const p: Player = data.players[i];
                const key = p.slot != null ? `s${p.slot}` : (p.name || `p${i}`);
                next[key] = p;
              }
            }
            currPosRef.current = next;
            gameDataRef.current = data;
            lastUpdateRef.current = performance.now();
            lastReceiveRef.current = performance.now();
            if (data.curtime) serverCurtimeRef.current = data.curtime;
            if (data.age_ms != null) {
              const alpha = latencyEmaRef.current === 0 ? 1.0 : 0.3;
              latencyEmaRef.current = latencyEmaRef.current * (1 - alpha) + data.age_ms * alpha;
            }

            // Round reset: clear death markers and kill feed on new round
            const rp = data.roundsPlayed ?? -1;
            if (prevRoundsRef.current >= 0 && rp !== prevRoundsRef.current) {
              deathsRef.current = [];
              killFeedRef.current = [];
              setKillFeed([]);
              trailsRef.current = {};
              prevAliveRef.current = {};
            }
            prevRoundsRef.current = rp;
          } else {
            gameDataRef.current = null;
            currPosRef.current = {};
            prevPosRef.current = {};
          }

          // Count alive players
          let ctAlive = 0, tAlive = 0;
          if (radarStatus === "live") {
            if (data.localPlayer?.alive !== false) {
              if (data.localPlayer?.team === 3) ctAlive++;
              else if (data.localPlayer?.team === 2) tAlive++;
            }
            data.players?.forEach(p => {
              if (p.alive) {
                if (p.team === 3) ctAlive++;
                else if (p.team === 2) tAlive++;
              }
            });
          }
          const ctScore = data.ctScore as number | undefined;
          const tScore = data.tScore as number | undefined;

          // Track kills — prefer DLL kill feed (killer→victim pairs), fallback to alive→dead transitions
          if (radarStatus === "live" && data.players) {
            const now = Date.now();

            // Build name→team map from current player data
            const teamByName: Record<string, number> = {};
            if (data.localPlayer) teamByName[data.localPlayer.name || "local"] = data.localPlayer.team;
            for (const p of data.players) if (p.name) teamByName[p.name] = p.team;

            // Use DLL kill feed if present
            if (data.kills && Array.isArray(data.kills) && data.kills.length > 0) {
              type KillEntry = { killer: string; victim: string; weapon: string; hs: boolean; t: number };
              const dllKills = data.kills as KillEntry[];
              const existing = new Set(killFeedRef.current.map(k => `${k.killer}-${k.victim}-${k.weapon}-${k.gameTime ?? 0}`));
              const newEntries = dllKills
                .filter(k => !existing.has(`${k.killer}-${k.victim}-${k.weapon}-${k.t}`))
                .map(k => ({
                  killer: k.killer, victim: k.victim, weapon: k.weapon, headshot: k.hs,
                  killerTeam: teamByName[k.killer] ?? 0, victimTeam: teamByName[k.victim] ?? 0,
                  time: now, gameTime: k.t,
                }));
              if (newEntries.length > 0) {
                const feed = [...killFeedRef.current, ...newEntries].slice(-8);
                killFeedRef.current = feed;
                setKillFeed([...feed]);
              }
            }

            // Track death markers from alive→dead transitions
            for (const p of data.players) {
              const key = p.name || "?";
              const wasAlive = prevAliveRef.current[key];
              if (wasAlive === true && !p.alive) {
                deathsRef.current.push({ x: p.x, y: p.y, z: p.z, team: p.team, name: key, time: now });
              }
              prevAliveRef.current[key] = p.alive;
            }

            // Expire old kill feed entries (8s) and death markers (12s)
            const cutoff = now - 8000;
            if (killFeedRef.current.length > 0 && killFeedRef.current[0].time < cutoff) {
              killFeedRef.current = killFeedRef.current.filter(k => k.time >= cutoff);
              setKillFeed([...killFeedRef.current]);
            }
            const deathCutoff = now - 12000;
            deathsRef.current = deathsRef.current.filter(d => d.time >= deathCutoff);
          }

          // Auto level detection for multi-level maps (Nuke/Vertigo)
          if (radarStatus === "live" && data.localPlayer) {
            if (data.map === "de_nuke") {
              const onLower = data.localPlayer.z < NUKE_Z_SPLIT;
              if (onLower !== showLowerRef.current) setShowLower(onLower);
            } else if (data.map === "de_vertigo") {
              const onLower = data.localPlayer.z < VERTIGO_Z_SPLIT;
              if (onLower !== showLowerRef.current) setShowLower(onLower);
            }
          }

          // Flash overlay for local player
          if (radarStatus === "live" && data.localPlayer?.flashAlpha && data.localPlayer.flashAlpha > 20) {
            setFlashOverlay(Math.min(data.localPlayer.flashAlpha / 255, 0.9));
          } else {
            setFlashOverlay(0);
          }

          // Store player trails and clean up dead/disconnected
          if (radarStatus === "live") {
            const now = performance.now();
            const trails = trailsRef.current;
            const activeKeys = new Set<string>();
            if (data.localPlayer && data.localPlayer.alive !== false) {
              const key = "__local";
              activeKeys.add(key);
              if (!trails[key]) trails[key] = [];
              trails[key].push({ x: data.localPlayer.x, y: data.localPlayer.y, t: now });
              if (trails[key].length > 20) trails[key] = trails[key].slice(-20);
            }
            if (data.players) {
              for (let i = 0; i < data.players.length; i++) {
                const p: Player = data.players[i];
                if (!p.alive) continue;
                const key = p.slot != null ? `s${p.slot}` : (p.name || `p${i}`);
                activeKeys.add(key);
                if (!trails[key]) trails[key] = [];
                trails[key].push({ x: p.x, y: p.y, t: now });
                if (trails[key].length > 20) trails[key] = trails[key].slice(-20);
              }
            }
            for (const key of Object.keys(trails)) {
              if (!activeKeys.has(key)) delete trails[key];
            }
          }

          const mapKey = data.map || "";
          const mapMeta = MAPS[mapKey];
          setHud({
            status: radarStatus,
            map: mapKey.toUpperCase() || "---",
            mapDisplay: mapMeta?.display || mapKey || "---",
            ct: ctScore ?? ctAlive, t: tScore ?? tAlive,
            ctScore, tScore,
            ctAlive, tAlive,
            reason: data.reason,
            age: data.age_ms,
            pollCount: n,
            curtime: data.curtime,
            tickCount: data.tickCount,
            roundPhase: data.phase ? {
              freeze: data.phase === "freezetime",
              warmup: data.phase === "warmup",
              bombPlanted: data.bomb?.planted ?? false,
              gamePhase: 0,
              roundsPlayed: data.roundsPlayed ?? 0,
              roundStartTime: data.roundStartTime,
              roundTime: data.roundTime,
            } : undefined,
            debug: data.debug,
            entityScan: data.entityScan,
            entDebug: data.entDebug,
            players: data.players,
            localPlayer: data.localPlayer ?? undefined,
            bomb: data.bomb,
            grenades: data.grenades,
          });
        } catch (e) {
          console.error(`[radar] poll #${n} FETCH ERROR:`, e);
          gameDataRef.current = null;
          setHud(s => ({ ...s, status: "error", pollCount: n }));
        }

        await new Promise(r => setTimeout(r, 200));
      }
    }

    console.log(`[radar] starting poll loop for session=${session}`);
    poll();
    return () => { alive = false; console.log("[radar] poll loop stopped"); };
  }, [session]);

  // Clock tick — drives smooth timer interpolation between data fetches
  useEffect(() => {
    if (hud.status !== "live") return;
    const id = setInterval(() => setClockTick(t => t + 1), 100);
    return () => clearInterval(id);
  }, [hud.status]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void clockTick;
  const interpolatedCurtime = serverCurtimeRef.current > 0 && lastReceiveRef.current > 0
    ? serverCurtimeRef.current + (performance.now() - lastReceiveRef.current) / 1000
    : hud.curtime;

  // Canvas resize — track the container, not the window
  useEffect(() => {
    const container = containerRef.current;
    const c = canvasRef.current;
    if (!container || !c) return;
    function resize() {
      if (!container || !c) return;
      c.width = container.clientWidth;
      c.height = container.clientHeight;
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Keyboard events
  useEffect(() => {
    function onDown(e: KeyboardEvent) {
      if (e.key === "d" || e.key === "D") setShowDebug(v => !v);
      if (e.key === "n" || e.key === "N") setShowLower(v => !v);
      if (e.key === "f" || e.key === "F") setFollowMode(v => !v);
      if (e.key === "?" || e.key === "h" || e.key === "H") setShowHelp(v => !v);
      if (e.key === "p" || e.key === "P") setShowNames(v => { const n = !v; showNamesRef.current = n; savePref("names", n); return n; });
      if (e.key === "b" || e.key === "B") setShowHealth(v => { const n = !v; showHealthRef.current = n; savePref("health", n); return n; });
      if (e.key === "v" || e.key === "V") setShowVelocity(v => { const n = !v; showVelocityRef.current = n; savePref("velocity", n); return n; });
      if (e.key === "r" || e.key === "R") { zoomRef.current = 1.0; panRef.current = { x: 0, y: 0 }; setZoomDisplay(100); }
      if (e.key === "Tab") { e.preventDefault(); setShowScoreboard(true); }
    }
    function onUp(e: KeyboardEvent) {
      if (e.key === "Tab") setShowScoreboard(false);
    }
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, []);

  // Mouse events (zoom, pan)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const old = zoomRef.current;
      if (e.deltaY < 0) zoomRef.current = Math.min(zoomRef.current * 1.15, 4.0);
      else zoomRef.current = Math.max(zoomRef.current / 1.15, 0.4);
      const rect = c!.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      panRef.current.x = mx - (mx - panRef.current.x) * (zoomRef.current / old);
      panRef.current.y = my - (my - panRef.current.y) * (zoomRef.current / old);
      setZoomDisplay(Math.round(zoomRef.current * 100));
    }

    function onDown(e: MouseEvent) {
      if (e.button === 0 || e.button === 1) {
        e.preventDefault();
        dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
      }
    }
    function onMove(e: MouseEvent) {
      const rect = c!.getBoundingClientRect();
      const rx = e.clientX - rect.left, ry = e.clientY - rect.top;
      mouseRef.current = { x: rx, y: ry };
      if (dragRef.current.active) {
        panRef.current.x = dragRef.current.panX + (e.clientX - dragRef.current.startX);
        panRef.current.y = dragRef.current.panY + (e.clientY - dragRef.current.startY);
      }
      if (!dragRef.current.active) {
        const rps = renderedPlayersRef.current;
        let closest: typeof rps[0] | null = null;
        let bestDist = 16;
        for (const rp of rps) {
          const dx = rx - rp.sx, dy = ry - rp.sy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < bestDist) { bestDist = d; closest = rp; }
        }
        setHoveredPlayer(closest ? { player: closest.player, isLocal: closest.isLocal, sx: closest.sx, sy: closest.sy } : null);
      }
    }
    function onUp() { dragRef.current.active = false; }
    function onDbl() { zoomRef.current = 1.0; panRef.current = { x: 0, y: 0 }; setZoomDisplay(100); }

    function touchDist(t: TouchList) {
      const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        e.preventDefault();
        dragRef.current = { active: true, startX: e.touches[0].clientX, startY: e.touches[0].clientY, panX: panRef.current.x, panY: panRef.current.y };
      } else if (e.touches.length === 2) {
        e.preventDefault();
        touchRef.current = {
          id1: e.touches[0].identifier, id2: e.touches[1].identifier,
          dist: touchDist(e.touches),
          cx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          cy: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 1 && dragRef.current.active) {
        panRef.current.x = dragRef.current.panX + (e.touches[0].clientX - dragRef.current.startX);
        panRef.current.y = dragRef.current.panY + (e.touches[0].clientY - dragRef.current.startY);
      } else if (e.touches.length === 2 && touchRef.current.id1 >= 0) {
        e.preventDefault();
        const newDist = touchDist(e.touches);
        const scale = newDist / touchRef.current.dist;
        const old = zoomRef.current;
        zoomRef.current = Math.min(Math.max(old * scale, 0.4), 4.0);
        setZoomDisplay(Math.round(zoomRef.current * 100));
        touchRef.current.dist = newDist;
        const rect = c!.getBoundingClientRect();
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        panRef.current.x = mx - (mx - panRef.current.x) * (zoomRef.current / old);
        panRef.current.y = my - (my - panRef.current.y) * (zoomRef.current / old);
      }
    }
    function onTouchEnd() {
      dragRef.current.active = false;
      touchRef.current.id1 = -1;
    }

    c.addEventListener("wheel", onWheel, { passive: false });
    c.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    c.addEventListener("dblclick", onDbl);
    c.addEventListener("touchstart", onTouchStart, { passive: false });
    c.addEventListener("touchmove", onTouchMove, { passive: false });
    c.addEventListener("touchend", onTouchEnd);
    return () => {
      c.removeEventListener("wheel", onWheel);
      c.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      c.removeEventListener("dblclick", onDbl);
      c.removeEventListener("touchstart", onTouchStart);
      c.removeEventListener("touchmove", onTouchMove);
      c.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // Render loop
  useEffect(() => {
    let rafId = 0;

    function drawGrid(ctx: CanvasRenderingContext2D, ox: number, oy: number, size: number) {
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      const step = size / 16;
      for (let i = 0; i <= 16; i++) {
        const p = i * step;
        ctx.beginPath(); ctx.moveTo(ox + p, oy); ctx.lineTo(ox + p, oy + size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ox, oy + p); ctx.lineTo(ox + size, oy + p); ctx.stroke();
      }
    }

    function drawViewCone(ctx: CanvasRenderingContext2D, cx: number, cy: number, yaw: number, color: string, isLocal: boolean) {
      const angle = -yaw * Math.PI / 180;
      const half = (isLocal ? 30 : 25) * Math.PI / 180;
      const len = isLocal ? 35 : 25;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle - half) * len, cy + Math.sin(angle - half) * len);
      ctx.arc(cx, cy, len, angle - half, angle + half);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    function drawHealthArc(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, health: number, color: string) {
      if (health <= 0) return;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + (health / 100) * Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    function drawPlayer(
      ctx: CanvasRenderingContext2D,
      pos: { x: number; y: number },
      isLocal: boolean, isEnemy: boolean, isDormant: boolean,
      isAlive: boolean, health: number, name: string, yaw?: number,
      weapon?: string, scoped?: boolean, defusing?: boolean, armor?: number,
      flashAlpha?: number, money?: number, compColor?: number,
      vx?: number, vy?: number, pxPerUnit?: number
    ) {
      const teamColor = (compColor != null && compColor >= 0 && compColor < COMP_COLORS.length)
        ? COMP_COLORS[compColor]
        : (isEnemy ? "#e0656a" : "#4a9eff");
      const color = isLocal ? "#8e6ff7" : teamColor;
      const nameColor = isLocal ? "#a086ff" : isEnemy ? "#e0656a" : "#dcdcdc";

      if (!isAlive) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.moveTo(pos.x - 4, pos.y - 4); ctx.lineTo(pos.x + 4, pos.y + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pos.x + 4, pos.y - 4); ctx.lineTo(pos.x - 4, pos.y + 4); ctx.stroke();
        ctx.globalAlpha = 1;
        return;
      }

      if (isDormant) {
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
        ctx.strokeStyle = color + "66"; ctx.lineWidth = 1; ctx.stroke();
        ctx.font = "8px Tahoma, sans-serif"; ctx.fillStyle = "#55555588";
        ctx.fillText("?", pos.x + 7, pos.y + 3);
        return;
      }

      if (yaw != null) {
        const coneColor = isLocal ? "rgba(142,111,247,0.15)"
          : isEnemy ? "rgba(224,101,106,0.12)"
          : "rgba(74,158,255,0.10)";
        drawViewCone(ctx, pos.x, pos.y, yaw, coneColor, isLocal);
      }

      const r = isLocal ? 7 : 5;
      if (isLocal) {
        const pulse = 0.3 + 0.7 * Math.abs(Math.sin(performance.now() / 600));
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(142,111,247,${(pulse * 0.25).toFixed(2)})`;
        ctx.lineWidth = 1.5; ctx.stroke();
      }

      // Scoped ring indicator
      if (scoped) {
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = isEnemy ? "rgba(224,101,106,0.5)" : "rgba(74,158,255,0.5)";
        ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
      }

      // Defusing pulse
      if (defusing) {
        const dp = 0.5 + 0.5 * Math.sin(performance.now() / 200);
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r + 8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(95,201,138,${(dp * 0.6).toFixed(2)})`;
        ctx.lineWidth = 2; ctx.stroke();
      }

      ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1; ctx.stroke();

      if (flashAlpha && flashAlpha > 10) {
        const fa = Math.min(flashAlpha / 255, 1.0);
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r + 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${(fa * 0.6).toFixed(2)})`;
        ctx.fill();
      }

      const hpColor = health > 60 ? "#5fc98a" : health > 25 ? "#e0b04b" : "#e0656a";
      if (showHealthRef.current) {
        drawHealthArc(ctx, pos.x, pos.y, r + 3, health || 100, hpColor);
      }

      // Velocity arrow — shows movement direction
      if (showVelocityRef.current && vx != null && vy != null && pxPerUnit) {
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > 15) {
          const velLen = Math.min(speed * pxPerUnit * 0.06, 20);
          const angle = Math.atan2(-vy, vx);
          const endX = pos.x + Math.cos(angle) * (r + velLen);
          const endY = pos.y + Math.sin(angle) * (r + velLen);
          ctx.beginPath();
          ctx.moveTo(pos.x + Math.cos(angle) * (r + 2), pos.y + Math.sin(angle) * (r + 2));
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = color + "88";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          const arrowSize = 3;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - arrowSize * Math.cos(angle - 0.5), endY - arrowSize * Math.sin(angle - 0.5));
          ctx.lineTo(endX - arrowSize * Math.cos(angle + 0.5), endY - arrowSize * Math.sin(angle + 0.5));
          ctx.closePath();
          ctx.fillStyle = color + "88";
          ctx.fill();
        }
      }

      // Armor arc (inner, blue)
      if (armor && armor > 0) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 1, -Math.PI / 2, -Math.PI / 2 + (armor / 100) * Math.PI * 2);
        ctx.strokeStyle = "rgba(74,158,255,0.3)"; ctx.lineWidth = 1.5; ctx.stroke();
      }

      if (showNamesRef.current) {
        let textY = pos.y + 3;
        if (name) {
          ctx.font = "10px Tahoma, Verdana, sans-serif";
          ctx.fillStyle = nameColor;
          ctx.fillText(name, pos.x + r + 5, textY);
          textY += 10;
        }
        if (weapon) {
          const wc = weaponColor(weapon);
          ctx.font = "8px Tahoma, sans-serif";
          ctx.fillStyle = wc;
          ctx.fillText(weaponDisplayName(weapon), pos.x + r + 5, textY);
          textY += 9;
        }
        if (health > 0 && health < 50) {
          ctx.font = "bold 8px Tahoma, sans-serif";
          ctx.fillStyle = hpColor;
          ctx.fillText(`${health}hp`, pos.x + r + 5, textY);
        }
      }
    }

    const GRENADE_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
      smoke: { fill: "rgba(180,180,180,0.6)", stroke: "#aaa", label: "S" },
      flash: { fill: "rgba(255,255,200,0.7)", stroke: "#ff0", label: "F" },
      he:    { fill: "rgba(224,101,106,0.7)", stroke: "#e06", label: "H" },
      molotov: { fill: "rgba(255,140,40,0.7)", stroke: "#f80", label: "M" },
      decoy: { fill: "rgba(100,160,100,0.5)", stroke: "#6a6", label: "D" },
    };

    function drawGrenade(
      ctx: CanvasRenderingContext2D,
      pos: { x: number; y: number },
      type: string,
      pxPerUnit?: number
    ) {
      const gc = GRENADE_COLORS[type] || GRENADE_COLORS.he;
      const r = 4;
      const t = performance.now();

      if (type === "smoke" && pxPerUnit) {
        const smokeR = 144 * pxPerUnit;
        const pulse = 0.4 + 0.3 * Math.sin(t / 800);
        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, smokeR);
        grad.addColorStop(0, `rgba(200,200,200,${(pulse * 0.18).toFixed(3)})`);
        grad.addColorStop(0.5, `rgba(180,180,180,${(pulse * 0.12).toFixed(3)})`);
        grad.addColorStop(0.85, `rgba(160,160,160,${(pulse * 0.06).toFixed(3)})`);
        grad.addColorStop(1, "rgba(140,140,140,0)");
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, smokeR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = `rgba(180,180,180,${(pulse * 0.15).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (type === "molotov" && pxPerUnit) {
        const fireR = 120 * pxPerUnit;
        const flicker = 0.5 + 0.3 * Math.sin(t / 200) + 0.2 * Math.sin(t / 137);
        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, fireR);
        grad.addColorStop(0, `rgba(255,100,20,${(flicker * 0.2).toFixed(3)})`);
        grad.addColorStop(0.4, `rgba(255,140,40,${(flicker * 0.14).toFixed(3)})`);
        grad.addColorStop(0.8, `rgba(255,80,20,${(flicker * 0.06).toFixed(3)})`);
        grad.addColorStop(1, "rgba(200,60,10,0)");
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, fireR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = `rgba(255,120,30,${(flicker * 0.2).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = gc.fill;
      ctx.fill();
      ctx.strokeStyle = gc.stroke;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = "bold 7px Tahoma, sans-serif";
      ctx.fillStyle = gc.stroke;
      ctx.fillText(gc.label, pos.x + r + 2, pos.y + 3);
    }

    function drawBomb(
      ctx: CanvasRenderingContext2D,
      pos: { x: number; y: number },
      planted: boolean,
      site?: string,
      timerFrac?: number,
      defusing?: boolean
    ) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / (planted ? 300 : 1000));
      const r = planted ? 7 : 5;

      if (planted) {
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(224,60,60,${(pulse * 0.4).toFixed(2)})`;
        ctx.lineWidth = 2; ctx.stroke();

        // Timer arc — shows remaining time as a depleting ring
        if (timerFrac != null && timerFrac > 0 && timerFrac <= 1) {
          const timerR = r + 10;
          const startAngle = -Math.PI / 2;
          const endAngle = startAngle + timerFrac * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, timerR, startAngle, endAngle);
          ctx.strokeStyle = defusing ? "rgba(95,201,138,0.6)" : (timerFrac < 0.25 ? "rgba(224,60,60,0.7)" : "rgba(224,176,75,0.5)");
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      }

      // Diamond shape
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y - r);
      ctx.lineTo(pos.x + r, pos.y);
      ctx.lineTo(pos.x, pos.y + r);
      ctx.lineTo(pos.x - r, pos.y);
      ctx.closePath();
      ctx.fillStyle = planted ? `rgba(224,60,60,${(0.6 + pulse * 0.4).toFixed(2)})` : "#e0b04b";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1; ctx.stroke();

      ctx.font = "bold 8px Tahoma, sans-serif";
      ctx.fillStyle = planted ? "#e03c3c" : "#e0b04b";
      const bombLabel = planted ? (site ? `BOMB ${site}` : "BOMB") : "C4";
      ctx.fillText(bombLabel, pos.x + r + 4, pos.y + 3);
    }

    function render() {
      rafId = requestAnimationFrame(render);
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;

      const w = c.width, h = c.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#0a0e14";
      ctx.fillRect(0, 0, w, h);

      const radarSize = Math.min(w, h) - 60;
      const baseOx = (w - radarSize) / 2;
      const baseOy = (h - radarSize) / 2;

      ctx.save();
      ctx.translate(baseOx + panRef.current.x, baseOy + panRef.current.y);
      ctx.scale(zoomRef.current, zoomRef.current);

      const data = gameDataRef.current;
      const mapName = data?.map;
      const mapInfo = mapName ? MAPS[mapName] : null;

      // Map background
      ctx.fillStyle = "#0d1117";
      ctx.fillRect(0, 0, radarSize, radarSize);
      ctx.strokeStyle = "#282828";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, radarSize, radarSize);

      drawGrid(ctx, 0, 0, radarSize);

      // Draw radar image background
      const isNuke = mapName === "de_nuke";
      const isVertigo = mapName === "de_vertigo";
      const isMultiLevel = isNuke || isVertigo;
      const nukeLower = showLowerRef.current;
      const zSplit = isNuke ? NUKE_Z_SPLIT : isVertigo ? VERTIGO_Z_SPLIT : 0;
      if (mapName && mapInfo) {
        const lowerImg = isNuke ? NUKE_LOWER_IMAGE : isVertigo ? VERTIGO_LOWER_IMAGE : null;
        const imgPath = isMultiLevel && nukeLower && lowerImg ? lowerImg : MAP_IMAGES[mapName];
        if (imgPath) {
          const cacheKey = isMultiLevel ? `${mapName}_${nukeLower ? "lower" : "upper"}` : mapName;
          if (mapImgNameRef.current !== cacheKey) {
            mapImgNameRef.current = cacheKey;
            const img = new Image();
            img.src = imgPath;
            img.onload = () => { mapImgRef.current = img; };
            img.onerror = () => { mapImgRef.current = null; };
          }
          if (mapImgRef.current) {
            ctx.globalAlpha = 0.7;
            ctx.drawImage(mapImgRef.current, 0, 0, radarSize, radarSize);
            ctx.globalAlpha = 1;
          }
        }
      }

      if (!mapInfo && mapName) {
        ctx.font = "13px Tahoma, sans-serif";
        ctx.fillStyle = "#555555";
        ctx.textAlign = "center";
        ctx.fillText(`Unknown map: ${mapName}`, radarSize / 2, radarSize / 2);
        ctx.textAlign = "left";
      }

      // Follow mode: auto-center on local player
      if (followRef.current && data?.localPlayer && mapInfo) {
        const lp = data.localPlayer;
        const lpCanvas = worldToCanvas(lp.x, lp.y, mapInfo, radarSize, 0, 0);
        const targetX = w / 2 - baseOx - lpCanvas.x * zoomRef.current;
        const targetY = h / 2 - baseOy - lpCanvas.y * zoomRef.current;
        panRef.current.x = lerp(panRef.current.x, targetX, 0.12);
        panRef.current.y = lerp(panRef.current.y, targetY, 0.12);
      }

      const collectedPlayers: { sx: number; sy: number; player: Player; isLocal: boolean }[] = [];
      if (data?.connected && mapInfo) {
        const nukeLevel = isMultiLevel ? (nukeLower ? "lower" : "upper") : null;

        // Draw bomb first (behind players)
        if (data.bomb) {
          const bpos = worldToCanvas(data.bomb.x, data.bomb.y, mapInfo, radarSize, 0, 0);
          if (nukeLevel) {
            const bombOnLower = data.bomb.z < zSplit;
            ctx.globalAlpha = (nukeLevel === "lower") === bombOnLower ? 1.0 : 0.25;
          }
          const bombTimerTotal = data.bomb.timerLength && data.bomb.timerLength > 0 ? data.bomb.timerLength : 40;
          const canvasCurtime = serverCurtimeRef.current > 0 && lastReceiveRef.current > 0
            ? serverCurtimeRef.current + (performance.now() - lastReceiveRef.current) / 1000
            : data.curtime;
          const bombTimerFrac = (data.bomb.planted && data.bomb.blowTime && canvasCurtime && data.bomb.blowTime > canvasCurtime)
            ? Math.max(0, (data.bomb.blowTime - canvasCurtime) / bombTimerTotal) : undefined;
          const bombDefusing = data.bomb.planted && data.bomb.defuseEnd != null && canvasCurtime != null && data.bomb.defuseEnd > canvasCurtime;
          drawBomb(ctx, bpos, data.bomb.planted, data.bomb.site, bombTimerFrac, bombDefusing);
          ctx.globalAlpha = 1;
        }

        // Draw grenades with proper area-of-effect radii
        const pxPerUnit = radarSize / (mapInfo.scale * 1024);
        if (data.grenades) {
          for (const g of data.grenades) {
            const gpos = worldToCanvas(g.x, g.y, mapInfo, radarSize, 0, 0);
            if (nukeLevel) {
              const onLower = g.z < zSplit;
              ctx.globalAlpha = (nukeLevel === "lower") === onLower ? 1.0 : 0.25;
            }
            drawGrenade(ctx, gpos, g.type, pxPerUnit);
            ctx.globalAlpha = 1;
          }
        }

        // Draw fading death markers
        const now = performance.now();
        const nowMs = Date.now();
        for (const d of deathsRef.current) {
          const age = nowMs - d.time;
          if (age > 12000) continue;
          const fade = age < 2000 ? 1.0 : Math.max(0, 1 - (age - 2000) / 10000);
          const dpos = worldToCanvas(d.x, d.y, mapInfo, radarSize, 0, 0);
          if (nukeLevel) {
            const onLower = d.z < zSplit;
            ctx.globalAlpha = ((nukeLevel === "lower") === onLower ? fade : fade * 0.2);
          } else {
            ctx.globalAlpha = fade;
          }
          const dColor = d.team === 3 ? "#4a9eff" : d.team === 2 ? "#e0b04b" : "#888";
          ctx.strokeStyle = dColor;
          ctx.lineWidth = 1.5;
          const sz = 5;
          ctx.beginPath(); ctx.moveTo(dpos.x - sz, dpos.y - sz); ctx.lineTo(dpos.x + sz, dpos.y + sz); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(dpos.x + sz, dpos.y - sz); ctx.lineTo(dpos.x - sz, dpos.y + sz); ctx.stroke();
          if (fade > 0.3) {
            ctx.font = "7px Tahoma, sans-serif";
            ctx.fillStyle = dColor;
            ctx.globalAlpha = fade * 0.6;
            ctx.fillText(d.name.length > 8 ? d.name.slice(0, 8) + ".." : d.name, dpos.x + sz + 3, dpos.y + 2);
          }
          ctx.globalAlpha = 1;
        }

        // Draw player trails
        const trails = trailsRef.current;
        for (const [key, pts] of Object.entries(trails)) {
          if (pts.length < 2) continue;
          const isLocal = key === "__local";
          const player = isLocal ? data.localPlayer : data.players?.find((p, i) => {
            const pk = p.slot != null ? `s${p.slot}` : (p.name || `p${i}`);
            return pk === key;
          });
          if (!player || !player.alive) continue;
          const baseColor = isLocal ? "142,111,247" : player.enemy ? "224,101,106" : "74,158,255";
          for (let j = 0; j < pts.length - 1; j++) {
            const age = now - pts[j].t;
            if (age > 4000) continue;
            const alpha = Math.max(0, 0.15 * (1 - age / 4000));
            const tp = worldToCanvas(pts[j].x, pts[j].y, mapInfo, radarSize, 0, 0);
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${baseColor},${alpha.toFixed(2)})`;
            ctx.fill();
          }
        }

        if (data.localPlayer) {
          const lp = getInterpolated("__local", data.localPlayer);
          const pos = worldToCanvas(lp.x, lp.y, mapInfo, radarSize, 0, 0);
          if (nukeLevel) {
            const onLower = lp.z < zSplit;
            ctx.globalAlpha = (nukeLevel === "lower") === onLower ? 1.0 : 0.3;
          }
          drawPlayer(ctx, pos, true, false, false, data.localPlayer.alive !== false,
            lp.health, lp.name,
            lp.yaw ?? data.localPlayer.yaw, data.localPlayer.weapon,
            data.localPlayer.scoped, data.localPlayer.defusing, data.localPlayer.armor,
            data.localPlayer.flashAlpha, data.localPlayer.money, data.localPlayer.color,
            data.localPlayer.vx, data.localPlayer.vy, pxPerUnit);
          ctx.globalAlpha = 1;
          const sx = baseOx + panRef.current.x + pos.x * zoomRef.current;
          const sy = baseOy + panRef.current.y + pos.y * zoomRef.current;
          collectedPlayers.push({ sx, sy, player: data.localPlayer, isLocal: true });
        }

        if (data.players) {
          for (let i = 0; i < data.players.length; i++) {
            const p = data.players[i];
            const key = p.slot != null ? `s${p.slot}` : (p.name || `p${i}`);
            const ip = getInterpolated(key, p);
            const pos = worldToCanvas(ip.x, ip.y, mapInfo, radarSize, 0, 0);
            if (nukeLevel) {
              const onLower = ip.z < zSplit;
              ctx.globalAlpha = (nukeLevel === "lower") === onLower ? 1.0 : 0.3;
            }
            drawPlayer(ctx, pos, false, ip.enemy, ip.dormant, ip.alive, ip.health, ip.name,
              ip.yaw ?? p.yaw, p.weapon, p.scoped, p.defusing, p.armor,
              p.flashAlpha, p.money, p.color,
              p.vx, p.vy, pxPerUnit);
            ctx.globalAlpha = 1;
            if (p.alive) {
              const psx = baseOx + panRef.current.x + pos.x * zoomRef.current;
              const psy = baseOy + panRef.current.y + pos.y * zoomRef.current;
              collectedPlayers.push({ sx: psx, sy: psy, player: p, isLocal: false });
            }
          }
        }
      }
      renderedPlayersRef.current = collectedPlayers;

      // Mini compass (top-left of radar area)
      if (mapInfo) {
        const cx = 24, cy = 24, cr = 10;
        ctx.font = "bold 8px Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff15";
        ctx.fillText("N", cx, cy - cr - 2);
        ctx.fillText("S", cx, cy + cr + 8);
        ctx.fillText("W", cx - cr - 6, cy + 3);
        ctx.fillText("E", cx + cr + 6, cy + 3);
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff10";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy - cr + 2);
        ctx.lineTo(cx - 2, cy - cr + 6);
        ctx.lineTo(cx + 2, cy - cr + 6);
        ctx.closePath();
        ctx.fillStyle = "#e0656a33";
        ctx.fill();
        ctx.textAlign = "left";
      }

      ctx.restore();

      // Minimap overview — shown when zoomed in past 1.5x
      if (zoomRef.current > 1.5 && mapInfo && mapImgRef.current) {
        const mmSize = 100;
        const mmMargin = 8;
        const mmX = w - mmSize - mmMargin;
        const mmY = h - mmSize - mmMargin - 40;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#0d1117";
        ctx.fillRect(mmX, mmY, mmSize, mmSize);
        ctx.drawImage(mapImgRef.current, mmX, mmY, mmSize, mmSize);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#ffffff15";
        ctx.lineWidth = 1;
        ctx.strokeRect(mmX, mmY, mmSize, mmSize);

        // Viewport rectangle
        const vl = (-panRef.current.x) / (zoomRef.current * radarSize);
        const vt = (-panRef.current.y) / (zoomRef.current * radarSize);
        const vw = w / (zoomRef.current * radarSize);
        const vh = h / (zoomRef.current * radarSize);
        ctx.strokeStyle = "#8e6ff766";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          mmX + Math.max(0, vl) * mmSize,
          mmY + Math.max(0, vt) * mmSize,
          Math.min(vw, 1 - Math.max(0, vl)) * mmSize,
          Math.min(vh, 1 - Math.max(0, vt)) * mmSize
        );

        // Local player dot on minimap
        if (data?.localPlayer && data.localPlayer.alive !== false) {
          const lmPos = worldToCanvas(data.localPlayer.x, data.localPlayer.y, mapInfo, mmSize, mmX, mmY);
          ctx.beginPath();
          ctx.arc(lmPos.x, lmPos.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = "#8e6ff7";
          ctx.fill();
        }
      }
    }

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [getInterpolated]);

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 bg-bg font-ui px-6">
        <style>{`
          @keyframes radarSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>

        <div className="relative w-20 h-20 mb-2">
          <div className="absolute inset-0 rounded-full border border-border" />
          <div className="absolute inset-2 rounded-full border border-border/60" />
          <div className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full bg-accent -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_var(--color-accent)]" />
          <div className="absolute top-1/2 left-1/2 w-0.5 h-9 origin-top" style={{ background: "linear-gradient(to bottom, var(--color-accent), transparent)", animation: "radarSweep 3s linear infinite" }} />
        </div>

        <h1 className="text-2xl font-bold tracking-tight" style={{ animation: "fadeIn 0.5s ease-out" }}>
          gamesense<span className="text-accent">.cloud</span>
        </h1>
        <p className="text-text-faint text-xs uppercase tracking-[2px]" style={{ animation: "fadeIn 0.5s ease-out 0.1s both" }}>
          Web Radar
        </p>

        <div className="gb mt-3 p-5 max-w-sm w-full text-center" style={{ animation: "fadeIn 0.5s ease-out 0.2s both" }}>
          <p className="text-text-muted text-xs leading-relaxed mb-4">
            No active session. Start one from the DLL.
          </p>
          <div className="text-left text-text-faint text-[11px] leading-[2] space-y-0">
            {[
              <>Load <span className="text-text">gamesense.cloud</span> in CS2</>,
              <>Go to <span className="text-accent">Settings</span> &rarr; <span className="text-accent">Web Radar</span></>,
              <>Click <span className="text-ok">Start Web Radar</span></>,
              <>Copy the link &amp; open on any device</>,
            ].map((step, i) => (
              <div key={i} className="flex gap-2 items-baseline">
                <span className="text-accent/25 font-bold min-w-[14px] text-right">{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const id = sessionInput.trim();
            if (id.length >= 16) {
              window.location.href = `/web-radar?session=${encodeURIComponent(id)}`;
            }
          }}
          className="flex gap-2 items-center mt-2"
          style={{ animation: "fadeIn 0.5s ease-out 0.25s both" }}
        >
          <input
            type="text"
            placeholder="Paste session ID..."
            value={sessionInput}
            onChange={(e) => setSessionInput(e.target.value)}
            className="bg-surface border border-border rounded px-3 py-2 text-text text-xs font-mono w-56 outline-none focus:border-accent-dim transition-colors"
          />
          <button
            type="submit"
            disabled={sessionInput.trim().length < 16}
            className="border rounded px-4 py-2 text-[11px] font-bold tracking-wide transition-colors disabled:bg-surface disabled:border-border disabled:text-text-faint disabled:cursor-default bg-accent/10 border-accent/25 text-accent cursor-pointer hover:bg-accent/20"
          >
            CONNECT
          </button>
        </form>

        <p className="text-text/5 text-[9px] tracking-wide mt-1" style={{ animation: "fadeIn 0.5s ease-out 0.3s both" }}>
          Scroll to zoom &middot; Drag to pan &middot; Tab for scoreboard &middot; F to follow
        </p>
      </div>
    );
  }

  const sc = STATUS_CONFIG[hud.status];

  return (
    <div ref={containerRef} className="relative flex-1 bg-bg cursor-crosshair overflow-hidden">
      <style>{`
        @keyframes bombPulse { from { opacity: 0.7; } to { opacity: 1; } }
        @media (max-width: 600px) {
          .radar-topbar { height: auto !important; min-height: 32px; flex-wrap: wrap; padding: 4px 8px !important; gap: 4px !important; }
          .radar-topbar-left { gap: 6px !important; flex-wrap: wrap; }
          .radar-topbar-right { gap: 8px !important; }
          .radar-brand { font-size: 11px !important; }
          .radar-grenades { display: none !important; }
          .radar-playerlist { display: none !important; }
          .radar-scoreboard { min-width: 280px !important; max-width: 95vw !important; padding: 12px 0 !important; }
          .radar-bombbanner { font-size: 10px !important; padding: 3px 12px !important; top: auto !important; bottom: 40px !important; }
        }
      `}</style>
      {/* Top bar */}
      <div className="radar-topbar absolute top-0 left-0 right-0 h-9 z-10 flex items-center justify-between px-4 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(13,13,13,0.95), rgba(13,13,13,0))" }}>
        <div className="radar-topbar-left flex items-center gap-3">
          <span className="radar-brand text-text font-bold text-[13px] font-ui">
            gamesense<span className="text-accent">.cloud</span>
          </span>
          <span className="text-text-faint text-[11px]">|</span>
          <span className="text-sm font-bold tracking-wide text-text font-ui">
            {hud.status === "live" ? hud.mapDisplay : "---"}
          </span>
          {hud.status === "live" && hud.roundPhase && (hud.roundPhase.freeze || hud.roundPhase.warmup) && (
            <span className="text-[9px] px-1.5 py-px rounded-sm tracking-wide font-mono font-bold" style={{
              background: hud.roundPhase.warmup ? "var(--color-warn)/8" : "#4a9eff15",
              border: `1px solid ${hud.roundPhase.warmup ? "var(--color-warn)" : "#4a9eff"}33`,
              color: hud.roundPhase.warmup ? "var(--color-warn)" : "#4a9eff",
            }}>
              {hud.roundPhase.warmup ? "WARMUP" : "FREEZE"}
            </span>
          )}
          {hud.bomb?.planted && (() => {
            const remaining = hud.bomb.blowTime && interpolatedCurtime
              ? Math.max(0, hud.bomb.blowTime - interpolatedCurtime)
              : null;
            const defuseRemaining = hud.bomb.defuseEnd && interpolatedCurtime && hud.bomb.defuseEnd > interpolatedCurtime
              ? Math.max(0, hud.bomb.defuseEnd - interpolatedCurtime)
              : null;
            return (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-bad tracking-[2px] font-mono" style={{ animation: "bombPulse 0.5s ease-in-out infinite alternate" }}>
                  BOMB PLANTED
                </span>
                {hud.bomb.site && <span className="text-[10px] text-bad/50 font-mono">{hud.bomb.site}</span>}
                {remaining != null && remaining > 0 && (
                  <span className={`text-xs font-bold font-mono ${remaining < 10 ? "text-bad" : "text-warn"}`}>
                    {remaining.toFixed(1)}s
                  </span>
                )}
                {defuseRemaining != null && (
                  <span className="text-[10px] font-mono text-ok tracking-wide">DEF {defuseRemaining.toFixed(1)}s</span>
                )}
              </div>
            );
          })()}
          {hud.status === "live" && hud.grenades && hud.grenades.length > 0 && (() => {
            const counts: Record<string, number> = {};
            for (const g of hud.grenades) counts[g.type] = (counts[g.type] || 0) + 1;
            const badges: { type: string; count: number; color: string; label: string }[] = [];
            if (counts.smoke) badges.push({ type: "smoke", count: counts.smoke, color: "#aaa", label: "S" });
            if (counts.molotov) badges.push({ type: "molotov", count: counts.molotov, color: "#f80", label: "M" });
            if (counts.flash) badges.push({ type: "flash", count: counts.flash, color: "#ff0", label: "F" });
            if (counts.he) badges.push({ type: "he", count: counts.he, color: "#e06", label: "H" });
            if (counts.decoy) badges.push({ type: "decoy", count: counts.decoy, color: "#6a6", label: "D" });
            return (
              <div className="radar-grenades flex gap-1 ml-2">
                {badges.map(b => (
                  <span key={b.type} className="text-[9px] font-mono px-1 py-px rounded-sm" style={{
                    background: `${b.color}15`, border: `1px solid ${b.color}33`, color: b.color,
                  }}>
                    {b.count}{b.label}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>

        <div className="radar-topbar-right flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: sc.color, boxShadow: `0 0 4px ${sc.color}44` }} />
            <span className="text-[11px] font-ui" style={{ color: sc.color }}>{sc.label}</span>
            {hud.status === "live" && hud.age != null && (() => {
              const age = hud.age;
              const ageColor = age < 500 ? "var(--color-ok)" : age < 2000 ? "var(--color-warn)" : "var(--color-bad)";
              return <span className="text-[9px] font-mono ml-1 opacity-40" style={{ color: ageColor }}>{age < 1000 ? `${Math.round(age)}ms` : `${(age / 1000).toFixed(1)}s`}</span>;
            })()}
          </div>
          {hud.status === "live" && (
            <>
              {hud.roundPhase && (() => {
                if (hud.roundPhase.warmup) return <span className="text-[11px] font-bold text-text-muted font-mono tracking-wide">WARMUP</span>;
                if (hud.roundPhase.freeze) return <span className="text-[11px] font-bold text-ok font-mono tracking-wide">FREEZE</span>;
                if (hud.roundPhase.roundStartTime && hud.roundPhase.roundTime && interpolatedCurtime) {
                  const elapsed = interpolatedCurtime - hud.roundPhase.roundStartTime;
                  const remaining = Math.max(0, hud.roundPhase.roundTime - elapsed);
                  const mins = Math.floor(remaining / 60);
                  const secs = Math.floor(remaining % 60);
                  return <span className={`text-[13px] font-bold font-mono tracking-wide ${remaining < 30 ? "text-bad" : "text-text"}`}>{mins}:{String(secs).padStart(2, "0")}</span>;
                }
                return null;
              })()}
              {hud.roundPhase && hud.roundPhase.roundsPlayed > 0 && (
                <span className="text-[9px] text-white/15 font-mono">R{hud.roundPhase.roundsPlayed + 1}</span>
              )}
              <span className="text-xs font-mono" style={{ color: "#4a9eff" }}>
                CT {hud.ct}<span className="text-[9px] ml-0.5 opacity-35">({hud.ctAlive})</span>
              </span>
              <span className="text-xs font-mono text-warn">
                T {hud.t}<span className="text-[9px] ml-0.5 opacity-35">({hud.tAlive})</span>
              </span>
              <button onClick={() => setShowScoreboard(v => !v)} className="bg-transparent border border-frame rounded-sm text-text-faint text-[10px] px-2 py-0.5 cursor-pointer pointer-events-auto hover:border-accent-dim hover:text-text-muted transition-colors">
                TAB
              </button>
            </>
          )}
        </div>
      </div>

      {/* Center status message when not live */}
      {hud.status !== "live" && (
        <div className={`absolute inset-0 z-[5] flex flex-col items-center justify-center ${hud.status === "no_session" ? "pointer-events-auto" : "pointer-events-none"}`}>
          <div className="gb p-5 text-center max-w-sm backdrop-blur-sm bg-surface/95">
            <div className="text-sm font-bold font-ui" style={{ color: sc.color }}>{sc.label}</div>
            <p className="mt-2 text-[11px] text-text-faint font-ui">
              {hud.status === "no_session" && "No active DLL session found for this link."}
              {hud.status === "stale" && "DLL stopped sending data. Session may have ended."}
              {hud.status === "waiting" && (hud.reason === "sdk_not_initialized"
                ? "DLL connected — waiting for SDK to initialize..."
                : "DLL connected — waiting for game to start...")}
              {hud.status === "connecting" && "Connecting to session..."}
              {hud.status === "error" && "Failed to reach the server."}
            </p>
            {hud.status === "no_session" && (
              <div className="mt-3 text-left">
                <div className="text-[10px] text-text-faint/60 font-mono mb-2">
                  Session: <span className="text-text-muted">{session}</span>
                </div>
                <p className="text-[10px] text-text-faint leading-relaxed font-ui">
                  This usually means the DLL was restarted and generated a new session ID. Copy the new URL from the DLL&apos;s Web Radar panel.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const val = sessionInput.trim();
                    if (val.length >= 16 && /^[a-f0-9]+$/.test(val)) {
                      window.location.href = `/web-radar?session=${encodeURIComponent(val)}`;
                    } else if (val.includes("session=")) {
                      const m = val.match(/session=([a-f0-9]{16,64})/);
                      if (m) window.location.href = `/web-radar?session=${m[1]}`;
                    }
                  }}
                  className="flex gap-1.5 mt-3 items-center"
                >
                  <input
                    type="text"
                    placeholder="Paste new session ID or URL..."
                    value={sessionInput}
                    onChange={(e) => setSessionInput(e.target.value)}
                    className="flex-1 bg-bg border border-border rounded px-2.5 py-1.5 text-text text-[11px] font-mono outline-none focus:border-accent-dim transition-colors"
                  />
                  <button type="submit" className="bg-accent/15 border border-accent/30 rounded px-3.5 py-1.5 text-accent text-[10px] font-bold tracking-wide cursor-pointer hover:bg-accent/25 transition-colors">
                    GO
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debug overlay (bottom-left) — toggle with D key */}
      {showDebug && (
        <div className="absolute bottom-7 left-2 z-10 text-[9px] text-text-faint/60 font-mono pointer-events-none leading-relaxed bg-black/60 p-1.5 rounded max-h-[40vh] overflow-y-auto">
          <div className="text-text-muted mb-0.5">-- debug (D to hide) --</div>
          <div>polls: {hud.pollCount} | status: {hud.status}</div>
          {hud.reason && <div>reason: {hud.reason}</div>}
          {hud.age != null && <div>age: {Math.round(hud.age)}ms</div>}
          <div>session: {session?.slice(0, 8)}…</div>
          {hud.localPlayer && (
            <div className="text-accent">
              local: ({Math.round(hud.localPlayer.x)}, {Math.round(hud.localPlayer.y)}, {Math.round(hud.localPlayer.z)}) hp={hud.localPlayer.health} team={hud.localPlayer.team}
            </div>
          )}
          {hud.entityScan && (
            <div>entities: {hud.entityScan.added} found | {hud.entityScan.null} null | {hud.entityScan.noPawn} noPawn | {hud.entityScan.badPos ?? hud.entityScan.noTeam ?? 0} badPos</div>
          )}
          {hud.players && hud.players.length > 0 && (
            <div style={{ color: "#4a9eff" }}>
              players({hud.players.length}): {hud.players.map((p) => `[${p.name}:t${p.team} (${Math.round(p.x)},${Math.round(p.y)}) hp${p.health}]`).join(" ")}
            </div>
          )}
          {hud.debug && (
            <div className="max-w-[350px] break-all">sdk: {Object.entries(hud.debug).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" ")}</div>
          )}
          {hud.bomb && (
            <div className={hud.bomb.planted ? "text-bad" : "text-warn"}>
              bomb: ({Math.round(hud.bomb.x)}, {Math.round(hud.bomb.y)}, {Math.round(hud.bomb.z)}) {hud.bomb.planted ? "PLANTED" : "carried"}
            </div>
          )}
          {hud.entDebug && hud.entDebug.length > 0 && (
            <div className="max-w-[400px] break-all mt-0.5 text-text-faint">
              ents: {hud.entDebug.map(e => `[${e.i}:ct${e.ct} pt${e.pt} h1=${e.h1} h2=${e.h2} pawn=${e.pawn}]`).join(" ")}
            </div>
          )}
        </div>
      )}

      {/* Compact player list (right side) */}
      {hud.status === "live" && hud.players && hud.players.length > 0 && !showScoreboard && (
        <div className="radar-playerlist absolute top-11 right-2 z-10 pointer-events-none font-ui">
          {hud.players.filter(p => p.alive)
            .sort((a, b) => a.enemy === b.enemy ? (a.health ?? 0) - (b.health ?? 0) : a.enemy ? -1 : 1)
            .map((p, i) => {
            const pColor = (!p.enemy && p.color != null && p.color >= 0 && p.color < COMP_COLORS.length)
              ? COMP_COLORS[p.color]
              : (p.enemy ? "#e0656a" : "#4a9eff");
            return (
            <div key={i} className="flex items-center gap-1.5 mb-0.5 opacity-80">
              <span className="w-[3px] h-[3px] rounded-full shrink-0" style={{ background: pColor }} />
              <div className="min-w-[60px]">
                <div className="text-[9px] flex items-center gap-1" style={{ color: pColor + "99" }}>
                  {p.name?.length > 10 ? p.name.slice(0, 10) + ".." : p.name}
                  {(p.hasBomb || p.weapon?.replace(/^weapon_/, "").toLowerCase() === "c4") && (
                    <span className="text-[7px] text-warn font-bold bg-warn/10 px-0.5 rounded-sm">C4</span>
                  )}
                </div>
                {p.weapon && (
                  <div className="text-[7px] -mt-px" style={{ color: weaponColor(p.weapon) }}>
                    {weaponDisplayName(p.weapon)}{p.scoped ? " [S]" : ""}{p.defusing ? " [DEF]" : ""}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-px">
                <div className="w-[30px] h-[3px] bg-surface-2 rounded-sm overflow-hidden">
                  <div className="h-full rounded-sm" style={{
                    width: `${p.health}%`,
                    background: p.health > 50 ? "var(--color-ok)" : p.health > 25 ? "var(--color-warn)" : "var(--color-bad)",
                  }} />
                </div>
                {(p.armor ?? 0) > 0 && (
                  <div className="w-[30px] h-[2px] bg-surface-2 rounded-sm overflow-hidden">
                    <div className="h-full bg-blue-400/35 rounded-sm" style={{ width: `${p.armor}%` }} />
                  </div>
                )}
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* Scoreboard overlay (hold Tab) */}
      {showScoreboard && hud.status === "live" && (
        <div
          onClick={() => setShowScoreboard(false)}
          className="absolute inset-0 z-20 flex items-center justify-center bg-bg/85 backdrop-blur-sm cursor-pointer"
        >
          <div className="radar-scoreboard gb rounded min-w-[340px] max-w-[500px] py-4 font-ui">
            <div className="text-center mb-3">
              <div className="text-[13px] text-text font-bold tracking-wide">{hud.mapDisplay}</div>
              {hud.roundPhase && (
                <div className="text-[9px] text-text-faint/50 font-mono mt-0.5">
                  {hud.roundPhase.warmup ? "WARMUP" : hud.roundPhase.freeze ? "FREEZE TIME" : hud.roundPhase.roundsPlayed > 0 ? `Round ${hud.roundPhase.roundsPlayed + 1}` : ""}
                  {!hud.roundPhase.warmup && !hud.roundPhase.freeze && hud.roundPhase.roundStartTime && hud.roundPhase.roundTime && interpolatedCurtime && (() => {
                    const remaining = Math.max(0, hud.roundPhase!.roundTime! - (interpolatedCurtime! - hud.roundPhase!.roundStartTime!));
                    return ` — ${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, "0")}`;
                  })()}
                </div>
              )}
            </div>
            <div className="flex justify-center gap-8 mb-1">
              <div className="text-center">
                <span className="text-lg font-bold" style={{ color: "#4a9eff" }}>CT {hud.ct}</span>
                <div className="text-[9px] opacity-35" style={{ color: "#4a9eff" }}>{hud.ctAlive} alive</div>
              </div>
              <span className="text-sm text-text-faint self-center">vs</span>
              <div className="text-center">
                <span className="text-lg font-bold text-warn">T {hud.t}</span>
                <div className="text-[9px] text-warn/35">{hud.tAlive} alive</div>
              </div>
            </div>
            {(() => {
              const allPlayers = [...(hud.localPlayer ? [{ ...hud.localPlayer } as Player] : []), ...(hud.players ?? [])];
              const ctAliveList = allPlayers.filter(p => p.team === 3 && p.alive);
              const tAliveList = allPlayers.filter(p => p.team === 2 && p.alive);
              const ctMoney = ctAliveList.reduce((s, p) => s + (p.money ?? 0), 0);
              const tMoney = tAliveList.reduce((s, p) => s + (p.money ?? 0), 0);
              const buyType = (avg: number) => avg >= 4000 ? "FULL" : avg >= 2000 ? "FORCE" : "ECO";
              const ctAvg = ctAliveList.length > 0 ? ctMoney / ctAliveList.length : 0;
              const tAvg = tAliveList.length > 0 ? tMoney / tAliveList.length : 0;
              const buyColor = (avg: number) => avg >= 4000 ? "#5fc98a55" : avg >= 2000 ? "#e0b04b55" : "#e0656a55";
              return (ctMoney > 0 || tMoney > 0) ? (
                <div className="flex justify-center gap-6 mb-3 items-center">
                  <div className="text-center">
                    <div className="text-[10px] font-mono opacity-35" style={{ color: "#4a9eff" }}>${ctMoney.toLocaleString()}</div>
                    <div className="text-[7px] font-mono tracking-wide" style={{ color: buyColor(ctAvg) }}>{buyType(ctAvg)}</div>
                  </div>
                  <span className="text-[10px] font-mono text-ok/15">economy</span>
                  <div className="text-center">
                    <div className="text-[10px] font-mono text-warn/35">${tMoney.toLocaleString()}</div>
                    <div className="text-[7px] font-mono tracking-wide" style={{ color: buyColor(tAvg) }}>{buyType(tAvg)}</div>
                  </div>
                </div>
              ) : <div className="mb-2" />;
            })()}
            {/* CT players */}
            <div className="px-4 mb-2">
              <div className="flex items-center mb-1">
                <span className="text-[9px] tracking-wide flex-1 opacity-55" style={{ color: "#4a9eff" }}>COUNTER-TERRORISTS</span>
                <span className="text-[7px] font-mono text-white/10 min-w-[40px] text-center">K/D/A</span>
                <span className="text-[7px] font-mono text-white/10 min-w-[20px] text-center">MVP</span>
                <span className="text-[7px] font-mono text-white/10 min-w-[28px] text-right">PING</span>
                <span className="text-[7px] font-mono text-white/10 min-w-[42px] text-right">HP</span>
              </div>
              {[...(hud.localPlayer?.team === 3 ? [{
                ...hud.localPlayer, name: "You", enemy: false,
              } as Player] : []),
              ...(hud.players?.filter(p => p.team === 3) ?? [])]
              .sort((a, b) => (a.alive === b.alive ? (b.health ?? 0) - (a.health ?? 0) : a.alive ? -1 : 1))
              .map((p, i) => {
                const dotColor = (p.color != null && p.color >= 0 && p.color < COMP_COLORS.length)
                  ? COMP_COLORS[p.color] : "#4a9eff";
                return (
                <div key={`ct-${i}`} className={`flex items-center gap-2 py-0.5 ${p.alive ? "opacity-100" : "opacity-35"}`}>
                  <span className="w-1 h-1 rounded-full shrink-0" style={{ background: p.alive ? dotColor : "var(--color-frame)" }} />
                  <div className="flex-1">
                    <div className="text-[11px] text-text flex gap-1 items-center">
                      {p.name}
                      {p.helmet && <span className="text-[7px] opacity-35" style={{ color: "#4a9eff" }}>H</span>}
                      {p.defuser && <span className="text-[7px] text-ok/35">D</span>}
                    </div>
                    {p.alive && p.weapon && <div className="text-[8px] text-text-muted -mt-px">{weaponDisplayName(p.weapon)}</div>}
                  </div>
                  {(p.kills != null || p.deaths != null) && (
                    <div className="text-center min-w-[40px] font-mono text-[9px] text-text-muted">{p.kills ?? 0}/{p.deaths ?? 0}/{p.assists ?? 0}</div>
                  )}
                  <div className={`text-center min-w-[20px] font-mono text-[8px] ${(p.mvps ?? 0) > 0 ? "text-warn/55" : "text-white/5"}`}>
                    {(p.mvps ?? 0) > 0 ? `★${p.mvps}` : "—"}
                  </div>
                  {p.ping != null && p.ping > 0 && (
                    <div className={`text-right min-w-[28px] font-mono text-[8px] ${p.ping < 80 ? "text-ok/35" : p.ping < 150 ? "text-warn/35" : "text-bad/35"}`}>{p.ping}ms</div>
                  )}
                  <div className="text-right min-w-[42px]">
                    <div className="text-[10px] font-mono" style={{ color: p.alive ? "#4a9eff" : "var(--color-text-faint)" }}>{p.alive ? `${p.health}hp` : "DEAD"}</div>
                    {p.alive && (p.armor ?? 0) > 0 && <div className="text-[8px] font-mono opacity-35" style={{ color: "#4a9eff" }}>{p.armor}ap</div>}
                    {p.alive && (p.money ?? 0) > 0 && <div className="text-[8px] font-mono text-ok/30">${p.money}</div>}
                  </div>
                </div>
              );
              })}
            </div>
            {/* T players */}
            <div className="px-4">
              <div className="flex items-center mb-1">
                <span className="text-[9px] tracking-wide flex-1 text-warn/55">TERRORISTS</span>
                <span className="text-[7px] font-mono text-white/10 min-w-[40px] text-center">K/D/A</span>
                <span className="text-[7px] font-mono text-white/10 min-w-[20px] text-center">MVP</span>
                <span className="text-[7px] font-mono text-white/10 min-w-[28px] text-right">PING</span>
                <span className="text-[7px] font-mono text-white/10 min-w-[42px] text-right">HP</span>
              </div>
              {[...(hud.localPlayer?.team === 2 ? [{
                ...hud.localPlayer, name: "You", enemy: false,
              } as Player] : []),
              ...(hud.players?.filter(p => p.team === 2) ?? [])]
              .sort((a, b) => (a.alive === b.alive ? (b.health ?? 0) - (a.health ?? 0) : a.alive ? -1 : 1))
              .map((p, i) => {
                const dotColor = (p.color != null && p.color >= 0 && p.color < COMP_COLORS.length)
                  ? COMP_COLORS[p.color] : "#e0b04b";
                return (
                <div key={`t-${i}`} className={`flex items-center gap-2 py-0.5 ${p.alive ? "opacity-100" : "opacity-35"}`}>
                  <span className="w-1 h-1 rounded-full shrink-0" style={{ background: p.alive ? dotColor : "var(--color-frame)" }} />
                  <div className="flex-1">
                    <div className="text-[11px] text-text flex gap-1 items-center">
                      {p.name}
                      {p.helmet && <span className="text-[7px] text-warn/35">H</span>}
                      {p.alive && (p.hasBomb || p.weapon?.replace(/^weapon_/, "").toLowerCase() === "c4") && (
                        <span className="text-[7px] text-warn font-bold bg-warn/15 px-0.5 rounded-sm">C4</span>
                      )}
                    </div>
                    {p.alive && p.weapon && <div className="text-[8px] text-text-muted -mt-px">{weaponDisplayName(p.weapon)}</div>}
                  </div>
                  {(p.kills != null || p.deaths != null) && (
                    <div className="text-center min-w-[40px] font-mono text-[9px] text-text-muted">{p.kills ?? 0}/{p.deaths ?? 0}/{p.assists ?? 0}</div>
                  )}
                  <div className={`text-center min-w-[20px] font-mono text-[8px] ${(p.mvps ?? 0) > 0 ? "text-warn/55" : "text-white/5"}`}>
                    {(p.mvps ?? 0) > 0 ? `★${p.mvps}` : "—"}
                  </div>
                  {p.ping != null && p.ping > 0 && (
                    <div className={`text-right min-w-[28px] font-mono text-[8px] ${p.ping < 80 ? "text-ok/35" : p.ping < 150 ? "text-warn/35" : "text-bad/35"}`}>{p.ping}ms</div>
                  )}
                  <div className="text-right min-w-[42px]">
                    <div className="text-[10px] font-mono" style={{ color: p.alive ? "var(--color-warn)" : "var(--color-text-faint)" }}>{p.alive ? `${p.health}hp` : "DEAD"}</div>
                    {p.alive && (p.armor ?? 0) > 0 && <div className="text-[8px] font-mono text-warn/35">{p.armor}ap</div>}
                    {p.alive && (p.money ?? 0) > 0 && <div className="text-[8px] font-mono text-ok/30">${p.money}</div>}
                  </div>
                </div>
              );
              })}
            </div>
            <div className="text-center mt-3 text-[9px] text-border">Tab or tap to close</div>
          </div>
        </div>
      )}

      {/* Bomb planted banner with timer */}
      {hud.status === "live" && hud.bomb?.planted && (() => {
        const remaining = hud.bomb.blowTime && interpolatedCurtime
          ? Math.max(0, hud.bomb.blowTime - interpolatedCurtime)
          : null;
        const defuseRemaining = hud.bomb.defuseEnd && interpolatedCurtime && hud.bomb.defuseEnd > interpolatedCurtime
          ? Math.max(0, hud.bomb.defuseEnd - interpolatedCurtime)
          : null;
        return (
          <div className="radar-bombbanner absolute top-10 left-1/2 -translate-x-1/2 z-[15] px-5 py-1 pb-1.5 pointer-events-none bg-bad/15 border border-bad/30 rounded-sm font-ui flex flex-col items-center gap-1 min-w-[200px]" style={{ animation: "bombPulse 1s ease-in-out infinite alternate" }}>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-bad tracking-[2px]">
                BOMB PLANTED{hud.bomb.site ? ` ${hud.bomb.site}` : ""}
              </span>
              {remaining != null && remaining > 0 && (
                <span className={`text-sm font-bold font-mono ${remaining < 10 ? "text-bad" : "text-warn"}`}>{remaining.toFixed(1)}s</span>
              )}
              {defuseRemaining != null && (
                <span className="text-[10px] font-mono text-ok tracking-wide">DEF {defuseRemaining.toFixed(1)}s</span>
              )}
            </div>
            {remaining != null && remaining > 0 && (
              <div className="w-full h-[3px] bg-bad/15 rounded-sm overflow-hidden relative">
                <div className="h-full rounded-sm transition-[width] duration-200 ease-linear" style={{
                  width: `${Math.min(remaining / (hud.bomb.timerLength && hud.bomb.timerLength > 0 ? hud.bomb.timerLength : 40) * 100, 100)}%`,
                  background: remaining < 10 ? "linear-gradient(90deg, var(--color-bad), #ff4444)" : "linear-gradient(90deg, var(--color-warn), var(--color-bad))",
                }} />
                {defuseRemaining != null && remaining != null && remaining > 0 && (
                  <div className="absolute top-0 left-0 h-full rounded-sm transition-[width] duration-200 ease-linear" style={{
                    width: `${Math.min(defuseRemaining / remaining * 100, 100)}%`,
                    background: defuseRemaining <= remaining ? "var(--color-ok)" : "var(--color-warn)",
                  }} />
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Zoom controls (bottom-right) */}
      <div className="absolute bottom-7 right-3 z-10 font-mono text-[10px] flex items-center gap-1.5">
        <button
          aria-label="Zoom out"
          onClick={() => { zoomRef.current = Math.max(zoomRef.current / 1.3, 0.4); setZoomDisplay(Math.round(zoomRef.current * 100)); }}
          className="bg-transparent border border-white/10 rounded-sm text-white/20 text-sm w-[22px] h-[22px] cursor-pointer flex items-center justify-center p-0 hover:border-white/25 hover:text-white/40 transition-colors"
        >-</button>
        <span className="text-white/15 min-w-[32px] text-center pointer-events-none">{zoomDisplay}%</span>
        <button
          aria-label="Zoom in"
          onClick={() => { zoomRef.current = Math.min(zoomRef.current * 1.3, 4.0); setZoomDisplay(Math.round(zoomRef.current * 100)); }}
          className="bg-transparent border border-white/10 rounded-sm text-white/20 text-sm w-[22px] h-[22px] cursor-pointer flex items-center justify-center p-0 hover:border-white/25 hover:text-white/40 transition-colors"
        >+</button>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none z-10 text-white/10 text-[10px] tracking-[2px] font-ui">
        gamesense.cloud
        {(hud.map === "DE_NUKE" || hud.map === "DE_VERTIGO") && (
          <span className={`ml-3 cursor-pointer pointer-events-auto ${showLower ? "text-warn/25" : "text-blue-400/25"}`} onClick={() => setShowLower(v => !v)}>
            [N] {showLower ? "LOWER" : "UPPER"}
          </span>
        )}
        {!showDebug && <span className="ml-3 text-white/5">[D] debug &middot; [F] follow &middot; [?] help</span>}
      </div>

      {/* Flash overlay when local player is flashed */}
      {flashOverlay > 0 && (
        <div className="absolute inset-0 z-[25] pointer-events-none transition-[background] duration-150 ease-out" style={{ background: `rgba(255,255,255,${flashOverlay.toFixed(2)})` }} />
      )}

      {/* Kill feed (top-left, below HUD bar) */}
      {killFeed.length > 0 && hud.status === "live" && !showScoreboard && (
        <div className="absolute top-11 left-2 z-[12] pointer-events-none font-ui">
          {killFeed.map((k, i) => {
            const age = Date.now() - k.time;
            const opacity = age > 6000 ? Math.max(0, 1 - (age - 6000) / 2000) : 1;
            const killerColor = k.killerTeam === 3 ? "#4a9eff" : k.killerTeam === 2 ? "var(--color-warn)" : "var(--color-text-muted)";
            const victimColor = k.victimTeam === 3 ? "#4a9eff" : k.victimTeam === 2 ? "var(--color-warn)" : "var(--color-text-muted)";
            const weaponClean = k.weapon.replace("weapon_", "");
            return (
              <div key={`${k.killer}-${k.victim}-${k.time}-${i}`} className="text-[10px] mb-0.5 flex items-center gap-1 bg-bg/60 px-1.5 py-px rounded" style={{ opacity }}>
                <span className="font-semibold" style={{ color: killerColor }}>{k.killer}</span>
                <span className="text-[8px] text-text-muted">{weaponClean}</span>
                {k.headshot && <span className="text-[8px] text-bad" title="Headshot">HS</span>}
                <span className="text-[9px] text-bad">&#x2192;</span>
                <span className="font-semibold" style={{ color: victimColor }}>{k.victim}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Help overlay */}
      {showHelp && (
        <div onClick={() => setShowHelp(false)} className="absolute inset-0 z-30 flex items-center justify-center bg-bg/90 backdrop-blur-sm cursor-pointer">
          <div className="gb rounded p-5 font-ui min-w-[260px] max-w-[340px]">
            <div className="text-[13px] text-accent font-bold mb-3.5 tracking-wide">KEYBOARD SHORTCUTS</div>
            {[
              { key: "Tab", desc: "Scoreboard" },
              { key: "D", desc: "Debug overlay" },
              { key: "N", desc: "Toggle level (Nuke/Vertigo)" },
              { key: "F", desc: "Follow local player" },
              { key: "P", desc: "Toggle player names" },
              { key: "B", desc: "Toggle health arcs" },
              { key: "V", desc: "Toggle velocity arrows" },
              { key: "R", desc: "Reset zoom & pan" },
              { key: "H / ?", desc: "This help" },
            ].map(s => (
              <div key={s.key} className="flex items-center gap-3 mb-1.5">
                <span className="text-[10px] text-text font-mono bg-surface-2 border border-frame rounded px-2 py-0.5 min-w-[50px] text-center">{s.key}</span>
                <span className="text-[11px] text-text-muted">{s.desc}</span>
              </div>
            ))}
            <div className="mt-3 border-t border-border pt-2.5">
              {[
                { key: "Scroll", desc: "Zoom in/out" },
                { key: "Drag", desc: "Pan the map" },
                { key: "Dbl-click", desc: "Reset view" },
                { key: "Hover", desc: "Player tooltip" },
              ].map(s => (
                <div key={s.key} className="flex items-center gap-3 mb-1">
                  <span className="text-[9px] text-text-muted font-mono min-w-[60px]">{s.key}</span>
                  <span className="text-[10px] text-text-faint">{s.desc}</span>
                </div>
              ))}
            </div>
            <div className="text-center mt-3 text-[9px] text-border">Click or press H to close</div>
          </div>
        </div>
      )}

      {/* Mode indicators */}
      {hud.status === "live" && (
        <div className="absolute bottom-11 right-3 z-10 pointer-events-none font-mono text-[9px] tracking-wide flex gap-2">
          {followMode && <span className="text-accent/25">FOLLOW</span>}
          {!showNames && <span className="text-bad/25">NAMES OFF</span>}
          {!showHealth && <span className="text-bad/25">HP OFF</span>}
          {!showVelocity && <span className="text-bad/25">VEL OFF</span>}
        </div>
      )}

      {/* Player hover tooltip */}
      {hoveredPlayer && hoveredPlayer.player.alive && (() => {
        const ttW = 200, ttH = 120;
        const container = containerRef.current;
        const vw = container ? container.clientWidth : 1920;
        const vh = container ? container.clientHeight : 1080;
        const ttLeft = hoveredPlayer.sx + 16 + ttW > vw
          ? hoveredPlayer.sx - ttW - 8
          : hoveredPlayer.sx + 16;
        const ttTop = hoveredPlayer.sy - 8 + ttH > vh
          ? Math.max(4, vh - ttH - 4)
          : hoveredPlayer.sy - 8;
        return (
        <div className="absolute z-30 pointer-events-none bg-surface/95 border border-border rounded px-3 py-2 font-ui min-w-[120px] max-w-[200px] backdrop-blur-sm" style={{ left: ttLeft, top: ttTop }}>
          <div className="text-[11px] font-bold mb-1" style={{ color: hoveredPlayer.isLocal ? "var(--color-accent)" : hoveredPlayer.player.enemy ? "var(--color-bad)" : "#4a9eff" }}>
            {hoveredPlayer.player.name || "Unknown"}
            {hoveredPlayer.isLocal && <span className="text-text-faint font-normal ml-1 text-[9px]">YOU</span>}
          </div>
          <div className="flex gap-3 text-[10px]">
            <div>
              <div className="text-text-faint text-[8px] mb-px">HP</div>
              <div className="font-mono" style={{ color: (hoveredPlayer.player.health ?? 0) > 60 ? "var(--color-ok)" : (hoveredPlayer.player.health ?? 0) > 25 ? "var(--color-warn)" : "var(--color-bad)" }}>
                {hoveredPlayer.player.health}
              </div>
            </div>
            {(hoveredPlayer.player.armor ?? 0) > 0 && (
              <div>
                <div className="text-text-faint text-[8px] mb-px">AP</div>
                <div className="font-mono text-[#4a9eff88]">{hoveredPlayer.player.armor}</div>
              </div>
            )}
            {(hoveredPlayer.player.money ?? 0) > 0 && (
              <div>
                <div className="text-text-faint text-[8px] mb-px">$</div>
                <div className="font-mono text-ok/50">${hoveredPlayer.player.money}</div>
              </div>
            )}
          </div>
          {(hoveredPlayer.player.kills != null || hoveredPlayer.player.deaths != null) && (
            <div className="flex gap-3 text-[10px] mt-1">
              <div>
                <div className="text-text-faint text-[8px] mb-px">K</div>
                <div className="text-text font-mono">{hoveredPlayer.player.kills ?? 0}</div>
              </div>
              <div>
                <div className="text-text-faint text-[8px] mb-px">D</div>
                <div className="text-text font-mono">{hoveredPlayer.player.deaths ?? 0}</div>
              </div>
              <div>
                <div className="text-text-faint text-[8px] mb-px">A</div>
                <div className="text-text font-mono">{hoveredPlayer.player.assists ?? 0}</div>
              </div>
              {(hoveredPlayer.player.mvps ?? 0) > 0 && (
                <div>
                  <div className="text-text-faint text-[8px] mb-px">MVP</div>
                  <div className="text-warn font-mono">★{hoveredPlayer.player.mvps}</div>
                </div>
              )}
              {hoveredPlayer.player.ping != null && hoveredPlayer.player.ping > 0 && (
                <div>
                  <div className="text-text-faint text-[8px] mb-px">PING</div>
                  <div className="font-mono" style={{ color: hoveredPlayer.player.ping < 80 ? "var(--color-ok)" : hoveredPlayer.player.ping < 150 ? "var(--color-warn)" : "var(--color-bad)" }}>
                    {hoveredPlayer.player.ping}
                  </div>
                </div>
              )}
            </div>
          )}
          {hoveredPlayer.player.weapon && (
            <div className="mt-1 text-[9px]" style={{ color: weaponColor(hoveredPlayer.player.weapon) }}>
              {weaponDisplayName(hoveredPlayer.player.weapon)}
              {hoveredPlayer.player.scoped && <span className="text-bad/50 ml-1">SCOPED</span>}
            </div>
          )}
          <div className="mt-0.5 flex gap-1.5 text-[8px] text-border">
            {hoveredPlayer.player.helmet && <span>Helmet</span>}
            {hoveredPlayer.player.defuser && <span className="text-ok/30">Defuser</span>}
            {hoveredPlayer.player.defusing && <span className="text-ok">DEFUSING</span>}
          </div>
        </div>
        );
      })()}

      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

export default function RadarPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 bg-bg flex items-center justify-center text-text-muted font-ui text-[13px]">
        Loading radar...
      </div>
    }>
      <RadarCanvas />
    </Suspense>
  );
}
