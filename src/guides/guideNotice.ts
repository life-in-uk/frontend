// The disclaimer shown under a Guide, chosen by the Guide's subject (its section), in the reader's
// language. It is shown only when the Guide's own published text in that language has no equivalent
// "general information" statement, so a reader never sees two disclaimers. Interface text only: the
// approved Guide wording, its hashes and the structured data are not changed, and no review is claimed.
//
// Wording: the English texts are the owner-approved disclaimers (2026-11-26). The Simplified Chinese,
// Traditional Chinese, Urdu and Hindi texts are translations of them made for this release; they have
// not had an independent human linguistic review.
import type { GuideDomainId } from "./domains.ts";
import type { GuideLocale } from "./locales.ts";

type Localized = Readonly<Record<GuideLocale, string>>;

export type NoticeKind = "general" | "immigration" | "money" | "health" | "legal";

export const NOTICES: Readonly<Record<NoticeKind, Localized>> = {
  general: {
    en: "This guide provides general information only. Individual circumstances may vary. Check the relevant official sources before making important decisions.",
    "zh-CN": "本指南仅提供一般信息。每个人的情况可能不同，作出重要决定前，请查阅相关官方资料。",
    "zh-TW": "本指南僅提供一般資訊。每個人的情況可能不同，做出重要決定前，請查閱相關官方資料。",
    ur: "یہ رہنمائی صرف عمومی معلومات فراہم کرتی ہے۔ ہر شخص کے حالات مختلف ہو سکتے ہیں۔ اہم فیصلے کرنے سے پہلے متعلقہ سرکاری ذرائع ضرور دیکھیں۔",
    hi: "यह मार्गदर्शिका केवल सामान्य जानकारी देती है। हर व्यक्ति की परिस्थितियाँ अलग हो सकती हैं। महत्वपूर्ण निर्णय लेने से पहले संबंधित आधिकारिक स्रोत ज़रूर देखें।",
  },
  immigration: {
    en: "This guide provides general information and does not constitute immigration or legal advice. Immigration rules may change, and individual circumstances vary. Check current GOV.UK guidance and seek advice from a regulated immigration adviser where necessary.",
    "zh-CN": "本指南提供一般信息，不构成移民或法律建议。移民规则可能变化，每个人的情况也各不相同。请查阅 GOV.UK 的最新指引，必要时向受监管的移民顾问寻求建议。",
    "zh-TW": "本指南提供一般資訊，不構成移民或法律建議。移民規則可能變動，每個人的情況也各不相同。請查閱 GOV.UK 的最新指引，必要時向受監管的移民顧問尋求建議。",
    ur: "یہ رہنمائی عمومی معلومات فراہم کرتی ہے اور امیگریشن یا قانونی مشورہ نہیں ہے۔ امیگریشن کے قواعد بدل سکتے ہیں اور ہر شخص کے حالات مختلف ہوتے ہیں۔ GOV.UK کی تازہ ترین رہنمائی دیکھیں اور ضرورت ہو تو کسی ریگولیٹڈ امیگریشن مشیر سے مشورہ لیں۔",
    hi: "यह मार्गदर्शिका सामान्य जानकारी देती है और इसे आप्रवासन या क़ानूनी सलाह नहीं माना जाना चाहिए। आप्रवासन नियम बदल सकते हैं और हर व्यक्ति की परिस्थितियाँ अलग होती हैं। GOV.UK का मौजूदा मार्गदर्शन देखें और ज़रूरत हो तो किसी विनियमित आप्रवासन सलाहकार से सलाह लें।",
  },
  money: {
    en: "This guide provides general information and does not constitute personalised financial, investment or tax advice. Check current official guidance and seek qualified professional advice where necessary.",
    "zh-CN": "本指南提供一般信息，不构成针对个人的财务、投资或税务建议。请查阅最新的官方指引，必要时向合格的专业人士咨询。",
    "zh-TW": "本指南提供一般資訊，不構成針對個人的財務、投資或稅務建議。請查閱最新的官方指引，必要時向合格的專業人士諮詢。",
    ur: "یہ رہنمائی عمومی معلومات فراہم کرتی ہے اور ذاتی مالی، سرمایہ کاری یا ٹیکس مشورہ نہیں ہے۔ تازہ ترین سرکاری رہنمائی دیکھیں اور ضرورت ہو تو کسی اہل پیشہ ور سے مشورہ لیں۔",
    hi: "यह मार्गदर्शिका सामान्य जानकारी देती है और इसे व्यक्तिगत वित्तीय, निवेश या कर सलाह नहीं माना जाना चाहिए। मौजूदा आधिकारिक मार्गदर्शन देखें और ज़रूरत हो तो किसी योग्य पेशेवर से सलाह लें।",
  },
  health: {
    en: "This guide provides general information and is not a substitute for professional medical advice, diagnosis or treatment.",
    "zh-CN": "本指南提供一般信息，不能替代专业的医疗建议、诊断或治疗。",
    "zh-TW": "本指南提供一般資訊，不能取代專業的醫療建議、診斷或治療。",
    ur: "یہ رہنمائی عمومی معلومات فراہم کرتی ہے اور پیشہ ورانہ طبی مشورے، تشخیص یا علاج کا متبادل نہیں ہے۔",
    hi: "यह मार्गदर्शिका सामान्य जानकारी देती है और पेशेवर चिकित्सा सलाह, निदान या उपचार का विकल्प नहीं है।",
  },
  legal: {
    en: "This guide provides general information and does not constitute legal advice. Your rights and responsibilities may depend on your circumstances and the applicable jurisdiction.",
    "zh-CN": "本指南提供一般信息，不构成法律建议。你的权利和责任可能取决于你的具体情况以及适用的司法辖区。",
    "zh-TW": "本指南提供一般資訊，不構成法律建議。你的權利和責任可能取決於你的具體情況以及適用的司法管轄區。",
    ur: "یہ رہنمائی عمومی معلومات فراہم کرتی ہے اور قانونی مشورہ نہیں ہے۔ آپ کے حقوق اور ذمہ داریاں آپ کے حالات اور متعلقہ دائرۂ اختیار پر منحصر ہو سکتی ہیں۔",
    hi: "यह मार्गदर्शिका सामान्य जानकारी देती है और इसे क़ानूनी सलाह नहीं माना जाना चाहिए। आपके अधिकार और ज़िम्मेदारियाँ आपकी परिस्थितियों और लागू क्षेत्राधिकार पर निर्भर कर सकती हैं।",
  },
};

