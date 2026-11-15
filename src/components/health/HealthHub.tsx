import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  Moon,
  Phone,
  Pill,
  PoundSterling,
  Signpost,
  Users,
} from "lucide-react";
import { getGuides, getLocalizedGuides } from "../../guides/api";
import type { GuideMetadata } from "../../guides/api";
import {
  HEALTH_INTENTS,
  HEALTH_QUICK_LINKS,
  localizedHealthSections,
} from "../../guides/catalog";
import type { HubEntry } from "../../guides/catalog";
import { shortGuideTitle, shortLocalizedTitle } from "../../guides/format";
import {
  GUIDE_LOCALE_LANG,
  GUIDE_UI,
  guideRoutePath,
  localizedGuidePath,
  textDirection,
  type GuideLocale,
} from "../../guides/locales";
import { applyGuideSeo, clearGuideSeo, localizedIndexAlternates } from "../../guides/seo";
import { Link } from "../Link";
import { CategoryArt } from "./CategoryArt";
import { GuideLanguageSelect } from "../guides/GuideLanguageSelect";
import "./Health.css";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; source: GuideMetadata[]; localized: GuideMetadata[] };

const REQUEST_DEADLINE_MS = 10_000;
const UNSURE_SLUG = "where-to-go-when-ill-england";

// Desktop rhythm for the category grid: wide/narrow, then narrow/wide.
const CARD_SHAPES = ["is-wide", "is-narrow", "is-narrow", "is-wide"];

type HubCopy = {
  region: string;
  lead: string;
  emergencyBefore: string;
  emergencyAfter: string;
  unsure: string;
  independence: string;
  intentsTitle: string;
  intentsText: string;
  loading: string;
  failed: string;
  empty: string;
  topics: string;
  startWith: (title: string) => string;
  count: (count: number) => string;
  quickTitle: string;
  quickText: string;
  /** Badge on a Simplified Chinese fallback card (not used for zh-CN). */
  fallbackBadge: string;
  /** Shown once when any Guide on the page is a fallback (not used for zh-CN). */
  fallbackNotice: string;
  groups: Record<string, { title: string; description: string }>;
};

