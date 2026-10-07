// Original decorative SVGs for the Family & Visa section; no external assets
// and no factual content. Palette: slate, clay, sage and sand.

const LINE = "#5A564E";
const SLATE = "#4F6475";
const SLATE_LIGHT = "#7A8E9E";
const CLAY = "#B5694A";
const SAGE = "#7E9479";
const SAND = "#F1E8D8";
const PAPER = "#FFFDF9";

type FigureProps = {
  x: number;
  y: number;
  scale?: number;
  coat: string;
  hair: string;
};

/** A simple standing figure; (x, y) is the point between the feet. */
function Figure({ x, y, scale = 1, coat, hair }: FigureProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="1" rx="14" ry="3" fill="#DCD2BF" stroke="none" />
      <path d="M-5 -18 -6 0M5 -18 6 0" strokeWidth="4" strokeLinecap="round" />
      <path d="M-11 -16 -9 -44Q0 -50 9 -44L11 -16Z" fill={coat} />
      <circle cx="0" cy="-56" r="9" fill="#E9C9AA" />
      <path d="M-9 -57a9 9 0 0 1 18 0c-5-3-12-3-18 0Z" fill={hair} />
    </g>
  );
}

/**
 * Hero scene: a row of terraced homes, a path to the door and a letter on
 * its way. Drawn on a 560×320 canvas; the crop is anchored to the bottom so
 * the homes and the family stay in view when `slice` trims the sky.
 */
export function FamilyVisaHeroArt() {
  return (
    <svg
      className="family-hero-art"
      viewBox="0 0 560 320"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="560" height="320" fill={SAND} />
      <circle cx="430" cy="78" r="34" fill="#EBCDB6" />
      <path
        d="M0 236c80-34 150-40 240-26 80 12 150-22 230-20 40 1 70 8 90 14v116H0Z"
        fill="#E3E6D6"
      />
      <path d="M0 256h560v64H0Z" fill="#E9E9DB" />
      <path d="m262 256-34 64h104l-34-64Z" fill="#EADBC2" />

      {/* Letter on its way home */}
      <path
        d="M96 98c40-30 86-36 128-16"
        stroke={SLATE_LIGHT}
        strokeWidth="2"
        strokeDasharray="3 6"
        strokeLinecap="round"
      />
      <g stroke={LINE} strokeWidth="2.5" strokeLinejoin="round">
        <g transform="rotate(-10 78 108)">
          <rect x="56" y="94" width="44" height="30" rx="4" fill={PAPER} />
          <path d="m57 96 21 15 21-15" />
        </g>

        {/* Terraced homes */}
        <path d="M150 150h86v106h-86z" fill="#E8D6C0" />
        <path d="m142 152 51-40 51 40Z" fill={SLATE} />
        <path d="M236 140h88v116h-88z" fill="#F7F1E6" />
        <path d="m228 142 52-42 52 42Z" fill={SLATE_LIGHT} />
        <path d="M324 150h86v106h-86z" fill="#E2CDB4" />
        <path d="m316 152 51-40 51 40Z" fill={SLATE} />
        <path d="M298 110V92h12v26" fill={CLAY} />

        <g fill="#FBF6EC">
          <rect x="164" y="168" width="24" height="24" rx="3" />
          <rect x="198" y="168" width="24" height="24" rx="3" />
          <rect x="250" y="158" width="24" height="24" rx="3" />
          <rect x="288" y="158" width="24" height="24" rx="3" />
          <rect x="338" y="168" width="24" height="24" rx="3" />
          <rect x="372" y="168" width="24" height="24" rx="3" />
        </g>
        <path d="M176 168v24m34-24v24m52-34v24m38-24v24m50-14v24m34-24v24" />

        {/* Doors */}
        <path d="M180 256v-38a13 13 0 0 1 26 0v38Z" fill={SAGE} />
        <path d="M266 256v-44a14 14 0 0 1 28 0v44Z" fill={CLAY} />
        <path d="M354 256v-38a13 13 0 0 1 26 0v38Z" fill={SLATE_LIGHT} />
        <circle cx="288" cy="236" r="2" fill={LINE} />
        <path d="M140 256h280" />
      </g>

      {/* Front gardens */}
      <g fill={SAGE}>
        <ellipse cx="160" cy="256" rx="18" ry="8" />
        <ellipse cx="242" cy="257" rx="14" ry="7" />
        <ellipse cx="318" cy="257" rx="14" ry="7" />
        <ellipse cx="402" cy="256" rx="18" ry="8" />
      </g>
      <g stroke={LINE} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M466 260v-30" />
        <path
          d="M448 232c-10-16 1-30 13-29-1-21 28-22 29-4 19 2 18 32 4 36-8 11-34 9-46-3Z"
          fill="#93A78D"
        />
        <path d="M100 262v-24" />
        <path
          d="M86 240c-8-12 1-23 10-22-1-16 21-17 22-3 14 2 13 24 3 27-6 8-26 7-35-2Z"
          fill={SAGE}
        />
      </g>

      {/* A family walking home */}
      <g stroke={LINE} strokeWidth="2.5" strokeLinejoin="round">
        <Figure x={250} y={300} coat={CLAY} hair="#3E3A35" />
        <Figure x={276} y={302} scale={0.66} coat="#E3B65C" hair="#3E3A35" />
        <path d="M259 270q6 6 11 4" strokeLinecap="round" />
        <Figure x={310} y={298} scale={0.94} coat={SLATE} hair="#2F2B27" />
      </g>
    </svg>
  );
}

/** Small motif for the empty state: an open notebook with a pen. */
export function FamilyVisaNotebookArt() {
  return (
    <svg
      className="family-empty-art"
      viewBox="0 0 120 96"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="60" cy="84" rx="44" ry="6" fill="#E6DCCB" />
      <g stroke={LINE} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M60 24c-12-8-28-9-42-6v56c14-3 30-2 42 6Z" fill={PAPER} />
        <path d="M60 24c12-8 28-9 42-6v56c-14-3-30-2-42 6Z" fill="#F6F0E4" />
        <path d="M60 24v56" />
        <path
          d="M28 36c8-1 16 0 22 3M28 48c8-1 16 0 22 3M70 39c6-3 14-4 22-3"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <g transform="rotate(38 88 56)">
          <rect x="82" y="34" width="10" height="38" rx="3" fill={CLAY} />
          <path d="m82 72 5 9 5-9Z" fill={SAND} />
        </g>
      </g>
    </svg>
  );
}
