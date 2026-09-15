import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

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

export const revalidate = 30;

const FEATURES = [
  {
    title: "Web Radar",
    desc: "Live CS2 radar in any browser — player positions, grenades, bomb status. Share a link, no login needed.",
    href: "/web-radar",
    color: "var(--accent)",
  },
  {
    title: "Lua Scripting",
    desc: "23-module API covering engine, entity, drawing, events, HTTP, FFI, file I/O, UI controls and more.",
    href: "/docs",
    color: "var(--ok)",
  },
] as const;

export default async function Home() {
  const stats = await getStats();

  return (
    <div className="flex-1 flex flex-col items-center px-6 pt-20 pb-12">
      <h1 className="text-4xl font-bold tracking-tight">
        gamesense<span className="text-accent">.cloud</span>
      </h1>

      <p className="mt-2 text-text-faint text-sm max-w-md text-center">
        CS2 enhancement suite with live web radar, Lua scripting API, and in-game overlay
      </p>

      <div className="mt-4 flex items-center gap-4 text-text-muted text-sm">
        <span className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {stats.users.toLocaleString()} online
        </span>
        {stats.radars > 0 && (
          <>
            <span className="text-border">·</span>
            <span className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              {stats.radars.toLocaleString()} radar{stats.radars !== 1 ? "s" : ""} live
            </span>
          </>
        )}
      </div>

      <div className="mt-8">
        <a
          href="/api/download"
          className="glow-btn inline-flex items-center gap-2.5 bg-gradient-to-r from-accent to-accent-hi text-on-accent font-bold px-10 py-4 rounded-lg text-base shadow-lg shadow-accent/25 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </a>
      </div>

      {/* Feature cards */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full">
        {FEATURES.map((f) => (
          <Link
            key={f.title}
            href={f.href}
            className="gb p-4 hover:border-accent-dim transition-colors group"
          >
            <div
              className="text-sm font-bold mb-1 group-hover:text-accent transition-colors"
              style={{ color: f.color }}
            >
              {f.title}
            </div>
            <div className="text-text-faint text-xs leading-relaxed">
              {f.desc}
            </div>
          </Link>
        ))}
      </div>

      {/* Stats row */}
      <div className="mt-16 w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        {[
          { val: "23", label: "API modules" },
          { val: "190+", label: "Lua functions" },
          { val: "35", label: "hook events" },
          { val: "15+", label: "draw primitives" },
        ].map((s) => (
          <div key={s.label} className="gb p-3">
            <div className="text-xl font-bold text-accent">{s.val}</div>
            <div className="text-text-faint text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="mt-12 flex items-center justify-center gap-x-6 gap-y-2 text-xs text-text-faint flex-wrap">
        <Link href="/docs" className="hover:text-text-muted transition-colors">
          API Docs
        </Link>
        <span className="text-border">|</span>
        <Link href="/web-radar" className="hover:text-text-muted transition-colors">
          Web Radar
        </Link>
        <span className="text-border">|</span>
        <a href="https://discord.gg/8U668smGy8" target="_blank" rel="noopener noreferrer" className="hover:text-text-muted transition-colors">
          Discord
        </a>
      </div>
    </div>
  );
}
