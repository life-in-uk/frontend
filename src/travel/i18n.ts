// Travel page and tool interface text in the five site locales.
//
// zh-CN is the original wording of the travel tools. Provider content is
// never translated here: TfL line names and status text, National Highways
// roads, locations, comments and statuses, National Rail station, operator
// and reason text, OS place names, and provider names are shown as supplied.
import type { GuideLocale } from "../guides/locales.ts";
import type { PlaceType } from "../places/api.ts";
import type { StatusPresentation } from "../underground/presentation.ts";
import type { TravelToolId } from "./tools.ts";

/** Official provider status pages: the fallback whenever live data is not shown. */
export const OFFICIAL_STATUS: Readonly<Record<TravelToolId, { provider: string; href: string }>> = {
  underground: { provider: "Transport for London", href: "https://tfl.gov.uk/tube-dlr-overground/status/" },
  roads: { provider: "National Highways", href: "https://nationalhighways.co.uk/travel-updates/" },
  rail: { provider: "National Rail", href: "https://www.nationalrail.co.uk/status-and-disruptions/" },
};

export type TravelUi = {
  page: {
    title: string;
    lead: string;
    description: string;
    noticeTitle: string;
    notice: string;
    tabs: string;
    loadingTool: (name: string) => string;
    officialTitle: string;
    officialLead: string;
    external: string;
  };
  /** Tab and homepage labels; the provider name is added in English. */
  tools: Record<TravelToolId, { name: string; description: string }>;
  home: { meta: string; open: (name: string) => string };
  common: {
    category: string;
    officialSource: string;
    /** Wraps a UK-time timestamp, e.g. "（英国时间）". */
    ukTime: string;
    staleTitle: (subject: string) => string;
    staleBefore: string;
    staleAfter: (minutes: number) => string;
    invalid: string;
    seeOfficial: (fallback: string) => string;
    notReleased: string;
  };
  underground: {
    title: string;
    loading: string;
    unavailable: string;
    empty: string;
    summary: (affected: number, total: number, unclassified: number) => string;
    details: (line: string) => string;
    labels: Record<StatusPresentation, string>;
    subject: string;
    fallback: string;
    observed: (time: string) => string;
  };
  roads: {
    title: string;
    coverage: string;
    searchLabel: string;
    search: string;
    locate: string;
    blank: string;
    searching: string;
    empty: string;
    invalid: string;
    placesUnavailable: string;
    placesFailed: string;
    results: (count: number) => string;
    placeTypes: Record<PlaceType, string>;
    showingBefore: string;
    showingAfter: string;
    yourLocation: string;
    idleBefore: string;
    idleAfter: string;
    privacy: string;
    unsupported: string;
    locating: string;
    denied: string;
    locationFailed: string;
    tryAgain: string;
    loading: string;
    unavailable: string;
    failed: string;
    subject: string;
    fallback: string;
    none: string;
    found: (count: number, radius: string) => string;
    roadUnknown: string;
    distanceSr: string;
    endPassed: string;
    endTime: string;
    endNotice: string;
    providerStatus: string;
    refresh: string;
    snapshot: (time: string) => string;
    straightLine: string;
    placeSearch: string;
    miles: (value: string) => string;
    underTenth: string;
  };
  /** Released-build Rail panel only; the Rail tool's own text is in railI18n.ts (dev-only). */
  rail: {
    unreleasedTitle: string;
    unreleased: string;
    unreleasedBefore: string;
    unreleasedLink: string;
    unreleasedAfter: string;
  };
};

