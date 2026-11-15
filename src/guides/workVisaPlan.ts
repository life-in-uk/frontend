// Work Visa (Skilled Worker) hub: reading order, topic groups and key dates in
// all five locales. Guide titles and summaries always come from the Guide
// API; the hub links a Guide only when the API lists it as published, so
// nothing here can present an unpublished Guide as available.

import type { GuideLocale } from "./locales.ts";

type Localized = Readonly<Record<GuideLocale, string>>;

export type WorkVisaTopic = {
  id: string;
  title: Localized;
  lead: Localized;
  /** Guide slugs in reading order. */
  slugs: readonly string[];
};

export const WORK_VISA_TOPICS: readonly WorkVisaTopic[] = [
  {
    id: "start",
    title: { "zh-CN": "先看全貌", "zh-TW": "先看全貌", en: "The big picture", ur: "مجموعی تصویر", hi: "पूरी तस्वीर" },
    lead: {
      "zh-CN": "这条签证是什么、要满足哪些条件、申请怎么走。",
      "zh-TW": "這條簽證是什麼、要滿足哪些條件、申請怎麼走。",
      en: "What this visa is, which conditions apply, and how the application works.",
      ur: "یہ ویزا کیا ہے، کون سی شرائط لاگو ہیں، اور درخواست کیسے چلتی ہے۔",
      hi: "यह वीज़ा क्या है, कौन-सी शर्तें लागू हैं, और आवेदन कैसे चलता है।",
    },
    slugs: ["skilled-worker-overview"],
  },
  {
    id: "job",
    title: { "zh-CN": "工作和雇主", "zh-TW": "工作和僱主", en: "Job and employer", ur: "ملازمت اور آجر", hi: "नौकरी और नियोक्ता" },
    lead: {
      "zh-CN": "雇主能不能担保，这份工作和工资够不够格。",
      "zh-TW": "僱主能不能擔保，這份工作和薪資夠不夠格。",
      en: "Whether the employer can sponsor you, and whether the job and salary qualify.",
      ur: "کیا آجر اسپانسر کر سکتا ہے، اور کیا ملازمت اور تنخواہ اہل ہیں۔",
      hi: "क्या नियोक्ता प्रायोजन कर सकता है, और क्या नौकरी और वेतन योग्य हैं।",
    },
    slugs: ["skilled-worker-sponsorship-cos", "skilled-worker-occupations-salary"],
  },
  {
    id: "apply",
    title: { "zh-CN": "准备申请", "zh-TW": "準備申請", en: "Preparing to apply", ur: "درخواست کی تیاری", hi: "आवेदन की तैयारी" },
    lead: {
      "zh-CN": "英语证明和申请材料。",
      "zh-TW": "英語證明和申請材料。",
      en: "English evidence and application documents.",
      ur: "انگریزی کا ثبوت اور درخواست کے کاغذات۔",
      hi: "अंग्रेज़ी का प्रमाण और आवेदन के दस्तावेज़।",
    },
    slugs: ["skilled-worker-english-documents"],
  },
  {
    id: "in-uk",
    title: { "zh-CN": "在英国期间", "zh-TW": "在英國期間", en: "While you are in the UK", ur: "برطانیہ میں قیام کے دوران", hi: "यूके में रहते हुए" },
    lead: {
      "zh-CN": "转签、续签、换雇主，以及工作出现变故时。",
      "zh-TW": "轉簽、續簽、換僱主，以及工作出現變故時。",
      en: "Switching, extending, changing employer, and when a job ends.",
      ur: "ویزا تبدیل کرنا، توسیع، آجر بدلنا، اور جب ملازمت ختم ہو جائے۔",
      hi: "वीज़ा बदलना, बढ़ाना, नियोक्ता बदलना, और जब नौकरी ख़त्म हो जाए।",
    },
    slugs: ["skilled-worker-switch-extend-change-employer", "skilled-worker-job-loss-sponsorship-ends"],
  },
  {
    id: "family",
    title: { "zh-CN": "家人", "zh-TW": "家人", en: "Family", ur: "اہلِ خانہ", hi: "परिवार" },
    lead: {
      "zh-CN": "配偶和孩子能不能一起来。",
      "zh-TW": "配偶和孩子能不能一起來。",
      en: "Whether your partner and children can come with you.",
      ur: "کیا آپ کے شریکِ حیات اور بچے ساتھ آ سکتے ہیں۔",
      hi: "क्या आपके जीवनसाथी और बच्चे साथ आ सकते हैं।",
    },
    slugs: ["skilled-worker-dependants"],
  },
  {
    id: "settle",
    title: { "zh-CN": "长期规划", "zh-TW": "長期規劃", en: "Long-term plans", ur: "طویل مدتی منصوبہ بندی", hi: "दीर्घकालिक योजना" },
    lead: {
      "zh-CN": "永居的现行规则和已公布、尚未生效的改革。",
      "zh-TW": "永居的現行規則和已公布、尚未生效的改革。",
      en: "The current settlement rules, and the announced reform that is not yet in force.",
      ur: "مستقل رہائش کے موجودہ قواعد، اور اعلان کردہ اصلاح جو ابھی نافذ نہیں۔",
      hi: "स्थायी निवास के मौजूदा नियम, और घोषित सुधार जो अभी लागू नहीं है।",
    },
    slugs: ["skilled-worker-settlement-ilr"],
  },
];

