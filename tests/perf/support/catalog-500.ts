// NFR-02 fixture: a 500-entry catalog (reference-environment.md), generated at test time through the real content
// pipeline, so it is schema-checked and carries MOD-Search's pre-normalized keys exactly as a build would emit them.
// - The sample fixture content (tests/fixtures/content/samples) is copied to a temporary folder, and 500 generated
//   tools replace its tools; 1 in 12 has a Vietnamese name and summary (as in spike SP-6).
// - `loadRegistry` validates it and `catalogDataFile` makes the JSON that the perf test serves in place of the
//   build's `/data/catalog.<hash>.json`. Nothing is written to content/ or to a build output.
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { catalogDataFile, loadRegistry } from '../../../src/modules/content/index.ts';
import { SAMPLES_CONTENT } from '../../e2e/ports.ts';

export const CATALOG_SIZE = 500;

const SUBJECTS = ['color', 'json', 'image', 'audio', 'video', 'unit', 'time', 'text', 'number', 'markdown', 'regex'];
const KINDS = ['formatter', 'converter', 'picker', 'viewer', 'timer', 'checker', 'cleaner', 'counter', 'tool'];
const VIETNAMESE = [
  ['Đồng hồ bấm giờ', 'Đếm thời gian cho từng việc trong ngày.'],
  ['Chuyển đổi đơn vị', 'Đổi số đo nhanh, theo cách tôi thích.'],
  ['Bảng màu', 'Chọn và lưu những màu tôi hay dùng.'],
] as const;
const CATEGORIES = ['developer', 'media', 'converters', 'productivity'];

function toolYaml(i: number): string {
  const n = String(i).padStart(3, '0');
  const vi = i % 12 === 0 ? VIETNAMESE[(i / 12) % VIETNAMESE.length] : undefined;
  const subject = SUBJECTS[i % SUBJECTS.length]!;
  const kind = KINDS[Math.floor(i / SUBJECTS.length) % KINDS.length]!;
  const name = vi ? `${vi[0]} ${n}` : `${subject[0]!.toUpperCase()}${subject.slice(1)} ${kind} ${n}`;
  const summary = vi ? vi[1] : `A small ${subject} ${kind} for everyday work, number ${n}.`;
  const day = String((i % 28) + 1).padStart(2, '0');
  return [
    `id: perf-${n}`,
    'kind: tool',
    `name: ${JSON.stringify(name)}`,
    `summary: ${JSON.stringify(summary)}`,
    `category: ${CATEGORIES[i % CATEGORIES.length]}`,
    `url: https://perf-${n}.tarokit.app/`,
    'origin: own',
    `tags: [${subject}, ${kind}]`,
    `added: 2026-09-${day}`,
    '',
  ].join('\n');
}

/** The 500-entry catalog data file's JSON, built from generated, validated content. */
export function catalog500Json(): string {
  const dir = mkdtempSync(join(tmpdir(), 'tarokit-perf-catalog-'));
  try {
    cpSync(SAMPLES_CONTENT, dir, { recursive: true });
    rmSync(join(dir, 'tools'), { recursive: true });
    mkdirSync(join(dir, 'tools'));
    for (let i = 1; i <= CATALOG_SIZE; i++)
      writeFileSync(join(dir, 'tools', `perf-${String(i).padStart(3, '0')}.yaml`), toolYaml(i));
    const registry = loadRegistry({ contentDir: dir });
    if (registry.visibleTools.length !== CATALOG_SIZE)
      throw new Error(`expected ${CATALOG_SIZE} visible tools, got ${registry.visibleTools.length}`);
    return catalogDataFile(registry).json;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
