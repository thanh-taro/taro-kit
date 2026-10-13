---
title: Reference environment for quality measurements
status: draft
---

# Reference environment

Used by NFR-01, NFR-02 and NFR-10. This is a technical decision; phase 3 may refine it with an ADR.

## Reference device and network
- **Mobile lab profile:** a mid-range phone emulated with a 4× CPU slowdown and a 412 × 915 viewport. Network: 9 Mbps down, 1.5 Mbps up, 170 ms round trip (a "slow 4G" class profile). Cold cache for first visits; warm cache with the offline shell installed for repeat visits.
- **Desktop lab profile:** no CPU slowdown, 1440 × 900 viewport, unthrottled network.
- NFR-01 is measured on the mobile profile. NFR-02 is measured on the mobile profile with a generated catalog of 500 entries.

## Supported browser engines
- Chromium-based browsers (Chrome, Edge, Arc and others)
- Gecko (Firefox)
- WebKit (Safari on macOS and iOS)

The two latest major versions of each are supported, on desktop and mobile.
