export const metadata = { title: "Policy — gamesense.cloud" };

export default function Policy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 prose-sm">
      <h1 className="text-3xl font-bold">Terms of Service &amp; Privacy Policy</h1>
      <p className="text-text-muted mt-2">Last updated: September 2026</p>

      <section className="mt-10 space-y-4 text-sm text-text-muted">
        <h2 className="text-xl font-semibold text-text">Terms of Service</h2>
        <p>
          By downloading or using gamesense.cloud software (&quot;the Software&quot;),
          you agree to the following terms. If you do not agree, do not use the
          Software.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>The Software is provided &quot;as is&quot; without warranty of any kind.</li>
          <li>You use the Software at your own risk. The authors are not responsible for any consequences arising from its use.</li>
          <li>Redistribution, resale, or reverse engineering of the Software is prohibited.</li>
          <li>We reserve the right to modify or discontinue the Software at any time without notice.</li>
          <li>These terms may be updated at any time. Continued use constitutes acceptance of the updated terms.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-4 text-sm text-text-muted">
        <h2 className="text-xl font-semibold text-text">Privacy Policy</h2>
        <p>We collect minimal data:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Session pings:</strong> The Software sends periodic heartbeat signals to track active user count. These contain no personally identifiable information.</li>
          <li><strong className="text-text">No accounts:</strong> We do not collect usernames, emails, or passwords through the Software.</li>
          <li><strong className="text-text">No telemetry:</strong> We do not collect usage patterns, hardware info, or browsing data.</li>
          <li><strong className="text-text">Analytics:</strong> The website may use basic analytics (e.g. Vercel Analytics) to track page views. No cookies are used for tracking.</li>
        </ul>
        <p>Questions? Reach out on the <a href="/contact" className="text-accent hover:underline">Contact</a> page.</p>
      </section>
    </div>
  );
}
