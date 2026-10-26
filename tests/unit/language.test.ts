// MOD-Language (F-019.R1–R3, RULE-16, ADR-0012): resolving the language showing, the inline script that applies it
// before first paint, choosing and switching, and swapping localized attributes.
import { describe, expect, test } from 'vitest';
import { createLanguage, resolveLanguage, swapLocalizedAttributes } from '../../src/modules/language/index.ts';
import { localizedAttrs, mergeAttrs } from '../../src/modules/language/attrs.ts';
import { languageInlineScript } from '../../src/modules/language/inline.ts';
import {
  createPersonalDataStore,
  emptyDocument,
  readStoredLanguage,
  SCHEMA_VERSION,
  STORAGE_KEY,
} from '../../src/modules/personal-data/index.ts';
import { themeInlineScript } from '../../src/modules/theme/inline.ts';
import { FakeStorage } from './fakes.ts';

/** An element with attributes, enough for the root element, <title> and localized-attribute elements. */
class El {
  attrs = new Map<string, string>();
  constructor(init: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(init)) this.attrs.set(k, v);
  }
  getAttribute(n: string) {
    return this.attrs.get(n) ?? null;
  }
  setAttribute(n: string, v: string) {
    this.attrs.set(n, v);
  }
  hasAttribute(n: string) {
    return this.attrs.has(n);
  }
}

/** A document holding a root, a title and some elements with localized attributes. */
function fakeDocument(elements: El[] = [], titles?: { en: string; vi: string }) {
  const root = new El({ lang: 'en-US', 'data-lang': 'en-US' });
  const title = titles ? new El({ 'data-l-en-US': titles.en, 'data-l-vi-VN': titles.vi }) : undefined;
  const doc = {
    documentElement: root,
    title: titles?.en ?? '',
    readyState: 'complete',
    querySelector: (q: string) => (q === 'title' ? (title ?? null) : null),
    querySelectorAll: (q: string) => (q === '[data-l-a]' ? elements.filter((e) => e.hasAttribute('data-l-a')) : []),
    addEventListener() {},
    removeEventListener() {},
  };
  return { root, doc };
}

describe('RULE-16 resolving the language showing', () => {
  test('RULE-16 the first preferred language whose primary language is en or vi wins', () => {
    expect(resolveLanguage(undefined, ['vi', 'en'])).toBe('vi-VN');
    expect(resolveLanguage(undefined, ['en-GB', 'vi-VN'])).toBe('en-US');
    expect(resolveLanguage(undefined, ['fr-FR', 'VI', 'en'])).toBe('vi-VN');
    expect(resolveLanguage(undefined, ['en-AU'])).toBe('en-US');
  });

  test('RULE-16 with none of them, en-US', () => {
    expect(resolveLanguage(undefined, ['fr', 'de'])).toBe('en-US');
    expect(resolveLanguage(undefined, [])).toBe('en-US');
    expect(resolveLanguage(undefined, ['vietnamese', 'english'])).toBe('en-US');
  });

  test('RULE-16 a stored choice wins over the device', () => {
    expect(resolveLanguage('en-US', ['vi'])).toBe('en-US');
    expect(resolveLanguage('vi-VN', ['en-US'])).toBe('vi-VN');
  });
});

describe('the inline script (before first paint)', () => {
  function run({ stored, device }: { stored?: string | null; device: string[] }) {
    const storage = new FakeStorage();
    if (stored !== undefined && stored !== null)
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...emptyDocument(), preferences: { theme: 'system', language: stored } }),
      );
    const { root, doc } = fakeDocument([], { en: 'Now — TaroKit', vi: 'Dạo này — TaroKit' });
    const navigator = { languages: device, language: device[0] };
    new Function('localStorage', 'navigator', 'document', 'MutationObserver', languageInlineScript)(
      storage,
      navigator,
      doc,
      undefined,
    );
    return { lang: root.getAttribute('lang'), dataLang: root.getAttribute('data-lang'), title: doc.title };
  }

  test('F019_AC1 with no stored language and a device preferring vi, then en, the page declares vi-VN', () => {
    expect(run({ device: ['vi', 'en'] })).toEqual({ lang: 'vi-VN', dataLang: 'vi-VN', title: 'Dạo này — TaroKit' });
  });

  test('F019_AC2 with no stored language and a device preferring fr, then de, the page stays en-US', () => {
    expect(run({ device: ['fr', 'de'] })).toEqual({ lang: 'en-US', dataLang: 'en-US', title: 'Now — TaroKit' });
  });

  test('F019_AC4 a stored Vietnamese choice is applied before anything paints, even on an English device', () => {
    expect(run({ stored: 'vi-VN', device: ['en-US'] }).lang).toBe('vi-VN');
    expect(run({ stored: 'en-US', device: ['vi-VN'] }).lang).toBe('en-US');
  });

  test('F-019.R3 an unknown stored language is ignored and the device decides', () => {
    expect(run({ stored: 'fr-FR', device: ['vi'] }).lang).toBe('vi-VN');
  });

  test('ADR-0012 the theme and language scripts are one inline script (one CSP hash)', () => {
    expect(themeInlineScript).toContain(languageInlineScript);
  });

  test('readStoredLanguage reads only en-US or vi-VN, and nothing when storage is unavailable', () => {
    const storage = new FakeStorage();
    const read = () => new Function('localStorage', `return (${readStoredLanguage.toString()})()`)(storage);
    expect(read()).toBeUndefined();
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyDocument(), preferences: { language: 'vi-VN' } }));
    expect(read()).toBe('vi-VN');
    storage.setItem(STORAGE_KEY, '{oops');
    expect(read()).toBeUndefined();
    expect(
      new Function('localStorage', `return (${readStoredLanguage.toString()})()`)({
        getItem() {
          throw new DOMException('denied', 'SecurityError');
        },
      }),
    ).toBeUndefined();
  });
});

