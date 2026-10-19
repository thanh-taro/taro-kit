// MOD-SecurityPolicy public surface (ADR-0009): the CSP, the frame attributes per tool, and the `_headers`
// file with the Permissions-Policy (F-003.R3, NFR-08). Everything but writeHeaders is pure.
export { CSP_DIRECTIVES, frameSrcDirective } from './csp.ts';
export {
  BASE_SANDBOX,
  FORBIDDEN_SANDBOX,
  frameAttributesFor,
  PERMISSIONS,
  POLICY_FEATURES,
  type FrameAttributes,
  type Permission,
} from './frame.ts';
export {
  cacheRules,
  headersFile,
  permissionsPolicy,
  securityHeaders,
  writeHeaders,
  type PolicyTool,
} from './headers.ts';
export { inlineScriptHash } from './hash.ts';
export { secureOrigin } from './origin.ts';
