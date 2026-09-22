// needs: storage

/* Early cash-out. From the guides' own diagnosis: a player who leaves at 11pm is one
   of the two commonest causes of a broken count — they take their money and their
   chips go back in the tray BEFORE anyone records the figure.

   The site described that failure and gave no way to avoid it. Marking a player
   cashed out locks their number, blocks accidental rebuys, and makes it obvious at a
   glance who is still playing. */

log("-- the flag survives a save and reload --");
store[KEY] = JSON.stringify({
  players: [{ name:"A", buyIns:[2000], cashOut:5500, done:true },
            { name:"B", buyIns:[2000], cashOut:500,  done:false },
            { name:"C", buyIns:[2000], cashOut:0 }],        /* saved before this existed */
  defaultBuyIn: 2000, currency:"USD", absorb:false, theme:"dark"
});
eq("a stored game loads", load(), true);
eq("a player marked cashed out stays marked", state.players[0].done, true);
eq("a player not marked stays unmarked", state.players[1].done, false);
eq("a save predating the feature loads as not-cashed-out", state.players[2].done, false);

log("-- the flag is always a strict boolean, whatever was stored --");
[["yes"], [1], [null], [0], [{}]].forEach(function(v){
  store[KEY] = JSON.stringify({
    players: [{ name:"A", buyIns:[2000], cashOut:0, done:v[0] },
              { name:"B", buyIns:[2000], cashOut:0 }],
    defaultBuyIn: 2000, currency:"USD", absorb:false, theme:"dark"
  });
  load();
  eq("stored done=" + JSON.stringify(v[0]) + " loads as a boolean",
     state.players[0].done === true || state.players[0].done === false, true);
});

log("-- cashing out never changes the arithmetic --");
/* This is workflow state. If it ever moved a net or a transfer it would be a bug:
   identical numbers must settle identically whether or not anyone pressed it. */
function table(done){
  return [{ name:"A", buyIns:[2000], cashOut:5500, done:done },
          { name:"B", buyIns:[2000], cashOut:500,  done:done },
          { name:"C", buyIns:[2000], cashOut:0,    done:done }];
}
eq("the same table settles identically either way",
   JSON.stringify(settle(table(false))), JSON.stringify(settle(table(true))));
eq("nets are unaffected",
   table(true).map(netOf).join(","), table(false).map(netOf).join(","));

log("-- starting a new game clears the flag --");
/* "New game" resets buy-ins and cash-outs but keeps the names. It did NOT reset this
   flag, so last night's cashed-out players began tonight with locked cash-out fields
   and a disabled Rebuy button. Shipped and caught afterwards, hence this test. */
function newGame(players, defaultBuyIn){
  players.forEach(function(p){
    p.buyIns = [defaultBuyIn];
    p.cashOut = 0;
    p.done = false;
  });
  return players;
}
var after = newGame([{ name:"A", buyIns:[2000,2000], cashOut:9000, done:true },
                     { name:"B", buyIns:[2000], cashOut:0, done:true }], 2000);
eq("nobody stays cashed out", after.filter(function(p){ return p.done; }).length, 0);
eq("buy-ins reset to one at the standard amount",
   after.map(function(p){ return p.buyIns.join("+"); }).join(","), "2000,2000");
eq("cash-outs reset", after.map(function(p){ return p.cashOut; }).join(","), "0,0");
eq("names are kept", after.map(function(p){ return p.name; }).join(","), "A,B");

log("-- the source really does reset it, and in the RIGHT handler --");
/* The first version of this test matched "p.cashOut = 0" followed by "p.done = false"
   anywhere in the file. The fix had landed in the currency-switch branch instead of
   the New game handler — the two blocks differ only by indentation — so the assertion
   passed while New game stayed broken. Anchor on the confirm() text, which appears in
   exactly one place and cannot drift. */
var newGameBody = (html || "").split('confirm("Start a new game?')[1] || "";
newGameBody = newGameBody.slice(0, 400);
eq("the New game handler exists in the source", newGameBody.length > 0, true);
eq("it resets buy-ins", /p\.buyIns = \[state\.defaultBuyIn\];/.test(newGameBody), true);
eq("it resets cash-outs", /p\.cashOut = 0;/.test(newGameBody), true);
eq("it clears the cashed-out flag", /p\.done = false;/.test(newGameBody), true);
eq("and it re-renders afterwards", /render\(\);/.test(newGameBody), true);

log("-- the warning clears once everyone is counted --");
/* It was set only when the warning applied, so after the last player was marked the
   previous run's message stayed on screen — telling you to count people you had just
   counted. Found on the live site, not locally. */
eq("calculate() sets the notice unconditionally, with an empty string when clear",
   /showNotice\(settled\.length > 0 && waiting\.length > 0[\s\S]{0,240}: ""\);/.test(html || ""), true);
eq("the warning condition requires someone still waiting",
   /waiting\.length > 0/.test(html || ""), true);
eq("the waiting list is computed before the branch, not inside it",
   (html || "").indexOf("var waiting = players.filter") <
   (html || "").indexOf("showNotice(settled.length"), true);
