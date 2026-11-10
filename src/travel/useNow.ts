import { useEffect, useState } from "react";

/**
 * The current time, re-read periodically so an open tool notices when its
 * snapshot becomes stale. It only re-renders; it never fetches.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
