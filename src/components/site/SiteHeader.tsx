import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type FocusEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { BusFront, ChevronDown, Coins, GraduationCap, HeartPulse, House, IdCard, Menu, Search, X } from "lucide-react";
import type { GuideDomainId } from "../../guides/domains";
import { availableHomeTopics, navGroupTopics, topicHref, visibleNavGroups, type NavGroupId, type TopicIcon } from "../../home/topics";
import { Link } from "../Link";
import { GUIDE_UI, guideHomePath, type GuideLocale } from "../../guides/locales";
import { SITE_UI } from "../../guides/siteUi";
import { subscribeToLocation } from "../../router";
import { GuideLanguageSelect } from "../guides/GuideLanguageSelect";
import { Wordmark } from "./Wordmark";
import "./Site.css";

type SiteHeaderProps = {
  /** The launched section currently shown, for aria-current. */
  current: "home" | GuideDomainId | "travel" | undefined;
  universityAvailable?: boolean; educationAvailable?: boolean; householdAvailable?: boolean;
  locale?: GuideLocale;
  /**
   * Same page in another language. Given only on pages without their own
   * language selector (home, not-found), so a page never shows two.
   */
  switchPath?: (next: GuideLocale) => string | undefined;
};

/**
 * Below 1024px the header always shows one "Menu" button whose sheet lists
 * every category. From 1024px it shows a second header row with Home plus
 * one disclosure menu per category when that row fits; when it would not (a long translation, a new group),
 * it measures itself and falls back to the Menu button instead of
 * overflowing. CSS keys off the `masthead--compact` class this sets.
 * tests/site-header.browser.mjs checks both layouts in all five locales.
 */
const COMPACT_NAV_QUERY = "(max-width: 1023px)";

const ICONS: Record<TopicIcon, ReactNode> = {
  heart: <HeartPulse size={18} aria-hidden="true" />,
  coins: <Coins size={18} aria-hidden="true" />,
  "id-card": <IdCard size={18} aria-hidden="true" />,
  graduation: <GraduationCap size={18} aria-hidden="true" />,
  house: <House size={18} aria-hidden="true" />,
  bus: <BusFront size={18} aria-hidden="true" />,
};

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
  );
}

/** On the homepage, move to a section in place instead of navigating. */
function onHomeSection(home: string, id: string, focus: boolean, after?: () => void) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    after?.();
    if (window.location.pathname !== home) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    if (focus) target.focus();
    target.scrollIntoView({ block: focus ? "center" : "start" });
  };
}

/** Focusable links inside a menu panel, in DOM (reading) order. */
function panelLinks(panel: Element | null): HTMLAnchorElement[] {
  return panel ? Array.from(panel.querySelectorAll<HTMLAnchorElement>("a[href]")) : [];
}

/**
 * Up/Down (and Home/End) move between the links of an open menu panel.
 * Vertical keys mean the same in left-to-right and right-to-left pages.
 */
function onPanelKeyDown(event: KeyboardEvent<HTMLElement>) {
  const links = panelLinks(event.currentTarget);
  const index = links.indexOf(document.activeElement as HTMLAnchorElement);
  if (index < 0 || links.length === 0) return;
  const move: Record<string, number> = {
    ArrowDown: (index + 1) % links.length,
    ArrowUp: (index - 1 + links.length) % links.length,
    Home: 0,
    End: links.length - 1,
  };
  if (!(event.key in move)) return;
  event.preventDefault();
  links[move[event.key]].focus();
}