/** All Guide slugs in reading order. */
export const WORK_VISA_SLUGS: readonly string[] = WORK_VISA_TOPICS.flatMap((topic) => topic.slugs);

/** Upcoming dates. "proposed" items are announced policy, not law. */
export const WORK_VISA_KEY_DATES: readonly { date: string; proposed: boolean; label: Localized; text: Localized }[] = [
  {
    date: "2026-12-31",
    proposed: false,
    label: { "zh-CN": "2026 年 12 月 31 日", "zh-TW": "2026 年 12 月 31 日", en: "31 December 2026", ur: "31 دسمبر 2026", hi: "31 दिसंबर 2026" },
    text: {
      "zh-CN": "现行临时短缺清单和多数移民工资清单条目到期（CoS 须在此日期前发出）。之后的清单尚未公布。",
      "zh-TW": "現行臨時短缺清單和多數移民薪資清單條目到期（CoS 須在此日期前發出）。之後的清單尚未公布。",
      en: "The current Temporary Shortage List and most Immigration Salary List entries expire (the CoS must be issued before this date). The lists that follow have not been published.",
      ur: "موجودہ Temporary Shortage List اور Immigration Salary List کے زیادہ تر اندراجات ختم ہوں گے (CoS اس تاریخ سے پہلے جاری ہونا چاہیے)۔ بعد کی فہرستیں شائع نہیں ہوئیں۔",
      hi: "मौजूदा Temporary Shortage List और Immigration Salary List की अधिकांश प्रविष्टियाँ समाप्त होंगी (CoS इस तारीख़ से पहले जारी होना चाहिए)। बाद की सूचियाँ प्रकाशित नहीं हुई हैं।",
    },
  },
  {
    date: "2027-01-01",
    proposed: false,
    label: { "zh-CN": "2027 年 1 月 1 日", "zh-TW": "2027 年 1 月 1 日", en: "1 January 2027", ur: "1 جنوری 2027", hi: "1 जनवरी 2027" },
    text: {
      "zh-CN": "此日或之后申请的 Graduate 签证缩短为 18 个月（博士仍为 3 年）。",
      "zh-TW": "此日或之後申請的 Graduate 簽證縮短為 18 個月（博士仍為 3 年）。",
      en: "Graduate visa applications made on or after this date are granted for 18 months (PhD graduates still get 3 years).",
      ur: "اس تاریخ یا اس کے بعد کی Graduate ویزا درخواستیں 18 ماہ کے لیے منظور ہوں گی (PhD والوں کو اب بھی 3 سال)۔",
      hi: "इस तारीख़ या उसके बाद के Graduate वीज़ा आवेदन 18 महीने के लिए मंज़ूर होंगे (PhD वालों को अब भी 3 वर्ष)।",
    },
  },
  {
    date: "2027-03-26",
    proposed: false,
    label: { "zh-CN": "2027 年 3 月 26 日", "zh-TW": "2027 年 3 月 26 日", en: "26 March 2027", ur: "26 مارچ 2027", hi: "26 मार्च 2027" },
    text: {
      "zh-CN": "Skilled Worker 及家属申请永居时，英语要求提高到 B2（已写入移民规则）。",
      "zh-TW": "Skilled Worker 及家屬申請永居時，英語要求提高到 B2（已寫入移民規則）。",
      en: "The English requirement for Skilled Worker and dependant settlement rises to B2 (already in the Immigration Rules).",
      ur: "اسکلڈ ورکر اور زیرِ کفالت افراد کی مستقل رہائش کے لیے انگریزی کا تقاضا B2 ہو جائے گا (امیگریشن قواعد میں شامل)۔",
      hi: "स्किल्ड वर्कर और आश्रितों के स्थायी निवास के लिए अंग्रेज़ी की शर्त B2 होगी (इमिग्रेशन नियमों में शामिल)।",
    },
  },
  {
    date: "pending",
    proposed: true,
    label: { "zh-CN": "日期未定（提议）", "zh-TW": "日期未定（提議）", en: "Date not set (proposal)", ur: "تاریخ طے نہیں (تجویز)", hi: "तारीख़ तय नहीं (प्रस्ताव)" },
    text: {
      "zh-CN": "积分式定居（Earned Settlement）：政府已公布方案，一般年限拟由 5 年改为 10 年，尚未写入移民规则；现行规则仍是 5 年。",
      "zh-TW": "積分式定居（Earned Settlement）：政府已公布方案，一般年限擬由 5 年改為 10 年，尚未寫入移民規則；現行規則仍是 5 年。",
      en: "Earned Settlement: the government has announced a plan to change the default period from 5 to 10 years; it is not yet in the Immigration Rules, and the current rule is still 5 years.",
      ur: "Earned Settlement: حکومت نے عمومی مدت 5 سے 10 سال کرنے کا منصوبہ اعلان کیا ہے؛ یہ ابھی امیگریشن قواعد میں شامل نہیں، اور موجودہ قاعدہ اب بھی 5 سال ہے۔",
      hi: "Earned Settlement: सरकार ने सामान्य अवधि 5 से 10 वर्ष करने की योजना घोषित की है; यह अभी इमिग्रेशन नियमों में नहीं है, और मौजूदा नियम अब भी 5 वर्ष है।",
    },
  },
];

