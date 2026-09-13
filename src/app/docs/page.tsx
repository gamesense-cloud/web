import Link from "next/link";

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
  children,
}: {
  name: string;
  args: string;
  ret?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="py-2">
      <Sig name={name} args={args} ret={ret} />
      {children && <div className="text-text-muted text-xs leading-relaxed">{children}</div>}
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
  { id: "cvar", label: "cvar" },
  { id: "trace", label: "trace" },
  { id: "panorama", label: "panorama" },
  { id: "types", label: "Types" },
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
            True if the entity pointer is null (dormant entities aren&apos;t in the client entity list).
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
            Competitive teammate color index (0–4), or -1 if unavailable.
          </Fn>
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
          <Fn name="renderer.Polygon" args="points, [color, thickness]">
            Draw a closed polygon outline. <code className="text-text-faint">points</code> is an array of{" "}
            <code className="text-text-faint">{"{x, y}"}</code> tables (minimum 3).
          </Fn>
          <Fn name="renderer.PolygonFilled" args="points [, color]">
            Draw a filled convex polygon.
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
          <Fn name="renderer.MeasureText" args="text [, size, font]" ret="width, height">
            Measure text dimensions without drawing.
          </Fn>
          <Fn name="renderer.ScreenSize" args="" ret="width, height">Canvas dimensions.</Fn>
          <Fn name="renderer.WorldToScreen" args="x, y, z" ret="sx, sy | nil">
            Project world position to screen. Returns two numbers or nil if behind camera.
          </Fn>
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
              <code className="text-text-faint">PAGE_DOWN</code>
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
            <Fn name="group:Button" args="label [, callback]" ret="control">Clickable button.</Fn>
            <Fn name="group:ColorPicker" args="label [, default: {r,g,b,a}]" ret="control">RGBA color picker (0–1 range).</Fn>
            <Fn name="group:Textbox" args="label [, default: string]" ret="control">Text input field.</Fn>
            <Fn name="group:Keybind" args="label [, default_key]" ret="control">Key binding selector.</Fn>
            <Fn name="group:Label" args="text" ret="control">Static text label.</Fn>
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
                "RoundStart", "RoundEnd", "PlayerDeath", "PlayerHurt",
                "ItemPurchase", "BombPlanted", "BombDefused", "BombExploded",
                "WeaponFire", "BulletImpact", "FreezeTimeEnd",
                "VoteSetup", "EdgeBug", "JumpBug", "PixelSurf",
              ].map((h) => (
                <code key={h} className="text-text-faint">{h}</code>
              ))}
            </div>
          </div>
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
            Add custom text to an entity. Position is a string like <code className="text-text-faint">&quot;top&quot;</code> or <code className="text-text-faint">&quot;bottom&quot;</code>.
          </Fn>
          <Fn name="esp.CustomBar" args="entity_index, position, value [, color]">
            Add a custom bar (0.0–1.0) to an entity.
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
        <section id="quickstart" className="scroll-mt-20 mt-16 mb-8 border border-border rounded-lg p-5 bg-surface">
          <h2 className="text-base font-bold mb-3">Quick Start Example</h2>
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
        </section>

      </div>
    </div>
  );
}
