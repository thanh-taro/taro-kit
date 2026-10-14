// MOD-SecurityPolicy frame attributes and headers (ADR-0009, RULE-10, NFR-08) and MOD-ToolHost logic (F-003).
import { describe, expect, it, vi } from 'vitest';
import {
  BASE_SANDBOX,
  FORBIDDEN_SANDBOX,
  frameAttributesFor,
  headersFile,
  permissionsPolicy,
  PERMISSIONS,
  securityHeaders,
} from '../../src/modules/security-policy/index.ts';
import { initialPhase, openTool, SLOW_LOAD_MS } from '../../src/modules/tool-host/index.ts';

const tool = (url: string, permissions: string[] = [], extra: object = {}) => ({
  url,
  openMode: 'embedded' as const,
  permissions,
  ...extra,
});

describe('RULE-10 frame attributes (ADR-0009)', () => {
  it('RULE-10 a tool with no permissions gets only the base sandbox and no allow list', () => {
    expect(frameAttributesFor({ permissions: [] })).toEqual({
      sandbox: 'allow-scripts allow-same-origin allow-forms',
      referrerpolicy: 'strict-origin',
    });
    expect(BASE_SANDBOX).toEqual(['allow-scripts', 'allow-same-origin', 'allow-forms']);
  });

  it('RULE-10 each permission maps to exactly its sandbox token or allow feature', () => {
    const map: Record<string, { sandbox: string[]; allow?: string }> = {
      'clipboard-read': { sandbox: [], allow: 'clipboard-read' },
      'clipboard-write': { sandbox: [], allow: 'clipboard-write' },
      downloads: { sandbox: ['allow-downloads'] },
      'file-pick': { sandbox: [] },
      popups: { sandbox: ['allow-popups', 'allow-popups-to-escape-sandbox'] },
      fullscreen: { sandbox: [], allow: 'fullscreen' },
      camera: { sandbox: [], allow: 'camera' },
      microphone: { sandbox: [], allow: 'microphone' },
    };
    expect(Object.keys(map).sort()).toEqual([...PERMISSIONS].sort());
    for (const [permission, expected] of Object.entries(map)) {
      const attrs = frameAttributesFor({ permissions: [permission] });
      expect(attrs.sandbox.split(' ')).toEqual([...BASE_SANDBOX, ...expected.sandbox]);
      expect(attrs.allow).toBe(expected.allow);
    }
  });

  it('NFR-08 no permission set ever grants top navigation, modals or storage-access prompts', () => {
    const all = frameAttributesFor({ permissions: [...PERMISSIONS] });
    for (const token of FORBIDDEN_SANDBOX) expect(all.sandbox.split(' ')).not.toContain(token);
    expect(all.allow).toBe('clipboard-read; clipboard-write; fullscreen; camera; microphone');
    expect(() => frameAttributesFor({ permissions: ['geolocation'] })).toThrow(/unknown permission/);
  });
});

describe('ADR-0009 response headers', () => {
  it('NFR-08 the Permissions-Policy delegates a feature only to the tools declaring it, with self first (SP-3)', () => {
    const policy = permissionsPolicy([
      tool('https://b.tarokit.app/x', ['clipboard-write', 'camera']),
      tool('https://a.tarokit.app/', ['clipboard-write']),
      tool('https://hidden.tarokit.app/', ['microphone'], { hidden: true }),
      { ...tool('https://linked.example.com/', ['fullscreen']), openMode: 'linked' as const },
      tool('https://plain.tarokit.app/'),
    ]);
    expect(policy).toBe(
      'clipboard-read=(), clipboard-write=(self "https://a.tarokit.app" "https://b.tarokit.app"), fullscreen=(), ' +
        'camera=(self "https://b.tarokit.app"), microphone=()',
    );
  });

  it('F-004.R5 the portal keeps clipboard-write for itself (copy-address), delegated to no frame by default', () => {
    expect(permissionsPolicy([tool('https://plain.tarokit.app/')])).toBe(
      'clipboard-read=(), clipboard-write=(self), fullscreen=(), camera=(), microphone=()',
    );
  });

  it('NFR-08 NFR-05 every response gets frame-ancestors none, nosniff, the referrer policy, COOP and no-transform', () => {
    const headers = Object.fromEntries(securityHeaders([]));
    expect(headers['Content-Security-Policy']).toBe("frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(headers['Cache-Control']).toBe('no-transform');
    expect(headersFile([]).split('\n')[0]).toBe('/*');
    expect(headersFile([])).toContain('  Permissions-Policy: clipboard-read=(), ');
  });
});

describe('MOD-ToolHost', () => {
  it('RULE-11 the slow-load threshold is 10 seconds', () => {
    expect(SLOW_LOAD_MS).toBe(10_000);
  });

  it('F003_AC9 offline and not offline-capable starts in the offline state; otherwise the tool loads', () => {
    expect(initialPhase({ online: false, offlineCapable: false })).toBe('offline');
    expect(initialPhase({ online: false, offlineCapable: true })).toBe('loading');
    expect(initialPhase({ online: true, offlineCapable: false })).toBe('loading');
  });

  it('F003_AC6 openTool opens a linked tool at its own address in a new tab and leaves the portal where it is', () => {
    const open = vi.fn();
    const assign = vi.fn();
    openTool({ id: 'loan', openMode: 'linked', url: 'https://loan.example.com/' }, { open, assign });
    expect(open).toHaveBeenCalledWith('https://loan.example.com/', '_blank', 'noopener,noreferrer');
    expect(assign).not.toHaveBeenCalled();
  });

  it('F-003.R1 openTool sends an embedded tool to its stable portal address', () => {
    const open = vi.fn();
    const assign = vi.fn();
    openTool({ id: 'json', openMode: 'embedded', url: 'https://json.tarokit.app/' }, { open, assign });
    expect(assign).toHaveBeenCalledWith('/t/json/');
    expect(open).not.toHaveBeenCalled();
  });
});
