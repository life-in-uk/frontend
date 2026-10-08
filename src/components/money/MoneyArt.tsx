// Original decorative SVG for the Money & Finance hero; no external assets,
// no brands and no factual content. Palette: ink teal, ochre and cream.

const LINE = "#4A4A43";
const TEAL = "#2C5F66";
const TEAL_LIGHT = "#6F969A";
const OCHRE = "#C49433";
const CREAM = "#F5EEDF";
const PAPER = "#FFFDF9";

/**
 * A calm desk: a bank card, a checklist, a small stack of coins and a plant.
 * Drawn on a 560×320 canvas, anchored to the bottom so `slice` keeps the
 * desk in view when narrower frames trim the wall.
 */
export function MoneyHeroArt() {
  return (
    <svg
      className="money-hero-art"
      viewBox="0 0 560 320"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="560" height="320" fill={CREAM} />
      <circle cx="420" cy="86" r="46" fill="#E9DDC3" />
      <path d="M0 246h560v74H0Z" fill="#E7DCC6" />
      <path d="M0 246h560" stroke="#D8CAAE" strokeWidth="3" />

      <g stroke={LINE} strokeWidth="2.5" strokeLinejoin="round">
        {/* Checklist on a clipboard */}
        <g transform="rotate(-4 214 170)">
          <rect x="166" y="96" width="104" height="138" rx="10" fill={PAPER} />
          <rect
            x="198"
            y="88"
            width="40"
            height="16"
            rx="5"
            fill={TEAL_LIGHT}
          />
          <g strokeLinecap="round">
            <rect x="182" y="124" width="14" height="14" rx="3" fill={PAPER} />
            <path d="m185 131 3 3 6-7" stroke={TEAL} />
            <path d="M206 131h46" strokeWidth="2" />
            <rect x="182" y="152" width="14" height="14" rx="3" fill={PAPER} />
            <path d="m185 159 3 3 6-7" stroke={TEAL} />
            <path d="M206 159h40" strokeWidth="2" />
            <rect x="182" y="180" width="14" height="14" rx="3" fill={PAPER} />
            <path d="M206 187h46" strokeWidth="2" />
            <rect x="182" y="208" width="14" height="14" rx="3" fill={PAPER} />
            <path d="M206 215h32" strokeWidth="2" />
          </g>
        </g>

        {/* Bank card */}
        <g transform="rotate(8 330 200)">
          <rect x="268" y="160" width="128" height="82" rx="10" fill={TEAL} />
          <path d="M268 182h128" stroke="#1F474D" strokeWidth="9" />
          <rect x="282" y="198" width="22" height="16" rx="3" fill={OCHRE} />
          <path
            d="M282 226h38M330 226h24"
            stroke={CREAM}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        {/* Coins */}
        <g fill={OCHRE}>
          <ellipse cx="440" cy="240" rx="26" ry="8" />
          <path d="M414 240v-10a26 8 0 0 0 52 0v10" />
          <ellipse cx="440" cy="230" rx="26" ry="8" />
          <path d="M414 230v-10a26 8 0 0 0 52 0v10" />
          <ellipse cx="440" cy="220" rx="26" ry="8" fill="#D9AE52" />
        </g>

        {/* Plant */}
        <path d="M118 246h40l-5-34h-30Z" fill="#D7C3A0" />
        <path d="M138 212c-4-20-20-30-30-28 0 14 12 26 30 28Z" fill="#8FA89A" />
        <path d="M138 212c2-24 18-36 30-34 0 16-12 30-30 34Z" fill="#7B988A" />
        <path d="M138 212v-30" />
      </g>
    </svg>
  );
}
