import Link from "next/link";
import { getLatestRelease } from "@/lib/github";
import { DISCORD_URL } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase";
import * as I from "./icons";
import LuaCode from "./LuaCode";
import MenuPreview from "./MenuPreview";

export const revalidate = 30;

async function getStats(): Promise<{ users: number; radars: number }> {
  try {
    const db = supabaseAdmin();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const tenSecAgo = new Date(Date.now() - 10 * 1000).toISOString();
    const [users, radars] = await Promise.all([
      db.from("sessions").select("*", { count: "exact", head: true }).gte("last_ping", fiveMinAgo),
      db.from("radar_data").select("*", { count: "exact", head: true }).gte("updated_at", tenSecAgo),
    ]);
    return { users: users.count ?? 0, radars: radars.count ?? 0 };
  } catch {
    return { users: 0, radars: 0 };
  }
}

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Staggers the hero in, one beat per step.
const beat = (n: number) => ({ "--d": n }) as React.CSSProperties;

const STATS = [
  ["23", "API modules"],
  ["190+", "Lua functions"],
  ["35", "hook events"],
  ["15+", "draw primitives"],
];

const FEATURES = [
  {
    Icon: I.Code,
    title: "Lua scripting",
    text: "23 modules: engine, entity, renderer, events, http, ffi, file, timer and more. Turn on auto-reload and scripts restart the moment you save.",
  },
  {
    Icon: I.Radar,
    title: "Web radar",
    text: "Positions, grenades, the bomb timer and a live scoreboard in any browser. Share the link, no login needed.",
  },
  {
    Icon: I.Pencil,
    title: "In-game editor",
    text: "Open any script from the menu and edit it without leaving the game, with the same highlighting you see on this site.",
  },
  {
    Icon: I.Tabs,
    title: "Script tabs",
    text: "Scripts add their own menu tabs with toggles, sliders, combos, colour pickers, keybinds and text fields.",
  },
  {
    Icon: I.Shader,
    title: "Shaders",
    text: "Shadertoy-compatible shaders, rendered as your in-game skybox.",
  },
  {
    Icon: I.Refresh,
    title: "Always current",
    text: "The loader fetches the latest build on every inject and maps it into CS2. Nothing to install or update by hand.",
  },
];

const MODULES = ["engine", "entity", "renderer", "events", "ui", "input", "trace", "http", "ffi", "json", "store", "timer"];

const STEPS = [
  ["Download", "Grab the loader. It is a single executable: no installer, no runtimes."],
  ["Start CS2", "Launch the game. The loader picks it up on its own."],
  ["Inject", "Press Inject. The latest build is fetched and mapped into the game."],
  ["Open the menu", "Press HOME in-game. Your scripts are waiting in the Scripts tab."],
];

const SAMPLE = `--@name        Kill Counter
--@description Kills this round and your speed, top right.

local kills = 0

events.On("player_death", function(e)
  local me = entity.GetLocalPlayer()
  if me and e.attacker == entity.GetIndex(me) then
    kills = kills + 1
  end
end)
events.On("round_start", function() kills = 0 end)

events.On("paint", function()
  local w = renderer.ScreenSize()
  renderer.Text(w - 120, 20, "Kills: " .. kills, Color(255, 80, 80), 14, "strong")

  local me = entity.GetLocalPlayer()
  if me then
    local vx, vy = entity.GetVelocity(me)
    local speed = math.floor(math.sqrt(vx * vx + vy * vy))
    renderer.Text(w - 120, 40, speed .. " u/s", Color(200, 220, 255), 14, "mono")
  end
end)`;

