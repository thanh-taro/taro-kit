// MOD-DesignSystem: CMP-StateMessage, the single source of its markup (class contract in styles/state-message.css).
// Islands that show a state after load (the catalog's no-results, F-002.R5) use it directly; static pages use
// StateMessage.astro, which renders it without hydration. Design: design/canvas/CMP-StateMessage.dc.html.
// Anatomy: icon tile, title, body, optional primary action; extra actions are the children.
// - `headingLevel` makes the title a heading; `page` (the whole-page variant) defaults it to 2.
// - `live` adds role="status" to the title and body only (not the actions), for messages that appear after the
//   page has loaded (polite announcement, CMP-StateMessage accessibility).
// - `detail`: a short mono line under the title; `action.newTab` opens with no opener or referrer.
import type { ComponentChildren } from 'preact';

export type StateMessageVariant = 'empty' | 'no-results' | 'offline' | 'info' | 'not-found';

export interface StateMessageProps {
  variant: StateMessageVariant;
  /** Text, or inline markup from an island (such as a key cap, F-007.R6). */
  title: ComponentChildren;
  body?: string;
  /** The next best action (PRN-05). */
  action?: { href: string; label: string; newTab?: boolean };
  /** Whole-page layout (CMP-StateMessage "page" variant). */
  page?: boolean;
  detail?: string;
  /** Build-time inline SVG of the icon (`iconSvg`), never user or runtime data. */
  iconSvg: string;
  headingLevel?: 1 | 2 | 3;
  live?: boolean;
  /** Extra actions (links or buttons); they get the 44 px target (NFR-09). */
  children?: ComponentChildren;
}

export default function StateMessage({
  variant,
  title,
  body,
  action,
  page = false,
  detail,
  iconSvg,
  headingLevel,
  live = false,
  children,
}: StateMessageProps) {
  const level = headingLevel ?? (page ? 2 : undefined);
  const Title = level ? (`h${level}` as const) : 'p';
  return (
    <div class="tk-state" data-variant={variant} data-page={page ? '' : undefined}>
      <span class="tk-state__icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: iconSvg }} />
      <div class="tk-state__text">
        <div class="tk-state__message" role={live ? 'status' : undefined}>
          <Title class="tk-state__title">{title}</Title>
          {body && <p class="tk-state__body">{body}</p>}
        </div>
        {detail && <p class="tk-state__detail">{detail}</p>}
        {(action || children) && (
          <div class="tk-state__actions">
            {action && (
              <a
                class="tk-state__primary"
                href={action.href}
                target={action.newTab ? '_blank' : undefined}
                rel={action.newTab ? 'noopener noreferrer' : undefined}
              >
                {action.label}
              </a>
            )}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
