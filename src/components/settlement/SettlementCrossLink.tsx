import { ArrowRight, Landmark } from "lucide-react";
import { guideRoutePath, type GuideLocale } from "../../guides/locales";
import { Link } from "../Link";
import "./Settlement.css";

const TEXT: Readonly<Record<GuideLocale, { lead: string; link: string }>> = {
  "zh-CN": { lead: "打算长期留在英国？永居（ILR）各路线的条件、离境天数、英语和入籍，见", link: "永居与入籍" },
  "zh-TW": { lead: "打算長期留在英國？永居（ILR）各路線的條件、離境天數、英語和入籍，見", link: "永居與入籍" },
  en: { lead: "Planning to stay long term? For settlement (ILR) on each route, days outside the UK, English and citizenship, see", link: "Settlement and citizenship" },
  ur: { lead: "طویل عرصے تک رہنے کا ارادہ ہے؟ ہر راستے پر مستقل رہائش (ILR)، برطانیہ سے باہر کے دن، انگریزی اور شہریت کے لیے دیکھیں", link: "مستقل رہائش اور شہریت" },
  hi: { lead: "लंबे समय तक रहने की योजना है? हर रास्ते पर स्थायी निवास (ILR), ब्रिटेन से बाहर के दिन, अंग्रेज़ी और नागरिकता के लिए देखें", link: "स्थायी निवास और नागरिकता" },
};

/** Link from the Family Visa and Work Visa hubs to the Settlement section. */
export function SettlementCrossLink({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const text = TEXT[locale];
  return (
    <aside className="settlement-crosslink" aria-label={text.link}>
      <Landmark size={18} aria-hidden="true" />
      <p>
        {text.lead}{" "}
        <Link to={guideRoutePath(locale, "settlement")} className="settlement-crosslink-link" data-settlement-link="">
          {text.link}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </p>
    </aside>
  );
}
