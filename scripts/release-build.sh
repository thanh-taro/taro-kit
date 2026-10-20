#!/usr/bin/env bash
# Repeatable release build (phase 6; docs/deploy/runbook.md "Pre-flight"). Builds the site from a clean checkout of a
# release tag and writes checksums plus a tarball under release/ (gitignored). It contacts nothing: no Cloudflare,
# no GitHub, no secrets. Deploying is a separate, user-owned step (D-052).
#
# Usage:
#   scripts/release-build.sh [--staging] [--allow-untagged] [vX.Y.Z]
#     vX.Y.Z            the tag to build. HEAD must be exactly that tag. Without it, HEAD must carry a v* tag.
#     --staging         build:staging (https://staging.tarokit.app) instead of the production build; the files are
#                       named tarokit-<version>-staging.*
#     --allow-untagged  rehearsal only: build an untagged, clean HEAD, labelled <version>-<shortsha>.
#
# Output (release/):
#   tarokit-<version>[-staging].dist.SHA256SUMS   sha256 of every file in dist/, paths relative to dist/
#   tarokit-<version>[-staging].tar.gz            dist/ as a tarball (top folder "dist/")
#   tarokit-<version>[-staging].tar.gz.sha256     checksum of the tarball
#
# Determinism. Fixed here: TZ=UTC, LC_ALL=C, SOURCE_DATE_EPOCH = the commit time, CI=1, telemetry off, the
# TAROKIT_* variables cleared, dist/ removed first, `--frozen-lockfile`, and the tarball is written with sorted
# names, fixed mtime/owner/mode and gzip without a name or time. Observed on one machine (macOS, Node 24, 2026-10-20):
# two builds of the same commit, a few seconds apart, gave identical dist/ file checksums and an identical tarball.
# Not proven across machines. Things that could differ and where to look first:
#   - Astro island uids (astro-island uid="...") and other generated ids come from the build, not the source;
#   - fonts: fonttools can stamp a modified time into each subset (src/generated/fonts/, copied to dist/_astro/);
#     SOURCE_DATE_EPOCH is exported for it, but a font hash that differs between two builds is the first suspect;
#   - dist/sw.js carries workbox revisions that hash file contents, so it follows any difference above;
#   - another OS or CPU can change sharp's image output (avatar, Open Graph image) and pip/node patch versions.
# If two builds differ, diff the two release/*.dist.SHA256SUMS files to find the files. A deploy never depends on byte
# equality: it ships the dist/ you checked. Equality only makes "this is the candidate" easy to prove.
set -euo pipefail

staging=0
allow_untagged=0
tag_arg=""
for arg in "$@"; do
  case "$arg" in
    --staging) staging=1 ;;
    --allow-untagged) allow_untagged=1 ;;
    -h | --help) sed -n '2,/^set -euo/p' "$0" | sed '$d'; exit 0 ;;
    v[0-9]*) tag_arg="$arg" ;;
    *) echo "release-build: unknown argument: $arg" >&2; exit 2 ;;
  esac
done

die() { echo "release-build: $*" >&2; exit 1; }
step() { echo; echo "== $*"; }

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

# 1. Clean tree (untracked files count; ignored ones do not).
step "Checking the tree"
[ -z "$(git status --porcelain)" ] || { git status --short >&2; die "the working tree is not clean"; }

head_sha="$(git rev-parse HEAD)"
short_sha="$(git rev-parse --short=9 HEAD)"
version="$(node -p "require('./package.json').version")"

# 2. HEAD is tagged.
if [ -n "$tag_arg" ]; then
  tag_sha="$(git rev-parse --verify --quiet "refs/tags/${tag_arg}^{commit}")" || die "tag ${tag_arg} does not exist"
  [ "$tag_sha" = "$head_sha" ] || die "HEAD (${short_sha}) is not ${tag_arg} (${tag_sha:0:9}); run: git checkout ${tag_arg}"
  tag="$tag_arg"
else
  tag="$(git tag --points-at HEAD --list 'v*' | sort -V | tail -n 1)"
  if [ -z "$tag" ]; then
    [ "$allow_untagged" = 1 ] || die "HEAD has no v* tag. Tag it, pass the tag, or use --allow-untagged for a rehearsal"
    tag="v${version}-${short_sha}"
    echo "WARNING: untagged rehearsal build, not a release candidate" >&2
  fi
