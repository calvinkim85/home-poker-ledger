#!/bin/sh
# Turn advertising on (or off) in one place.
#
#   sh scripts/enable-adsense.sh ca-pub-XXXXXXXXXXXXXXXX   # on
#   sh scripts/enable-adsense.sh ""                        # off — the kill switch
#
# The publisher ID in consent.js is the only switch: empty means no banner, no ad
# slot, and nothing fetched from Google. Nothing else needs to change to disable ads.
set -eu

if [ $# -ne 1 ]; then
  echo "usage: sh scripts/enable-adsense.sh <ca-pub-XXXXXXXXXXXXXXXX | \"\">" >&2
  exit 2
fi

CLIENT="$1"
cd "$(dirname "$0")/.."

if [ -n "$CLIENT" ]; then
  case "$CLIENT" in
    ca-pub-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]) ;;
    *) echo "error: expected ca-pub- followed by 16 digits, got '$CLIENT'" >&2; exit 2 ;;
  esac
fi

python3 - "$CLIENT" <<'PY'
import sys, re
client = sys.argv[1]
p = "consent.js"
src = open(p, encoding="utf-8").read()
new, n = re.subn(r'var CLIENT = "[^"]*";', 'var CLIENT = "%s";' % client, src, count=1)
if n != 1:
    sys.exit("could not find the CLIENT constant in consent.js")
open(p, "w", encoding="utf-8").write(new)
print("  advertising %s" % ("ENABLED for " + client if client else "DISABLED"))
PY

if [ -n "$CLIENT" ]; then
  echo
  echo "Still to do by hand:"
  echo "  - Paste the ads.txt line AdSense gives you into ads.txt, replacing the comments."
  echo "    It looks like: google.com, pub-${CLIENT#ca-pub-}, DIRECT, f08c47fec0942fa0"
  echo "  - Verify on a FRESH browser profile that no request to google is made"
  echo "    before you click Allow. That is the whole point of the gate."
else
  echo "  ads.txt can stay as it is; it serves no publisher line while disabled."
fi
