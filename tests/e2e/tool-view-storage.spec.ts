// F-003.AC11 (R8, ADR-0001): an own embedded tool sees the same local key-value storage inside the portal as at
// its own address, in browsers that do not partition an embedded page's storage by the top-level page.
// - Chromium: Playwright turns storage partitioning off by default (playwright#32230, SP-1), which would let this
//   pass for the wrong reason. This file turns it back on, and a cross-site control (the same build served
//   under an unrelated site) must see nothing, proving partitioning is active and that sharing comes from the
//   same-site layout of ADR-0001 (support/partitioning.ts) (portal https://tarokit.test, tool https://ft-embedded.tarokit.test).
// - WebKit/Safari partition embedded local storage even on the same site (real-Safari check, D-038): the known,
//   documented limitation of F-003.R8, so the AC's precondition does not hold there and the test is skipped.
// - Firefox is a manual check (docs/deploy/runbook.md, staging).
// The launch options below are Chromium switches, which WebKit and Firefox refuse at launch, so the file is skipped
// for them before any browser starts (it failed at launch in CI's Linux WebKit, not at the skip inside the test).
import { expect, test, type Page } from '@playwright/test';
import { partitionedChromium } from './support/partitioning.ts';
import { OTHER_PORTAL, serveSites, toolPage, toolUrl } from './support/sites.ts';

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'Chromium only: WebKit/Safari partition embedded local storage (F-003.R8, D-038); Firefox is a manual check',
);
test.use({ launchOptions: partitionedChromium() });

const stored = (page: Page) => page.frameLocator('iframe').locator('#stored');

test('F003_AC11 a value the tool saved at its own address is shown when it is opened inside the portal', async ({
  page,
  context,
}) => {
  await serveSites(context);

  // Saved while open at its own address.
  await page.goto(toolUrl('ft-embedded'));
  await page.evaluate(() => (window as unknown as { probe: { save(v: string): void } }).probe.save('saved directly'));

  // The cross-site control: an unrelated top-level site gets a separate, empty partition.
  await page.goto(toolPage('ft-embedded', OTHER_PORTAL));
  await expect(stored(page)).toHaveText('none');

  // Inside the portal (same site, ADR-0001): the tool shows that value.
  await page.goto(toolPage('ft-embedded'));
  await expect(stored(page)).toHaveText('saved directly');
});
