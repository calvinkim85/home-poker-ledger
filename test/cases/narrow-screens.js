// needs: site

/* On a phone, two things in the result pushed the whole page sideways (found by the
   2026-11-05 chaos run, measured in Chrome with device emulation):
   - a long name with no spaces in the payments list (+240 to +330px on phones);
   - the summary table at $10,000 or KRW 1,000,000 stakes (+70 to +80px on iPhone SE).
   Names may now break anywhere, and the table scrolls inside its own box. */

eq("payment names can break", /ol\.transfers \.who\{[^}]*overflow-wrap:anywhere/.test(html), true);
eq("sentences that list names can break", /\.banner, \.notice\{ overflow-wrap:anywhere; \}/.test(html), true);
eq("the table has a scroll box", /\.table-scroll\{[^}]*overflow-x:auto/.test(html), true);
[["English", html], ["Korean", koTemplate]].forEach(function(pair){
  eq(pair[0] + ": the table is put inside it", /el\("div", "table-scroll"\)/.test(pair[1]) &&
     /\.appendChild\(tbl\)/.test(pair[1]) && !/resultEl\.appendChild\(tbl\)/.test(pair[1]), true);
});
eq("Korean payment rows wrap and names break", /\.ko-pay\{ flex-wrap:wrap; \}/.test(koTemplate) &&
   /\.ko-pay \.who\{[^}]*overflow-wrap:anywhere/.test(koTemplate), true);
eq("Korean notes that list names can break", /\.ko-note, \.banner, \.notice\{ overflow-wrap:anywhere; \}/.test(koTemplate), true);