const ZH_CN: TravelUi = {
  page: {
    title: "交通出行",
    lead: "伦敦地铁线路运行状态、某地附近的高速公路和主干道异常，以及车站列车延误查询。",
    description: "伦敦地铁线路状态与英格兰高速公路、主干道异常，附运营方官方信息链接。",
    noticeTitle: "关于这些信息",
    notice: "每个工具都标明数据来源和观测时间。数据过期或无法获取时不显示运行状态，只提供运营方官方信息链接。出行前请以官方信息为准。",
    tabs: "出行工具",
    loadingTool: (name) => `正在打开${name}工具…`,
    officialTitle: "运营方官方信息",
    officialLead: "实时信息无法显示时，请直接查看运营方官方网站。",
    external: "外部官方网站",
  },
  tools: {
    underground: { name: "伦敦地铁", description: "线路运行状态" },
    roads: { name: "道路", description: "按地点查附近道路异常" },
    rail: { name: "铁路", description: "车站延误查询" },
  },
  home: {
    meta: "点击打开查询工具。数据过期或无法获取时不显示运行状态，并提供运营方官方信息链接。",
    open: (name) => `，打开${name}查询工具`,
  },
  common: {
    category: "出行",
    officialSource: "官方来源",
    ukTime: "（英国时间）",
    staleTitle: (subject) => `暂无最新的${subject}`,
    staleBefore: "最近一次来源数据观测于 ",
    staleAfter: (minutes) => `（英国时间），已超过 ${minutes} 分钟，情况可能已经变化，因此不显示。`,
    invalid: "来源数据缺少有效的观测时间，无法确认是否为最新，因此不显示。",
    seeOfficial: (fallback) => `请查看下方的 ${fallback}。`,
    notReleased: "暂未开放",
  },
  underground: {
    title: "伦敦地铁",
    loading: "正在加载伦敦地铁运行状态…",
    unavailable: "伦敦地铁运行状态暂时无法获取。",
    empty: "这次来源观测中没有包含任何地铁线路的状态信息。",
    summary: (affected, total, unclassified) =>
      [
        affected === 0 ? `${total} 条线路均未报告异常` : `${total} 条线路中有 ${affected} 条报告异常`,
        ...(unclassified > 0 ? [`${unclassified} 条未能分类`] : []),
      ].join(" · "),
    details: (line) => `，查看 ${line} 的详情`,
    labels: { normal: "正常运行", disruption: "有延误或部分中断", severe: "严重中断或停运", unknown: "状态未能分类" },
    subject: "伦敦地铁线路运行状态",
    fallback: "TfL 官方运行状态",
    observed: (time) => `来源观测于 ${time}（英国时间）`,
  },
  roads: {
    title: "附近道路",
    coverage: "附近当前道路异常",
    searchLabel: "搜索邮编、城镇或地点",
    search: "搜索",
    locate: "使用我的位置",
    blank: "请输入邮编、城镇或地点。",
    searching: "正在搜索地点…",
    empty: "没有找到匹配的地点。",
    invalid: "无法使用这个搜索词，请尝试邮编、城镇或地点名称。",
    placesUnavailable: "地点搜索暂时不可用，你仍可以使用当前位置。",
    placesFailed: "地点搜索未能完成。",
    results: (count) => `找到 ${count} 个地点，请选择：`,
    placeTypes: { postcode: "邮编", city: "城市", town: "城镇", village: "村庄", hamlet: "小村", suburb: "城区", settlement: "居民点" },
    showingBefore: "显示",
    showingAfter: "附近的道路",
    yourLocation: "你的当前位置",
    idleBefore: "搜索地点或使用当前位置，查看附近由",
    idleAfter: "报告的道路异常。",
    privacy: "搜索词和位置只用于本次查询，不会被保存。",
    unsupported: "此浏览器无法提供你的位置，你可以改为搜索地点。",
    locating: "正在获取你的位置…",
    denied: "未获得位置权限。你可以改为搜索地点，或在浏览器中允许本网站使用位置后重试。",
    locationFailed: "无法获取你的位置。",
    tryAgain: "重试",
    loading: "正在查询附近的道路异常…",
    unavailable: "道路信息暂时无法获取。",
    failed: "道路信息未能加载。",
    subject: "附近道路异常信息",
    fallback: "National Highways 官方路况",
    none: "附近没有找到 National Highways 报告的当前道路异常。",
    found: (count, radius) => `${radius} 范围内有 ${count} 条道路异常，按距离由近到远排列。`,
    roadUnknown: "未注明道路",
    distanceSr: "直线距离 ",
    endPassed: "原预计结束时间：",
    endTime: "来源结束时间：",
    endNotice: "原预计结束时间已过，来源仍显示为进行中（Active），尚未确认解除。",
    providerStatus: "来源状态：",
    refresh: "重新查询",
    snapshot: (time) => `来源快照时间 ${time}（英国时间）`,
    straightLine: "距离为与所选位置之间的直线距离，不是驾车距离。",
    placeSearch: "地点搜索：",
    miles: (value) => `${value} 英里`,
    underTenth: "不到 0.1 英里",
  },
  rail: {
    unreleasedTitle: "铁路延误查询",
    unreleased: "我们的铁路查询工具还在完成数据授权和使用条件的审核，审核完成前不提供查询，也不显示任何列车信息。",
    unreleasedBefore: "出行前请查看 ",
    unreleasedLink: "官方延误信息",
    unreleasedAfter: "，或联系你的列车运营商。",
  },
};

