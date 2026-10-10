import { useEffect, useMemo, useRef, useState } from "react";
import { getGuide } from "../../guides/api";
import type { GuideDetail, GuideMetadata } from "../../guides/api";
import {
  JOURNEY_GUIDE_SLUGS,
  JOURNEY_GUIDES,
} from "../../guides/familyVisaJourney";
import type {
  GuideAvailability,
  JourneyGuideId,
} from "../../guides/familyVisaJourney";
import { loadFamilyVisaContent } from "../../guides/familyVisaContent";
import type { FamilyVisaContent } from "../../guides/familyVisaContent";

export type GuideListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; guides: GuideMetadata[] };

type DetailState = "error" | GuideDetail;

/**
 * Availability of the reviewed Family & Visa Guides. Details are fetched
 * only when `enabled`, only for Guides the list says are published, and only
 * by their fixed slugs (never anything derived from a person's answers).
 */
export function useJourneyGuides(
  list: GuideListState,
  enabled: boolean,
): Record<JourneyGuideId, GuideAvailability> {
  const [details, setDetails] = useState<Record<string, DetailState>>({});
  const requested = useRef(new Set<string>());
  const published = useMemo(
    () =>
      list.status === "ready"
        ? new Map(list.guides.map((guide) => [guide.slug, guide]))
        : null,
    [list],
  );

  useEffect(() => {
    if (!enabled || !published) return;
    const wanted = JOURNEY_GUIDE_SLUGS.filter(
      (slug) => published.has(slug) && !requested.current.has(slug),
    );
    if (wanted.length === 0) return;
    const controller = new AbortController();
    for (const slug of wanted) {
      requested.current.add(slug);
      getGuide(slug, controller.signal)
        .then((detail) =>
          setDetails((current) => ({ ...current, [slug]: detail })),
        )
        .catch(() => {
          // Requests cut short are retried next time.
          if (controller.signal.aborted) requested.current.delete(slug);
          else setDetails((current) => ({ ...current, [slug]: "error" }));
        });
    }
    return () => controller.abort();
  }, [enabled, published]);

  return useMemo(() => {
    const entries = (Object.keys(JOURNEY_GUIDES) as JourneyGuideId[]).map(
      (id): [JourneyGuideId, GuideAvailability] => {
        const slug = JOURNEY_GUIDES[id].slug;
        if (list.status === "loading") return [id, { status: "loading" }];
        if (list.status === "error") return [id, { status: "unavailable" }];
        const meta = published?.get(slug);
        if (!meta) return [id, { status: "unpublished" }];
        const detail = details[slug];
        if (detail === undefined) return [id, { status: "loading", meta }];
        if (detail === "error") return [id, { status: "unavailable", meta }];
        return [id, { status: "ready", meta, detail }];
      },
    );
    return Object.fromEntries(entries) as Record<
      JourneyGuideId,
      GuideAvailability
    >;
  }, [list, published, details]);
}

/**
 * The restated Family & Visa wording, loaded once. In a production build this
 * always settles to null (see familyVisaContent.ts).
 */
export function useFamilyVisaContent(): {
  content: FamilyVisaContent | null;
  loaded: boolean;
} {
  const [state, setState] = useState<{
    content: FamilyVisaContent | null;
    loaded: boolean;
  }>({ content: null, loaded: false });
  useEffect(() => {
    let active = true;
    loadFamilyVisaContent()
      .then((content) => {
        if (active) setState({ content, loaded: true });
      })
      .catch(() => {
        if (active) setState({ content: null, loaded: true });
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
}