// Page chrome only. Guide titles and summaries always come from the API.
const COPY: Record<GuideLocale, HubCopy> = {
  "zh-CN": {
    region: "英格兰",
    lead: "刚到英国，看病的规矩跟国内很不一样。这里的指南讲的是英格兰的情况，每篇都附上了英国官方依据。",
    emergencyBefore: "危及生命请拨打",
    emergencyAfter: "",
    unsure: "不确定该去哪？",
    independence: "Life in UK 是独立的中文生活信息服务，不隶属于 NHS。",
    intentsTitle: "按你的情况选择",
    intentsText: "选一个最接近你现在情况的问题，直接看对应的指南。",
    loading: "正在加载健康指南…",
    failed: "健康指南暂时无法加载，请稍后再试。",
    empty: "目前还没有发布的健康指南。",
    topics: "健康话题",
    startWith: (title) => `，从《${title}》开始读`,
    count: (count) => `${count} 篇指南`,
    quickTitle: "快速解答",
    quickText: "常见问题，点开就是对应的完整指南。",
    fallbackBadge: "",
    fallbackNotice: "",
    groups: {},
  },
  "zh-TW": {
    region: "英格蘭",
    lead: "剛到英國，看病的規矩跟國內很不一樣。這裡的指南講的是英格蘭的情況，每篇都附上了英國官方依據。",
    emergencyBefore: "危及生命請撥打",
    emergencyAfter: "",
    unsure: "不確定該去哪？",
    independence: "Life in UK 是獨立的中文生活資訊服務，不隸屬於 NHS。",
    intentsTitle: "依你的情況選擇",
    intentsText: "選一個最接近你現在情況的問題，直接看對應的指南。",
    loading: "正在載入健康指南…",
    failed: "健康指南暫時無法載入，請稍後再試。",
    empty: "目前還沒有已發布的健康指南。",
    topics: "健康話題",
    startWith: (title) => `，從《${title}》開始讀`,
    count: (count) => `${count} 篇指南`,
    quickTitle: "快速解答",
    quickText: "常見問題，點開就是對應的完整指南。",
    fallbackBadge: "尚未翻譯 · 簡體中文",
    fallbackNotice: "部分指南尚未翻譯成繁體中文。標示「尚未翻譯」的連結會開啟簡體中文版本。",
    groups: {
      start: { title: "剛來英國？從這裡開始", description: "看病要不要錢、怎麼註冊 GP、家人來探親怎麼辦。" },
      "ill-now": { title: "我現在生病了", description: "不舒服的時候，先弄清楚該找誰。" },
      medicines: { title: "藥物和長期疾病", description: "買藥、處方、從國內帶來的病歷和疫苗紀錄，以及看病時的語言協助。" },
      dental: { title: "牙齒", description: "日常看牙和突然牙痛，是兩條不同的路。" },
      other: { title: "更多健康指南", description: "" },
    },
  },
  en: {
    region: "England",
    lead: "If you have just arrived, seeing a doctor in the UK can work very differently from what you are used to. These guides cover England, and each one cites official UK sources.",
    emergencyBefore: "Life-threatening emergency? Call",
    emergencyAfter: "",
    unsure: "Not sure where to go?",
    independence: "Life in UK is an independent information service and is not part of the NHS.",
    intentsTitle: "Choose by your situation",
    intentsText: "Pick the question closest to your situation to go straight to the guide.",
    loading: "Loading health guides…",
    failed: "Health guides are temporarily unavailable. Please try again later.",
    empty: "No health guides have been published yet.",
    topics: "Health topics",
    startWith: (title) => `, start with “${title}”`,
    count: (count) => (count === 1 ? "1 guide" : `${count} guides`),
    quickTitle: "Quick answers",
    quickText: "Common questions. Each one opens the full guide.",
    fallbackBadge: "Not yet translated · Simplified Chinese",
    fallbackNotice: "Some guides are not yet available in English. Links marked “Not yet translated” open the Simplified Chinese version.",
    groups: {
      start: { title: "New to the UK? Start here", description: "Whether healthcare costs money, how to register with a GP, and what to do when family visit." },
      "ill-now": { title: "I'm unwell now", description: "When you feel unwell, first work out who to go to." },
      medicines: { title: "Medicines and long-term conditions", description: "Buying medicines, prescriptions, medical and vaccination records brought from China, and language help when seeing a doctor." },
      dental: { title: "Teeth", description: "Routine dental care and sudden toothache are two different routes." },
      other: { title: "More health guides", description: "" },
    },
  },
  ur: {
    region: "انگلینڈ",
    lead: "نئے آئے ہیں تو برطانیہ میں علاج کا طریقہ آپ کی عادت سے بہت مختلف ہو سکتا ہے۔ یہاں کی رہنمائی انگلینڈ کے بارے میں ہے، اور ہر تحریر کے ساتھ برطانیہ کے سرکاری حوالے دیے گئے ہیں۔",
    emergencyBefore: "جان کو خطرہ ہو تو",
    emergencyAfter: "پر کال کریں",
    unsure: "سمجھ نہیں آ رہا کہاں جائیں؟",
    independence: "Life in UK ایک آزاد معلوماتی سروس ہے اور NHS کا حصہ نہیں۔",
    intentsTitle: "اپنی صورتحال کے مطابق انتخاب کریں",
    intentsText: "اپنی موجودہ صورتحال سے سب سے قریب سوال چنیں اور سیدھا متعلقہ رہنمائی پر جائیں۔",
    loading: "صحت کی رہنمائی لوڈ ہو رہی ہے…",
    failed: "صحت کی رہنمائی عارضی طور پر دستیاب نہیں۔ براہِ کرم بعد میں دوبارہ کوشش کریں۔",
    empty: "ابھی صحت سے متعلق کوئی رہنمائی شائع نہیں ہوئی۔",
    topics: "صحت کے موضوعات",
    startWith: (title) => `، "${title}" سے شروع کریں`,
    count: (count) => (count === 1 ? "1 تحریر" : `${count} تحریریں`),
    quickTitle: "فوری جوابات",
    quickText: "عام سوالات۔ ہر سوال پر مکمل رہنمائی کھلتی ہے۔",
    fallbackBadge: "ابھی ترجمہ نہیں ہوا · سادہ چینی",
    fallbackNotice: "کچھ رہنمائی ابھی اردو میں دستیاب نہیں۔ \"ابھی ترجمہ نہیں ہوا\" والے لنک سادہ چینی ورژن کھولتے ہیں۔",
    groups: {
      start: { title: "برطانیہ نئے آئے ہیں؟ یہاں سے شروع کریں", description: "علاج کے پیسے لگتے ہیں یا نہیں، GP کے ساتھ رجسٹریشن کیسے ہو، اور گھر والے ملنے آئیں تو کیا کریں۔" },
      "ill-now": { title: "میں ابھی بیمار ہوں", description: "طبیعت خراب ہو تو پہلے یہ سمجھیں کہ کس کے پاس جانا ہے۔" },
      medicines: { title: "دوائیں اور طویل مدتی بیماریاں", description: "دوائیں خریدنا، نسخے، چین سے لائے گئے میڈیکل اور ویکسینیشن ریکارڈ، اور ڈاکٹر کے پاس زبان کے لیے مدد۔" },
      dental: { title: "دانت", description: "دانتوں کا معمول کا علاج اور اچانک دانت کا درد، دونوں کے راستے الگ ہیں۔" },
      other: { title: "صحت سے متعلق مزید رہنمائی", description: "" },
    },
  },
  hi: {
    region: "इंग्लैंड",
    lead: "नए-नए आए हैं तो ब्रिटेन में इलाज का तरीका आपकी आदत से काफ़ी अलग हो सकता है। यहाँ की मार्गदर्शिकाएँ इंग्लैंड के बारे में हैं, और हर एक के साथ ब्रिटेन के आधिकारिक स्रोत दिए गए हैं।",
    emergencyBefore: "जान को ख़तरा हो तो",
    emergencyAfter: "पर कॉल करें",
    unsure: "समझ नहीं आ रहा कहाँ जाएँ?",
    independence: "Life in UK एक स्वतंत्र जानकारी सेवा है और NHS का हिस्सा नहीं है।",
    intentsTitle: "अपनी स्थिति के हिसाब से चुनें",
    intentsText: "अपनी मौजूदा स्थिति से सबसे मिलता-जुलता सवाल चुनें और सीधे उससे जुड़ी मार्गदर्शिका देखें।",
    loading: "स्वास्थ्य मार्गदर्शिकाएँ लोड हो रही हैं…",
    failed: "स्वास्थ्य मार्गदर्शिकाएँ अभी उपलब्ध नहीं हैं। कृपया बाद में फिर प्रयास करें।",
    empty: "अभी स्वास्थ्य से जुड़ी कोई मार्गदर्शिका प्रकाशित नहीं हुई है।",
    topics: "स्वास्थ्य विषय",
    startWith: (title) => `, "${title}" से शुरू करें`,
    count: (count) => (count === 1 ? "1 मार्गदर्शिका" : `${count} मार्गदर्शिकाएँ`),
    quickTitle: "झटपट जवाब",
    quickText: "आम सवाल। हर सवाल पर पूरी मार्गदर्शिका खुलती है।",
    fallbackBadge: "अभी अनुवाद नहीं हुआ · सरलीकृत चीनी",
    fallbackNotice: "कुछ मार्गदर्शिकाएँ अभी हिन्दी में उपलब्ध नहीं हैं। \"अभी अनुवाद नहीं हुआ\" वाले लिंक सरलीकृत चीनी संस्करण खोलते हैं।",
    groups: {
      start: { title: "ब्रिटेन में नए हैं? यहाँ से शुरू करें", description: "इलाज का ख़र्च लगता है या नहीं, GP के साथ रजिस्ट्रेशन कैसे करें, और परिवार वाले मिलने आएँ तो क्या करें।" },
      "ill-now": { title: "मैं अभी बीमार हूँ", description: "तबीयत ख़राब हो तो पहले यह समझें कि किसके पास जाना है।" },
      medicines: { title: "दवाइयाँ और लंबी बीमारियाँ", description: "दवाइयाँ ख़रीदना, पर्चे, चीन से लाए गए मेडिकल और टीकाकरण रिकॉर्ड, और डॉक्टर के पास भाषा संबंधी मदद।" },
      dental: { title: "दाँत", description: "दाँतों की नियमित देखभाल और अचानक दाँत दर्द, दोनों के रास्ते अलग हैं।" },
      other: { title: "स्वास्थ्य से जुड़ी और मार्गदर्शिकाएँ", description: "" },
    },
  },
};

