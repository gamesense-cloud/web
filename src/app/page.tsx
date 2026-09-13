import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

async function getActiveUsers(): Promise<number> {
  try {
    const db = supabaseAdmin();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await db
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .gte("last_ping", fiveMinAgo);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export const revalidate = 30;

const FEATURES = [
  {
    title: "Web Radar",
    desc: "Live CS2 radar in any browser. Share a link — no login needed.",
    href: "/web-radar",
    color: "var(--accent)",
  },
  {
    title: "Lua Scripting",
    desc: "23-module API. Engine, entity, drawing, events, HTTP, FFI and more.",
    href: "/docs",
    color: "var(--ok)",
  },
  {
    title: "Live Grenades",
    desc: "Smokes, flashes, mollies and HEs rendered on the radar in real-time.",
    href: "/web-radar",
    color: "var(--warn)",
  },
] as const;

export default async function Home() {
  const userCount = await getActiveUsers();

  return (
    <div className="flex-1 flex flex-col items-center px-6 pt-20 pb-12">
      <h1 className="text-4xl font-bold tracking-tight">
        gamesense<span className="text-accent">.cloud</span>
      </h1>

      <p className="mt-2 text-text-faint text-sm max-w-xs text-center">
        Game enhancement suite for CS2
      </p>

      <p className="mt-4 text-text-muted text-sm flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        {userCount.toLocaleString()} online
      </p>

      <a
        href="/api/download"
        className="mt-8 inline-flex items-center gap-2 bg-accent hover:bg-accent-hi text-on-accent font-semibold px-8 py-3 rounded transition-colors text-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download
      </a>

      {/* Feature cards */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
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

      {/* Quick links */}
      <div className="mt-10 flex items-center gap-6 text-xs text-text-faint">
        <Link href="/docs" className="hover:text-text-muted transition-colors">
          API Docs
        </Link>
        <span className="text-border">|</span>
        <Link href="/web-radar" className="hover:text-text-muted transition-colors">
          Web Radar
        </Link>
        <span className="text-border">|</span>
        <Link href="/login" className="hover:text-text-muted transition-colors">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
