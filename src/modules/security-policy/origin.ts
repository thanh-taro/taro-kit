// MOD-SecurityPolicy: the one check that an embedded tool's address is secure (INV-02).
// Shared by the page's frame-src (build) and the frame's src (browser, MOD-ToolHost); import-free.

/** The URL's origin, or an error if it is not https. */
export function secureOrigin(url: string, context: string): string {
  const origin = new URL(url).origin;
  if (!origin.startsWith('https://')) throw new Error(`${context}: ${origin} is not a secure origin (INV-02)`);
  return origin;
}
