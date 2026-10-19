// MOD-Pages: SCR-Home's two inline scripts, inlined as source in src/pages/index.astro and hashed for the CSP
// (ADR-0009). Browser-safe; each `…Main` and `predictHome` must stay self-contained (no imports, no outer variables
// at run time), since they are inlined with `.toString()`. No comments inside them: their source is collapsed onto
// one line, where a line comment would swallow the code after it (a unit test checks).
// - The clock script, right after the greeting (F-007.R1): sets the greeting and the local date and time before
//   first paint, then again at the start of every minute. Its formatters are built anew on each update, so a time
//   zone change applies on the next minute (F-007 edge case). The clock is not a live region (SCR-Home).
// - The reserve script, right after the personal region (F-007.R3, R6): predicts from device storage whether home
//   is in its empty or default state, and which invitation the device gets, so the islands' first paint matches
//   what they will show; in the default state it adds invisible placeholders the size of the favorites and recents
//   sections, so the rows below don't move when the island fills them in.
import { t } from '../../copy/index.ts';

/** JSON for an inline script: `<` escaped, so content (a tool name) can never close the script element. */
const json = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

/** F-007.R1: 05:00–11:59 morning, 12:00–17:59 afternoon, otherwise evening (COPY-home.greeting*). */
export function greetingPeriod(hour: number): GreetingPeriod {
  return hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening';
}

/** Element ids the scripts and the page share. */
export const HOME_IDS = {
  greeting: 'home-greeting',
  date: 'home-date',
  time: 'home-time',
  clock: 'home-clock-time',
  personal: 'tk-home-personal',
} as const;

interface ClockConfig {
  ids: typeof HOME_IDS;
  greetings: Record<GreetingPeriod, string>;
}

