export const metadata = { title: "Policy — gamesense.cloud" };

export default function Policy() {
  return (
    <div className="doc">
      <header className="doc-head">
        <span className="label">Legal</span>
        <h1>Terms &amp; Privacy</h1>
        <p className="doc-tip">Last updated September 2026</p>
      </header>

      <section className="panel">
        <div className="panel-head">Terms of Service</div>
        <div className="doc-body">
          <p>By using gamesense.cloud software you agree to these terms.</p>
          <ul className="bullets">
            <li>The software is provided &quot;as is&quot; without warranty.</li>
            <li>You use the software at your own risk.</li>
            <li>Redistribution or reverse engineering is prohibited.</li>
            <li>We may modify or discontinue the software at any time.</li>
          </ul>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">Privacy</div>
        <div className="doc-body">
          <p>We collect minimal data to operate the service:</p>
          <ul className="bullets">
            <li>Session heartbeats (anonymous session ID) to track online count.</li>
            <li>Web radar data is ephemeral — pushed in real time, not stored long-term.</li>
            <li>No accounts, no passwords, no personal information collected.</li>
            <li>No analytics, tracking pixels, or third-party telemetry.</li>
            <li>We do not sell or share your data with anyone.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
