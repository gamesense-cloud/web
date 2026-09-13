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

interface Player {
  x: number; y: number; z: number;
  team: number; alive: boolean; health: number;
  name: string; dormant: boolean; enemy: boolean;
  yaw?: number;
}

interface GameData {
  connected: boolean;
  map?: string;
  localPlayer?: Player & { yaw: number };
  players?: Player[];
}

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
  const gameDataRef = useRef<GameData | null>(null);
  const prevPosRef = useRef<Record<string, Player>>({});
  const currPosRef = useRef<Record<string, Player>>({});
  const lastUpdateRef = useRef(0);
  const connectedRef = useRef(false);
  const zoomRef = useRef(1.0);
  const panRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0 });
  const mapImgRef = useRef<Record<string, HTMLImageElement | null>>({});
  const [status, setStatus] = useState<{ connected: boolean; map: string; ct: number; t: number }>({
    connected: false, map: "---", ct: 0, t: 0,
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
        try {
          const res = await fetch(`/api/radar/data?session=${session}`);
          if (!res.ok) throw new Error();
          const data: GameData = await res.json();

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
          connectedRef.current = !!data.connected;

          // Update status for the HUD
          let ct = 0, t = 0;
          if (data.connected) {
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
          setStatus({
            connected: !!data.connected,
            map: data.map?.toUpperCase() || "---",
            ct, t,
          });
        } catch {
          connectedRef.current = false;
          setStatus(s => ({ ...s, connected: false }));
        }
        await new Promise(r => setTimeout(r, 200));
      }
    }

    poll();
    return () => { alive = false; };
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

    c.addEventListener("wheel", onWheel, { passive: false });
    c.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    c.addEventListener("dblclick", onDbl);
    return () => {
      c.removeEventListener("wheel", onWheel);
      c.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      c.removeEventListener("dblclick", onDbl);
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

    function drawViewCone(ctx: CanvasRenderingContext2D, cx: number, cy: number, yaw: number) {
      const angle = -yaw * Math.PI / 180;
      const half = 30 * Math.PI / 180;
      const len = 35;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle - half) * len, cy + Math.sin(angle - half) * len);
      ctx.arc(cx, cy, len, angle - half, angle + half);
      ctx.closePath();
      ctx.fillStyle = "rgba(142,111,247,0.15)";
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

      if (isLocal && yaw != null) drawViewCone(ctx, pos.x, pos.y, yaw);

      const r = isLocal ? 7 : 5;
      ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1; ctx.stroke();

      drawHealthArc(ctx, pos.x, pos.y, r + 3, health || 100, color);

      if (name) {
        ctx.font = "10px Tahoma, Verdana, sans-serif";
        ctx.fillStyle = nameColor;
        ctx.fillText(name, pos.x + r + 5, pos.y + 3);
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

      // Try to load and draw map image
      if (mapName && mapInfo) {
        const imgKey = mapName;
        if (!(imgKey in mapImgRef.current)) {
          mapImgRef.current[imgKey] = null;
          const img = new Image();
          img.src = `/maps/${mapName}_radar.png`;
          img.onload = () => { mapImgRef.current[imgKey] = img; };
          img.onerror = () => { mapImgRef.current[imgKey] = null; };
        }
        const mapImg = mapImgRef.current[imgKey];
        if (mapImg) {
          ctx.globalAlpha = 0.6;
          ctx.drawImage(mapImg, 0, 0, radarSize, radarSize);
          ctx.globalAlpha = 1;
        }
      }

      drawGrid(ctx, 0, 0, radarSize);

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
            drawPlayer(ctx, pos, false, ip.enemy, ip.dormant, ip.alive, ip.health, ip.name);
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
        background: "var(--shell)", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
        fontFamily: "var(--ui)",
      }}>
        <div style={{ color: "var(--accent)", fontSize: 20, fontWeight: "bold" }}>
          gamesense<span style={{ color: "var(--dim)" }}>.cloud</span>
        </div>
        <div style={{ color: "var(--text)", fontSize: 14 }}>Web Radar</div>
        <div style={{
          marginTop: 24, padding: "16px 24px",
          background: "var(--surface)", border: "1px solid var(--border)",
          maxWidth: 400, textAlign: "center",
        }}>
          <p style={{ color: "var(--dim)", fontSize: 12, lineHeight: 1.6, margin: 0 }}>
            No session ID provided. Enable the web radar from the cheat to get a shareable link.
          </p>
          <pre style={{
            marginTop: 12, padding: "8px 12px",
            background: "var(--field)", border: "1px solid var(--border)",
            color: "var(--faint)", fontSize: 11, fontFamily: "var(--mono)",
          }}>
            radar.start()
          </pre>
        </div>
      </div>
    );
  }

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
            {status.map}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              display: "inline-block", width: 6, height: 6, borderRadius: "50%",
              background: status.connected ? "#5fc98a" : "#e0656a",
              boxShadow: `0 0 4px ${status.connected ? "#5fc98a44" : "#e0656a44"}`,
            }} />
            <span style={{ fontSize: 11, color: status.connected ? "#5fc98a" : "#e0656a", fontFamily: "Tahoma, sans-serif" }}>
              {status.connected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
          <span style={{ fontSize: 12, color: "#4a9eff", fontFamily: "Consolas, monospace" }}>
            CT {status.ct}
          </span>
          <span style={{ fontSize: 12, color: "#e0b04b", fontFamily: "Consolas, monospace" }}>
            T {status.t}
          </span>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: "absolute", bottom: 8, left: 0, right: 0,
        textAlign: "center", pointerEvents: "none", zIndex: 10,
        color: "#ffffff15", fontSize: 10, letterSpacing: 2,
        fontFamily: "Tahoma, sans-serif",
      }}>
        gamesense.cloud web radar
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
