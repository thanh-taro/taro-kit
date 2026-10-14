// MOD-Pages island on SCR-Settings: days used (F-006.R6, RULE-13, COPY-settings.daysUsed).
// - The line counts the recorded local dates within the last 14 days, today included. The count and the strip
//   come from the same stored dates and the store's one `today`, so they always agree, and both move on when
//   the day changes on an open page (MOD-Shell records the day when the page is shown or focused).
// - The strip under it (design SettingsDesktop / SettingsMobile) marks the same 14 days, oldest first and today
//   last. It is decorative and hidden from assistive technology: the line says the same.
// - Before hydration the device data is unknown, so the line is blank and the strip empty.
import { effect } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { daysUsedWindow, DAYS_USED_WINDOW, personalData } from '../../personal-data/index.ts';

interface Props {
  /** COPY-settings.daysUsed rendered at build with the literal `{count}` left in place. */
  template: string;
}

export default function DaysUsed({ template }: Props) {
  const [strip, setStrip] = useState<boolean[] | null>(null);
  useEffect(() => {
    const store = personalData();
    return effect(() => setStrip(daysUsedWindow(store.data.value.daysUsed, store.today.value)));
  }, []);
  // The strip covers exactly the RULE-13 window, so its used days are the count.
  const count = strip?.filter(Boolean).length;
  return (
    <div class="days">
      <p class="days-line">{count === undefined ? ' ' : template.replace('{count}', String(count))}</p>
      <div class="days-strip" aria-hidden="true" data-testid="days-strip">
        {(strip ?? Array.from({ length: DAYS_USED_WINDOW }, () => false)).map((used, i) => (
          <span key={i} data-used={used ? '' : undefined} />
        ))}
      </div>
    </div>
  );
}