/** Shared site header: brand, section navigation, search, language and About. */
export function SiteHeader({ current, locale = "zh-CN", switchPath, universityAvailable = false, educationAvailable = false, householdAvailable = false }: SiteHeaderProps) {
  const ui = SITE_UI[locale];
  const home = guideHomePath(locale);
  const homeAnchor = (id: string) => (home === "/" ? `/#${id}` : `${home}#${id}`);
  const narrow = useMediaQuery(COMPACT_NAV_QUERY);
  // Width the wide bar needed when it last did not fit, or null while it fits.
  const [needed, setNeeded] = useState<number | null>(null);
  const compact = narrow || needed !== null;
  const topics = availableHomeTopics(universityAvailable, educationAvailable, householdAvailable);
  const navGroups = visibleNavGroups(locale, topics);
  const innerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLUListElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  // Wide screens: which group menu is open. Narrow screens: whether the Menu panel is open.
  const [openGroup, setOpenGroup] = useState<NavGroupId | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const baseId = useId();
  const panelId = (group: NavGroupId) => `${baseId}-menu-${group}`;
  const buttonId = (group: NavGroupId) => `${baseId}-button-${group}`;
  const menuPanelId = `${baseId}-menu`;
  const anyOpen = compact ? menuOpen : openGroup !== null;

  function closeAll() {
    setOpenGroup(null);
    setMenuOpen(false);
  }

  // Labels and the language selector change what fits: measure the wide bar again.
  const content = `${locale}|${switchPath ? "language" : ""}|${universityAvailable}|${educationAvailable}|${householdAvailable}`;
  const [measured, setMeasured] = useState(content);
  if (measured !== content) {
    setMeasured(content);
    setNeeded(null);
  }

  // Switching between the wide and narrow layouts starts with menus closed.
  const [layout, setLayout] = useState(compact);
  if (layout !== compact) {
    setLayout(compact);
    closeAll();
  }

  // Wide layout has two rows: brand + actions, then the category bar. If
  // either row would overflow, switch to the Menu layout (before paint, so
  // there is no flash). Menu layout: return to the wide layout once the
  // row is as wide as the wide layout needed.
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner || narrow) return;
    function check() {
      if (!inner) return;
      const available = inner.clientWidth;
      if (needed !== null) {
        if (available >= needed) setNeeded(null);
        return;
      }
      const brand = inner.querySelector<HTMLElement>(".masthead-brand"), bar = barRef.current, actions = actionsRef.current;
      if (!brand || !bar || !actions) return;
      const gap = parseFloat(getComputedStyle(inner).columnGap) || 0;
      const total = Math.max(brand.offsetWidth + actions.offsetWidth + gap, bar.scrollWidth);
      if (total > available) setNeeded(Math.ceil(total));
    }
    check();
    const observer = new ResizeObserver(check);
    observer.observe(inner);
    if (barRef.current) observer.observe(barRef.current); // late web fonts
    return () => observer.disconnect();
  }, [narrow, needed]);

  // Close on navigation (links, language switch, back/forward).
  useEffect(
    () =>
      subscribeToLocation(() => {
        setOpenGroup(null);
        setMenuOpen(false);
      }),
    [],
  );

  // Close when the pointer goes down anywhere outside the header.
  useEffect(() => {
    if (!anyOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) closeAll();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [anyOpen]);

  /** Escape closes the open menu and returns focus to the button that opened it. */
  function onNavKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape" || !anyOpen) return;
    event.preventDefault();
    if (compact) {
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    } else if (openGroup) {
      document.getElementById(buttonId(openGroup))?.focus();
      setOpenGroup(null);
    }
  }

  /**
   * Keyboard focus moving out (Tab past the last link) closes the menu.
   * A pointer press on a non-focusable spot has no relatedTarget; outside
   * presses are handled by the pointerdown listener instead.
   */
  function focusLeft(event: FocusEvent<HTMLElement>): boolean {
    const next = event.relatedTarget as Node | null;
    return next !== null && !event.currentTarget.contains(next);
  }
  function onGroupBlur(group: NavGroupId) {
    return (event: FocusEvent<HTMLLIElement>) => {
      if (focusLeft(event)) setOpenGroup((open) => (open === group ? null : open));
    };
  }

  function onGroupButtonKeyDown(group: NavGroupId) {
    return (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      setOpenGroup(group);
      const first = event.key === "ArrowDown";
      // The panel renders on the next frame; then focus its first or last link.
      requestAnimationFrame(() => {
        const links = panelLinks(document.getElementById(panelId(group)));
        (first ? links[0] : links[links.length - 1])?.focus();
      });
    };
  }

  /**
   * Left/Right move between the top-level items (Home and the group
   * buttons) in visual order, so in Urdu (right-to-left) Left goes forward.
   */
  function onTopLevelKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(":scope > li > .masthead-top"));
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = (event.key === "ArrowRight") !== rtl;
    event.preventDefault();
    items[(index + (forward ? 1 : -1) + items.length) % items.length].focus();
  }

  const groupHasCurrent = (group: NavGroupId) =>
    navGroupTopics(group, topics).some((topic) => topic.id === current);

  const topicList = (group: NavGroupId, labelledBy: string) => (
    <ul className="masthead-menu-list" aria-labelledby={labelledBy}>
      {navGroupTopics(group, topics).map((topic) => {
        const href = topicHref(topic, locale);
        const title = ui.topics[topic.id]?.title ?? topic.title;
        return href ? (
          <li key={topic.id}>
            <Link to={href} className="masthead-link" aria-current={current === topic.id ? "page" : undefined}>
              <span className="masthead-link-icon">{ICONS[topic.icon]}</span>
              <span>{title}</span>
            </Link>
          </li>
        ) : (
          <li key={topic.id} className="masthead-upcoming">
            <span>
              <span className="masthead-link-icon">{ICONS[topic.icon]}</span>
              <span>{title}</span>
              <small aria-hidden="true">{ui.comingSoon}</small>
              <span className="sr-only">{ui.comingSoonSr}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );

  const homeLink = (className: string) => (
    <Link to={home} className={className} aria-current={current === "home" ? "page" : undefined}>
      {GUIDE_UI[locale].home}
    </Link>
  );

  // Narrow screens put search (and the language selector) before the Menu
  // button, so focus order follows the visual order.
  const actions = (
    <div ref={actionsRef} className="masthead-actions">
      {switchPath && (
        <GuideLanguageSelect locale={locale} pathFor={switchPath} className="guide-language-select masthead-language" />
      )}
      <Link
        to={homeAnchor("search")}
        className="masthead-search"
        aria-label={ui.searchLabel}
        onClick={onHomeSection(home, "home-search", true, closeAll)}
      >
        <Search size={21} aria-hidden="true" />
        <span className="masthead-search-text" aria-hidden="true">{ui.search.button}</span>
      </Link>
      {!compact && (
        <Link to={homeAnchor("about")} className="masthead-about" onClick={onHomeSection(home, "about", false)}>
          {ui.about}
        </Link>
      )}
    </div>
  );

  return (
    <header ref={headerRef} className={`masthead${compact ? " masthead--compact" : ""}`}>
      <div ref={innerRef} className="masthead-inner">
        <Link to={home} className="masthead-brand" aria-label={`Life in UK ${GUIDE_UI[locale].home}`}>
          <strong className="masthead-wordmark" lang="en" dir="ltr">
            <Wordmark />
          </strong>
          <span className="brand-caption">{ui.tagline}</span>
        </Link>
        {compact && actions}
        <nav
          className="masthead-nav"
          aria-label={ui.mainNav}
          onKeyDown={onNavKeyDown}
          onBlur={(event) => {
            if (compact && focusLeft(event)) setMenuOpen(false);
          }}
        >
          {compact ? (
            <>
              <button
                ref={menuButtonRef}
                type="button"
                className="masthead-menu-button"
                aria-expanded={menuOpen}
                aria-controls={menuPanelId}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
                <span>{ui.menu}</span>
              </button>
              <div id={menuPanelId} className="masthead-sheet" hidden={!menuOpen} onKeyDown={onPanelKeyDown}>
                <ul className="masthead-menu-list masthead-sheet-top">
                  <li>{homeLink("masthead-link")}</li>
                </ul>
                {navGroups.map((group) => (
                  <section key={group} className="masthead-sheet-group">
                    <p id={panelId(group)} className="masthead-group-label">
                      {ui.navGroups[group]}
                    </p>
                    {topicList(group, panelId(group))}
                  </section>
                ))}
                <ul className="masthead-menu-list masthead-sheet-about">
                  <li>
                    <Link
                      to={homeAnchor("about")}
                      className="masthead-link"
                      onClick={onHomeSection(home, "about", false, closeAll)}
                    >
                      {ui.about}
                    </Link>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <ul ref={barRef} className="masthead-bar" onKeyDown={onTopLevelKeyDown}>
              <li>{homeLink("masthead-top masthead-home")}</li>
              {navGroups.map((group) => {
                const open = openGroup === group;
                return (
                  <li key={group} className="masthead-group" onBlur={onGroupBlur(group)}>
                    <button
                      id={buttonId(group)}
                      type="button"
                      className={`masthead-top masthead-group-button${groupHasCurrent(group) ? " is-current" : ""}`}
                      aria-expanded={open}
                      aria-controls={panelId(group)}
                      onClick={() => setOpenGroup(open ? null : group)}
                      onKeyDown={onGroupButtonKeyDown(group)}
                    >
                      <span>{ui.navGroups[group]}</span>
                      <ChevronDown size={18} aria-hidden="true" className="masthead-chevron" />
                    </button>
                    <div id={panelId(group)} className="masthead-panel" hidden={!open} onKeyDown={onPanelKeyDown}>
                      {topicList(group, buttonId(group))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
        {!compact && actions}
      </div>
    </header>
  );
}
