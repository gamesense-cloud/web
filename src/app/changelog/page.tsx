import { getCommits, getLatestRelease } from "@/lib/github";

export const revalidate = 300;

export const metadata = { title: "Changelog — gamesense.cloud" };

const REPOS = [
  { name: "launcher", label: "Launcher" },
  { name: "dll", label: "DLL" },
  { name: "web", label: "Web" },
] as const;

export default async function Changelog() {
  const [release, ...commitSets] = await Promise.all([
    getLatestRelease("launcher"),
    ...REPOS.map((r) =>
      getCommits(r.name, 30)
        .then((commits) => commits.map((c) => ({ ...c, repo: r.label })))
        .catch(() => [] as { sha: string; commit: { message: string; author: { name: string; date: string } }; repo: string }[])
    ),
  ]);

  const allCommits = commitSets
    .flat()
    .sort((a, b) => new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime())
    .slice(0, 80);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold">Changelog</h1>
      <p className="text-text-muted mt-2">
        Latest version: <span className="text-accent font-mono">{release?.tag_name ?? "dev"}</span>
      </p>

      {release?.body && (
        <div className="mt-8 bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold">{release.name || release.tag_name}</h2>
          <time className="text-xs text-text-muted">{new Date(release.published_at).toLocaleDateString()}</time>
          <p className="mt-3 text-sm text-text-muted whitespace-pre-wrap">{release.body}</p>
        </div>
      )}

      <h2 className="text-xl font-semibold mt-12 mb-4">Recent commits</h2>
      <div className="space-y-1">
        {allCommits.map((c) => {
          const firstLine = c.commit.message.split("\n")[0];
          return (
            <div key={c.sha} className="flex items-baseline gap-3 py-2 border-b border-border/50 last:border-0">
              <code className="text-accent text-xs font-mono shrink-0">{c.sha.slice(0, 7)}</code>
              <span className="text-text-faint text-xs font-mono shrink-0 w-16">{c.repo}</span>
              <span className="text-sm flex-1 truncate">{firstLine}</span>
              <time className="text-xs text-text-muted shrink-0">
                {new Date(c.commit.author.date).toLocaleDateString()}
              </time>
            </div>
          );
        })}
        {allCommits.length === 0 && <p className="text-text-muted text-sm">No commits yet.</p>}
      </div>
    </div>
  );
}
