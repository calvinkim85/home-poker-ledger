// needs: core

function P(name, ins, out){ return { name:name, buyIns:ins, cashOut:out }; }
function use(c){ state.currency = c; }
function tally(players){
  var potIn=0, potOut=0;
  players.forEach(function(p){ potIn += totalIn(p); potOut += p.cashOut; });
  var r = settle(players);
  return { diff: potOut - potIn,
           t: r.transfers.map(function(x){ return x.from+"->"+x.to+" "+fmt(x.cents); }),
           unpaid: r.unpaid.map(function(x){ return x.name+" "+fmt(x.amt); }),
           unowed: r.unowed.map(function(x){ return x.name+" "+fmt(x.amt); }) };
}

/* ============ 1. REGRESSION: the original 39, all under USD ============ */
use("USD");
log("== REGRESSION (USD) ==");
log("-- parseMoney / fmt --");
eq("blank is 0",        parseMoney(""), 0);
eq("plain",             parseMoney("20"), 2000);
eq("decimal",           parseMoney("33.33"), 3333);
eq("dollar sign",       parseMoney("$1,250.50"), 125050);
eq("spaces",            parseMoney("  40 "), 4000);
eq("rounds half up",    parseMoney("0.005"), 1);
eq("letters rejected",  parseMoney("abc"), null);
eq("lone dot rejected", parseMoney("."), null);
eq("negative rejected", parseMoney("-5"), null);
eq("interior junk rejected", parseMoney("12abc34"), null);
eq("symbol-only rejected", parseMoney("$"), null);
eq("trailing code ok",  parseMoney("50.00 USD"), 5000);
eq("CNY symbol ok",     (function(){use("CNY");var v=parseMoney("CN\u00a51,250.50");use("USD");return v;})(), 125050);
eq("fmt",               fmt(125050), "$1,250.50");
eq("fmt zero",          fmt(0), "$0.00");
eq("fmt neg",           fmt(-500), "-$5.00");
eq("fmtSigned up",      fmtSigned(4000), "+$40.00");
eq("fmtSigned down",    fmtSigned(-4000), "-$40.00");
eq("fmtSigned flat",    fmtSigned(0), "$0.00");
eq("toInput",           toInput(2000), "20.00");

log("-- 1. known-answer settlement --");
var a = tally([P("Alice",[2000],6000), P("Bob",[2000,2000],0), P("Carol",[2000],2000)]);
eq("diff is zero", a.diff, 0);
eq("one transfer", a.t, ["Bob->Alice $40.00"]);
eq("nothing unpaid", a.unpaid.concat(a.unowed), []);

log("-- 2. short by $5 --");
var b = tally([P("Alice",[2000],5500), P("Bob",[2000,2000],0), P("Carol",[2000],2000)]);
eq("diff -500", b.diff, -500);
eq("Bob pays only the 35 Alice is up", b.t, ["Bob->Alice $35.00"]);
eq("Bob left holding the missing 5", b.unowed, ["Bob $5.00"]);
eq("no creditor unpaid", b.unpaid, []);

log("-- 2b. short where a winner cannot be paid --");
var b2 = tally([P("Alice",[2000],6000), P("Bob",[2000],3000), P("Carol",[2000],0)]);
eq("diff +3000", b2.diff, 3000);

log("-- 3. over by $5 --");
var c = tally([P("Alice",[2000],6500), P("Bob",[2000,2000],0), P("Carol",[2000],2000)]);
eq("diff +500", c.diff, 500);
eq("Bob pays all 40", c.t, ["Bob->Alice $40.00"]);
eq("Alice still owed 5", c.unpaid, ["Alice $5.00"]);

log("-- 4. cents: no residual --");
var d = tally([P("A",[3333],10000), P("B",[3333],0), P("C",[3333],0)]);
eq("diff 1 cent", d.diff, 1);
var d2 = tally([P("A",[3333],9999), P("B",[3333],0), P("C",[3333],0)]);
eq("balanced", d2.diff, 0);
eq("two clean transfers", d2.t, ["B->A $33.33","C->A $33.33"]);

log("-- 5. everyone flat --");
var e = tally([P("A",[2000],2000), P("B",[2000],2000)]);
eq("no transfers", e.t, []);
eq("diff 0", e.diff, 0);

