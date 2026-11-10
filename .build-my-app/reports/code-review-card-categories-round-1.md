# Code review — card shows every category (D-076), round 1

No loops, CSP or accessibility blockers.

| # | Sev | Finding | Triage |
|---|---|---|---|
| 1 | medium | No refit after a language switch or late font load when the main label is clamped | Fixed: every watched box refits on `document.fonts` `loadingdone` and on `<html lang>` changes |
| 2 | low | AC13 tested only on static cards; the island path (search results) untested | Fixed: e2e `F002_AC13 search result cards (island)…` narrows a result card and expects "+1" inside the box |
| 3 | low | The box's hover `title` may be read again as a description by some screen readers | Accepted: the spec asks for a hover title; revisit if heard in testing |
| 4 | low | Stale fold state when a box drops to one label | Fixed: state cleared before the early return |

Found during build (screenshot review, before this round): "+N" could land on the clipped second line when the main
label and the marker filled the line. Folded labels are now visually hidden and the box stops wrapping, so "+N" always
shows and the main label shortens; the AC13 test checks that "+N" lies inside the visible box.

Outcome: converged.
