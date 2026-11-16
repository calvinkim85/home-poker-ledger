// needs: site

/* Two tabs on one game used to be last-writer-wins on every keystroke: nothing told a
   tab that another had saved, so its next save() wrote its own stale copy over the
   other tab's edits (seats added in one tab vanished after typing a name in the
   other). Found by the 2026-11-05 chaos run. The behaviour is checked end to end by
   the Playwright chaos harness; this suite pins the wiring on both pages so it cannot
   be dropped quietly. */

[["English", html], ["Korean", koTemplate]].forEach(function(pair){
  var m = /addEventListener\("storage", function\(e\)\{([\s\S]*?)\n  \}\);/.exec(pair[1]);
  eq(pair[0] + ": listens for saves from other tabs", !!m, true);
  var body = m ? m[1] : "";
  eq(pair[0] + ": ignores other keys", /e\.key !== KEY/.test(body), true);
  eq(pair[0] + ": never pulls a stored game over a shared one", /viewingShared/.test(body), true);
  eq(pair[0] + ": reloads and re-renders", /load\(\)/.test(body) && /render\(\)/.test(body), true);
});
