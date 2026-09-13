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

interface Player {
  x: number; y: number; z: number;
  team: number; alive: boolean; health: number;
  name: string; dormant: boolean; enemy: boolean;
  yaw?: number;
  armor?: number; weapon?: string;
  scoped?: boolean; helmet?: boolean; defuser?: boolean; defusing?: boolean;
  flashAlpha?: number; money?: number;
}

interface EntDebug {
  i: number; ct: number; pt: number; h1: string; h2: string; pawn: boolean;
}

interface BombInfo {
  x: number; y: number; z: number; planted: boolean;
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
  debug?: Record<string, unknown>;
  entityScan?: { total: number; null: number; noPawn: number; badPos?: number; noTeam?: number; added: number };
  entDebug?: EntDebug[];
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

function RadarCanvas() {
  const params = useSearchParams();
  const session = params.get("session");

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
  const [showLower, setShowLower] = useState(false);
  const showLowerRef = useRef(false);
  const nukeLowerImgRef = useRef<HTMLImageElement | null>(null);
  const [zoomDisplay, setZoomDisplay] = useState(100);
  const [followMode, setFollowMode] = useState(false);
  const followRef = useRef(false);
  const [flashOverlay, setFlashOverlay] = useState(0);
  const killFeedRef = useRef<{ name: string; team: number; time: number }[]>([]);
  const [killFeed, setKillFeed] = useState<{ name: string; team: number; time: number }[]>([]);
  const prevAliveRef = useRef<Record<string, boolean>>({});
  const trailsRef = useRef<Record<string, { x: number; y: number; t: number }[]>>({});

  const [hud, setHud] = useState<{
    status: RadarStatus; map: string; mapDisplay: string; ct: number; t: number;
    reason?: string; age?: number; pollCount: number;
    debug?: Record<string, unknown>;
    entityScan?: { total: number; null: number; noPawn: number; badPos?: number; noTeam?: number; added: number };
    entDebug?: EntDebug[];
    players?: Player[];
    localPlayer?: Player;
    bomb?: BombInfo;
  }>({
    status: "connecting", map: "---", mapDisplay: "---", ct: 0, t: 0, pollCount: 0,
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
                next[data.players[i].name || `p${i}`] = data.players[i];
              }
            }
            currPosRef.current = next;
            gameDataRef.current = data;
            lastUpdateRef.current = performance.now();
          } else {
            gameDataRef.current = null;
            currPosRef.current = {};
            prevPosRef.current = {};
          }

          // Count alive players
          let ct = 0, t = 0;
          if (radarStatus === "live") {
            if (data.localPlayer?.alive !== false) {
              if (data.localPlayer?.team === 3) ct++;
              else if (data.localPlayer?.team === 2) t++;
            }
            data.players?.forEach(p => {
              if (p.alive) {
                if (p.team === 3) ct++;
                else if (p.team === 2) t++;
              }
            });
          }

          // Track kills (alive → dead transitions)
          if (radarStatus === "live" && data.players) {
            const now = Date.now();
            const newDeaths: { name: string; team: number; time: number }[] = [];
            for (const p of data.players) {
              const key = p.name || "?";
              const wasAlive = prevAliveRef.current[key];
              if (wasAlive === true && !p.alive) {
                newDeaths.push({ name: key, team: p.team, time: now });
              }
              prevAliveRef.current[key] = p.alive;
            }
            if (newDeaths.length > 0) {
              const feed = [...killFeedRef.current, ...newDeaths].slice(-6);
              killFeedRef.current = feed;
              setKillFeed([...feed]);
            }
            // Expire old entries (older than 8 seconds)
            const cutoff = now - 8000;
            if (killFeedRef.current.length > 0 && killFeedRef.current[0].time < cutoff) {
              killFeedRef.current = killFeedRef.current.filter(k => k.time >= cutoff);
              setKillFeed([...killFeedRef.current]);
            }
          }

          // Flash overlay for local player
          if (radarStatus === "live" && data.localPlayer?.flashAlpha && data.localPlayer.flashAlpha > 20) {
            setFlashOverlay(Math.min(data.localPlayer.flashAlpha / 255, 0.9));
          } else {
            setFlashOverlay(0);
          }

