import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <h1 className="text-6xl font-bold text-accent">404</h1>
      <p className="mt-4 text-text-muted">Page not found.</p>
      <Link href="/" className="mt-6 text-sm text-accent hover:text-accent-hi transition-colors">
        &larr; Home
      </Link>
    </div>
  );
}
