// MOD-Pages island on SCR-Settings: days used (F-006.R6, RULE-13, COPY-settings.daysUsed).
// - The line counts the recorded local dates within the last 14 days, today included (MOD-PersonalData
//   `daysUsedLast14`). This page view has already recorded today (MOD-Shell `recordDay`).
// - The strip under it (design SettingsDesktop / SettingsMobile) marks the same 14 days, oldest first and today
//   last. It is decorative and hidden from assistive technology: the line says the same.
// - Before hydration the device data is unknown, so the line is blank and the strip empty.
import { useEffect, useState } from 'preact/hooks';
import { daysUsedWindow, DAYS_USED_WINDOW, localDate, personalData } from '../../personal-data/index.ts';

interface Props {
  /** COPY-settings.daysUsed rendered at build with the literal `{count}` left in place. */
  template: string;
}

export default function DaysUsed({ template }: Props) {
  const [state, setState] = useState<{ count: number; strip: boolean[] } | null>(null);
  useEffect(() => {
    const store = personalData();
    return store.data.subscribe((doc) =>
      setState({ count: store.daysUsedLast14.peek(), strip: daysUsedWindow(doc.daysUsed, localDate()) }),
    );
  }, []);
  const strip = state?.strip ?? Array.from({ length: DAYS_USED_WINDOW }, () => false);
  return (
    <div class="days">
      <p class="days-line">{state ? template.replace('{count}', String(state.count)) : ' '}</p>
      <div class="days-strip" aria-hidden="true" data-testid="days-strip">
        {strip.map((used, i) => (
          <span key={i} data-used={used ? '' : undefined} />
        ))}
      </div>
    </div>
  );
}