function homeClockMain(c: ClockConfig, period: typeof greetingPeriod): void {
  const d = document;
  const h = d.getElementById(c.ids.greeting);
  const day = d.getElementById(c.ids.date);
  const time = d.getElementById(c.ids.time);
  const stamp = d.getElementById(c.ids.clock);
  if (!h || !day || !time || !stamp) return;
  const two = (n: number) => (n < 10 ? '0' : '') + n;
  function tick() {
    const now = new Date();
    h!.textContent = c.greetings[period(now.getHours())];
    day!.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(
      now,
    );
    time!.textContent = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(now);
    stamp!.setAttribute(
      'datetime',
      now.getFullYear() +
        '-' +
        two(now.getMonth() + 1) +
        '-' +
        two(now.getDate()) +
        'T' +
        two(now.getHours()) +
        ':' +
        two(now.getMinutes()),
    );
    setTimeout(tick, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
  }
  tick();
}

/** The clock script's source (build-time copy only). */
export function homeClockScript(): string {
  const config: ClockConfig = {
    ids: HOME_IDS,
    greetings: {
      morning: t('COPY-home.greetingMorning'),
      afternoon: t('COPY-home.greetingAfternoon'),
      evening: t('COPY-home.greetingEvening'),
    },
  };
  return `(${homeClockMain})(${json(config)},${greetingPeriod})`.replace(/\s+/g, ' ');
}

/**
 * F-007.R3 before first paint: the favorites and recents home will show (tool ids, in order), from the stored
 * document (`tarokit.personal`, equal to MOD-PersonalData's STORAGE_KEY). Mirrors MOD-PersonalData: entries with a
 * catalog id and a time are kept, the first of each tool, up to the stored limits (24 favorites, 20 recents); then
 * the visible favorites, and the visible recents that are not favorites, at most 8 (RULE-01). Unreadable or refused
 * storage predicts nothing stored. A unit test keeps it in step with `visibleFavorites` and `visibleRecents`.
 */
export function predictHome(visibleIds: readonly string[]): { favorites: string[]; recents: string[] } {
  try {
    const doc = JSON.parse(localStorage.getItem('tarokit.personal') || 'null');
    const visible: Record<string, boolean> = {};
    for (let i = 0; i < visibleIds.length; i++) visible[visibleIds[i]!] = true;
    const kept = (list: unknown, at: string, limit: number): string[] => {
      const out: string[] = [];
      const seen: Record<string, boolean> = {};
      if (!Array.isArray(list)) return out;
      for (let i = 0; i < list.length && out.length < limit; i++) {
        const e = list[i];
        const id = e && e.toolId;
        if (typeof id !== 'string' || id.length > 48 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) continue;
        if (typeof e[at] !== 'string' || isNaN(Date.parse(e[at])) || seen[id]) continue;
        seen[id] = true;
        out.push(id);
      }
      return out;
    };
    const favs = kept(doc && doc.favorites, 'pinnedAt', 24);
    const isFav: Record<string, boolean> = {};
    for (let i = 0; i < favs.length; i++) isFav[favs[i]!] = true;
    const recs = kept(doc && doc.recents, 'openedAt', 20).filter((id) => visible[id] && !isFav[id]);
    return { favorites: favs.filter((id) => visible[id]), recents: recs.slice(0, 8) };
  } catch {
    return { favorites: [], recents: [] };
  }
}

/** A visible tool for the placeholders: its name, and 1 when it needs the internet (F-011.R3), otherwise 0. */
export type ReserveTool = [name: string, needsInternet: 0 | 1];

interface ReserveConfig {
  id: string;
  tools: Record<string, ReserveTool>;
  headings: { favorites: string; recents: string };
  /** COPY-tool.unavailable */
  unavailable: string;
}

// The placeholders use the same markup and classes as the real sections (HomePersonal's favorites, RecentTools)
// and each tool's name, so each takes the same space, wrapping included; on a device that starts offline, cards of
// tools that need the internet also get their unavailable line (F-011.R3).
function homeReserveMain(c: ReserveConfig, predict: typeof predictHome): void {
  const d = document;
  const root = d.getElementById(c.id);
  if (!root) return;
  const n = predict(Object.keys(c.tools));
  root.setAttribute('data-state', n.favorites.length + n.recents.length > 0 ? 'default' : 'empty');
  root.setAttribute(
    'data-input',
    matchMedia('(any-hover: none) and (any-pointer: coarse)').matches ? 'touch' : 'keyboard',
  );
  const reserve = root.querySelector('[data-tk-home-reserve]');
  if (!reserve) return;
  const offline = navigator.onLine === false;
  const el = (tag: string, cls: string, text?: string) => {
    const e = d.createElement(tag);
    e.className = cls;
    if (text) e.textContent = text;
    return e;
  };
  const section = (heading: string, ids: string[], cls: string, withCount: boolean) => {
    if (!ids.length) return;
    const s = el('section', cls);
    const h2 = el('h2', cls + '__heading', heading);
    if (withCount) {
      const head = el('div', cls + '__head');
      head.appendChild(h2);
      head.appendChild(el('span', cls + '__count', String(ids.length)));
      s.appendChild(head);
    } else s.appendChild(h2);
    const list = el('ul', cls + '__list');
    for (let i = 0; i < ids.length; i++) {
      const tool = c.tools[ids[i]!]!;
      const card = el('div', 'tk-toolcard');
      card.setAttribute('data-variant', 'compact');
      const top = el('div', 'tk-toolcard__head');
      top.appendChild(el('span', 'tk-toolcard__icon'));
      const text = el('div', 'tk-toolcard__text');
      text.appendChild(el('span', 'tk-toolcard__link', tool[0]));
      top.appendChild(text);
      card.appendChild(top);
      if (offline && tool[1]) card.appendChild(el('span', 'tk-toolcard__unavailable', c.unavailable));
      const li = d.createElement('li');
      li.appendChild(card);
      list.appendChild(li);
    }
    s.appendChild(list);
    reserve.appendChild(s);
  };
  section(c.headings.favorites, n.favorites, 'tk-favorites', true);
  section(c.headings.recents, n.recents, 'tk-recents', false);
}

/** The reserve script's source, with this build's visible tools and the section headings (build-time copy). */
export function homeReserveScript(tools: Record<string, ReserveTool>, headings: ReserveConfig['headings']): string {
  const config: ReserveConfig = { id: HOME_IDS.personal, tools, headings, unavailable: t('COPY-tool.unavailable') };
  return `(${homeReserveMain})(${json(config)},${predictHome})`.replace(/\s+/g, ' ');
}
