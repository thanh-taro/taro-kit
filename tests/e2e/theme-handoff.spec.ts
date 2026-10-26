// F-012.R5/R6 hand-off helpers (ADR-0011) in a real browser, with real cross-origin frames.
// This proves the MOD-ToolHost helpers, not the tool view: the F-012 ACs are verified with F-003's ToolFrame.
// The tool view page itself is F-003, so a portal stand-in (tests/fixtures/tool-host/F012-theme-handoff)
// runs the real MOD-ToolHost helpers under the same CSP shape as /t/<id>/, and embeds a tiny test tool.
// Three origins are routed by Playwright: https://portal.test, https://tool.test, https://other.test.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Frame, type Page } from '@playwright/test';
import ts from 'typescript';

const root = join(import.meta.dirname, '../..');
const fixture = (name: string) => readFileSync(join(root, 'tests/fixtures/tool-host/F012-theme-handoff', name), 'utf8');
const transpile = (path: string) =>
  ts.transpileModule(readFileSync(join(root, path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
const helpers = transpile('src/modules/tool-host/theme-handoff.ts');
// theme-handoff.ts imports '../security-policy/origin.ts', which resolves to this path from /theme-handoff.js.
const originCheck = transpile('src/modules/security-policy/origin.ts');

const FILES: Record<string, [body: string, type: string]> = {
  'https://portal.test/host.html': [fixture('host.html'), 'text/html'],
  'https://portal.test/host.js': [fixture('host.js'), 'text/javascript'],
  'https://portal.test/theme-handoff.js': [helpers, 'text/javascript'],
  'https://portal.test/security-policy/origin.ts': [originCheck, 'text/javascript'],
  'https://tool.test/tool.html': [fixture('tool.html'), 'text/html'],
  'https://tool.test/tool.js': [fixture('tool.js'), 'text/javascript'],
  'https://tool.test/impostor.html': [fixture('sender.html'), 'text/html'],
  'https://tool.test/sender.js': [fixture('sender.js'), 'text/javascript'],
  'https://other.test/foreign.html': [fixture('sender.html'), 'text/html'],
  'https://other.test/sender.js': [fixture('sender.js'), 'text/javascript'],
};

async function openHost(page: Page, query: Record<string, string>): Promise<Frame> {
  const toolRequests: string[] = [];
  await page.route(/^https:\/\/(portal|tool|other)\.test\//, (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'tool.test') toolRequests.push(url.href);
    const file = FILES[url.origin + url.pathname];
    return file ? route.fulfill({ body: file[0], contentType: file[1] }) : route.fulfill({ status: 404 });
  });
  await page.goto(`https://portal.test/host.html?${new URLSearchParams(query)}`);
  const tool = page.frameLocator('iframe[title="Test tool"]');
  await expect(tool.locator('#status')).toHaveText('tool loaded', { useInnerText: true });
  const frame = page.frames().find((f) => f.url().startsWith('https://tool.test/tool.html'));
  if (!frame) throw new Error('tool frame missing');
  return frame;
}

const received = (tool: Frame) => tool.evaluate(() => (window as unknown as { received: unknown[] }).received);
const toolTheme = (tool: Frame) => tool.evaluate(() => document.documentElement.dataset.theme);

test.describe('MOD-ToolHost theme hand-off helpers in a stand-in portal', () => {
  test('F-012.R5 helper: the tool address carries the dark theme showing', async ({ page }) => {
    const tool = await openHost(page, { pref: 'dark', tool: 'https://tool.test/tool.html?mode=silent' });
    expect(new URL(tool.url()).searchParams.get('theme')).toBe('dark');
    expect(await tool.evaluate(() => (window as unknown as { initialTheme: string }).initialTheme)).toBe('dark');
  });

  test('F-012.R5 helper: a toggle sends only the new theme, without reloading the tool', async ({ page }) => {
    const tool = await openHost(page, { pref: 'dark', tool: 'https://tool.test/tool.html?mode=silent' });
    await tool.evaluate(() => ((window as unknown as { marker: number }).marker = 42));
    await page.evaluate(() => (window as unknown as { toggleTheme: () => void }).toggleTheme());
    await expect.poll(() => received(tool)).toEqual([{ type: 'taro:theme', value: 'light' }]);
    expect(await toolTheme(tool)).toBe('light');
    expect(await tool.evaluate(() => (window as unknown as { marker: number }).marker)).toBe(42);
    await page.waitForTimeout(200);
    expect(await received(tool)).toEqual([{ type: 'taro:theme', value: 'light' }]);
  });

  test('F-012.R6 helper: a ready tool gets the theme showing', async ({ page }) => {
    const tool = await openHost(page, { pref: 'dark', tool: 'https://tool.test/tool.html?mode=ready' });
    await expect
      .poll(() => received(tool))
      .toEqual([
        { type: 'taro:theme', value: 'dark' },
        { type: 'taro:language', value: 'en-US' },
      ]);
  });

  test('F-012.R6 helper: ready from another origin or another frame of the tool origin gets nothing', async ({
    page,
  }) => {
    const tool = await openHost(page, {
      pref: 'dark',
      tool: 'https://tool.test/tool.html?mode=silent&nested=1',
      impostor: '1',
    });
    // Both senders have posted taro:ready to the portal (each sets its title once it has).
    await expect
      .poll(async () => {
        const senders = page
          .frames()
          .filter((f) => /^https:\/\/(other\.test\/foreign|tool\.test\/impostor)/.test(f.url()));
        return Promise.all(senders.map((f) => f.title()));
      })
      .toEqual(['sent', 'sent']);
    await page.waitForTimeout(300);
    expect(await received(tool)).toEqual([]);
  });

  test('F-012.R5 helper: on system, a device switch from dark to light reaches the tool', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    const tool = await openHost(page, { pref: 'system', tool: 'https://tool.test/tool.html?mode=silent' });
    expect(new URL(tool.url()).searchParams.get('theme')).toBe('dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => received(tool)).toEqual([{ type: 'taro:theme', value: 'light' }]);
    expect(await toolTheme(tool)).toBe('light');
  });

  test('F-012.R5 helper: a tool that never says ready loads normally with the theme in its address', async ({
    page,
  }) => {
    const tool = await openHost(page, { pref: 'light', tool: 'https://tool.test/tool.html?mode=silent' });
    expect(new URL(tool.url()).searchParams.get('theme')).toBe('light');
    expect(await toolTheme(tool)).toBe('light');
    await expect(page.frameLocator('iframe[title="Test tool"]').locator('#status')).toBeVisible();
    expect(await received(tool)).toEqual([]);
  });
});
