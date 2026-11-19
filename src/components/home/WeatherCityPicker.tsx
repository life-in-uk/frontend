import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, ChevronDown, MapPin, Search } from "lucide-react";
import type { WeatherCity } from "../../weather/cities";
import { searchCities } from "../../weather/cities";

type Labels = {
  city: string;
  changeCity: (city: string) => string;
  chooseCity: string;
  search: string;
  noMatch: string;
  automatic: string;
  autoTag: string;
  cities: Record<WeatherCity, string>;
};

/** "auto" is the entry that goes back to the automatic (approximate) city. */
type Entry = WeatherCity | "auto";

/**
 * The Weather tile's city: a compact button (location icon, city name, an "auto" tag when the backend chose the
 * nearest city to the visitor's approximate network location) that opens a small searchable list. Combobox pattern:
 * typing filters (page language or English names), arrow keys move, Enter chooses, Escape or a click outside closes
 * and focus returns to the button. No browser location permission is ever asked for.
 */
export function WeatherCityPicker({
  labels,
  englishNames,
  shown,
  automatic,
  manual,
  onChoose,
}: {
  labels: Labels;
  englishNames: Record<WeatherCity, string>;
  /** The city whose weather is shown, or null while it is not known yet. */
  shown: WeatherCity | null;
  /** Shown city was chosen automatically (approximate location or default). */
  automatic: boolean;
  /** The visitor has a manual choice (offer "Automatic" to go back). */
  manual: boolean;
  onChoose: (city: WeatherCity | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const titleId = useId();
  const tagId = useId();

  const cities = searchCities(query, labels.cities, englishNames);
  const entries: Entry[] = [...(manual && !query.trim() ? (["auto"] as const) : []), ...cities];

  const close = (focusButton: boolean) => {
    setOpen(false);
    setQuery("");
    if (focusButton) button.current?.focus();
  };
  const choose = (entry: Entry) => {
    onChoose(entry === "auto" ? null : entry);
    close(true);
  };

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) close(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (entries.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index + step + entries.length) % entries.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const entry = entries[Math.min(active, entries.length - 1)];
      if (entry) choose(entry);
    } else if (event.key === "Tab") {
      close(false);
    }
  };

  const name = shown ? labels.cities[shown] : labels.city;
  const optionId = (entry: Entry) => `${listId}-${entry}`;
  const activeEntry = entries[Math.min(active, entries.length - 1)];

  return (
    <span className="weather-picker">
      <button
        ref={button}
        type="button"
        className="weather-city"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={labels.changeCity(name)}
        aria-describedby={automatic && shown ? tagId : undefined}
        onClick={() => (open ? close(false) : (setActive(0), setOpen(true)))}
      >
        <MapPin size={14} aria-hidden="true" />
        <span className="weather-city-name" title={name}>{name}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {automatic && shown && (
        <span id={tagId} className="weather-city-auto" title={labels.automatic}>
          {labels.autoTag}
        </span>
      )}
      {open && (
        <div ref={panel} className="weather-picker-panel" role="dialog" aria-labelledby={titleId}>
          <span id={titleId} className="weather-picker-title">
            {labels.chooseCity}
          </span>
          <span className="weather-picker-search">
            <Search size={14} aria-hidden="true" />
            <input
              ref={input}
              type="search"
              role="combobox"
              aria-label={labels.search}
              placeholder={labels.search}
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeEntry ? optionId(activeEntry) : undefined}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKey}
            />
          </span>
          <ul id={listId} role="listbox" aria-label={labels.chooseCity} className="weather-picker-list">
            {entries.map((entry, index) => {
              const selected = entry === "auto" ? false : entry === shown && !automatic;
              return (
                <li
                  key={entry}
                  id={optionId(entry)}
                  role="option"
                  aria-selected={selected}
                  data-active={index === Math.min(active, entries.length - 1) || undefined}
                  data-entry={entry}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => choose(entry)}
                  onPointerEnter={() => setActive(index)}
                >
                  {entry === "auto" ? (
                    <>
                      <MapPin size={14} aria-hidden="true" />
                      <span>{labels.automatic}</span>
                    </>
                  ) : (
                    <>
                      <span>{labels.cities[entry]}</span>
                      {selected && <Check size={14} aria-hidden="true" />}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          {entries.length === 0 && (
            <p className="weather-picker-empty" role="status">
              {labels.noMatch}
            </p>
          )}
        </div>
      )}
    </span>
  );
}
