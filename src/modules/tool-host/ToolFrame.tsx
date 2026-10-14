// MOD-ToolHost island: the embedded tool view (SCR-ToolView), header and tool area together, because the
// load state drives both (CMP-ToolHeader's slow variant).
// - Before loading: offline and not offline-capable shows the offline state, and the tool loads by itself on
//   the `online` event, with no reload of the portal (F-003.R6).
// - Loading: one iframe with the isolation attributes from MOD-SecurityPolicy (F-003.R3, ADR-0009); its `src`
//   is the tool's address plus the theme showing at that moment (F-012.R5, ADR-0011). The loading state shows
//   until the frame's `load` (F-003.R5); after RULE-11's threshold the header switches to its slow variant and
//   the same frame keeps loading.
// - Theme hand-off: connected for as long as the frame exists (F-012.R5/R6).
// - Open-in-new-tab uses the catalog address as is: no theme (F-012.R5).
// Strings, icons and attributes arrive as build-time props, so the island ships no copy catalog or icon set.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { FrameAttributes } from '../security-policy/frame.ts';
import FavoriteToggle, { type FavoriteToggleLabels } from '../design-system/FavoriteToggle.tsx';
import ToolHeader, { type ToolHeaderText } from '../design-system/ToolHeader.tsx';
import { theme } from '../theme/index.ts';
import { initialPhase, SLOW_LOAD_MS, type ToolPhase } from './phase.ts';
import { connectThemeHandoff, embeddedSrc, type HandoffTheme } from './theme-handoff.ts';

export interface ToolFrameProps {
  tool: { id: string; name: string; url: string; offline: boolean };
  /** frameAttributesFor(tool) plus the frame's title (COPY-tool.frameLabel). */
  frame: FrameAttributes & { title: string };
  header: ToolHeaderText;
  favorite: { labels: FavoriteToggleLabels; star: string };
  /** COPY-tool.loading for this tool. */
  loading: string;
  /** The offline state (CMP-StateMessage page variant with COPY-tool.offline), rendered by Astro at build. */
  children?: ComponentChildren;
}

export default function ToolFrame({ tool, frame, header, favorite, loading, children }: ToolFrameProps) {
  // Before hydration (the build has no device): the loading state, with no frame yet.
  const [phase, setPhase] = useState<ToolPhase>('loading');
  const [src, setSrc] = useState<string | null>(null);
  const srcTheme = useRef<HandoffTheme>('dark');
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const start = () => {
      srcTheme.current = theme().shownTheme.peek();
      setSrc(embeddedSrc(tool.url, srcTheme.current));
      setPhase('loading');
    };
    if (initialPhase({ online: navigator.onLine, offlineCapable: tool.offline }) === 'loading') return start();
    setPhase('offline');
    window.addEventListener('online', start, { once: true });
    return () => window.removeEventListener('online', start);
  }, [tool.url, tool.offline]);

  // RULE-11: the slow hint; the frame is left alone and keeps loading.
  useEffect(() => {
    if (phase !== 'loading' || !src) return;
    const timer = setTimeout(() => setPhase((p) => (p === 'loading' ? 'slow' : p)), SLOW_LOAD_MS);
    return () => clearTimeout(timer);
  }, [phase, src]);

  useEffect(() => {
    if (!src || !frameRef.current) return;
    return connectThemeHandoff({
      frame: frameRef.current,
      toolUrl: tool.url,
      srcTheme: srcTheme.current,
      theme: theme().shownTheme,
      host: window,
    });
  }, [src, tool.url]);

  const waiting = phase === 'loading' || phase === 'slow';
  return (
    <>
      <ToolHeader name={tool.name} openHref={tool.url} slow={phase === 'slow'} text={header}>
        <FavoriteToggle toolId={tool.id} labels={favorite.labels} appearance="plain">
          {/* Build-time SVG from the icon set (DEP-15). */}
          <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: favorite.star }} />
        </FavoriteToggle>
      </ToolHeader>
      <section id="tool" class="tk-toolarea" aria-label={frame.title} tabindex={-1} data-phase={phase}>
        {phase === 'offline' ? (
          children
        ) : (
          <>
            {src && (
              <iframe
                ref={frameRef}
                src={src}
                title={frame.title}
                sandbox={frame.sandbox}
                allow={frame.allow}
                referrerpolicy={frame.referrerpolicy}
                onLoad={() => setPhase('loaded')}
              />
            )}
            {waiting && (
              <div class="tk-toolarea__loading" role="status">
                <span class="tk-spinner" aria-hidden="true" />
                <span>{loading}</span>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