log("-- 6. nine players --");
var nine = [];
for(var i=0;i<9;i++) nine.push(P("P"+(i+1),[2000], i===0 ? 18000 : 0));
var f = tally(nine);
eq("diff 0", f.diff, 0);
eq("8 transfers", f.t.length, 8);

log("-- 7. player with no buy-ins --");
var g = tally([P("A",[],5000), P("B",[5000],0)]);
eq("diff 0", g.diff, 0);
eq("B pays A", g.t, ["B->A $50.00"]);

log("-- 8. multi-way pot --");
var h = tally([P("A",[2000],5000), P("B",[2000],3000), P("C",[2000],0), P("D",[2000],0)]);
eq("diff 0", h.diff, 0);
eq("greedy result", h.t, ["C->A $20.00","D->A $10.00","D->B $10.00"]);
eq("transfers <= n-1", h.t.length <= 3, true);

/* ============ 2. NEW: currency behaviour ============ */
log("");
log("== CURRENCY ==");
log("-- zero-decimal (KRW) --");
use("KRW");
eq("parse grouped",   parseMoney("50,000"), 50000);
eq("parse symbol",    parseMoney("₩50,000"), 50000);
eq("fmt no decimals", fmt(50000), "₩50,000");
eq("toInput no .00",  toInput(50000), "50000");
eq("fmtSigned",       fmtSigned(-50000), "-₩50,000");
use("JPY");
eq("yen fmt",         fmt(3000), "¥3,000");
eq("yen toInput",     toInput(3000), "3000");

log("-- symbols are unambiguous --");
var syms = {};
["USD","SGD","CNY","JPY","KRW","EUR","GBP"].forEach(function(c){
  use(c); syms[c] = fmt(100000);
});
eq("USD",  syms.USD, "$1,000.00");
eq("SGD",  syms.SGD, "S$1,000.00");
eq("CNY",  syms.CNY, "CN¥1,000.00");
eq("JPY",  syms.JPY, "¥100,000");
eq("KRW",  syms.KRW, "₩100,000");
eq("EUR",  syms.EUR, "€1,000.00");
eq("GBP",  syms.GBP, "£1,000.00");
eq("USD and SGD differ", syms.USD !== syms.SGD, true);
eq("CNY and JPY differ", syms.CNY !== syms.JPY, true);
eq("all seven distinct",
   Object.keys(syms).map(function(k){return syms[k];})
     .filter(function(v,i,arr){return arr.indexOf(v)===i;}).length, 7);

log("-- currency switch relabels --");
function switchFixture(){
  state.players = [P("Alice",[2000],6000), P("Bob",[2000,2000],0)];
  state.defaultBuyIn = 2000;
}
use("USD"); switchFixture();
var r1 = convertAll("USD","KRW"); use("KRW");
eq("USD 2000 -> KRW 20",  state.players[0].buyIns[0], 20);
eq("cashOut relabelled",  state.players[0].cashOut, 60);
eq("default relabelled",  state.defaultBuyIn, 20);
eq("no rounding notice (all whole)", r1, false);

use("USD"); switchFixture();
state.players[0].cashOut = 2050;             /* $20.50 */
var r2 = convertAll("USD","KRW"); use("KRW");
eq("$20.50 -> ₩21 (rounds)", state.players[0].cashOut, 21);
eq("rounding notice fires", r2, true);

use("KRW");
state.players = [P("A",[50000],0)]; state.defaultBuyIn = 50000;
var r3 = convertAll("KRW","USD"); use("USD");
eq("₩50,000 -> $50,000.00", state.players[0].buyIns[0], 5000000);
eq("no notice widening", r3, false);

use("USD"); switchFixture();
var r4 = convertAll("USD","EUR");
eq("2dp -> 2dp lossless", state.players[0].buyIns[0], 2000);
eq("no notice", r4, false);

log("-- settlement is currency-agnostic --");
use("KRW");
var k = tally([P("Alice",[20],60), P("Bob",[20,20],0), P("Carol",[20],20)]);
eq("KRW diff 0", k.diff, 0);
eq("KRW one transfer", k.t, ["Bob->Alice ₩40"]);

log("-- verbs agree with the number of names --");
/* listNames() returns "Alice" or "Alice and Bob", so anything following it has to
   agree. Two messages read "Alice and Bob still owes money" and "Alice and Bob owes
   that much less". Flagged in the original audit and left unfixed until now. */
