#!/bin/sh
# Assemble the publishable website into dist/ for Cloudflare Pages.
#
# Why this exists: on GitHub Pages the whole repo root was served, so the domain
# handed out test/, scripts/, docs/, the rules config, README and CLAUDE.md —
# free reconnaissance for an attacker. Cloudflare Pages serves only the build
# output directory, so we copy in ONLY the website and leave everything internal
# behind. Set the Cloudflare Pages build command to `sh scripts/build-site.sh`
# and the output directory to `dist`.
set -eu
cd "$(dirname "$0")/.."

# The Korean page is generated from ko/app.html plus the money code in index.html,
# so regenerate before copying — otherwise a change to the arithmetic ships to the
# English page and not the Korean one, and the two quietly disagree about money.
# If python3 is unavailable we fall back to the committed copy rather than failing
# the whole deploy, but the integrity check below still has to pass.
if command -v python3 >/dev/null 2>&1; then
  python3 scripts/build_ko.py
  python3 scripts/build_feeds.py
else
  echo "build-site: no python3, using the committed ko/index.html"
fi

rm -rf dist
mkdir dist

# Copy every tracked file EXCEPT the internal-only paths. Working from
# `git ls-files` means only version-controlled files ship — never a stray local
# file — and the exclude list is the single source of truth for "not public".
git ls-files | grep -vE '^(test/|scripts/|docs/|poker-app-config/|\.claude/|ko/app\.html$|ko/guides/_|ko/guides/.*\.part\.html$|\.gitignore$|README\.md$|CLAUDE\.md$|AGENTS\.md$|CNAME$)' \
| while IFS= read -r f; do
    mkdir -p "dist/$(dirname "$f")"
    cp "$f" "dist/$f"
  done

# Fail loudly if the output is wrong, so a broken build never ships silently.
test -f dist/index.html          || { echo "build-site: dist/index.html missing"; exit 1; }
test -f dist/guides/index.html   || { echo "build-site: guides missing"; exit 1; }
test -f dist/_headers            || { echo "build-site: _headers missing"; exit 1; }
test -f dist/ko/index.html       || { echo "build-site: Korean page missing"; exit 1; }
grep -q 'function settleNets(' dist/ko/index.html || {
  echo "build-site: Korean page has no settlement code — it would load and settle nothing"; exit 1; }
# `[ -e x ] && ...` would return 1 when the file is correctly absent, and set -e
# would abort the build on the check passing. Spell it out.
if [ -e dist/ko/app.html ] || ls dist/ko/guides/_* dist/ko/guides/*.part.html >/dev/null 2>&1; then
  echo "build-site: a Korean template or fragment leaked into dist"; exit 1
fi
test -f dist/ko/guides/index.html || { echo "build-site: Korean guide index missing"; exit 1; }
test -f dist/rss.xml             || { echo "build-site: English feed missing"; exit 1; }
test -f dist/ko/rss.xml          || { echo "build-site: Korean feed missing"; exit 1; }
if [ -e dist/test ] || [ -e dist/scripts ] || [ -e dist/docs ] || [ -e dist/poker-app-config ] || [ -e dist/CLAUDE.md ] || [ -e dist/AGENTS.md ] || [ -e dist/README.md ]; then
  echo "build-site: internal files leaked into dist"; exit 1
fi

echo "build-site: dist/ ready ($(find dist -type f | wc -l | tr -d ' ') files)"
