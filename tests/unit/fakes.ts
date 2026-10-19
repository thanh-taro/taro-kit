// Browser fakes for unit tests (Node environment, adapters/tests.md).

/** An in-memory Storage. `failWrites` makes every setItem throw, like a full or blocked store. */
export class FakeStorage implements Storage {
  map = new Map<string, string>();
  failWrites = false;
  /** Makes every removeItem throw. */
  failRemoves = false;
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(key: string) {
    if (this.failRemoves) throw new DOMException('blocked', 'SecurityError');
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new DOMException('quota', 'QuotaExceededError');
    this.map.set(key, String(value));
  }
}

/** A matchMedia stand-in whose `prefers-color-scheme: light` answer can be flipped like a device setting. */
export class FakeMedia extends EventTarget {
  matches: boolean;
  constructor(matches: boolean) {
    super();
    this.matches = matches;
  }
  set(matches: boolean) {
    this.matches = matches;
    this.dispatchEvent(Object.assign(new Event('change'), { matches }));
  }
}

/** Records `data-theme` like the root element. */
export class FakeRoot {
  attrs = new Map<string, string>();
  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
  }
  get theme() {
    return this.attrs.get('data-theme');
  }
}
