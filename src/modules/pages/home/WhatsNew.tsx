// MOD-Pages island: SCR-Home region 7, what's new (COPY-home.whatsNew). Design: HomeDesktop / HomeMobile.
// Implements: F-007.R4 with RULE-04 applied in the browser against the viewer's local date (`whatsNew`,
// `localDate`), never the build's: one item per visible tool, labeled added or updated by its latest date,
// newest first, at most 6; the section is shown only when it has items.
// - Each item: the kind (the part of COPY-now.changelogAdded / COPY-now.changelogUpdated before {tool}), the tool's
//   name as a link to its portal address (as on SCR-Now), its summary and its date (text formatted at build; the
//   short text is hidden from assistive technology, which reads the full date, as on SCR-Now).
// - Before hydration nothing renders. As home's last region, its appearing moves nothing above it.
// - `data-tk-whatsnew-ready` marks the island as run, also when there is nothing to show.
import { useEffect, useId, useState } from 'preact/hooks';
import { toolPath } from '../../content/derive.ts';
import type { DateText } from '../now/now.ts';
import { localDate, whatsNew } from '../whats-new.ts';
import './home.css';

/** A what's new candidate: a visible tool's id, name, summary and dates (YYYY-MM-DD). */
export interface WhatsNewTool {
  id: string;
  name: string;
  summary: string;
  added: string;
  updated?: string;
}

export interface WhatsNewProps {
  tools: WhatsNewTool[];
  /** Each candidate date's text, formatted once at build. */
  dates: Record<string, DateText>;
  /** The kind labels: "Added" and "Improved". */
  labels: { added: string; updated: string };
  /** COPY-home.whatsNew */
  heading: string;
}

export default function WhatsNew({ tools, dates, labels, heading }: WhatsNewProps) {
  const headingId = useId();
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(localDate()), []);
  if (!today) return null;
  const items = whatsNew(tools, today);
  const byId = new Map(tools.map((t) => [t.id, t]));
  if (items.length === 0) return <span data-tk-whatsnew-ready hidden />;
  return (
    <section class="tk-whatsnew" aria-labelledby={headingId} data-tk-whatsnew-ready>
      <h2 id={headingId} class="tk-whatsnew__heading">
        {heading}
      </h2>
      <ul class="tk-whatsnew__list">
        {items.map((item) => {
          const date = dates[item.date];
          return (
            <li key={item.id} class="tk-whatsnew__item" data-type={item.type}>
              <span class="tk-whatsnew__kind">{item.type === 'updated' ? labels.updated : labels.added}</span>
              <a class="tk-whatsnew__link" href={toolPath(item.id)}>
                {item.name}
              </a>
              <span class="tk-whatsnew__summary">{byId.get(item.id)?.summary}</span>
              {date && (
                <time class="tk-whatsnew__date" dateTime={date.iso}>
                  <span aria-hidden="true">{date.shown}</span>
                  <span class="tk-visually-hidden">{date.full}</span>
                </time>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