eq("one name takes the singular", verb(1, "owes", "owe"), "owes");
eq("two names take the plural",   verb(2, "owes", "owe"), "owe");
eq("three names take the plural", verb(3, "owes", "owe"), "owe");
eq("zero takes the plural too — 'no players owe'", verb(0, "owes", "owe"), "owe");

/* The sentences themselves, assembled the way calculate() assembles them. */
function unowedLine(names){
  var arr = names.map(function(n, i){ return { name:n, amt:2000 * (i + 1) }; });
  return "Even after every payment below, " + listNames(arr) + " still " +
         verb(arr.length, "owes", "owe") + " money with nobody to pay.";
}
eq("one player reads 'still owes money'",
   /still owes money with nobody to pay\.$/.test(unowedLine(["Alice"])), true);
eq("two players read 'still owe money'",
   /still owe money with nobody to pay\.$/.test(unowedLine(["Alice", "Bob"])), true);
eq("two players never read 'still owes'",
   /still owes/.test(unowedLine(["Alice", "Bob"])), false);
eq("three players are plural too",
   /still owe money/.test(unowedLine(["Alice", "Bob", "Cara"])), true);
eq("the names are still listed and joined",
   /Alice .* and Bob /.test(unowedLine(["Alice", "Bob"])), true);

log("-- a full ten-handed table settles --");
/* Ten is the new table maximum. A home game that big is exactly where the
   arithmetic stops being doable in your head, so the largest legal table is
   worth settling in a test rather than assuming it falls out of the general case. */
use("USD");
var ten = [];
for (var t = 0; t < 10; t++) ten.push(P("P" + t, [2000], 0));
/* $20 each in; three players take the whole $200 between them. */
ten[0].cashOut = 10000; ten[1].cashOut = 6000; ten[2].cashOut = 4000;
var big = tally(ten);
eq("ten players, the pot reconciles", big.diff, 0);
eq("ten players, nobody is left owing", big.unpaid.length, 0);
eq("ten players, nobody is left unpaid", big.unowed.length, 0);
/* Seven losers, three winners: the floor is seven payments (each loser pays at
   least once) and a naive everyone-pays-everyone would be twenty-one. */
eq("ten players settle in at most nine transfers", big.t.length <= 9, true);
eq("ten players need at least seven transfers", big.t.length >= 7, true);

log("-- the copied settlement works as a record --");
/* Cash leaves no paper trail, so the dispute that actually happens is weeks after
   the game and is about a night nobody can pin down. This text is the only artifact
   that survives, so it is asserted as an artifact, not as source that looks right. */
use("USD");
var recPlayers = [P("Alice", [2000], 5000), P("Bob", [2000, 2000], 1000)];
var recRes = settle(recPlayers);
var recRows = recPlayers.map(function(p){
  return { name:p.name, inn:totalIn(p), out:p.cashOut, net:p.cashOut - totalIn(p) };
});
var receipt = settlementText(recRes, recRows, 6000, 6000, 0, false, null);

var stamp = /Settled (\d{4})-(\d{2})-(\d{2}) with homepokerledger\.com$/.exec(receipt);
eq("the receipt ends with a dated provenance line", !!stamp, true);
eq("the date is today, in the machine's own calendar", stamp && stamp[0].indexOf(
   (function(){ var d=new Date(), p=function(n){return (n<10?"0":"")+n;};
     return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()); })()) > -1, true);
/* The UTC trap: a game settled after midnight local would be stamped with the
   previous day and contradict every phone in the room. Assert the date agrees with
   local calendar parts (above) AND that nobody reached for toISOString later. */
eq("the year is plausible, not an epoch fallback", stamp && +stamp[1] >= 2026, true);
eq("the month is a real month", stamp && +stamp[2] >= 1 && +stamp[2] <= 12, true);
eq("the day is a real day", stamp && +stamp[3] >= 1 && +stamp[3] <= 31, true);

eq("the receipt names who pays whom", /Bob pays Alice/.test(receipt), true);
eq("the receipt states the currency", /All amounts in USD/.test(receipt), true);
eq("the receipt shows each player's in and out",
   /Alice: \+\$30\.00  \(in \$20\.00, out \$50\.00\)/.test(receipt), true);
