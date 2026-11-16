// Shared site interface text (header, footer, home page, not-found) for the
// five supported locales. Page chrome only: Guide titles, summaries and
// articles always come from the Guide API and are never translated here.
// The zh-CN strings are the original site wording.

import type { GuideLocale } from "./locales.ts";
import type { NavGroupId } from "../home/topics.ts";

type TopicCopy = { title: string; description: string };
type TrustPoint = { title: string; text: string };

export type SiteUi = {
  skipLink: string;
  tagline: string;
  homeTitle: string;
  mainNav: string;
  comingSoon: string;
  comingSoonSr: string;
  searchLabel: string;
  about: string;
  /** Header menu button on narrow screens. */
  menu: string;
  /** Header menu labels, one per navigation group. */
  navGroups: Record<NavGroupId, string>;
  /** Label for a Guide shown in Simplified Chinese because it has no translation yet. Empty for zh-CN. */
  fallbackBadge: string;
  /** Explains Simplified Chinese fallbacks on translated pages. Empty for zh-CN. */
  translationNotice: string;
  topics: Record<string, TopicCopy>;
  footer: {
    note: string;
    nav: string;
    topics: string;
    about: string;
    sources: string;
    official: string;
    nhs111Note: string;
    independence: string;
  };
  notFound: { title: string; text: string; home: string };
  hero: { eyebrow: string; eyebrowLang: string; title: [string, string]; lead: [string, string] };
  search: {
    form: string;
    input: string;
    placeholder: string;
    button: string;
    tryLabel: string;
    suggestions: readonly string[];
    loading: string;
    error: string;
    none: (query: string) => string;
    found: (count: number) => string;
    guide: string;
    answer: string;
    emptyBefore: string;
    emptyBetween: string;
    emptyAfter: string;
  };
  topicGrid: {
    heading: string;
    count: (guides: number, translated: number, questions: number) => string;
  };
  holidays: {
    title: string;
    loading: string;
    unavailable: string;
    none: string;
    next: string;
    all: string;
    source: string;
    observed: string;
    ukTime: string;
  };
  /** Homepage travel panel heading; tool text lives in src/travel/i18n.ts. */
  transport: { title: string };
  featured: { title: string; text: string; more: string; error: string; empty: string; meta: string };
  index: { title: string; text: string; all: (label: string, total: number) => string };
  questions: { title: string; text: string; healthNote: string; moneyNote: string; enter: (label: string) => string };
  trust: { title: string; intro: string; points: [TrustPoint, TrustPoint, TrustPoint, TrustPoint] };
};

