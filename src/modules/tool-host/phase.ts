// MOD-ToolHost: the embedded tool view's states (SCR-ToolView). Pure.
// offline → loading → (slow →) loaded. The frame exists from `loading` on and is never torn down by `slow`.

/** RULE-11: after 10 seconds without the tool loaded, suggest opening it in a new tab, and keep waiting. */
export const SLOW_LOAD_MS = 10_000;

export type ToolPhase = 'offline' | 'loading' | 'slow' | 'loaded';

/** F-003.R6: offline and not offline-capable shows the offline state instead of the tool; else it loads. */
export function initialPhase({ online, offlineCapable }: { online: boolean; offlineCapable: boolean }): ToolPhase {
  return !online && !offlineCapable ? 'offline' : 'loading';
}
