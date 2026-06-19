import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wide text-blue-300">404</p>
        <h1 className="mt-3 text-4xl font-bold gradient-text">Page not found</h1>
        <p className="mt-4 text-slate-400">
          The page you are looking for is not available in this workspace.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center justify-center rounded-lg glass glass-hover px-4 py-2 font-medium text-white"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
