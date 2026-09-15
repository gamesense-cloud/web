import Link from "next/link";
export const metadata = { title: "Lua API Docs — gamesense.cloud" };

/* ── lua syntax highlighting ──────────────────────────────────────────── */

const LUA_KEYWORDS = new Set([
  "and", "break", "do", "else", "elseif", "end", "for", "function",
  "if", "in", "local", "nil", "not", "or", "repeat", "return",
  "then", "until", "while", "true", "false",
]);

const LUA_BUILTINS = new Set([
  "ipairs", "pairs", "print", "tostring", "tonumber", "type",
  "require", "pcall", "xpcall", "select", "unpack", "error",
  "setmetatable", "getmetatable", "rawget", "rawset", "next",
  "assert", "string", "table", "math", "Color",
]);

function highlightLua(code: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < code.length) {
    // Multi-line comments: --[[ ... ]]
    if (code[i] === "-" && code[i + 1] === "-" && code[i + 2] === "[" && code[i + 3] === "[") {
      const end = code.indexOf("]]", i + 4);
      const slice = end === -1 ? code.slice(i) : code.slice(i, end + 2);
      tokens.push(<span key={key++} className="text-[#6a9955]">{slice}</span>);
      i += slice.length;
      continue;
    }

    // Single-line comments: -- ...
    if (code[i] === "-" && code[i + 1] === "-") {
      const end = code.indexOf("\n", i);
      const slice = end === -1 ? code.slice(i) : code.slice(i, end);
      tokens.push(<span key={key++} className="text-[#6a9955]">{slice}</span>);
      i += slice.length;
      continue;
    }

    // Strings: "..." or '...'
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      let j = i + 1;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === "\\") j++;
        j++;
      }
      const slice = code.slice(i, j + 1);
      tokens.push(<span key={key++} className="text-[#ce9178]">{slice}</span>);
      i = j + 1;
      continue;
    }

    // Multi-line strings: [[ ... ]]
    if (code[i] === "[" && code[i + 1] === "[") {
      const end = code.indexOf("]]", i + 2);
      const slice = end === -1 ? code.slice(i) : code.slice(i, end + 2);
      tokens.push(<span key={key++} className="text-[#ce9178]">{slice}</span>);
      i += slice.length;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(code[i]) && (i === 0 || /[\s(,{=+\-*/<>~%[]/.test(code[i - 1]))) {
      let j = i;
      if (code[j] === "0" && (code[j + 1] === "x" || code[j + 1] === "X")) {
        j += 2;
        while (j < code.length && /[0-9a-fA-F]/.test(code[j])) j++;
      } else {
        while (j < code.length && /[0-9.]/.test(code[j])) j++;
      }
      tokens.push(<span key={key++} className="text-[#b5cea8]">{code.slice(i, j)}</span>);
      i = j;
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) j++;
      const word = code.slice(i, j);
      if (LUA_KEYWORDS.has(word)) {
        tokens.push(<span key={key++} className="text-[#c586c0]">{word}</span>);
      } else if (LUA_BUILTINS.has(word)) {
        tokens.push(<span key={key++} className="text-[#dcdcaa]">{word}</span>);
      } else {
        tokens.push(<span key={key++}>{word}</span>);
      }
      i = j;
      continue;
    }

    // Operators: .. ~= == <= >= ~=
    if (code[i] === "." && code[i + 1] === ".") {
      tokens.push(<span key={key++} className="text-text-faint">{".."}</span>);
      i += 2;
      continue;
    }

    // Everything else (whitespace, punctuation)
    tokens.push(<span key={key++}>{code[i]}</span>);
    i++;
  }

  return tokens;
}

function LuaCode({ children, className = "" }: { children: string; className?: string }) {
  return (
    <pre className={`text-xs font-mono bg-surface-2 rounded border border-border p-3 overflow-x-auto leading-relaxed whitespace-pre ${className}`}>
      <code>{highlightLua(children)}</code>
    </pre>
  );
}

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
    <section id={id} className="scroll-mt-28">
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
      <LuaCode>{children}</LuaCode>
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
  { id: "chams", label: "chams" },
  { id: "world", label: "world" },
  { id: "materials", label: "materials" },
  { id: "anim", label: "anim" },
  { id: "net", label: "net" },
  { id: "sound", label: "sound" },
  { id: "particle", label: "particle" },
  { id: "skin", label: "skin" },
  { id: "movement", label: "movement" },
  { id: "aimbot", label: "aimbot" },
  { id: "visuals", label: "visuals" },
  { id: "config", label: "config" },
  { id: "bit", label: "bit" },
  { id: "antiaim", label: "antiaim" },
  { id: "types", label: "Types" },
  { id: "quickstart", label: "Quick Start" },
];

/* ── page ──────────────────────────────────────────────────────────── */

