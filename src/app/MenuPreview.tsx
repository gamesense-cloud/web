"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Hint from "./Hint";
import * as I from "./icons";

// The example scripts that ship with the client, as the menu's Scripts page lists them; `tab` is
// the menu tab a script adds while it runs.
const SCRIPTS = [
  { file: "controls.lua", name: "Controls", version: "3.0.0", tab: "Controls", desc: "Every control type using the Tab + Child API." },
  { file: "discord_rpc.lua", name: "discord_rpc", desc: "Discord Rich Presence for gamesense.cloud, talking to Discord over named pipes through FFI." },
  { file: "events.lua", name: "Events", version: "1.0.0", desc: "Subscribes to host events using the Starline API." },
  { file: "hello.lua", name: "Hello", version: "1.0.0", desc: "The smallest useful script: logging and metadata." },
  { file: "painting.lua", name: "Painting", version: "1.0.0", desc: "Draws a clock face and a grid on the canvas behind the menu." },
  { file: "player_esp.lua", name: "Player ESP", version: "2.0.0", tab: "Player ESP", desc: "Player ESP with boxes, health bars, names, distance, and snaplines." },
  { file: "storage.lua", name: "Storage", version: "1.0.0", desc: "Persistent values, JSON, and the sandboxed file area." },
  { file: "timers.lua", name: "Timers", version: "1.0.0", desc: "Delayed, repeating and next-frame work." },
];

// The menu's pages, top to bottom.
const PAGES = [
  { label: "Scripts", Icon: I.Code },
  { label: "Web", Icon: I.Globe },
  { label: "Helper", Icon: I.Nade },
  { label: "Shaders", Icon: I.Shader },
  { label: "Features", Icon: I.Star },
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
  const tabs = SCRIPTS.filter((s) => s.tab && running.has(s.file));

  return (
    <div className="mp-wrap">
      <div ref={frameRef} className="mp-frame" style={{ visibility: scale ? "visible" : "hidden" }}>
        <div className="mp window" style={{ transform: `scale(${scale || 1})` }}>
          <div className="mp-side">
            <div className="mp-brand">gamesense<i>.cloud</i></div>
            <div className="mp-search"><I.Search size={11} />Search</div>
            <div className="mp-nav">
              {PAGES.map(({ label, Icon }, i) => (
                <span key={label} className={i === 0 ? "on" : undefined}><Icon size={13} />{label}</span>
              ))}
            </div>
            <div className="mp-rule" />
            <div className="mp-label">Script tabs</div>
            <div className="mp-nav mp-tabs">
              {tabs.map((s) => <span key={s.file}><i />{s.tab}</span>)}
              {tabs.length === 0 && <em>No script tabs</em>}
            </div>
            <div className="mp-foot">
              <div className="mp-rule" />
              <div className="mp-nav"><span><I.Gear size={13} />Settings</span></div>
              <div className="mp-status">{running.size} loaded · {fps} fps</div>
            </div>
          </div>

          <div className="mp-main">
            <div className="mp-head">
              Scripts
              <span className="mp-actions">
                <button type="button" className="btn">Rescan<Hint text="Looks through the scripts folder again (F5)." down end /></button>
                <button type="button" className="btn primary">New<Hint text="Creates a new script." down end /></button>
                <button type="button" className="btn">Open folder<Hint text="Opens the scripts folder in Explorer." down end /></button>
              </span>
            </div>

            <div className="mp-body">
              <div className="group mp-library">
                <span className="group-title">Library</span>
                <div className="mp-filter">
                  <input
                    className="field"
                    placeholder="Filter"
                    aria-label="Filter scripts"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  <span className="mp-select">All<I.Caret size={11} /></span>
                  <span className="mp-select">Name<I.Caret size={11} /></span>
                </div>
                <div className="mp-list">
                  {list.map((s) => {
                    const on = running.has(s.file);
                    return (
                      <div key={s.file} className={`mp-row${s.file === current.file ? " on" : ""}${on ? " live" : ""}`} onClick={() => setSelected(s.file)}>
                        <span className={on ? "dot ok" : "dot"} />
                        <span className="mp-row-name">{s.name}</span>
                        {startup.has(s.file) && <span className="badge">auto</span>}
                        <small>{s.version && `v${s.version}`}</small>
                      </div>
                    );
                  })}
                  {list.length === 0 && <em>Nothing matches the filter.</em>}
                </div>
              </div>

              <div className="group mp-detail">
                <span className="group-title">Script</span>
                <div className="mp-title">
                  <b>{current.name}</b>
                  <span className={live ? "badge ok" : "badge"}>{live ? "Running" : "Discovered"}</span>
                </div>
                <small className="mp-meta">by gscloud{current.version && ` · v${current.version}`} · {current.file}</small>
                <p>{current.desc}</p>
                <div className="mp-rule" />
                <div className="mp-buttons">
                  <button type="button" className="btn primary" onClick={() => setRunning((r) => toggled(r, current.file))}>
                    {live ? "Unload" : "Load"}
                  </button>
                  <button type="button" className="btn">Reload</button>
                  <button type="button" className="btn">Edit</button>
                  <button type="button" className="btn danger">Delete</button>
                </div>
                <label className="check hint-row">
                  <input
                    type="checkbox"
                    checked={startup.has(current.file)}
                    onChange={() => setStartup((s) => toggled(s, current.file))}
                  />
                  Load at startup
                  <Hint text="Loads it whenever gamesense.cloud starts." />
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
