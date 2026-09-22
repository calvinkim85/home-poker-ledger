#!/bin/sh
# Is this site actually ready to go live with advertising?
#
#   sh scripts/preflight.sh
#
# Exits non-zero while anything is outstanding. This is deliberately separate from the
# test suite: the tests assert the code is correct, this asserts the site is launchable.
# A repo can be perfectly green and still have an unfilled privacy officer.
cd "$(dirname "$0")/.."

fail=0
warn=0
ok()   { printf '  \033[32mOK\033[0m    %s\n' "$1"; }
bad()  { printf '  \033[31mTODO\033[0m  %s\n' "$1"; fail=$((fail+1)); }
note() { printf '  \033[33mNOTE\033[0m  %s\n' "$1"; warn=$((warn+1)); }

echo
echo "Poker Ledger — preflight"
echo

echo "Legal pages"
for t in OPERATOR_NAME CONTACT_EMAIL SITE_URL; do
  if grep -rql "\[\[$t\]\]" ./*.html 2>/dev/null; then
    bad "$t is still a placeholder — run scripts/configure-launch.sh"
  else
    ok "$t filled in"
  fi
done
if grep -rql "not yet in force\|아직 시행 전입니다" ./*.html 2>/dev/null; then
  bad "the policies still say they are drafts not in force — read them, then remove the banner"
else
  ok "policies are not marked as drafts"
fi
for f in privacy.html privacy-ko.html terms.html 404.html; do
  [ -f "$f" ] && ok "$f present" || bad "$f missing"
done

echo
echo "Domain"
if [ -f CNAME ]; then
  ok "CNAME present ($(cat CNAME))"
  if grep -rql "calvinkim85.github.io" ./*.html guides/*.html sitemap.xml robots.txt 2>/dev/null; then
    bad "a CNAME exists but pages still point at github.io — re-run configure-launch.sh"
  else
    ok "canonical URLs point at the custom domain"
  fi
else
  # A free launch on github.io is a legitimate end state, not an unfinished one.
  # It is only a problem if the goal is AdSense, which scrutinises free subdomains
  # far harder. So: a note, not a blocker.
  note "no custom domain — free launch on github.io. Fine to run this way indefinitely;"
  note "  buy a domain and re-run configure-launch.sh before applying to AdSense."
fi

echo
echo "Advertising"
if grep -q 'var CLIENT = "";' consent.js; then
  note "advertising is off (no publisher ID). Expected until AdSense approves you."
else
  ok "publisher ID set"
  if [ "$(grep -c '^[^#]' ads.txt 2>/dev/null || echo 0)" -eq 0 ]; then
    bad "ads.txt has no publisher line — paste the one AdSense gave you"
  else
    ok "ads.txt carries a publisher line"
  fi
fi
grep -q "googlesyndication" index.html && bad "index.html embeds an ad script directly — it must load only via consent.js" \
                                       || ok "no ad script embedded outside the consent gate"

echo
echo "Tests"
if sh test/run.sh 2>/dev/null | grep -q "FAIL 0$"; then
  ok "test suite green"
else
  bad "test suite is not green — run sh test/run.sh"
fi

echo
if [ "$fail" -eq 0 ]; then
  printf '  \033[32mReady to launch.\033[0m %s note(s).\n\n' "$warn"
  exit 0
else
  printf '  \033[31m%s item(s) outstanding.\033[0m Not ready.\n\n' "$fail"
  exit 1
fi
