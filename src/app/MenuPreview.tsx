"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as I from "./icons";

// The example scripts that ship with the client, as the menu lists them.
const SCRIPTS = [
  { file: "controls.lua", name: "Controls", desc: "Every control type using the Tab + Child API." },
  { file: "discord_rpc.lua", name: "discord_rpc", desc: "Discord Rich Presence for gamesense.cloud, talking to Discord over named pipes through FFI." },
  { file: "events.lua", name: "Events", desc: "Subscribes to host events using the Starline API." },
  { file: "hello.lua", name: "Hello", desc: "The smallest useful script: logging and metadata." },
  { file: "painting.lua", name: "Painting", desc: "Draws a clock face and a grid on the canvas behind the menu." },
  { file: "player_esp.lua", name: "Player ESP", desc: "Player ESP with boxes, health bars, names, distance, and snaplines." },
  { file: "storage.lua", name: "Storage", desc: "Persistent values, JSON, and the sandboxed file area." },
  { file: "timers.lua", name: "Timers", desc: "Delayed, repeating and next-frame work." },
];

const PAGES = [
  { label: "Scripts", Icon: I.Code },
  { label: "Web", Icon: I.Globe },
  { label: "Radar", Icon: I.Radar },
  { label: "Nades", Icon: I.Nade },
  { label: "Shaders", Icon: I.Shader },
  { label: "Exploits", Icon: I.Bolt },
];

const DESIGN_WIDTH = 900; // below this the whole window scales down instead of reflowing

function toggled(set: Set<string>, key: string) {
  const next = new Set(set);
  if (!next.delete(key)) next.add(key);
  return next;
}

export default function MenuPreview() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState("player_esp.lua");
  const [running, setRunning] = useState(() => new Set(["player_esp.lua"]));
  const [startup, setStartup] = useState(() => new Set<string>());
  const [fps, setFps] = useState(240);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => setScale(Math.min(1, frame.clientWidth / DESIGN_WIDTH));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setFps(236 + Math.round(Math.random() * 16)), 1000);
    return () => clearInterval(timer);
  }, []);

  const needle = filter.toLowerCase().trim();
  const list = SCRIPTS.filter((s) => `${s.name} ${s.file}`.toLowerCase().includes(needle));
  const current = SCRIPTS.find((s) => s.file === selected) ?? SCRIPTS[0];
  const live = running.has(current.file);

  return (
    <div className="mp-wrap">
      <div ref={frameRef} className="mp-frame" style={{ visibility: scale ? "visible" : "hidden" }}>
        <div className="mp window" style={{ transform: `scale(${scale || 1})` }}>
          <div className="mp-side">
            <div className="mp-brand">gamesense<i>.cloud</i></div>
            <div className="mp-search"><I.Search size={12} />Search</div>
            <div className="mp-nav">
              {PAGES.map(({ label, Icon }, i) => (
                <span key={label} className={i === 0 ? "on" : undefined}><Icon size={14} />{label}</span>
              ))}
            </div>
            <div className="rule" />
            <div className="label">Script tabs</div>
            <div className="mp-note">No script tabs</div>
            <div className="mp-foot">
              <div className="rule" />
              <div className="mp-nav"><span><I.Gear size={14} />Settings</span></div>
              <div className="mp-status">{running.size} loaded · {fps} fps</div>
            </div>
          </div>

          <div className="mp-main">
            <div className="mp-head">Scripts</div>
            <div className="mp-tools">
              <input
                className="field"
                placeholder="Search scripts"
                aria-label="Filter scripts"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <span className="mp-select" style={{ width: 104 }}>All<I.Caret size={12} /></span>
              <span className="mp-select" style={{ width: 124 }}>By name<I.Caret size={12} /></span>
              <button type="button" className="btn">Rescan</button>
              <button type="button" className="btn">New script</button>
              <button type="button" className="btn">Open folder</button>
            </div>

            <div className="mp-body">
              <div className="panel mp-list">
                {list.map((s) => {
                  const on = running.has(s.file);
                  return (
                    <div key={s.file} className={s.file === current.file ? "row on" : "row"} onClick={() => setSelected(s.file)}>
                      <span className={on ? "dot ok pulse" : "dot"} />
                      <div className="min-w-0">
                        <b>{s.name}</b>
                        <small>{s.file} - {on ? "Running" : "Discovered"}</small>
                      </div>
                    </div>
                  );
                })}
                {list.length === 0 && <div className="mp-note py-3">No scripts match.</div>}
              </div>

              <div className="panel mp-detail">
                <div className="flex items-center gap-2.5">
                  <b>{current.name}</b>
                  <span className={live ? "badge ok" : "badge"}>{live ? "Running" : "Discovered"}</span>
                </div>
                <p>{current.desc}</p>
                <div className="rule" />
                <div className="mp-actions">
                  <button type="button" className="btn" onClick={() => setRunning((r) => toggled(r, current.file))}>
                    {live ? "Unload" : "Load"}
                  </button>
                  <button type="button" className="btn">Reload</button>
                  <button type="button" className="btn">Edit</button>
                  <button type="button" className="btn">Delete</button>
                </div>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={startup.has(current.file)}
                    onChange={() => setStartup((s) => toggled(s, current.file))}
                  />
                  Load this script at startup
                </label>
              </div>
            </div>
          </div>

          <I.Grip className="mp-grip" size={12} />
        </div>
      </div>
    </div>
  );
}
