// The all-Guides index (/{locale}/guides): its wording, shared by the app page
// (components/guides/LocalizedGuideIndex.tsx) and the prerendered page
// (seo/staticPages.ts), so both say the same thing.
import type { GuideLocale } from "./locales.ts";

export const GUIDE_INDEX_COPY: Readonly<Record<GuideLocale, { title: string; description: string; loading: string; failed: string; empty: string; updated: string; topics: string; open: string }>> = {
  "zh-CN": { title: "生活指南", description: "查看已发布的英国生活指南。", loading: "正在加载指南…", failed: "指南暂时无法加载，请稍后再试。", empty: "这个语言目前还没有已发布的指南。", updated: "更新于", topics: "按主题浏览", open: "进入专题" },
  "zh-TW": { title: "生活指南", description: "查看已發布的英國生活指南。", loading: "正在載入指南…", failed: "指南暫時無法載入，請稍後再試。", empty: "此語言目前尚無已發布的指南。", updated: "更新於", topics: "按主題瀏覽", open: "進入專題" },
  en: { title: "UK life guides", description: "Browse published guides to life in the UK.", loading: "Loading guides…", failed: "Guides are temporarily unavailable. Please try again later.", empty: "There are no published guides in this language yet.", updated: "Updated", topics: "Browse by topic", open: "Open section" },
  ur: { title: "برطانیہ میں زندگی کی رہنمائی", description: "برطانیہ میں زندگی سے متعلق شائع شدہ رہنمائی دیکھیں۔", loading: "رہنمائی لوڈ ہو رہی ہے…", failed: "رہنمائی عارضی طور پر دستیاب نہیں۔ دوبارہ کوشش کریں۔", empty: "اس زبان میں ابھی کوئی رہنمائی شائع نہیں ہوئی۔", updated: "تازہ کاری", topics: "موضوع کے لحاظ سے دیکھیں", open: "حصہ کھولیں" },
  hi: { title: "यूके जीवन मार्गदर्शिकाएँ", description: "यूके में जीवन के बारे में प्रकाशित मार्गदर्शिकाएँ देखें।", loading: "मार्गदर्शिकाएँ लोड हो रही हैं…", failed: "मार्गदर्शिकाएँ अभी उपलब्ध नहीं हैं। कृपया बाद में प्रयास करें।", empty: "इस भाषा में अभी कोई मार्गदर्शिका प्रकाशित नहीं है।", updated: "अपडेट", topics: "विषय के अनुसार देखें", open: "खंड खोलें" },
};