const ZH_TW: TravelUi = {
  page: {
    title: "交通出行",
    lead: "倫敦地鐵路線營運狀態、某地附近的高速公路和主幹道異常，以及車站列車誤點查詢。",
    description: "倫敦地鐵路線狀態與英格蘭高速公路、主幹道異常，附營運方官方資訊連結。",
    noticeTitle: "關於這些資訊",
    notice: "每個工具都標明資料來源和觀測時間。資料過期或無法取得時不顯示營運狀態，只提供營運方官方資訊連結。出行前請以官方資訊為準。",
    tabs: "出行工具",
    loadingTool: (name) => `正在開啟${name}工具…`,
    officialTitle: "營運方官方資訊",
    officialLead: "即時資訊無法顯示時，請直接查看營運方官方網站。",
    external: "外部官方網站",
  },
  tools: {
    underground: { name: "倫敦地鐵", description: "路線營運狀態" },
    roads: { name: "道路", description: "依地點查附近道路異常" },
    rail: { name: "鐵路", description: "車站誤點查詢" },
  },
  home: {
    meta: "點擊開啟查詢工具。資料過期或無法取得時不顯示營運狀態，並提供營運方官方資訊連結。",
    open: (name) => `，開啟${name}查詢工具`,
  },
  common: {
    category: "出行",
    officialSource: "官方來源",
    ukTime: "（英國時間）",
    staleTitle: (subject) => `暫無最新的${subject}`,
    staleBefore: "最近一次來源資料觀測於 ",
    staleAfter: (minutes) => `（英國時間），已超過 ${minutes} 分鐘，情況可能已經變化，因此不顯示。`,
    invalid: "來源資料缺少有效的觀測時間，無法確認是否為最新，因此不顯示。",
    seeOfficial: (fallback) => `請查看下方的 ${fallback}。`,
    notReleased: "暫未開放",
  },
  underground: {
    title: "倫敦地鐵",
    loading: "正在載入倫敦地鐵營運狀態…",
    unavailable: "倫敦地鐵營運狀態暫時無法取得。",
    empty: "這次來源觀測中沒有包含任何地鐵路線的狀態資訊。",
    summary: (affected, total, unclassified) =>
      [
        affected === 0 ? `${total} 條路線均未回報異常` : `${total} 條路線中有 ${affected} 條回報異常`,
        ...(unclassified > 0 ? [`${unclassified} 條未能分類`] : []),
      ].join(" · "),
    details: (line) => `，查看 ${line} 的詳情`,
    labels: { normal: "正常營運", disruption: "有誤點或部分中斷", severe: "嚴重中斷或停駛", unknown: "狀態未能分類" },
    subject: "倫敦地鐵路線營運狀態",
    fallback: "TfL 官方營運狀態",
    observed: (time) => `來源觀測於 ${time}（英國時間）`,
  },
  roads: {
    title: "附近道路",
    coverage: "附近目前道路異常",
    searchLabel: "搜尋郵遞區號、城鎮或地點",
    search: "搜尋",
    locate: "使用我的位置",
    blank: "請輸入郵遞區號、城鎮或地點。",
    searching: "正在搜尋地點…",
    empty: "沒有找到符合的地點。",
    invalid: "無法使用這個搜尋詞，請嘗試郵遞區號、城鎮或地點名稱。",
    placesUnavailable: "地點搜尋暫時無法使用，你仍可以使用目前位置。",
    placesFailed: "地點搜尋未能完成。",
    results: (count) => `找到 ${count} 個地點，請選擇：`,
    placeTypes: { postcode: "郵遞區號", city: "城市", town: "城鎮", village: "村莊", hamlet: "小村", suburb: "城區", settlement: "聚落" },
    showingBefore: "顯示",
    showingAfter: "附近的道路",
    yourLocation: "你的目前位置",
    idleBefore: "搜尋地點或使用目前位置，查看附近由",
    idleAfter: "回報的道路異常。",
    privacy: "搜尋詞和位置只用於本次查詢，不會被儲存。",
    unsupported: "此瀏覽器無法提供你的位置，你可以改為搜尋地點。",
    locating: "正在取得你的位置…",
    denied: "未取得位置權限。你可以改為搜尋地點，或在瀏覽器中允許本網站使用位置後重試。",
    locationFailed: "無法取得你的位置。",
    tryAgain: "重試",
    loading: "正在查詢附近的道路異常…",
    unavailable: "道路資訊暫時無法取得。",
    failed: "道路資訊未能載入。",
    subject: "附近道路異常資訊",
    fallback: "National Highways 官方路況",
    none: "附近沒有找到 National Highways 回報的目前道路異常。",
    found: (count, radius) => `${radius} 範圍內有 ${count} 條道路異常，依距離由近到遠排列。`,
    roadUnknown: "未註明道路",
    distanceSr: "直線距離 ",
    endPassed: "原預計結束時間：",
    endTime: "來源結束時間：",
    endNotice: "原預計結束時間已過，來源仍顯示為進行中（Active），尚未確認解除。",
    providerStatus: "來源狀態：",
    refresh: "重新查詢",
    snapshot: (time) => `來源快照時間 ${time}（英國時間）`,
    straightLine: "距離為與所選位置之間的直線距離，不是開車距離。",
    placeSearch: "地點搜尋：",
    miles: (value) => `${value} 英里`,
    underTenth: "不到 0.1 英里",
  },
  rail: {
    unreleasedTitle: "鐵路誤點查詢",
    unreleased: "我們的鐵路查詢工具還在完成資料授權和使用條件的審核，審核完成前不提供查詢，也不顯示任何列車資訊。",
    unreleasedBefore: "出行前請查看 ",
    unreleasedLink: "官方誤點資訊",
    unreleasedAfter: "，或聯絡你的列車營運商。",
  },
};

