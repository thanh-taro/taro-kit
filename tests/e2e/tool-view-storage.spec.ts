// F-003.AC11 (R8, ADR-0001): an own embedded tool sees the same local key-value storage inside the portal as at
// its own address, in browsers that do not partition an embedded page's storage by the top-level page.
// - Chromium: Playwright turns storage partitioning off by default (playwright#32230, SP-1), which would let this
//   pass for the wrong reason. This file turns it back on, and a cross-site control (the same build served
//   under an unrelated site) must see nothing, proving partitioning is active and that sharing comes from the
//   same-site layout of ADR-0001 (support/partitioning.ts) (portal https://tarokit.test, tool https://ft-embedded.tarokit.test).
// - WebKit/Safari partition embedded local storage even on the same site (real-Safari check, D-038): the known,
//   documented limitation of F-003.R8, so the AC's precondition does not hold there and the test is skipped.
// - Firefox is not run in this sandbox (it is killed at launch, SP-1).
import { expect, test, type Page } from '@playwright/test';
import { partitionedChromium } from './support/partitioning.ts';
import { OTHER_PORTAL, serveSites, toolPage, toolUrl } from './support/sites.ts';

test.use({ launchOptions: partitionedChromium() });

const stored = (page: Page) => page.frameLocator('iframe').locator('#stored');

test('F003_AC11 a value the tool saved at its own address is shown when it is opened inside the portal', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'F-003.R8: WebKit/Safari partition embedded local storage (D-038)');
  test.skip(browserName === 'firefox', 'Firefox is not available in this sandbox (SP-1)');
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
