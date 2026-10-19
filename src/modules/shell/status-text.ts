// MOD-Shell: build-time strings and icons for the ShellStatus island (MOD-Copy and the icon set are read in Node).
import { t } from '../copy/index.ts';
import { iconSvg } from '../design-system/icons.ts';
import type { ShellStatusText } from './ShellStatus.tsx';

export const shellStatusText = (): ShellStatusText => ({
  offline: t('COPY-shell.offline'),
  updateReady: t('COPY-shell.updateReady'),
  refresh: t('COPY-shell.refresh'),
  icons: { offline: iconSvg('wifi-off', 16), update: iconSvg('star', 16) },
});