const EN: TravelUi = {
  page: {
    title: "Travel and transport",
    lead: "London Underground line status, motorway and major A-road problems near a place, and delays at a railway station.",
    description: "London Underground line status and motorway and major A-road problems in England, with links to the operators' official information.",
    noticeTitle: "About this information",
    notice: "Each tool shows its data source and when the data was observed. When data is out of date or unavailable, no service status is shown, only a link to the operator's official information. Always check official information before you travel.",
    tabs: "Travel tools",
    loadingTool: (name) => `Opening the ${name} tool…`,
    officialTitle: "Official operator information",
    officialLead: "When live information can't be shown here, use the operator's own website.",
    external: "External official website",
  },
  tools: {
    underground: { name: "London Underground", description: "Line status" },
    roads: { name: "Roads", description: "Road problems near a place" },
    rail: { name: "Rail", description: "Station delay checker" },
  },
  home: {
    meta: "Select a tool to open it. When data is out of date or unavailable, no service status is shown and a link to the operator's official information is given instead.",
    open: (name) => `, open the ${name} tool`,
  },
  common: {
    category: "Travel",
    officialSource: "official source",
    ukTime: " (UK time)",
    staleTitle: (subject) => `No up-to-date ${subject}`,
    staleBefore: "The source data was last observed at ",
    staleAfter: (minutes) => ` (UK time), more than ${minutes} minutes ago. The situation may have changed, so it is not shown.`,
    invalid: "The source data has no valid observation time, so it can't be confirmed as current and is not shown.",
    seeOfficial: (fallback) => `Please check the ${fallback} link below.`,
    notReleased: "Not yet available",
  },
  underground: {
    title: "London Underground",
    loading: "Loading London Underground line status…",
    unavailable: "London Underground line status is temporarily unavailable.",
    empty: "This source observation did not include the status of any Underground line.",
    summary: (affected, total, unclassified) =>
      [
        affected === 0
          ? `No problems reported on ${total} ${total === 1 ? "line" : "lines"}`
          : `${affected} of ${total} ${total === 1 ? "line" : "lines"} reporting problems`,
        ...(unclassified > 0 ? [`${unclassified} not classified`] : []),
      ].join(" · "),
    details: (line) => `, details for ${line}`,
    labels: { normal: "running normally", disruption: "delays or part disruption", severe: "severe disruption or not running", unknown: "status not classified" },
    subject: "London Underground line status",
    fallback: "TfL official status",
    observed: (time) => `Source observed ${time} (UK time)`,
  },
  roads: {
    title: "Roads near you",
    coverage: "current road problems nearby",
    searchLabel: "Search postcode, town or place",
    search: "Search",
    locate: "Use my location",
    blank: "Enter a postcode, town or place.",
    searching: "Searching for places…",
    empty: "No matching place found.",
    invalid: "That search can’t be used. Try a postcode, town or place name.",
    placesUnavailable: "Place search is temporarily unavailable. You can still use your location.",
    placesFailed: "Place search couldn’t be completed.",
    results: (count) => `${count} places found. Choose one:`,
    placeTypes: { postcode: "Postcode", city: "City", town: "Town", village: "Village", hamlet: "Hamlet", suburb: "Suburb", settlement: "Settlement" },
    showingBefore: "Showing roads near",
    showingAfter: "",
    yourLocation: "your current location",
    idleBefore: "Search for a place or use your location to see road problems reported nearby by",
    idleAfter: ".",
    privacy: "Searches and locations are used only for this lookup and are not saved.",
    unsupported: "This browser can’t share your location. You can search for a place instead.",
    locating: "Finding your location…",
    denied: "Location access wasn’t allowed. Search for a place instead, or allow location for this site in your browser and try again.",
    locationFailed: "Your location couldn’t be found.",
    tryAgain: "Try again",
    loading: "Checking nearby road problems…",
    unavailable: "Road information is temporarily unavailable.",
    failed: "Road information couldn’t be loaded.",
    subject: "nearby road information",
    fallback: "National Highways official traffic updates",
    none: "No current road problems reported by National Highways were found nearby.",
    found: (count, radius) => `${count} road ${count === 1 ? "problem" : "problems"} within ${radius}, nearest first.`,
    roadUnknown: "Road not specified",
    distanceSr: "Straight-line distance ",
    endPassed: "Original estimated end: ",
    endTime: "Source end time: ",
    endNotice: "The original estimated end time has passed. The source still shows the event as Active and has not confirmed it has cleared.",
    providerStatus: "Source status: ",
    refresh: "Check again",
    snapshot: (time) => `Source snapshot ${time} (UK time)`,
    straightLine: "Distances are straight-line from the chosen location, not driving distance.",
    placeSearch: "Place search: ",
    miles: (value) => `${value} ${value === "1.0" ? "mile" : "miles"}`,
    underTenth: "Under 0.1 miles",
  },
  rail: {
    unreleasedTitle: "Rail delay checker",
    unreleased: "Our rail checker is still completing its data licence and terms-of-use review. Until that is finished it offers no lookups and shows no train information.",
    unreleasedBefore: "Before you travel, check ",
    unreleasedLink: "official disruption information",
    unreleasedAfter: ", or contact your train operator.",
  },
};