/** Each section's subject: visas, settlement and university/student visas are immigration matters. */
export const NOTICE_KIND: Readonly<Record<GuideDomainId, NoticeKind>> = {
  "family-visa": "immigration",
  "work-visa": "immigration",
  settlement: "immigration",
  "university-applications-student-visas": "immigration",
  money: "money",
  health: "health",
  renting: "legal",
  education: "general",
  "household-services": "general",
};

/** An equivalent statement already in a Guide's own text, per language ("general information"). */
const OWN_DISCLAIMER: Readonly<Record<GuideLocale, RegExp>> = {
  en: /general information/i,
  "zh-CN": /一般(?:性)?信息/u,
  "zh-TW": /一般(?:性)?資訊/u,
  ur: /(?:عمومی|عام) معلومات/u,
  hi: /सामान्य जानकारी/u,
};

/** Whether the Guide's published text in this language already says it is general information. */
export function hasOwnDisclaimer(content: string, locale: GuideLocale): boolean {
  return OWN_DISCLAIMER[locale].test(content);
}

/** The notice for a Guide in its section and language, or null when its own text already has one. */
export function guideNotice(domainId: GuideDomainId, locale: GuideLocale, content: string): string | null {
  return hasOwnDisclaimer(content, locale) ? null : NOTICES[NOTICE_KIND[domainId]][locale];
}
