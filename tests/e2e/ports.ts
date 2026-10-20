// E2E server ports (playwright.config.ts). Override with TK_E2E_PORT / TK_E2E_FIXTURES_PORT when another
// worktree's servers already hold the defaults.
export const PORT = Number(process.env.TK_E2E_PORT ?? 4321);
export const FIXTURES_PORT = Number(process.env.TK_E2E_FIXTURES_PORT ?? 4322);
/** The production pages over the sample fixture content (dist-samples/, `pnpm build:samples`), never content/. */
export const PROD = `http://localhost:${PORT}`;
export const FX = `http://localhost:${FIXTURES_PORT}`;
/** The content PROD is built from (release C-1: tests never read content/, which the Owner replaces). */
export const SAMPLES_CONTENT = 'tests/fixtures/content/samples';
