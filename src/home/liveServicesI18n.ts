import type { GuideLocale } from "../guides/locales";
import type { WeatherCity } from "../weather/cities";
import type { WeatherCondition } from "../weather/codes";
import type { CardStatus } from "../markets/present";

/**
 * Homepage "Live Services" section. The headline card is a placeholder until
 * its content is licensed. The index cards show "coming soon" until the backend
 * serves licensed index data (GET /api/market-indices/latest answers 404 until then).
 */
export type LiveServicesUi = {
  title: string;
  subtitle: string;
  comingSoon: string;
  headline: { label: string };
  markets: {
    us: string;
    uk: string;
    /** Badge per card status: the backend's freshness rating, never upgraded. */
    status: Record<CardStatus, string>;
    /** "16:35 UK time": the market time of the value, in UK time. */
    asOf: (time: string) => string;
    /** The licensed source's attribution, shown next to the values. */
    source: (attribution: string) => string;
    /** Accessible name of the change figures. */
    change: string;
  };
  weather: {
    name: string;
    checking: string;
    unavailable: string;
    /** "Met Office forecast for 14:00, issued 11:00 (UK time)": the step's hour and its model run. */
    forecastFor: (time: string, issued: string) => string;
    feelsLike: (temperature: string) => string;
    /** Tooltip of the automatic tag: how the city was chosen. */
    automatic: string;
    /** Short visible tag next to an automatically chosen city (an approximation, not the visitor's position). */
    autoTag: string;
    rainChance: (percent: number) => string;
    cities: Record<WeatherCity, string>;
    conditions: Record<WeatherCondition, string>;
  };
};

