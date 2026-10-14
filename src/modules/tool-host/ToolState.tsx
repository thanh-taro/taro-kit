// MOD-ToolHost seam for CMP-StateMessage in the tool view: the offline state (F-003.R6) and the linked note
// (F-003.R4), both the "page" variant (centered, larger icon tile, the title as a display heading).
// The shared CMP-StateMessage arrives in MOD-DesignSystem with F-016 (StateMessage.astro); the offline state
// renders inside the ToolFrame island, so this Preact markup is kept here, behind this one component, and is
// switched to the shared class contract when that lands. Design: CMP-StateMessage.dc.html, ToolStates*, LinkedDesktop.
import './tool-state.css';

export interface ToolStateProps {
  variant: 'offline' | 'info';
  /** Build-time SVG markup from the icon set, never user or runtime data. */
  icon: string;
  title: string;
  /** A short mono line under the title, such as the tool's site. */
  detail?: string;
  action?: { href: string; label: string; icon?: string };
  /** Shown after the page has loaded: a polite status, so it is announced (CMP-StateMessage accessibility). */
  live?: boolean;
}

export default function ToolState({ variant, icon, title, detail, action, live = false }: ToolStateProps) {
  return (
    <div class="tk-toolstate" data-variant={variant} data-layout="page" role={live ? 'status' : undefined}>
      <span class="tk-toolstate__icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon }} />
      <div class="tk-toolstate__text">
        <h2 class="tk-toolstate__title">{title}</h2>
        {detail && <p class="tk-toolstate__detail">{detail}</p>}
        {action && (
          <div class="tk-toolstate__actions">
            {/* A linked tool's own address in a new tab, with no opener or referrer (F-003.R4). */}
            <a class="tk-toolstate__action" data-primary="" href={action.href} target="_blank" rel="noopener noreferrer">
              {action.label}
              {action.icon && <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: action.icon }} />}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
