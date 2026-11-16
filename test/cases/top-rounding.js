// needs: core

/* "Cover it from the top" plus rounding could leave money unpaid, yet both the banner
   and the copied text said "the payments settle exactly". Rounding moves part of a
   winner's chips into the change pot, so the winners can hold less than the gap they
   are asked to cover. Found by the 2026-11-05 security review (197 of 20,000 random
   tables). Example: rounding to $1, A $10 in / $11.50 out, B $10 in / $10 out. */

state.currency = "USD"; state.roundTo = 100; state.roundDest = 0;
var players = [{ name:"A", buyIns:[1000], cashOut:1150 }, { name:"B", buyIns:[1000], cashOut:1000 }];
var potIn = 2000, potOut = 2150, diff = potOut - potIn;
var plan = roundingPlan(players);
var raw = players.map(function(p, i){ return { name:p.name, net:plan.paid[i] - totalIn(p) }; });
var adj = absorbGap(raw, diff);
var entries = adj.entries.concat(plan.left > 0 ? [{ name:roundDestName(), net:plan.left }] : []);
var res = settleNets(entries);
log("-- the scenario really does leave money unpaid --");
eq("something is unpaid", res.unpaid.length > 0, true);
var text = settlementText(res, [], potIn, potOut, diff, false, adj, plan, null, 0, null);
log("-- so the copied text must not claim it settles exactly --");
eq("no 'settle exactly'", /settle exactly/.test(text), false);
eq("says who is still unpaid", text.indexOf(res.unpaid[0].name + " (") >= 0 && /still cannot be paid in full/.test(text), true);

log("-- a top split that does cover everything still says so --");
state.roundTo = 0;
var p2 = [{ name:"A", buyIns:[1000], cashOut:1400 }, { name:"B", buyIns:[1000], cashOut:1000 }];
var plan2 = roundingPlan(p2);
var raw2 = p2.map(function(p, i){ return { name:p.name, net:plan2.paid[i] - totalIn(p) }; });
var adj2 = absorbGap(raw2, 400);
var res2 = settleNets(adj2.entries);
eq("nothing unpaid", res2.unpaid.length + res2.unowed.length, 0);
eq("still 'settle exactly'", /settle exactly/.test(settlementText(res2, [], 2000, 2400, 400, false, adj2, plan2, null, 0, null)), true);
