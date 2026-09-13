"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const MAPS: Record<string, { x: number; y: number; scale: number }> = {
  de_dust2:   { x: -2476, y: 3239, scale: 4.4 },
  de_mirage:  { x: -3230, y: 1713, scale: 5.0 },
  de_inferno: { x: -2087, y: 3870, scale: 4.9 },
  de_nuke:    { x: -3453, y: 2887, scale: 7.0 },
  de_ancient: { x: -2953, y: 2164, scale: 5.0 },
  de_anubis:  { x: -2796, y: 3328, scale: 5.22 },
  de_overpass:{ x: -4831, y: 1781, scale: 5.2 },
  de_vertigo: { x: -3168, y: 1762, scale: 4.0 },
  de_train:   { x: -2477, y: 2392, scale: 4.7 },
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
};

interface Player {
  x: number; y: number; z: number;
  team: number; alive: boolean; health: number;
  name: string; dormant: boolean; enemy: boolean;
  yaw?: number;
}

interface EntDebug {
  i: number; ct: number; pt: number; h1: string; h2: string; pawn: boolean;
}

interface ApiResponse {
  status: "live" | "waiting" | "stale" | "no_session" | "error";
  connected: boolean;
  reason?: string;
  age_ms?: number;
  map?: string;
  localPlayer?: Player & { yaw: number };
  players?: Player[];
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

  const [hud, setHud] = useState<{
    status: RadarStatus; map: string; ct: number; t: number;
    reason?: string; age?: number; pollCount: number;
    debug?: Record<string, unknown>;
    entityScan?: { total: number; null: number; noPawn: number; badPos?: number; noTeam?: number; added: number };
    entDebug?: EntDebug[];
    players?: Player[];
    localPlayer?: { x: number; y: number; z: number; health: number; team: number };
  }>({
    status: "connecting", map: "---", ct: 0, t: 0, pollCount: 0,
  });

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

