// Settlement / ILR hub: reading order, topic groups and key dates in all five
// locales. Guide titles and summaries always come from the Guide API; the hub
// links a Guide only when the API lists it as published, so nothing here can
// present an unpublished Guide as available. One entry (Skilled Worker ILR)
// lives in the Work Visa domain and is linked there rather than duplicated.

import type { GuideLocale } from "./locales.ts";

type Localized = Readonly<Record<GuideLocale, string>>;

export type SettlementGuideRef = { slug: string; domain: "settlement" | "work-visa" };

export type SettlementTopic = {
  id: string;
  title: Localized;
  lead: Localized;
  /** Guides in reading order. */
  guides: readonly SettlementGuideRef[];
};

const s = (slug: string): SettlementGuideRef => ({ slug, domain: "settlement" });

export const SETTLEMENT_TOPICS: readonly SettlementTopic[] = [
  {
    id: "start",
    title: { "zh-CN": "先看全貌", "zh-TW": "先看全貌", en: "The big picture", ur: "مجموعی تصویر", hi: "पूरी तस्वीर" },
    lead: {
      "zh-CN": "永居是什么、和入籍有什么不同，以及你可能走哪条路线。",
      "zh-TW": "永居是什麼、和入籍有什麼不同，以及你可能走哪條路線。",
      en: "What ILR is, how it differs from citizenship, and which route may apply to you.",
      ur: "ILR کیا ہے، یہ شہریت سے کیسے مختلف ہے، اور آپ کا ممکنہ راستہ کون سا ہے۔",
      hi: "ILR क्या है, यह नागरिकता से कैसे अलग है, और आपका संभावित रास्ता कौन-सा है।",
    },
    guides: [s("settlement-ilr-overview")],
  },
  {
    id: "routes",
    title: { "zh-CN": "按路线看", "zh-TW": "按路線看", en: "Route by route", ur: "راستے کے لحاظ سے", hi: "रास्ते के अनुसार" },
    lead: {
      "zh-CN": "配偶伴侣、Skilled Worker、10 年长期居住和其他路线，各有各的规则。",
      "zh-TW": "配偶伴侶、Skilled Worker、10 年長期居住和其他路線，各有各的規則。",
      en: "Partners, Skilled Worker, 10-year long residence and other routes each have their own rules.",
      ur: "پارٹنر، اسکلڈ ورکر، 10 سالہ طویل قیام اور دیگر راستوں کے اپنے اپنے قواعد ہیں۔",
      hi: "पार्टनर, स्किल्ड वर्कर, 10-वर्षीय दीर्घ निवास और अन्य रास्तों के अपने-अपने नियम हैं।",
    },
    guides: [
      s("settlement-partner-ilr"),
      { slug: "skilled-worker-settlement-ilr", domain: "work-visa" },
      s("settlement-long-residence"),
      s("settlement-other-routes"),
    ],
  },
  {
    id: "requirements",
    title: { "zh-CN": "共同的条件", "zh-TW": "共同的條件", en: "Common requirements", ur: "مشترکہ شرائط", hi: "साझा शर्तें" },
    lead: {
      "zh-CN": "离境天数、英语和 Life in the UK 考试，以及家属怎么一起申请。",
      "zh-TW": "離境天數、英語和 Life in the UK 考試，以及家屬怎麼一起申請。",
      en: "Days outside the UK, English and the Life in the UK Test, and how family members apply.",
      ur: "برطانیہ سے باہر کے دن، انگریزی اور Life in the UK ٹیسٹ، اور اہلِ خانہ کیسے درخواست دیں۔",
      hi: "ब्रिटेन से बाहर के दिन, अंग्रेज़ी और Life in the UK टेस्ट, और परिवार के सदस्य कैसे आवेदन करें।",
    },
    guides: [s("settlement-continuous-residence-absences"), s("settlement-english-life-in-uk-test"), s("settlement-children-dependants")],
  },
  {
    id: "apply",
    title: { "zh-CN": "准备和提交申请", "zh-TW": "準備和提交申請", en: "Preparing and applying", ur: "تیاری اور درخواست", hi: "तैयारी और आवेदन" },
    lead: {
      "zh-CN": "要准备的材料，以及什么时候申请、费用、等待期间和被拒以后。",
      "zh-TW": "要準備的材料，以及什麼時候申請、費用、等待期間和被拒以後。",
      en: "The documents to prepare, and when to apply, fees, waiting times and refusals.",
      ur: "تیار کی جانے والی دستاویزات، اور کب درخواست دیں، فیس، انتظار اور انکار کے بعد۔",
      hi: "तैयार किए जाने वाले दस्तावेज़, और कब आवेदन करें, शुल्क, प्रतीक्षा और अस्वीकृति के बाद।",
    },
    guides: [s("settlement-documents-evidence"), s("settlement-application-process")],
  },
  {
    id: "after",
    title: { "zh-CN": "拿到永居以后", "zh-TW": "拿到永居以後", en: "After you get ILR", ur: "ILR ملنے کے بعد", hi: "ILR मिलने के बाद" },
    lead: {
      "zh-CN": "权利、eVisa、出境和永居失效，以及怎么申请入籍。",
      "zh-TW": "權利、eVisa、出境和永居失效，以及怎麼申請入籍。",
      en: "Rights, eVisa, travel and losing ILR, and how to apply for citizenship.",
      ur: "حقوق، eVisa، سفر اور ILR کا ختم ہونا، اور شہریت کی درخواست کیسے دیں۔",
      hi: "अधिकार, eVisa, यात्रा और ILR का समाप्त होना, और नागरिकता के लिए आवेदन कैसे करें।",
    },
    guides: [s("settlement-after-ilr"), s("settlement-british-citizenship")],
  },
  {
    id: "reform",
    title: { "zh-CN": "改革追踪", "zh-TW": "改革追蹤", en: "Reform tracker", ur: "اصلاحات کا جائزہ", hi: "सुधार ट्रैकर" },
    lead: {
      "zh-CN": "积分式定居：哪些已经是法律，哪些只是方案（尚未生效）。",
      "zh-TW": "積分式定居：哪些已經是法律，哪些只是方案（尚未生效）。",
      en: "Earned Settlement: what is already law and what is only proposed (not in force).",
      ur: "Earned Settlement: کیا پہلے سے قانون ہے اور کیا صرف تجویز ہے (نافذ نہیں)۔",
      hi: "Earned Settlement: क्या पहले से क़ानून है और क्या केवल प्रस्ताव है (लागू नहीं)।",
    },
    guides: [s("settlement-earned-settlement-tracker")],
  },
];

