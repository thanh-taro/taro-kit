#!/usr/bin/env bash
# Post-deploy smoke test (MOD-Delivery, ADR-0007): `scripts/smoke-test.sh <host>`, e.g. `tarokit.app` or
# `staging.tarokit.app`. publish.yml runs it after each deploy; the Owner can run it by hand (release checklist).
# Reads only the public site with curl; no secrets. Exits 1 on the first failed check.
# Zero third-party requests over a real page load stays a manual DevTools check (release checklist U-14).
set -euo pipefail

host="${1:?usage: scripts/smoke-test.sh <host>}"
site="https://${host}"
# SMOKE_BASE (tests only) fetches from another address, such as a local server of dist/; checks still expect $site.
base="${SMOKE_BASE:-$site}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

fail() {
  echo "::error title=Smoke test (${host})::$1"
  echo "smoke: FAIL $1" >&2
  exit 1
}
ok() { echo "smoke: ok   $1"; }

fetch() { curl --silent --show-error --retry 3 --retry-delay 5 --retry-all-errors "$@"; }

# 1. The home page answers 200 over https (the edge may need a moment after the first deploy).
status="$(fetch --output "$work/index.html" --dump-header "$work/headers.txt" --write-out '%{http_code}' "$base/")"
[ "$status" = 200 ] || fail "GET / returned ${status}, expected 200"
ok "GET / is 200"

has_header() { grep -qi "^$1:" "$work/headers.txt"; }

# 2. Security headers from dist/_headers (MOD-SecurityPolicy, ADR-0009). frame-ancestors only works as a header.
grep -qi '^content-security-policy:.*frame-ancestors' "$work/headers.txt" ||
  fail "no Content-Security-Policy header with frame-ancestors"
ok "Content-Security-Policy header with frame-ancestors"
has_header strict-transport-security || fail "no Strict-Transport-Security header"
ok "Strict-Transport-Security header"
has_header permissions-policy || fail "no Permissions-Policy header"
ok "Permissions-Policy header"

# 3. No cookies (NFR-05): the host sets none (zone hygiene, ADR-0007).
! has_header set-cookie || fail "the response sets a cookie"
ok "no Set-Cookie"

# 4. A real 404 for an unknown tool address (F-003.R7, F-015.R4).
status="$(fetch --output /dev/null --write-out '%{http_code}' "$base/t/does-not-exist/")"
[ "$status" = 404 ] || fail "GET /t/does-not-exist/ returned ${status}, expected 404"
ok "unknown tool address is 404"

# 5. The service worker is always revalidated (ADR-0004, ADR-0007).
fetch --head --output "$work/sw-headers.txt" "$base/sw.js"
grep -qi '^cache-control:.*no-cache' "$work/sw-headers.txt" || fail "/sw.js is not served with no-cache"
ok "/sw.js is no-cache"

# 6. The build targets this host: robots.txt names this host's sitemap (MOD-Meta).
fetch --output "$work/robots.txt" "$base/robots.txt"
grep -qF "Sitemap: ${site}/sitemap.xml" "$work/robots.txt" || fail "robots.txt does not name ${site}/sitemap.xml"
ok "robots.txt names this host's sitemap"

# 7. No external scripts in the home page (NFR-05, ADR-0009).
! grep -Eq '<script[^>]+src="https?://' "$work/index.html" || fail "the home page loads an external script"
ok "no external scripts on the home page"

echo "smoke: all checks passed for ${site}"
