"use client";

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-dark max-w-md w-full p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Something went wrong!</h2>
        <p className="text-sm text-slate-400">
          We hit an unexpected issue while loading this page.
        </p>
        <button
          onClick={() => unstable_retry()}
          className="inline-flex items-center justify-center rounded-lg glass glass-hover px-4 py-2 font-medium text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