/** All Guides in reading order. */
export const SETTLEMENT_GUIDES: readonly SettlementGuideRef[] = SETTLEMENT_TOPICS.flatMap((topic) => topic.guides);

/** Upcoming dates. "proposed" items are announced policy, not law. */
export const SETTLEMENT_KEY_DATES: readonly { date: string; proposed: boolean; label: Localized; text: Localized }[] = [
  {
    date: "2026-12-31",
    proposed: false,
    label: { "zh-CN": "2026 年 12 月 31 日", "zh-TW": "2026 年 12 月 31 日", en: "31 December 2026", ur: "31 دسمبر 2026", hi: "31 दिसंबर 2026" },
    text: {
      "zh-CN": "过期的 BRP 最晚只能用到这一天（或卡面到期后 24 个月，以较早者为准）；请改用 eVisa 证明身份。",
      "zh-TW": "過期的 BRP 最晚只能用到這一天（或卡面到期後 24 個月，以較早者為準）；請改用 eVisa 證明身分。",
      en: "The latest date an expired BRP can be used (or 24 months after its expiry date, whichever is earlier); use your eVisa to prove your status.",
      ur: "میعاد ختم شدہ BRP زیادہ سے زیادہ اسی تاریخ تک استعمال ہو سکتا ہے (یا میعاد ختم ہونے کے 24 ماہ بعد تک، جو پہلے ہو)؛ حیثیت ثابت کرنے کے لیے eVisa استعمال کریں۔",
      hi: "समाप्त हो चुका BRP अधिकतम इसी तारीख़ तक इस्तेमाल हो सकता है (या समाप्ति के 24 महीने बाद तक, जो पहले हो); स्थिति साबित करने के लिए eVisa का इस्तेमाल करें।",
    },
  },
  {
    date: "2027-03-26",
    proposed: false,
    label: { "zh-CN": "2027 年 3 月 26 日", "zh-TW": "2027 年 3 月 26 日", en: "26 March 2027", ur: "26 مارچ 2027", hi: "26 मार्च 2027" },
    text: {
      "zh-CN": "多数路线申请永居时，英语要求从 B1 提高到 B2（已写入移民规则；香港 BN(O) 路线除外）。",
      "zh-TW": "多數路線申請永居時，英語要求從 B1 提高到 B2（已寫入移民規則；香港 BN(O) 路線除外）。",
      en: "On most routes the settlement English requirement rises from B1 to B2 (already in the Immigration Rules; the Hong Kong BN(O) route is an exception).",
      ur: "زیادہ تر راستوں پر مستقل رہائش کے لیے انگریزی کا تقاضا B1 سے B2 ہو جائے گا (امیگریشن قواعد میں شامل؛ ہانگ کانگ BN(O) راستہ مستثنیٰ ہے)۔",
      hi: "ज़्यादातर रास्तों पर स्थायी निवास के लिए अंग्रेज़ी की शर्त B1 से B2 होगी (इमिग्रेशन नियमों में शामिल; हांगकांग BN(O) रास्ता अपवाद है)।",
    },
  },
  {
    date: "pending",
    proposed: true,
    label: { "zh-CN": "日期未定（提议）", "zh-TW": "日期未定（提議）", en: "Date not set (proposal)", ur: "تاریخ طے نہیں (تجویز)", hi: "तारीख़ तय नहीं (प्रस्ताव)" },
    text: {
      "zh-CN": "积分式定居（Earned Settlement）：一般年限拟由 5 年改为 10 年，并关闭长期居住路线等；尚未写入移民规则，现行规则继续适用。",
      "zh-TW": "積分式定居（Earned Settlement）：一般年限擬由 5 年改為 10 年，並關閉長期居住路線等；尚未寫入移民規則，現行規則繼續適用。",
      en: "Earned Settlement: the usual period would rise from 5 to 10 years and the long residence route would close, among other changes; this is not yet in the Immigration Rules, and the current rules continue to apply.",
      ur: "Earned Settlement: عام مدت 5 سے 10 سال کرنے اور طویل قیام کا راستہ بند کرنے سمیت تبدیلیاں تجویز ہیں؛ یہ ابھی امیگریشن قواعد میں شامل نہیں، اور موجودہ قواعد لاگو رہیں گے۔",
      hi: "Earned Settlement: सामान्य अवधि 5 से 10 वर्ष करने और दीर्घ निवास रास्ता बंद करने सहित बदलाव प्रस्तावित हैं; यह अभी इमिग्रेशन नियमों में नहीं है, और मौजूदा नियम लागू रहेंगे।",
    },
  },
];