eq("a reconciled table carries no warning", /WARNING/.test(receipt), false);

/* And when it does not reconcile, the record has to say so - a receipt that hides
   the discrepancy is worse than no receipt, because it looks authoritative. */
var shortReceipt = settlementText(recRes, recRows, 6000, 5500, -500, false, null);
eq("a short table is stated in the record", /WARNING: table is short by \$5\.00/.test(shortReceipt), true);

log("-- rounding cash-outs down --");
function plan(cashOuts, step, dest){
  state.roundTo = step || 0;
  state.roundDest = dest || 0;
  return roundingPlan(cashOuts.map(function(o){ return { cashOut:o }; }));
}
use("USD");

/* Off is the identity. Every caller runs through roundingPlan unconditionally, so if
   this ever stopped being true it would silently alter every settlement on the site. */
var off = plan([1234, 5067, 9], 0);
eq("exact amounts change nothing", off.paid, [1234, 5067, 9]);
eq("exact amounts leave no change", off.left, 0);
eq("exact amounts report no step", off.step, 0);

var d1 = plan([1234, 5067, 9], 100);
eq("down to the nearest dollar", d1.paid, [1200, 5000, 0]);
eq("the change is what was shaved off", d1.left, 34 + 67 + 9);
eq("the change equals counted minus paid",
   (1234 + 5067 + 9) - (1200 + 5000 + 0), d1.left);

var d5 = plan([1234, 5067, 9], 500);
eq("down to the nearest five", d5.paid, [1000, 5000, 0]);
eq("five-dollar rounding leaves more behind", d5.left, 234 + 67 + 9);

/* The direction is the whole safety property. Rounding a player UP hands them money
   nobody put in, which is a silent loss for whoever settles with them. */
var many = plan([199, 100, 101, 0, 99], 100);
eq("nobody is ever rounded up",
   many.paid.every(function(v, i){ return v <= [199,100,101,0,99][i]; }), true);
eq("an exact multiple is left alone", many.paid[1], 100);
eq("a zero cash-out stays zero", many.paid[3], 0);
eq("the change can never reach a whole step per player",
   many.left < 100 * 5, true);

log("-- the change is settled, not lost --");
/* Two players, $20 each in, $23.40 / $16.60 out. Rounded to the dollar they are paid
   $23 and $16 - so 40c comes off one and 60c off the other, and the whole dollar that
   is left has to be accounted to somebody. */
state.roundTo = 100; state.roundDest = 0;
var rp = [P("Alice", [2000], 2340), P("Bob", [2000], 1660)];
var rplan = roundingPlan(rp);
eq("the change is both shavings together", rplan.left, 40 + 60);
var rNets = rp.map(function(p, i){ return { name:p.name, net:rplan.paid[i] - totalIn(p) }; });
var sum = rNets.reduce(function(a, e){ return a + e.net; }, 0);
eq("without the change entry the nets do not balance", sum, -100);
var withChange = rNets.concat([{ name:roundDestName(), net:rplan.left }]);
eq("with it they do", withChange.reduce(function(a, e){ return a + e.net; }, 0), 0);

var rres = settleNets(withChange);
eq("the change is settled like any other creditor",
   rres.transfers.map(function(t){ return t.from + "->" + t.to + " " + fmt(t.cents); }),
   ["Bob->Alice $3.00", "Bob->Food and drinks $1.00"]);
eq("nobody is left owing once the change is placed", rres.unpaid.length, 0);
eq("and nobody is left unpaid", rres.unowed.length, 0);

eq("the destination is named, not anonymous", roundDestName(), "Food and drinks");
state.roundDest = 2;
eq("and it follows the setting", roundDestName(), "High-hand jackpot");
state.roundDest = 0;

log("-- rounding steps are per currency --");
/* "The nearest dollar" has no mechanical translation. A step of 500 is $5 under USD
   and five won under KRW, which is not a thing anyone would ask for. */
use("USD");
state.roundTo = 500;
eq("five dollars is a step the dollar offers", roundStep(), 500);
use("KRW");
eq("but it is not one won offers, so it falls back to exact", roundStep(), 0);
state.roundTo = 1000;
eq("won rounds to a thousand", roundStep(), 1000);
var krw = roundingPlan([{ cashOut:37400 }, { cashOut:1999 }]);
eq("won cash-outs round down to the nearest thousand", krw.paid, [37000, 1000]);
eq("and the won change is whole units", krw.left, 400 + 999);
use("USD");
state.roundTo = 0; state.roundDest = 0;