const UR: TravelUi = {
  page: {
    title: "سفر اور ٹرانسپورٹ",
    lead: "لندن انڈرگراؤنڈ لائنوں کی صورتحال، کسی جگہ کے قریب موٹروے اور بڑی سڑکوں کے مسائل، اور ریلوے اسٹیشن پر تاخیر۔",
    description: "لندن انڈرگراؤنڈ لائنوں کی صورتحال اور انگلینڈ میں موٹروے اور بڑی سڑکوں کے مسائل، آپریٹرز کی سرکاری معلومات کے لنکس کے ساتھ۔",
    noticeTitle: "اس معلومات کے بارے میں",
    notice: "ہر ٹول اپنا ڈیٹا کا ذریعہ اور مشاہدے کا وقت دکھاتا ہے۔ جب ڈیٹا پرانا ہو یا دستیاب نہ ہو تو سروس کی کوئی صورتحال نہیں دکھائی جاتی، صرف آپریٹر کی سرکاری معلومات کا لنک دیا جاتا ہے۔ سفر سے پہلے ہمیشہ سرکاری معلومات دیکھیں۔",
    tabs: "سفر کے ٹولز",
    loadingTool: (name) => `${name} کا ٹول کھولا جا رہا ہے…`,
    officialTitle: "آپریٹر کی سرکاری معلومات",
    officialLead: "جب یہاں تازہ معلومات نہ دکھائی جا سکیں تو آپریٹر کی اپنی ویب سائٹ دیکھیں۔",
    external: "بیرونی سرکاری ویب سائٹ",
  },
  tools: {
    underground: { name: "لندن انڈرگراؤنڈ", description: "لائنوں کی صورتحال" },
    roads: { name: "سڑکیں", description: "کسی جگہ کے قریب سڑکوں کے مسائل" },
    rail: { name: "ریل", description: "اسٹیشن پر تاخیر کی جانچ" },
  },
  home: {
    meta: "ٹول کھولنے کے لیے منتخب کریں۔ جب ڈیٹا پرانا ہو یا دستیاب نہ ہو تو سروس کی صورتحال نہیں دکھائی جاتی اور اس کے بجائے آپریٹر کی سرکاری معلومات کا لنک دیا جاتا ہے۔",
    open: (name) => `، ${name} کا ٹول کھولیں`,
  },
  common: {
    category: "سفر",
    officialSource: "سرکاری ذریعہ",
    ukTime: " (برطانوی وقت)",
    staleTitle: (subject) => `${subject} کی تازہ معلومات دستیاب نہیں`,
    staleBefore: "ذریعے کا ڈیٹا آخری بار ",
    staleAfter: (minutes) => ` (برطانوی وقت) کو دیکھا گیا، جو ${minutes} منٹ سے زیادہ پہلے ہے۔ صورتحال بدل چکی ہو سکتی ہے، اس لیے اسے نہیں دکھایا جا رہا۔`,
    invalid: "ذریعے کے ڈیٹا میں مشاہدے کا درست وقت نہیں، اس لیے اس کے تازہ ہونے کی تصدیق نہیں ہو سکتی اور اسے نہیں دکھایا جا رہا۔",
    seeOfficial: (fallback) => `براہ کرم نیچے ${fallback} کا لنک دیکھیں۔`,
    notReleased: "ابھی دستیاب نہیں",
  },
  underground: {
    title: "لندن انڈرگراؤنڈ",
    loading: "لندن انڈرگراؤنڈ لائنوں کی صورتحال لوڈ ہو رہی ہے…",
    unavailable: "لندن انڈرگراؤنڈ لائنوں کی صورتحال عارضی طور پر دستیاب نہیں۔",
    empty: "اس مشاہدے میں کسی انڈرگراؤنڈ لائن کی صورتحال شامل نہیں تھی۔",
    summary: (affected, total, unclassified) =>
      [
        affected === 0 ? `${total} لائنوں پر کوئی مسئلہ رپورٹ نہیں ہوا` : `${total} میں سے ${affected} لائنوں پر مسائل رپورٹ ہوئے`,
        ...(unclassified > 0 ? [`${unclassified} کی درجہ بندی نہیں ہو سکی`] : []),
      ].join(" · "),
    details: (line) => `، ${line} کی تفصیل`,
    labels: { normal: "معمول کے مطابق چل رہی ہے", disruption: "تاخیر یا جزوی رکاوٹ", severe: "شدید رکاوٹ یا بند", unknown: "صورتحال کی درجہ بندی نہیں ہو سکی" },
    subject: "لندن انڈرگراؤنڈ لائنوں کی صورتحال",
    fallback: "TfL کی سرکاری صورتحال",
    observed: (time) => `ذریعے کا مشاہدہ: ${time} (برطانوی وقت)`,
  },
  roads: {
    title: "آپ کے قریب سڑکیں",
    coverage: "قریب کی موجودہ سڑک کے مسائل",
    searchLabel: "پوسٹ کوڈ، قصبہ یا جگہ تلاش کریں",
    search: "تلاش",
    locate: "میرا مقام استعمال کریں",
    blank: "پوسٹ کوڈ، قصبہ یا جگہ درج کریں۔",
    searching: "جگہیں تلاش کی جا رہی ہیں…",
    empty: "کوئی مماثل جگہ نہیں ملی۔",
    invalid: "یہ تلاش استعمال نہیں ہو سکتی۔ پوسٹ کوڈ، قصبے یا جگہ کا نام آزمائیں۔",
    placesUnavailable: "جگہ کی تلاش عارضی طور پر دستیاب نہیں۔ آپ اب بھی اپنا مقام استعمال کر سکتے ہیں۔",
    placesFailed: "جگہ کی تلاش مکمل نہیں ہو سکی۔",
    results: (count) => `${count} جگہیں ملیں۔ ایک منتخب کریں:`,
    placeTypes: { postcode: "پوسٹ کوڈ", city: "شہر", town: "قصبہ", village: "گاؤں", hamlet: "چھوٹا گاؤں", suburb: "مضافاتی علاقہ", settlement: "بستی" },
    showingBefore: "قریبی سڑکیں:",
    showingAfter: "",
    yourLocation: "آپ کا موجودہ مقام",
    idleBefore: "کوئی جگہ تلاش کریں یا اپنا مقام استعمال کریں تاکہ قریب میں",
    idleAfter: "کی طرف سے رپورٹ کیے گئے سڑک کے مسائل دیکھ سکیں۔",
    privacy: "تلاش اور مقام صرف اسی معلومات کے لیے استعمال ہوتے ہیں اور محفوظ نہیں کیے جاتے۔",
    unsupported: "یہ براؤزر آپ کا مقام فراہم نہیں کر سکتا۔ اس کے بجائے آپ جگہ تلاش کر سکتے ہیں۔",
    locating: "آپ کا مقام معلوم کیا جا رہا ہے…",
    denied: "مقام کی اجازت نہیں ملی۔ اس کے بجائے جگہ تلاش کریں، یا براؤزر میں اس سائٹ کے لیے مقام کی اجازت دے کر دوبارہ کوشش کریں۔",
    locationFailed: "آپ کا مقام معلوم نہیں ہو سکا۔",
    tryAgain: "دوبارہ کوشش کریں",
    loading: "قریب کی سڑکوں کے مسائل دیکھے جا رہے ہیں…",
    unavailable: "سڑکوں کی معلومات عارضی طور پر دستیاب نہیں۔",
    failed: "سڑکوں کی معلومات لوڈ نہیں ہو سکیں۔",
    subject: "قریبی سڑکوں",
    fallback: "National Highways کی سرکاری ٹریفک معلومات",
    none: "قریب میں National Highways کی رپورٹ کردہ سڑک کا کوئی موجودہ مسئلہ نہیں ملا۔",
    found: (count, radius) => `${radius} کے اندر سڑک کے ${count} مسائل، قریب ترین پہلے۔`,
    roadUnknown: "سڑک کی وضاحت نہیں",
    distanceSr: "سیدھی لکیر میں فاصلہ ",
    endPassed: "اصل متوقع اختتام: ",
    endTime: "ذریعے کے مطابق اختتامی وقت: ",
    endNotice: "اصل متوقع اختتامی وقت گزر چکا ہے۔ ذریعہ اب بھی اسے جاری (Active) دکھا رہا ہے اور اس کے ختم ہونے کی تصدیق نہیں ہوئی۔",
    providerStatus: "ذریعے کی صورتحال: ",
    refresh: "دوبارہ دیکھیں",
    snapshot: (time) => `ذریعے کا اسنیپ شاٹ: ${time} (برطانوی وقت)`,
    straightLine: "فاصلے منتخب جگہ سے سیدھی لکیر میں ہیں، گاڑی چلانے کا فاصلہ نہیں۔",
    placeSearch: "جگہ کی تلاش: ",
    miles: (value) => `${value} میل`,
    underTenth: "0.1 میل سے کم",
  },
  rail: {
    unreleasedTitle: "ریل میں تاخیر کی جانچ",
    unreleased: "ہمارا ریل ٹول ابھی ڈیٹا لائسنس اور استعمال کی شرائط کے جائزے سے گزر رہا ہے۔ جائزہ مکمل ہونے تک یہ کوئی تلاش نہیں کرتا اور ٹرینوں کی کوئی معلومات نہیں دکھاتا۔",
    unreleasedBefore: "سفر سے پہلے ",
    unreleasedLink: "کی سرکاری رکاوٹوں کی معلومات",
    unreleasedAfter: " دیکھیں، یا اپنے ٹرین آپریٹر سے رابطہ کریں۔",
  },
};

