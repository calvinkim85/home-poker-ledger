// needs: core

/* Switching currency re-quantizes every amount. `owed` (buy-ins still unpaid to the
   banker) was left out: KRW 30,000 buy-ins became $30,000.00 while the 30,000 owed
   became $300.00, so the bank check reported money on credit that nobody owed.
   Found by the 2026-11-05 security review. */

log("-- owed follows the buy-ins through a currency switch --");
state.currency = "KRW";
state.players = [
  { name:"Bank", buyIns:[30000], cashOut:0, banker:true, owed:0 },
  { name:"X", buyIns:[30000], cashOut:60000, owed:30000 }
];
convertAll("KRW", "USD");
eq("buy-in relabelled", state.players[1].buyIns[0], 3000000);
eq("owed relabelled the same way", state.players[1].owed, 3000000);
eq("still owes exactly what they bought in for", state.players[1].owed, totalIn(state.players[1]));
eq("a seat without owed stays at 0", state.players[0].owed, 0);

log("-- and back, losslessly --");
convertAll("USD", "KRW");
eq("owed back to 30,000", state.players[1].owed, 30000);

log("-- a player saved before owed existed --");
state.players = [{ name:"Old", buyIns:[2000], cashOut:0 }, { name:"B", buyIns:[2000], cashOut:4000 }];
convertAll("USD", "EUR");
eq("no owed field is still fine", state.players[0].owed || 0, 0);