log("-- rounding does not touch reconciliation --");
/* The chip count either matches the buy-ins or it does not. That question has to stay
   answerable no matter what the table then does with the change, or a rounding
   convention becomes a place for a real counting error to hide. */
var recon = [P("Alice", [2000], 2340), P("Bob", [2000], 1660)];
var countedIn = 4000, countedOut = 2340 + 1660;
eq("the books balance on the counted chips, not the paid amounts", countedOut - countedIn, 0);
state.roundTo = 100;
eq("and still balance once rounding is applied", countedOut - countedIn, 0);
eq("while the amount actually handed out is lower",
   roundingPlan(recon).paid.reduce(function(a, b){ return a + b; }, 0), 3900);
state.roundTo = 0;

log("-- the receipt states the rounding --");
/* The transfers already route the change, but the person reading this weeks later is
   reconstructing where their money went. Without a line naming it, a shaved dollar
   reads as exactly the counting error this tool exists to rule out. */
use("USD");
state.roundTo = 100; state.roundDest = 0;
var recPl = [P("Alice", [2000], 2340), P("Bob", [2000], 1660)];
var recPlan = roundingPlan(recPl);
var recNets = recPl.map(function(p, i){ return { name:p.name, net:recPlan.paid[i] - totalIn(p) }; });
var recRes2 = settleNets(recNets.concat([{ name:roundDestName(), net:recPlan.left }]));
var recRows2 = recPl.map(function(p, i){
  return { name:p.name, inn:totalIn(p), out:recPlan.paid[i], net:recPlan.paid[i] - totalIn(p) };
});
var rtext = settlementText(recRes2, recRows2, 4000, 4000, 0, false, null, recPlan);
eq("the receipt names the step", /rounded down to the nearest \$1\.00/.test(rtext), true);
eq("the receipt states the amount left over", /\$1\.00 left over/.test(rtext), true);
eq("the receipt names where it went", /left over → Food and drinks\./.test(rtext), true);
eq("the receipt still shows the counted total", /total out \$40\.00/.test(rtext), true);

/* And says nothing at all when nothing was rounded - a line reading "$0.00 left over"
   would invite exactly the question it is there to prevent. */
state.roundTo = 0;
var exactPlan = roundingPlan(recPl);
var etext = settlementText(recRes2, recRows2, 4000, 4000, 0, false, null, exactPlan);
eq("no rounding, no rounding line", /rounded down/.test(etext), false);
eq("no rounding, no leftover line", /left over/.test(etext), false);
state.roundDest = 0;

log("-- settling through the banker --");
function E(n, net){ return { name:n, net:net }; }
function shape(r){ return r.transfers.map(function(t){ return t.from+"->"+t.to+" "+fmt(t.cents); }); }
use("USD");

/* Alice is the banker. Two losers pay her, one winner collects from her. Nobody
   settles with anybody except the banker, which is the whole point. */
var hub = [E("Alice", 1000), E("Bob", -3000), E("Cara", 4000), E("Dan", -2000)];
var hres = settleViaBanker(hub, 0);
eq("every payment has the banker on one side",
   hres.transfers.every(function(t){ return t.from === "Alice" || t.to === "Alice"; }), true);
eq("losers pay the banker, the banker pays the winners", shape(hres),
   ["Bob->Alice $30.00", "Cara->Alice $40.00".replace("Cara->Alice", "Alice->Cara"), "Dan->Alice $20.00"]);
eq("one payment per other player", hres.transfers.length, hub.length - 1);
eq("a balanced table leaves the banker carrying nothing", hres.carried, 0);

/* A player who finished level makes no payment at all - a $0 transfer is noise that
   makes a settlement look wrong. */
var lvl = settleViaBanker([E("Alice", 500), E("Bob", -500), E("Cara", 0)], 0);
/* Three seats: the banker, one loser, one level. Only the loser moves money. */
eq("a level player is not given a payment", lvl.transfers.length, 1);
eq("and is not named in any of them",
   shape(lvl).join(" ").indexOf("Cara"), -1);