/** Placeholder layout while the Guide list loads; purely decorative. */
function HubSkeleton({ label }: { label: string }) {
  return (
    <div className="hub-skeleton">
      <p className="sr-only" role="status">
        {label}
      </p>
      <div className="hub-skeleton-chips" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="skeleton skeleton-chip" />
        ))}
      </div>
      <div className="category-cards" aria-hidden="true">
        {CARD_SHAPES.map((shape, i) => (
          <div key={i} className={`skeleton skeleton-card ${shape}`}>
            <span className="skeleton-line skeleton-title" />
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-short" />
          </div>
        ))}
      </div>
    </div>
  );
}

const INTENT_ICONS: Record<string, LucideIcon> = {
  signpost: Signpost,
  clipboard: ClipboardList,
  pill: Pill,
  moon: Moon,
  users: Users,
  pound: PoundSterling,
};

/** Text of a Guide shown in a language other than the page, e.g. a Chinese fallback. */
function EntryText({ entry, locale, children }: { entry: HubEntry; locale: GuideLocale; children: string }) {
  return entry.locale === locale ? (
    <>{children}</>
  ) : (
    <span lang={GUIDE_LOCALE_LANG[entry.locale]} dir={textDirection(entry.locale)}>
      {children}
    </span>
  );
}

function FallbackBadge({ entry, copy }: { entry: HubEntry; copy: HubCopy }) {
  return entry.fallback && copy.fallbackBadge ? (
    <span className="hub-fallback-badge">{copy.fallbackBadge}</span>
  ) : null;
}

