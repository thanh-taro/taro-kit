// MOD-Pages: SCR-Home's two inline scripts, inlined as source in src/pages/index.astro and hashed for the CSP
// (ADR-0009). Browser-safe; each `…Main` and `predictHome` must stay self-contained (no imports, no outer variables
// at run time), since they are inlined with `.toString()`. No comments inside them: their source is collapsed onto
// one line, where a line comment would swallow the code after it (a unit test checks).
// - The clock script, right after the greeting (F-007.R1): sets the greeting and the local date and time before
//   first paint, then again at the start of every minute. Its formatters are built anew on each update, so a time
//   zone change applies on the next minute (F-007 edge case). The clock is not a live region (SCR-Home).
//   Both languages (F-019.R4, ADR-0012): the greeting, date and time are written into each language's element
//   (`[data-l]`, marked with its `lang`), each with Intl in that language, so a switch is only CSS, like every <L>.
// - The reserve script, right after the personal region (F-007.R3, R6): predicts from device storage whether home
//   is in its empty or default state, and which invitation the device gets, so the islands' first paint matches
//   what they will show; in the default state it adds invisible placeholders the size of the favorites and recents
//   sections, so the rows below don't move when the island fills them in. Its headings are in the language showing
//   (the root's `lang`, set by the blocking script before this runs); the placeholders are invisible.
import { tBoth } from '../../copy/index.ts';
import type { Loc } from '../../language/languages.ts';
import { isTimestamp, isToolId } from '../../personal-data/entry-checks.ts';

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
  /** Per language: COPY-home.greetingMorning, …Afternoon, …Evening. */
  greetings: Record<string, Record<GreetingPeriod, string>>;
}

function homeClockMain(c: ClockConfig, period: typeof greetingPeriod): void {
  const d = document;
  const h = d.getElementById(c.ids.greeting);
  const day = d.getElementById(c.ids.date);
  const time = d.getElementById(c.ids.time);
  const stamp = d.getElementById(c.ids.clock);
  if (!h || !day || !time || !stamp) return;
  const two = (n: number) => (n < 10 ? '0' : '') + n;
  const each = (el: Element, text: (lang: string) => string) => {
    const parts = el.querySelectorAll('[data-l]');
    for (let i = 0; i < parts.length; i++) {
      const lang = parts[i]!.getAttribute('lang') || 'en-US';
      parts[i]!.textContent = text(lang);
    }
  };
  function tick() {
    const now = new Date();
    each(h!, (lang) => c.greetings[lang]![period(now.getHours())]);
    each(day!, (lang) =>
      new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short' }).format(now),
    );
    each(time!, (lang) => new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit' }).format(now));
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
  const morning = tBoth('COPY-home.greetingMorning');
  const afternoon = tBoth('COPY-home.greetingAfternoon');
  const evening = tBoth('COPY-home.greetingEvening');
  const config: ClockConfig = {
    ids: HOME_IDS,
    greetings: {
      'en-US': { morning: morning['en-US'], afternoon: afternoon['en-US'], evening: evening['en-US'] },
      'vi-VN': { morning: morning['vi-VN'], afternoon: afternoon['vi-VN'], evening: evening['vi-VN'] },
    },
  };
  return `(${homeClockMain})(${json(config)},${greetingPeriod})`.replace(/\s+/g, ' ');
}

/**
 * F-007.R3 before first paint: the favorites and recents home will show (tool ids, in order), from the stored
 * document (`tarokit.personal`, equal to MOD-PersonalData's STORAGE_KEY). Mirrors MOD-PersonalData: entries with a
 * catalog id and a time are kept, the first of each tool, up to the stored limits (24 favorites, 20 recents); then
 * the visible favorites, and the visible recents that are not favorites, at most 8 (RULE-01). Entries are checked
 * with MOD-PersonalData's own `isToolId` and `isTimestamp` (entry-checks.ts, passed in when inlined). Storage that
 * fails the store's write probe (refused, or full) is what the store treats as unavailable, so the island starts with
 * an empty session: nothing is predicted, as for unreadable text. A unit test keeps it in step with the store.
 */
export function predictHome(
  visibleIds: readonly string[],
  toolId: (v: unknown) => boolean = isToolId,
  timestamp: (v: unknown) => boolean = isTimestamp,
): { favorites: string[]; recents: string[] } {
  try {
    const storage = localStorage;
    storage.setItem('tarokit.probe', '1');
    storage.removeItem('tarokit.probe');
    const doc = JSON.parse(storage.getItem('tarokit.personal') || 'null');
    const visible: Record<string, boolean> = Object.create(null);
    for (let i = 0; i < visibleIds.length; i++) visible[visibleIds[i]!] = true;
    const kept = (list: unknown, at: string, limit: number): string[] => {
      const out: string[] = [];
      const seen: Record<string, boolean> = Object.create(null);
      if (!Array.isArray(list)) return out;
      for (let i = 0; i < list.length && out.length < limit; i++) {
        const e = list[i];
        const id = e && e.toolId;
        if (!toolId(id) || !timestamp(e[at]) || seen[id]) continue;
        seen[id] = true;
        out.push(id);
      }
      return out;
    };
    const favs = kept(doc && doc.favorites, 'pinnedAt', 24);
    const isFav: Record<string, boolean> = Object.create(null);
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
  headings: { favorites: Loc; recents: Loc };
  /** COPY-tool.unavailable */
  unavailable: Loc;
}

// The placeholders use the same markup and classes as the real sections (HomePersonal's favorites, RecentTools)
// and each tool's name, so each takes the same space (one line, F-007.R8); on a device that starts offline, cards of
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
  const lang = (d.documentElement.getAttribute('lang') === 'vi-VN' ? 'vi-VN' : 'en-US') as 'en-US' | 'vi-VN';
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
      if (offline && tool[1]) card.appendChild(el('span', 'tk-toolcard__unavailable', c.unavailable[lang]));
      const li = d.createElement('li');
      li.appendChild(card);
      list.appendChild(li);
    }
    s.appendChild(list);
    reserve.appendChild(s);
  };
  section(c.headings.favorites[lang], n.favorites, 'tk-favorites', true);
  section(c.headings.recents[lang], n.recents, 'tk-recents', false);
}

/** The reserve script's source, with this build's visible tools and the section headings (build-time copy). */
export function homeReserveScript(tools: Record<string, ReserveTool>, headings: ReserveConfig['headings']): string {
  const config: ReserveConfig = {
    id: HOME_IDS.personal,
    tools,
    headings,
    unavailable: tBoth('COPY-tool.unavailable'),
  };
  const predict = `function(ids){return (${predictHome})(ids,${isToolId},${isTimestamp})}`;
  return `(${homeReserveMain})(${json(config)},${predict})`.replace(/\s+/g, ' ');
}
