"use client";

import { useSyncExternalStore } from "react";
import { Navigation } from "@/components/navigation";

function subscribe() {
  return () => {};
}

export function ClientNavigation() {
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    return null;
  }

  return <Navigation />;
}
