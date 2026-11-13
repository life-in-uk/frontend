export const GUIDE_LOCALES = ["zh-CN", "zh-TW", "en", "ur", "hi"] as const;
export type GuideLocale = (typeof GUIDE_LOCALES)[number];

export const GUIDE_LOCALE_LABELS: Record<GuideLocale, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
  ur: "اردو",
  hi: "हिन्दी",
};

export const GUIDE_LOCALE_LANG: Record<GuideLocale, string> = {
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  en: "en-GB",
  ur: "ur",
  hi: "hi",
};

/** BCP 47 hreflang values shared with the backend sitemap output. */
export const GUIDE_LOCALE_HREFLANG: Record<GuideLocale, string> = {
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  en: "en-GB",
  ur: "ur",
  hi: "hi",
};

export const GUIDE_UI: Record<GuideLocale, {
  language: string; home: string; loading: string; notFound: string; notFoundText: string;
  unavailable: string; retry: string; updated: string; evidenceCount: string; evidenceIntro: string;
  evidenceLink: string; related: string; newWindow: string; evidenceLabel: string;
  evidenceMissing: string; sourceMissing: string; noSource: string; exampleSource: string;
  locator: string; excerpt: string; note: string; accessed: string;
  domain: Record<"health" | "family-visa" | "money", string>;
}> = {
  "zh-CN": { language: "语言", home: "首页", loading: "正在加载指南…", notFound: "没有找到这篇指南", notFoundText: "链接可能有误，或者这篇指南暂时不在了。", unavailable: "指南暂时无法加载", retry: "请稍后再试。", updated: "更新于", evidenceCount: "处标注了依据", evidenceIntro: "文中标着依据链接的地方，可以点开查看这句话依据的资料和机构。", evidenceLink: "查看依据", related: "相关指南", newWindow: "（在新窗口打开）", evidenceLabel: "这句话的依据", evidenceMissing: "这条依据暂时无法显示。文末列出了本文使用的全部来源。", sourceMissing: "来源信息暂缺。", noSource: "这条依据暂时没有可显示的来源。", exampleSource: "价格举例 · 非官方资料", locator: "原文位置", excerpt: "原文摘录", note: "说明", accessed: "查阅日期", domain: { health: "健康与 NHS", "family-visa": "家庭与签证", money: "金钱与财务" } },
  "zh-TW": { language: "語言", home: "首頁", loading: "正在載入指南…", notFound: "找不到這篇指南", notFoundText: "連結可能有誤，或這篇指南暫時無法使用。", unavailable: "指南暫時無法載入", retry: "請稍後再試。", updated: "更新於", evidenceCount: "處標註了依據", evidenceIntro: "文中標示依據連結的地方，可以點開查看這句話所依據的資料和機構。", evidenceLink: "查看依據", related: "相關指南", newWindow: "（在新視窗開啟）", evidenceLabel: "這句話的依據", evidenceMissing: "這條依據暫時無法顯示。本文使用的來源列於文末。", sourceMissing: "來源資料暫缺。", noSource: "這條依據暫時沒有可顯示的來源。", exampleSource: "價格示例 · 非官方資料", locator: "原文位置", excerpt: "原文摘錄", note: "說明", accessed: "查閱日期", domain: { health: "健康與 NHS", "family-visa": "家庭與簽證", money: "金錢與財務" } },
  en: { language: "Language", home: "Home", loading: "Loading guide…", notFound: "Guide not found", notFoundText: "The link may be incorrect, or this guide is not currently available.", unavailable: "Guide temporarily unavailable", retry: "Please try again later.", updated: "Updated", evidenceCount: "evidence references", evidenceIntro: "Select an evidence link to see the source and organisation behind that statement.", evidenceLink: "View evidence", related: "Related guides", newWindow: "(opens in a new window)", evidenceLabel: "Evidence for this statement", evidenceMissing: "This evidence cannot be displayed. All sources used are listed at the end.", sourceMissing: "Source details are unavailable.", noSource: "No source is currently available for this evidence.", exampleSource: "Price example · unofficial source", locator: "Source location", excerpt: "Source excerpt", note: "Note", accessed: "Accessed", domain: { health: "Health and NHS", "family-visa": "Family and visas", money: "Money and finance" } },
  ur: { language: "زبان", home: "صفحۂ اول", loading: "رہنمائی لوڈ ہو رہی ہے…", notFound: "رہنمائی نہیں ملی", notFoundText: "لنک غلط ہو سکتا ہے یا یہ رہنمائی فی الحال دستیاب نہیں۔", unavailable: "رہنمائی عارضی طور پر دستیاب نہیں", retry: "براہِ کرم بعد میں دوبارہ کوشش کریں۔", updated: "تازہ کاری", evidenceCount: "حوالہ جات", evidenceIntro: "کسی دعوے کے پیچھے موجود ماخذ اور ادارہ دیکھنے کے لیے حوالہ کھولیں۔", evidenceLink: "حوالہ دیکھیں", related: "متعلقہ رہنمائی", newWindow: "(نئی ونڈو میں کھلے گا)", evidenceLabel: "اس بیان کا ماخذ", evidenceMissing: "یہ حوالہ فی الحال نہیں دکھایا جا سکتا۔ تمام ماخذ آخر میں درج ہیں۔", sourceMissing: "ماخذ کی تفصیل دستیاب نہیں۔", noSource: "اس حوالے کے لیے فی الحال کوئی ماخذ دستیاب نہیں۔", exampleSource: "قیمت کی مثال · غیر سرکاری ماخذ", locator: "ماخذ میں مقام", excerpt: "ماخذ کا اقتباس", note: "وضاحت", accessed: "دیکھنے کی تاریخ", domain: { health: "صحت اور NHS", "family-visa": "خاندان اور ویزا", money: "رقم اور مالیات" } },
  hi: { language: "भाषा", home: "मुखपृष्ठ", loading: "मार्गदर्शिका लोड हो रही है…", notFound: "मार्गदर्शिका नहीं मिली", notFoundText: "लिंक गलत हो सकता है या यह मार्गदर्शिका अभी उपलब्ध नहीं है।", unavailable: "मार्गदर्शिका अभी उपलब्ध नहीं है", retry: "कृपया बाद में फिर प्रयास करें।", updated: "अपडेट", evidenceCount: "साक्ष्य संदर्भ", evidenceIntro: "किसी कथन के पीछे का स्रोत और संस्था देखने के लिए साक्ष्य लिंक चुनें।", evidenceLink: "साक्ष्य देखें", related: "संबंधित मार्गदर्शिकाएँ", newWindow: "(नई विंडो में खुलेगा)", evidenceLabel: "इस कथन का आधार", evidenceMissing: "यह साक्ष्य अभी नहीं दिखाया जा सकता। सभी स्रोत अंत में दिए गए हैं।", sourceMissing: "स्रोत का विवरण उपलब्ध नहीं है।", noSource: "इस साक्ष्य के लिए अभी कोई स्रोत उपलब्ध नहीं है।", exampleSource: "कीमत का उदाहरण · गैर-आधिकारिक स्रोत", locator: "स्रोत में स्थान", excerpt: "स्रोत का अंश", note: "टिप्पणी", accessed: "देखने की तारीख", domain: { health: "स्वास्थ्य और NHS", "family-visa": "परिवार और वीज़ा", money: "धन और वित्त" } },
};

export function isGuideLocale(value: string): value is GuideLocale {
  return (GUIDE_LOCALES as readonly string[]).includes(value);
}

export function textDirection(locale: GuideLocale): "ltr" | "rtl" {
  return locale === "ur" ? "rtl" : "ltr";
}

export function localizedGuidePath(
  locale: GuideLocale,
  domain: string,
  slug?: string,
): string {
  return `/${locale}/${domain}${slug ? `/${encodeURIComponent(slug)}` : ""}`;
}