export const SITE_UI: Record<GuideLocale, SiteUi> = {
  "zh-CN": {
    skipLink: "跳至主要内容",
    tagline: "在英国，把日子过明白。",
    homeTitle: "Life in UK · 在英国，把日子过明白。",
    mainNav: "主导航",
    comingSoon: "即将推出",
    comingSoonSr: "（即将推出）",
    searchLabel: "搜索指南和问题",
    about: "关于我们",
    menu: "菜单",
    navGroups: { visas: "签证与移民", housing: "住房与日常生活", "health-education": "健康与教育", "work-finance": "工作与财务", transport: "交通与出行" },
    fallbackBadge: "",
    translationNotice: "",
    topics: {
      health: { title: "健康与 NHS", description: "看病、注册 GP、看牙、处方药等 NHS 实用信息。" },
      money: { title: "金钱与财务", description: "开第一个银行账户、存款保障、查找或申请 National Insurance number 等常见问题。" },
      "family-visa": { title: "签证与家庭", description: "配偶/伴侣签证的路线、收入和关系要求，以及按你情况生成的材料清单。" },
      "work-visa": { title: "工作签证", description: "技术工人签证：雇主担保、职业和工资要求、家属、换工作和永居。" },
      settlement: { title: "永居与入籍", description: "永居（ILR）各路线的条件、离境天数、英语和材料，拿到永居以后，以及入籍；改革方案单独标明。" },
      education: { title: "教育与学习", description: "学校申请、大学与学生生活等内容正在规划中。" },
      renting: { title: "租房与入住", description: "在英格兰通过中介租房：找房看房、审查和担保人、定金押金和费用、签约前检查，以及分步骤的租房清单。" },
      "daily-life": { title: "日常生活", description: "账单与通信等内容正在规划中。" },
      travel: { title: "出行与交通", description: "伦敦地铁线路状态与附近道路异常查询，附运营方官方信息链接。" },
    },
    footer: {
      note: "面向在英国生活的中文读者的独立信息服务。内容依据英国官方及一手公开来源整理，仅供参考，不能替代医生、律师或持牌顾问的专业意见。",
      nav: "页脚导航",
      topics: "主题",
      about: "关于",
      sources: "内容来源与核对",
      official: "官方渠道",
      nhs111Note: "（非紧急医疗求助）",
      independence: "独立的中文生活信息服务，与 NHS 及英国政府无隶属关系。",
    },
    notFound: { title: "页面不存在", text: "这个地址没有对应的页面。", home: "回到首页" },
    hero: {
      eyebrow: "UK LIFE GUIDE FOR CHINESE SPEAKERS",
      eyebrowLang: "en",
      title: ["在英国生活、工作、", "学习的实用指南"],
      lead: ["真实、可靠、易懂的英国生活信息，帮助你解决实际问题。", "每篇指南都附上英国官方及一手来源，写明适用地区和更新日期。"],
    },
    search: {
      form: "站内搜索",
      input: "搜索指南和常见问题",
      placeholder: "输入你关心的问题，例如：怎么注册 GP、银行开户",
      button: "搜索",
      tryLabel: "试试搜索：",
      suggestions: ["银行开户", "注册 GP", "牙疼", "处方药", "父母探亲"],
      loading: "正在加载可搜索的内容…",
      error: "搜索暂时不可用，请直接浏览下面的主题。",
      none: (query) => `没有找到与“${query}”相关的已发布内容。`,
      found: (count) => `找到 ${count} 条相关内容`,
      guide: "指南",
      answer: "快速解答",
      emptyBefore: "换个说法试试，或浏览",
      emptyBetween: "、",
      emptyAfter: "。",
    },
    topicGrid: {
      heading: "按主题浏览",
      count: (guides, _translated, questions) =>
        [guides > 0 && `${guides} 篇指南`, questions > 0 && `${questions} 条解答`].filter(Boolean).join(" · "),
    },
    holidays: {
      title: "英国公共假期",
      loading: "正在加载英格兰和威尔士的银行假日…",
      unavailable: "银行假日信息暂时无法加载，请稍后再试，或查看 GOV.UK 官方原文。",
      none: "当前来源数据中没有今天或之后的英格兰和威尔士银行假日，请查看 GOV.UK 官方原文。",
      next: "下一个银行假日：",
      all: "查看全年假期",
      source: "来源：",
      observed: " · 来源观测于 ",
      ukTime: "（英国时间）",
    },
    transport: {
      title: "交通出行信息",
    },
    featured: {
      title: "精选指南",
      text: "从最常见、最实用的问题开始，快速了解在英国生活的关键事项。",
      more: "查看更多指南",
      error: "指南列表暂时无法加载，请稍后再试，或从上方主题进入。",
      empty: "指南正在编写和核对中，发布后会显示在这里。",
      meta: "完整指南 · 更新于",
    },
    index: { title: "更多指南", text: "最近更新的已发布指南。", all: (label, total) => `${label}：全部 ${total} 篇指南` },
    questions: {
      title: "从这些问题开始",
      text: "刚到英国时常遇到的问题，点开直接看对应的指南或简短回答。",
      healthNote: "指向完整指南",
      moneyNote: "简短回答，可查看依据",
      enter: (label) => `进入${label}`,
    },
    trust: {
      title: "关于 Life in UK：为什么可以参考",
      intro: "面向在英国生活的中文读者，把官方信息讲清楚。我们这样整理内容：",
      points: [
        { title: "依据官方和一手来源", text: "每篇指南都列出所依据的来源，例如 GOV.UK、NHS、金融监管机构，以及银行自己公布的条件；关键说法可以逐条查看依据。" },
        { title: "写清适用地区", text: "英国四个地区的规定常常不同。健康与 NHS 指南目前针对英格兰；苏格兰、威尔士和北爱尔兰可能不一样。" },
        { title: "标明日期，依据变了先撤下", text: "每篇指南都标明更新日期。快速解答所引用的依据如果发生变化，会先停止显示，直到重新核对。" },
        { title: "独立、不替代专业意见", text: "Life in UK 与 NHS、英国政府及任何银行均无隶属关系。内容仅供参考，具体情况请咨询医生、律师或持牌顾问。" },
      ],
    },
  },
  "zh-TW": {
    skipLink: "跳至主要內容",
    tagline: "在英國，把日子過明白。",
    homeTitle: "Life in UK · 在英國，把日子過明白。",
    mainNav: "主導覽",
    comingSoon: "即將推出",
    comingSoonSr: "（即將推出）",
    searchLabel: "搜尋指南和問題",
    about: "關於我們",
    menu: "選單",
    navGroups: { visas: "簽證與移民", housing: "住房與日常生活", "health-education": "健康與教育", "work-finance": "工作與財務", transport: "交通與出行" },
    fallbackBadge: "尚未翻譯 · 簡體中文",
    translationNotice: "指南由簡體中文原文翻譯而來。尚未翻譯的內容會標示「尚未翻譯」並開啟簡體中文原文。",
    topics: {
      health: { title: "健康與 NHS", description: "看病、註冊 GP、看牙、處方藥等 NHS 實用資訊。" },
      money: { title: "金錢與財務", description: "開第一個銀行帳戶、存款保障、查找或申請 National Insurance number 等常見問題。" },
      "family-visa": { title: "簽證與家庭", description: "配偶／伴侶簽證的路線、收入和關係要求，以及依你的情況產生的材料清單。" },
      "work-visa": { title: "工作簽證", description: "技術工人簽證：僱主擔保、職業和薪資要求、家屬、換工作和永居。" },
      settlement: { title: "永居與入籍", description: "永居（ILR）各路線的條件、離境天數、英語和材料，拿到永居以後，以及入籍；改革方案單獨標明。" },
      education: { title: "教育與學習", description: "學校申請、大學與學生生活等內容正在規劃中。" },
      renting: { title: "租房與入住", description: "在英格蘭透過仲介租房：找房看房、審查和擔保人、定金押金和費用、簽約前檢查，以及分步驟的租房清單。" },
      "daily-life": { title: "日常生活", description: "帳單與通訊等內容正在規劃中。" },
      travel: { title: "出行與交通", description: "倫敦地鐵路線狀態與附近道路異常查詢，附營運方官方資訊連結。" },
    },
    footer: {
      note: "面向在英國生活的中文讀者的獨立資訊服務。內容依據英國官方及第一手公開來源整理，僅供參考，不能取代醫師、律師或持牌顧問的專業意見。",
      nav: "頁尾導覽",
      topics: "主題",
      about: "關於",
      sources: "內容來源與核對",
      official: "官方管道",
      nhs111Note: "（非緊急醫療求助）",
      independence: "獨立的中文生活資訊服務，與 NHS 及英國政府無隸屬關係。",
    },
    notFound: { title: "頁面不存在", text: "這個網址沒有對應的頁面。", home: "回到首頁" },
    hero: {
      eyebrow: "UK LIFE GUIDE FOR CHINESE SPEAKERS",
      eyebrowLang: "en",
      title: ["在英國生活、工作、", "學習的實用指南"],
      lead: ["真實、可靠、易懂的英國生活資訊，幫助你解決實際問題。", "每篇指南都附上英國官方及第一手來源，寫明適用地區和更新日期。"],
    },
    search: {
      form: "站內搜尋",
      input: "搜尋指南和常見問題",
      placeholder: "輸入你關心的問題，例如：怎麼註冊 GP、地址證明",
      button: "搜尋",
      tryLabel: "試試搜尋：",
      suggestions: ["註冊 GP", "地址證明", "口譯"],
      loading: "正在載入可搜尋的內容…",
      error: "搜尋暫時無法使用，請直接瀏覽下面的主題。",
      none: (query) => `找不到與「${query}」相關的已發布內容。`,
      found: (count) => `找到 ${count} 筆相關內容`,
      guide: "指南",
      answer: "快速解答",
      emptyBefore: "換個說法試試，或瀏覽",
      emptyBetween: "、",
      emptyAfter: "。",
    },
    topicGrid: {
      heading: "依主題瀏覽",
      count: (guides, translated) =>
        guides === 0 ? "" : translated === guides ? `${guides} 篇指南` : `${guides} 篇指南 · ${translated} 篇有繁體中文`,
    },
    holidays: {
      title: "英國公眾假期",
      loading: "正在載入英格蘭和威爾斯的銀行假日…",
      unavailable: "銀行假日資訊暫時無法載入，請稍後再試，或查看 GOV.UK 官方原文。",
      none: "目前來源資料中沒有今天或之後的英格蘭和威爾斯銀行假日，請查看 GOV.UK 官方原文。",
      next: "下一個銀行假日：",
      all: "查看全年假期",
      source: "來源：",
      observed: " · 來源觀測於 ",
      ukTime: "（英國時間）",
    },
    transport: {
      title: "交通出行資訊",
    },
    featured: {
      title: "精選指南",
      text: "從最常見、最實用的問題開始，快速了解在英國生活的關鍵事項。",
      more: "查看更多指南",
      error: "指南列表暫時無法載入，請稍後再試，或從上方主題進入。",
      empty: "指南正在撰寫和核對中，發布後會顯示在這裡。",
      meta: "完整指南 · 更新於",
    },
    index: { title: "更多指南", text: "最近更新的已發布指南。", all: (label, total) => `${label}：全部 ${total} 篇指南` },
    questions: {
      title: "從這些問題開始",
      text: "剛到英國時常遇到的問題，點開直接看對應的指南或簡短回答。",
      healthNote: "指向完整指南",
      moneyNote: "簡短回答，可查看依據",
      enter: (label) => `進入${label}`,
    },
    trust: {
      title: "關於 Life in UK：為什麼可以參考",
      intro: "面向在英國生活的中文讀者，把官方資訊講清楚。我們這樣整理內容：",
      points: [
        { title: "依據官方和第一手來源", text: "每篇指南都列出所依據的來源，例如 GOV.UK、NHS、金融監管機構，以及銀行自己公布的條件；關鍵說法可以逐條查看依據。" },
        { title: "寫清適用地區", text: "英國四個地區的規定常常不同。健康與 NHS 指南目前針對英格蘭；蘇格蘭、威爾斯和北愛爾蘭可能不一樣。" },
        { title: "標明日期，依據變了先撤下", text: "每篇指南都標明更新日期。快速解答所引用的依據如果發生變化，會先停止顯示，直到重新核對。" },
        { title: "獨立、不取代專業意見", text: "Life in UK 與 NHS、英國政府及任何銀行均無隸屬關係。內容僅供參考，具體情況請諮詢醫師、律師或持牌顧問。" },
      ],
    },
  },
  en: {
    skipLink: "Skip to main content",
    tagline: "Life in the UK, made clear.",
    homeTitle: "Life in UK · Life in the UK, made clear.",
    mainNav: "Main navigation",
    comingSoon: "Coming soon",
    comingSoonSr: " (coming soon)",
    searchLabel: "Search guides and questions",
    about: "About us",
    menu: "Menu",
    navGroups: { visas: "Visas & Immigration", housing: "Housing & Daily Life", "health-education": "Health & Education", "work-finance": "Work & Finance", transport: "Transport & Travel" },
    fallbackBadge: "Not yet translated · Simplified Chinese",
    translationNotice: "Guides are translated from the Simplified Chinese originals. Anything not yet translated is marked “Not yet translated” and opens the Chinese original.",
    topics: {
      health: { title: "Health and NHS", description: "Practical NHS information: seeing a doctor, registering with a GP, dentists and prescriptions." },
      money: { title: "Money and finance", description: "Common questions such as opening your first bank account, how your savings are protected, and finding or applying for a National Insurance number." },
      "family-visa": { title: "Visas and family", description: "Spouse and partner visa routes, income and relationship requirements, and a document checklist built for your situation." },
      "work-visa": { title: "Work visas", description: "The Skilled Worker visa: employer sponsorship, occupation and salary rules, family members, changing jobs and settlement." },
      settlement: { title: "Settlement and citizenship", description: "Indefinite leave to remain on each route, days outside the UK, English and documents, life after ILR, and citizenship; reform proposals are clearly marked." },
      education: { title: "Education and study", description: "Content on school applications, university and student life is being planned." },
      renting: { title: "Renting and moving in", description: "Renting through a letting agent in England: finding and viewing, checks and guarantors, deposits and fees, what to check before signing, and a step-by-step renting checklist." },
      "daily-life": { title: "Daily life", description: "Content on bills, phone and internet is being planned." },
      travel: { title: "Travel and transport", description: "London Underground line status and nearby road problems, with links to official operator information." },
    },
    footer: {
      note: "An independent information service for people living in the UK. Content is based on official UK and primary public sources, is for general information only, and is not a substitute for professional advice from a doctor, lawyer or licensed adviser.",
      nav: "Footer navigation",
      topics: "Topics",
      about: "About",
      sources: "Our sources and checks",
      official: "Official services",
      nhs111Note: " (non-emergency medical help)",
      independence: "An independent information service, not affiliated with the NHS or the UK government.",
    },
    notFound: { title: "Page not found", text: "There is no page at this address.", home: "Back to home" },
    hero: {
      eyebrow: "UK LIFE GUIDE",
      eyebrowLang: "en",
      title: ["Practical guides to living,", "working and studying in the UK"],
      lead: ["Accurate, reliable and easy-to-follow information about life in the UK, to help you deal with real situations.", "Every guide cites official UK and primary sources, and says where it applies and when it was last updated."],
    },
    search: {
      form: "Site search",
      input: "Search guides and common questions",
      placeholder: "Type your question, e.g. register with a GP, NHS number",
      button: "Search",
      tryLabel: "Try:",
      suggestions: ["GP", "NHS number", "proof of address"],
      loading: "Loading searchable content…",
      error: "Search is temporarily unavailable. Please browse the topics below.",
      none: (query) => `No published content found for “${query}”.`,
      found: (count) => (count === 1 ? "1 result" : `${count} results`),
      guide: "Guide",
      answer: "Quick answer",
      emptyBefore: "Try different words, or browse ",
      emptyBetween: " or ",
      emptyAfter: ".",
    },
    topicGrid: {
      heading: "Browse by topic",
      count: (guides, translated) =>
        guides === 0 ? "" : translated === guides ? `${guides} guides` : `${guides} guides · ${translated} in English`,
    },
    holidays: {
      title: "UK bank holidays",
      loading: "Loading bank holidays for England and Wales…",
      unavailable: "Bank holiday information is temporarily unavailable. Please try again later, or check GOV.UK.",
      none: "The source data has no upcoming bank holidays for England and Wales. Please check GOV.UK.",
      next: "Next bank holiday: ",
      all: "See all bank holidays",
      source: "Source: ",
      observed: " · checked ",
      ukTime: " (UK time)",
    },
    transport: {
      title: "Travel information",
    },
    featured: {
      title: "Featured guides",
      text: "Start with the most common and practical questions about life in the UK.",
      more: "More guides",
      error: "The guide list is temporarily unavailable. Please try again later, or start from a topic above.",
      empty: "Guides are being written and checked, and will appear here once published.",
      meta: "Full guide · Updated",
    },
    index: { title: "More guides", text: "Recently updated published guides.", all: (label, total) => `${label}: all ${total} guides` },
    questions: {
      title: "Start with these questions",
      text: "Common questions when you first arrive in the UK. Each one opens the guide or a short answer.",
      healthNote: "Opens the full guide",
      moneyNote: "Short answers with evidence",
      enter: (label) => `Go to ${label}`,
    },
    trust: {
      title: "About Life in UK: why it's a useful reference",
      intro: "We explain official information clearly for people living in the UK. This is how we put our content together:",
      points: [
        { title: "Based on official and primary sources", text: "Every guide lists its sources, such as GOV.UK, the NHS, financial regulators and banks' own published terms, and you can check the evidence for each key statement." },
        { title: "Clear about where it applies", text: "Rules often differ across the UK's four nations. Health and NHS guides currently cover England; Scotland, Wales and Northern Ireland may differ." },
        { title: "Dated, and withdrawn if sources change", text: "Every guide shows when it was updated. If the evidence behind a quick answer changes, the answer is hidden until it has been checked again." },
        { title: "Independent, and not professional advice", text: "Life in UK is not affiliated with the NHS, the UK government or any bank. Content is for general information only; for your own situation, ask a doctor, lawyer or licensed adviser." },
      ],
    },
  },
  ur: {
    skipLink: "مرکزی مواد پر جائیں",
    tagline: "برطانیہ کی زندگی، آسان الفاظ میں۔",
    homeTitle: "Life in UK · برطانیہ کی زندگی، آسان الفاظ میں۔",
    mainNav: "مرکزی نیویگیشن",
    comingSoon: "جلد آ رہا ہے",
    comingSoonSr: " (جلد آ رہا ہے)",
    searchLabel: "رہنمائی اور سوالات تلاش کریں",
    about: "ہمارے بارے میں",
    menu: "مینو",
    navGroups: { visas: "ویزا اور امیگریشن", housing: "رہائش اور روزمرہ زندگی", "health-education": "صحت اور تعلیم", "work-finance": "کام اور مالیات", transport: "ٹرانسپورٹ اور سفر" },
    fallbackBadge: "ابھی ترجمہ نہیں ہوا · سادہ چینی",
    translationNotice: "رہنمائی سادہ چینی اصل سے ترجمہ کی گئی ہے۔ جو حصہ ابھی ترجمہ نہیں ہوا، اس پر \"ابھی ترجمہ نہیں ہوا\" لکھا ہوتا ہے اور وہ چینی اصل کھولتا ہے۔",
    topics: {
      health: { title: "صحت اور NHS", description: "ڈاکٹر کو دکھانا، GP کے ساتھ رجسٹریشن، دانتوں کا علاج اور نسخے کی دوائیں: NHS کی عملی معلومات۔" },
      money: { title: "رقم اور مالیات", description: "پہلا بینک اکاؤنٹ کھولنا، جمع رقم کا تحفظ، National Insurance number تلاش کرنا یا اس کی درخواست، اور ایسے دوسرے عام سوالات۔" },
      "family-visa": { title: "ویزا اور خاندان", description: "شریکِ حیات اور پارٹنر ویزا کے راستے، آمدنی اور رشتے کی شرائط، اور آپ کی صورتحال کے مطابق کاغذات کی فہرست۔" },
      "work-visa": { title: "ورک ویزا", description: "اسکلڈ ورکر ویزا: آجر کی اسپانسرشپ، پیشے اور تنخواہ کے تقاضے، اہلِ خانہ، ملازمت کی تبدیلی اور مستقل رہائش۔" },
      settlement: { title: "مستقل رہائش اور شہریت", description: "ہر راستے پر مستقل رہائش (ILR) کی شرائط، برطانیہ سے باہر کے دن، انگریزی اور دستاویزات، ILR کے بعد کی زندگی، اور شہریت؛ اصلاحاتی تجاویز الگ سے نشان زد ہیں۔" },
      education: { title: "تعلیم", description: "اسکول میں داخلے، یونیورسٹی اور طلبہ کی زندگی سے متعلق مواد کی منصوبہ بندی ہو رہی ہے۔" },
      renting: { title: "کرایہ داری اور منتقلی", description: "انگلینڈ میں لیٹنگ ایجنٹ کے ذریعے کرایہ داری: گھر تلاش کرنا اور دیکھنا، جانچ اور ضامن، ڈپازٹ اور فیسیں، دستخط سے پہلے کیا دیکھیں، اور مرحلہ وار کرایہ داری چیک لسٹ۔" },
      "daily-life": { title: "روزمرہ زندگی", description: "بل اور فون و انٹرنیٹ سے متعلق مواد کی منصوبہ بندی ہو رہی ہے۔" },
      travel: { title: "سفر اور ٹرانسپورٹ", description: "لندن انڈرگراؤنڈ لائنوں کی صورتحال اور قریب کی سڑکوں کے مسائل، آپریٹرز کی سرکاری معلومات کے لنکس کے ساتھ۔" },
    },
    footer: {
      note: "برطانیہ میں رہنے والوں کے لیے ایک آزاد معلوماتی سروس۔ مواد برطانیہ کے سرکاری اور بنیادی عوامی ذرائع پر مبنی ہے، صرف عام معلومات کے لیے ہے، اور ڈاکٹر، وکیل یا لائسنس یافتہ مشیر کے پیشہ ورانہ مشورے کا متبادل نہیں۔",
      nav: "فوٹر نیویگیشن",
      topics: "موضوعات",
      about: "تعارف",
      sources: "ہمارے ذرائع اور جانچ",
      official: "سرکاری خدمات",
      nhs111Note: " (غیر ہنگامی طبی مدد)",
      independence: "ایک آزاد معلوماتی سروس، جس کا NHS یا برطانوی حکومت سے کوئی تعلق نہیں۔",
    },
    notFound: { title: "صفحہ نہیں ملا", text: "اس پتے پر کوئی صفحہ موجود نہیں۔", home: "صفحۂ اول پر واپس جائیں" },
    hero: {
      eyebrow: "برطانیہ میں زندگی کی رہنمائی",
      eyebrowLang: "ur",
      title: ["برطانیہ میں رہنے، کام کرنے", "اور پڑھنے کے لیے عملی رہنمائی"],
      lead: ["برطانیہ کی زندگی کے بارے میں درست، قابلِ اعتماد اور آسان معلومات، تاکہ آپ عملی مسائل حل کر سکیں۔", "ہر رہنمائی کے ساتھ برطانیہ کے سرکاری اور بنیادی ذرائع درج ہیں، اور یہ بھی کہ یہ کہاں لاگو ہوتی ہے اور آخری بار کب تازہ کی گئی۔"],
    },
    search: {
      form: "سائٹ میں تلاش",
      input: "رہنمائی اور عام سوالات تلاش کریں",
      placeholder: "اپنا سوال لکھیں، مثلاً: GP رجسٹریشن، NHS نمبر",
      button: "تلاش",
      tryLabel: "یہ تلاش کریں:",
      suggestions: ["GP", "رجسٹریشن", "NHS نمبر"],
      loading: "تلاش کے قابل مواد لوڈ ہو رہا ہے…",
      error: "تلاش فی الحال دستیاب نہیں۔ براہِ کرم نیچے دیے گئے موضوعات دیکھیں۔",
      none: (query) => `"${query}" سے متعلق کوئی شائع شدہ مواد نہیں ملا۔`,
      found: (count) => (count === 1 ? "1 نتیجہ ملا" : `${count} نتائج ملے`),
      guide: "رہنمائی",
      answer: "فوری جواب",
      emptyBefore: "دوسرے الفاظ آزمائیں، یا دیکھیں: ",
      emptyBetween: "، ",
      emptyAfter: "۔",
    },
    topicGrid: {
      heading: "موضوع کے لحاظ سے دیکھیں",
      count: (guides, translated) =>
        guides === 0 ? "" : translated === guides ? `${guides} تحریریں` : `${guides} تحریریں · ${translated} اردو میں`,
    },
    holidays: {
      title: "برطانیہ کی بینک ہالیڈیز",
      loading: "انگلینڈ اور ویلز کی بینک ہالیڈیز لوڈ ہو رہی ہیں…",
      unavailable: "بینک ہالیڈیز کی معلومات فی الحال دستیاب نہیں۔ بعد میں دوبارہ کوشش کریں یا GOV.UK دیکھیں۔",
      none: "ماخذ کے ڈیٹا میں انگلینڈ اور ویلز کی کوئی آنے والی بینک ہالیڈے نہیں۔ براہِ کرم GOV.UK دیکھیں۔",
      next: "اگلی بینک ہالیڈے: ",
      all: "تمام بینک ہالیڈیز دیکھیں",
      source: "ماخذ: ",
      observed: " · جانچ کا وقت ",
      ukTime: " (برطانوی وقت)",
    },
    transport: {
      title: "سفری معلومات",
    },
    featured: {
      title: "منتخب رہنمائی",
      text: "سب سے عام اور کام کے سوالات سے شروع کریں اور برطانیہ کی زندگی کی اہم باتیں جلد سمجھیں۔",
      more: "مزید رہنمائی",
      error: "رہنمائی کی فہرست فی الحال دستیاب نہیں۔ بعد میں کوشش کریں، یا اوپر کسی موضوع سے شروع کریں۔",
      empty: "رہنمائی لکھی اور جانچی جا رہی ہے، شائع ہونے کے بعد یہاں نظر آئے گی۔",
      meta: "مکمل رہنمائی · تازہ کاری",
    },
    index: { title: "مزید رہنمائی", text: "حال ہی میں تازہ کی گئی شائع شدہ رہنمائی۔", all: (label, total) => `${label}: تمام ${total} تحریریں` },
    questions: {
      title: "ان سوالات سے شروع کریں",
      text: "برطانیہ آنے پر عام طور پر پیش آنے والے سوالات۔ ہر سوال پر متعلقہ رہنمائی یا مختصر جواب کھلتا ہے۔",
      healthNote: "مکمل رہنمائی کھلتی ہے",
      moneyNote: "حوالوں کے ساتھ مختصر جوابات",
      enter: (label) => `${label} پر جائیں`,
    },
    trust: {
      title: "Life in UK کے بارے میں: یہ کیوں مفید حوالہ ہے",
      intro: "ہم برطانیہ میں رہنے والوں کے لیے سرکاری معلومات واضح انداز میں پیش کرتے ہیں۔ ہم مواد اس طرح تیار کرتے ہیں:",
      points: [
        { title: "سرکاری اور بنیادی ذرائع پر مبنی", text: "ہر رہنمائی میں اس کے ذرائع درج ہیں، جیسے GOV.UK، NHS، مالیاتی ریگولیٹر اور بینکوں کی اپنی شائع کردہ شرائط؛ ہر اہم بات کا حوالہ الگ سے دیکھا جا سکتا ہے۔" },
        { title: "واضح کہ کہاں لاگو ہوتا ہے", text: "برطانیہ کے چاروں حصوں میں قواعد اکثر مختلف ہوتے ہیں۔ صحت اور NHS کی رہنمائی فی الحال انگلینڈ کے لیے ہے؛ اسکاٹ لینڈ، ویلز اور شمالی آئرلینڈ میں صورتحال مختلف ہو سکتی ہے۔" },
        { title: "تاریخ کے ساتھ، اور ذرائع بدلنے پر ہٹا دیا جاتا ہے", text: "ہر رہنمائی پر تازہ کاری کی تاریخ درج ہے۔ اگر کسی فوری جواب کا حوالہ بدل جائے تو دوبارہ جانچ تک وہ جواب نہیں دکھایا جاتا۔" },
        { title: "آزاد، اور پیشہ ورانہ مشورے کا متبادل نہیں", text: "Life in UK کا NHS، برطانوی حکومت یا کسی بینک سے کوئی تعلق نہیں۔ مواد صرف عام معلومات کے لیے ہے؛ اپنی صورتحال کے لیے ڈاکٹر، وکیل یا لائسنس یافتہ مشیر سے رجوع کریں۔" },
      ],
    },
  },
  hi: {
    skipLink: "मुख्य सामग्री पर जाएँ",
    tagline: "ब्रिटेन की ज़िंदगी, आसान शब्दों में।",
    homeTitle: "Life in UK · ब्रिटेन की ज़िंदगी, आसान शब्दों में।",
    mainNav: "मुख्य नेविगेशन",
    comingSoon: "जल्द आ रहा है",
    comingSoonSr: " (जल्द आ रहा है)",
    searchLabel: "मार्गदर्शिकाएँ और सवाल खोजें",
    about: "हमारे बारे में",
    menu: "मेनू",
    navGroups: { visas: "वीज़ा और आप्रवासन", housing: "आवास और रोज़मर्रा की ज़िंदगी", "health-education": "स्वास्थ्य और शिक्षा", "work-finance": "काम और वित्त", transport: "परिवहन और यात्रा" },
    fallbackBadge: "अभी अनुवाद नहीं हुआ · सरलीकृत चीनी",
    translationNotice: "मार्गदर्शिकाएँ सरलीकृत चीनी मूल से अनूदित हैं। जो हिस्सा अभी अनूदित नहीं है, उस पर \"अभी अनुवाद नहीं हुआ\" लिखा होता है और वह चीनी मूल खोलता है।",
    topics: {
      health: { title: "स्वास्थ्य और NHS", description: "डॉक्टर को दिखाना, GP के साथ रजिस्ट्रेशन, दाँतों का इलाज और पर्चे वाली दवाइयाँ: NHS की काम की जानकारी।" },
      money: { title: "धन और वित्त", description: "पहला बैंक खाता खोलना, जमा राशि की सुरक्षा, National Insurance number ढूँढना या उसके लिए आवेदन करना जैसे आम सवाल।" },
      "family-visa": { title: "वीज़ा और परिवार", description: "पति/पत्नी और पार्टनर वीज़ा के रास्ते, आय और रिश्ते की शर्तें, और आपकी स्थिति के अनुसार दस्तावेज़ों की सूची।" },
      "work-visa": { title: "वर्क वीज़ा", description: "स्किल्ड वर्कर वीज़ा: नियोक्ता प्रायोजन, व्यवसाय और वेतन की शर्तें, परिवार, नौकरी बदलना और स्थायी निवास।" },
      settlement: { title: "स्थायी निवास और नागरिकता", description: "हर रास्ते पर स्थायी निवास (ILR) की शर्तें, ब्रिटेन से बाहर के दिन, अंग्रेज़ी और दस्तावेज़, ILR के बाद का जीवन, और नागरिकता; सुधार प्रस्ताव अलग से चिह्नित हैं।" },
      education: { title: "शिक्षा और पढ़ाई", description: "स्कूल में दाख़िले, यूनिवर्सिटी और छात्र जीवन से जुड़ी सामग्री की योजना बन रही है।" },
      renting: { title: "किराए पर घर और रहने आना", description: "इंग्लैंड में लेटिंग एजेंट के ज़रिए किराए पर घर: खोजना और देखना, जाँच और गारंटर, डिपॉज़िट और फ़ीस, हस्ताक्षर से पहले क्या जाँचें, और चरण-दर-चरण किराया चेकलिस्ट।" },
      "daily-life": { title: "रोज़मर्रा की ज़िंदगी", description: "बिल और फ़ोन-इंटरनेट से जुड़ी सामग्री की योजना बन रही है।" },
      travel: { title: "यात्रा और परिवहन", description: "लंदन अंडरग्राउंड लाइनों की स्थिति और आसपास की सड़क समस्याएँ, ऑपरेटरों की आधिकारिक जानकारी के लिंक के साथ।" },
    },
    footer: {
      note: "ब्रिटेन में रहने वालों के लिए एक स्वतंत्र जानकारी सेवा। सामग्री ब्रिटेन के आधिकारिक और प्राथमिक सार्वजनिक स्रोतों पर आधारित है, केवल सामान्य जानकारी के लिए है, और डॉक्टर, वकील या लाइसेंस प्राप्त सलाहकार की पेशेवर सलाह का विकल्प नहीं है।",
      nav: "फ़ुटर नेविगेशन",
      topics: "विषय",
      about: "परिचय",
      sources: "हमारे स्रोत और जाँच",
      official: "आधिकारिक सेवाएँ",
      nhs111Note: " (ग़ैर-आपातकालीन चिकित्सा सहायता)",
      independence: "एक स्वतंत्र जानकारी सेवा, जिसका NHS या ब्रिटेन सरकार से कोई संबंध नहीं है।",
    },
    notFound: { title: "पेज नहीं मिला", text: "इस पते पर कोई पेज नहीं है।", home: "मुखपृष्ठ पर वापस जाएँ" },
    hero: {
      eyebrow: "ब्रिटेन में जीवन की मार्गदर्शिका",
      eyebrowLang: "hi",
      title: ["ब्रिटेन में रहने, काम करने", "और पढ़ने के लिए काम की मार्गदर्शिकाएँ"],
      lead: ["ब्रिटेन की ज़िंदगी के बारे में सही, भरोसेमंद और आसान जानकारी, ताकि आप असली मुश्किलें सुलझा सकें।", "हर मार्गदर्शिका के साथ ब्रिटेन के आधिकारिक और प्राथमिक स्रोत दिए गए हैं, और यह भी कि वह कहाँ लागू होती है और आख़िरी बार कब अपडेट हुई।"],
    },
    search: {
      form: "साइट में खोजें",
      input: "मार्गदर्शिकाएँ और आम सवाल खोजें",
      placeholder: "अपना सवाल लिखें, जैसे: GP रजिस्ट्रेशन, NHS नंबर",
      button: "खोजें",
      tryLabel: "यह खोजकर देखें:",
      suggestions: ["GP", "रजिस्ट्रेशन", "NHS नंबर"],
      loading: "खोजने लायक सामग्री लोड हो रही है…",
      error: "खोज अभी उपलब्ध नहीं है। कृपया नीचे दिए गए विषय देखें।",
      none: (query) => `"${query}" से जुड़ी कोई प्रकाशित सामग्री नहीं मिली।`,
      found: (count) => (count === 1 ? "1 नतीजा मिला" : `${count} नतीजे मिले`),
      guide: "मार्गदर्शिका",
      answer: "झटपट जवाब",
      emptyBefore: "दूसरे शब्दों में खोजें, या देखें: ",
      emptyBetween: ", ",
      emptyAfter: "।",
    },
    topicGrid: {
      heading: "विषय के अनुसार देखें",
      count: (guides, translated) =>
        guides === 0 ? "" : translated === guides ? `${guides} मार्गदर्शिकाएँ` : `${guides} मार्गदर्शिकाएँ · ${translated} हिन्दी में`,
    },
    holidays: {
      title: "ब्रिटेन की बैंक छुट्टियाँ",
      loading: "इंग्लैंड और वेल्स की बैंक छुट्टियाँ लोड हो रही हैं…",
      unavailable: "बैंक छुट्टियों की जानकारी अभी उपलब्ध नहीं है। बाद में फिर कोशिश करें या GOV.UK देखें।",
      none: "स्रोत डेटा में इंग्लैंड और वेल्स की कोई आने वाली बैंक छुट्टी नहीं है। कृपया GOV.UK देखें।",
      next: "अगली बैंक छुट्टी: ",
      all: "सभी बैंक छुट्टियाँ देखें",
      source: "स्रोत: ",
      observed: " · जाँचा गया ",
      ukTime: " (ब्रिटेन का समय)",
    },
    transport: {
      title: "यात्रा की जानकारी",
    },
    featured: {
      title: "चुनी हुई मार्गदर्शिकाएँ",
      text: "सबसे आम और काम के सवालों से शुरू करें और ब्रिटेन की ज़िंदगी की ज़रूरी बातें जल्दी समझें।",
      more: "और मार्गदर्शिकाएँ",
      error: "मार्गदर्शिकाओं की सूची अभी उपलब्ध नहीं है। बाद में कोशिश करें, या ऊपर किसी विषय से शुरू करें।",
      empty: "मार्गदर्शिकाएँ लिखी और जाँची जा रही हैं, प्रकाशित होने पर यहाँ दिखेंगी।",
      meta: "पूरी मार्गदर्शिका · अपडेट",
    },
    index: { title: "और मार्गदर्शिकाएँ", text: "हाल में अपडेट हुई प्रकाशित मार्गदर्शिकाएँ।", all: (label, total) => `${label}: सभी ${total} मार्गदर्शिकाएँ` },
    questions: {
      title: "इन सवालों से शुरू करें",
      text: "ब्रिटेन आने पर अक्सर आने वाले सवाल। हर सवाल पर उससे जुड़ी मार्गदर्शिका या छोटा जवाब खुलता है।",
      healthNote: "पूरी मार्गदर्शिका खुलती है",
      moneyNote: "आधार के साथ छोटे जवाब",
      enter: (label) => `${label} पर जाएँ`,
    },
    trust: {
      title: "Life in UK के बारे में: यह काम का संदर्भ क्यों है",
      intro: "हम ब्रिटेन में रहने वालों के लिए आधिकारिक जानकारी साफ़-साफ़ समझाते हैं। हम सामग्री ऐसे तैयार करते हैं:",
      points: [
        { title: "आधिकारिक और प्राथमिक स्रोतों पर आधारित", text: "हर मार्गदर्शिका में उसके स्रोत दिए गए हैं, जैसे GOV.UK, NHS, वित्तीय नियामक और बैंकों की अपनी प्रकाशित शर्तें; हर अहम बात का आधार अलग से देखा जा सकता है।" },
        { title: "साफ़ बताया गया कि कहाँ लागू है", text: "ब्रिटेन के चारों हिस्सों में नियम अक्सर अलग होते हैं। स्वास्थ्य और NHS मार्गदर्शिकाएँ अभी इंग्लैंड के लिए हैं; स्कॉटलैंड, वेल्स और उत्तरी आयरलैंड में स्थिति अलग हो सकती है।" },
        { title: "तारीख़ के साथ, और स्रोत बदलने पर हटाया जाता है", text: "हर मार्गदर्शिका पर अपडेट की तारीख़ दी गई है। अगर किसी झटपट जवाब का आधार बदल जाए, तो दोबारा जाँच होने तक वह जवाब नहीं दिखाया जाता।" },
        { title: "स्वतंत्र, और पेशेवर सलाह का विकल्प नहीं", text: "Life in UK का NHS, ब्रिटेन सरकार या किसी बैंक से कोई संबंध नहीं है। सामग्री केवल सामान्य जानकारी के लिए है; अपनी स्थिति के लिए डॉक्टर, वकील या लाइसेंस प्राप्त सलाहकार से पूछें।" },
      ],
    },
  },
};

/** Calendar date ("2026-12-25") with weekday for non-zh-CN pages; zh-CN uses formatHolidayDateZh. */
export function formatHolidayDate(date: string, lang: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(lang, { dateStyle: "full", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}