fi
if [ "$allow_untagged" = 0 ]; then
  # The release (vX.Y.Z) or one of its candidates (vX.Y.Z-rc.N), for the version in package.json.
  [[ "$tag" =~ ^v${version//./\\.}(-rc\.[0-9]+)?$ ]] || die "tag ${tag} is not v${version} or v${version}-rc.N"
fi
label="${tag#v}"
suffix=""
[ "$staging" = 1 ] && suffix="-staging"
name="tarokit-${label}${suffix}"
echo "tag ${tag}, commit ${short_sha}, target $([ "$staging" = 1 ] && echo staging || echo production)"

# 3. Deterministic environment; nothing from the shell can change the build.
export TZ=UTC LC_ALL=C CI=1 ASTRO_TELEMETRY_DISABLED=1
SOURCE_DATE_EPOCH="$(git show -s --format=%ct HEAD)"
export SOURCE_DATE_EPOCH
unset TAROKIT_FIXTURES TAROKIT_SAMPLES TAROKIT_CONTENT_DIR TAROKIT_PORTAL_ORIGIN
# The build never needs Cloudflare credentials; keep them out of its environment.
unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_KEY CLOUDFLARE_EMAIL

command -v node >/dev/null || die "node is not installed"
command -v pnpm >/dev/null || die "pnpm is not installed (see package.json packageManager)"
command -v python3 >/dev/null || die "python3 is not installed"
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)' || die "Node 24 or newer is required"

# 4. Install, Python venv, generate, build.
step "pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile

step "Python build tools (requirements-build.txt)"
python3 -m venv .venv
.venv/bin/pip install --quiet -r requirements-build.txt

step "pnpm gen"
pnpm gen

step "Build"
rm -rf dist
if [ "$staging" = 1 ]; then pnpm build:staging; else pnpm build; fi

# The same checks publish.yml runs on its build.
step "Checking dist/"
node scripts/check-dist-clean.ts
for f in _headers 404.html sw.js index.html robots.txt; do [ -f "dist/$f" ] || die "dist/$f is missing"; done
if [ "$staging" = 1 ]; then
  grep -q 'https://staging.tarokit.app/' dist/index.html || die "the staging build does not name the staging origin"
  if grep -rIl 'https://tarokit.app' dist --include='*.html' --include='*.xml' --include='*.webmanifest' --include='robots.txt'; then
    die "the staging build names the production origin in the files above"
  fi
else
  grep -q 'https://tarokit.app/' dist/index.html || die "the production build does not name https://tarokit.app"
  if grep -rIl 'sample-' dist --include='*.html' --include='*.xml' --include='*.json'; then
    die "sample content is in the production build (release checklist U-1)"
  fi
fi
# gen or the build must not have changed a tracked file (generated files are committed).
[ -z "$(git status --porcelain)" ] || { git status --short >&2; die "the build changed tracked files"; }

# 5. Checksums and tarball.
step "Writing release/"
mkdir -p release
sums="release/${name}.dist.SHA256SUMS"
tarball="release/${name}.tar.gz"
sha256() { if command -v sha256sum >/dev/null; then sha256sum "$@"; else shasum -a 256 "$@"; fi; }
(cd dist && find . -type f | sort | sed 's|^\./||' | while IFS= read -r f; do sha256 "$f"; done) >"$sums"

python3 -I - "$tarball" "$SOURCE_DATE_EPOCH" <<'PY'
import gzip, os, sys, tarfile
out, epoch = sys.argv[1], int(sys.argv[2])
def fix(i):
    i.uid = i.gid = 0; i.uname = i.gname = ""; i.mtime = epoch
    i.mode = 0o755 if i.isdir() else 0o644
    return i
paths = []
for d, dirs, files in os.walk("dist"):
    dirs.sort()
    paths.append(d)
    paths.extend(os.path.join(d, f) for f in sorted(files))
with open(out, "wb") as raw, gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0, compresslevel=9) as gz:
    with tarfile.open(fileobj=gz, mode="w", format=tarfile.PAX_FORMAT) as tar:
        for p in paths:
            tar.add(p, arcname=p, recursive=False, filter=fix)
PY
(cd release && sha256 "${name}.tar.gz") >"${tarball}.sha256"

files="$(wc -l <"$sums" | tr -d ' ')"
bytes="$(du -sk dist | cut -f1)"
echo
echo "Release build ${name} from ${tag} (${short_sha}): ${files} files, ${bytes} KB in dist/"
echo "  ${sums}"
echo "  ${tarball}"
echo "  ${tarball}.sha256: $(cut -d' ' -f1 "${tarball}.sha256")"
echo "Verify later with: (cd dist && shasum -a 256 -c ../${sums})"
echo "Nothing was uploaded or deployed. Next: docs/deploy/runbook.md"
