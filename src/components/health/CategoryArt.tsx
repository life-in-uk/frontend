// Original decorative SVG scenes for the four Health categories, drawn in a
// shared flat, outlined style. Each scene sits on a
// 200×160 canvas around a soft "stage" tinted by the card's tone, so the
// same artwork works as a large panel or a small badge.

import type { ReactNode } from "react";

const LINE = "#645B4F";
const PAPER = "#FFFDFA";
const BLUE = "#2F6BAF";

/** Shared stage: tinted blob, ground shadow and a few quiet accents. */
function Stage({ children }: { children: ReactNode }) {
  return (
    <>
      <path
        className="art-stage"
        d="M38 52c10-28 44-40 76-36 34 4 58 22 62 52 5 34-18 66-58 72-38 6-76-6-86-36-4-14-1-38 6-52Z"
      />
      <ellipse className="art-ground" cx="100" cy="134" rx="66" ry="7" />
      {children}
    </>
  );
}

const scenes: Record<string, ReactNode> = {
  // Arrival: suitcase, passport and a checklist for the first weeks.
  start: (
    <Stage>
      <path
        d="M150 34c8 2 14 8 16 16"
        stroke={BLUE}
        strokeWidth="2"
        strokeDasharray="3 5"
        strokeLinecap="round"
      />
      <g stroke={LINE} strokeWidth="2.5" strokeLinejoin="round">
        <path d="m128 30 24-9-6 23-6-6Z" fill={PAPER} />
        <path d="m140 38 6-17" />
        {/* Suitcase */}
        <path d="M66 52v-8a6 6 0 0 1 6-6h16a6 6 0 0 1 6 6v8" />
        <rect x="52" y="52" width="56" height="78" rx="9" fill="#66786B" />
        <path d="M66 52v78M94 52v78" stroke="#4F6255" />
        <path d="M52 76h56" stroke="#4F6255" strokeWidth="2" />
        <circle cx="62" cy="134" r="3.5" fill={PAPER} />
        <circle cx="98" cy="134" r="3.5" fill={PAPER} />
        <path d="M100 60c10 0 12 8 10 16" strokeLinecap="round" />
        <rect
          x="104"
          y="74"
          width="14"
          height="20"
          rx="3"
          fill="#F1D58E"
          transform="rotate(12 111 84)"
        />
        {/* Checklist */}
        <rect
          x="112"
          y="64"
          width="44"
          height="58"
          rx="6"
          fill={PAPER}
          transform="rotate(6 134 93)"
        />
        <g transform="rotate(6 134 93)" strokeLinecap="round">
          <path d="m120 78 3 3 6-6M120 94l3 3 6-6" stroke="#38634B" />
          <path d="M134 78h14M134 94h14M122 110h26" strokeWidth="2" />
        </g>
        {/* Passport */}
        <rect
          x="34"
          y="88"
          width="32"
          height="44"
          rx="5"
          fill="#5B7FA8"
          transform="rotate(-10 50 110)"
        />
        <g
          transform="rotate(-10 50 110)"
          stroke={PAPER}
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="50" cy="104" r="7" fill="none" />
          <path d="M43 104h14M50 97v14M42 122h16" />
        </g>
      </g>
    </Stage>
  ),
  // Feeling ill: a phone to ask for help, stethoscope and a thermometer.
  "ill-now": (
    <Stage>
      <g
        stroke={LINE}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* Phone */}
        <rect x="46" y="34" width="46" height="88" rx="10" fill={PAPER} />
        <rect
          x="53"
          y="46"
          width="32"
          height="56"
          rx="4"
          fill="#F4D9CF"
          strokeWidth="2"
        />
        <path d="M63 40h12" strokeWidth="2" />
        <rect
          x="58"
          y="56"
          width="22"
          height="22"
          rx="6"
          fill="#B65D4F"
          strokeWidth="2"
        />
        <path d="M69 61v12m-6-6h12" stroke={PAPER} strokeWidth="3" />
        <path d="M60 88h18M60 95h11" strokeWidth="2" />
        {/* Stethoscope draped over the phone */}
        <path d="M100 40v24a16 16 0 0 0 32 0V40" strokeWidth="4" />
        <circle cx="100" cy="37" r="4" fill={PAPER} />
        <circle cx="132" cy="37" r="4" fill={PAPER} />
        <path d="M116 80v16a16 16 0 0 0 32 0v-8" strokeWidth="4" />
        <circle cx="148" cy="80" r="11" fill="#E9A28F" />
        <circle cx="148" cy="80" r="4.5" fill={PAPER} />
        {/* Thermometer */}
        <g transform="rotate(-28 36 112)">
          <rect x="31" y="86" width="10" height="34" rx="5" fill={PAPER} />
          <circle cx="36" cy="124" r="7" fill="#B65D4F" />
          <path d="M36 98v22" stroke="#B65D4F" strokeWidth="3" />
        </g>
      </g>
    </Stage>
  ),
  // Medicines: pharmacy bag, prescription bottle and a blister pack.
  medicines: (
    <Stage>
      <g stroke={LINE} strokeWidth="2.5" strokeLinejoin="round">
        {/* Pharmacy bag */}
        <path d="M44 56h56l6 74H38Z" fill={PAPER} />
        <path d="M58 56v-8a14 14 0 0 1 28 0v8" fill="none" />
        <rect x="58" y="78" width="28" height="28" rx="8" fill="#38634B" />
        <path
          d="M72 84v16m-8-8h16"
          stroke={PAPER}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Prescription bottle */}
        <rect x="108" y="62" width="34" height="68" rx="7" fill="#F3EAD9" />
        <rect x="104" y="48" width="42" height="16" rx="5" fill="#66786B" />
        <rect x="114" y="80" width="22" height="30" rx="3" fill={PAPER} />
        <path d="M119 89h12M119 97h12M119 104h7" strokeLinecap="round" />
        {/* Blister pack */}
        <rect
          x="138"
          y="98"
          width="34"
          height="30"
          rx="6"
          fill="#D7E4CF"
          transform="rotate(-12 155 113)"
        />
        <g transform="rotate(-12 155 113)" fill={PAPER} strokeWidth="2">
          <circle cx="147" cy="106" r="4" />
          <circle cx="163" cy="106" r="4" />
          <circle cx="147" cy="120" r="4" />
          <circle cx="163" cy="120" r="4" />
        </g>
        {/* Capsule */}
        <g transform="rotate(-35 34 120)">
          <rect x="22" y="114" width="26" height="12" rx="6" fill={PAPER} />
          <path d="M35 114h7a6 6 0 0 1 0 12h-7Z" fill="#A76550" />
        </g>
      </g>
    </Stage>
  ),
  // Teeth: a tooth, toothbrush and a small dental mirror.
  dental: (
    <Stage>
      <g stroke={LINE} strokeWidth="2.5" strokeLinejoin="round">
        {/* Toothbrush */}
        <g transform="rotate(-38 146 86)">
          <rect x="112" y="80" width="78" height="12" rx="6" fill="#8C7BB8" />
          <rect x="98" y="78" width="22" height="16" rx="4" fill={PAPER} />
          <path
            d="M102 78v-8m6 8v-8m6 8v-8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        {/* Mirror tool */}
        <g transform="rotate(28 48 90)">
          <path d="M48 70v60" strokeWidth="4" strokeLinecap="round" />
          <circle cx="48" cy="62" r="11" fill="#E2DCF0" />
          <circle cx="48" cy="62" r="5" fill={PAPER} strokeWidth="1.8" />
        </g>
        {/* Tooth */}
        <path
          d="M68 56c0-16 16-22 30-12 14-10 30-4 30 12 0 16-7 22-9 38-2 16-5 30-12 30-6 0-6-20-9-20s-3 20-9 20c-7 0-10-14-12-30-2-16-9-22-9-38Z"
          fill={PAPER}
        />
        <path d="M84 52c-6 2-8 6-8 12" strokeLinecap="round" />
      </g>
      <path
        d="M146 30v12m-6-6h12M56 30v9m-4.5-4.5h9"
        stroke="#6B5B95"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Stage>
  ),
};

export function CategoryArt({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const scene = scenes[id];
  if (!scene) return null;
  return (
    <svg
      className={className ? `category-art ${className}` : "category-art"}
      viewBox="0 0 200 160"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {scene}
    </svg>
  );
}
