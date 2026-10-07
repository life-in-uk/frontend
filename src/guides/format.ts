// Display helpers shared by every Guide domain.

/** Calendar date in UK time, e.g. "2026 年 10 月 5 日". */
export function formatUkDate(instant: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(instant));
  const part = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")} 年 ${Number(part("month"))} 月 ${Number(part("day"))} 日`;
}

/**
 * A shorter label for compact lists: the API title up to its first full-width
 * question mark, when more text follows it. The wording itself is unchanged.
 */
export function shortGuideTitle(title: string): string {
  const end = title.indexOf("？");
  return end > 0 && end < title.length - 1 ? title.slice(0, end + 1) : title;
}

// Han, kana and Hangul letters. Full-width punctuation such as "；" or "（"
// is deliberately excluded: English locators often use it as a separator.
const CJK_LETTER = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;
const LATIN = /[A-Za-z]/;

/**
 * Language hint for source material quoted inside a Chinese article. Text
 * with Latin letters and no CJK letters is marked as English so screen
 * readers switch voice; text containing Chinese inherits the article language.
 */
export function sourceTextLang(text: string): "en" | undefined {
  return LATIN.test(text) && !CJK_LETTER.test(text) ? "en" : undefined;
}
