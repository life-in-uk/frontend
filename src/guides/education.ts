import type { GuideMetadata } from "./api.ts";
import type { GuideLocale } from "./locales.ts";

export const EDUCATION_ARRIVALS = "joining-school-after-moving-to-uk";

export const EDUCATION_COPY = {
  "zh-CN": { title: "教育与学习", description: "了解英国的小学、中学和大学。为刚搬来的孩子找学校，了解 GCSE 衔接和 16 岁以后的选择。", arrivals: "从海外搬来，孩子需要插班？", primary: "小学", secondary: "中学及 16 岁以后", general: "学校阶段与入学流程", support: "在校支持与日常安排" },
  "zh-TW": { title: "教育與學習", description: "了解英國的小學、中學與大學。為剛搬來的孩子找學校，了解 GCSE 銜接與 16 歲以後的選擇。", arrivals: "從海外搬來，孩子需要中途入學？", primary: "小學", secondary: "中學及 16 歲以後", general: "就學階段與入學流程", support: "在校支持與日常安排" },
  en: { title: "Education", description: "Find your way through primary school, secondary school and university. Get help finding a school after a move, joining during GCSEs and choosing what to do after 16.", arrivals: "Moving to the UK with school-age children?", primary: "Primary school", secondary: "Secondary school and post-16", general: "School stages and admissions", support: "School support and everyday routines" },
  ur: { title: "تعلیم", description: "پرائمری اسکول، سیکنڈری اسکول اور یونیورسٹی کے بارے میں جانیں۔ نقل مکانی کے بعد اسکول ڈھونڈنے، GCSE کے دوران داخلے اور 16 سال کے بعد کے انتخاب میں رہنمائی پائیں۔", arrivals: "اسکول جانے کی عمر کے بچوں کے ساتھ برطانیہ منتقل ہو رہے ہیں؟", primary: "پرائمری اسکول", secondary: "سیکنڈری اسکول اور 16 سال کے بعد", general: "تعلیمی مرحلے اور داخلہ", support: "اسکول میں مدد اور روزمرہ کے انتظامات" },
  hi: { title: "शिक्षा", description: "प्राथमिक स्कूल, माध्यमिक स्कूल और विश्वविद्यालय के बारे में जानें। स्थान बदलने के बाद स्कूल ढूँढ़ने, GCSE के दौरान प्रवेश और 16 साल के बाद के विकल्पों पर मार्गदर्शन पाएँ।", arrivals: "स्कूल जाने की उम्र के बच्चों के साथ यूके आ रहे हैं?", primary: "प्राथमिक स्कूल", secondary: "माध्यमिक स्कूल और 16 वर्ष के बाद", general: "स्कूली चरण और प्रवेश", support: "स्कूल की सहायता और रोज़मर्रा की व्यवस्था" },
} satisfies Record<GuideLocale, Record<"title" | "description" | "arrivals" | "primary" | "secondary" | "general" | "support", string>>;

export function educationSections(guides: readonly GuideMetadata[]) {
  const groups = [
    { id: "arrivals", slugs: [EDUCATION_ARRIVALS] },
    { id: "primary", slugs: ["uk-school-stages-and-year-groups", "primary-school-reception-applications-england"] },
    { id: "secondary", slugs: ["secondary-school-year-7-applications-england", "joining-school-during-gcses-england", "sixth-form-or-fe-college-england"] },
    { id: "general", slugs: null },
    { id: "support", slugs: ["english-language-support-at-school-england", "send-school-support-england", "school-meals-attendance-and-transport-england"] },
  ] as const;
  const groupedSlugs = new Set<string>(groups.flatMap(({ slugs }) => slugs ? [...slugs] : []));
  return groups.map(({ id, slugs }) => ({
    id,
    guides: slugs
      ? slugs.flatMap((slug) => guides.filter((guide) => guide.slug === slug))
      : guides.filter((guide) => !groupedSlugs.has(guide.slug)),
  })).filter((group) => group.guides.length > 0);
}
