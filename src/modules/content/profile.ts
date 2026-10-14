// MOD-Content derived views of the profile (ENT-Profile), as SCR-About shows it. Pure, no Node imports.
// Implements: F-008.R1 (initials when there is no avatar; paragraph breaks kept), F-008.R2 (link behavior).

/** A profile link ready to render (F-008.R2). */
export interface ProfileLink {
  label: string;
  href: string;
  kind: 'email' | 'social' | 'website' | 'code' | 'other';
  /** Web links open in a new tab; email links start a message in the mail app. */
  newTab: boolean;
  /** Where the link goes, shortened: host and path for web links, the address for email links. */
  detail: string;
}

/** The initials of the full name, one per word, upper case (F-008.R1: shown when there is no avatar). */
export const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('en'))
    .join('');

/** Long text split at blank lines, so paragraph breaks survive (F-008 edge case). */
export const paragraphs = (text: string): string[] =>
  text
    .split(/\n[^\S\n]*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** Profile links with their kind, new-tab behavior and destination (F-008.R2). */
export function profileLinks(
  links: readonly { label: string; url: string; kind?: ProfileLink['kind'] }[],
): ProfileLink[] {
  return links.map(({ label, url, kind }): ProfileLink => {
    if (url.startsWith('mailto:')) {
      const address = decodeURIComponent(url.slice('mailto:'.length).split('?')[0] ?? '');
      return { label, href: url, kind: 'email', newTab: false, detail: address };
    }
    const u = new URL(url);
    const detail = `${u.host.replace(/^www\./, '')}${u.pathname}`.replace(/\/$/, '');
    return { label, href: url, kind: kind ?? 'other', newTab: true, detail };
  });
}
