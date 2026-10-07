// Editorial navigation for the Health & NHS section.
// This holds only structure (groups, ordering, cross-links). Titles,
// summaries and article content always come from the Guide API. Routes and
// shared Guide behaviour live in `domains.ts`.

import type { GuideMetadata, GuideSource } from "./api";

export const HEALTH_CATEGORY = "health-nhs";

export type HubTone = "blue" | "coral" | "green" | "lavender" | "neutral";

export type HubGroup = {
  id: string;
  title: string;
  description: string;
  /** Visual identity of the category card and its articles. */
  tone: HubTone;
  slugs: string[];
};

export const HEALTH_HUB_GROUPS: HubGroup[] = [
  {
    id: "start",
    tone: "blue",
    title: "刚来英国？从这里开始",
    description: "看病要不要钱、怎么注册 GP、家里人来探亲怎么办。",
    slugs: [
      "nhs-ihs-costs-england",
      "registering-with-a-gp-england",
      "visiting-parents-healthcare-england",
    ],
  },
  {
    id: "ill-now",
    tone: "coral",
    title: "我现在生病了",
    description: "不舒服的时候，先弄清楚该找谁。",
    slugs: ["where-to-go-when-ill-england"],
  },
  {
    id: "medicines",
    tone: "green",
    title: "药和长期疾病",
    description: "买药、处方、国内带来的病历和疫苗记录，以及看病时的语言帮助。",
    slugs: [
      "medicines-prescriptions-england",
      "chinese-medical-records-vaccinations-england",
      "nhs-interpreter-language-help-england",
    ],
  },
  {
    id: "dental",
    tone: "lavender",
    title: "牙齿",
    description: "日常看牙和突然牙疼，是两条不同的路。",
    slugs: ["nhs-dentist-england", "urgent-dental-care-england"],
  },
];

/**
 * Navigation shortcuts. They only point to Guides; they state no rules themselves.
 * `icon` names a lucide icon chosen by the Hub.
 */
export const HEALTH_INTENTS: { label: string; slug: string; icon: string }[] = [
  {
    label: "生病了该去哪？",
    slug: "where-to-go-when-ill-england",
    icon: "signpost",
  },
  {
    label: "怎么注册 GP？",
    slug: "registering-with-a-gp-england",
    icon: "clipboard",
  },
  {
    label: "药怎么买？",
    slug: "medicines-prescriptions-england",
    icon: "pill",
  },
  {
    label: "晚上牙痛怎么办？",
    slug: "urgent-dental-care-england",
    icon: "moon",
  },
  {
    label: "父母来英国看病？",
    slug: "visiting-parents-healthcare-england",
    icon: "users",
  },
  { label: "NHS 收费吗？", slug: "nhs-ihs-costs-england", icon: "pound" },
];

/** Question-style shortcuts. They only point to Guides; they state no rules themselves. */
export const HEALTH_QUICK_LINKS: { question: string; slug: string }[] = [
  { question: "交了 IHS，看病还要自己付钱吗？", slug: "nhs-ihs-costs-england" },
  {
    question: "刚到英国，没有地址证明能注册 GP 吗？",
    slug: "registering-with-a-gp-england",
  },
  {
    question: "不舒服了，该去药房、GP 还是 A&E？",
    slug: "where-to-go-when-ill-england",
  },
  {
    question: "爸妈来探亲生病了怎么办？",
    slug: "visiting-parents-healthcare-england",
  },
  {
    question: "国内一直吃的药，到英国怎么继续？",
    slug: "medicines-prescriptions-england",
  },
  { question: "晚上突然牙疼，找谁？", slug: "urgent-dental-care-england" },
  {
    question: "国内的病历和疫苗记录，怎么交给 GP？",
    slug: "chinese-medical-records-vaccinations-england",
  },
  {
    question: "英语不好，看病能要中文口译吗？",
    slug: "nhs-interpreter-language-help-england",
  },
  { question: "怎么找 NHS 牙医？", slug: "nhs-dentist-england" },
];

export type HubSection = { group: HubGroup; guides: GuideMetadata[] };

/** Groups API Guides by the editorial structure; anything unplaced is still shown. */
export function groupHealthGuides(guides: GuideMetadata[]): HubSection[] {
  const health = guides.filter((guide) => guide.category === HEALTH_CATEGORY);
  const bySlug = new Map(health.map((guide) => [guide.slug, guide]));
  const placed = new Set<string>();
  const sections: HubSection[] = [];
  for (const group of HEALTH_HUB_GROUPS) {
    const found = group.slugs
      .map((slug) => bySlug.get(slug))
      .filter((guide): guide is GuideMetadata => guide !== undefined);
    found.forEach((guide) => placed.add(guide.slug));
    if (found.length > 0) sections.push({ group, guides: found });
  }
  const others = health.filter((guide) => !placed.has(guide.slug));
  if (others.length > 0)
    sections.push({
      group: {
        id: "other",
        title: "更多健康指南",
        description: "",
        tone: "neutral",
        slugs: [],
      },
      guides: others,
    });
  return sections;
}

/**
 * Titles written in 《》 inside published articles that now correspond to an
 * existing Guide. Matching references are rendered as internal links; the
 * article wording itself is not changed.
 */
export const GUIDE_TITLE_REFERENCES: Record<string, string> = {
  "刚到英国怎么注册 GP": "registering-with-a-gp-england",
  突然牙疼怎么办: "urgent-dental-care-england",
  "带着中国病历、疫苗记录和慢性病来到英国":
    "chinese-medical-records-vaccinations-england",
  英国牙医到底怎么看: "nhs-dentist-england",
};

/** Further reading shown after an article. */
export const RELATED_GUIDES: Record<string, string[]> = {
  "registering-with-a-gp-england": [
    "where-to-go-when-ill-england",
    "nhs-interpreter-language-help-england",
    "chinese-medical-records-vaccinations-england",
  ],
  "where-to-go-when-ill-england": [
    "registering-with-a-gp-england",
    "medicines-prescriptions-england",
    "urgent-dental-care-england",
  ],
  "nhs-ihs-costs-england": [
    "medicines-prescriptions-england",
    "nhs-dentist-england",
    "visiting-parents-healthcare-england",
  ],
  "visiting-parents-healthcare-england": [
    "where-to-go-when-ill-england",
    "nhs-ihs-costs-england",
    "nhs-interpreter-language-help-england",
  ],
  "medicines-prescriptions-england": [
    "chinese-medical-records-vaccinations-england",
    "nhs-ihs-costs-england",
    "where-to-go-when-ill-england",
  ],
  "chinese-medical-records-vaccinations-england": [
    "registering-with-a-gp-england",
    "medicines-prescriptions-england",
    "nhs-interpreter-language-help-england",
  ],
  "nhs-interpreter-language-help-england": [
    "registering-with-a-gp-england",
    "chinese-medical-records-vaccinations-england",
    "where-to-go-when-ill-england",
  ],
  "nhs-dentist-england": [
    "urgent-dental-care-england",
    "nhs-ihs-costs-england",
  ],
  "urgent-dental-care-england": [
    "nhs-dentist-england",
    "where-to-go-when-ill-england",
  ],
};

/** The editorial category a Guide belongs to, if any. */
export function groupForSlug(slug: string): HubGroup | undefined {
  return HEALTH_HUB_GROUPS.find((group) => group.slugs.includes(slug));
}

/**
 * Some Guides cite clinics' own published prices purely as examples. Those
 * sources are labelled so they are never presented as official evidence.
 */
export function isExampleSource(source: GuideSource): boolean {
  return source.key.startsWith("example-") || source.title.includes("仅作举例");
}