export default async function Home() {
  const [stats, loader, dll] = await Promise.all([
    getStats(),
    getLatestRelease("launcher"),
    getLatestRelease("dll"),
  ]);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-badges rise">
          <span className="badge accent">Counter-Strike 2</span>
          {stats.users > 0 && (
            <span className="badge ok"><span className="dot ok pulse" />{stats.users.toLocaleString()} online</span>
          )}
          {stats.radars > 0 && (
            <span className="badge">
              <span className="dot accent" />
              {stats.radars} radar{stats.radars === 1 ? "" : "s"} live
            </span>
          )}
        </div>
        <h1 className="hero-title rise" style={beat(1)}>gamesense<i>.cloud</i></h1>
        <p className="hero-sub rise" style={beat(2)}>
          An in-game menu with a live Lua runtime, a web radar you can open on any device, and a loader
          that stays out of your way.
        </p>
        <div className="hero-cta rise" style={beat(3)}>
          <a href="/api/download" className="btn primary lg"><I.Download />Download loader</a>
          <Link href="/docs" className="btn lg">Read the docs</Link>
          <Link href="/web-radar" className="btn lg">Open web radar</Link>
        </div>
        <p className="hero-meta rise" style={beat(4)}>
          Windows 10 / 11 · 64-bit
          {loader && ` · loader ${loader.tag_name}`}
          {dll && ` · DLL updated ${date(dll.published_at)}`}
        </p>
      </section>

      <div className="rise" style={beat(5)}>
        <MenuPreview />
      </div>

      <div className="panel stats">
        {STATS.map(([value, label]) => (
          <div key={label}><b>{value}</b><span>{label}</span></div>
        ))}
      </div>

      <section id="features" className="sec">
        <div className="sec-head">
          <span className="label">Features</span>
          <h2>Everything runs from one menu.</h2>
        </div>
        <div className="grid3">
          {FEATURES.map(({ Icon, title, text }) => (
            <div key={title} className="panel feature">
              <Icon />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="scripting" className="sec split">
        <div>
          <div className="sec-head">
            <span className="label">Scripting</span>
            <h2>Write Lua, hit save, watch it run.</h2>
            <p>
              Scripts get the same API the menu is built on: draw on screen, read entities, subscribe to game
              events, make HTTP calls, or drop to FFI when you need raw access.
            </p>
          </div>
          <div className="chips">
            {MODULES.map((m) => <span key={m} className="chip">{m}</span>)}
            <span className="chip">+10 more</span>
          </div>
          <Link href="/docs" className="link">Browse the API reference &rarr;</Link>
        </div>
        <div className="panel">
          <div className="panel-head">
            <I.Code size={14} className="text-accent" />
            kill_counter.lua
            <span className="badge ok push"><span className="dot ok" />Running</span>
          </div>
          <LuaCode flush>{SAMPLE}</LuaCode>
        </div>
      </section>

      <section id="start" className="sec">
        <div className="sec-head">
          <span className="label">Get started</span>
          <h2>From download to in-game in four steps.</h2>
        </div>
        <ol className="steps">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="panel">
              <span className="n">0{i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="requirements" className="sec grid2">
        <div className="panel">
          <div className="panel-head">Requirements</div>
          <dl className="kv">
            <div><dt>System</dt><dd>Windows 10 / 11, 64-bit</dd></div>
            <div><dt>Game</dt><dd>Counter-Strike 2</dd></div>
            <div><dt>Install</dt><dd>None, single executable</dd></div>
            <div><dt>Loader</dt><dd>{loader ? `${loader.tag_name} · ${date(loader.published_at)}` : "latest release"}</dd></div>
            <div><dt>DLL</dt><dd>{dll ? `updated ${date(dll.published_at)}` : "fetched on every inject"}</dd></div>
          </dl>
        </div>
        <div className="panel cta">
          <span className="label">Ready?</span>
          <h3>One download, no setup.</h3>
          <p>
            Grab the loader, start the game and press Inject. Questions or ideas? The Discord is the fastest way
            to reach us.
          </p>
          <div className="hero-cta">
            <a href="/api/download" className="btn primary"><I.Download size={14} />Download loader</a>
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="btn">
              <I.Chat size={14} />Join the Discord
            </a>
          </div>
        </div>
      </section>

      <footer className="home-foot">
        <span>&copy; {new Date().getFullYear()} gamesense.cloud</span>
        <Link href="/docs">Docs</Link>
        <Link href="/web-radar">Web radar</Link>
        <Link href="/policy">Policy</Link>
        <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">Discord</a>
      </footer>
    </div>
  );
}
