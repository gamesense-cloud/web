import LuaCode from "../LuaCode";

export const metadata = { title: "Lua API Docs — gamesense.cloud" };

/* ── tiny helpers ─────────────────────────────────────────────────────── */

function Badge({ children, color = "accent" }: { children: React.ReactNode; color?: string }) {
  return <span className={`badge ${color}`}>{children}</span>;
}

function Sig({ name, args, ret }: { name: string; args: string; ret?: string }) {
  return (
    <code className="sig">
      <span className="text-accent">{name}</span>
      <span className="text-text-faint">(</span>
      {args}
      <span className="text-text-faint">)</span>
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
    <section id={id} className="panel doc-section">
      <div className="panel-head">
        <h2>{title}</h2>
        {badge && <Badge color={badge === "stub" ? "warn" : "ok"}>{badge}</Badge>}
      </div>
      <div className="doc-body">{children}</div>
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
    <div className="fn" data-fn={name} data-desc={desc ?? ""}>
      <Sig name={name} args={args} ret={ret} />
      {children && <div className="fn-desc">{children}</div>}
    </div>
  );
}

function Example({ title, children }: { title: string; children: string }) {
  return (
    <div className="example">
      <h4 className="label">{title}</h4>
      <LuaCode>{children}</LuaCode>
    </div>
  );
}

/* ── page ──────────────────────────────────────────────────────────── */

