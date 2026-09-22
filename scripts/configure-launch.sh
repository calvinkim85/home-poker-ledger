#!/bin/sh
# Fill in the three launch placeholders and point the site at its own domain.
#
#   sh scripts/configure-launch.sh "Your Legal Name" "you@example.com" [domain.com]
#
# The domain is OPTIONAL. Without it the site stays on its current github.io URL and
# only the operator name and contact are filled in — a complete, free launch. Buying a
# domain later is the same script again with the third argument, and GitHub Pages
# redirects the old URLs so indexing carries over rather than restarting.
#
# Touches: every .html page, sitemap.xml, robots.txt, and CNAME when a domain is given.
# Re-running re-points everything, because it rewrites whatever host is currently in
# the canonical tags rather than assuming the original one.
set -eu

if [ $# -lt 2 ] || [ $# -gt 4 ]; then
  echo "usage: sh scripts/configure-launch.sh \"Name or designation\" \"contact@email\" [domain.com] [Korean designation]" >&2
  echo "       omit the domain to launch free on github.io" >&2
  echo "       omit the Korean designation to reuse the first argument" >&2
  exit 2
fi

NAME="$1"; EMAIL="$2"; DOMAIN="${3:-}"; NAME_KO="${4:-$1}"
cd "$(dirname "$0")/.."

case "$EMAIL" in *@*.*) ;; *) echo "error: '$EMAIL' does not look like an email" >&2; exit 2 ;; esac

CURRENT=$(grep -m1 -o 'rel="canonical" href="[^"]*"' index.html | sed 's/.*href="//;s/"$//')
OLD_BASE="$CURRENT"

if [ -n "$DOMAIN" ]; then
  case "$DOMAIN" in
    http*|*/*) echo "error: give a bare hostname, e.g. homepokerledger.com" >&2; exit 2 ;;
    *.*) ;;
    *) echo "error: '$DOMAIN' does not look like a domain" >&2; exit 2 ;;
  esac
  NEW_BASE="https://$DOMAIN/"
else
  NEW_BASE="$OLD_BASE"
fi

echo "  operator : $NAME"
echo "  contact  : $EMAIL"
if [ -n "$DOMAIN" ]; then
  echo "  site     : $NEW_BASE  (moved from $OLD_BASE)"
else
  echo "  site     : $NEW_BASE  (unchanged — free launch, no domain)"
fi
echo

python3 - "$NAME" "$EMAIL" "$NEW_BASE" "$OLD_BASE" "$DOMAIN" "$NAME_KO" <<'PY'
import sys, os, glob
name, email, new_base, old_base, domain, name_ko = sys.argv[1:7]
apex = bool(domain)

files = sorted(set(glob.glob("*.html") + glob.glob("guides/*.html") +
                   ["sitemap.xml", "robots.txt"]))
changed = 0
for f in files:
    if not os.path.exists(f):
        continue
    src = open(f, encoding="utf-8").read()
    out = src.replace(old_base, new_base)
    out = out.replace("[[OPERATOR_NAME_KO]]", name_ko)
    out = out.replace("[[OPERATOR_NAME]]", name)
    out = out.replace("[[CONTACT_EMAIL]]", email)
    out = out.replace("[[SITE_URL]]", new_base)
    # The placeholders were rendered as visible TODO chips; once filled they are
    # ordinary text, so drop the chip styling with them.
    out = out.replace('<span class="todo">%s</span>' % name, name)
    out = out.replace('<span class="todo">%s</span>' % name_ko, name_ko)
    out = out.replace('<span class="todo">%s</span>' % email,
                      '<a href="mailto:%s">%s</a>' % (email, email))
    out = out.replace('<span class="todo">%s</span>' % new_base, new_base)
    # 404.html carries /poker-ledger/ roots so it works on a project page; on an
    # apex domain the site is at the root.
    # 404.html carries /poker-ledger/ roots so it works on a project page. Only an
    # apex domain serves the site from the root, so only rewrite them then.
    if f == "404.html" and apex:
        # href AND src: consent.js is loaded with src= and was missed the first time,
        # leaving the 404 page requesting a script that no longer existed.
        out = out.replace('href="/poker-ledger/', 'href="/')
        out = out.replace('src="/poker-ledger/', 'src="/')
    if out != src:
        open(f, "w", encoding="utf-8").write(out)
        changed += 1
        print("  rewritten  %s" % f)
print("\n  %d files updated" % changed)
PY

if [ -n "$DOMAIN" ]; then
  printf '%s\n' "$DOMAIN" > CNAME
  echo "  written    CNAME -> $DOMAIN"
else
  [ -f CNAME ] && rm -f CNAME && echo "  removed    CNAME (staying on github.io)" || true
fi

echo
echo "Next:"
echo "  1. Read privacy.html, privacy-ko.html and terms.html end to end."
echo "     Remove the 'not yet in force' banners once you are satisfied they are true."
echo "  2. sh scripts/preflight.sh"
echo "  3. sh test/run.sh"
