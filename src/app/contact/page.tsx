export const metadata = { title: "Contact — gamesense.cloud" };

export default function Contact() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold">Contact</h1>
      <p className="text-text-muted mt-2">Get help, report issues, or connect with the project.</p>

      <div className="mt-8 space-y-4">
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="font-semibold text-lg">GitHub</h2>
          <p className="text-text-muted text-sm mt-1">
            Source code, issue tracker, and feature requests.
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-text-muted w-20">DLL Repo</span>
              <a
                href="https://github.com/gamesense-cloud/dll"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-mono text-xs"
              >
                gamesense-cloud/dll
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted w-20">Web Repo</span>
              <a
                href="https://github.com/gamesense-cloud/web"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-mono text-xs"
              >
                gamesense-cloud/web
              </a>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="font-semibold text-lg">Support</h2>
          <p className="text-text-muted text-sm mt-1">
            For bugs, crashes, or setup issues.
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-text-muted w-20">Issues</span>
              <span className="text-text-dim text-xs">
                Open an issue on the relevant GitHub repo above
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted w-20">Logs</span>
              <span className="text-text-dim text-xs">
                Include the DLL console log when reporting crashes
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="font-semibold text-lg">Contributing</h2>
          <p className="text-text-muted text-sm mt-1">
            Lua scripts, map configs, and feature PRs are welcome.
          </p>
          <div className="mt-3 text-sm text-text-dim space-y-1">
            <p>
              Check the{" "}
              <a href="/docs" className="text-accent hover:underline">
                Lua API docs
              </a>{" "}
              for the full scripting reference.
            </p>
            <p>
              Scripts go in{" "}
              <code className="text-accent font-mono text-xs bg-bg px-1.5 py-0.5 rounded">
                game/bin/win64/scripts/
              </code>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-lg font-semibold mb-4">FAQ</h2>
        <div className="space-y-3">
          {[
            {
              q: "The web radar says 'NO SESSION' — what do I do?",
              a: "Make sure the DLL is loaded in CS2 and you've clicked 'Start Web Radar' in Settings → Web Radar. Then open the URL it gives you.",
            },
            {
              q: "Radar shows 'STALE' or stops updating",
              a: "The DLL lost connection to the server. Check your internet connection, or restart the web radar from the DLL settings.",
            },
            {
              q: "Players aren't showing on the radar",
              a: "You need to be in a match. The radar won't show anything on the main menu or loading screens. If you're in a match and still see no players, check the debug overlay (press D) for diagnostics.",
            },
            {
              q: "My map doesn't have a background image",
              a: "Only the standard competitive maps have radar overlays. Community or workshop maps will show player positions on a plain grid.",
            },
            {
              q: "How do I write Lua scripts?",
              a: "Open the Scripts tab in the DLL menu, create a new script, and use the built-in editor. See the Docs page for the full API reference.",
            },
          ].map((item, i) => (
            <details key={i} className="bg-surface border border-border rounded-lg group">
              <summary className="px-5 py-3 text-sm font-medium cursor-pointer text-text-dim hover:text-text-muted transition-colors">
                {item.q}
              </summary>
              <p className="px-5 pb-4 text-sm text-text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
