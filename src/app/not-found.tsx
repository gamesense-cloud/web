import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <h1 className="text-6xl font-bold text-accent">404</h1>
      <p className="mt-4 text-text-muted text-lg">Page not found.</p>
      <Link href="/" className="mt-6 text-accent hover:underline text-sm">
        ← Back to home
      </Link>
    </div>
  );
}
