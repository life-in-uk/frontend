// A one-line general-information notice for the Guides whose published text
// has none of its own: every Health Guide and the first bank account Guide.
// All other Guides end with their own "general information, not … advice"
// footer, so they get nothing here (no repeated disclaimers). Interface text
// only: the approved Guide wording is not changed, and no review is claimed.

import type { GuideDomainId } from "./domains.ts";
import type { GuideLocale } from "./locales.ts";

type Localized = Readonly<Record<GuideLocale, string>>;

const HEALTH: Localized = {
  "zh-CN": "本文是根据文中所列官方资料整理的一般信息，不是医疗建议；你自己的健康问题，请咨询 GP、药剂师或 NHS 111。",
  "zh-TW": "本文是根據文中所列官方資料整理的一般資訊，不是醫療建議；你自己的健康問題，請諮詢 GP、藥劑師或 NHS 111。",
  en: "General information based on the official sources listed in this Guide, not medical advice. For your own health, ask a GP, a pharmacist or NHS 111.",
  ur: "یہ اس رہنمائی میں درج سرکاری ذرائع پر مبنی عمومی معلومات ہے، طبی مشورہ نہیں۔ اپنی صحت کے بارے میں GP، فارماسسٹ یا NHS 111 سے پوچھیں۔",
  hi: "यह इस मार्गदर्शिका में दिए गए आधिकारिक स्रोतों पर आधारित सामान्य जानकारी है, चिकित्सा सलाह नहीं। अपनी सेहत के बारे में GP, फ़ार्मासिस्ट या NHS 111 से पूछें।",
};

const MONEY: Localized = {
  "zh-CN": "本文是根据文中所列资料整理的一般信息，不是理财或法律建议；银行的条件可能随时变化，申请前请以银行当时公布的说明为准。",
  "zh-TW": "本文是根據文中所列資料整理的一般資訊，不是理財或法律建議；銀行的條件可能隨時變化，申請前請以銀行當時公布的說明為準。",
  en: "General information based on the sources listed in this Guide, not financial or legal advice. Banks' conditions can change, so check what the bank says at the time you apply.",
  ur: "یہ اس رہنمائی میں درج ذرائع پر مبنی عمومی معلومات ہے، مالی یا قانونی مشورہ نہیں۔ بینکوں کی شرائط بدل سکتی ہیں، اس لیے درخواست کے وقت بینک کی بات دیکھیں۔",
  hi: "यह इस मार्गदर्शिका में दिए गए स्रोतों पर आधारित सामान्य जानकारी है, वित्तीय या क़ानूनी सलाह नहीं। बैंकों की शर्तें बदल सकती हैं, इसलिए आवेदन के समय बैंक की जानकारी देखें।",
};

/** Guides (by section and slug) that get a notice, because their text has no disclaimer of its own. */
export const NOTICE_SLUGS: Readonly<Partial<Record<GuideDomainId, "all" | readonly string[]>>> = {
  health: "all",
  money: ["open-uk-bank-account-new-arrival"],
};

export function guideNotice(domainId: GuideDomainId, slug: string, locale: GuideLocale): string | null {
  const rule = NOTICE_SLUGS[domainId];
  if (!rule || (rule !== "all" && !rule.includes(slug))) return null;
  return (domainId === "health" ? HEALTH : MONEY)[locale];
}
