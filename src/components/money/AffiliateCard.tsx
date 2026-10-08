import { ArrowRight } from "lucide-react";
import { displayableOffer } from "./affiliate";
import type { AffiliateOffer } from "./affiliate";

type Props = {
  offer: AffiliateOffer | null | undefined;
  /** Where it sits: the desktop aside, or inline between Quick Answers. */
  placement: "aside" | "inline";
};

/**
 * A clearly labelled commercial card. Renders nothing without complete,
 * disclosed display data; the CTA is a link only for a reviewed https URL.
 */
export function AffiliateCard({ offer, placement }: Props) {
  const shown = displayableOffer(offer);
  if (!shown) return null;
  return (
    <section
      className={`money-affiliate money-affiliate-${placement}`}
      aria-label={shown.disclosure}
    >
      <span className="money-affiliate-disclosure">{shown.disclosure}</span>
      <h3>{shown.title}</h3>
      <p>{shown.description}</p>
      {shown.href ? (
        <a
          className="money-affiliate-cta"
          href={shown.href}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
        >
          {shown.ctaLabel}
          <ArrowRight size={15} aria-hidden="true" />
        </a>
      ) : (
        <span className="money-affiliate-cta is-inactive">
          {shown.ctaLabel}
          <ArrowRight size={15} aria-hidden="true" />
        </span>
      )}
    </section>
  );
}
