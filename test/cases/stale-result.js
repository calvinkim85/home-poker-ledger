// needs: site

/* Editing an amount after pressing Calculate left the old settlement on screen: the
   chaos run caught "settlement shows $0.00 moving but current nets need $20.00" after
   a cash-out was typed. A stale list of payments is the one thing this page must never
   show, so an accepted edit to a name or amount now hides it until Calculate is pressed
   again (recalculating live is out: calculate() scrolls to the result, which would
   yank the page while typing). Found by the 2026-11-06 chaos run. */

function handlers(src, varName){
  var re = new RegExp(varName + '\\.addEventListener\\("input", function\\(\\)\\{([\\s\\S]*?)\\}\\);', "g");
  var out = [], m;
  while((m = re.exec(src))) out.push(m[1]);
  return out;
}
[["English", html, ["name", "cash", "owed", "inp"]], ["Korean", koTemplate, ["name", "cash", "owed", "inp"]]].forEach(function(t){
  t[2].forEach(function(v){
    var hs = handlers(t[1], v);
    eq(t[0] + ": " + v + " input handler found", hs.length > 0, true);
    eq(t[0] + ": " + v + " edit hides a stale settlement", hs.length > 0 && hs.every(function(h){ return /hideResult\(\)/.test(h); }), true);
  });
});
