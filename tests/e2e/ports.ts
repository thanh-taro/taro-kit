// E2E server ports (playwright.config.ts). Override with TK_E2E_PORT / TK_E2E_FIXTURES_PORT when another
// worktree's servers already hold the defaults.
export const PORT = Number(process.env.TK_E2E_PORT ?? 4321);
export const FIXTURES_PORT = Number(process.env.TK_E2E_FIXTURES_PORT ?? 4322);
export const PROD = `http://localhost:${PORT}`;
export const FX = `http://localhost:${FIXTURES_PORT}`;