export function HealthHub({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const copy = COPY[locale];
  const translatedPage = locale !== "zh-CN";

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_DEADLINE_MS,
    );
    // The Simplified Chinese list fixes the hub structure; another locale's
    // list only says which of those Guides are translated.
    Promise.all([
      getGuides(controller.signal),
      translatedPage
        ? getLocalizedGuides(locale, controller.signal)
        : Promise.resolve([]),
    ])
      .then(([source, localized]) => {
        if (active) setState({ status: "ready", source, localized });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [locale, translatedPage]);

  useEffect(() => {
    if (!translatedPage) return;
    applyGuideSeo({
      locale,
      canonical: new URL(localizedGuidePath(locale, "health"), window.location.origin).href,
      title: `${GUIDE_UI[locale].domain.health} · Life in UK`,
      description: copy.lead,
      alternates: localizedIndexAlternates(window.location.origin, [locale]),
    });
    return () => clearGuideSeo();
  }, [locale, translatedPage, copy]);

  const sections =
    state.status === "ready"
      ? localizedHealthSections(state.source, state.localized, locale)
      : [];
  const entries = new Map(
    sections.flatMap((section) => section.entries.map((entry) => [entry.slug, entry] as const)),
  );
  // Shortcuts only appear for Guides actually published in this language.
  const inLocale = (slug: string) => entries.get(slug)?.fallback === false;
  const intents = HEALTH_INTENTS.filter((intent) => inLocale(intent.slug));
  const quickLinks = HEALTH_QUICK_LINKS.filter((link) => inLocale(link.slug));
  const hasFallback = translatedPage && [...entries.values()].some((entry) => entry.fallback);
  const shortTitle = (entry: HubEntry) =>
    entry.locale === "zh-CN" ? shortGuideTitle(entry.title) : shortLocalizedTitle(entry.title);

  // Until the lists load, the hero link assumes the Guide is not translated.
  const unsure: HubEntry = entries.get(UNSURE_SLUG) ?? {
    slug: UNSURE_SLUG,
    title: "",
    summary: "",
    locale: "zh-CN",
    fallback: translatedPage,
    path: guideRoutePath("zh-CN", "health", UNSURE_SLUG),
  };

  return (
    <main
      id="main"
      className="health-page health-hub"
      lang={translatedPage ? GUIDE_LOCALE_LANG[locale] : undefined}
      dir={translatedPage ? textDirection(locale) : undefined}
    >
      <div className="guide-toolbar"><GuideLanguageSelect locale={locale} domain="health" /></div>
      <section className="health-hero" aria-labelledby="health-title">
        <div className="health-hero-copy">
          <span className="eyebrow">
            <HeartPulse size={15} aria-hidden="true" />
            HEALTH &amp; NHS · {copy.region}
          </span>
          <h1 id="health-title">{GUIDE_UI[locale].domain.health}</h1>
          <p className="health-hero-lead">{copy.lead}</p>
          <div className="health-hero-actions">
            {/* tel: opens the dialler with 999 filled in; it never dials by itself. */}
            <a href="tel:999" className="health-hero-action health-emergency">
              <span className="health-hero-action-icon">
                <Phone size={15} aria-hidden="true" />
              </span>
              <span>
                {copy.emergencyBefore} <strong>999</strong>
                {copy.emergencyAfter && ` ${copy.emergencyAfter}`}
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <Link
              to={unsure.path}
              className="health-hero-action health-hero-unsure"
            >
              <span className="health-hero-action-icon">
                <Signpost size={15} aria-hidden="true" />
              </span>
              <span>
                {copy.unsure}
                <FallbackBadge entry={unsure} copy={copy} />
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <p className="health-hero-note">{copy.independence}</p>
        </div>
        <div className="health-hero-media">
          <img
            className="health-hero-image"
            src="/images/health/health-nhs-hero.png"
            alt=""
            width={1672}
            height={941}
            decoding="async"
          />
        </div>
      </section>

      {intents.length > 0 && (
        <section className="health-intents" aria-labelledby="intents-title">
          <div className="health-section-heading">
            <h2 id="intents-title">{copy.intentsTitle}</h2>
            <p>{copy.intentsText}</p>
          </div>
          <ul className="intent-chips">
            {intents.map((intent) => {
              const Icon = INTENT_ICONS[intent.icon] ?? ArrowRight;
              const entry = entries.get(intent.slug)!;
              return (
                <li key={intent.slug}>
                  <Link to={entry.path} className="intent-chip">
                    <Icon size={16} aria-hidden="true" />
                    {translatedPage ? shortTitle(entry) : intent.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {state.status === "loading" && <HubSkeleton label={copy.loading} />}
      {state.status === "error" && (
        <p className="health-status" role="status">
          {copy.failed}
        </p>
      )}
      {state.status === "ready" && sections.length === 0 && (
        <p className="health-status" role="status">
          {copy.empty}
        </p>
      )}

      {sections.length > 0 && (
        <section
          className="health-categories"
          aria-labelledby="categories-title"
        >
          <h2 id="categories-title" className="sr-only">
            {copy.topics}
          </h2>
          {hasFallback && (
            <p className="hub-fallback-notice" role="note">
              {copy.fallbackNotice}
            </p>
          )}
          <ul className="category-cards">
            {sections.map(({ group, entries: items }, index) => {
              const lead = items[0];
              const groupCopy = copy.groups[group.id] ?? group;
              return (
                <li
                  key={group.id}
                  className={`category-card tone-${group.tone} ${CARD_SHAPES[index % CARD_SHAPES.length]}`}
                  data-category={group.id}
                >
                  <div className="category-card-inner">
                    <div className="category-card-visual">
                      <CategoryArt id={group.id} />
                    </div>
                    <div className="category-card-body">
                      <h3 id={`group-${group.id}`}>
                        <Link
                          to={lead.path}
                          className="category-card-link"
                        >
                          {groupCopy.title}
                          <span className="sr-only">
                            {/* The lead title may be a Simplified Chinese fallback: mark its language. */}
                            {copy.startWith("\u0000").split("\u0000")[0]}
                            <EntryText entry={lead} locale={locale}>{shortTitle(lead)}</EntryText>
                            {copy.startWith("\u0000").split("\u0000")[1]}
                          </span>
                        </Link>
                      </h3>
                      {groupCopy.description && (
                        <p className="category-card-description">
                          {groupCopy.description}
                        </p>
                      )}
                      <ul
                        className="category-guides"
                        aria-labelledby={`group-${group.id}`}
                      >
                        {items.map((entry) => (
                          <li key={entry.slug} data-fallback={entry.fallback || undefined}>
                            <Link
                              to={entry.path}
                              title={entry.title}
                              hrefLang={entry.locale !== locale ? GUIDE_LOCALE_LANG[entry.locale] : undefined}
                            >
                              <span>
                                <EntryText entry={entry} locale={locale}>{shortTitle(entry)}</EntryText>
                                <FallbackBadge entry={entry} copy={copy} />
                                {items.length === 1 && (
                                  <span className="category-guide-summary">
                                    <EntryText entry={entry} locale={locale}>{entry.summary}</EntryText>
                                  </span>
                                )}
                              </span>
                              <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <p className="category-card-count">
                        {copy.count(items.length)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {quickLinks.length > 0 && (
        <section className="quick-answers" aria-labelledby="quick-title">
          <div className="health-section-heading">
            <h2 id="quick-title">{copy.quickTitle}</h2>
            <p>{copy.quickText}</p>
          </div>
          <ul>
            {quickLinks.map((link) => {
              const entry = entries.get(link.slug)!;
              return (
                <li key={link.question}>
                  <Link to={entry.path}>
                    <span>{translatedPage ? entry.title : link.question}</span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