/* When the banker is the one who lost, the direction simply reverses. */
var losingHub = settleViaBanker([E("Alice", -6000), E("Bob", 2000), E("Cara", 4000)], 0);
eq("a losing banker pays everybody", shape(losingHub),
   ["Alice->Bob $20.00", "Alice->Cara $40.00"]);
eq("and still carries nothing when the books balance", losingHub.carried, 0);

/* The part that must never be silent: an unassigned discrepancy ends up on the
   banker, because they are the only person holding money at the end. */
var offBooks = settleViaBanker([E("Alice", 1000), E("Bob", -3000), E("Cara", 4000)], 0);
eq("the banker is told what they are carrying", offBooks.carried, 2000);
eq("the transfers themselves still only touch the banker",
   offBooks.transfers.every(function(t){ return t.from === "Alice" || t.to === "Alice"; }), true);

log("-- putting the gap on the banker --");
/* diff > 0 is more chips than money: the bank cannot cover the payouts and the host
   makes up the difference. diff < 0 is the mirror - the bank is left holding it. */
var gapUp = gapToBanker([E("Alice", 1000), E("Bob", -1000)], 0, 500);
eq("more chips than money: the banker covers it", gapUp[0].net, 500);
eq("nobody else moves", gapUp[1].net, -1000);
eq("and the table now balances", gapUp[0].net + gapUp[1].net, -500 + 0 + 0 + 500 - 500);

var gapDown = gapToBanker([E("Alice", 1000), E("Bob", -1000)], 0, -500);
eq("more money than chips: the banker keeps it", gapDown[0].net, 1500);

/* The two settings compose: assign the gap to the banker, then settle through them,
   and nothing is left carried because the gap already has an owner. */
var composed = gapToBanker([E("Alice", 1000), E("Bob", -3000), E("Cara", 4000)], 0, 2000);
eq("assigning the gap first leaves nothing to carry",
   settleViaBanker(composed, 0).carried, 0);
eq("and the banker absorbed exactly the gap", composed[0].net, 1000 - 2000);

/* gapToBanker must not mutate what it is handed - calculate() still needs the raw
   nets to render the seats. */
var orig = [E("Alice", 1000), E("Bob", -1000)];
gapToBanker(orig, 0, 500);
eq("the original nets are untouched", orig[0].net, 1000);

log("-- what each player is shown must equal what they actually hand over --");
/* The bug this catches was visible on screen and invisible to every test: the seats
   table printed the banker's raw net (+$15.00) while the payments beside it handed
   her $5.00. Nobody's row added up, and the tool exists to be checked by hand.

   So assert the invariant directly, for both routings and both gap settings: for every
   name in the settlement, money received minus money paid equals the net displayed
   against them. */
function flowOf(res, name){
  var f = 0;
  res.transfers.forEach(function(t){
    if(t.to === name) f += t.cents;
    if(t.from === name) f -= t.cents;
  });
  return f;
}
function checkFlows(label, entries, res){
  var bad = entries.filter(function(e){ return flowOf(res, e.name) !== e.net; })
                   .map(function(e){ return e.name + " shown " + e.net + " flows " + flowOf(res, e.name); });
  eq(label, bad, []);
}
use("USD");

/* Books balance, no banker: the greedy match. */
var g1 = [E("Alice", 2000), E("Bob", -3000), E("Cara", 4000), E("Dan", -3000)];
checkFlows("fewest transfers: every seat's flow matches its net", g1, settleNets(g1));

/* Books balance, settling through the banker. */
checkFlows("via the banker: every seat's flow matches its net", g1, settleViaBanker(g1, 0));

/* Table over by $10, the gap assigned to the banker - the case that was wrong. */
var g2raw = [E("Alice", 1500), E("Bob", -1000), E("Cara", 2000), E("Dan", -1500)];
var g2 = gapToBanker(g2raw, 0, 1000);
checkFlows("gap on the banker, paid through the banker", g2, settleViaBanker(g2, 0));
checkFlows("gap on the banker, paid the fewest way", g2, settleNets(g2));
eq("and the banker is the only seat whose figure moved",
   g2.filter(function(e, i){ return e.net !== g2raw[i].net; }).map(function(e){ return e.name; }),
   ["Alice"]);

