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

export default async function Home() {
  const userCount = await getActiveUsers();

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-bold tracking-tight">
        gamesense<span className="text-accent">.cloud</span>
      </h1>

      <p className="mt-6 text-text-muted text-sm flex items-center gap-2">
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
    </div>
  );
}