          setHud({
            status: radarStatus,
            map: data.map?.toUpperCase() || "---",
            ct, t,
            reason: data.reason,
            age: data.age_ms,
            pollCount: n,
            debug: data.debug,
            entityScan: data.entityScan,
            entDebug: data.entDebug,
            players: data.players,
            localPlayer: data.localPlayer ? {
              x: data.localPlayer.x, y: data.localPlayer.y, z: data.localPlayer.z,
              health: data.localPlayer.health, team: data.localPlayer.team,
            } : undefined,
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
    function onDbl() { zoomRef.current = 1.0; panRef.current = { x: 0, y: 0 }; }

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
      isAlive: boolean, health: number, name: string, yaw?: number
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
      ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1; ctx.stroke();

      const hpColor = health > 60 ? "#5fc98a" : health > 25 ? "#e0b04b" : "#e0656a";
      drawHealthArc(ctx, pos.x, pos.y, r + 3, health || 100, hpColor);

      if (name) {
        ctx.font = "10px Tahoma, Verdana, sans-serif";
        ctx.fillStyle = nameColor;
        ctx.fillText(name, pos.x + r + 5, pos.y + 3);
      }
      if (health > 0 && health < 50) {
        ctx.font = "bold 8px Tahoma, sans-serif";
        ctx.fillStyle = hpColor;
        ctx.fillText(`${health}`, pos.x + r + 5, pos.y + 13);
      }
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
      if (mapName && mapInfo) {
        const imgPath = MAP_IMAGES[mapName];
        if (imgPath) {
          // Load image if map changed
          if (mapImgNameRef.current !== mapName) {
            mapImgNameRef.current = mapName;
            const img = new Image();
            img.src = imgPath;
            img.onload = () => { mapImgRef.current = img; };
            img.onerror = () => { mapImgRef.current = null; };
          }
          // Draw loaded image
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

      if (data?.connected && mapInfo) {
        if (data.localPlayer) {
          const lp = getInterpolated("__local", data.localPlayer);
          const pos = worldToCanvas(lp.x, lp.y, mapInfo, radarSize, 0, 0);
          drawPlayer(ctx, pos, true, false, false, true, lp.health, lp.name, lp.yaw ?? data.localPlayer.yaw);
        }

        if (data.players) {
          for (let i = 0; i < data.players.length; i++) {
            const p = data.players[i];
            const key = p.name || `p${i}`;
            const ip = getInterpolated(key, p);
            const pos = worldToCanvas(ip.x, ip.y, mapInfo, radarSize, 0, 0);
            drawPlayer(ctx, pos, false, ip.enemy, ip.dormant, ip.alive, ip.health, ip.name, ip.yaw ?? p.yaw);
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
        alignItems: "center", justifyContent: "center", gap: 16,
        fontFamily: "Tahoma, Verdana, sans-serif",
      }}>
        <div style={{ color: "#8e6ff7", fontSize: 20, fontWeight: "bold" }}>
          gamesense<span style={{ color: "#808080" }}>.cloud</span>
        </div>
        <div style={{ color: "#dcdcdc", fontSize: 14 }}>Web Radar</div>
        <div style={{
          marginTop: 24, padding: "16px 24px",
          background: "#131313", border: "1px solid #1e1e1e",
          maxWidth: 400, textAlign: "center", borderRadius: 2,
        }}>
          <p style={{ color: "#808080", fontSize: 12, lineHeight: 1.6, margin: 0 }}>
            No session ID provided. Enable the web radar from the cheat to get a shareable link.
          </p>
        </div>
      </div>
    );
  }

  const sc = STATUS_CONFIG[hud.status];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "#0a0e14", cursor: "crosshair" }}>
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
            {hud.status === "live" ? hud.map : "---"}
          </span>
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
              display: "flex", alignItems: "center", gap: 6, marginBottom: 2,
              opacity: 0.8,
            }}>
              <span style={{
                width: 3, height: 3, borderRadius: "50%",
                background: p.enemy ? "#e0656a" : "#4a9eff",
                display: "inline-block",
              }} />
              <span style={{ fontSize: 9, color: p.enemy ? "#e0656a99" : "#4a9eff99", minWidth: 60 }}>
                {p.name?.length > 10 ? p.name.slice(0, 10) + ".." : p.name}
              </span>
              <div style={{
                width: 30, height: 3, background: "#1a1a1a", borderRadius: 1, overflow: "hidden",
              }}>
                <div style={{
                  width: `${p.health}%`, height: "100%",
                  background: p.health > 50 ? "#5fc98a" : p.health > 25 ? "#e0b04b" : "#e0656a",
                }} />
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
            <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 12 }}>
              <span style={{ fontSize: 18, fontWeight: "bold", color: "#4a9eff" }}>CT {hud.ct}</span>
              <span style={{ fontSize: 14, color: "#555", alignSelf: "center" }}>vs</span>
              <span style={{ fontSize: 18, fontWeight: "bold", color: "#e0b04b" }}>T {hud.t}</span>
            </div>
            {/* CT players */}
            <div style={{ padding: "0 16px", marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: "#4a9eff88", letterSpacing: 1, marginBottom: 4 }}>COUNTER-TERRORISTS</div>
              {[...(hud.localPlayer?.team === 3 ? [{
                name: "You", health: hud.localPlayer.health, alive: true, team: 3, enemy: false,
              }] : []),
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
                  <span style={{ fontSize: 11, color: "#dcdcdc", flex: 1 }}>{p.name}</span>
                  <span style={{ fontSize: 10, color: p.alive ? "#4a9eff" : "#555", fontFamily: "Consolas, monospace", width: 36, textAlign: "right" }}>
                    {p.alive ? `${p.health}hp` : "DEAD"}
                  </span>
                </div>
              ))}
            </div>
            {/* T players */}
            <div style={{ padding: "0 16px" }}>
              <div style={{ fontSize: 9, color: "#e0b04b88", letterSpacing: 1, marginBottom: 4 }}>TERRORISTS</div>
              {[...(hud.localPlayer?.team === 2 ? [{
                name: "You", health: hud.localPlayer.health, alive: true, team: 2, enemy: false,
              }] : []),
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
                  <span style={{ fontSize: 11, color: "#dcdcdc", flex: 1 }}>{p.name}</span>
                  <span style={{ fontSize: 10, color: p.alive ? "#e0b04b" : "#555", fontFamily: "Consolas, monospace", width: 36, textAlign: "right" }}>
                    {p.alive ? `${p.health}hp` : "DEAD"}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 9, color: "#333" }}>
              Tab or tap to close
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        position: "absolute", bottom: 8, left: 0, right: 0,
        textAlign: "center", pointerEvents: "none", zIndex: 10,
        color: "#ffffff15", fontSize: 10, letterSpacing: 2,
        fontFamily: "Tahoma, sans-serif",
      }}>
        gamesense.cloud web radar {!showDebug && <span style={{ color: "#ffffff0a", marginLeft: 12 }}>[D] debug</span>}
      </div>

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
