// True once an island has hydrated; before that, controls that need the browser stay inert.
import { useEffect, useState } from 'preact/hooks';

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
