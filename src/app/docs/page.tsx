import Link from "next/link";

export const metadata = { title: "Docs — gamesense.cloud" };

export default function Docs() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-text-muted text-sm hover:text-text transition-colors">
        &larr; Back
      </Link>
      <h1 className="text-2xl font-bold mt-6">
        Lua API <span className="text-accent">Documentation</span>
      </h1>
      <p className="mt-4 text-text-muted text-sm">
        Documentation coming soon. The Lua API reference will be available here.
      </p>
    </div>
  );
}