          // Store player trails
          if (radarStatus === "live") {
            const now = performance.now();
            const trails = trailsRef.current;
            if (data.localPlayer) {
              const key = "__local";
              if (!trails[key]) trails[key] = [];
              trails[key].push({ x: data.localPlayer.x, y: data.localPlayer.y, t: now });
              if (trails[key].length > 20) trails[key] = trails[key].slice(-20);
            }
            if (data.players) {
              for (const p of data.players) {
                if (!p.alive) continue;
                const key = p.name || "?";
                if (!trails[key]) trails[key] = [];
                trails[key].push({ x: p.x, y: p.y, t: now });
                if (trails[key].length > 20) trails[key] = trails[key].slice(-20);
              }
            }
          }

          const mapKey = data.map || "";
          const mapMeta = MAPS[mapKey];
          setHud({
            status: radarStatus,
            map: mapKey.toUpperCase() || "---",
            mapDisplay: mapMeta?.display || mapKey || "---",
            ct, t,
            reason: data.reason,
            age: data.age_ms,
            pollCount: n,
            debug: data.debug,
            entityScan: data.entityScan,
            entDebug: data.entDebug,
            players: data.players,
            localPlayer: data.localPlayer ?? undefined,
            bomb: data.bomb,
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

  // Canvas resize
  useEffect(() => {
    function resize() {
      const c = canvasRef.current;
      if (!c) return;
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Keyboard events
  useEffect(() => {
    function onDown(e: KeyboardEvent) {
      if (e.key === "d" || e.key === "D") setShowDebug(v => !v);
      if (e.key === "n" || e.key === "N") setShowLower(v => !v);
      if (e.key === "f" || e.key === "F") setFollowMode(v => !v);
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
      if (dragRef.current.active) {
        panRef.current.x = dragRef.current.panX + (e.clientX - dragRef.current.startX);
        panRef.current.y = dragRef.current.panY + (e.clientY - dragRef.current.startY);
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
      flashAlpha?: number, money?: number
    ) {
      const color = isLocal ? "#8e6ff7" : isEnemy ? "#e0656a" : "#4a9eff";
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
      drawHealthArc(ctx, pos.x, pos.y, r + 3, health || 100, hpColor);

      // Armor arc (inner, blue)
      if (armor && armor > 0) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 1, -Math.PI / 2, -Math.PI / 2 + (armor / 100) * Math.PI * 2);
        ctx.strokeStyle = "rgba(74,158,255,0.3)"; ctx.lineWidth = 1.5; ctx.stroke();
      }

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

    function drawBomb(
      ctx: CanvasRenderingContext2D,
      pos: { x: number; y: number },
      planted: boolean
    ) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / (planted ? 300 : 1000));
      const r = planted ? 7 : 5;

      if (planted) {
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(224,60,60,${(pulse * 0.4).toFixed(2)})`;
        ctx.lineWidth = 2; ctx.stroke();
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
      ctx.fillText(planted ? "BOMB" : "C4", pos.x + r + 4, pos.y + 3);
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
      const nukeLower = showLowerRef.current;
      if (mapName && mapInfo) {
        const imgPath = isNuke && nukeLower ? NUKE_LOWER_IMAGE : MAP_IMAGES[mapName];
        if (imgPath) {
          const cacheKey = isNuke ? `${mapName}_${nukeLower ? "lower" : "upper"}` : mapName;
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

      if (data?.connected && mapInfo) {
        const nukeLevel = isNuke ? (nukeLower ? "lower" : "upper") : null;

        // Draw bomb first (behind players)
        if (data.bomb) {
          const bpos = worldToCanvas(data.bomb.x, data.bomb.y, mapInfo, radarSize, 0, 0);
          if (nukeLevel) {
            const bombOnLower = data.bomb.z < NUKE_Z_SPLIT;
            ctx.globalAlpha = (nukeLevel === "lower") === bombOnLower ? 1.0 : 0.25;
          }
          drawBomb(ctx, bpos, data.bomb.planted);
          ctx.globalAlpha = 1;
        }

        // Draw player trails
        const now = performance.now();
        const trails = trailsRef.current;
        for (const [key, pts] of Object.entries(trails)) {
          if (pts.length < 2) continue;
          const isLocal = key === "__local";
          const player = isLocal ? data.localPlayer : data.players?.find(p => p.name === key);
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
            const onLower = lp.z < NUKE_Z_SPLIT;
            ctx.globalAlpha = (nukeLevel === "lower") === onLower ? 1.0 : 0.3;
          }
          drawPlayer(ctx, pos, true, false, false, true, lp.health, lp.name,
            lp.yaw ?? data.localPlayer.yaw, data.localPlayer.weapon,
            data.localPlayer.scoped, data.localPlayer.defusing, data.localPlayer.armor,
            data.localPlayer.flashAlpha, data.localPlayer.money);
          ctx.globalAlpha = 1;
        }

        if (data.players) {
          for (let i = 0; i < data.players.length; i++) {
            const p = data.players[i];
            const key = p.name || `p${i}`;
            const ip = getInterpolated(key, p);
            const pos = worldToCanvas(ip.x, ip.y, mapInfo, radarSize, 0, 0);
            if (nukeLevel) {
              const onLower = ip.z < NUKE_Z_SPLIT;
              ctx.globalAlpha = (nukeLevel === "lower") === onLower ? 1.0 : 0.3;
            }
            drawPlayer(ctx, pos, false, ip.enemy, ip.dormant, ip.alive, ip.health, ip.name,
              ip.yaw ?? p.yaw, p.weapon, p.scoped, p.defusing, p.armor,
              p.flashAlpha, p.money);
            ctx.globalAlpha = 1;
          }
        }
      }

      ctx.restore();
    }

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [getInterpolated]);

  if (!session) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "#0a0e14", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 20,
        fontFamily: "Tahoma, Verdana, sans-serif",
      }}>
        <style>{`
          @keyframes radarSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
        <div style={{ position: "relative", width: 80, height: 80, marginBottom: 8 }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "1px solid #1e1e1e",
          }} />
          <div style={{
            position: "absolute", inset: 8, borderRadius: "50%",
            border: "1px solid #1a1a1a",
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 4, height: 4, borderRadius: "50%",
            background: "#8e6ff7", transform: "translate(-50%, -50%)",
            boxShadow: "0 0 8px #8e6ff755",
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 2, height: 36, transformOrigin: "top center",
            background: "linear-gradient(to bottom, #8e6ff744, transparent)",
            animation: "radarSweep 3s linear infinite",
          }} />
        </div>
        <div style={{ color: "#8e6ff7", fontSize: 22, fontWeight: "bold", letterSpacing: 0.5, animation: "fadeIn 0.5s ease-out" }}>
          gamesense<span style={{ color: "#808080" }}>.cloud</span>
        </div>
        <div style={{ color: "#555", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", animation: "fadeIn 0.5s ease-out 0.1s both" }}>
          Web Radar
        </div>
        <div style={{
          marginTop: 12, padding: "20px 28px",
          background: "#111418", border: "1px solid #1e1e1e",
          maxWidth: 380, textAlign: "center", borderRadius: 4,
          animation: "fadeIn 0.5s ease-out 0.2s both",
        }}>
          <p style={{ color: "#808080", fontSize: 12, lineHeight: 1.6, margin: "0 0 16px 0" }}>
            No active session. Start one from the DLL.
          </p>
          <div style={{ textAlign: "left", color: "#555", fontSize: 11, lineHeight: 2 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ color: "#8e6ff744", fontWeight: "bold", minWidth: 14, textAlign: "right" }}>1</span>
              <span>Load <span style={{ color: "#dcdcdc" }}>gamesense.cloud</span> in CS2</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ color: "#8e6ff744", fontWeight: "bold", minWidth: 14, textAlign: "right" }}>2</span>
              <span>Go to <span style={{ color: "#8e6ff7" }}>Settings</span> &rarr; <span style={{ color: "#8e6ff7" }}>Web Radar</span></span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ color: "#8e6ff744", fontWeight: "bold", minWidth: 14, textAlign: "right" }}>3</span>
              <span>Click <span style={{ color: "#5fc98a" }}>Start Web Radar</span></span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ color: "#8e6ff744", fontWeight: "bold", minWidth: 14, textAlign: "right" }}>4</span>
              <span>Copy the link &amp; open on any device</span>
            </div>
          </div>
        </div>
        <div style={{ color: "#ffffff0a", fontSize: 9, letterSpacing: 1, marginTop: 8, animation: "fadeIn 0.5s ease-out 0.3s both" }}>
          Scroll to zoom &middot; Drag to pan &middot; Tab for scoreboard &middot; F to follow
        </div>
      </div>
    );
  }

