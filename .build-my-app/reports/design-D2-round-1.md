# Design D2 (FLOW-01): audit round 1

1 blocker and 8 majors. All are fixed, except where noted below.
- Blocker fixed: the palette empty-query state is added as a State tweak on PaletteDesktop and PaletteMobile.
- Fixed:
  - focus-visible rings on all screens;
  - skip link plus nav and main landmarks;
  - aria-labelledby sections on mobile home;
  - distinct embed labels;
  - role=status dropped from the static linked note;
  - theme toggle on LinkedDesktop;
  - COPY IDs for the palette dialog name, mobile cancel (COPY-palette.close), export action and page rows;
  - screen-reader "opens in a new tab" text on linked recents;
  - a 44 px "About me" link under the intro;
  - radii snapped to 7/10/12/14 and the glow shadow taken from the token.
- Deferred to D4 (noted on the canvas): Home empty and storage-error states, and the tool offline, slow and not-found states.
- Disagreed: titles omit the theme because theme and state are tweaks; adapters/design.md is updated to say so.
- Minor, left open: the tool view search control's type size differs slightly from CMP-AppShell; locale formatting of dates is a code concern.
