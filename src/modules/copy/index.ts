// MOD-Copy: every user-facing string comes from here (specs/30-experience/copy.md).
// A missing or misspelled COPY id, or a missing {placeholder}, is a type error.
import { COPY, type CopyId, type CopyParams } from '../../generated/copy.ts';

export type { CopyId, CopyParams };

type Args<I extends CopyId> = I extends keyof CopyParams ? [params: CopyParams[I]] : [];

export function t<I extends CopyId>(id: I, ...args: Args<I>): string {
  const text: string = COPY[id];
  const params = args[0] as Record<string, string | number> | undefined;
  return text.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_, name: string) => {
    const v = params?.[name];
    if (v === undefined) throw new Error(`${id}: missing value for {${name}}`);
    return String(v);
  });
}
