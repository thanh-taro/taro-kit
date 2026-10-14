// Chromium launch options with third-party storage partitioning back on, as in shipping Chrome (SP-1).
// Playwright disables `ThirdPartyStoragePartitioning` in its default `--disable-features=…` switch
// (playwright#32230), and a later `--enable-features` does not override it. So the default switch is dropped and
// re-added without that one feature. The list is read from the installed Playwright, so it tracks upgrades; the
// AC11 test's cross-site control fails loudly if partitioning is still off.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

function playwrightCoreDir(): string {
  let req = createRequire(import.meta.url);
  for (const pkg of ['@playwright/test', 'playwright']) req = createRequire(req.resolve(`${pkg}/package.json`));
  return dirname(req.resolve('playwright-core/package.json'));
}

function disabledFeatures(): string[] {
  const bundle = readFileSync(join(playwrightCoreDir(), 'lib/coreBundle.js'), 'utf8');
  const list = /disabledFeatures = \[([\s\S]*?)\];/.exec(bundle)?.[1];
  if (!list) throw new Error('could not find Playwright’s disabled Chromium features');
  return [...list.matchAll(/^\s*"([A-Za-z0-9]+)",?\s*$/gm)].map((m) => m[1]!);
}

export function partitionedChromium(): { ignoreDefaultArgs: string[]; args: string[] } {
  const features = disabledFeatures();
  if (!features.includes('ThirdPartyStoragePartitioning')) return { ignoreDefaultArgs: [], args: [] }; // Playwright no longer disables it.
  return {
    ignoreDefaultArgs: [`--disable-features=${features.join(',')}`],
    args: [`--disable-features=${features.filter((f) => f !== 'ThirdPartyStoragePartitioning').join(',')}`],
  };
}