const HI: TravelUi = {
  page: {
    title: "यात्रा और परिवहन",
    lead: "लंदन अंडरग्राउंड लाइनों की स्थिति, किसी जगह के पास मोटरवे और बड़ी सड़कों की समस्याएँ, और रेलवे स्टेशन पर देरी।",
    description: "लंदन अंडरग्राउंड लाइनों की स्थिति और इंग्लैंड में मोटरवे व बड़ी सड़कों की समस्याएँ, ऑपरेटरों की आधिकारिक जानकारी के लिंक के साथ।",
    noticeTitle: "इस जानकारी के बारे में",
    notice: "हर टूल अपना डेटा स्रोत और अवलोकन का समय दिखाता है। जब डेटा पुराना हो या उपलब्ध न हो, तो सेवा की कोई स्थिति नहीं दिखाई जाती, सिर्फ़ ऑपरेटर की आधिकारिक जानकारी का लिंक दिया जाता है। यात्रा से पहले हमेशा आधिकारिक जानकारी देखें।",
    tabs: "यात्रा टूल",
    loadingTool: (name) => `${name} टूल खोला जा रहा है…`,
    officialTitle: "ऑपरेटर की आधिकारिक जानकारी",
    officialLead: "जब यहाँ लाइव जानकारी नहीं दिखाई जा सके, तो ऑपरेटर की अपनी वेबसाइट देखें।",
    external: "बाहरी आधिकारिक वेबसाइट",
  },
  tools: {
    underground: { name: "लंदन अंडरग्राउंड", description: "लाइनों की स्थिति" },
    roads: { name: "सड़कें", description: "किसी जगह के पास सड़क की समस्याएँ" },
    rail: { name: "रेल", description: "स्टेशन पर देरी की जाँच" },
  },
  home: {
    meta: "टूल खोलने के लिए चुनें। जब डेटा पुराना हो या उपलब्ध न हो, तो सेवा की स्थिति नहीं दिखाई जाती और इसके बजाय ऑपरेटर की आधिकारिक जानकारी का लिंक दिया जाता है।",
    open: (name) => `, ${name} टूल खोलें`,
  },
  common: {
    category: "यात्रा",
    officialSource: "आधिकारिक स्रोत",
    ukTime: " (ब्रिटेन का समय)",
    staleTitle: (subject) => `${subject} की ताज़ा जानकारी उपलब्ध नहीं`,
    staleBefore: "स्रोत का डेटा आख़िरी बार ",
    staleAfter: (minutes) => ` (ब्रिटेन का समय) को देखा गया, जो ${minutes} मिनट से ज़्यादा पहले है। स्थिति बदल चुकी हो सकती है, इसलिए इसे नहीं दिखाया जा रहा।`,
    invalid: "स्रोत के डेटा में अवलोकन का मान्य समय नहीं है, इसलिए इसके ताज़ा होने की पुष्टि नहीं हो सकती और इसे नहीं दिखाया जा रहा।",
    seeOfficial: (fallback) => `कृपया नीचे ${fallback} का लिंक देखें।`,
    notReleased: "अभी उपलब्ध नहीं",
  },
  underground: {
    title: "लंदन अंडरग्राउंड",
    loading: "लंदन अंडरग्राउंड लाइनों की स्थिति लोड हो रही है…",
    unavailable: "लंदन अंडरग्राउंड लाइनों की स्थिति अस्थायी रूप से उपलब्ध नहीं।",
    empty: "इस अवलोकन में किसी अंडरग्राउंड लाइन की स्थिति शामिल नहीं थी।",
    summary: (affected, total, unclassified) =>
      [
        affected === 0 ? `${total} लाइनों पर कोई समस्या रिपोर्ट नहीं हुई` : `${total} में से ${affected} लाइनों पर समस्याएँ रिपोर्ट हुईं`,
        ...(unclassified > 0 ? [`${unclassified} का वर्गीकरण नहीं हो सका`] : []),
      ].join(" · "),
    details: (line) => `, ${line} का विवरण`,
    labels: { normal: "सामान्य रूप से चल रही है", disruption: "देरी या आंशिक रुकावट", severe: "गंभीर रुकावट या बंद", unknown: "स्थिति का वर्गीकरण नहीं हो सका" },
    subject: "लंदन अंडरग्राउंड लाइनों की स्थिति",
    fallback: "TfL की आधिकारिक स्थिति",
    observed: (time) => `स्रोत का अवलोकन: ${time} (ब्रिटेन का समय)`,
  },
  roads: {
    title: "आपके पास की सड़कें",
    coverage: "आसपास की मौजूदा सड़क समस्याएँ",
    searchLabel: "पोस्टकोड, कस्बा या जगह खोजें",
    search: "खोजें",
    locate: "मेरी लोकेशन इस्तेमाल करें",
    blank: "पोस्टकोड, कस्बा या जगह लिखें।",
    searching: "जगहें खोजी जा रही हैं…",
    empty: "कोई मिलती-जुलती जगह नहीं मिली।",
    invalid: "यह खोज इस्तेमाल नहीं की जा सकती। पोस्टकोड, कस्बे या जगह का नाम आज़माएँ।",
    placesUnavailable: "जगह की खोज अस्थायी रूप से उपलब्ध नहीं। आप अब भी अपनी लोकेशन इस्तेमाल कर सकते हैं।",
    placesFailed: "जगह की खोज पूरी नहीं हो सकी।",
    results: (count) => `${count} जगहें मिलीं। एक चुनें:`,
    placeTypes: { postcode: "पोस्टकोड", city: "शहर", town: "कस्बा", village: "गाँव", hamlet: "छोटा गाँव", suburb: "उपनगर", settlement: "बस्ती" },
    showingBefore: "पास की सड़कें:",
    showingAfter: "",
    yourLocation: "आपकी मौजूदा लोकेशन",
    idleBefore: "कोई जगह खोजें या अपनी लोकेशन इस्तेमाल करें, ताकि आसपास",
    idleAfter: "द्वारा रिपोर्ट की गई सड़क समस्याएँ देख सकें।",
    privacy: "खोज और लोकेशन सिर्फ़ इसी जानकारी के लिए इस्तेमाल होते हैं और सहेजे नहीं जाते।",
    unsupported: "यह ब्राउज़र आपकी लोकेशन नहीं दे सकता। इसके बजाय आप जगह खोज सकते हैं।",
    locating: "आपकी लोकेशन पता की जा रही है…",
    denied: "लोकेशन की अनुमति नहीं मिली। इसके बजाय जगह खोजें, या ब्राउज़र में इस साइट के लिए लोकेशन की अनुमति देकर फिर कोशिश करें।",
    locationFailed: "आपकी लोकेशन पता नहीं चल सकी।",
    tryAgain: "फिर कोशिश करें",
    loading: "आसपास की सड़क समस्याएँ देखी जा रही हैं…",
    unavailable: "सड़क की जानकारी अस्थायी रूप से उपलब्ध नहीं।",
    failed: "सड़क की जानकारी लोड नहीं हो सकी।",
    subject: "आसपास की सड़कों",
    fallback: "National Highways की आधिकारिक ट्रैफ़िक जानकारी",
    none: "आसपास National Highways द्वारा रिपोर्ट की गई कोई मौजूदा सड़क समस्या नहीं मिली।",
    found: (count, radius) => `${radius} के भीतर सड़क की ${count} समस्याएँ, सबसे नज़दीकी पहले।`,
    roadUnknown: "सड़क का उल्लेख नहीं",
    distanceSr: "सीधी रेखा में दूरी ",
    endPassed: "मूल अनुमानित समाप्ति: ",
    endTime: "स्रोत के अनुसार समाप्ति समय: ",
    endNotice: "मूल अनुमानित समाप्ति समय बीत चुका है। स्रोत अब भी इसे जारी (Active) दिखा रहा है और इसके ख़त्म होने की पुष्टि नहीं हुई है।",
    providerStatus: "स्रोत की स्थिति: ",
    refresh: "फिर से जाँचें",
    snapshot: (time) => `स्रोत स्नैपशॉट: ${time} (ब्रिटेन का समय)`,
    straightLine: "दूरियाँ चुनी गई जगह से सीधी रेखा में हैं, गाड़ी चलाने की दूरी नहीं।",
    placeSearch: "जगह की खोज: ",
    miles: (value) => `${value} मील`,
    underTenth: "0.1 मील से कम",
  },
  rail: {
    unreleasedTitle: "रेल देरी जाँच",
    unreleased: "हमारा रेल टूल अभी डेटा लाइसेंस और उपयोग की शर्तों की समीक्षा पूरी कर रहा है। समीक्षा पूरी होने तक यह कोई खोज नहीं करता और ट्रेनों की कोई जानकारी नहीं दिखाता।",
    unreleasedBefore: "यात्रा से पहले ",
    unreleasedLink: "की आधिकारिक रुकावट जानकारी",
    unreleasedAfter: " देखें, या अपने ट्रेन ऑपरेटर से संपर्क करें।",
  },
};

export const TRAVEL_UI: Readonly<Record<GuideLocale, TravelUi>> = {
  "zh-CN": ZH_CN,
  "zh-TW": ZH_TW,
  en: EN,
  ur: UR,
  hi: HI,
};
