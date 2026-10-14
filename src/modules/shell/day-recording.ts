// MOD-Shell: records the day the portal is used (F-006.R6, RULE-13) on every page view, and again whenever the
// page is shown or focused, so a page left open past midnight records the new day and the days-used count moves
// on. `recordDay` writes nothing once today is recorded.
import { personalData, type PersonalDataStore } from '../personal-data/index.ts';

export function connectDayRecording(
  store: Pick<PersonalDataStore, 'recordDay'> = personalData(),
  win: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
  doc: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'> = document,
): () => void {
  const record = () => store.recordDay();
  const onVisibility = () => {
    if (doc.visibilityState === 'visible') record();
  };
  record();
  doc.addEventListener('visibilitychange', onVisibility);
  win.addEventListener('focus', record);
  return () => {
    doc.removeEventListener('visibilitychange', onVisibility);
    win.removeEventListener('focus', record);
  };
}