export default function Docs() {
  return (
    <div className="doc">
      <header className="doc-head">
        <span className="label">Lua API</span>
        <h1>Reference</h1>
        <p>
          Complete reference for the gamesense.cloud Lua scripting API. All modules follow
          the Starline convention — global tables with PascalCase function names. Entity
          functions transparently resolve controllers to pawns for CS2 compatibility.
        </p>
        <p className="doc-tip">Press <kbd className="kbd">Ctrl K</kbd> to search every function.</p>
      </header>

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
          <Fn name="engine.ForceButtons" args="flags: integer">
            Force movement button flags for one tick (e.g. <code className="text-text-faint">input.IN_JUMP</code>).
          </Fn>
          <Fn name="engine.GetButtonState" args="" ret="integer">
            Current button state as IN_* flags bitmask.
          </Fn>
          <Fn name="engine.GetGameMode" args="" ret="string">
            Current game mode: <code className="text-accent">&quot;competitive&quot;</code>, <code className="text-accent">&quot;casual&quot;</code>, <code className="text-accent">&quot;deathmatch&quot;</code>, <code className="text-accent">&quot;wingman&quot;</code>, etc.
          </Fn>
          <Fn name="engine.AimAt" args="pitch, yaw [, smooth]">
            Queue view-angle interpolation. Inside a createmove callback it aims that tick&apos;s usercmd and camera; otherwise the next CreateMoves each move 1/<code className="text-text-faint">smooth</code> of the way there. Pitch is clamped to [-89, 89], yaw wrapped to [-180, 180], smooth defaults to 1.0 (instant).
          </Fn>
          <Fn name="engine.CancelAim" args="">
            Drop a pending AimAt that the CreateMove hook has not yet applied.
          </Fn>
          <Fn name="engine.IsWarmup" args="" ret="boolean">Whether the game is in warmup phase.</Fn>
          <Fn name="engine.GetBombPlanted" args="" ret="boolean">Whether the bomb is currently planted.</Fn>
          <Fn name="engine.GetGlobalVars" args="" ret="table">
            Returns a table with global engine variables: <code className="text-text-faint">realtime</code>, <code className="text-text-faint">curtime</code>, <code className="text-text-faint">frametime</code>, <code className="text-text-faint">tickcount</code>, <code className="text-text-faint">tickinterval</code>, <code className="text-text-faint">maxclients</code>.
          </Fn>
          <Example title="Example — log game state">{`if engine.IsInGame() then
  local w, h = engine.GetScreenSize()
  print(engine.GetMapName() .. " | " .. w .. "x" .. h .. " | " .. engine.GetRoundPhase())
end`}</Example>
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
          <Fn name="entity.SetPropInt" args="ent, class: string, field: string, value: integer">
            Write an integer schema field.
          </Fn>
          <Fn name="entity.SetPropFloat" args="ent, class: string, field: string, value: number">
            Write a float schema field.
          </Fn>
          <Fn name="entity.SetPropBool" args="ent, class: string, field: string, value: boolean">
            Write a boolean schema field.
          </Fn>
          <Fn name="entity.SetPropVec3" args="ent, class: string, field: string, x, y, z">
            Write a Vector schema field.
          </Fn>
          <Fn name="entity.GetAddress" args="ent" ret="integer">Raw pointer address of the entity.</Fn>
          <Fn name="entity.GetSceneNode" args="ent" ret="userdata | nil">
            Get the CGameSceneNode pointer for the entity.
          </Fn>
          <Fn name="entity.GetBoneCount" args="ent" ret="integer">Number of bones in the entity&apos;s model.</Fn>
          <Fn name="entity.GetClassName" args="ent" ret="string">Entity class name (e.g. <code className="text-text-faint">&quot;C_CSPlayerPawn&quot;</code>).</Fn>
          <Fn name="entity.IsDefusing" args="ent" ret="boolean">Whether the player is defusing the bomb.</Fn>
          <Fn name="entity.IsPlanting" args="ent" ret="boolean">Whether the player is planting the bomb.</Fn>
          <Fn name="entity.GetAllPlayers" args="" ret="table">
            Returns a table of all player entries with <code className="text-text-faint">pawn</code>, <code className="text-text-faint">controller</code>, <code className="text-text-faint">alive</code>, <code className="text-text-faint">team</code>, <code className="text-text-faint">name</code> fields.
          </Fn>
          <Fn name="entity.GetGrenades" args="" ret="table">
            Returns a table of active grenade/projectile entities.
          </Fn>
          <Fn name="entity.SetEntityGlow" args="entity, r, g, b, a?, glowType?" ret="">
            Apply a colored glow effect (0-255 color values, optional alpha and glow type).
          </Fn>
          <Fn name="entity.RemoveEntityGlow" args="entity" ret="">
            Remove glow effect from an entity.
          </Fn>
          <Fn name="entity.SetEntityColor" args="entity, r, g, b, a?" ret="">
            Set the render color of an entity (0-255 values).
          </Fn>
          <Fn name="entity.IsOnScreen" args="x, y, z" ret="boolean">
            Check if a world position is within screen bounds.
          </Fn>
          <Fn name="entity.GetWeaponType" args="ent" ret="string">
            Weapon type: &quot;knife&quot;, &quot;pistol&quot;, &quot;smg&quot;, &quot;rifle&quot;, &quot;shotgun&quot;, &quot;sniper&quot;, &quot;lmg&quot;, &quot;grenade&quot;, etc.
          </Fn>
          <Fn name="entity.GetWeaponMaxSpeed" args="ent" ret="number">
            Maximum movement speed with current weapon (units/sec). Returns 250 on failure.
          </Fn>
          <Fn name="entity.GetWeaponDefIndex" args="ent" ret="integer">
            Item definition index of the active weapon (e.g. 7=AK-47, 9=AWP, 40=SSG 08).
          </Fn>
          <Fn name="entity.IsGun" args="ent" ret="boolean">
            True if the active weapon is a firearm (pistol, SMG, rifle, shotgun, sniper, LMG).
          </Fn>
          <Fn name="entity.GetWeaponDamage" args="ent" ret="number">
            Base damage of the active weapon from weapon vdata.
          </Fn>
          <Fn name="entity.GetWeaponPenetration" args="ent" ret="number">
            Penetration power of the active weapon (higher = more wall penetration).
          </Fn>
          <Fn name="entity.GetWeaponRange" args="ent" ret="number">
            Maximum effective range of the active weapon in units.
          </Fn>
          <Fn name="entity.GetWeaponArmorRatio" args="ent" ret="number">
            Armor penetration ratio of the active weapon (0–1, higher = more damage through armor).
          </Fn>
          <Fn name="entity.GetObserverMode" args="ent" ret="integer">
            Observer mode: 0=none, 1=deathcam, 2=freezecam, 3=fixed, 4=first-person, 5=chase, 6=roaming.
          </Fn>
          <Fn name="entity.GetObserverTarget" args="ent" ret="integer | nil">
            Index of the entity being spectated, or nil.
          </Fn>
          <Fn name="entity.GetSpectators" args="ent" ret="table">
            Returns a table of player indices currently spectating this entity.
          </Fn>
          <Fn name="entity.IsInFire" args="ent" ret="boolean">
            True if the entity was recently damaged by molotov or their origin overlaps a burning inferno.
          </Fn>
          <Fn name="entity.IsBot" args="ent" ret="boolean">True if the player is a bot (zero Steam ID, non-HLTV).</Fn>
          <Fn name="entity.IsConnected" args="ent" ret="boolean">True if the player controller reports a connected state.</Fn>
          <Fn name="entity.GetKills" args="ent" ret="integer">Total match kills from the scoreboard.</Fn>
          <Fn name="entity.GetDeaths" args="ent" ret="integer">Total match deaths.</Fn>
          <Fn name="entity.GetAssists" args="ent" ret="integer">Total match assists.</Fn>
          <Fn name="entity.GetDamage" args="ent" ret="integer">Total match damage dealt.</Fn>
          <Fn name="entity.GetHeadshotKills" args="ent" ret="integer">Total headshot kills.</Fn>
          <Fn name="entity.GetRoundKills" args="ent" ret="integer">Kills in the current round.</Fn>
          <Fn name="entity.GetMVPs" args="ent" ret="integer">MVP award count.</Fn>
          <Fn name="entity.GetScore" args="ent" ret="integer">Scoreboard score.</Fn>
          <Fn name="entity.GetPing" args="ent" ret="integer">Network ping in milliseconds.</Fn>
          <Fn name="entity.GetClanTag" args="ent" ret="string">Player&apos;s clan tag string.</Fn>
          <Fn name="entity.GetRank" args="ent" ret="rank, rankType">
            Competitive ranking and rank type as two integers.
          </Fn>
          <Fn name="entity.GetCompetitiveWins" args="ent" ret="integer">Competitive win count.</Fn>
          <Fn name="entity.GetStats" args="ent" ret="table | nil">
            All scoreboard stats in one call. Returns a table with keys: <code className="text-text-faint">kills</code>, <code className="text-text-faint">deaths</code>, <code className="text-text-faint">assists</code>, <code className="text-text-faint">damage</code>, <code className="text-text-faint">headshot_kills</code>, <code className="text-text-faint">round_kills</code>, <code className="text-text-faint">mvps</code>, <code className="text-text-faint">score</code>, <code className="text-text-faint">ping</code>, <code className="text-text-faint">clan</code>, <code className="text-text-faint">rank</code>, <code className="text-text-faint">wins</code>, <code className="text-text-faint">is_bot</code>, <code className="text-text-faint">connected</code>. Returns nil if no controller found.
          </Fn>
          <Example title="Example — iterate enemies and draw boxes">{`events.Add("Paint", "esp_boxes", function()
  for _, ply in ipairs(entity.GetPlayers()) do
    if entity.IsEnemy(ply) and entity.IsAlive(ply) then
      local x, y, w, h = entity.GetBoundingBox(ply)
      if x then
        renderer.Rect(x, y, w, h, Color(255, 0, 0))
        renderer.Text(x, y - 12, entity.GetName(ply), Color(255, 255, 255))
      end
    end
  end
end)`}</Example>
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
          <Example title="Example — crosshair + watermark">{`events.On("paint", function()
  local w, h = renderer.ScreenSize()
  local cx, cy = w / 2, h / 2
  renderer.Line(cx - 8, cy, cx + 8, cy, Color(0, 255, 0, 200))
  renderer.Line(cx, cy - 8, cx, cy + 8, Color(0, 255, 0, 200))
  renderer.Text(10, 10, "gamesense.cloud", Color(100, 200, 255), 14, "strong")
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
            <h4 className="label mb-1">Key Constants</h4>
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
          <div className="mt-4">
            <h4 className="label mb-1">Button Constants</h4>
            <p className="text-xs">
              <code className="text-text-faint">IN_ATTACK</code>,{" "}
              <code className="text-text-faint">IN_JUMP</code>,{" "}
              <code className="text-text-faint">IN_DUCK</code>,{" "}
              <code className="text-text-faint">IN_FORWARD</code>,{" "}
              <code className="text-text-faint">IN_BACK</code>,{" "}
              <code className="text-text-faint">IN_USE</code>,{" "}
              <code className="text-text-faint">IN_MOVELEFT</code>,{" "}
              <code className="text-text-faint">IN_MOVERIGHT</code>,{" "}
              <code className="text-text-faint">IN_ATTACK2</code>,{" "}
              <code className="text-text-faint">IN_RELOAD</code>,{" "}
              <code className="text-text-faint">IN_SPEED</code>,{" "}
              <code className="text-text-faint">IN_WALK</code>
            </p>
          </div>
          <Example title="Example — key toggle + button flags">{`local enabled = false
events.On("key", function(key, down)
  if key == input.KEY_X and down then
    enabled = not enabled
  end
end)

events.On("createmove", function(cmd)
  if enabled and bit.has_flag(cmd.buttons, input.IN_JUMP) then
    cmd.buttons = bit.bor(cmd.buttons, input.IN_DUCK)
  end
end)`}</Example>
        </Section>

        {/* ───────────── bit ───────────── */}
        <Section id="bit" title="bit">
          <p>
            Bitwise operations. Standalone global module — accessed via{" "}
            <code className="text-accent">bit.band()</code> etc.
          </p>
          <Fn name="bit.band" args="a: integer, b: integer" ret="integer">Bitwise AND.</Fn>
          <Fn name="bit.bor" args="a: integer, b: integer" ret="integer">Bitwise OR.</Fn>
          <Fn name="bit.bxor" args="a: integer, b: integer" ret="integer">Bitwise XOR.</Fn>
          <Fn name="bit.bnot" args="a: integer" ret="integer">Bitwise NOT.</Fn>
          <Fn name="bit.lshift" args="a: integer, n: integer" ret="integer">Left shift.</Fn>
          <Fn name="bit.rshift" args="a: integer, n: integer" ret="integer">Right shift (unsigned).</Fn>
          <Fn name="bit.has_flag" args="value: integer, flag: integer" ret="boolean">
            Check if a bit flag is set in a value.
          </Fn>
          <Example title="Example — check player flags">{`local flags = entity.GetFlags(me)
if bit.has_flag(flags, 1) then
  print("Player is crouching")
end
local combined = bit.bor(0xF0, 0x0F) -- 0xFF`}</Example>
        </Section>

        {/* ───────────── ui ───────────── */}
        <Section id="ui" title="ui">
          <p>
            Group / Widget hierarchy for building script configuration UIs.
            Values persist automatically across script reloads.
          </p>

          <Fn name="ui.Tab" args='name: string' ret="tab">
            Create a custom tab that appears after the core menu tabs. Returns a tab handle.
          </Fn>
          <Fn name="ui.Group" args='name: string, panel: string' ret="group">
            Create a named control group. <code className="text-text-faint">panel</code> is <code className="text-text-faint">&quot;A&quot;</code> (left column) or <code className="text-text-faint">&quot;B&quot;</code> (right column).
          </Fn>
          <Fn name="ui.GetValue" args="id: string" ret="value">Get a control&apos;s current value by its ID.</Fn>
          <Fn name="ui.SetValue" args="id: string, value">Set a control&apos;s value by its ID.</Fn>
          <Fn name="ui.SetVisible" args="control, visible: boolean">Show or hide a control dynamically.</Fn>
          <Fn name="ui.IsMenuOpen" args="" ret="boolean">Returns true if the overlay menu is currently open.</Fn>
          <Fn name="ui.Save" args="name: string" ret="boolean">
            Save all script controls to a JSON config file. Creates the folder{" "}
            <code className="text-text-faint">Documents/gscloud/scripts configs/&lt;script&gt;/&lt;name&gt;.json</code>.
          </Fn>
          <Fn name="ui.Load" args="name: string" ret="ok, error?">
            Load control values from a saved config. Returns <code className="text-text-faint">true</code> on success, or{" "}
            <code className="text-text-faint">false, error</code> on failure.
          </Fn>
          <Fn name="ui.ListConfigs" args="" ret="table">
            List available config names for this script as a sequential table of strings.
          </Fn>

          <div className="mt-1">
            <h4 className="label mb-1">Tab Handle</h4>
            <Fn name="tab:Child" args="id, title, gx, gy, gw, gh" ret="group">
              Create a child region inside a custom tab. Positioned on a 0–20 grid.{" "}
              <code className="text-text-faint">gx, gy</code> = position,{" "}
              <code className="text-text-faint">gw, gh</code> = size. Returns a group handle for adding widgets.
            </Fn>
            <Fn name="tab:Group" args="name: string" ret="group">
              Add an auto-laid-out group to the tab. Controls are placed into the tab&apos;s shorter column automatically. Returns a group handle.
            </Fn>
            <Fn name="tab:SubTab" args="name: string" ret="subtab">
              Register a subtab button inside the tab. When a tab has subtabs, a button bar
              appears at the top and only the active subtab&apos;s children are shown. Returns a subtab handle
              with the same <code className="text-text-faint">:Child</code> and <code className="text-text-faint">:Group</code> methods as a tab handle.
            </Fn>
          </div>

          <div className="mt-1">
            <h4 className="label mb-1">Group Widgets</h4>
            <Fn name="group:Checkbox" args="label, default: boolean" ret="control">Toggle switch.</Fn>
            <Fn name="group:SliderInt" args="label, min, max [, default]" ret="control">Integer slider.</Fn>
            <Fn name="group:SliderFloat" args="label, min, max [, default]" ret="control">Float slider.</Fn>
            <Fn name="group:Combo" args='label, options: table [, default_index]' ret="control">Dropdown selector. Index is 1-based.</Fn>
            <Fn name="group:Multiselect" args='label, options: table [, defaults: table]' ret="control">Multi-select dropdown. Returns a table of selected indices.</Fn>
            <Fn name="group:Button" args="label [, callback]" ret="control">Clickable button.</Fn>
            <Fn name="group:ColorPicker" args="label [, default: {r,g,b,a}]" ret="control">RGBA color picker (0–1 range).</Fn>
            <Fn name="group:Textbox" args="label [, default: string]" ret="control">Text input field.</Fn>
            <Fn name="group:Keybind" args="label [, default_key]" ret="control">Key binding selector.</Fn>
            <Fn name="group:Listbox" args='label, items: table [, default_index]' ret="control">Visible selection list. Index is 1-based.</Fn>
            <Fn name="group:Label" args="text" ret="control">Static text label.</Fn>
            <Fn name="group:Separator" args="[text]" ret="control">Visual divider. Optional text becomes a section heading.</Fn>
            <Fn name="group:CheckboxKeybind" args="label, default: boolean [, default_key: integer]" ret="control">
              Checkbox with an inline keybind capsule on the same row. Use <code className="text-text-faint">:Get()</code> for
              the toggle value and <code className="text-text-faint">:GetKey()</code> for the bound key code.
            </Fn>
          </div>

          <div className="mt-3">
            <h4 className="label mb-1">Control Handle Methods</h4>
            <Fn name="control:Get" args="" ret="value">Read current value.</Fn>
            <Fn name="control:Set" args="value">Write a new value.</Fn>
            <Fn name="control:OnChange" args="callback" ret="self">Register a value-change callback. Returns self for chaining.</Fn>
            <Fn name="control:SetTooltip" args="text: string" ret="self">Set a hover tooltip on the control. Pass nil or empty string to clear. Returns self for chaining.</Fn>
            <Fn name="control:SetVisible" args="visible: boolean" ret="self">Show or hide the control dynamically. Use with <code className="text-text-faint">:OnChange</code> to create dependent controls that appear when a checkbox is enabled. Returns self for chaining.</Fn>
            <Fn name="control:GetKey" args="" ret="integer">Read the keybind value from any control that stores one (KeyBind or CheckboxKeybind). Returns 0 if none is set.</Fn>
            <p className="text-xs mt-1">
              Properties: <code className="text-text-faint">.id</code>,{" "}
              <code className="text-text-faint">.kind</code>,{" "}
              <code className="text-text-faint">.label</code>
            </p>
          </div>
          <Example title="Example — tab, child group, checkbox, slider, button">{`local tab = ui.Tab("My Script")
local g = tab:Child("main", "Settings", 0, 0, 20, 20)

local enabled = g:Checkbox("Enabled", true)
local speed   = g:SliderFloat("Speed", 0, 10, 5.0)
g:Button("Apply", function() cheat.Notify("Applied!") end)`}</Example>
          <Example title="Example — tooltip, dependent visibility">{`local g = tab:Child("cfg", "Config", 0, 0, 10, 10)
local aim = g:Checkbox("Aimbot", false):SetTooltip("Enable aim assistance")
local fov = g:SliderFloat("FOV", 1, 90, 15)

-- Show FOV slider only when aimbot is enabled
fov:SetVisible(aim:Get())
aim:OnChange(function() fov:SetVisible(aim:Get()) end)`}</Example>
          <Example title="Example — subtabs and inline keybind">{`local tab = ui.Tab("My Script")
local aim = tab:SubTab("Aimbot")
local vis = tab:SubTab("Visuals")

-- Aimbot subtab children
local g = aim:Child("cfg", "Config", 0, 0, 10, 20)
local enable = g:CheckboxKeybind("Enable", false, 0x02)  -- right click
local fov    = g:SliderFloat("FOV", 1, 90, 15)

-- Visuals subtab children
local v = vis:Group("ESP")
v:Checkbox("Box", true)`}</Example>
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
            <h4 className="label mb-1">Constants</h4>
            <p className="text-xs">
              <code className="text-text-faint">events.BUTTON_FORCE_OFF</code> (0),{" "}
              <code className="text-text-faint">events.BUTTON_TOGGLE</code> (1),{" "}
              <code className="text-text-faint">events.BUTTON_FORCE_ON</code> (2)
            </p>
          </div>
          <div className="mt-4">
            <h4 className="label mb-2">Event Reference</h4>
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
          <Fn name="events.Add" args="hookName, uniqueId, callback">
            Named subscription. Re-registering with the same hookName + uniqueId replaces the previous callback.
            Accepts both PascalCase (<code className="text-text-faint">Paint</code>) and snake_case (<code className="text-text-faint">paint</code>) event names.
          </Fn>
          <Fn name="events.Remove" args="hookName, uniqueId">
            Remove a named subscription.
          </Fn>
          <Example title="Example — track kills with player_death">{`local kills = 0

events.On("player_death", function(e)
  local me = entity.GetLocalPlayer()
  if me and e.attacker == entity.GetIndex(me) then
    kills = kills + 1
    cheat.Notify("Kill #" .. kills .. " with " .. e.weapon)
  end
end)

events.On("round_start", function(e)
  kills = 0
end)`}</Example>
          <Example title="Example — named subscription (add then remove)">{`events.Add("Paint", "watermark", function()
  renderer.Text(10, 10, "gamesense.cloud", Color(100, 200, 255), 16)
end)

events.Remove("Paint", "watermark")`}</Example>
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
          <Example title="Example — simple GET">{`timer.After(0, function()
  local body, err = http.Get("https://api.example.com/data")
  if body then
    local data = json.Decode(body)
    print("Got " .. #data .. " items")
  end
end)`}</Example>
        </Section>

        {/* ───────────── cheat ───────────── */}
        <Section id="cheat" title="cheat">
          <p>Cheat identity, control, and utility functions.</p>
          <Fn name="cheat.GetVersion" args="" ret="string">Returns the build version string.</Fn>
          <Fn name="cheat.IsLoaded" args="" ret="boolean">Always returns true.</Fn>
          <Fn name="cheat.Unload" args="">Queue the calling script for unload.</Fn>
          <Fn name="cheat.Reload" args="">Queue the calling script for reload.</Fn>
          <Fn name="cheat.Log" args="text: string">Write to the internal journal.</Fn>
          <Fn name="cheat.Warn" args="text: string">Write a warning to the journal.</Fn>
          <Fn name="cheat.Error" args="text: string">Write an error to the journal.</Fn>
          <Fn name="cheat.Notify" args="text: string">Show a notification message.</Fn>
          <Fn name="cheat.GetTimestamp" args="" ret="string">
            Local time as <code className="text-text-faint">&quot;YYYY-MM-DD HH:MM:SS&quot;</code>.
          </Fn>
          <Fn name="cheat.FindExport" args="module: string, export: string" ret="userdata | nil">
            Find an export by module and name. Returns a lightuserdata pointer.
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
          <Example title="Example — log, warn, notify">{`cheat.Log("[" .. cheat.GetTimestamp() .. "] script loaded")

if not cheat.IsRadarActive() then
  cheat.Log("warning: radar is not running")
end

cheat.Notify("Script loaded!")`}</Example>
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
          <Fn name="math.CalcAngle" args="srcX, srcY, srcZ, dstX, dstY, dstZ" ret="pitch, yaw">
            Calculate aim angles from source position to destination position.
          </Fn>
          <Fn name="math.GetFov" args="viewPitch, viewYaw, aimPitch, aimYaw" ret="number">
            Calculate the FOV (angular distance) between view angles and aim angles.
          </Fn>
          <Fn name="math.NormalizeAngles" args="pitch, yaw" ret="pitch, yaw">
            Clamp pitch to [-89, 89] and normalize yaw to [-180, 180].
          </Fn>
          <Fn name="math.SmoothAngle" args="curP, curY, targetP, targetY, smooth" ret="pitch, yaw">
            Smoothly interpolate from current angles to target angles by a smoothing factor.
          </Fn>
          <Fn name="math.ExtrapolatePosition" args="x, y, z, vx, vy, vz, ticks" ret="x, y, z">
            Predict a future position based on velocity and tick count.
          </Fn>
          <Fn name="math.GetBestTarget" args="localX, localY, localZ, viewPitch, viewYaw, maxFov" ret="integer | nil">
            Find the enemy player with the lowest FOV within maxFov. Returns entity index or nil.
          </Fn>
          <Fn name="math.RCSCompensate" args="aimP, aimY, punchP, punchY, scale?" ret="pitch, yaw">
            Apply recoil compensation. Default scale is 2.0.
          </Fn>
          <Fn name="math.ApproachAngles" args="fromP, fromY, toP, toY, speed" ret="pitch, yaw">
            Move from current angles toward target angles by at most <code className="text-text-faint">speed</code> degrees per call. Handles angle wrapping.
          </Fn>
          <Fn name="math.RemapVal" args="val, inMin, inMax, outMin, outMax" ret="number">
            Linearly remap a value from [inMin, inMax] to [outMin, outMax]. No clamping.
          </Fn>
          <Fn name="math.RemapValClamped" args="val, inMin, inMax, outMin, outMax" ret="number">
            Same as RemapVal but clamps the result to [outMin, outMax].
          </Fn>
          <Example title="Example — CalcAngle + GetFov">{`local me = entity.GetLocalPlayer()
local target = entity.GetPlayers()[1]
if me and target then
  local mx, my, mz = entity.GetEyePosition(me)
  local tx, ty, tz = entity.GetEyePosition(target)
  local aimP, aimY = math.CalcAngle(mx, my, mz, tx, ty, tz)
  local viewP, viewY = engine.GetViewAngles()
  print("FOV to target: " .. math.GetFov(viewP, viewY, aimP, aimY))
end`}</Example>
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
          <p className="text-xs">
            Aliases: <code className="text-text-faint">store.Get</code>,{" "}
            <code className="text-text-faint">store.Set</code>,{" "}
            <code className="text-text-faint">store.Has</code>,{" "}
            <code className="text-text-faint">store.Remove</code>,{" "}
            <code className="text-text-faint">store.Clear</code>,{" "}
            <code className="text-text-faint">store.Keys</code>,{" "}
            <code className="text-text-faint">store.Save</code>
          </p>
          <Example title="Example — persistent toggle">{`local enabled = store.get("enabled")
if enabled == nil then enabled = true end

events.On("key", function(key, down)
  if key == input.F2 and down then
    enabled = not enabled
    store.set("enabled", enabled)
    cheat.Notify("Toggled: " .. tostring(enabled))
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
            Load a module and return a table whose fields resolve to exports on access.
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
            <h4 className="label mb-1">ffi.C</h4>
            <p className="text-xs">
              Auto-resolving table of system library exports. Access any function from kernel32, user32,
              advapi32, ntdll, ws2_32, shell32, gdi32, ole32, msvcrt, winhttp, or crypt32 directly:
            </p>
            <LuaCode>{`local result = ffi.C.MessageBoxA(0, "Hello", "Title", 0)`}</LuaCode>
          </div>

          <div className="mt-3">
            <h4 className="label mb-1">CData Object</h4>
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

-- load a module and call an export
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
          <Example title="Example — read/write volume">{`local vol = cvar.GetFloat("volume")
print("Current volume: " .. vol)
cvar.SetFloat("volume", 0.5)`}</Example>
        </Section>

        {/* ───────────── memory ───────────── */}
        <Section id="memory" title="memory">
          <p>
            Low-level memory access primitives. SEH-protected reads/writes, pattern scanning,
            module enumeration, and virtual function calls. For advanced users building custom features.
          </p>
          <Fn name="memory.ReadByte" args="addr: integer" ret="integer">SEH-safe byte read.</Fn>
          <Fn name="memory.ReadInt" args="addr: integer" ret="integer">SEH-safe 32-bit int read.</Fn>
          <Fn name="memory.ReadFloat" args="addr: integer" ret="number">SEH-safe float read.</Fn>
          <Fn name="memory.ReadPointer" args="addr: integer" ret="integer">SEH-safe 64-bit pointer read.</Fn>
          <Fn name="memory.WriteByte" args="addr: integer, val: integer">SEH-safe byte write.</Fn>
          <Fn name="memory.WriteInt" args="addr: integer, val: integer">SEH-safe 32-bit int write.</Fn>
          <Fn name="memory.WriteFloat" args="addr: integer, val: number">SEH-safe float write.</Fn>
          <Fn name="memory.WritePointer" args="addr: integer, val: integer">SEH-safe 64-bit pointer write.</Fn>
          <Fn name="memory.PatternScan" args="module: string, pattern: string" ret="integer">
            Scan a module for a byte pattern. Returns the address or 0 on failure.
          </Fn>
          <Fn name="memory.GetModuleHandle" args="name: string" ret="integer">Module base address.</Fn>
          <Fn name="memory.GetModuleSize" args="name: string" ret="integer">Module image size in bytes.</Fn>
          <Fn name="memory.GetExport" args="module: string, name: string" ret="integer">
            Resolve an exported function address.
          </Fn>
          <Fn name="memory.CallVFunc" args="obj: integer, index: integer, ..." ret="integer">
            Call a virtual function by vtable index.
          </Fn>
          <Fn name="memory.ResolveRelative" args="addr, offset, instrSize" ret="integer">
            Resolve a RIP-relative address (common in x64 code).
          </Fn>
          <Example title="Example — pattern scan + read">{`local base = memory.GetModuleHandle("client.dll")
local addr = memory.PatternScan("client.dll", "48 8B 05 ?? ?? ?? ?? 48 85 C0 74")
if addr ~= 0 then
  local resolved = memory.ResolveRelative(addr, 3, 7)
  local ptr = memory.ReadPointer(resolved)
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
          <Fn name="anim.GetAnimSequence" args="ent" ret="integer">Current animation sequence index.</Fn>
          <Fn name="anim.GetAnimCycle" args="ent" ret="number">Animation cycle progress (0.0–1.0).</Fn>
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
          <Example title="Example — display ping and loss">{`events.On("paint", function()
  local ping = math.floor(net.GetLatency() * 1000)
  local loss = math.floor(net.GetIncomingLoss() * 100)
  renderer.Text(10, 30, ping .. "ms  " .. loss .. "% loss", Color(255, 255, 255))
end)`}</Example>
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

        {/* ───────────── trace ───────────── */}
        <Section id="trace" title="trace">
          <p>Ray casting, visibility checks, and autowall damage calculation using the CS2 trace system.</p>
          <Fn name="trace.Line" args="startX, startY, startZ, endX, endY, endZ [, skipEntity]" ret="fraction, hitX, hitY, hitZ, entity|nil, hitgroup, hitbox">
            Cast a ray between two points. Returns the hit fraction (0–1), impact position, hit entity (or nil), hitgroup, and hitbox index.
          </Fn>
          <Fn name="trace.IsVisible" args="startX, startY, startZ, endX, endY, endZ [, skipEntity]" ret="boolean">
            Check if a straight line between two points is unobstructed.
          </Fn>
          <Fn name="trace.IsEntityVisible" args="fromEntity, toEntity [, hitbox]" ret="boolean">
            Check if one entity can see another&apos;s hitbox. Default hitbox is 6 (head).
          </Fn>
          <Fn name="trace.GetDamage" args="fromEntity, toEntity [, hitbox]" ret="damage, isVisible, canWallbang">
            Calculate the damage from one entity to another&apos;s hitbox, accounting for weapon penetration, distance falloff, armor, and hitgroup multipliers. Returns 0 damage if not hittable.
          </Fn>
          <Fn name="trace.GetBestHitbox" args="fromEntity, toEntity [, minDamage]" ret="hitbox, damage, isVisible">
            Find the highest-damage hitbox on the target. Checks head, chest, stomach, neck, pelvis and returns the one dealing the most damage (visible or through walls). Returns -1 if no hitbox meets the minimum damage threshold.
          </Fn>
          <Fn name="trace.CanHit" args="fromEntity, toEntity [, hitbox]" ret="boolean">
            Quick check: can we deal any damage to this entity&apos;s hitbox — either directly or through walls?
          </Fn>

          <Example title="Visibility check before aiming">{`local me = engine.GetLocalPlayer()
local eyeX, eyeY, eyeZ = entity.GetEyePosition(me)

for _, idx in ipairs(entity.GetPlayers()) do
    if entity.IsEnemy(idx) and entity.IsAlive(idx) then
        if trace.IsEntityVisible(me, idx, 6) then
            cheat.Log(entity.GetName(idx) .. " head is visible")
        end
    end
end`}</Example>

          <Example title="Best hitbox with autowall">{`local me = engine.GetLocalPlayer()
local hb, dmg, vis = trace.GetBestHitbox(me, targetIdx, 10)
if hb >= 0 then
    local label = vis and "visible" or "wallbang"
    cheat.Log("Best hitbox: " .. hb .. " for " .. dmg .. " dmg (" .. label .. ")")
end`}</Example>
        </Section>

        {/* ───────────── usercmd ───────────── */}
        <Section id="usercmd" title="usercmd">
          <p>
            Direct user-command access. All functions require the live <code className="text-accent">cmd</code> lightuserdata
            passed to a <code className="text-text-faint">createmove</code> callback — they are invalid outside that context.
          </p>
          <Fn name="usercmd.GetViewAngles" args="cmd" ret="pitch, yaw | nil">
            Read the usercmd&apos;s view angles. Returns nil if the command is invalid.
          </Fn>
          <Fn name="usercmd.SetViewAngles" args="cmd, pitch, yaw" ret="boolean">
            Set the usercmd&apos;s view angles. Pitch is clamped to [-89, 89], yaw wrapped to [-180, 180]. Zeroes all subtick angle deltas and updates input history.
          </Fn>
          <Fn name="usercmd.GetMove" args="cmd" ret="fwd, left, up | nil">
            Read the current tick&apos;s movement input as three floats in [-1, 1].
          </Fn>
          <Fn name="usercmd.SetMove" args="cmd, forward, left [, up]" ret="boolean">
            Replace the movement input for this tick. Values are clamped to [-1, 1]. Rebuilds subtick movement steps and button flags to match.
          </Fn>
          <Fn name="usercmd.GetButtons" args="cmd" ret="integer | nil">
            Read the held button state as IN_* bitflags.
          </Fn>
          <Fn name="usercmd.SetButtons" args="cmd, held: integer" ret="boolean">
            Set the held button bitflags. Clears conflicting subtick steps automatically.
          </Fn>
          <Fn name="usercmd.SubtickJump" args="cmd, when: number" ret="boolean">
            Insert a subtick jump at the given tick fraction (0–1). Adds a release step
            at <code className="text-accent">when − 1/64</code> and a press at <code className="text-accent">when</code>,
            then sets the IN_JUMP held bit. Used for frame-perfect bhop by passing the predicted
            landing fraction from a downward trace.
          </Fn>
          <Example title="Example — silent movement override">{`events.On("createmove", function(cmd)
  local fwd, left, up = usercmd.GetMove(cmd)
  if fwd then
    usercmd.SetMove(cmd, 1.0, 0, 0) -- always move forward
  end
end)`}</Example>
        </Section>

        {/* ───────────── visuals ───────────── */}
        <Section id="visuals" title="visuals">
          <p>
            Visual modifier overrides — toggle smoke removal, flash effects, FOV, night mode,
            chicken fun, and more via key-value pairs.
          </p>
          <Fn name="visuals.Set" args="key: string, value">
            Set a visual modifier. Value type depends on the key: boolean for flags, number for numeric settings, Color for color keys.
          </Fn>
          <Fn name="visuals.Get" args="key: string" ret="value">
            Read the current value of a visual modifier.
          </Fn>
          <Fn name="visuals.GetKeys" args="" ret="table">
            Returns the list of all valid key names as a string array.
          </Fn>
          <div className="mt-2">
            <h4 className="label mb-1">Keys</h4>
            <p className="text-xs">
              <strong className="text-text-muted">Boolean:</strong>{" "}
              <code className="text-text-faint">no_smoke</code>,{" "}
              <code className="text-text-faint">no_flash</code>,{" "}
              <code className="text-text-faint">no_scope</code>,{" "}
              <code className="text-text-faint">no_anim</code>,{" "}
              <code className="text-text-faint">no_fog</code>,{" "}
              <code className="text-text-faint">no_3d_skybox</code>,{" "}
              <code className="text-text-faint">thirdperson</code>,{" "}
              <code className="text-text-faint">radar_reveal</code>,{" "}
              <code className="text-text-faint">glow</code>,{" "}
              <code className="text-text-faint">glow_enemy_only</code>,{" "}
              <code className="text-text-faint">night_mode</code>,{" "}
              <code className="text-text-faint">color_correction</code>,{" "}
              <code className="text-text-faint">chicken_spin</code>,{" "}
              <code className="text-text-faint">fish</code>,{" "}
              <code className="text-text-faint">fish_spin</code>
            </p>
            <p className="text-xs mt-1">
              <strong className="text-text-muted">Number:</strong>{" "}
              <code className="text-text-faint">fov</code>,{" "}
              <code className="text-text-faint">aspect_ratio</code>,{" "}
              <code className="text-text-faint">cc_brightness</code>,{" "}
              <code className="text-text-faint">cc_saturation</code>,{" "}
              <code className="text-text-faint">cc_exposure</code>,{" "}
              <code className="text-text-faint">chicken_scale</code>,{" "}
              <code className="text-text-faint">chicken_spin_speed</code>,{" "}
              <code className="text-text-faint">fish_spin_speed</code>
            </p>
            <p className="text-xs mt-1">
              <strong className="text-text-muted">Color:</strong>{" "}
              <code className="text-text-faint">glow_enemy_color</code>,{" "}
              <code className="text-text-faint">glow_team_color</code>
            </p>
          </div>
          <Example title="Example — night mode + FOV">{`visuals.Set("night_mode", true)
visuals.Set("fov", 110)
visuals.Set("no_flash", true)`}</Example>
        </Section>

        {/* ───────────── chams ───────────── */}
        <Section id="chams" title="chams">
          <p>
            Chams (colored material overlays) and screen-space shader effects. Set built-in or
            custom materials on entity categories, control visibility through walls, and apply
            screen-wide post-processing shaders.
          </p>
          <Fn name="chams.Set" args="key: string, value">
            Set a chams config value. Value type depends on the key: boolean for toggles, string for material names, number for amounts, Color for colors.
          </Fn>
          <Fn name="chams.Get" args="key: string" ret="value">
            Read the current value of a chams config key.
          </Fn>
          <Fn name="chams.GetKeys" args="" ret="table">
            Returns the list of all valid key names as a string array.
          </Fn>
          <Fn name="chams.CreateMaterial" args="name: string, kv3: string" ret="true | nil, error">
            Queue a custom KV3 material for creation. Returns true on success, or nil + error string on failure.
          </Fn>
          <Fn name="chams.GetMaterialStatus" args="name: string" ret="string | nil">
            Load state of a material: <code className="text-accent">&quot;pending&quot;</code>, <code className="text-accent">&quot;ready&quot;</code>, or <code className="text-accent">&quot;failed&quot;</code>. Returns nil if not found.
          </Fn>
          <Fn name="chams.GetMaterials" args="" ret="table">
            List all available material names (built-in then custom).
          </Fn>
          <Fn name="chams.SetScreenShader" args="hlsl: string | nil">
            Set a custom screen-space pixel shader (HLSL source). Pass nil to clear.
          </Fn>
          <Fn name="chams.GetScreenShaderStatus" args="" ret="status [, error]">
            Screen shader compilation status: <code className="text-accent">&quot;none&quot;</code>, <code className="text-accent">&quot;pending&quot;</code>, <code className="text-accent">&quot;ok&quot;</code>, or <code className="text-accent">&quot;error&quot;</code>. When status is &quot;error&quot;, a second string with the error text is returned.
          </Fn>
          <div className="mt-2">
            <h4 className="label mb-1">Keys</h4>
            <p className="text-xs">
              <strong className="text-text-muted">Boolean:</strong>{" "}
              <code className="text-text-faint">enabled</code>,{" "}
              <code className="text-text-faint">enemy_occluded_enabled</code>,{" "}
              <code className="text-text-faint">team_occluded_enabled</code>,{" "}
              <code className="text-text-faint">dropped_weapons_occluded_enabled</code>,{" "}
              <code className="text-text-faint">chicken_occluded_enabled</code>,{" "}
              <code className="text-text-faint">fish_occluded_enabled</code>,{" "}
              <code className="text-text-faint">fx_through_walls</code>
            </p>
            <p className="text-xs mt-1">
              <strong className="text-text-muted">String (material):</strong>{" "}
              <code className="text-text-faint">material</code>,{" "}
              <code className="text-text-faint">shader_name</code>,{" "}
              <code className="text-text-faint">fx_effect</code>,{" "}
              <code className="text-text-faint">shader_effect</code>
            </p>
            <p className="text-xs mt-1">
              <strong className="text-text-muted">Color:</strong>{" "}
              <code className="text-text-faint">enemy_visible</code>,{" "}
              <code className="text-text-faint">enemy_occluded</code>,{" "}
              <code className="text-text-faint">team_visible</code>,{" "}
              <code className="text-text-faint">team_occluded</code>,{" "}
              <code className="text-text-faint">local_visible</code>,{" "}
              <code className="text-text-faint">local_weapons_visible</code>,{" "}
              <code className="text-text-faint">dropped_weapons_visible</code>,{" "}
              <code className="text-text-faint">dropped_weapons_occluded</code>,{" "}
              <code className="text-text-faint">chicken_visible</code>,{" "}
              <code className="text-text-faint">chicken_occluded</code>,{" "}
              <code className="text-text-faint">fish_visible</code>,{" "}
              <code className="text-text-faint">fish_occluded</code>,{" "}
              <code className="text-text-faint">fx_color</code>
            </p>
            <p className="text-xs mt-1">
              <strong className="text-text-muted">Number:</strong>{" "}
              <code className="text-text-faint">fx_amount</code>
            </p>
          </div>
          <Example title="Example — enemy chams + screen shader">{`chams.Set("enabled", true)
chams.Set("enemy_visible", Color(0, 255, 100))
chams.Set("enemy_occluded", Color(255, 50, 50))
chams.Set("enemy_occluded_enabled", true)

-- check available materials
for _, name in ipairs(chams.GetMaterials()) do
  print(name)
end`}</Example>
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

        {/* ───────────── premade scripts ───────────── */}
        <section id="scripts" className="doc-section doc-scripts">
          <div className="doc-head">
            <span className="label">Premade scripts</span>
            <p>Complete scripts you can drop into your scripts folder and load from the menu.</p>
          </div>

          <div className="panel">
            <div className="panel-head">Simple ESP</div>
            <LuaCode flush>{`local g = ui.Group("ESP", "A")
local enabled = g:Checkbox("Enabled", true)

events.Add("Paint", "simple_esp", function()
  if not enabled:Get() then return end
  for _, ply in ipairs(entity.GetPlayers()) do
    if entity.IsEnemy(ply) and entity.IsAlive(ply) then
      local x, y, w, h = entity.GetBoundingBox(ply)
      if x then
        renderer.Rect(x, y, w, h, Color(255, 60, 60))
        renderer.Text(x, y - 14, entity.GetName(ply), Color(255, 255, 255), 11)

        local hp = entity.GetHealth(ply) / 100
        renderer.RectFilled(x - 6, y + h * (1 - hp), 3, h * hp, Color(80, 220, 80))
      end
    end
  end
end)`}</LuaCode>
          </div>

          <div className="panel">
            <div className="panel-head">Kill Counter + Speedometer</div>
            <LuaCode flush>{`local kills = 0

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
end)`}</LuaCode>
          </div>

          <div className="panel">
            <div className="panel-head">Custom Crosshair</div>
            <LuaCode flush>{`local g = ui.Group("Crosshair", "A")
local style = g:Combo("Style", {"Dot", "Cross", "Circle"}, 1)
local color = g:ColorPicker("Color", {0, 1, 0, 1})
local size  = g:SliderInt("Size", 2, 20, 8)

events.On("paint", function()
  local w, h = renderer.ScreenSize()
  local cx, cy, s = w / 2, h / 2, size:Get()
  local c = color:Get()

  if style:Get() == 1 then
    renderer.CircleFilled(cx, cy, 2, c)
  elseif style:Get() == 2 then
    renderer.Line(cx - s, cy, cx + s, cy, c)
    renderer.Line(cx, cy - s, cx, cy + s, c)
  else
    renderer.Circle(cx, cy, s, c)
  end
end)`}</LuaCode>
          </div>
          <div className="panel">
            <div className="panel-head">Aim Lock with Autowall</div>
            <LuaCode flush>{`-- Hold ALT to lock onto the closest enemy with trace-based targeting
local tab = ui.Tab("Aimlock")
local g = tab:Child("aim", "Settings", 0, 0, 6, 6)
local fov    = g:SliderInt("FOV", 1, 180, 15)
local smooth = g:SliderInt("Smooth", 1, 50, 5)
local minDmg = g:SliderInt("Min Damage", 1, 100, 10)

events.On("frame", function()
  if not engine.IsInGame() or not input.IsKeyDown(0x12) then return end
  local me = engine.GetLocalPlayer()
  if not me or not entity.IsAlive(me) then return end

  local eyeX, eyeY, eyeZ = entity.GetEyePosition(me)
  local vp, vy = engine.GetViewAngles()
  local bestFov, bestIdx, bestHb = fov:Get(), nil, -1

  for _, idx in ipairs(entity.GetPlayers()) do
    if entity.IsEnemy(idx) and entity.IsAlive(idx) then
      local hb, dmg = trace.GetBestHitbox(me, idx, minDmg:Get())
      if hb >= 0 then
        local tx, ty, tz = entity.GetHitboxPosition(idx, hb)
        local ap, ay = math.CalcAngle(eyeX, eyeY, eyeZ, tx, ty, tz)
        local f = math.GetFov(vp, vy, ap, ay)
        if f < bestFov then bestFov, bestIdx, bestHb = f, idx, hb end
      end
    end
  end

  if bestIdx then
    local tx, ty, tz = entity.GetHitboxPosition(bestIdx, bestHb)
    local ap, ay = math.CalcAngle(eyeX, eyeY, eyeZ, tx, ty, tz)
    local np, ny = math.SmoothAngle(vp, vy, ap, ay, smooth:Get())
    engine.SetViewAngles(np, ny, 0)
  end
end)

events.On("paint", function()
  local sw, sh = engine.GetScreenSize()
  local r = (fov:Get() / 90) * (sw / 2)
  renderer.Circle(sw/2, sh/2, r, {255, 255, 255, 120})
end)`}</LuaCode>
          </div>
        </section>
    </div>
  );
}