export const SETTLEMENT_COPY: Readonly<Record<GuideLocale, {
  eyebrow: string; title: string; lead: string; note: string;
  noticeTitle: string; notice: string; adviser: string;
  topicsNav: string; planTitle: string; planLead: string; datesTitle: string; datesLead: string;
  proposed: string; otherSection: string; notPublished: string; loading: string; unavailable: string; updated: string;
}>> = {
  "zh-CN": {
    eyebrow: "永居与入籍 · Settlement", title: "申请永居之前，先弄清你走哪条路线。",
    lead: "永居的条件按签证路线各不相同。从路线、离境天数、英语和材料，到拿到永居以后和入籍，按顺序读。",
    note: "Life in UK 是独立的中文生活信息服务，不隶属于英国政府或 UK Visas and Immigration。",
    noticeTitle: "使用前请注意",
    notice: "这些指南按 2026 年 11 月 15 日当天的移民规则整理，是一般信息，不是法律意见，也没有经过律师审核。“积分式定居”等已公布但尚未写入规则的改革，都单独标明为提议，不是现行法律。",
    adviser: "情况复杂（例如被拒签过、有逾期居留或犯罪记录、离境时间很长）时，请咨询在 Immigration Advice Authority（IAA）注册的移民顾问或律师；具体要求以 GOV.UK 和移民规则为准。",
    topicsNav: "按主题浏览", planTitle: "阅读顺序", planLead: "建议先读第 1 篇，再看适用于你的路线；入籍放在最后。",
    datesTitle: "近期要留意的日期", datesLead: "规则变化以 Home Office 正式公布的移民规则为准。",
    proposed: "提议，尚未生效", otherSection: "工作签证栏目", notPublished: "这篇指南暂时无法显示。",
    loading: "正在加载永居指南…", unavailable: "指南暂时无法加载，请稍后再试。", updated: "更新于",
  },
  "zh-TW": {
    eyebrow: "永居與入籍 · Settlement", title: "申請永居之前，先弄清你走哪條路線。",
    lead: "永居的條件依簽證路線各不相同。從路線、離境天數、英語和材料，到拿到永居以後和入籍，按順序讀。",
    note: "Life in UK 是獨立的中文生活資訊服務，不隸屬於英國政府或 UK Visas and Immigration。",
    noticeTitle: "使用前請注意",
    notice: "這些指南依 2026 年 11 月 15 日當天的移民規則整理，是一般資訊，不是法律意見，也沒有經過律師審核。「積分式定居」等已公布但尚未寫入規則的改革，都單獨標明為提議，不是現行法律。",
    adviser: "情況複雜（例如被拒簽過、有逾期居留或犯罪紀錄、離境時間很長）時，請諮詢在 Immigration Advice Authority（IAA）註冊的移民顧問或律師；具體要求以 GOV.UK 和移民規則為準。",
    topicsNav: "依主題瀏覽", planTitle: "閱讀順序", planLead: "建議先讀第 1 篇，再看適用於你的路線；入籍放在最後。",
    datesTitle: "近期要留意的日期", datesLead: "規則變化以 Home Office 正式公布的移民規則為準。",
    proposed: "提議，尚未生效", otherSection: "工作簽證欄目", notPublished: "這篇指南暫時無法顯示。",
    loading: "正在載入永居指南…", unavailable: "指南暫時無法載入，請稍後再試。", updated: "更新於",
  },
  en: {
    eyebrow: "Settlement and citizenship · ILR", title: "Before you apply for settlement, work out which route you are on.",
    lead: "Settlement requirements differ by visa route. Read in order: routes, days outside the UK, English and documents, then life after ILR and citizenship.",
    note: "Life in UK is an independent information service. It is not part of the UK government or UK Visas and Immigration.",
    noticeTitle: "Before you use these Guides",
    notice: "These Guides reflect the Immigration Rules in force on 15 November 2026. They are general information, not legal advice, and have not been reviewed by a lawyer. Reforms announced but not yet in the rules, such as Earned Settlement, are clearly marked as proposals, not current law.",
    adviser: "If your situation is complicated (for example, a previous refusal, overstaying or a criminal record, or long absences), consult an immigration adviser or lawyer registered with the Immigration Advice Authority (IAA); GOV.UK and the Immigration Rules take precedence.",
    topicsNav: "Browse by topic", planTitle: "Reading order", planLead: "Start with Guide 1, then read the Guide for your route; citizenship comes last.",
    datesTitle: "Dates to watch", datesLead: "Rule changes take effect only through the Immigration Rules published by the Home Office.",
    proposed: "Proposal, not in force", otherSection: "Work visas section", notPublished: "This Guide is not available right now.",
    loading: "Loading settlement Guides…", unavailable: "Guides could not be loaded. Please try again later.", updated: "Updated",
  },
  ur: {
    eyebrow: "مستقل رہائش اور شہریت · ILR", title: "مستقل رہائش کی درخواست سے پہلے معلوم کریں کہ آپ کس راستے پر ہیں۔",
    lead: "مستقل رہائش کی شرائط ویزا راستے کے مطابق مختلف ہیں۔ ترتیب سے پڑھیں: راستے، برطانیہ سے باہر کے دن، انگریزی اور دستاویزات، پھر ILR کے بعد کی زندگی اور شہریت۔",
    note: "Life in UK ایک آزاد معلوماتی سروس ہے، اس کا برطانوی حکومت یا UK Visas and Immigration سے کوئی تعلق نہیں۔",
    noticeTitle: "ان گائیڈز کو استعمال کرنے سے پہلے",
    notice: "یہ گائیڈز 15 نومبر 2026 کو نافذ امیگریشن قواعد پر مبنی ہیں۔ یہ عمومی معلومات ہیں، قانونی مشورہ نہیں، اور کسی وکیل نے ان کا جائزہ نہیں لیا۔ جو اصلاحات اعلان ہو چکی ہیں مگر ابھی قواعد میں شامل نہیں، جیسے Earned Settlement، انہیں واضح طور پر تجاویز کے طور پر نشان زد کیا گیا ہے، موجودہ قانون کے طور پر نہیں۔",
    adviser: "اگر آپ کا معاملہ پیچیدہ ہو (مثلاً پہلے انکار، زائد قیام یا مجرمانہ ریکارڈ، یا طویل غیر حاضری) تو Immigration Advice Authority (IAA) میں رجسٹرڈ امیگریشن مشیر یا وکیل سے مشورہ کریں؛ GOV.UK اور امیگریشن قواعد کو ترجیح حاصل ہے۔",
    topicsNav: "موضوع کے لحاظ سے دیکھیں", planTitle: "پڑھنے کی ترتیب", planLead: "گائیڈ 1 سے شروع کریں، پھر اپنے راستے کی گائیڈ پڑھیں؛ شہریت آخر میں۔",
    datesTitle: "اہم آنے والی تاریخیں", datesLead: "قواعد کی تبدیلیاں صرف ہوم آفس کے شائع کردہ امیگریشن قواعد کے ذریعے نافذ ہوتی ہیں۔",
    proposed: "تجویز، ابھی نافذ نہیں", otherSection: "ورک ویزا سیکشن", notPublished: "یہ گائیڈ ابھی دستیاب نہیں۔",
    loading: "مستقل رہائش کی گائیڈز لوڈ ہو رہی ہیں…", unavailable: "گائیڈز لوڈ نہیں ہو سکیں۔ براہِ کرم بعد میں کوشش کریں۔", updated: "تازہ کاری",
  },
  hi: {
    eyebrow: "स्थायी निवास और नागरिकता · ILR", title: "स्थायी निवास के आवेदन से पहले पता करें कि आप किस रास्ते पर हैं।",
    lead: "स्थायी निवास की शर्तें वीज़ा रास्ते के अनुसार अलग हैं। क्रम से पढ़ें: रास्ते, ब्रिटेन से बाहर के दिन, अंग्रेज़ी और दस्तावेज़, फिर ILR के बाद का जीवन और नागरिकता।",
    note: "Life in UK एक स्वतंत्र सूचना सेवा है; इसका यूके सरकार या UK Visas and Immigration से कोई संबंध नहीं है।",
    noticeTitle: "इन गाइड का इस्तेमाल करने से पहले",
    notice: "ये गाइड 15 नवंबर 2026 को लागू इमिग्रेशन नियमों पर आधारित हैं। ये सामान्य जानकारी हैं, क़ानूनी सलाह नहीं, और किसी वकील ने इनकी समीक्षा नहीं की है। जो सुधार घोषित हो चुके हैं लेकिन अभी नियमों में नहीं हैं, जैसे Earned Settlement, उन्हें स्पष्ट रूप से प्रस्ताव के रूप में चिह्नित किया गया है, मौजूदा क़ानून के रूप में नहीं।",
    adviser: "अगर आपका मामला जटिल है (जैसे पहले अस्वीकृति, अतिरिक्त ठहराव या आपराधिक रिकॉर्ड, या लंबी अनुपस्थिति), तो Immigration Advice Authority (IAA) में पंजीकृत इमिग्रेशन सलाहकार या वकील से सलाह लें; GOV.UK और इमिग्रेशन नियम मान्य होंगे।",
    topicsNav: "विषय के अनुसार देखें", planTitle: "पढ़ने का क्रम", planLead: "गाइड 1 से शुरू करें, फिर अपने रास्ते की गाइड पढ़ें; नागरिकता अंत में।",
    datesTitle: "ध्यान रखने वाली तारीख़ें", datesLead: "नियमों में बदलाव केवल होम ऑफ़िस द्वारा प्रकाशित इमिग्रेशन नियमों से लागू होते हैं।",
    proposed: "प्रस्ताव, अभी लागू नहीं", otherSection: "वर्क वीज़ा खंड", notPublished: "यह गाइड अभी उपलब्ध नहीं है।",
    loading: "स्थायी निवास गाइड लोड हो रही हैं…", unavailable: "गाइड लोड नहीं हो सकीं। कृपया बाद में फिर कोशिश करें।", updated: "अपडेट",
  },
};
