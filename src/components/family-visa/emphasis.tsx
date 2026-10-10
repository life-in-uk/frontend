import type { ReactNode } from "react";

/** "**x**" → <strong>; everything else stays plain text. */
export function emphasis(text: string): ReactNode[] {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, index) =>
      index % 2 === 1 ? <strong key={index}>{part}</strong> : part,
    );
}
