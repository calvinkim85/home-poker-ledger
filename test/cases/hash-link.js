// needs: site

/* A share link opened in a tab that already had the site open did nothing: only the
   fragment changes, so the browser does not reload, and the link is only read at boot.
   The visitor kept looking at their own game. Found by the 2026-11-05 chaos run;
   checked end to end there, wiring pinned here on both pages. */

[["English", html], ["Korean", koTemplate]].forEach(function(pair){
  var m = /addEventListener\("hashchange", function\(\)\{([\s\S]*?)\}\);/.exec(pair[1]);
  eq(pair[0] + ": reacts to a new fragment", !!m, true);
  eq(pair[0] + ": only for a real share link, by reloading", !!m && /decodeShare\(location\.hash\)/.test(m[1]) && /location\.reload\(\)/.test(m[1]), true);
});
