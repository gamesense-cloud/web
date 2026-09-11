import { supabaseAdmin } from "@/lib/supabase";
import { getLatestRelease } from "@/lib/github";

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

export default async function Home() {
  const [userCount, release] = await Promise.all([
    getActiveUsers(),
    getLatestRelease("launcher"),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-6">
      {/* Hero */}
      <section className="py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          gamesense<span className="text-accent">.cloud</span>
        </h1>
        <p className="mt-4 text-text-muted text-lg max-w-xl mx-auto">
          A lightweight game enhancement suite. Download the loader, launch it,
          and you&apos;re in — no accounts, no setup.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <a
            href="/api/download"
            className="inline-flex items-center gap-2 bg-accent text-bg font-semibold px-6 py-3 rounded-lg hover:bg-accent-dim transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download {release?.tag_name ?? "Loader"}
          </a>
        </div>
        <p className="mt-4 text-text-muted text-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse" />
          {userCount.toLocaleString()} active user{userCount !== 1 ? "s" : ""}
        </p>
      </section>

      {/* How it works */}
      <section className="py-16 border-t border-border">
        <h2 className="text-2xl font-bold mb-8">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: "1", title: "Download", desc: "Grab the latest loader from the button above." },
            { step: "2", title: "Launch", desc: "Run the loader — it pulls the latest module automatically." },
            { step: "3", title: "Play", desc: "The module loads into your game. That's it." },
          ].map((s) => (
            <div key={s.step} className="bg-surface rounded-xl p-6 border border-border">
              <span className="text-accent font-mono text-sm">{s.step}</span>
              <h3 className="text-lg font-semibold mt-2">{s.title}</h3>
              <p className="text-text-muted text-sm mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-t border-border">
        <h2 className="text-2xl font-bold mb-8">Features</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            "Always up to date — loader fetches the newest build",
            "No accounts or login required",
            "Lightweight — minimal footprint",
            "Auto-updating changelog",
          ].map((f) => (
            <div key={f} className="flex items-start gap-3 bg-surface rounded-lg p-4 border border-border">
              <span className="text-accent mt-0.5">✓</span>
              <span className="text-sm">{f}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
