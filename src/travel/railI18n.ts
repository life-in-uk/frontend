// Rail disruption checker interface text in the five site locales. Kept out
// of i18n.ts so released builds, which never include the Rail tool, never
// ship its text either (see travel/tools.ts and the production isolation
// test). Station, operator and reason text from National Rail is never
// translated.
import type { GuideLocale } from "../guides/locales.ts";

export type RailUi = {
  title: string;
  subtitle: string;
  station: string;
  stationHint: string;
  stationError: string;
  direction: string;
  dep: string;
  arr: string;
  check: string;
  refresh: string;
  loading: string;
  error: string;
  notConfigured: string;
  empty: string;
  coverage: string;
  unknown: string;
  scheduled: string;
  estimated: string;
  platform: string;
  destination: string;
  origin: string;
  cancelled: string;
  partial: string;
  stops: string;
  stopsUnknown: string;
  delayed: string;
  minutes: string;
  updated: string;
  unknownTime: string;
  repay: string;
  repayInfo: string;
  disclaimerBefore: string;
  disclaimerAfter: string;
  directory: string;
  sources: string;
  notice: string;
};

export const RAIL_UI: Readonly<Record<GuideLocale, RailUi>> = {
  "zh-CN": {
    title: "铁路延误与取消",
    subtitle: "查询车站的列车延误与取消信息。",
    station: "搜索车站",
    stationHint: "请从搜索结果中选择车站。",
    stationError: "车站目录暂不可用，请重试。",
    direction: "车次方向",
    dep: "出发",
    arr: "到达",
    check: "查询延误",
    refresh: "刷新",
    loading: "正在加载铁路信息…",
    error: "铁路信息暂不可用，请稍后重试。",
    notConfigured:
      "本站尚未接入铁路实时数据，因此无法显示任何列车信息。请查看 National Rail 官方延误信息。",
    empty: "当前车站看板中没有报告延误 10 分钟或以上的列车或取消的列车。",
    coverage: "结果仅涵盖车站看板返回的车次，不包括所有列车或全天车次。",
    unknown: "以下数量的列车时间尚未确认，未列入此列表：",
    scheduled: "计划时间",
    estimated: "预计时间",
    platform: "站台",
    destination: "目的地",
    origin: "出发地",
    cancelled: "已取消",
    partial: "部分停站取消",
    stops: "受影响车站",
    stopsUnknown: "暂无受影响车站信息。",
    delayed: "延误",
    minutes: "分钟",
    updated: "数据更新时间",
    unknownTime: "暂无",
    repay: "查询延误赔偿",
    repayInfo:
      "赔偿资格因运营商而异，通常取决于您到达最终目的地的实际延误；预计延误不代表一定有赔偿。",
    disclaimerBefore: "铁路信息来源：",
    disclaimerAfter:
      "。实时信息可能发生变化或存在遗漏。出行前请通过 National Rail 或列车运营商确认最新情况。",
    directory:
      "车站数据：davwheat、Trainline EU 及其来源（ODbL）。仅涵盖大不列颠 National Rail 车站，不包括北爱尔兰铁路。",
    sources: "来源",
    notice: "车站数据声明",
  },
  "zh-TW": {
    title: "鐵路誤點與取消",
    subtitle: "查詢車站的列車誤點與取消資訊。",
    station: "搜尋車站",
    stationHint: "請從搜尋結果中選擇車站。",
    stationError: "車站目錄暫時無法使用，請重試。",
    direction: "車次方向",
    dep: "出發",
    arr: "抵達",
    check: "查詢誤點",
    refresh: "重新整理",
    loading: "正在載入鐵路資訊…",
    error: "鐵路資訊暫時無法使用，請稍後重試。",
    notConfigured:
      "本站尚未接入鐵路即時資料，因此無法顯示任何列車資訊。請查看 National Rail 官方誤點資訊。",
    empty: "目前車站看板中沒有回報誤點 10 分鐘或以上的列車或取消的列車。",
    coverage: "結果僅涵蓋車站看板回傳的車次，不包括所有列車或全天車次。",
    unknown: "以下數量的列車時間尚未確認，未列入此清單：",
    scheduled: "表定時間",
    estimated: "預計時間",
    platform: "月台",
    destination: "目的地",
    origin: "出發地",
    cancelled: "已取消",
    partial: "部分停站取消",
    stops: "受影響車站",
    stopsUnknown: "暫無受影響車站資訊。",
    delayed: "誤點",
    minutes: "分鐘",
    updated: "資料更新時間",
    unknownTime: "暫無",
    repay: "查詢誤點賠償",
    repayInfo:
      "賠償資格因營運商而異，通常取決於您抵達最終目的地的實際誤點；預計誤點不代表一定有賠償。",
    disclaimerBefore: "鐵路資訊來源：",
    disclaimerAfter:
      "。即時資訊可能發生變化或有所遺漏。出行前請透過 National Rail 或列車營運商確認最新情況。",
    directory:
      "車站資料：davwheat、Trainline EU 及其來源（ODbL）。僅涵蓋大不列顛 National Rail 車站，不包括北愛爾蘭鐵路。",
    sources: "來源",
    notice: "車站資料聲明",
  },
  en: {
    title: "Rail disruptions",
    subtitle: "Check for delays and cancellations at your station.",
    station: "Search station",
    stationHint: "Select a station from the search results.",
    stationError: "Station directory unavailable. Please try again.",
    direction: "Board",
    dep: "Departures",
    arr: "Arrivals",
    check: "Check disruptions",
    refresh: "Refresh",
    loading: "Loading rail information…",
    error: "Rail information is unavailable. Please try again later.",
    notConfigured:
      "Live rail data is not connected on this site, so no train information can be shown. Please check National Rail's official disruption information.",
    empty:
      "No reported delays of 10 minutes or more or cancellations in the available station board.",
    coverage:
      "Results cover only the services returned on the station board, not every train or the entire day.",
    unknown:
      "Services have unconfirmed timing and are not included in this list:",
    scheduled: "Scheduled",
    estimated: "Estimated",
    platform: "Platform",
    destination: "To",
    origin: "From",
    cancelled: "Cancelled",
    partial: "Partially cancelled",
    stops: "Affected stops",
    stopsUnknown: "Affected stops are not available.",
    delayed: "Delayed",
    minutes: "min",
    updated: "Data last updated",
    unknownTime: "Unavailable",
    repay: "Check Delay Repay",
    repayInfo:
      "Eligibility varies by operator and normally depends on your actual delay at your final destination; a predicted delay does not guarantee compensation.",
    disclaimerBefore: "Rail information provided by ",
    disclaimerAfter:
      ". Live information may change and may be incomplete. Please confirm your journey with National Rail or your train operator before travelling.",
    directory:
      "Station data: davwheat, Trainline EU and their sources (ODbL). Great Britain National Rail stations; Northern Ireland services are not included.",
    sources: "Sources",
    notice: "Station data notice",
  },
  ur: {
    title: "ریل میں رکاوٹیں",
    subtitle: "اپنے اسٹیشن پر تاخیر اور منسوخی دیکھیں۔",
    station: "اسٹیشن تلاش کریں",
    stationHint: "تلاش کے نتائج میں سے اسٹیشن منتخب کریں۔",
    stationError: "اسٹیشنوں کی فہرست دستیاب نہیں۔ دوبارہ کوشش کریں۔",
    direction: "بورڈ",
    dep: "روانگی",
    arr: "آمد",
    check: "رکاوٹیں دیکھیں",
    refresh: "تازہ کریں",
    loading: "ریل کی معلومات لوڈ ہو رہی ہیں…",
    error: "ریل کی معلومات دستیاب نہیں۔ بعد میں دوبارہ کوشش کریں۔",
    notConfigured:
      "اس سائٹ پر تازہ ریل ڈیٹا منسلک نہیں، اس لیے ٹرینوں کی کوئی معلومات نہیں دکھائی جا سکتی۔ براہ کرم National Rail کی سرکاری معلومات دیکھیں۔",
    empty:
      "دستیاب اسٹیشن بورڈ میں 10 منٹ یا اس سے زیادہ تاخیر یا منسوخی کی کوئی رپورٹ نہیں۔",
    coverage:
      "نتائج میں صرف وہ سروسز شامل ہیں جو اسٹیشن بورڈ پر آئیں، ہر ٹرین یا پورا دن نہیں۔",
    unknown: "ان سروسز کا وقت تصدیق شدہ نہیں اور یہ اس فہرست میں شامل نہیں:",
    scheduled: "مقررہ وقت",
    estimated: "متوقع وقت",
    platform: "پلیٹ فارم",
    destination: "منزل",
    origin: "کہاں سے",
    cancelled: "منسوخ",
    partial: "جزوی طور پر منسوخ",
    stops: "متاثرہ اسٹاپ",
    stopsUnknown: "متاثرہ اسٹاپس کی معلومات دستیاب نہیں۔",
    delayed: "تاخیر",
    minutes: "منٹ",
    updated: "ڈیٹا آخری بار اپ ڈیٹ ہوا",
    unknownTime: "دستیاب نہیں",
    repay: "Delay Repay دیکھیں",
    repayInfo:
      "اہلیت آپریٹر کے لحاظ سے مختلف ہوتی ہے اور عام طور پر آخری منزل پر آپ کی اصل تاخیر پر منحصر ہوتی ہے؛ متوقع تاخیر معاوضے کی ضمانت نہیں۔",
    disclaimerBefore: "ریل کی معلومات کا ذریعہ: ",
    disclaimerAfter:
      "۔ تازہ معلومات بدل سکتی ہیں اور نامکمل ہو سکتی ہیں۔ سفر سے پہلے National Rail یا اپنے ٹرین آپریٹر سے تصدیق کریں۔",
    directory:
      "اسٹیشن ڈیٹا: davwheat، Trainline EU اور ان کے ذرائع (ODbL)۔ صرف برطانیہ عظمیٰ کے National Rail اسٹیشن؛ شمالی آئرلینڈ کی سروسز شامل نہیں۔",
    sources: "ذرائع",
    notice: "اسٹیشن ڈیٹا نوٹس",
  },
  hi: {
    title: "रेल में रुकावटें",
    subtitle: "अपने स्टेशन पर देरी और रद्दीकरण देखें।",
    station: "स्टेशन खोजें",
    stationHint: "खोज परिणामों में से स्टेशन चुनें।",
    stationError: "स्टेशन सूची उपलब्ध नहीं। फिर कोशिश करें।",
    direction: "बोर्ड",
    dep: "प्रस्थान",
    arr: "आगमन",
    check: "रुकावटें देखें",
    refresh: "रीफ़्रेश करें",
    loading: "रेल की जानकारी लोड हो रही है…",
    error: "रेल की जानकारी उपलब्ध नहीं। बाद में फिर कोशिश करें।",
    notConfigured:
      "इस साइट पर लाइव रेल डेटा जुड़ा नहीं है, इसलिए ट्रेनों की कोई जानकारी नहीं दिखाई जा सकती। कृपया National Rail की आधिकारिक जानकारी देखें।",
    empty:
      "उपलब्ध स्टेशन बोर्ड में 10 मिनट या उससे ज़्यादा की देरी या रद्दीकरण की कोई रिपोर्ट नहीं।",
    coverage:
      "परिणामों में सिर्फ़ वे सेवाएँ शामिल हैं जो स्टेशन बोर्ड पर आईं, हर ट्रेन या पूरा दिन नहीं।",
    unknown: "इन सेवाओं का समय पक्का नहीं है और ये इस सूची में शामिल नहीं:",
    scheduled: "निर्धारित समय",
    estimated: "अनुमानित समय",
    platform: "प्लेटफ़ॉर्म",
    destination: "गंतव्य",
    origin: "कहाँ से",
    cancelled: "रद्द",
    partial: "आंशिक रूप से रद्द",
    stops: "प्रभावित स्टॉप",
    stopsUnknown: "प्रभावित स्टॉप की जानकारी उपलब्ध नहीं।",
    delayed: "देरी",
    minutes: "मिनट",
    updated: "डेटा आख़िरी बार अपडेट हुआ",
    unknownTime: "उपलब्ध नहीं",
    repay: "Delay Repay देखें",
    repayInfo:
      "पात्रता ऑपरेटर के अनुसार अलग होती है और आम तौर पर अंतिम गंतव्य पर आपकी असली देरी पर निर्भर करती है; अनुमानित देरी मुआवज़े की गारंटी नहीं है।",
    disclaimerBefore: "रेल की जानकारी का स्रोत: ",
    disclaimerAfter:
      "। लाइव जानकारी बदल सकती है और अधूरी हो सकती है। यात्रा से पहले National Rail या अपने ट्रेन ऑपरेटर से पुष्टि करें।",
    directory:
      "स्टेशन डेटा: davwheat, Trainline EU और उनके स्रोत (ODbL)। सिर्फ़ ग्रेट ब्रिटेन के National Rail स्टेशन; नॉर्दर्न आयरलैंड की सेवाएँ शामिल नहीं।",
    sources: "स्रोत",
    notice: "स्टेशन डेटा सूचना",
  },
};