export const WORK_VISA_COPY: Readonly<Record<GuideLocale, {
  eyebrow: string; title: string; lead: string; note: string;
  noticeTitle: string; notice: string; adviser: string;
  topicsNav: string; planTitle: string; planLead: string; datesTitle: string; datesLead: string;
  proposed: string; notPublished: string; loading: string; unavailable: string; read: string; updated: string;
}>> = {
  "zh-CN": {
    eyebrow: "工作签证 · Skilled Worker", title: "在英国工作，先把规则看清楚。",
    lead: "从雇主担保、职业和工资，到家人、换工作和永居，按顺序读懂技术工人签证。",
    note: "Life in UK 是独立的中文生活信息服务，不隶属于英国政府或 UK Visas and Immigration。",
    noticeTitle: "使用前请注意",
    notice: "这些指南按 2026 年 11 月 14 日当天的移民规则整理，是一般信息，不是法律意见，也没有经过律师审核。“积分式定居”等已公布但尚未写入规则的改革，指南里都单独标明为提议。",
    adviser: "情况复杂时，请咨询在 Immigration Advice Authority（IAA）注册的移民顾问或律师；具体要求以 GOV.UK 和移民规则为准。",
    topicsNav: "按主题浏览", planTitle: "阅读顺序", planLead: "建议从第 1 篇读起；已经在英国的，可以直接跳到“在英国期间”。",
    datesTitle: "近期要留意的日期", datesLead: "规则变化以 Home Office 正式公布的移民规则为准。",
    proposed: "提议，尚未生效", notPublished: "这篇指南暂时无法显示。", loading: "正在加载工作签证指南…",
    unavailable: "指南暂时无法加载，请稍后再试。", read: "阅读指南", updated: "更新于",
  },
  "zh-TW": {
    eyebrow: "工作簽證 · Skilled Worker", title: "在英國工作，先把規則看清楚。",
    lead: "從僱主擔保、職業和薪資，到家人、換工作和永居，按順序讀懂技術工人簽證。",
    note: "Life in UK 是獨立的中文生活資訊服務，不隸屬於英國政府或 UK Visas and Immigration。",
    noticeTitle: "使用前請注意",
    notice: "這些指南依 2026 年 11 月 14 日當天的移民規則整理，是一般資訊，不是法律意見，也沒有經過律師審核。「積分式定居」等已公布但尚未寫入規則的改革，指南裡都單獨標明為提議。",
    adviser: "情況複雜時，請諮詢在 Immigration Advice Authority（IAA）註冊的移民顧問或律師；具體要求以 GOV.UK 和移民規則為準。",
    topicsNav: "依主題瀏覽", planTitle: "閱讀順序", planLead: "建議從第 1 篇讀起；已經在英國的，可以直接跳到「在英國期間」。",
    datesTitle: "近期要留意的日期", datesLead: "規則變化以 Home Office 正式公布的移民規則為準。",
    proposed: "提議，尚未生效", notPublished: "這篇指南暫時無法顯示。", loading: "正在載入工作簽證指南…",
    unavailable: "指南暫時無法載入，請稍後再試。", read: "閱讀指南", updated: "更新於",
  },
  en: {
    eyebrow: "Work visas · Skilled Worker", title: "Working in the UK: understand the rules first.",
    lead: "From employer sponsorship, occupations and salary to family, changing jobs and settlement: the Skilled Worker visa, step by step.",
    note: "Life in UK is an independent information service. It is not part of the UK government or UK Visas and Immigration.",
    noticeTitle: "Before you use these Guides",
    notice: "These Guides reflect the Immigration Rules in force on 14 November 2026. They are general information, not legal advice, and have not been reviewed by a lawyer. Reforms that have been announced but are not yet in the rules, such as Earned Settlement, are clearly marked as proposals.",
    adviser: "If your situation is complicated, consult an immigration adviser or lawyer registered with the Immigration Advice Authority (IAA); GOV.UK and the Immigration Rules take precedence.",
    topicsNav: "Browse by topic", planTitle: "Reading order", planLead: "Start with Guide 1; if you are already in the UK, you can jump to \"While you are in the UK\".",
    datesTitle: "Dates to watch", datesLead: "Rule changes take effect only through the Immigration Rules published by the Home Office.",
    proposed: "Proposal, not in force", notPublished: "This Guide is not available right now.", loading: "Loading Work visa Guides…",
    unavailable: "Guides could not be loaded. Please try again later.", read: "Read the Guide", updated: "Updated",
  },
  ur: {
    eyebrow: "ورک ویزا · Skilled Worker", title: "برطانیہ میں کام: پہلے قواعد سمجھیں۔",
    lead: "آجر کی اسپانسرشپ، پیشے اور تنخواہ سے لے کر اہلِ خانہ، ملازمت کی تبدیلی اور مستقل رہائش تک: اسکلڈ ورکر ویزا قدم بہ قدم۔",
    note: "Life in UK ایک آزاد معلوماتی سروس ہے، اس کا برطانوی حکومت یا UK Visas and Immigration سے کوئی تعلق نہیں۔",
    noticeTitle: "ان گائیڈز کو استعمال کرنے سے پہلے",
    notice: "یہ گائیڈز 14 نومبر 2026 کو نافذ امیگریشن قواعد پر مبنی ہیں۔ یہ عمومی معلومات ہیں، قانونی مشورہ نہیں، اور کسی وکیل نے ان کا جائزہ نہیں لیا۔ جو اصلاحات اعلان ہو چکی ہیں مگر ابھی قواعد میں شامل نہیں، جیسے Earned Settlement، انہیں واضح طور پر تجاویز کے طور پر نشان زد کیا گیا ہے۔",
    adviser: "اگر آپ کا معاملہ پیچیدہ ہو تو Immigration Advice Authority (IAA) میں رجسٹرڈ امیگریشن مشیر یا وکیل سے مشورہ کریں؛ GOV.UK اور امیگریشن قواعد کو ترجیح حاصل ہے۔",
    topicsNav: "موضوع کے لحاظ سے دیکھیں", planTitle: "پڑھنے کی ترتیب", planLead: "گائیڈ 1 سے شروع کریں؛ اگر آپ پہلے سے برطانیہ میں ہیں تو \"برطانیہ میں قیام کے دوران\" پر جا سکتے ہیں۔",
    datesTitle: "اہم آنے والی تاریخیں", datesLead: "قواعد کی تبدیلیاں صرف ہوم آفس کے شائع کردہ امیگریشن قواعد کے ذریعے نافذ ہوتی ہیں۔",
    proposed: "تجویز، ابھی نافذ نہیں", notPublished: "یہ گائیڈ ابھی دستیاب نہیں۔", loading: "ورک ویزا گائیڈز لوڈ ہو رہی ہیں…",
    unavailable: "گائیڈز لوڈ نہیں ہو سکیں۔ براہِ کرم بعد میں کوشش کریں۔", read: "گائیڈ پڑھیں", updated: "تازہ کاری",
  },
  hi: {
    eyebrow: "वर्क वीज़ा · Skilled Worker", title: "यूके में काम: पहले नियम समझें।",
    lead: "नियोक्ता प्रायोजन, व्यवसाय और वेतन से लेकर परिवार, नौकरी बदलने और स्थायी निवास तक: स्किल्ड वर्कर वीज़ा क़दम-दर-क़दम।",
    note: "Life in UK एक स्वतंत्र सूचना सेवा है; इसका यूके सरकार या UK Visas and Immigration से कोई संबंध नहीं है।",
    noticeTitle: "इन गाइड का इस्तेमाल करने से पहले",
    notice: "ये गाइड 14 नवंबर 2026 को लागू इमिग्रेशन नियमों पर आधारित हैं। ये सामान्य जानकारी हैं, क़ानूनी सलाह नहीं, और किसी वकील ने इनकी समीक्षा नहीं की है। जो सुधार घोषित हो चुके हैं लेकिन अभी नियमों में नहीं हैं, जैसे Earned Settlement, उन्हें स्पष्ट रूप से प्रस्ताव के रूप में चिह्नित किया गया है।",
    adviser: "अगर आपका मामला जटिल है, तो Immigration Advice Authority (IAA) में पंजीकृत इमिग्रेशन सलाहकार या वकील से सलाह लें; GOV.UK और इमिग्रेशन नियम मान्य होंगे।",
    topicsNav: "विषय के अनुसार देखें", planTitle: "पढ़ने का क्रम", planLead: "गाइड 1 से शुरू करें; अगर आप पहले से यूके में हैं, तो \"यूके में रहते हुए\" पर जा सकते हैं।",
    datesTitle: "ध्यान रखने वाली तारीख़ें", datesLead: "नियमों में बदलाव केवल होम ऑफ़िस द्वारा प्रकाशित इमिग्रेशन नियमों से लागू होते हैं।",
    proposed: "प्रस्ताव, अभी लागू नहीं", notPublished: "यह गाइड अभी उपलब्ध नहीं है।", loading: "वर्क वीज़ा गाइड लोड हो रही हैं…",
    unavailable: "गाइड लोड नहीं हो सकीं। कृपया बाद में फिर कोशिश करें।", read: "गाइड पढ़ें", updated: "अपडेट",
  },
};
