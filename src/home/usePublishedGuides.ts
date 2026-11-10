import { useEffect, useState } from "react";
import { getGuides } from "../guides/api";
import type { GuideMetadata } from "../guides/api";

export type PublishedGuidesState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; guides: GuideMetadata[] };

const REQUEST_DEADLINE_MS = 10_000;

/** One list request for the whole homepage, with deadline and abort. */
export function usePublishedGuides(): PublishedGuidesState {
  const [state, setState] = useState<PublishedGuidesState>({
    status: "loading",
  });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_DEADLINE_MS,
    );
    getGuides(controller.signal)
      .then((guides) => {
        if (active) setState({ status: "ready", guides });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  return state;
}
