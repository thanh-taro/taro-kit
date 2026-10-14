// MOD-Pages island on SCR-Now: adds the stale label (COPY-now.stale) when the Now note is more than 90 days old on
// the viewer's local date (RULE-09). The static page never carries it, so a page built long ago still tells the
// truth the day it is viewed. `data-state` is `pending` until the check has run, then `fresh` or `stale`.
// Implements: F-010.R2.
import { useEffect, useState } from 'preact/hooks';
import { staleToday } from './stale.ts';

interface Props {
  /** The Now note's last updated date, YYYY-MM-DD. */
  updated: string;
  /** COPY-now.stale */
  label: string;
}

export default function StaleLabel({ updated, label }: Props) {
  const [state, setState] = useState<'pending' | 'fresh' | 'stale'>('pending');
  useEffect(() => setState(staleToday(updated) ? 'stale' : 'fresh'), [updated]);
  return (
    <span class="now-stale" data-testid="now-stale" data-state={state}>
      {state === 'stale' && <span class="label">{label}</span>}
    </span>
  );
}
