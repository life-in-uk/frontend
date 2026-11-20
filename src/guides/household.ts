import type { GuideMetadata } from "./api.ts";
import type { GuideLocale } from "./locales.ts";

export const HOUSEHOLD_CATEGORY = "household-services";

export const HOUSEHOLD_COPY: Record<GuideLocale, { title: string; description: string }> = {
  "zh-CN": { title: "家庭服务与保险", description: "比较英国的住宅、汽车和宠物保险，了解紧急维修、道路救援、宽带和能源合约。" },
  "zh-TW": { title: "家庭服務與保險", description: "比較英國的住宅、汽車和寵物保險，了解緊急維修、道路救援、寬頻和能源合約。" },
  en: { title: "Household Services & Insurance", description: "Compare home, car and pet insurance and find out what to check in emergency cover, breakdown cover, broadband and energy contracts." },
  ur: { title: "گھریلو خدمات اور انشورنس", description: "برطانیہ میں گھر، گاڑی اور پالتو جانور کی انشورنس کا موازنہ کریں۔ ہنگامی مرمت، سڑک پر مدد، براڈبینڈ اور توانائی کے معاہدے سمجھیں۔" },
  hi: { title: "घरेलू सेवाएँ और बीमा", description: "यूके में गृह, कार और पालतू जानवर के बीमा की तुलना करें। आपात मरम्मत, सड़क सहायता, ब्रॉडबैंड और ऊर्जा अनुबंधों में क्या देखें, जानें।" },
};

/** Hub section headings (shared topic-hub layout). */
export const HOUSEHOLD_SECTIONS = {
  "zh-CN": { insurance: "保险", services: "宽带与能源", other: "更多家庭服务" },
  "zh-TW": { insurance: "保險", services: "寬頻與能源", other: "更多家庭服務" },
  en: { insurance: "Insurance", services: "Broadband and energy", other: "More household guides" },
  ur: { insurance: "انشورنس", services: "براڈبینڈ اور توانائی", other: "مزید گھریلو رہنمائی" },
  hi: { insurance: "बीमा", services: "ब्रॉडबैंड और ऊर्जा", other: "और घरेलू मार्गदर्शिकाएँ" },
} satisfies Record<GuideLocale, Record<"insurance" | "services" | "other", string>>;

/** Published Household Guides grouped for the hub, in reading order; unknown slugs go to "other". */
export function householdSections(guides: readonly GuideMetadata[]) {
  const groups = [
    { id: "insurance", slugs: ["uk-home-insurance-buildings-contents", "uk-home-emergency-cover-vs-service-plan", "uk-car-insurance-cover-before-driving", "uk-breakdown-cover-roadside-assistance", "uk-pet-insurance-vet-fees"] },
    { id: "services", slugs: ["uk-broadband-contracts-switching", "uk-energy-tariffs-switching"] },
    { id: "other", slugs: null },
  ] as const;
  const grouped = new Set<string>(groups.flatMap(({ slugs }) => slugs ? [...slugs] : []));
  return groups.map(({ id, slugs }) => ({
    id,
    guides: slugs
      ? slugs.flatMap((slug) => guides.filter((guide) => guide.slug === slug))
      : guides.filter((guide) => !grouped.has(guide.slug)),
  })).filter((group) => group.guides.length > 0);
}
