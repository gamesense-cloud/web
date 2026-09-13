import Link from "next/link";

export const metadata = { title: "Policy — gamesense.cloud" };

export default function Policy() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-text-muted text-sm hover:text-text transition-colors">
        &larr; Back
      </Link>

      <h1 className="text-2xl font-bold mt-6">Terms &amp; Privacy</h1>
      <p className="text-text-faint text-xs mt-1">Last updated September 2026</p>

      <section className="mt-8 space-y-3 text-sm text-text-muted">
        <h2 className="text-lg font-semibold text-text">Terms of Service</h2>
        <p>By using gamesense.cloud software you agree to these terms.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>The software is provided &quot;as is&quot; without warranty.</li>
          <li>You use the software at your own risk.</li>
          <li>Redistribution or reverse engineering is prohibited.</li>
          <li>We may modify or discontinue the software at any time.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm text-text-muted">
        <h2 className="text-lg font-semibold text-text">Privacy</h2>
        <p>We collect minimal data to operate the service:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account credentials (username, email, hashed password) for authentication.</li>
          <li>Hardware ID (HWID) bound on first login for license enforcement.</li>
          <li>Session heartbeats to track online count.</li>
          <li>Web radar data is ephemeral — pushed in real time, not stored long-term.</li>
          <li>No analytics, tracking pixels, or third-party telemetry.</li>
          <li>We do not sell or share your data with anyone.</li>
        </ul>
      </section>
    </div>
  );
}
