import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="panel w-full max-w-[360px] rise">
        <div className="panel-head">
          Not found
          <span className="badge bad push">404</span>
        </div>
        <div className="p-3.5 flex flex-col items-start gap-3">
          <p className="m-0 text-text-muted leading-relaxed">This page doesn&apos;t exist, or it has moved.</p>
          <Link href="/" className="btn">&larr; Back home</Link>
        </div>
      </div>
    </div>
  );
}
