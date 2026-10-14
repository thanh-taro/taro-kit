// MOD-SecurityPolicy: RULE-10 permissions to iframe attributes (ADR-0009, amendments from SP-3).
// Pure and import-free; MOD-ToolHost renders the result on the frame it creates (F-003.R3, NFR-08).
// - Base sandbox: the tool can run its own code, keep its own origin (its storage, F-003.R8) and submit
//   its own forms (RULE-10; without allow-forms Chromium never fires `submit`, SP-3).
// - Never: top navigation (the portal page), modals, storage-access prompts. `credentialless` is never set.
// - Each declared permission adds exactly its sandbox token or `allow` feature; file-pick has no platform
//   switch (file inputs work in any frame that runs scripts), so it is declarative only.

export const PERMISSIONS = [
  'clipboard-read',
  'clipboard-write',
  'downloads',
  'file-pick',
  'popups',
  'fullscreen',
  'camera',
  'microphone',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const BASE_SANDBOX = ['allow-scripts', 'allow-same-origin', 'allow-forms'] as const;
/** Tokens an embedded tool never gets: it can never navigate or block the portal page (RULE-10). */
export const FORBIDDEN_SANDBOX = [
  'allow-top-navigation',
  'allow-top-navigation-by-user-activation',
  'allow-top-navigation-to-custom-protocols',
  'allow-modals',
  'allow-storage-access-by-user-activation',
] as const;

const SANDBOX_FOR: Partial<Record<Permission, readonly string[]>> = {
  downloads: ['allow-downloads'],
  popups: ['allow-popups', 'allow-popups-to-escape-sandbox'],
};
/** Permissions Policy features delegated with `allow` (and listed in the portal's Permissions-Policy). */
export const POLICY_FEATURE_FOR: Partial<Record<Permission, string>> = {
  'clipboard-read': 'clipboard-read',
  'clipboard-write': 'clipboard-write',
  fullscreen: 'fullscreen',
  camera: 'camera',
  microphone: 'microphone',
};
export const POLICY_FEATURES = Object.values(POLICY_FEATURE_FOR);

export interface FrameAttributes {
  sandbox: string;
  /** Present only when the tool declares a policy-controlled permission. */
  allow?: string;
  referrerpolicy: 'strict-origin';
}

/** The frame's isolation attributes for a tool's permission set (default none, RULE-10). */
export function frameAttributesFor(tool: { permissions?: readonly string[] }): FrameAttributes {
  const permissions = tool.permissions ?? [];
  const sandbox: string[] = [...BASE_SANDBOX];
  const allow: string[] = [];
  for (const p of permissions) {
    if (!(PERMISSIONS as readonly string[]).includes(p)) throw new Error(`unknown permission ${p} (RULE-10)`);
    for (const token of SANDBOX_FOR[p as Permission] ?? []) if (!sandbox.includes(token)) sandbox.push(token);
    const feature = POLICY_FEATURE_FOR[p as Permission];
    if (feature && !allow.includes(feature)) allow.push(feature);
  }
  for (const token of sandbox)
    if ((FORBIDDEN_SANDBOX as readonly string[]).includes(token)) throw new Error(`forbidden sandbox ${token}`);
  return {
    sandbox: sandbox.join(' '),
    ...(allow.length ? { allow: allow.join('; ') } : {}),
    referrerpolicy: 'strict-origin',
  };
}
