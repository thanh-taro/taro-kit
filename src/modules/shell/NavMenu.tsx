// MOD-Shell island: the main navigation (CMP-AppShell). On wide screens the links sit in the header;
// on narrow screens (variant "narrow") they collapse behind the Menu button (COPY-nav.menu), which
// opens a panel: aria-expanded on the button, focus moves to the first link, Esc closes and returns
// focus to the button, and leaving the panel (click or focus elsewhere) closes it.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useHydrated } from './hydrated.ts';

export interface NavItem {
  href: string;
  label: string;
  current: boolean;
  /** The current page is inside this item's section (a category page under Tools): aria-current="true". */
  inSection?: boolean;
  /** Shown only in the narrow menu (the settings link, which is an icon in the wide header). */
  narrowOnly?: boolean;
}

interface Props {
  items: NavItem[];
  /** COPY-nav.menu */
  menuLabel: string;
  /** Inline SVG markup for the menu icon. */
  menuIcon: string;
}

export default function NavMenu({ items, menuLabel, menuIcon }: Props) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Focus moves into the panel as soon as it is shown, before the next key press can land elsewhere.
  useLayoutEffect(() => {
    if (open) navRef.current?.querySelector<HTMLAnchorElement>('.list a')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const onFocusOut = (e: FocusEvent) => {
    // relatedTarget is null when focus leaves for the page body or the browser itself.
    const next = e.relatedTarget as Node | null;
    if (open && !navRef.current?.contains(next)) setOpen(false);
  };

  return (
    <nav class="nav" ref={navRef} data-open={open ? '' : undefined} onFocusOut={onFocusOut}>
      <button
        type="button"
        class="menu"
        ref={buttonRef}
        aria-expanded={open ? 'true' : 'false'}
        aria-controls="main-menu"
        disabled={!hydrated}
        onClick={() => setOpen(!open)}
      >
        {/* menuIcon is build-time SVG from the icon set (DEP-15), never user or runtime data. */}
        <span dangerouslySetInnerHTML={{ __html: menuIcon }} />
        {menuLabel}
      </button>
      <ul id="main-menu" class="list">
        {items.map((item) => (
          <li key={item.href} class={item.narrowOnly ? 'narrow-only' : undefined}>
            <a href={item.href} aria-current={item.current ? 'page' : item.inSection ? 'true' : undefined}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