  const sc = STATUS_CONFIG[hud.status];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "#0a0e14", cursor: "crosshair" }}>
      <style>{`@keyframes bombPulse { from { opacity: 0.7; } to { opacity: 1; } }`}</style>
      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 36, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px",
        background: "linear-gradient(to bottom, rgba(13,13,13,0.95), rgba(13,13,13,0))",
        pointerEvents: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#8e6ff7", fontWeight: "bold", fontSize: 13, fontFamily: "Tahoma, sans-serif" }}>
            gamesense<span style={{ color: "#808080" }}>.cloud</span>
          </span>
          <span style={{ color: "#555555", fontSize: 11 }}>|</span>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, color: "#dcdcdc", fontFamily: "Tahoma, sans-serif" }}>
            {hud.status === "live" ? hud.mapDisplay : "---"}
          </span>
          {hud.bomb?.planted && (
            <span style={{
              fontSize: 11, fontWeight: "bold", color: "#e03c3c", letterSpacing: 2,
              fontFamily: "Consolas, monospace",
              animation: "bombPulse 0.5s ease-in-out infinite alternate",
            }}>
              BOMB PLANTED
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              display: "inline-block", width: 6, height: 6, borderRadius: "50%",
              background: sc.color,
              boxShadow: `0 0 4px ${sc.color}44`,
              animation: hud.status === "live" ? undefined : "none",
            }} />
            <span style={{ fontSize: 11, color: sc.color, fontFamily: "Tahoma, sans-serif" }}>
              {sc.label}
            </span>
          </div>
          {hud.status === "live" && (
            <>
              <span style={{ fontSize: 12, color: "#4a9eff", fontFamily: "Consolas, monospace" }}>
                CT {hud.ct}
              </span>
              <span style={{ fontSize: 12, color: "#e0b04b", fontFamily: "Consolas, monospace" }}>
                T {hud.t}
              </span>
              <button
                onClick={() => setShowScoreboard(v => !v)}
                style={{
                  background: "none", border: "1px solid #333", borderRadius: 3,
                  color: "#666", fontSize: 10, padding: "2px 8px", cursor: "pointer",
                  pointerEvents: "auto",
                }}
              >
                TAB
              </button>
            </>
          )}
        </div>
      </div>

      {/* Center status message when not live */}
      {hud.status !== "live" && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 5,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            padding: "20px 32px", background: "rgba(19,19,19,0.9)",
            border: "1px solid #1e1e1e", borderRadius: 2, textAlign: "center",
          }}>
            <div style={{ fontSize: 14, color: sc.color, fontFamily: "Tahoma, sans-serif", fontWeight: "bold" }}>
              {sc.label}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "#555", fontFamily: "Tahoma, sans-serif" }}>
              {hud.status === "no_session" && "No active DLL session found for this link."}
              {hud.status === "stale" && "DLL stopped sending data. Session may have ended."}
              {hud.status === "waiting" && (hud.reason === "sdk_not_initialized"
                ? "DLL connected — waiting for SDK to initialize..."
                : "DLL connected — waiting for game to start...")}
              {hud.status === "connecting" && "Connecting to session..."}
              {hud.status === "error" && "Failed to reach the server."}
            </div>
          </div>
        </div>
      )}

      {/* Debug overlay (bottom-left) — toggle with D key */}
      {showDebug && (
        <div style={{
          position: "absolute", bottom: 28, left: 8, zIndex: 10,
          fontSize: 9, color: "#444", fontFamily: "Consolas, monospace",
          pointerEvents: "none", lineHeight: 1.6,
          background: "rgba(0,0,0,0.6)", padding: "6px 8px", borderRadius: 2,
          maxHeight: "40vh", overflowY: "auto",
        }}>
          <div style={{ color: "#666", marginBottom: 2 }}>-- debug (D to hide) --</div>
          <div>polls: {hud.pollCount} | status: {hud.status}</div>
          {hud.reason && <div>reason: {hud.reason}</div>}
          {hud.age != null && <div>age: {Math.round(hud.age)}ms</div>}
          <div>session: {session?.slice(0, 8)}…</div>
          {hud.localPlayer && (
            <div style={{ color: "#8e6ff7" }}>
              local: ({Math.round(hud.localPlayer.x)}, {Math.round(hud.localPlayer.y)}, {Math.round(hud.localPlayer.z)}) hp={hud.localPlayer.health} team={hud.localPlayer.team}
            </div>
          )}
          {hud.entityScan && (
            <div>
              entities: {hud.entityScan.added} found | {hud.entityScan.null} null | {hud.entityScan.noPawn} noPawn | {hud.entityScan.badPos ?? hud.entityScan.noTeam ?? 0} badPos
            </div>
          )}
          {hud.players && hud.players.length > 0 && (
            <div style={{ color: "#4a9eff" }}>
              players({hud.players.length}): {hud.players.map((p, i) => `[${p.name}:t${p.team} (${Math.round(p.x)},${Math.round(p.y)}) hp${p.health}]`).join(" ")}
            </div>
          )}
          {hud.debug && (
            <div style={{ maxWidth: 350, wordBreak: "break-all" }}>
              sdk: {Object.entries(hud.debug).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" ")}
            </div>
          )}
          {hud.bomb && (
            <div style={{ color: hud.bomb.planted ? "#e03c3c" : "#e0b04b" }}>
              bomb: ({Math.round(hud.bomb.x)}, {Math.round(hud.bomb.y)}, {Math.round(hud.bomb.z)}) {hud.bomb.planted ? "PLANTED" : "carried"}
            </div>
          )}
          {hud.entDebug && hud.entDebug.length > 0 && (
            <div style={{ maxWidth: 400, wordBreak: "break-all", marginTop: 2, color: "#555" }}>
              ents: {hud.entDebug.map(e => `[${e.i}:ct${e.ct} pt${e.pt} h1=${e.h1} h2=${e.h2} pawn=${e.pawn}]`).join(" ")}
            </div>
          )}
        </div>
      )}

      {/* Compact player list (right side) */}
      {hud.status === "live" && hud.players && hud.players.length > 0 && !showScoreboard && (
        <div style={{
          position: "absolute", top: 44, right: 8, zIndex: 10,
          pointerEvents: "none", fontFamily: "Tahoma, sans-serif",
        }}>
          {hud.players.filter(p => p.alive).map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 6, marginBottom: 3,
              opacity: 0.8,
            }}>
              <span style={{
                width: 3, height: 3, borderRadius: "50%",
                background: p.enemy ? "#e0656a" : "#4a9eff",
                display: "inline-block", flexShrink: 0,
              }} />
              <div style={{ minWidth: 60 }}>
                <div style={{ fontSize: 9, color: p.enemy ? "#e0656a99" : "#4a9eff99" }}>
                  {p.name?.length > 10 ? p.name.slice(0, 10) + ".." : p.name}
                </div>
                {p.weapon && (
                  <div style={{ fontSize: 7, color: weaponColor(p.weapon), marginTop: -1 }}>
                    {weaponDisplayName(p.weapon)}{p.scoped ? " [S]" : ""}{p.defusing ? " [DEF]" : ""}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <div style={{
                  width: 30, height: 3, background: "#1a1a1a", borderRadius: 1, overflow: "hidden",
                }}>
                  <div style={{
                    width: `${p.health}%`, height: "100%",
                    background: p.health > 50 ? "#5fc98a" : p.health > 25 ? "#e0b04b" : "#e0656a",
                  }} />
                </div>
                {(p.armor ?? 0) > 0 && (
                  <div style={{
                    width: 30, height: 2, background: "#1a1a1a", borderRadius: 1, overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${p.armor}%`, height: "100%",
                      background: "#4a9eff55",
                    }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scoreboard overlay (hold Tab) */}
      {showScoreboard && hud.status === "live" && (
        <div
          onClick={() => setShowScoreboard(false)}
          style={{
            position: "absolute", inset: 0, zIndex: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(10,14,20,0.85)", cursor: "pointer",
          }}
        >
          <div style={{
            background: "#111418", border: "1px solid #1e1e1e", borderRadius: 4,
            minWidth: 340, maxWidth: 500, padding: "16px 0",
            fontFamily: "Tahoma, Verdana, sans-serif",
          }}>
            <div style={{ textAlign: "center", fontSize: 13, color: "#dcdcdc", fontWeight: "bold", marginBottom: 12, letterSpacing: 1 }}>
              {hud.map}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 4 }}>
              <span style={{ fontSize: 18, fontWeight: "bold", color: "#4a9eff" }}>CT {hud.ct}</span>
              <span style={{ fontSize: 14, color: "#555", alignSelf: "center" }}>vs</span>
              <span style={{ fontSize: 18, fontWeight: "bold", color: "#e0b04b" }}>T {hud.t}</span>
            </div>
            {(() => {
              const allPlayers = [...(hud.localPlayer ? [{ ...hud.localPlayer, alive: true } as Player] : []), ...(hud.players ?? [])];
              const ctMoney = allPlayers.filter(p => p.team === 3 && p.alive).reduce((s, p) => s + (p.money ?? 0), 0);
              const tMoney = allPlayers.filter(p => p.team === 2 && p.alive).reduce((s, p) => s + (p.money ?? 0), 0);
              return (ctMoney > 0 || tMoney > 0) ? (
                <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 12 }}>
                  <span style={{ fontSize: 10, color: "#4a9eff55", fontFamily: "Consolas, monospace" }}>${ctMoney.toLocaleString()}</span>
                  <span style={{ fontSize: 10, color: "#5fc98a33", fontFamily: "Consolas, monospace" }}>economy</span>
                  <span style={{ fontSize: 10, color: "#e0b04b55", fontFamily: "Consolas, monospace" }}>${tMoney.toLocaleString()}</span>
                </div>
              ) : <div style={{ marginBottom: 8 }} />;
            })()}
            {/* CT players */}
            <div style={{ padding: "0 16px", marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: "#4a9eff88", letterSpacing: 1, marginBottom: 4 }}>COUNTER-TERRORISTS</div>
              {[...(hud.localPlayer?.team === 3 ? [{
                ...hud.localPlayer, name: "You", alive: true, enemy: false,
              } as Player] : []),
              ...(hud.players?.filter(p => p.team === 3) ?? [])].map((p, i) => (
                <div key={`ct-${i}`} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "3px 0",
                  opacity: p.alive ? 1 : 0.35,
                }}>
                  <span style={{
                    width: 4, height: 4, borderRadius: "50%",
                    background: p.alive ? "#4a9eff" : "#333",
                    display: "inline-block", flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#dcdcdc", display: "flex", gap: 4, alignItems: "center" }}>
                      {p.name}
                      {p.helmet && <span style={{ fontSize: 7, color: "#4a9eff55" }}>H</span>}
                      {p.defuser && <span style={{ fontSize: 7, color: "#5fc98a55" }}>D</span>}
                    </div>
                    {p.alive && p.weapon && (
                      <div style={{ fontSize: 8, color: "#777", marginTop: -1 }}>{weaponDisplayName(p.weapon)}</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: p.alive ? "#4a9eff" : "#555", fontFamily: "Consolas, monospace" }}>
                      {p.alive ? `${p.health}hp` : "DEAD"}
                    </div>
                    {p.alive && (p.armor ?? 0) > 0 && (
                      <div style={{ fontSize: 8, color: "#4a9eff55", fontFamily: "Consolas, monospace" }}>
                        {p.armor}ap
                      </div>
                    )}
                    {p.alive && (p.money ?? 0) > 0 && (
                      <div style={{ fontSize: 8, color: "#5fc98a44", fontFamily: "Consolas, monospace" }}>
                        ${p.money}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* T players */}
            <div style={{ padding: "0 16px" }}>
              <div style={{ fontSize: 9, color: "#e0b04b88", letterSpacing: 1, marginBottom: 4 }}>TERRORISTS</div>
              {[...(hud.localPlayer?.team === 2 ? [{
                ...hud.localPlayer, name: "You", alive: true, enemy: false,
              } as Player] : []),
              ...(hud.players?.filter(p => p.team === 2) ?? [])].map((p, i) => (
                <div key={`t-${i}`} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "3px 0",
                  opacity: p.alive ? 1 : 0.35,
                }}>
                  <span style={{
                    width: 4, height: 4, borderRadius: "50%",
                    background: p.alive ? "#e0b04b" : "#333",
                    display: "inline-block", flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#dcdcdc", display: "flex", gap: 4, alignItems: "center" }}>
                      {p.name}
                      {p.helmet && <span style={{ fontSize: 7, color: "#e0b04b55" }}>H</span>}
                    </div>
                    {p.alive && p.weapon && (
                      <div style={{ fontSize: 8, color: "#777", marginTop: -1 }}>{weaponDisplayName(p.weapon)}</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: p.alive ? "#e0b04b" : "#555", fontFamily: "Consolas, monospace" }}>
                      {p.alive ? `${p.health}hp` : "DEAD"}
                    </div>
                    {p.alive && (p.armor ?? 0) > 0 && (
                      <div style={{ fontSize: 8, color: "#e0b04b55", fontFamily: "Consolas, monospace" }}>
                        {p.armor}ap
                      </div>
                    )}
                    {p.alive && (p.money ?? 0) > 0 && (
                      <div style={{ fontSize: 8, color: "#5fc98a44", fontFamily: "Consolas, monospace" }}>
                        ${p.money}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 9, color: "#333" }}>
              Tab or tap to close
            </div>
          </div>
        </div>
      )}

      {/* Bomb planted banner */}
      {hud.status === "live" && hud.bomb?.planted && (
        <div style={{
          position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)", zIndex: 15,
          padding: "4px 20px", pointerEvents: "none",
          background: "rgba(224,60,60,0.15)", border: "1px solid rgba(224,60,60,0.3)",
          borderRadius: 2, fontFamily: "Tahoma, sans-serif",
          animation: "bombPulse 1s ease-in-out infinite alternate",
        }}>
          <span style={{ fontSize: 11, fontWeight: "bold", color: "#e03c3c", letterSpacing: 2 }}>
            BOMB PLANTED
          </span>
        </div>
      )}

      {/* Zoom indicator (bottom-right) */}
      <div style={{
        position: "absolute", bottom: 28, right: 12, zIndex: 10,
        pointerEvents: "none", fontFamily: "Consolas, monospace",
        fontSize: 10, color: "#ffffff22",
      }}>
        {zoomDisplay}%
      </div>

      {/* Bottom bar */}
      <div style={{
        position: "absolute", bottom: 8, left: 0, right: 0,
        textAlign: "center", pointerEvents: "none", zIndex: 10,
        color: "#ffffff15", fontSize: 10, letterSpacing: 2,
        fontFamily: "Tahoma, sans-serif",
      }}>
        gamesense.cloud
        {hud.map === "DE_NUKE" && (
          <span style={{ color: showLower ? "#e0b04b44" : "#4a9eff44", marginLeft: 12, cursor: "pointer", pointerEvents: "auto" }}
            onClick={() => setShowLower(v => !v)}>
            [N] {showLower ? "LOWER" : "UPPER"}
          </span>
        )}
        {!showDebug && <span style={{ color: "#ffffff0a", marginLeft: 12 }}>[D] debug &middot; [F] follow &middot; scroll zoom &middot; drag pan &middot; dbl-click reset</span>}
      </div>

      {/* Flash overlay when local player is flashed */}
      {flashOverlay > 0 && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 25,
          background: `rgba(255,255,255,${flashOverlay.toFixed(2)})`,
          pointerEvents: "none",
          transition: "background 0.15s ease-out",
        }} />
      )}

      {/* Kill feed (top-right, below player list) */}
      {killFeed.length > 0 && hud.status === "live" && !showScoreboard && (
        <div style={{
          position: "absolute", top: 44, left: 8, zIndex: 12,
          pointerEvents: "none", fontFamily: "Tahoma, sans-serif",
        }}>
          {killFeed.map((k, i) => {
            const age = Date.now() - k.time;
            const opacity = age > 6000 ? Math.max(0, 1 - (age - 6000) / 2000) : 1;
            return (
              <div key={`${k.name}-${k.time}`} style={{
                fontSize: 10, marginBottom: 2, opacity,
                color: k.team === 3 ? "#4a9eff" : k.team === 2 ? "#e0b04b" : "#888",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <span style={{ color: "#e0656a", fontSize: 8 }}>&#x2620;</span>
                {k.name}
              </div>
            );
          })}
        </div>
      )}

      {/* Follow mode indicator */}
      {followMode && hud.status === "live" && (
        <div style={{
          position: "absolute", bottom: 44, right: 12, zIndex: 10,
          pointerEvents: "none", fontFamily: "Consolas, monospace",
          fontSize: 9, color: "#8e6ff744", letterSpacing: 1,
        }}>
          FOLLOW
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}

export default function RadarPage() {
  return (
    <Suspense fallback={
      <div style={{
        position: "fixed", inset: 0, background: "#0a0e14",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#808080", fontFamily: "Tahoma, sans-serif", fontSize: 13,
      }}>
        Loading radar...
      </div>
    }>
      <RadarCanvas />
    </Suspense>
  );
}