export default function Docs() {
  return (
    <div className="flex min-h-screen">
      {/* sidebar nav */}
      <aside className="hidden lg:block w-52 shrink-0 border-r border-border sticky top-[45px] h-[calc(100vh-45px)] overflow-y-auto py-8 px-4">
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
            <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-1">tab:Group(name [, panel]) → group</h4>
            <p className="text-xs mb-2">Create a named group within a tab. Optional <code className="text-text-faint">panel</code> is <code className="text-text-faint">&quot;A&quot;</code> or <code className="text-text-faint">&quot;B&quot;</code> — controls which column of the Script Items tab the group&apos;s widgets appear in. Defaults to <code className="text-text-faint">&quot;A&quot;</code>.</p>
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
local g = tab:Group("Settings", "A")       -- panel A (left column)
local info = tab:Group("Visuals", "B")     -- panel B (right column)

local enabled = g:Checkbox("Enabled", true)
local fov     = g:SliderFloat("FOV", 1.0, 30.0, 5.0)
local style   = g:Combo("Style", {"Circle", "Cross", "Dot"}, 1)
local hotkey  = g:Keybind("Toggle Key", input.KEY_X)

local color   = info:ColorPicker("Color", {1, 0, 0, 1})
info:Separator("Info")
local status = info:Label("Status: idle")

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
            <LuaCode className="p-2 mt-1">{`local result = ffi.C.MessageBoxA(0, "Hello", "Title", 0)`}</LuaCode>
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

        {/* ───────────── chams ───────────── */}
        <Section id="chams" title="chams">
          <p>
            Player model material override system. Renders custom materials on player models with
            support for 11 material types and separate visible/occluded (through-wall) passes.
          </p>
          <Fn name="chams.Enable" args="enabled: boolean">Enable or disable the chams system.</Fn>
          <Fn name="chams.SetColor" args='target: string, r, g, b, a'>
            Set color for a target. Target is one of:{" "}
            <code className="text-text-faint">&quot;enemy_visible&quot;</code>,{" "}
            <code className="text-text-faint">&quot;enemy_occluded&quot;</code>,{" "}
            <code className="text-text-faint">&quot;team_visible&quot;</code>,{" "}
            <code className="text-text-faint">&quot;team_occluded&quot;</code>,{" "}
            <code className="text-text-faint">&quot;local_visible&quot;</code>.
            RGBA values are 0.0–1.0.
          </Fn>
          <Fn name="chams.SetMaterial" args="type: string">
            Set the material type:{" "}
            <code className="text-text-faint">&quot;flat&quot;</code>,{" "}
            <code className="text-text-faint">&quot;matte&quot;</code>,{" "}
            <code className="text-text-faint">&quot;metallic&quot;</code>,{" "}
            <code className="text-text-faint">&quot;glow&quot;</code>,{" "}
            <code className="text-text-faint">&quot;bloom&quot;</code>,{" "}
            <code className="text-text-faint">&quot;electric&quot;</code>,{" "}
            <code className="text-text-faint">&quot;liquid&quot;</code>,{" "}
            <code className="text-text-faint">&quot;hologram&quot;</code>,{" "}
            <code className="text-text-faint">&quot;outlines&quot;</code>,{" "}
            <code className="text-text-faint">&quot;distortion&quot;</code>,{" "}
            <code className="text-text-faint">&quot;pearl&quot;</code>.
          </Fn>
          <Fn name="chams.GetConfig" args="" ret="table">Current chams configuration table.</Fn>
          <Fn name="chams.IsReady" args="" ret="boolean">Whether KV3 materials have been initialized.</Fn>
          <Fn name="chams.SetTeamEnabled" args="enabled: boolean">Toggle chams on teammates.</Fn>
          <Fn name="chams.SetOccludedEnabled" args="enabled: boolean">Toggle the occluded (through-wall) pass for enemies.</Fn>
          <Fn name="chams.SetLocalEnabled" args="enabled: boolean">Toggle chams on the local player model.</Fn>
          <Example title="Example — glow chams on enemies">{`chams.Enable(true)
chams.SetMaterial("glow")
chams.SetColor("enemy_visible", 1.0, 0.2, 0.2, 1.0)
chams.SetColor("enemy_occluded", 1.0, 0.8, 0.0, 0.6)
chams.SetOccludedEnabled(true)

-- optional: team chams
chams.SetTeamEnabled(true)
chams.SetColor("team_visible", 0.2, 0.5, 1.0, 1.0)`}</Example>
        </Section>

        {/* ───────────── world ───────────── */}
        <Section id="world" title="world">
          <p>
            World modulation — override fog, ambient lighting, skybox, night mode,
            color correction, and prop transparency.
          </p>
          <Fn name="world.SetNightMode" args="enabled: boolean">Toggle dark environment override.</Fn>
          <Fn name="world.SetFog" args="enabled, r, g, b, start, end_dist, density">
            Override fog parameters. Colors are 0–255, distances in world units, density 0.0–1.0.
          </Fn>
          <Fn name="world.SetAmbient" args="r, g, b">Set ambient lighting color (0.0–1.0).</Fn>
          <Fn name="world.SetSkybox" args="name: string">Change the skybox material name.</Fn>
          <Fn name="world.SetColorCorrection" args="brightness, contrast, saturation">
            Post-processing adjustments. All values are floats, 1.0 = default.
          </Fn>
          <Fn name="world.SetPropTransparency" args="alpha: number">World prop opacity (0.0–1.0). 0 = invisible.</Fn>
          <Fn name="world.Apply" args="">Force-apply all overrides to the current map.</Fn>
          <Fn name="world.Reset" args="">Reset all world overrides to game defaults.</Fn>
          <Fn name="world.GetConfig" args="" ret="table">Current world configuration table.</Fn>
          <Example title="Example — night mode with custom fog">{`world.SetNightMode(true)
world.SetFog(true, 20, 20, 40, 0, 800, 0.6)
world.SetAmbient(0.05, 0.05, 0.15)
world.SetColorCorrection(0.8, 1.2, 0.5)
world.Apply()`}</Example>
        </Section>

        {/* ───────────── materials ───────────── */}
        <Section id="materials" title="materials">
          <p>
            Low-level memory access primitives. SEH-protected reads/writes, pattern scanning,
            module enumeration, and virtual function calls. For advanced users building custom features.
          </p>
          <Fn name="materials.ReadByte" args="addr: integer" ret="integer">SEH-safe byte read.</Fn>
          <Fn name="materials.ReadInt" args="addr: integer" ret="integer">SEH-safe 32-bit int read.</Fn>
          <Fn name="materials.ReadFloat" args="addr: integer" ret="number">SEH-safe float read.</Fn>
          <Fn name="materials.ReadPointer" args="addr: integer" ret="integer">SEH-safe 64-bit pointer read.</Fn>
          <Fn name="materials.WriteByte" args="addr: integer, val: integer">SEH-safe byte write.</Fn>
          <Fn name="materials.WriteInt" args="addr: integer, val: integer">SEH-safe 32-bit int write.</Fn>
          <Fn name="materials.WriteFloat" args="addr: integer, val: number">SEH-safe float write.</Fn>
          <Fn name="materials.WritePointer" args="addr: integer, val: integer">SEH-safe 64-bit pointer write.</Fn>
          <Fn name="materials.PatternScan" args="module: string, pattern: string" ret="integer">
            Scan a DLL for a byte pattern. Returns the address or 0 on failure.
          </Fn>
          <Fn name="materials.GetModuleHandle" args="name: string" ret="integer">Module base address.</Fn>
          <Fn name="materials.GetModuleSize" args="name: string" ret="integer">Module image size in bytes.</Fn>
          <Fn name="materials.GetExport" args="module: string, name: string" ret="integer">
            Resolve an exported function address.
          </Fn>
          <Fn name="materials.CallVFunc" args="obj: integer, index: integer, ..." ret="integer">
            Call a virtual function by vtable index.
          </Fn>
          <Fn name="materials.ResolveRelative" args="addr, offset, instrSize" ret="integer">
            Resolve a RIP-relative address (common in x64 code).
          </Fn>
          <Example title="Example — pattern scan + read">{`local base = materials.GetModuleHandle("client.dll")
local addr = materials.PatternScan("client.dll", "48 8B 05 ?? ?? ?? ?? 48 85 C0 74")
if addr ~= 0 then
  local resolved = materials.ResolveRelative(addr, 3, 7)
  local ptr = materials.ReadPointer(resolved)
  print("Found: " .. string.format("0x%X", ptr))
end`}</Example>
        </Section>

        {/* ───────────── anim ───────────── */}
        <Section id="anim" title="anim">
          <p>
            Animation and bone access. Read and write bone positions/rotations,
            query model info, and control animation sequences.
          </p>
          <Fn name="anim.GetBonePosition" args="ent, boneIndex: integer" ret="x, y, z">
            Bone world position from the scene node bone array.
          </Fn>
          <Fn name="anim.GetBoneRotation" args="ent, boneIndex: integer" ret="pitch, yaw, roll">
            Bone rotation as Euler angles (converted from quaternion).
          </Fn>
          <Fn name="anim.GetBoneCount" args="ent" ret="integer">Number of bones in the model.</Fn>
          <Fn name="anim.GetModelName" args="ent" ret="string">Model file path string.</Fn>
          <Fn name="anim.SetBonePosition" args="ent, boneIndex: integer, x, y, z">Write a bone position.</Fn>
          <Fn name="anim.GetSequence" args="ent" ret="integer">Current animation sequence index.</Fn>
          <Fn name="anim.SetSequence" args="ent, seq: integer">Set the animation sequence.</Fn>
          <Fn name="anim.GetCycle" args="ent" ret="number">Animation cycle progress (0.0–1.0).</Fn>
          <Fn name="anim.SetCycle" args="ent, cycle: number">Set animation cycle (0.0–1.0).</Fn>
          <Fn name="anim.GetAbsOrigin" args="ent" ret="x, y, z">Absolute origin from the scene node.</Fn>
          <Fn name="anim.GetAbsRotation" args="ent" ret="pitch, yaw, roll">Absolute rotation from the scene node.</Fn>
          <Example title="Example — read head bone">{`local me = entity.GetLocalPlayer()
if me then
  local hx, hy, hz = anim.GetBonePosition(me, 6) -- bone 6 = head
  print("Head at: " .. hx .. ", " .. hy .. ", " .. hz)
  print("Bones: " .. anim.GetBoneCount(me))
  print("Model: " .. anim.GetModelName(me))
end`}</Example>
        </Section>

        {/* ───────────── net ───────────── */}
        <Section id="net" title="net">
          <p>
            Network information via <code className="text-text-faint">NetworkClientService_001</code> →{" "}
            <code className="text-text-faint">INetChannel</code>. Latency, loss, choke, and server details.
          </p>
          <Fn name="net.GetLatency" args="" ret="number">Round-trip time in seconds.</Fn>
          <Fn name="net.GetIncomingLoss" args="" ret="number">Incoming packet loss ratio (0.0–1.0).</Fn>
          <Fn name="net.GetOutgoingLoss" args="" ret="number">Outgoing packet loss ratio.</Fn>
          <Fn name="net.GetChoke" args="" ret="number">Choke ratio (0.0–1.0).</Fn>
          <Fn name="net.GetServerAddress" args="" ret="string">Server IP:port string.</Fn>
          <Fn name="net.GetInSequence" args="" ret="integer">Incoming sequence number.</Fn>
          <Fn name="net.GetOutSequence" args="" ret="integer">Outgoing sequence number.</Fn>
          <Fn name="net.IsConnected" args="" ret="boolean">Whether a net channel exists.</Fn>
        </Section>

        {/* ───────────── sound ───────────── */}
        <Section id="sound" title="sound">
          <p>Sound playback via the Source 2 sound system.</p>
          <Fn name="sound.Play" args="path: string">Play a sound file via PlayVSnd.</Fn>
          <Fn name="sound.PlayWithVolume" args="path: string, volume: number">
            Play with a specific volume (0.0–1.0).
          </Fn>
          <Fn name="sound.StopAll" args="">Stop all playing sounds (executes <code className="text-text-faint">stopsound</code>).</Fn>
        </Section>

        {/* ───────────── particle ───────────── */}
        <Section id="particle" title="particle">
          <p>Particle effect creation and management.</p>
          <Fn name="particle.Create" args="name: string, entity" ret="handle">
            Create a particle effect attached to an entity. Returns a particle handle.
          </Fn>
          <Fn name="particle.GetManager" args="" ret="userdata">
            Get the particle system manager pointer.
          </Fn>
        </Section>

        {/* ───────────── skin ───────────── */}
        <Section id="skin" title="skin">
          <p>
            Weapon skin manipulation via <code className="text-text-faint">CEconItemView</code>.
            Modify paint kits, seeds, wear, and StatTrak values on weapons.
          </p>
          <Fn name="skin.SetPaintKit" args="weapon, id: integer">Set the skin paint kit ID.</Fn>
          <Fn name="skin.SetSeed" args="weapon, seed: integer">Set the pattern seed.</Fn>
          <Fn name="skin.SetWear" args="weapon, wear: number">Set wear value (0.0 = factory new, 1.0 = battle-scarred).</Fn>
          <Fn name="skin.SetStatTrak" args="weapon, kills: integer">Set the StatTrak kill counter.</Fn>
          <Fn name="skin.GetPaintKit" args="weapon" ret="integer">Read current paint kit ID.</Fn>
          <Fn name="skin.GetWear" args="weapon" ret="number">Read current wear value.</Fn>
          <Fn name="skin.ForceUpdate" args="">
            Regenerate all weapon visuals (calls <code className="text-text-faint">RegenerateWeaponSkins</code>).
          </Fn>
          <Example title="Example — skin changer">{`events.On("frame_stage", function(stage)
  if stage ~= 5 then return end
  local me = entity.GetLocalPlayer()
  if not me then return end
  local weapon = entity.GetWeapon(me)
  if not weapon then return end

  skin.SetPaintKit(weapon, 344)  -- Howl
  skin.SetSeed(weapon, 0)
  skin.SetWear(weapon, 0.001)    -- factory new
  skin.SetStatTrak(weapon, 1337)
  skin.ForceUpdate()
end)`}</Example>
        </Section>

        {/* ───────────── movement ───────────── */}
        <Section id="movement" title="movement">
          <p>
            Movement helpers — bunny hop, air strafing, speed queries, and direct command manipulation.
            Works with the <code className="text-accent">createmove</code> event&apos;s cmd parameter.
          </p>
          <Fn name="movement.GetSpeed" args="ent" ret="number">2D velocity magnitude (XY plane).</Fn>
          <Fn name="movement.GetSpeed3D" args="ent" ret="number">3D velocity magnitude.</Fn>
          <Fn name="movement.IsOnGround" args="ent" ret="boolean">
            True when <code className="text-text-faint">FL_ONGROUND</code> flag is set.
          </Fn>
          <Fn name="movement.IsCrouching" args="ent" ret="boolean">
            True when <code className="text-text-faint">FL_DUCKING</code> flag is set.
          </Fn>
          <Fn name="movement.GetMoveType" args="ent" ret="integer">Movement type enum value.</Fn>
          <Fn name="movement.AutoBhop" args="cmd">
            Automatic bunny-hop — sets <code className="text-text-faint">IN_JUMP</code> when on ground,
            clears it when airborne.
          </Fn>
          <Fn name="movement.StrafeOptimize" args="cmd, viewYaw: number">
            Air strafe optimizer — adjusts sidemove based on velocity direction.
          </Fn>
          <Fn name="movement.GetFallVelocity" args="ent" ret="number">Vertical velocity component (Z).</Fn>
          <Fn name="movement.CorrectMovement" args="cmd, oldYaw: number, newYaw: number">
            Rotate forwardmove/sidemove to match new view angles after an angle change.
          </Fn>
          <Fn name="movement.GetMaxSpeed" args="ent" ret="number">
            Max speed from <code className="text-text-faint">m_flMaxSpeed</code> (default 250).
          </Fn>
          <Fn name="movement.SetForwardMove" args="cmd, val: number">Write forwardmove to the command.</Fn>
          <Fn name="movement.SetSideMove" args="cmd, val: number">Write sidemove to the command.</Fn>
          <Fn name="movement.GetForwardMove" args="cmd" ret="number">Read forwardmove from the command.</Fn>
          <Fn name="movement.GetSideMove" args="cmd" ret="number">Read sidemove from the command.</Fn>
          <Example title="Example — bhop + air strafe">{`events.On("createmove", function(cmd)
  movement.AutoBhop(cmd)

  local me = entity.GetLocalPlayer()
  if me and not movement.IsOnGround(me) then
    local _, yaw = engine.GetViewAngles()
    movement.StrafeOptimize(cmd, yaw)
  end
end)

-- show speed on screen
events.On("paint", function()
  local me = entity.GetLocalPlayer()
  if not me then return end
  local speed = math.floor(movement.GetSpeed(me))
  local w, h = renderer.ScreenSize()
  renderer.Text(w/2, h - 60, speed .. " u/s",
    Color(200, 220, 255), 16, "mono")
end)`}</Example>
        </Section>

        {/* ───────────── aimbot ───────────── */}
        <Section id="aimbot" title="aimbot">
          <p>
            Aim calculation utilities — angle math, FOV checks, smoothing, recoil compensation,
            and distance functions. Build your own aim logic with these building blocks.
          </p>
          <Fn name="aimbot.CalcAngle" args="sx, sy, sz, dx, dy, dz" ret="pitch, yaw">
            Calculate the angles from source position to destination position.
          </Fn>
          <Fn name="aimbot.GetFOV" args="myPitch, myYaw, targetPitch, targetYaw" ret="number">
            Angular distance in degrees between two view directions.
          </Fn>
          <Fn name="aimbot.SmoothAngle" args="curPitch, curYaw, tgtPitch, tgtYaw, factor" ret="pitch, yaw">
            Interpolate towards target angles. Factor 1.0 = instant, higher = slower.
          </Fn>
          <Fn name="aimbot.NormalizeAngle" args="pitch, yaw" ret="pitch, yaw">
            Clamp pitch to [-89, 89] and yaw to [-180, 180].
          </Fn>
          <Fn name="aimbot.GetDistance" args="x1, y1, z1, x2, y2, z2" ret="number">3D distance between points.</Fn>
          <Fn name="aimbot.GetDistance2D" args="x1, y1, x2, y2" ret="number">2D distance between points.</Fn>
          <Fn name="aimbot.GetRCS" args="" ret="pitch, yaw">
            Recoil compensation values (2x <code className="text-text-faint">m_aimPunchAngle</code>).
            Subtract from your aim angles for RCS.
          </Fn>
          <Fn name="aimbot.GetPunchAngle" args="" ret="pitch, yaw, roll">
            Raw aim punch angle vector.
          </Fn>
          <Fn name="aimbot.AngleDelta" args="a: number, b: number" ret="number">
            Shortest angular distance between two angles.
          </Fn>
          <Fn name="aimbot.VectorToAngle" args="x, y, z" ret="pitch, yaw">Direction vector to Euler angles.</Fn>
          <Fn name="aimbot.AngleToVector" args="pitch, yaw" ret="x, y, z">Euler angles to direction vector.</Fn>
          <Fn name="aimbot.GetShotsFired" args="" ret="integer">
            Number of shots fired in current burst (<code className="text-text-faint">m_iShotsFired</code>).
          </Fn>
          <Fn name="aimbot.IsVisible" args="sx, sy, sz, dx, dy, dz" ret="boolean">
            Basic visibility check (trace). Returns true as fallback if trace unavailable.
          </Fn>
          <Example title="Example — smooth aim at nearest enemy head">{`events.On("createmove", function(cmd)
  if not input.IsKeyDown(input.MOUSE_RIGHT) then return end

  local me = entity.GetLocalPlayer()
  if not me then return end
  local ex, ey, ez = entity.GetEyePosition(me)
  local myP, myY = engine.GetViewAngles()

  local bestFOV = 5.0  -- max FOV
  local bestP, bestY = myP, myY

  for _, ply in ipairs(entity.GetPlayers()) do
    if entity.IsEnemy(ply) and entity.IsAlive(ply) then
      local hx, hy, hz = entity.GetHitboxPosition(ply, 6) -- head
      local tp, ty = aimbot.CalcAngle(ex, ey, ez, hx, hy, hz)
      local fov = aimbot.GetFOV(myP, myY, tp, ty)
      if fov < bestFOV then
        bestFOV = fov
        bestP, bestY = tp, ty
      end
    end
  end

  if bestFOV < 5.0 then
    -- apply RCS
    local rp, ry = aimbot.GetRCS()
    bestP = bestP - rp
    bestY = bestY - ry
    -- smooth
    bestP, bestY = aimbot.SmoothAngle(myP, myY, bestP, bestY, 3.0)
    engine.SetViewAngles(bestP, bestY, 0)
  end
end)`}</Example>
        </Section>

        {/* ───────────── visuals ───────────── */}
        <Section id="visuals" title="visuals">
          <p>
            Visual effect helpers — smoke/flash removal, scope overlay, third person,
            visual recoil suppression, and FOV override.
          </p>
          <Fn name="visuals.SetRemoveSmoke" args="enabled: boolean">Toggle smoke grenade removal.</Fn>
          <Fn name="visuals.GetRemoveSmoke" args="" ret="boolean">Whether smoke removal is active.</Fn>
          <Fn name="visuals.SetRemoveFlash" args="enabled: boolean">Toggle flashbang removal.</Fn>
          <Fn name="visuals.SetFlashMaxAlpha" args="alpha: number">
            Maximum flash alpha (0.0 = fully removed). Only applies when flash removal is enabled.
          </Fn>
          <Fn name="visuals.ApplyFlash" args="">
            Apply the flash override. Call this in your <code className="text-accent">frame_stage</code> handler.
          </Fn>
          <Fn name="visuals.SetNoScopeOverlay" args="enabled: boolean">Remove the sniper scope overlay.</Fn>
          <Fn name="visuals.SetThirdPerson" args="enabled: boolean">Toggle third-person camera.</Fn>
          <Fn name="visuals.SetThirdPersonDist" args="dist: number">Third-person camera distance (default 150).</Fn>
          <Fn name="visuals.SetNoVisualRecoil" args="enabled: boolean">Suppress visual punch (screen shake on fire).</Fn>
          <Fn name="visuals.ApplyNoRecoil" args="">
            Zero the visual punch angles. Call in <code className="text-accent">frame_stage</code>.
          </Fn>
          <Fn name="visuals.GetConfig" args="" ret="table">Current visuals configuration table.</Fn>
          <Fn name="visuals.Reset" args="">Reset all visual overrides to defaults.</Fn>
          <Fn name="visuals.GetFOV" args="" ret="integer">Read the current desired FOV.</Fn>
          <Fn name="visuals.SetFOV" args="fov: integer">Override field of view (e.g. 120 for wide).</Fn>
          <Example title="Example — no flash + wide FOV">{`visuals.SetRemoveFlash(true)
visuals.SetFlashMaxAlpha(0.0)
visuals.SetNoScopeOverlay(true)
visuals.SetNoVisualRecoil(true)
visuals.SetFOV(110)

events.On("frame_stage", function(stage)
  if stage == 5 then
    visuals.ApplyFlash()
    visuals.ApplyNoRecoil()
  end
end)`}</Example>
        </Section>

        {/* ───────────── config ───────────── */}
        <Section id="config" title="config">
          <p>
            Configuration save/load system. Files are stored in the scripts/configs directory.
            Path traversal (<code className="text-text-faint">..</code>) is blocked.
          </p>
          <Fn name="config.Save" args="filename: string, data: string" ret="boolean">
            Save a string to a config file. Returns true on success. Typically used with{" "}
            <code className="text-text-faint">json.Encode()</code>.
          </Fn>
          <Fn name="config.Load" args="filename: string" ret="string | nil">
            Load a config file as a string. Returns nil if not found.
          </Fn>
          <Fn name="config.Exists" args="filename: string" ret="boolean">Check if a config file exists.</Fn>
          <Fn name="config.Delete" args="filename: string" ret="boolean">Delete a config file.</Fn>
          <Fn name="config.List" args="" ret="table">List all config filenames as a sequential table.</Fn>
          <Fn name="config.GetPath" args="" ret="string">Return the config directory path.</Fn>
          <Example title="Example — save/load settings">{`local settings = {
  aimFov = 5.0,
  espEnabled = true,
  chamsColor = {1, 0, 0, 1},
}

-- save
local ok = config.Save("my_cfg.json", json.Encode(settings, true))
if ok then cheat.Notify("Config saved!") end

-- load
local raw = config.Load("my_cfg.json")
if raw then
  settings = json.Decode(raw)
  cheat.Notify("Config loaded!")
end

-- list all configs
for _, name in ipairs(config.List()) do
  print("Config: " .. name)
end`}</Example>
        </Section>

        {/* ───────────── bit ───────────── */}
        <Section id="bit" title="bit">
          <p>
            Bitwise operations and CS2 engine constants. Use these for button flags,
            entity flags, team numbers, and hitbox IDs.
          </p>
          <Fn name="bit.band" args="a, b" ret="integer">Bitwise AND.</Fn>
          <Fn name="bit.bor" args="a, b" ret="integer">Bitwise OR.</Fn>
          <Fn name="bit.bxor" args="a, b" ret="integer">Bitwise XOR.</Fn>
          <Fn name="bit.bnot" args="a" ret="integer">Bitwise NOT.</Fn>
          <Fn name="bit.lshift" args="a, n" ret="integer">Left shift by n bits.</Fn>
          <Fn name="bit.rshift" args="a, n" ret="integer">Unsigned right shift by n bits.</Fn>
          <Fn name="bit.test" args="flags, bit" ret="boolean">Test whether a bit/mask is set in flags.</Fn>

          <div className="mt-3">
            <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-1">Button Constants (IN_*)</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-xs mt-1">
              {["IN_ATTACK", "IN_JUMP", "IN_DUCK", "IN_FORWARD", "IN_BACK", "IN_USE",
                "IN_CANCEL", "IN_LEFT", "IN_RIGHT", "IN_MOVELEFT", "IN_MOVERIGHT",
                "IN_ATTACK2", "IN_RUN", "IN_RELOAD", "IN_ALT1", "IN_ALT2", "IN_SCORE",
                "IN_SPEED", "IN_WALK", "IN_ZOOM", "IN_WEAPON1", "IN_WEAPON2",
                "IN_BULLRUSH", "IN_GRENADE1", "IN_GRENADE2", "IN_LOOKSPIN",
              ].map(c => <code key={c} className="text-text-faint">bit.{c}</code>)}
            </div>
          </div>

          <div className="mt-3">
            <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-1">Entity Flags</h4>
            <p className="text-xs">
              <code className="text-text-faint">FL_ONGROUND</code>,{" "}
              <code className="text-text-faint">FL_DUCKING</code>,{" "}
              <code className="text-text-faint">FL_FROZEN</code>,{" "}
              <code className="text-text-faint">FL_ATCONTROLS</code>,{" "}
              <code className="text-text-faint">FL_FLY</code>
            </p>
          </div>

          <div className="mt-3">
            <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-1">Teams &amp; Hitboxes</h4>
            <p className="text-xs">
              Teams:{" "}
              <code className="text-text-faint">TEAM_NONE</code> (0),{" "}
              <code className="text-text-faint">TEAM_SPECTATOR</code> (1),{" "}
              <code className="text-text-faint">TEAM_T</code> (2),{" "}
              <code className="text-text-faint">TEAM_CT</code> (3)
            </p>
            <p className="text-xs mt-1">
              Hitboxes:{" "}
              <code className="text-text-faint">HITBOX_HEAD</code> (6),{" "}
              <code className="text-text-faint">HITBOX_NECK</code> (5),{" "}
              <code className="text-text-faint">HITBOX_CHEST</code> (4),{" "}
              <code className="text-text-faint">HITBOX_STOMACH</code> (3),{" "}
              <code className="text-text-faint">HITBOX_PELVIS</code> (0)
            </p>
          </div>
          <Example title="Example — check flags with bit ops">{`events.On("createmove", function(cmd)
  local me = entity.GetLocalPlayer()
  if not me then return end
  local flags = entity.GetFlags(me)

  if bit.test(flags, bit.FL_ONGROUND) then
    print("On ground")
  end

  -- check if jumping
  local buttons = 0 -- from cmd
  if bit.test(buttons, bit.IN_JUMP) then
    print("Jumping!")
  end
end)`}</Example>
        </Section>

        {/* ───────────── antiaim ───────────── */}
        <Section id="antiaim" title="antiaim">
          <p>
            Anti-aim angle manipulation for HvH. Supports desync, jitter, real/fake angle separation,
            and freestanding (face away from target).
          </p>
          <Fn name="antiaim.Enable" args="enabled: boolean">Toggle anti-aim processing.</Fn>
          <Fn name="antiaim.IsEnabled" args="" ret="boolean">Whether anti-aim is active.</Fn>
          <Fn name="antiaim.SetRealAngles" args="pitch, yaw">Set the &quot;real&quot; server-side angles.</Fn>
          <Fn name="antiaim.GetRealAngles" args="" ret="pitch, yaw">Read current real angles.</Fn>
          <Fn name="antiaim.SetFakeAngles" args="pitch, yaw">Set the &quot;fake&quot; client-side angles.</Fn>
          <Fn name="antiaim.GetFakeAngles" args="" ret="pitch, yaw">Read current fake angles.</Fn>
          <Fn name="antiaim.SetDesync" args="enabled: boolean">Toggle desync (real/fake angle split).</Fn>
          <Fn name="antiaim.SetDesyncAmount" args="degrees: number">
            Desync offset in degrees (clamped to [-58, 58]).
          </Fn>
          <Fn name="antiaim.GetDesyncAmount" args="" ret="number">Current desync amount.</Fn>
          <Fn name="antiaim.SetJitter" args="enabled: boolean">Toggle yaw jitter.</Fn>
          <Fn name="antiaim.SetJitterRange" args="degrees: number">Jitter range in degrees.</Fn>
          <Fn name="antiaim.Apply" args="cmd">
            Apply the configured anti-aim to the command&apos;s view angles. Call inside{" "}
            <code className="text-accent">createmove</code>.
          </Fn>
          <Fn name="antiaim.GetAtTarget" args="targetX, targetY, myX, myY" ret="number">
            Calculate yaw facing away from a target position (freestanding).
          </Fn>
          <Fn name="antiaim.GetConfig" args="" ret="table">Current anti-aim configuration table.</Fn>
          <Fn name="antiaim.Reset" args="">Reset all anti-aim settings to defaults.</Fn>
          <Example title="Example — desync anti-aim">{`antiaim.Enable(true)
antiaim.SetDesync(true)
antiaim.SetDesyncAmount(58)
antiaim.SetJitter(true)
antiaim.SetJitterRange(30)

events.On("createmove", function(cmd)
  local me = entity.GetLocalPlayer()
  if not me then return end

  -- freestand: face away from nearest enemy
  local ex, ey, ez = entity.GetEyePosition(me)
  local nearest, nearDist = nil, 99999
  for _, ply in ipairs(entity.GetPlayers()) do
    if entity.IsEnemy(ply) and entity.IsAlive(ply) then
      local px, py, pz = entity.GetPosition(ply)
      local d = aimbot.GetDistance(ex, ey, ez, px, py, pz)
      if d < nearDist then nearDist = d; nearest = ply end
    end
  end

  if nearest then
    local px, py = entity.GetPosition(nearest)
    local yaw = antiaim.GetAtTarget(px, py, ex, ey)
    antiaim.SetRealAngles(-89, yaw) -- down pitch
  end

  antiaim.Apply(cmd)
end)`}</Example>
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
        <section id="quickstart" className="scroll-mt-28 mt-16 mb-8 space-y-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-accent">Quick Start</span> Examples
          </h2>

          <div className="border border-border rounded-lg p-5 bg-surface">
            <h3 className="text-sm font-bold mb-3">ESP Script</h3>
            <LuaCode className="p-4">{`-- Create a UI tab with controls
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
end)`}</LuaCode>
          </div>

          <div className="border border-border rounded-lg p-5 bg-surface">
            <h3 className="text-sm font-bold mb-3">HUD Overlay with Stats</h3>
            <LuaCode className="p-4">{`local tab = ui.Tab("HUD")
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
end)`}</LuaCode>
          </div>

          <div className="border border-border rounded-lg p-5 bg-surface">
            <h3 className="text-sm font-bold mb-3">Bunny Hop + Air Strafe</h3>
            <LuaCode className="p-4">{`-- auto bhop with air strafe optimization
events.On("createmove", function(cmd)
  movement.AutoBhop(cmd)

  local me = entity.GetLocalPlayer()
  if me and not movement.IsOnGround(me) then
    local _, yaw = engine.GetViewAngles()
    movement.StrafeOptimize(cmd, yaw)
  end
end)

-- speedometer HUD
events.On("paint", function()
  local me = entity.GetLocalPlayer()
  if not me then return end
  local speed = math.floor(movement.GetSpeed(me))
  local w, h = renderer.ScreenSize()
  local color = speed > 300 and Color(100, 255, 100) or Color(200, 200, 200)
  renderer.Text(w/2, h - 50, speed .. " u/s", color, 18, "mono")
end)`}</LuaCode>
          </div>

          <div className="border border-border rounded-lg p-5 bg-surface">
            <h3 className="text-sm font-bold mb-3">Skin Changer</h3>
            <LuaCode className="p-4">{`local tab = ui.Tab("Skins")
local g = tab:Group("Weapon Skins")
local paintKit = g:SliderInt("Paint Kit", 1, 1200, 344)
local wear = g:SliderFloat("Wear", 0.0, 1.0, 0.001)
local seed = g:SliderInt("Seed", 0, 1000, 0)
local stattrak = g:SliderInt("StatTrak", -1, 99999, -1)

events.On("frame_stage", function(stage)
  if stage ~= 5 then return end
  local me = entity.GetLocalPlayer()
  if not me then return end
  local weapon = entity.GetWeapon(me)
  if not weapon then return end

  skin.SetPaintKit(weapon, paintKit:Get())
  skin.SetWear(weapon, wear:Get())
  skin.SetSeed(weapon, seed:Get())
  if stattrak:Get() >= 0 then
    skin.SetStatTrak(weapon, stattrak:Get())
  end
  skin.ForceUpdate()
end)`}</LuaCode>
          </div>
        </section>

      </div>
    </div>
  );
}