describe('choosing and switching (MOD-Language)', () => {
  function setup({
    device,
    stored,
    storage = new FakeStorage(),
  }: {
    device: string[];
    stored?: string;
    storage?: FakeStorage;
  }) {
    if (stored)
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...emptyDocument(), preferences: { theme: 'system', language: stored } }),
      );
    const store = createPersonalDataStore({ storage: () => storage });
    const el = new El(localizedAttrs('placeholder', { 'en-US': 'Filter my tools', 'vi-VN': 'Lọc công cụ' }));
    const { root, doc } = fakeDocument([el], { en: 'My tools — TaroKit', vi: 'Công cụ — TaroKit' });
    const language = createLanguage({ store, device: () => device, doc: doc as unknown as Document });
    const storedLanguage = () => JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')?.preferences?.language;
    return { storage, store, language, root, doc, el, storedLanguage };
  }

  test('F019_AC5 picking Tiếng Việt applies at once and stores vi-VN', () => {
    const { language, root, doc, el, storedLanguage } = setup({ device: ['en-US'] });
    expect(language.shownLanguage.value).toBe('en-US');
    language.setLanguage('vi-VN');
    expect(language.shownLanguage.value).toBe('vi-VN');
    expect(root.getAttribute('lang')).toBe('vi-VN');
    expect(root.getAttribute('data-lang')).toBe('vi-VN');
    expect(doc.title).toBe('Công cụ — TaroKit');
    expect(el.getAttribute('placeholder')).toBe('Lọc công cụ');
    expect(storedLanguage()).toBe('vi-VN');
  });

  test('F019_AC24 following the device again on an English device shows English and stores no language', () => {
    const { language, root, storedLanguage, el } = setup({ device: ['en-US'], stored: 'vi-VN' });
    expect(language.shownLanguage.value).toBe('vi-VN');
    language.setLanguage(null);
    expect(language.shownLanguage.value).toBe('en-US');
    expect(language.choice.value).toBeUndefined();
    expect(root.getAttribute('lang')).toBe('en-US');
    expect(el.getAttribute('placeholder')).toBe('Filter my tools');
    expect(storedLanguage()).toBeUndefined();
  });

  test('F-019.R2 the switch goes to the other language and stores it', () => {
    const { language, storedLanguage } = setup({ device: ['vi'] });
    expect(language.shownLanguage.value).toBe('vi-VN');
    language.switchLanguage();
    expect(language.shownLanguage.value).toBe('en-US');
    expect(storedLanguage()).toBe('en-US');
    language.switchLanguage();
    expect(storedLanguage()).toBe('vi-VN');
  });

  test('F019_AC22 with storage unavailable the switch lasts for this page only; the next page follows the device', () => {
    const storage = new FakeStorage();
    storage.failWrites = true;
    const first = setup({ device: ['en-US'], storage });
    first.language.switchLanguage();
    expect(first.language.shownLanguage.value).toBe('vi-VN');
    expect(first.root.getAttribute('lang')).toBe('vi-VN');
    const next = setup({ device: ['en-US'], storage });
    expect(next.language.shownLanguage.value).toBe('en-US');
  });
});

describe('ADR-0012 localized attributes', () => {
  test('localizedAttrs gives the en-US value as the attribute and both versions to swap', () => {
    expect(localizedAttrs('aria-label', { 'en-US': 'Search', 'vi-VN': 'Tìm kiếm' })).toEqual({
      'aria-label': 'Search',
      'data-l-a': 'aria-label',
      'data-l-aria-label-en-US': 'Search',
      'data-l-aria-label-vi-VN': 'Tìm kiếm',
    });
    // The same text in both languages needs nothing to swap.
    expect(localizedAttrs('alt', 'Taro')).toEqual({ alt: 'Taro' });
  });

  test('every localized attribute is swapped both ways, several on one element', () => {
    const el = new El(
      mergeAttrs(
        localizedAttrs('aria-label', { 'en-US': 'Search', 'vi-VN': 'Tìm kiếm' }),
        localizedAttrs('title', { 'en-US': 'Open', 'vi-VN': 'Mở' }),
      ),
    );
    expect(el.getAttribute('data-l-a')).toBe('aria-label title');
    const { doc } = fakeDocument([el]);
    swapLocalizedAttributes(doc as unknown as Document, 'vi-VN');
    expect([el.getAttribute('aria-label'), el.getAttribute('title')]).toEqual(['Tìm kiếm', 'Mở']);
    swapLocalizedAttributes(doc as unknown as Document, 'en-US');
    expect([el.getAttribute('aria-label'), el.getAttribute('title')]).toEqual(['Search', 'Open']);
  });
});

describe('RULE-08 schema version 2 on the device', () => {
  test('ADR-0010 note: the document is version 2, and a version-1 document is read with no language', () => {
    expect(SCHEMA_VERSION).toBe(2);
    const storage = new FakeStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, favorites: [], recents: [], preferences: { theme: 'dark' }, daysUsed: [] }),
    );
    const store = createPersonalDataStore({ storage: () => storage });
    expect(store.preferences.value).toEqual({ theme: 'dark' });
    expect(store.data.value.schemaVersion).toBe(2);
  });

  test('ADR-0010 note: a language other than en-US or vi-VN on the device is dropped (repair), not fatal', () => {
    const storage = new FakeStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...emptyDocument(), preferences: { theme: 'light', language: 'fr' } }),
    );
    const store = createPersonalDataStore({ storage: () => storage });
    expect(store.preferences.value).toEqual({ theme: 'light' });
  });
});
