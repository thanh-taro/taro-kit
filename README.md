# TaroKit

Taro's personal home on the web: a fast, keyboard-first portal that launches every tool I build (each a separate project on its own `*.tarokit.app` site), plus who builds them. Live at <https://tarokit.app>.

## Development

Requires Node 24, pnpm 11 and Python 3.

```sh
pnpm install
python3 -m venv .venv && .venv/bin/pip install -r requirements-build.txt
pnpm gen && pnpm build      # static site in dist/
pnpm test                   # unit tests
pnpm exec playwright test --project=chromium
```

`specs/` is the source of truth for what the app does; see `specs/README.md` and `CLAUDE.md`.

## License

TaroKit's own code and content are licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md): you may use, copy and change it for noncommercial purposes only. Commercial use needs my written permission.

Third-party code, fonts and icons keep their own licenses, listed in `/third-party-notices.txt` on the built site.
