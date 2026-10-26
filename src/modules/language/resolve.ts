// MOD-Language: RULE-16 resolution, pure and self-contained (no imports, no outer variables), because the blocking
// inline script inlines its source with `.toString()`. No comments inside the function: its source is collapsed onto
// one line.
// Implements: RULE-16 (a stored choice wins; otherwise the first preferred language whose primary language is en or vi;
// otherwise en-US).

export function resolveLanguage(
  choice: 'en-US' | 'vi-VN' | undefined | null,
  device: readonly string[],
): 'en-US' | 'vi-VN' {
  if (choice === 'en-US' || choice === 'vi-VN') return choice;
  for (let i = 0; i < device.length; i++) {
    const primary = String(device[i]).split('-')[0]!.toLowerCase();
    if (primary === 'vi') return 'vi-VN';
    if (primary === 'en') return 'en-US';
  }
  return 'en-US';
}