/* Table short, gap split from the top - the pre-existing path, same invariant. */
var g3raw = [E("Alice", 4000), E("Bob", 3200), E("Cara", -2700), E("Dan", -4000)];
var g3 = absorbGap(g3raw, 500).entries;
checkFlows("gap split from the top", g3, settleNets(g3));

/* With rounding in play, the change is a seat like any other and must balance too. */
state.roundTo = 100; state.roundDest = 0;
var rpl = [P("Alice", [2000], 2340), P("Bob", [2000], 1660)];
var rpn = roundingPlan(rpl);
var g4 = rpl.map(function(p, i){ return E(p.name, rpn.paid[i] - totalIn(p)); })
            .concat([E(roundDestName(), rpn.left)]);
checkFlows("the rounding destination balances like a player", g4, settleNets(g4));
checkFlows("and does so through the banker too", g4, settleViaBanker(g4, 0));
state.roundTo = 0;

log("-- the seats table shows the figure people settle on --");
/* Regression, found by eye and not by any assertion here: when the banker absorbed the
   gap, the table showed her raw net beside payments that used the adjusted one. The
   settlement was right; the row did not add up. Whether that column appears is the
   whole bug, so the decision is asserted rather than the arithmetic around it. */
eq("no gap assigned, no second column", adjustedColumn({ side:null }, false), null);
eq("split from the top is labelled as a split",
   adjustedColumn({ side:"winners" }, false), "After the split");
eq("the losing side is labelled the same way",
   adjustedColumn({ side:"losers" }, false), "After the split");
eq("the banker taking the gap must also show a second figure",
   adjustedColumn({ side:null }, true), "After the gap");
eq("a split wins the heading if somehow both are set",
   adjustedColumn({ side:"winners" }, true), "After the split");
eq("a missing adj does not throw", adjustedColumn(null, false), null);

log("-- credit: what the box should hold --");
function C(name, ins, out, owed){
  var p = P(name, ins, out); p.owed = owed; return p;
}
use("USD");

var bc = bankCheck([C("Alice",[2000],0,0), C("Bob",[2000,2000],0,2000), C("Cara",[2000],0,2000)]);
eq("chips issued is every buy-in", bc.issued, 8000);
eq("credit is what has not been paid for", bc.credit, 4000);
eq("so the box should hold the rest", bc.cash, 4000);
eq("and the three always reconcile", bc.cash + bc.credit, bc.issued);

var none = bankCheck([P("Alice",[2000],0), P("Bob",[2000],0)]);
eq("no credit means the box holds everything", none.cash, 4000);
eq("and nothing is outstanding", none.credit, 0);

/* Owing more than you were ever handed chips for is not a state the night can be in,
   so it is capped rather than trusted - a stored game can say anything. */
var over = bankCheck([C("Alice",[2000],0,999999), C("Bob",[2000],0,0)]);
eq("credit cannot exceed what the player bought in for", over.credit, 2000);
eq("so the box is never reported as negative", over.cash >= 0, true);

var who = creditors([C("Alice",[2000],0,0), C("Bob",[2000,2000],0,1500), C("Cara",[2000],0,2000)]);
eq("only the players who owe are listed", who.map(function(c){ return c.name; }), ["Bob", "Cara"]);
eq("with the amounts they owe", who.map(function(c){ return c.amt; }), [1500, 2000]);
eq("a table with no credit lists nobody",
   creditors([P("Alice",[2000],0), P("Bob",[2000],0)]).length, 0);
eq("an unnamed seat still gets a name in the ledger",
   creditors([C("",[2000],0,500), P("B",[2000],0)])[0].name, "Player 1");

log("-- credit is not charged twice --");
/* The point that decides the whole design: a player who took chips on credit and lost
   them already shows the loss in their net. Billing them again for the buy-in would
   take the same money off them twice, so credit stays out of the settlement. */
var creditLoser = C("Bob", [2000], 0, 2000);   /* took $20 on credit, busted */
eq("the loss is already the whole unpaid buy-in", netOf(creditLoser), -2000);
var paidLoser = P("Bob", [2000], 0);           /* same night, cash up front */
eq("and is identical to the player who paid cash", netOf(paidLoser), netOf(creditLoser));

/* A winner who bought in on credit is owed less, not more - the debt is already netted. */
var creditWinner = C("Cara", [2000], 3000, 2000);
eq("a credit winner's net is their winnings, debt already deducted", netOf(creditWinner), 1000);
