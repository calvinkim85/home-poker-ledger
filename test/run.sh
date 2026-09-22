#!/bin/sh
# Build the suites out of index.html and run them. Exits non-zero if anything fails.
set -e
cd "$(dirname "$0")/.."
python3 test/build.py
# Delete last run's results before running. Without this a suite that crashes leaves
# its previous .txt in place, and the summary reports those stale numbers as if they
# were this run's — a green total for a suite that never executed.
rm -f test/build/*.txt
total_pass=0; total_fail=0; status=0
for f in test/build/*.js; do
  osascript -l JavaScript "$f" >/dev/null 2>&1 || true
  txt="${f%.js}.txt"
  [ -f "$txt" ] || { echo "  $f produced no output"; status=1; continue; }
  line=$(tail -1 "$txt")
  p=$(echo "$line" | sed -n 's/.*PASS \([0-9]*\).*/\1/p')
  fl=$(echo "$line" | sed -n 's/.*FAIL \([0-9]*\).*/\1/p')
  printf "  %-34s %s\n" "$(basename "$f")" "$line"
  grep -A2 "^  FAIL " "$txt" || true
  total_pass=$((total_pass + ${p:-0})); total_fail=$((total_fail + ${fl:-0}))
done
echo
echo "TOTAL  PASS $total_pass   FAIL $total_fail"
[ "$total_fail" -eq 0 ] || status=1
exit $status
