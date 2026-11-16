// Maintenance priority for a Guide: how often the rules it explains tend to
// change. This orders the review queue; it is never a claim that a page is
// inaccurate, and no Guide is marked outdated because time has passed.
//
// - high: immigration fees, visa and ETA rules, income thresholds, processing
//   times, rental legislation and application procedures.
// - medium: administrative processes, NHS eligibility and service guidance,
//   household bills and banking practice.
// - lower: stable explanations and general practical guidance.

export const RISK_ORDER = ["high", "medium", "lower"];

const BY_CATEGORY = {
  "work-visa": "high",
  "family-visa": "high",
  settlement: "high",
  renting: "high",
  money: "medium",
  "health-nhs": "medium",
};

/** Explicit exceptions to the category default, each with its reason. */
export const RISK_OVERRIDES = {
  "renting-broadband": { risk: "medium", reason: "consumer guidance from Ofcom, not tenancy law" },
  "renting-water": { risk: "medium", reason: "water company administration, not tenancy law" },
  "renting-energy": { risk: "medium", reason: "supplier administration and Ofgem consumer guidance" },
  "renting-council-tax": { risk: "medium", reason: "council administration; discounts change rarely" },
  "renting-tv-licence": { risk: "medium", reason: "licensing rules are stable; the fee changes yearly" },
  "where-to-go-when-ill-england": { risk: "lower", reason: "how NHS services are organised; stable" },
  "nhs-interpreter-language-help-england": { risk: "lower", reason: "general practical guidance" },
  "chinese-medical-records-vaccinations-england": { risk: "lower", reason: "general practical guidance" },
  "nhs-ihs-costs-england": { risk: "high", reason: "states the Immigration Health Surcharge and NHS charges" },
};

/** { risk, reason } for a Guide (slug and API category). */
export function riskFor(slug, category) {
  if (RISK_OVERRIDES[slug]) return RISK_OVERRIDES[slug];
  const risk = BY_CATEGORY[category] ?? "medium";
  return { risk, reason: `${category} default` };
}

export const higherRisk = (a, b) => (RISK_ORDER.indexOf(a) <= RISK_ORDER.indexOf(b) ? a : b);
