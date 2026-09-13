import Link from "next/link";
import DocsSearch from "./DocsSearch";

export const metadata = { title: "Lua API Docs — gamesense.cloud" };

/* ── tiny helpers ─────────────────────────────────────────────────────── */

function Badge({ children, color = "accent" }: { children: React.ReactNode; color?: string }) {
  const bg =
    color === "ok"
      ? "bg-ok/15 text-ok"
      : color === "warn"
        ? "bg-warn/15 text-warn"
        : color === "bad"
          ? "bg-bad/15 text-bad"
          : "bg-accent/15 text-accent";
  return <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${bg}`}>{children}</span>;
}

function Sig({ name, args, ret }: { name: string; args: string; ret?: string }) {
  return (
    <code className="block text-sm font-mono bg-surface-2 px-3 py-1.5 rounded border border-border mb-2 overflow-x-auto">
      <span className="text-accent">{name}</span>
      <span className="text-text-muted">(</span>
      <span className="text-text">{args}</span>
      <span className="text-text-muted">)</span>
      {ret && (
        <>
          <span className="text-text-faint"> → </span>
          <span className="text-ok">{ret}</span>
        </>
      )}
    </code>
  );
}

function Section({ id, title, badge, children }: { id: string; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-lg font-bold mt-10 mb-1 flex items-center gap-2">
        <span className="text-accent">{title}</span>
        {badge && <Badge color={badge === "stub" ? "warn" : "ok"}>{badge}</Badge>}
      </h2>
      <div className="border-l-2 border-border pl-4 space-y-4 text-sm text-text-muted">{children}</div>
    </section>
  );
}

function Fn({
  name,
  args,
  ret,
  desc,
  children,
}: {
  name: string;
  args: string;
  ret?: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="py-2" data-fn={name} data-desc={desc ?? ""}>
      <Sig name={name} args={args} ret={ret} />
      {children && <div className="text-text-muted text-xs leading-relaxed">{children}</div>}
    </div>
  );
}

function Example({ title, children }: { title: string; children: string }) {
  return (
    <div className="mt-4 mb-2">
      <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2">{title}</h4>
      <pre className="text-xs font-mono bg-surface-2 rounded border border-border p-3 overflow-x-auto leading-relaxed whitespace-pre">
        {children}
      </pre>
    </div>
  );
}

/* ── nav data ──────────────────────────────────────────────────────── */

const NAV = [
  { id: "globals", label: "globals" },
  { id: "engine", label: "engine" },
  { id: "entity", label: "entity" },
  { id: "renderer", label: "renderer" },
  { id: "input", label: "input" },
  { id: "ui", label: "ui" },
  { id: "events", label: "events" },
  { id: "hooks", label: "hooks" },
  { id: "esp", label: "esp" },
  { id: "http", label: "http" },
  { id: "cheat", label: "cheat" },
  { id: "system", label: "system" },
  { id: "math", label: "math" },
  { id: "json", label: "json" },
  { id: "store", label: "store" },
  { id: "file", label: "file" },
  { id: "timer", label: "timer" },
  { id: "log", label: "log" },
  { id: "ffi", label: "ffi" },
  { id: "cvar", label: "cvar" },
  { id: "trace", label: "trace" },
  { id: "panorama", label: "panorama" },
  { id: "types", label: "Types" },
  { id: "quickstart", label: "Quick Start" },
];

/* ── page ──────────────────────────────────────────────────────────── */

export default function Docs() {
  return (
    <div className="flex min-h-screen">
      {/* sidebar nav */}
      <aside className="hidden lg:block w-52 shrink-0 border-r border-border sticky top-0 h-screen overflow-y-auto py-8 px-4">
        <Link href="/" className="text-text-muted text-xs hover:text-text transition-colors">
          &larr; Home
        </Link>
        <h3 className="text-xs font-bold uppercase text-text-faint mt-6 mb-3 tracking-wider">Modules</h3>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              data-nav-id={n.id}
              className="block text-xs py-1 text-text-muted hover:text-accent transition-colors font-mono"
            >
              {n.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* main */}
      <div className="flex-1 max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="text-text-muted text-sm hover:text-text transition-colors lg:hidden">
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold mt-4">
          Lua API <span className="text-accent">Reference</span>
        </h1>
        <p className="mt-2 text-text-muted text-sm leading-relaxed max-w-xl">
          Complete reference for the gamesense.cloud Lua scripting API. All modules follow
          the Starline convention — global tables with PascalCase function names. Entity
          functions transparently resolve controllers to pawns for CS2 compatibility.
        </p>

        <DocsSearch navItems={NAV} />

        {/* ───────────── globals ───────────── */}
        <Section id="globals" title="globals">
          <p>Timing and frame information from the Source 2 engine global variables.</p>
          <Fn name="globals.RealTime" args="" ret="number">
            Seconds since engine start (wall-clock time). Falls back to platform timer when not in-game.
          </Fn>
          <Fn name="globals.CurTime" args="" ret="number">
            Current server time in seconds. Pauses during loading screens.
          </Fn>
          <Fn name="globals.FrameTime" args="" ret="number">
            Time elapsed since the previous frame (delta time). Useful for frame-rate-independent logic.
          </Fn>
          <Fn name="globals.FrameCount" args="" ret="integer">Frame counter since engine start.</Fn>
          <Fn name="globals.TickCount" args="" ret="integer">Current server tick number.</Fn>
          <Fn name="globals.TickInterval" args="" ret="number">
            Seconds per tick (e.g. 1/64 for 64-tick). Returns 1/64 as fallback.
          </Fn>
          <Fn name="globals.MaxPlayers" args="" ret="integer">Maximum player slots (typically 64).</Fn>
          <Fn name="globals.MapName" args="" ret="string">
            Current map name (e.g. <code className="text-accent">&quot;de_dust2&quot;</code>). Empty string when not connected.
          </Fn>
          <Fn name="globals.IsConnected" args="" ret="boolean">Whether the client is connected to a server.</Fn>
        </Section>

        {/* ───────────── engine ───────────── */}
        <Section id="engine" title="engine">
          <p>Engine queries, view control, and console commands.</p>
          <Fn name="engine.GetLocalPlayer" args="" ret="userdata | 0">
            Returns the local player pawn as a lightuserdata pointer. Returns 0 if unavailable.
          </Fn>
          <Fn name="engine.GetMaxPlayers" args="" ret="integer">Maximum player count (64).</Fn>
          <Fn name="engine.GetMapName" args="" ret="string">Current map name.</Fn>
          <Fn name="engine.GetViewAngles" args="" ret="pitch, yaw, roll">
            Returns the local player&apos;s current view angles as three floats.
          </Fn>
          <Fn name="engine.SetViewAngles" args="pitch, yaw, roll">
            Sets the local player&apos;s view angles.
          </Fn>
          <Fn name="engine.IsConnected" args="" ret="boolean">Whether connected to a server.</Fn>
          <Fn name="engine.IsInGame" args="" ret="boolean">Whether in an active game.</Fn>
          <Fn name="engine.ExecuteCommand" args="cmd: string">
            Executes a console command (e.g. <code className="text-accent">&quot;say hello&quot;</code>).
          </Fn>
          <Fn name="engine.GetScreenSize" args="" ret="width, height">Display resolution in pixels.</Fn>
          <Fn name="engine.WorldToScreen" args="x, y, z" ret="{x, y} | nil">
            Projects 3D world coordinates to 2D screen position. Returns a table or nil if behind camera.
          </Fn>
          <Fn name="engine.GetCurTime" args="" ret="number">Current server time.</Fn>
          <Fn name="engine.GetRealTime" args="" ret="number">Real wall-clock time.</Fn>
          <Fn name="engine.GetFrameTime" args="" ret="number">Frame delta time.</Fn>
          <Fn name="engine.GetTickRate" args="" ret="number">Server tick rate (e.g. 64.0).</Fn>
          <Fn name="engine.GetTickCount" args="" ret="integer">Current tick count.</Fn>
          <Fn name="engine.GetRoundPhase" args="" ret="string">
            Current round phase: <code className="text-accent">&quot;live&quot;</code>, <code className="text-accent">&quot;freezetime&quot;</code>, or <code className="text-accent">&quot;over&quot;</code>.
            Updated automatically from game events (round_start, round_freeze_end, round_end).
          </Fn>
        </Section>

        {/* ───────────── entity ───────────── */}
        <Section id="entity" title="entity">
          <p>
            Entity access and queries. Indices 1–64 are player controllers in CS2 — this module
            transparently resolves them to pawns so scripts get position, health, and team data
            from the correct entity.
          </p>
          <Fn name="entity.GetLocalPlayer" args="" ret="userdata | nil">Local player pawn pointer.</Fn>
          <Fn name="entity.GetByIndex" args="index: integer" ret="userdata | nil">
            Get entity by index. For indices 1–64, automatically resolves controller → pawn.
          </Fn>
          <Fn name="entity.GetPlayers" args="" ret="table">
            Returns a sequential table of all alive player pawns. Rebuilds the pawn↔controller map.
          </Fn>
          <Fn name="entity.GetHealth" args="ent" ret="integer">Health points (0–100).</Fn>
          <Fn name="entity.GetArmor" args="ent" ret="integer">Armor value.</Fn>
          <Fn name="entity.GetTeam" args="ent" ret="integer">
            Team number: 2 = Terrorist, 3 = Counter-Terrorist.
          </Fn>
          <Fn name="entity.GetName" args="ent" ret="string">
            Sanitized player name. Reads from the controller via reverse pawn→controller lookup.
          </Fn>
          <Fn name="entity.GetPosition" args="ent" ret="x, y, z">
            World position (reads <code className="text-text-faint">m_vOldOrigin</code> from the pawn).
          </Fn>
          <Fn name="entity.GetEyePosition" args="ent" ret="x, y, z">
            Eye position = origin + view offset.
          </Fn>
          <Fn name="entity.GetViewAngles" args="ent" ret="pitch, yaw, roll">
            Eye angles (<code className="text-text-faint">m_angEyeAngles</code>).
          </Fn>
          <Fn name="entity.IsAlive" args="ent" ret="boolean">
            True when <code className="text-text-faint">m_lifeState == 0</code>.
          </Fn>
          <Fn name="entity.IsDormant" args="ent" ret="boolean">
            True if the entity is dormant (not being networked). Reads CGameSceneNode::m_bDormant. Also returns true for nil entities.
          </Fn>
          <Fn name="entity.GetBoundingBox" args="ent" ret="x, y, w, h, alpha | nil">
            Screen-space bounding box. Accounts for crouching. Returns nil if off-screen.
          </Fn>
          <Fn name="entity.GetHitboxPosition" args="ent, hitbox: integer" ret="x, y, z">
            Bone position for the given hitbox index (0–128). Reads from the scene node bone array.
          </Fn>
          <Fn name="entity.GetWeapon" args="ent" ret="userdata | nil">
            Active weapon entity pointer (<code className="text-text-faint">m_pClippingWeapon</code>).
          </Fn>
          <Fn name="entity.GetWeaponName" args="ent" ret="string">
            Designer name of the active weapon, with the <code className="text-text-faint">weapon_</code> prefix stripped.
          </Fn>
          <Fn name="entity.GetController" args="pawn: userdata" ret="userdata | nil">
            Reverse lookup: pawn → controller.
          </Fn>
          <Fn name="entity.GetPawn" args="controller" ret="userdata | nil">
            Forward lookup: controller → pawn.
          </Fn>
          <Fn name="entity.IsEnemy" args="ent" ret="boolean">
            True if the entity is on a different team than the local player.
          </Fn>
          <Fn name="entity.GetFlags" args="ent" ret="integer">
            Entity flags (<code className="text-text-faint">m_fFlags</code>). Bit 1 = crouching.
          </Fn>
          <Fn name="entity.IsScoped" args="ent" ret="boolean">Whether the player is scoped in.</Fn>
          <Fn name="entity.HasHelmet" args="ent" ret="boolean">Whether the player has a helmet.</Fn>
          <Fn name="entity.HasDefuser" args="ent" ret="boolean">Whether the player has a defuse kit.</Fn>
          <Fn name="entity.GetFlashDuration" args="ent" ret="number">Flash duration in seconds.</Fn>
          <Fn name="entity.GetMoney" args="ent" ret="integer">
            Current money via <code className="text-text-faint">m_pInGameMoneyServices</code>.
          </Fn>
          <Fn name="entity.GetColor" args="ent" ret="integer">
            Competitive teammate color index: 0=blue, 1=green, 2=yellow, 3=orange, 4=purple. Returns -1 if unavailable.
          </Fn>
          <Fn name="entity.GetVelocity" args="ent" ret="x, y, z">
            Current velocity vector (<code className="text-text-faint">m_vecVelocity</code>).
          </Fn>
          <Fn name="entity.GetSteamID" args="ent" ret="integer">
            64-bit Steam ID from the controller. Returns 0 if unavailable.
          </Fn>
          <Fn name="entity.GetIndex" args="ent: userdata" ret="integer">
            Entity slot index (1–64). Returns 0 if not found.
          </Fn>
          <Fn name="entity.GetPropInt" args="ent, class: string, field: string" ret="integer">
            Read any integer schema field. Example: <code className="text-text-faint">entity.GetPropInt(ent, &quot;C_BaseEntity&quot;, &quot;m_iHealth&quot;)</code>
          </Fn>
          <Fn name="entity.GetPropFloat" args="ent, class: string, field: string" ret="number">
            Read any float schema field.
          </Fn>
          <Fn name="entity.GetPropBool" args="ent, class: string, field: string" ret="boolean">
            Read any boolean schema field.
          </Fn>
          <Fn name="entity.GetPropVec3" args="ent, class: string, field: string" ret="x, y, z">
            Read any Vector schema field. Returns three floats.
          </Fn>
          <Fn name="entity.GetPropString" args="ent, class: string, field: string" ret="string">
            Read any string (pointer-to-char) schema field. Returns empty string on failure.
          </Fn>
          <Fn name="entity.GetEntityFromHandle" args="handle: integer" ret="entity | nil">
            Resolve an entity handle (e.g. from GetPropInt on m_hActiveWeapon or m_hOwnerEntity) to an entity pointer. Returns nil if the handle is invalid.
          </Fn>
          <Example title="Example — iterate enemies">{`local players = entity.GetPlayers()
for _, ply in ipairs(players) do
  if entity.IsEnemy(ply) and entity.IsAlive(ply) then
    local name = entity.GetName(ply)
    local hp   = entity.GetHealth(ply)
    local x, y, z = entity.GetPosition(ply)
    print(name .. " has " .. hp .. "hp at " .. x .. ", " .. y)
  end
end`}</Example>
          <Example title="Example — read custom netvar">{`local ent = entity.GetByIndex(1)
if ent then
  local kills = entity.GetPropInt(ent, "CCSPlayerController", "m_iKills")
  local ping  = entity.GetPropInt(ent, "CCSPlayerController", "m_iPing")
  print("Kills: " .. kills .. "  Ping: " .. ping)
end`}</Example>
        </Section>

        {/* ───────────── renderer ───────────── */}
        <Section id="renderer" title="renderer">
          <p>
            2D rendering API. All drawing functions must be called inside a{" "}
            <code className="text-accent">paint</code> event handler.
            Colors can be <code className="text-text-faint">Color()</code> objects,{" "}
            <code className="text-text-faint">{"{r, g, b, a}"}</code> tables, or packed integers.
          </p>
          <Fn name="renderer.Line" args="x1, y1, x2, y2 [, color, thickness]">
            Draw a line between two points.
          </Fn>
          <Fn name="renderer.Rect" args="x, y, w, h [, color, rounding]">
            Draw a rectangle outline.
          </Fn>
          <Fn name="renderer.RectFilled" args="x, y, w, h [, color, rounding]">
            Draw a filled rectangle.
          </Fn>
          <Fn name="renderer.GradientRect" args="x, y, w, h [, colorA, colorB]">
            Draw a gradient-filled rectangle.
          </Fn>
          <Fn name="renderer.Circle" args="x, y, radius [, color, segments]">
            Draw a circle outline.
          </Fn>
          <Fn name="renderer.CircleFilled" args="x, y, radius [, color, segments]">
            Draw a filled circle.
          </Fn>
          <Fn name="renderer.Triangle" args="x1, y1, x2, y2, x3, y3 [, color]">
            Draw a triangle outline.
          </Fn>
          <Fn name="renderer.TriangleFilled" args="x1, y1, x2, y2, x3, y3 [, color]">
            Draw a filled triangle.
          </Fn>
          <Fn name="renderer.Polyline" args="points [, color, thickness]">
            Draw an open polyline. <code className="text-text-faint">points</code> is an array of{" "}
            <code className="text-text-faint">{"{x, y}"}</code> tables (minimum 3).
          </Fn>
          <Fn name="renderer.Polygon" args="points [, color, thickness]">
            Draw a closed polygon outline. <code className="text-text-faint">points</code> is an array of{" "}
            <code className="text-text-faint">{"{x, y}"}</code> tables (minimum 3).
          </Fn>
          <Fn name="renderer.PolygonFilled" args="points [, color]">
            Draw a filled convex polygon.
          </Fn>
          <Fn name="renderer.RoundedRect" args="x, y, w, h, rounding [, color]">
            Draw a rounded rectangle outline.
          </Fn>
          <Fn name="renderer.RoundedRectFilled" args="x, y, w, h, rounding [, color]">
            Draw a filled rounded rectangle.
          </Fn>
          <Fn name="renderer.Arc" args="cx, cy, radius, startAngle, endAngle [, color, segments, thickness]">
            Draw an arc outline. Angles are in radians.
          </Fn>
          <Fn name="renderer.ArcFilled" args="cx, cy, radius, startAngle, endAngle [, color, segments]">
            Draw a filled arc (pie shape).
          </Fn>
          <Fn name="renderer.Text" args="x, y, text [, color, size, font]" >
            Draw text. Font can be <code className="text-text-faint">&quot;interface&quot;</code>,{" "}
            <code className="text-text-faint">&quot;strong&quot;</code>,{" "}
            <code className="text-text-faint">&quot;mono&quot;</code>, or{" "}
            <code className="text-text-faint">&quot;display&quot;</code>.
          </Fn>
          <Fn name="renderer.TextEx" args='x, y, text [, color, size, font, alignX, alignY]'>
            Draw text with alignment. <code className="text-text-faint">alignX</code> is{" "}
            <code className="text-text-faint">&quot;left&quot;</code>,{" "}
            <code className="text-text-faint">&quot;center&quot;</code>, or{" "}
            <code className="text-text-faint">&quot;right&quot;</code>.{" "}
            <code className="text-text-faint">alignY</code> is{" "}
            <code className="text-text-faint">&quot;top&quot;</code>,{" "}
            <code className="text-text-faint">&quot;center&quot;</code>, or{" "}
            <code className="text-text-faint">&quot;bottom&quot;</code>.
          </Fn>
          <Fn name="renderer.MeasureText" args="text [, size, font]" ret="width, height">
            Measure text dimensions without drawing.
          </Fn>
          <Fn name="renderer.ScreenSize" args="" ret="width, height">Canvas dimensions.</Fn>
          <Fn name="renderer.WorldToScreen" args="x, y, z" ret="sx, sy | nil">
            Project world position to screen. Returns two numbers or nil if behind camera.
          </Fn>
          <Example title="Example — draw crosshair + info">{`events.On("paint", function()
  local w, h = renderer.ScreenSize()
  local cx, cy = w / 2, h / 2

  -- crosshair
  renderer.Line(cx - 8, cy, cx + 8, cy, Color(0, 255, 0, 200))
  renderer.Line(cx, cy - 8, cx, cy + 8, Color(0, 255, 0, 200))

  -- velocity display
  local me = entity.GetLocalPlayer()
  if me then
    local vx, vy, vz = entity.GetVelocity(me)
    local speed = math.floor(math.sqrt(vx*vx + vy*vy))
    renderer.Text(cx, cy + 20, speed .. " u/s",
      Color(255, 255, 255, 180), 14, "mono")
  end
end)`}</Example>
        </Section>

        {/* ───────────── input ───────────── */}
        <Section id="input" title="input">
          <p>
            Keyboard and mouse state. Key codes are exposed as constants on the{" "}
            <code className="text-accent">input</code> table (e.g.{" "}
            <code className="text-text-faint">input.KEY_A</code>,{" "}
            <code className="text-text-faint">input.MOUSE_LEFT</code>,{" "}
            <code className="text-text-faint">input.F1</code>–<code className="text-text-faint">input.F12</code>).
          </p>
          <Fn name="input.IsKeyDown" args="key: integer" ret="boolean">True while the key is held.</Fn>
          <Fn name="input.IsKeyPressed" args="key: integer" ret="boolean">True on the frame the key was first pressed.</Fn>
          <Fn name="input.IsKeyReleased" args="key: integer" ret="boolean">True on the frame the key was released.</Fn>
          <Fn name="input.GetMousePos" args="" ret="x, y">Current mouse position in pixels.</Fn>
          <Fn name="input.GetMouseWheel" args="" ret="number">Mouse wheel delta this frame.</Fn>
          <Fn name="input.GetKeyName" args="key: integer" ret="string">Human-readable key name.</Fn>
          <Fn name="input.IsMouseDown" args="button: integer" ret="boolean">
            0 = left, 1 = right, 2 = middle. True while held.
          </Fn>
          <Fn name="input.IsMousePressed" args="button: integer" ret="boolean">True on first press frame.</Fn>
          <Fn name="input.IsMouseReleased" args="button: integer" ret="boolean">True on release frame.</Fn>
          <Fn name="input.GetMouseDelta" args="" ret="dx, dy">Mouse movement since last frame.</Fn>

          <div className="mt-2">
            <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-1">Key Constants</h4>
            <p className="text-xs">
              <code className="text-text-faint">MOUSE_LEFT</code>,{" "}
              <code className="text-text-faint">MOUSE_RIGHT</code>,{" "}
              <code className="text-text-faint">MOUSE_MIDDLE</code>,{" "}
              <code className="text-text-faint">MOUSE_4</code>,{" "}
              <code className="text-text-faint">MOUSE_5</code>,{" "}
              <code className="text-text-faint">BACKSPACE</code>,{" "}
              <code className="text-text-faint">TAB</code>,{" "}
              <code className="text-text-faint">ENTER</code>,{" "}
              <code className="text-text-faint">SHIFT</code>,{" "}
              <code className="text-text-faint">CTRL</code>,{" "}
              <code className="text-text-faint">ALT</code>,{" "}
              <code className="text-text-faint">ESCAPE</code>,{" "}
              <code className="text-text-faint">SPACE</code>,{" "}
              <code className="text-text-faint">LEFT</code>/<code className="text-text-faint">RIGHT</code>/<code className="text-text-faint">UP</code>/<code className="text-text-faint">DOWN</code>,{" "}
              <code className="text-text-faint">KEY_0</code>–<code className="text-text-faint">KEY_9</code>,{" "}
              <code className="text-text-faint">KEY_A</code>–<code className="text-text-faint">KEY_Z</code>,{" "}
              <code className="text-text-faint">F1</code>–<code className="text-text-faint">F12</code>,{" "}
              <code className="text-text-faint">INSERT</code>,{" "}
              <code className="text-text-faint">DELETE</code>,{" "}
              <code className="text-text-faint">HOME</code>,{" "}
              <code className="text-text-faint">END</code>,{" "}
              <code className="text-text-faint">PAGE_UP</code>,{" "}
              <code className="text-text-faint">PAGE_DOWN</code>,{" "}
              <code className="text-text-faint">CAPS_LOCK</code>
            </p>
          </div>
        </Section>

        {/* ───────────── ui ───────────── */}
        <Section id="ui" title="ui">
          <p>
            Tab / Group / Widget hierarchy for building script configuration UIs.
            Values persist automatically across script reloads.
          </p>

          <Fn name="ui.Tab" args='name: string' ret="tab">
            Create a named tab. Returns a tab handle.
          </Fn>
          <Fn name="ui.GetValue" args="id: string" ret="value">Get a control&apos;s current value by its ID.</Fn>
          <Fn name="ui.SetValue" args="id: string, value">Set a control&apos;s value by its ID.</Fn>

          <div className="mt-3">
            <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-1">tab:Group(name) → group</h4>
            <p className="text-xs mb-2">Create a named group within a tab.</p>
          </div>

          <div className="mt-1">
            <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-1">Group Widgets</h4>
            <Fn name="group:Checkbox" args="label, default: boolean" ret="control">Toggle switch.</Fn>
            <Fn name="group:SliderInt" args="label, min, max [, default]" ret="control">Integer slider.</Fn>
            <Fn name="group:SliderFloat" args="label, min, max [, default]" ret="control">Float slider.</Fn>
            <Fn name="group:Combo" args='label, options: table [, default_index]' ret="control">Dropdown selector. Index is 1-based.</Fn>
            <Fn name="group:Multiselect" args='label, options: table [, defaults: table]' ret="control">Multi-select dropdown. Returns a table of selected indices.</Fn>
            <Fn name="group:Button" args="label [, callback]" ret="control">Clickable button.</Fn>
            <Fn name="group:ColorPicker" args="label [, default: {r,g,b,a}]" ret="control">RGBA color picker (0–1 range).</Fn>
            <Fn name="group:Textbox" args="label [, default: string]" ret="control">Text input field.</Fn>
            <Fn name="group:Keybind" args="label [, default_key]" ret="control">Key binding selector.</Fn>
            <Fn name="group:Label" args="text" ret="control">Static text label.</Fn>
            <Fn name="group:Separator" args="[text]" ret="control">Visual divider. Optional text becomes a section heading.</Fn>
          </div>

          <div className="mt-3">
            <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-1">Control Handle Methods</h4>
            <Fn name="control:Get" args="" ret="value">Read current value.</Fn>
            <Fn name="control:Set" args="value">Write a new value.</Fn>
            <Fn name="control:OnChange" args="callback" ret="self">Register a value-change callback. Returns self for chaining.</Fn>
            <p className="text-xs mt-1">
              Properties: <code className="text-text-faint">.id</code>,{" "}
              <code className="text-text-faint">.kind</code>,{" "}
              <code className="text-text-faint">.label</code>
            </p>
          </div>
          <Example title="Example — full UI setup">{`local tab = ui.Tab("Aim Helper")
local g = tab:Group("Settings")

local enabled = g:Checkbox("Enabled", true)
local fov     = g:SliderFloat("FOV", 1.0, 30.0, 5.0)
local style   = g:Combo("Style", {"Circle", "Cross", "Dot"}, 1)
local hotkey  = g:Keybind("Toggle Key", input.KEY_X)
local color   = g:ColorPicker("Color", {1, 0, 0, 1})

g:Separator("Info")
local status = g:Label("Status: idle")

enabled:OnChange(function(val)
  status:Set(val and "Status: active" or "Status: idle")
end)

g:Button("Reset Defaults", function()
  fov:Set(5.0)
  style:Set(1)
  color:Set({1, 0, 0, 1})
end)`}</Example>
        </Section>

        {/* ───────────── events ───────────── */}
        <Section id="events" title="events">
          <p>Event subscription system with typed event names.</p>
          <Fn name="events.On" args="name: string, callback: function" ret="handle: integer">
            Subscribe to an event. Returns a handle for unsubscription.
          </Fn>
          <Fn name="events.Off" args="handle: integer" ret="boolean">
            Unsubscribe by handle. Returns true if the subscription was found.
          </Fn>
          <Fn name="events.List" args="" ret="table">
            List all declared events with name, summary, arguments, and listener count.
          </Fn>
          <div className="mt-2">
            <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-1">Constants</h4>
            <p className="text-xs">
              <code className="text-text-faint">events.BUTTON_FORCE_OFF</code> (0),{" "}
              <code className="text-text-faint">events.BUTTON_TOGGLE</code> (1),{" "}
              <code className="text-text-faint">events.BUTTON_FORCE_ON</code> (2)
            </p>
          </div>
          <div className="mt-4">
            <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-2">Event Reference</h4>
            <p className="text-xs text-text-faint mb-3">
              Platform and engine events pass <strong className="text-text-muted">individual arguments</strong> to callbacks.
              CS2 game events pass a <strong className="text-text-muted">single table</strong> with the listed fields
              — e.g. <code className="text-accent">function(e) print(e.userid) end</code>.
            </p>
            {[
              { group: "Platform", note: "individual args", events: [
                { name: "frame", args: "dt: number" },
                { name: "paint", args: "(none — draw here)" },
                { name: "key", args: "key: number, down: boolean" },
                { name: "resize", args: "width: number, height: number" },
                { name: "focus", args: "focused: boolean" },
                { name: "unload", args: "(none)" },
              ]},
              { group: "Engine", note: "individual args", events: [
                { name: "createmove", args: "cmd: CUserCmd" },
                { name: "movement", args: "cmd: CUserCmd" },
                { name: "frame_stage", args: "stage: number" },
                { name: "vote_setup", args: "(none)" },
                { name: "edgebug", args: "(none)" },
                { name: "jumpbug", args: "(none)" },
                { name: "pixelsurf", args: "(none)" },
              ]},
              { group: "Round", note: "table fields", events: [
                { name: "round_start", args: "e.timelimit: number" },
                { name: "round_end", args: "e.winner, e.reason, e.message" },
                { name: "round_freeze_end", args: "(none)" },
                { name: "round_mvp", args: "e.userid, e.reason" },
                { name: "begin_new_match", args: "(none)" },
                { name: "announce_phase_end", args: "(none)" },
              ]},
              { group: "Player", note: "table fields", events: [
                { name: "player_death", args: "e.userid, e.attacker, e.headshot, e.distance, e.weapon, e.assistedflash, e.noscope, e.thrusmoke, e.penetrated, e.dominated, e.revenge, e.assister" },
                { name: "player_hurt", args: "e.userid, e.attacker, e.health, e.armor, e.dmg_health, e.dmg_armor, e.hitgroup, e.weapon" },
                { name: "player_spawn", args: "e.userid, e.team" },
                { name: "player_disconnect", args: "e.userid, e.reason" },
                { name: "item_purchase", args: "e.userid, e.team, e.weapon" },
              ]},
              { group: "Weapon", note: "table fields", events: [
                { name: "weapon_fire", args: "e.userid, e.weapon" },
                { name: "bullet_impact", args: "e.userid, e.x, e.y, e.z" },
              ]},
              { group: "Bomb", note: "table fields", events: [
                { name: "bomb_planted", args: "e.userid" },
                { name: "bomb_defused", args: "e.userid" },
                { name: "bomb_exploded", args: "(none)" },
              ]},
              { group: "Grenades", note: "table fields", events: [
                { name: "flashbang_detonate", args: "e.userid, e.entityid, e.x, e.y, e.z" },
                { name: "smokegrenade_detonate", args: "e.userid, e.entityid, e.x, e.y, e.z" },
                { name: "hegrenade_detonate", args: "e.userid, e.x, e.y, e.z" },
                { name: "inferno_startburn", args: "e.entityid, e.x, e.y, e.z" },
                { name: "inferno_expire", args: "e.entityid, e.x, e.y, e.z" },
                { name: "decoy_started", args: "e.userid, e.entityid, e.x, e.y, e.z" },
              ]},
            ].map(g => (
              <div key={g.group} className="mb-3">
                <div className="text-[10px] font-bold text-text-faint uppercase tracking-wider mb-1 mt-2">
                  {g.group}
                  {g.note && <span className="ml-2 text-[9px] font-normal normal-case text-text-faint/60">({g.note})</span>}
                </div>
                <div className="space-y-1 text-xs">
                  {g.events.map(e => (
                    <div key={e.name} className="flex gap-2">
                      <code className="text-accent min-w-[160px]">{e.name}</code>
                      <span className="text-text-faint">{e.args}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Example title="Example — track kills">{`local myKills = 0

-- CS2 game events pass a single table with named fields
events.On("player_death", function(e)
  local me = entity.GetLocalPlayer()
  if me and e.attacker == entity.GetIndex(me) then
    myKills = myKills + 1
    cheat.Notify("Kill #" .. myKills .. " with " .. e.weapon .. "!")
    system.PlaySound("scripts/ding.wav")
  end
end)

events.On("round_start", function(e)
  myKills = 0
end)

-- Platform events pass individual arguments
events.On("key", function(key, down)
  if key == input.KEY_H and down then
    cheat.Notify("Kills this round: " .. myKills)
  end
end)`}</Example>
        </Section>

        {/* ───────────── hooks ───────────── */}
        <Section id="hooks" title="hooks">
          <p>
            Named hook management — bridges hook names to the event system. Supports
            both PascalCase and snake_case hook names.
          </p>
          <Fn name="hooks.Add" args="hookName, uniqueId, callback">
            Register a callback for a hook. Re-registering with the same hookName + uniqueId replaces the previous callback.
          </Fn>
          <Fn name="hooks.Remove" args="hookName, uniqueId">
            Remove a previously registered hook callback.
          </Fn>
          <div className="mt-2">
            <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-1">Supported Hooks</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs mt-1">
              {[
                "CreateMove", "Movement", "FrameStageNotify", "Paint / Draw",
                "Frame", "Key", "Resize", "Focus", "Unload",
                "RoundStart", "RoundEnd", "FreezeTimeEnd", "RoundMVP",
                "BeginNewMatch", "AnnouncePhaseEnd",
                "PlayerDeath", "PlayerHurt", "PlayerSpawn", "PlayerDisconnect",
                "ItemPurchase", "WeaponFire", "BulletImpact",
                "BombPlanted", "BombDefused", "BombExploded",
                "FlashbangDetonate", "SmokegrenadeDetonate", "HEGrenadeDetonate",
                "InfernoStartBurn", "InfernoExpire", "DecoyStarted",
                "VoteSetup", "EdgeBug", "JumpBug", "PixelSurf",
              ].map((h) => (
                <code key={h} className="text-text-faint">{h}</code>
              ))}
            </div>
          </div>
          <Example title="Example — hooks.Add vs events.On">{`-- hooks.Add uses named IDs (can replace/remove by name)
hooks.Add("Paint", "my_watermark", function()
  renderer.Text(10, 10, "gamesense.cloud", Color(100, 200, 255), 16)
end)

-- remove later by name
hooks.Remove("Paint", "my_watermark")

-- events.On uses numeric handles
local h = events.On("paint", function()
  renderer.Text(10, 10, "hello", Color(255,255,255))
end)
events.Off(h)  -- remove by handle`}</Example>
        </Section>

        {/* ───────────── esp ───────────── */}
        <Section id="esp" title="esp">
          <p>
            ESP override and custom element system. Store per-entity overrides, custom text,
            and custom bars that a renderer can consume.
          </p>
          <Fn name="esp.Override" args="entity_index, property, value">
            Set a per-entity property override. Pass nil as value to clear. Supports string, number, color, and boolean values.
          </Fn>
          <Fn name="esp.CustomText" args="entity_index, position, text [, color]">
            Add custom text to an entity. Position is a string like <code className="text-text-faint">&quot;top&quot;</code> or <code className="text-text-faint">&quot;bottom&quot;</code>. Cleared every frame — re-add in your paint handler.
          </Fn>
          <Fn name="esp.CustomBar" args="entity_index, position, value [, color]">
            Add a custom bar (0.0–1.0) to an entity. Cleared every frame — re-add in your paint handler.
          </Fn>
          <Fn name="esp.GetOverride" args="entity_index, property" ret="value | nil">
            Read a previously set override.
          </Fn>
          <Fn name="esp.Clear" args="">Clear all stored ESP data for all entities.</Fn>
          <Fn name="esp.ClearEntity" args="entity_index">Clear ESP data for one entity.</Fn>
        </Section>

        {/* ───────────── http ───────────── */}
        <Section id="http" title="http">
          <p>
            HTTP client via WinHTTP. Supports HTTPS. Requests are synchronous — use{" "}
            <code className="text-text-faint">timer.After(0, fn)</code> to avoid blocking paint.
            10-second timeout.
          </p>
          <Fn name="http.Get" args="url [, callback]" ret="body | nil, error">
            GET request. With callback: <code className="text-text-faint">callback(body, error)</code>.
            Without: returns body directly, or nil + error string.
          </Fn>
          <Fn name="http.Post" args="url, body [, callback [, content_type]]" ret="body | nil, error">
            POST request. Default content type is <code className="text-text-faint">application/json</code>.
          </Fn>
          <Fn name="http.Request" args="{url, method, body, content_type}" ret="{status, body, ok, error}">
            Full-featured request. Returns a result table with status code, body, ok boolean, and optional error.
          </Fn>
          <Example title="Example — fetch & post JSON">{`-- simple GET
local body, err = http.Get("https://api.example.com/data")
if body then
  local data = json.Decode(body)
  print("Got " .. #data .. " items")
end

-- POST JSON (non-blocking via timer)
timer.After(0, function()
  local payload = json.Encode({ name = cheat.GetUsername() })
  local res = http.Request({
    url = "https://api.example.com/submit",
    method = "POST",
    body = payload,
  })
  if res.ok then print("Submitted!") end
end)`}</Example>
        </Section>

        {/* ───────────── cheat ───────────── */}
        <Section id="cheat" title="cheat">
          <p>Cheat identity, control, and utility functions.</p>
          <Fn name="cheat.GetCheatName" args="" ret="string">Returns <code className="text-accent">&quot;gamesense.cloud&quot;</code>.</Fn>
          <Fn name="cheat.GetVersion" args="" ret="string">Build version string.</Fn>
          <Fn name="cheat.GetUsername" args="" ret="string">Current username.</Fn>
          <Fn name="cheat.IsLoaded" args="" ret="boolean">Always returns true.</Fn>
          <Fn name="cheat.Unload" args="">Queue the calling script for unload.</Fn>
          <Fn name="cheat.Reload" args="">Queue the calling script for reload.</Fn>
          <Fn name="cheat.Log" args="text: string">Write to the internal journal.</Fn>
          <Fn name="cheat.SetClantag" args="tag: string">Set the player&apos;s clan tag via console command.</Fn>
          <Fn name="cheat.Notify" args="text: string">Show a notification message.</Fn>
          <Fn name="cheat.GetTimestamp" args="" ret="string">
            Local time as <code className="text-text-faint">&quot;YYYY-MM-DD HH:MM:SS&quot;</code>.
          </Fn>
          <Fn name="cheat.FindExport" args="module: string, export: string" ret="userdata | nil">
            Find a DLL export by module and name. Returns a lightuserdata pointer.
          </Fn>
          <Fn name="cheat.IsRadarActive" args="" ret="boolean">
            Whether the web radar is currently streaming data.
          </Fn>
          <Fn name="cheat.GetRadarURL" args="" ret="string | nil">
            The active web radar URL, or nil if radar is not running.
          </Fn>
          <Fn name="cheat.GetRadarStats" args="" ret="table">
            Returns <code className="text-text-faint">{'{ active, pushCount, failCount, avgLatency, playerCount, uptime }'}</code> with
            live radar statistics. Works whether radar is active or not.
          </Fn>
        </Section>

        {/* ───────────── system ───────────── */}
        <Section id="system" title="system">
          <p>OS-level utilities — clipboard, timing, audio.</p>
          <Fn name="system.GetClipboard" args="" ret="string">Read clipboard text (UTF-8).</Fn>
          <Fn name="system.SetClipboard" args="text: string">Write text to the clipboard.</Fn>
          <Fn name="system.GetTimestamp" args="" ret="integer">Unix timestamp (seconds since epoch).</Fn>
          <Fn name="system.GetTickCount" args="" ret="integer">Milliseconds since system boot (via GetTickCount64).</Fn>
          <Fn name="system.PlaySound" args="path: string">Play a WAV file asynchronously.</Fn>
        </Section>

        {/* ───────────── math ───────────── */}
        <Section id="math" title="math">
          <p>
            Extended math utilities for angle and vector operations. Augments the standard Lua{" "}
            <code className="text-accent">math</code> table — all functions are accessed via{" "}
            <code className="text-text-faint">math.AngleNormalize()</code> etc.
          </p>
          <Fn name="math.AngleNormalize" args="angle: number" ret="number">
            Normalize an angle to the range [-180, 180].
          </Fn>
          <Fn name="math.AngleDifference" args="a: number, b: number" ret="number">
            Shortest angular difference between two angles.
          </Fn>
          <Fn name="math.VectorAngles" args="x, y, z" ret="pitch, yaw">
            Convert a direction vector to Euler angles.
          </Fn>
          <Fn name="math.AngleVectors" args="pitch, yaw" ret="fx, fy, fz">
            Convert Euler angles to a forward direction vector.
          </Fn>
          <Fn name="math.VectorLength" args="x, y, z" ret="number">3D vector length.</Fn>
          <Fn name="math.VectorDistance" args="x1, y1, z1, x2, y2, z2" ret="number">
            Distance between two 3D points.
          </Fn>
          <Fn name="math.Lerp" args="t, a, b" ret="number">
            Linear interpolation: <code className="text-text-faint">a + t * (b - a)</code>.
          </Fn>
          <Fn name="math.Clamp" args="value, min, max" ret="number">
            Clamp value to [min, max].
          </Fn>
        </Section>

        {/* ───────────── json ───────────── */}
        <Section id="json" title="json">
          <p>JSON encoding and decoding. Both PascalCase and lowercase names are supported.</p>
          <Fn name="json.Decode" args="str: string" ret="table | nil">
            Parse a JSON string into a Lua table. Returns nil on invalid input.
          </Fn>
          <Fn name="json.Encode" args="value: any [, pretty: boolean]" ret="string">
            Serialize a Lua value to JSON. Pass <code className="text-text-faint">true</code> as second arg for indented output.
          </Fn>
          <Fn name="json.Valid" args="str: string" ret="boolean">
            Check whether a string is valid JSON without parsing it.
          </Fn>
          <p className="text-xs">
            Aliases: <code className="text-text-faint">json.decode</code>,{" "}
            <code className="text-text-faint">json.encode</code>,{" "}
            <code className="text-text-faint">json.valid</code>
          </p>
        </Section>

        {/* ───────────── store ───────────── */}
        <Section id="store" title="store">
          <p>
            Per-script persistent key-value storage. Data is saved as JSON and survives script reloads.
          </p>
          <Fn name="store.get" args="key: string" ret="value | nil">Read a stored value.</Fn>
          <Fn name="store.set" args="key: string, value: any">Write a value. Pass nil to delete.</Fn>
          <Fn name="store.has" args="key: string" ret="boolean">Check if a key exists.</Fn>
          <Fn name="store.remove" args="key: string">Delete a key.</Fn>
          <Fn name="store.clear" args="">Delete all keys for this script.</Fn>
          <Fn name="store.keys" args="" ret="table">Return all stored keys as a sequential table.</Fn>
          <Fn name="store.save" args="">Force an immediate write to disk.</Fn>
          <Example title="Example — persistent settings">{`-- load saved config or use defaults
local config = store.get("config") or {
  enabled = true,
  color = {255, 0, 0, 255},
  key = input.KEY_H,
}

-- update and save on change
events.On("key", function(key, down)
  if key == input.F2 and down then
    config.enabled = not config.enabled
    store.set("config", config)
    cheat.Notify("Toggled: " .. tostring(config.enabled))
  end
end)`}</Example>
        </Section>

        {/* ───────────── file ───────────── */}
        <Section id="file" title="file">
          <p>
            Filesystem access sandboxed to the scripts root directory. All paths are relative
            to the root; attempts to escape via <code className="text-text-faint">..</code> are rejected.
          </p>
          <Fn name="file.Read" args="path: string" ret="string | nil">Read file contents as a string. Returns nil if the file doesn&apos;t exist.</Fn>
          <Fn name="file.Write" args="path: string, content: string">Write a string to a file (creates or overwrites).</Fn>
          <Fn name="file.Append" args="path: string, content: string">Append content to a file.</Fn>
          <Fn name="file.Exists" args="path: string" ret="boolean">Check whether a path exists.</Fn>
          <Fn name="file.IsDirectory" args="path: string" ret="boolean">True if the path is a directory.</Fn>
          <Fn name="file.Size" args="path: string" ret="integer">File size in bytes (0 on error).</Fn>
          <Fn name="file.List" args="path: string" ret="table">List filenames in a directory.</Fn>
          <Fn name="file.MakeDirectory" args="path: string" ret="boolean">Create a directory (recursive). Returns success.</Fn>
          <Fn name="file.Remove" args="path: string" ret="boolean">Delete a file. Returns success.</Fn>
          <Fn name="file.Root" args="" ret="string">Returns the scripts root directory path.</Fn>
        </Section>

        {/* ───────────── timer ───────────── */}
        <Section id="timer" title="timer">
          <p>Deferred execution and periodic tasks.</p>
          <Fn name="timer.After" args="delay: number, callback: function" ret="handle: integer">
            Run a function once after <code className="text-text-faint">delay</code> seconds.
          </Fn>
          <Fn name="timer.Every" args="interval: number, callback: function" ret="handle: integer">
            Run a function every <code className="text-text-faint">interval</code> seconds.
            Return <code className="text-text-faint">false</code> from the callback to stop.
          </Fn>
          <Fn name="timer.NextFrame" args="callback: function" ret="handle: integer">
            Run a function on the next frame. Shortcut for <code className="text-text-faint">timer.After(0, fn)</code>.
          </Fn>
          <Fn name="timer.Cancel" args="handle: integer" ret="boolean">Cancel a timer by handle.</Fn>
          <Fn name="timer.Count" args="" ret="integer">Number of active timers for this script.</Fn>
          <Example title="Example — periodic & one-shot">{`-- auto-save config every 30 seconds
timer.Every(30, function()
  store.save()
  return true  -- keep running (return false to stop)
end)

-- delayed notification
timer.After(3, function()
  cheat.Notify("Script loaded!")
end)

-- do something next frame (avoids blocking paint)
timer.NextFrame(function()
  http.Get("https://example.com/check")
end)`}</Example>
        </Section>

        {/* ───────────── log ───────────── */}
        <Section id="log" title="log">
          <p>
            Logging API. <code className="text-accent">print()</code> is redirected to{" "}
            <code className="text-text-faint">log.info</code>, so standard Lua prints appear in
            the console.
          </p>
          <Fn name="log.debug" args="...">Log at debug level. Arguments are joined with tabs.</Fn>
          <Fn name="log.info" args="...">Log at info level.</Fn>
          <Fn name="log.warn" args="...">Log at warning level.</Fn>
          <Fn name="log.error" args="...">Log at error level.</Fn>
          <Fn name="log.write" args='level: string, ...'>
            Log at a runtime-selected level. Level must be{" "}
            <code className="text-text-faint">&quot;debug&quot;</code>,{" "}
            <code className="text-text-faint">&quot;info&quot;</code>,{" "}
            <code className="text-text-faint">&quot;warn&quot;</code>, or{" "}
            <code className="text-text-faint">&quot;error&quot;</code>.
          </Fn>
        </Section>

        {/* ───────────── ffi ───────────── */}
        <Section id="ffi" title="ffi">
          <p>
            LuaJIT-compatible FFI subset for calling Windows API functions directly from Lua.
            Works on x64 Windows — all calling conventions collapse to Microsoft x64 ABI.
          </p>
          <Fn name="ffi.cdef" args="declaration: string">
            Compatibility stub — accepts C declarations but does not parse them.
          </Fn>
          <Fn name="ffi.new" args='ctype: string [, size]' ret="cdata">
            Allocate a typed buffer. Supports array syntax: <code className="text-text-faint">&quot;char[4096]&quot;</code>,{" "}
            <code className="text-text-faint">&quot;int[?]&quot;</code> (VLA — pass size as second arg).
          </Fn>
          <Fn name="ffi.cast" args="ctype: string, value" ret="integer">
            Cast a value to a raw integer (pointer-sized).
          </Fn>
          <Fn name="ffi.string" args="cdata [, len]" ret="string">
            Read a C string from a cdata buffer or pointer.
          </Fn>
          <Fn name="ffi.sizeof" args="ctype | cdata" ret="integer">
            Size in bytes of a type or cdata object.
          </Fn>
          <Fn name="ffi.copy" args="dst, src [, len]">
            Copy bytes between cdata buffers or from a Lua string.
          </Fn>
          <Fn name="ffi.fill" args="dst, len [, byte]">
            Fill a cdata buffer with a byte value (default 0).
          </Fn>
          <Fn name="ffi.load" args="library: string" ret="table">
            Load a DLL and return a table whose fields resolve to exports on access.
          </Fn>
          <Fn name="ffi.typeof" args="cdata" ret="string">
            Returns the C type name of a cdata object as a string.
          </Fn>
          <Fn name="ffi.gc" args="cdata, finalizer" ret="cdata">
            Associates a finalizer function with a cdata object. The finalizer is called when the cdata
            is garbage-collected. Pass <code className="text-text-faint">nil</code> to remove the finalizer.
          </Fn>
          <Fn name="ffi.abi" args="param: string" ret="boolean">
            Query ABI info. Returns true for <code className="text-text-faint">&quot;win&quot;</code>,{" "}
            <code className="text-text-faint">&quot;64bit&quot;</code>, and{" "}
            <code className="text-text-faint">&quot;le&quot;</code>.
          </Fn>

          <div className="mt-3">
            <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-1">ffi.C</h4>
            <p className="text-xs">
              Auto-resolving table of system library exports. Access any function from kernel32, user32,
              advapi32, ntdll, ws2_32, shell32, gdi32, ole32, msvcrt, winhttp, or crypt32 directly:
            </p>
            <pre className="text-xs font-mono bg-surface-2 rounded border border-border p-2 mt-1 overflow-x-auto">
{`local result = ffi.C.MessageBoxA(0, "Hello", "Title", 0)`}
            </pre>
          </div>

          <div className="mt-3">
            <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-1">CData Object</h4>
            <p className="text-xs">
              Indexable buffer with bounds checking. Supports <code className="text-text-faint">[index]</code> read/write
              (0-based), <code className="text-text-faint">#cdata</code> for total size in bytes,
              and <code className="text-text-faint">tostring()</code>.
            </p>
          </div>
          <Example title="Example — Windows API via ffi">{`-- allocate a buffer and call GetModuleFileNameA
local buf = ffi.new("char[260]")
ffi.C.GetModuleFileNameA(0, buf, 260)
print("Exe: " .. ffi.string(buf))

-- load a DLL and call an export
local ntdll = ffi.load("ntdll")
local ticks = ntdll.NtGetTickCount()
print("Ticks: " .. ticks)

-- MessageBox popup
ffi.C.MessageBoxA(0, "Hello from Lua!", "gscloud", 0)`}</Example>
        </Section>

        {/* ───────────── cvar ───────────── */}
        <Section id="cvar" title="cvar">
          <p>Console variable access — read and write cvars directly.</p>
          <Fn name="cvar.GetInt" args="name: string" ret="integer">Read cvar as integer.</Fn>
          <Fn name="cvar.GetFloat" args="name: string" ret="number">Read cvar as float.</Fn>
          <Fn name="cvar.GetString" args="name: string" ret="string">Read cvar as string.</Fn>
          <Fn name="cvar.SetInt" args="name: string, value: integer">Write integer value.</Fn>
          <Fn name="cvar.SetFloat" args="name: string, value: number">Write float value.</Fn>
          <Fn name="cvar.SetString" args="name: string, value: string">
            Write string value via console command buffer.
          </Fn>
          <Fn name="cvar.Find" args="name: string" ret="userdata | nil">
            Get raw ConVar pointer for advanced use.
          </Fn>
        </Section>

        {/* ───────────── trace ───────────── */}
        <Section id="trace" title="trace" badge="stub">
          <p>
            Ray tracing queries. Currently returns default results (no hit, fraction 1.0).
            The API signature is stable — implementations will be added when the engine
            trace interface is hooked.
          </p>
          <Fn name="trace.Line" args="from_x, from_y, from_z, to_x, to_y, to_z [, skip_ent, mask]" ret="TraceResult">
            Cast a ray between two points.
          </Fn>
          <Fn name="trace.Hull" args="from_x, from_y, from_z, to_x, to_y, to_z [, mins, maxs, skip_ent, mask]" ret="TraceResult">
            Cast a swept box between two points.
          </Fn>
          <Fn name="trace.Bullet" args="from_ent, to_ent" ret="{damage, hit}">
            Simulate a bullet trace between two entities.
          </Fn>
          <div className="mt-2">
            <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-1">TraceResult</h4>
            <p className="text-xs">
              <code className="text-text-faint">{`{ fraction, hit, entity, hitpos = {x,y,z}, normal = {x,y,z} }`}</code>
            </p>
          </div>
        </Section>

        {/* ───────────── panorama ───────────── */}
        <Section id="panorama" title="panorama" badge="stub">
          <p>Panorama UI scripting bridge. Currently a no-op — requires hooking the Panorama JS engine.</p>
          <Fn name="panorama.Execute" args="code: string">Execute Panorama JavaScript code.</Fn>
          <Fn name="panorama.Listen" args="event: string, callback: function" ret="handle: integer">
            Listen for a Panorama event. Currently returns 0.
          </Fn>
        </Section>

        {/* ───────────── types ───────────── */}
        <Section id="types" title="Types">
          <p>
            Global constructors for common value types. These are available without a module prefix.
          </p>

          <div className="mt-3">
            <h4 className="text-sm font-bold text-text mb-1">Color(r, g, b [, a])</h4>
            <p className="text-xs mb-2">RGBA color (0–255). Default alpha is 255.</p>
            <div className="text-xs space-y-0.5">
              <p>Methods: <code className="text-text-faint">:r()</code>, <code className="text-text-faint">:g()</code>, <code className="text-text-faint">:b()</code>, <code className="text-text-faint">:a()</code> — getters</p>
              <p>Methods: <code className="text-text-faint">:SetR(v)</code>, <code className="text-text-faint">:SetG(v)</code>, <code className="text-text-faint">:SetB(v)</code>, <code className="text-text-faint">:SetA(v)</code> — setters</p>
              <p>Supports <code className="text-text-faint">tostring()</code>: <code className="text-text-faint">&quot;Color(255, 0, 0, 255)&quot;</code></p>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-bold text-text mb-1">Vector(x, y, z)</h4>
            <p className="text-xs mb-2">3D vector with full arithmetic.</p>
            <div className="text-xs space-y-0.5">
              <p>Methods: <code className="text-text-faint">:x()</code>, <code className="text-text-faint">:y()</code>, <code className="text-text-faint">:z()</code></p>
              <p><code className="text-text-faint">:Length()</code>, <code className="text-text-faint">:Length2D()</code>, <code className="text-text-faint">:Dot(other)</code>, <code className="text-text-faint">:Cross(other)</code>, <code className="text-text-faint">:Normalized()</code></p>
              <p>Operators: <code className="text-text-faint">+</code>, <code className="text-text-faint">-</code>, <code className="text-text-faint">*</code> (scalar), <code className="text-text-faint">==</code></p>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-bold text-text mb-1">QAngle(pitch, yaw, roll)</h4>
            <p className="text-xs mb-2">Euler angle triplet.</p>
            <div className="text-xs space-y-0.5">
              <p>Methods: <code className="text-text-faint">:pitch()</code>, <code className="text-text-faint">:yaw()</code>, <code className="text-text-faint">:roll()</code></p>
              <p>Supports <code className="text-text-faint">tostring()</code>.</p>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-bold text-text mb-1">Pointer(address)</h4>
            <p className="text-xs mb-2">Raw memory pointer with SEH-safe read/write operations.</p>
            <div className="text-xs space-y-0.5">
              <p><code className="text-text-faint">:GetAddress()</code> — returns the raw address as an integer</p>
              <p><code className="text-text-faint">:IsValid()</code> — true if address ≠ 0</p>
              <p>Read: <code className="text-text-faint">:ReadByte(off)</code>, <code className="text-text-faint">:ReadShort(off)</code>, <code className="text-text-faint">:ReadInt(off)</code>, <code className="text-text-faint">:ReadInt64(off)</code>, <code className="text-text-faint">:ReadFloat(off)</code>, <code className="text-text-faint">:ReadDouble(off)</code>, <code className="text-text-faint">:ReadPointer(off)</code></p>
              <p>Write: <code className="text-text-faint">:WriteByte(off, val)</code>, <code className="text-text-faint">:WriteInt(off, val)</code>, <code className="text-text-faint">:WriteFloat(off, val)</code></p>
              <p><code className="text-text-faint">:Add(offset)</code> — returns a new Pointer at address + offset</p>
            </div>
          </div>
        </Section>

        {/* ───────────── quick start ───────────── */}
        <section id="quickstart" className="scroll-mt-20 mt-16 mb-8 space-y-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-accent">Quick Start</span> Examples
          </h2>

          <div className="border border-border rounded-lg p-5 bg-surface">
            <h3 className="text-sm font-bold mb-3">ESP Script</h3>
            <pre className="text-xs font-mono bg-surface-2 rounded border border-border p-4 overflow-x-auto leading-relaxed">
{`-- Create a UI tab with controls
local tab = ui.Tab("My Script")
local grp = tab:Group("Settings")
local enabled = grp:Checkbox("Enable ESP", true)
local color = grp:ColorPicker("Box Color", {1, 0, 0, 1})

-- Draw ESP boxes on paint
hooks.Add("Paint", "my_esp", function()
  if not enabled:Get() then return end

  local players = entity.GetPlayers()
  for _, ply in ipairs(players) do
    if entity.IsEnemy(ply) and entity.IsAlive(ply) then
      local x, y, w, h = entity.GetBoundingBox(ply)
      if x then
        renderer.Rect(x, y, w, h, color:Get())
        local name = entity.GetName(ply)
        renderer.Text(x, y - 12, name, {255,255,255,255}, 11)
      end
    end
  end
end)`}
            </pre>
          </div>

          <div className="border border-border rounded-lg p-5 bg-surface">
            <h3 className="text-sm font-bold mb-3">HUD Overlay with Stats</h3>
            <pre className="text-xs font-mono bg-surface-2 rounded border border-border p-4 overflow-x-auto leading-relaxed">
{`local tab = ui.Tab("HUD")
local g   = tab:Group("Display")
local showSpeed = g:Checkbox("Show Speed", true)
local showClock = g:Checkbox("Show Clock", true)

local kills = 0

events.On("player_death", function(e)
  local me = entity.GetLocalPlayer()
  if me and e.attacker == entity.GetIndex(me) then
    kills = kills + 1
  end
end)

events.On("round_start", function(e)
  kills = 0
end)

events.On("paint", function()
  local w, h = renderer.ScreenSize()
  local y = 60

  -- kill counter
  renderer.RectFilled(w - 140, y, 130, 28, Color(0, 0, 0, 150), 4)
  renderer.Text(w - 130, y + 6, "Kills: " .. kills,
    Color(255, 80, 80), 14, "strong")
  y = y + 34

  -- speedometer
  if showSpeed:Get() then
    local me = entity.GetLocalPlayer()
    if me then
      local vx, vy = entity.GetVelocity(me)
      local speed = math.floor(math.sqrt(vx*vx + vy*vy))
      renderer.RectFilled(w - 140, y, 130, 28, Color(0, 0, 0, 150), 4)
      renderer.Text(w - 130, y + 6, speed .. " u/s",
        Color(200, 220, 255), 14, "mono")
      y = y + 34
    end
  end

  -- clock
  if showClock:Get() then
    renderer.RectFilled(w - 140, y, 130, 28, Color(0, 0, 0, 150), 4)
    renderer.Text(w - 130, y + 6, cheat.GetTimestamp(),
      Color(180, 180, 180), 11, "mono")
  end
end)`}
            </pre>
          </div>
        </section>

      </div>
    </div>
  );
}