export const LIVE_SERVICES_UI: Record<GuideLocale, LiveServicesUi> = {
  "zh-CN": {
    title: "实时服务",
    subtitle: "您的一站式英国实时生活信息中心",
    comingSoon: "即将推出",
    headline: { label: "今日英国头条" },
    markets: {
      us: "美国股指",
      uk: "英国股指",
      status: { open: "开盘中", delayed: "延迟数据", closed: "已收盘", unknown: "市场状态未知", stale: "数据已过时", unavailable: "暂无数据" },
      asOf: (time) => `${time}（英国时间）`,
      source: (attribution) => `数据来源：${attribution}`,
      change: "涨跌",
    },
    weather: {
      name: "天气",
      checking: "正在获取天气…",
      unavailable: "天气暂时无法获取",
      forecastFor: (time, issued) => `Met Office ${time} 预报，${issued} 发布（英国时间）`,
      feelsLike: (temperature) => `体感 ${temperature}`,
      automatic: "自动（离您最近的城市，按网络大致位置）",
      autoTag: "自动",
      rainChance: (percent) => `降水概率 ${percent}%`,
      cities: {
        london: "伦敦",
        birmingham: "伯明翰",
        manchester: "曼彻斯特",
        leeds: "利兹",
        glasgow: "格拉斯哥",
        edinburgh: "爱丁堡",
        cardiff: "加的夫",
        belfast: "贝尔法斯特",
      },
      conditions: {
        traceRain: "零星小雨",
        clear: "晴朗",
        sunny: "晴",
        partlyCloudy: "晴间多云",
        mist: "薄雾",
        fog: "雾",
        cloudy: "多云",
        overcast: "阴",
        lightShowers: "小阵雨",
        drizzle: "毛毛雨",
        lightRain: "小雨",
        heavyShowers: "强阵雨",
        heavyRain: "大雨",
        sleetShowers: "阵性雨夹雪",
        sleet: "雨夹雪",
        hailShowers: "阵性冰雹",
        hail: "冰雹",
        lightSnowShowers: "小阵雪",
        lightSnow: "小雪",
        heavySnowShowers: "强阵雪",
        heavySnow: "大雪",
        thunderShowers: "雷阵雨",
        thunder: "雷暴",
      },
    },
  },
  "zh-TW": {
    title: "即時服務",
    subtitle: "您的一站式英國即時生活資訊中心",
    comingSoon: "即將推出",
    headline: { label: "今日英國頭條" },
    markets: {
      us: "美國股指",
      uk: "英國股指",
      status: { open: "開盤中", delayed: "延遲資料", closed: "已收盤", unknown: "市場狀態未知", stale: "資料已過時", unavailable: "暫無資料" },
      asOf: (time) => `${time}（英國時間）`,
      source: (attribution) => `資料來源：${attribution}`,
      change: "漲跌",
    },
    weather: {
      name: "天氣",
      checking: "正在取得天氣…",
      unavailable: "天氣暫時無法取得",
      forecastFor: (time, issued) => `Met Office ${time} 預報，${issued} 發布（英國時間）`,
      feelsLike: (temperature) => `體感 ${temperature}`,
      automatic: "自動（離您最近的城市，依網路大致位置）",
      autoTag: "自動",
      rainChance: (percent) => `降雨機率 ${percent}%`,
      cities: {
        london: "倫敦",
        birmingham: "伯明罕",
        manchester: "曼徹斯特",
        leeds: "里茲",
        glasgow: "格拉斯哥",
        edinburgh: "愛丁堡",
        cardiff: "卡地夫",
        belfast: "貝爾法斯特",
      },
      conditions: {
        traceRain: "零星小雨",
        clear: "晴朗",
        sunny: "晴",
        partlyCloudy: "晴時多雲",
        mist: "薄霧",
        fog: "霧",
        cloudy: "多雲",
        overcast: "陰",
        lightShowers: "小陣雨",
        drizzle: "毛毛雨",
        lightRain: "小雨",
        heavyShowers: "強陣雨",
        heavyRain: "大雨",
        sleetShowers: "陣性雨夾雪",
        sleet: "雨夾雪",
        hailShowers: "陣性冰雹",
        hail: "冰雹",
        lightSnowShowers: "小陣雪",
        lightSnow: "小雪",
        heavySnowShowers: "強陣雪",
        heavySnow: "大雪",
        thunderShowers: "雷陣雨",
        thunder: "雷暴",
      },
    },
  },
  en: {
    title: "Live Services",
    subtitle: "Your one-stop hub for live UK information.",
    comingSoon: "Coming soon",
    headline: { label: "Today's UK headline" },
    markets: {
      us: "US indices",
      uk: "UK indices",
      status: { open: "Open", delayed: "Delayed", closed: "Closed", unknown: "Status unknown", stale: "Out of date", unavailable: "Unavailable" },
      asOf: (time) => `${time} UK time`,
      source: (attribution) => `Source: ${attribution}`,
      change: "Change",
    },
    weather: {
      name: "Weather",
      checking: "Checking the weather…",
      unavailable: "Weather is unavailable right now",
      forecastFor: (time, issued) => `Met Office forecast for ${time}, issued ${issued} (UK time)`,
      feelsLike: (temperature) => `Feels like ${temperature}`,
      automatic: "Automatic (nearest city to your approximate network location)",
      autoTag: "auto",
      rainChance: (percent) => `${percent}% chance of rain`,
      cities: {
        london: "London",
        birmingham: "Birmingham",
        manchester: "Manchester",
        leeds: "Leeds",
        glasgow: "Glasgow",
        edinburgh: "Edinburgh",
        cardiff: "Cardiff",
        belfast: "Belfast",
      },
      conditions: {
        traceRain: "Trace rain",
        clear: "Clear",
        sunny: "Sunny",
        partlyCloudy: "Partly cloudy",
        mist: "Mist",
        fog: "Fog",
        cloudy: "Cloudy",
        overcast: "Overcast",
        lightShowers: "Light rain showers",
        drizzle: "Drizzle",
        lightRain: "Light rain",
        heavyShowers: "Heavy rain showers",
        heavyRain: "Heavy rain",
        sleetShowers: "Sleet showers",
        sleet: "Sleet",
        hailShowers: "Hail showers",
        hail: "Hail",
        lightSnowShowers: "Light snow showers",
        lightSnow: "Light snow",
        heavySnowShowers: "Heavy snow showers",
        heavySnow: "Heavy snow",
        thunderShowers: "Thundery showers",
        thunder: "Thunder",
      },
    },
  },
  ur: {
    title: "لائیو سروسز",
    subtitle: "برطانیہ کی لائیو معلومات کے لیے آپ کا ون اسٹاپ مرکز۔",
    comingSoon: "جلد آ رہا ہے",
    headline: { label: "آج کی برطانوی سرخی" },
    markets: {
      us: "امریکی انڈیکس",
      uk: "برطانوی انڈیکس",
      status: { open: "مارکیٹ کھلی ہے", delayed: "تاخیر سے", closed: "مارکیٹ بند", unknown: "مارکیٹ کی صورتحال نامعلوم", stale: "پرانا ڈیٹا", unavailable: "دستیاب نہیں" },
      asOf: (time) => `${time} (برطانوی وقت)`,
      source: (attribution) => `ماخذ: ${attribution}`,
      change: "تبدیلی",
    },
    weather: {
      name: "موسم",
      checking: "موسم کی معلومات حاصل کی جا رہی ہیں…",
      unavailable: "موسم کی معلومات ابھی دستیاب نہیں",
      forecastFor: (time, issued) => `Met Office کی پیشگوئی ${time} کے لیے، ${issued} پر جاری (برطانوی وقت)`,
      feelsLike: (temperature) => `محسوس ہونے والا درجہ ${temperature}`,
      automatic: "خودکار (آپ کے نیٹ ورک کے اندازاً مقام سے قریب ترین شہر)",
      autoTag: "خودکار",
      rainChance: (percent) => `بارش کا امکان ${percent}%`,
      cities: {
        london: "لندن",
        birmingham: "برمنگھم",
        manchester: "مانچسٹر",
        leeds: "لیڈز",
        glasgow: "گلاسگو",
        edinburgh: "ایڈنبرا",
        cardiff: "کارڈف",
        belfast: "بیلفاسٹ",
      },
      conditions: {
        traceRain: "معمولی بوندیں",
        clear: "صاف آسمان",
        sunny: "دھوپ",
        partlyCloudy: "جزوی طور پر ابر آلود",
        mist: "کہر",
        fog: "دھند",
        cloudy: "ابر آلود",
        overcast: "گھنے بادل",
        lightShowers: "ہلکی بوچھاڑ",
        drizzle: "بوندا باندی",
        lightRain: "ہلکی بارش",
        heavyShowers: "تیز بوچھاڑ",
        heavyRain: "تیز بارش",
        sleetShowers: "برف ملی بارش کی بوچھاڑ",
        sleet: "برف ملی بارش",
        hailShowers: "ژالہ باری کی بوچھاڑ",
        hail: "ژالہ باری",
        lightSnowShowers: "ہلکی برف باری کی بوچھاڑ",
        lightSnow: "ہلکی برف باری",
        heavySnowShowers: "تیز برف باری کی بوچھاڑ",
        heavySnow: "شدید برف باری",
        thunderShowers: "گرج چمک کے ساتھ بوچھاڑ",
        thunder: "گرج چمک",
      },
    },
  },
  hi: {
    title: "लाइव सेवाएँ",
    subtitle: "ब्रिटेन की लाइव जानकारी के लिए आपका वन-स्टॉप केंद्र।",
    comingSoon: "जल्द आ रहा है",
    headline: { label: "आज की ब्रिटेन की सुर्ख़ी" },
    markets: {
      us: "अमेरिकी सूचकांक",
      uk: "ब्रिटेन के सूचकांक",
      status: { open: "बाज़ार खुला", delayed: "विलंबित", closed: "बाज़ार बंद", unknown: "बाज़ार की स्थिति अज्ञात", stale: "पुराना डेटा", unavailable: "उपलब्ध नहीं" },
      asOf: (time) => `${time} (यूके समय)`,
      source: (attribution) => `स्रोत: ${attribution}`,
      change: "बदलाव",
    },
    weather: {
      name: "मौसम",
      checking: "मौसम की जानकारी ली जा रही है…",
      unavailable: "मौसम की जानकारी अभी उपलब्ध नहीं",
      forecastFor: (time, issued) => `Met Office पूर्वानुमान ${time} के लिए, ${issued} पर जारी (ब्रिटेन का समय)`,
      feelsLike: (temperature) => `महसूस ${temperature}`,
      automatic: "स्वचालित (आपके नेटवर्क की अनुमानित जगह से निकटतम शहर)",
      autoTag: "स्वचालित",
      rainChance: (percent) => `बारिश की संभावना ${percent}%`,
      cities: {
        london: "लंदन",
        birmingham: "बर्मिंघम",
        manchester: "मैनचेस्टर",
        leeds: "लीड्स",
        glasgow: "ग्लासगो",
        edinburgh: "एडिनबरा",
        cardiff: "कार्डिफ़",
        belfast: "बेलफ़ास्ट",
      },
      conditions: {
        traceRain: "हल्की फुहार",
        clear: "साफ़ आसमान",
        sunny: "धूप",
        partlyCloudy: "आंशिक रूप से बादल",
        mist: "धुंध",
        fog: "कोहरा",
        cloudy: "बादल",
        overcast: "घने बादल",
        lightShowers: "हल्की बौछारें",
        drizzle: "बूंदाबांदी",
        lightRain: "हल्की बारिश",
        heavyShowers: "तेज़ बौछारें",
        heavyRain: "भारी बारिश",
        sleetShowers: "बर्फ़ मिली बारिश की बौछारें",
        sleet: "बर्फ़ मिली बारिश",
        hailShowers: "ओलों की बौछारें",
        hail: "ओले",
        lightSnowShowers: "हल्की बर्फ़ की बौछारें",
        lightSnow: "हल्की बर्फ़बारी",
        heavySnowShowers: "तेज़ बर्फ़ की बौछारें",
        heavySnow: "भारी बर्फ़बारी",
        thunderShowers: "गरज के साथ बौछारें",
        thunder: "गरज-चमक",
      },
    },
  },
};
