// needs: storage



function reset(){ state={players:[],defaultBuyIn:2000,currency:"USD"}; themeState="auto"; }

log("-- migration: a pre-currency payload is USD cents --");
reset();
store[KEY]=JSON.stringify({ players:[{name:"Alice",buyIns:[2000],cashOut:6000},
                                     {name:"Bob",buyIns:[2000,2000],cashOut:0}],
                            defaultBuyIn:2000, theme:"dark" });   /* no currency key */
eq("load succeeds", load(), true);
eq("defaults to USD", state.currency, "USD");
eq("numbers untouched", state.players[0].cashOut, 6000);
eq("theme still read", themeState, "dark");

log("-- a KRW payload round-trips --");
reset();
store[KEY]=JSON.stringify({ players:[{name:"A",buyIns:[50000],cashOut:0},
                                     {name:"B",buyIns:[50000],cashOut:100000}],
                            defaultBuyIn:50000, currency:"KRW", theme:"auto" });
eq("load succeeds", load(), true);
eq("currency kept", state.currency, "KRW");
eq("won kept whole", state.players[1].cashOut, 100000);

log("-- junk currency falls back to USD --");
reset();
store[KEY]=JSON.stringify({ players:[{name:"A",buyIns:[100],cashOut:0},{name:"B",buyIns:[100],cashOut:200}],
                            defaultBuyIn:100, currency:"BTC", theme:"auto" });
load();
eq("unknown code rejected", state.currency, "USD");

log("-- inherited Object keys cannot smuggle a currency (attacker poked this) --");
reset();
store[KEY]=JSON.stringify({ players:[{name:"A",buyIns:[100],cashOut:0},{name:"B",buyIns:[100],cashOut:200}],
                            defaultBuyIn:100, currency:"constructor", theme:"auto" });
load();
eq("constructor rejected as currency", state.currency, "USD");
reset();
store[KEY]=JSON.stringify({ players:[{name:"A",buyIns:[100],cashOut:0},{name:"B",buyIns:[100],cashOut:200}],
                            defaultBuyIn:100, currency:"toString", theme:"auto" });
load();
eq("toString rejected as currency", state.currency, "USD");

log("-- corrupt payloads never throw --");
reset(); store[KEY]="{not json";
eq("garbage returns false", load(), false);
reset(); store[KEY]=JSON.stringify({players:[{name:"solo",buyIns:[100],cashOut:0}],currency:"EUR"});
eq("one player rejected", load(), false);
eq("but currency still applied", state.currency, "EUR");

log("-- this suite tests the real load(), not a copy of it --");
/* It used to carry a hand-written duplicate of load() plus its own CURRENCIES, state
   and localStorage, which shadowed everything the harness extracts. The copy had
   drifted: no MAX_BUYINS cap, no clampUnits, no `done` field. Eleven tests were
   passing against a fossil.

   These assertions exercise behaviour that only exists in the real implementation, so
   the duplicate cannot quietly come back. */
reset();
var many = [];
for (var i = 0; i < 250; i++) many.push(2000);
store[KEY] = JSON.stringify({
  players: [{ name:"A", buyIns:many, cashOut:1e30 },
            { name:"B", buyIns:[2000], cashOut:0 }],
  defaultBuyIn: 2000, currency:"USD", absorb:false, theme:"dark"
});
eq("load succeeds", load(), true);
eq("buy-ins are capped at MAX_BUYINS", state.players[0].buyIns.length, MAX_BUYINS);
eq("an absurd cash-out is clamped, not stored raw",
   state.players[0].cashOut <= MAX_AMOUNT * 100, true);
eq("and stays a safe integer", Number.isSafeInteger(state.players[0].cashOut), true);
eq("the cashed-out flag is populated", state.players[0].done, false);

log("-- share links round-trip, and are treated as hostile input --");
function reset2(){ state={players:[],defaultBuyIn:2000,currency:"USD",
  gapMode:"show",payVia:"fewest",roundTo:0,roundDest:0}; }

reset2();
state.currency="KRW"; state.gapMode="top";
state.players=[{name:"김철수",buyIns:[50000,50000],cashOut:0,done:true},
               {name:"Bob",buyIns:[50000],cashOut:150000,done:true}];
var url = shareUrl();
eq("share url points at the site root fragment", url.indexOf("https://homepokerledger.com/#g=") === 0, true);
var got = decodeShare(url.slice(url.indexOf("#")));
eq("round-trip keeps the currency", got && got.currency, "KRW");
eq("round-trip keeps the gap setting", got && got.gapMode, "top");
eq("round-trip keeps a non-latin name", got && got.players[0].name, "김철수");
eq("round-trip keeps each buy-in separate", got && got.players[0].buyIns.length, 2);
eq("round-trip keeps the cash-out", got && got.players[1].cashOut, 150000);

eq("no fragment means no shared game", decodeShare(""), null);
eq("an unrelated fragment is ignored", decodeShare("#section"), null);
eq("garbage after g= does not throw", decodeShare("#g=%%%not-json"), null);
eq("a one-player share is rejected",
   decodeShare("#g=" + encodeURIComponent(JSON.stringify({c:"USD",p:[{n:"A",b:[1],o:1}]}))), null);

/* the bounds must hold for a link someone else built, exactly as they do for storage */
var hostile = decodeShare("#g=" + encodeURIComponent(JSON.stringify({
  c: "constructor",
  p: [{n:"A",b:[-5,1e30,"x"],o:-99}, {n:{},b:"nope",o:{}}, {n:"C",b:[100],o:100}]
})));
eq("inherited key rejected as a currency", hostile && hostile.currency, "USD");
eq("negative buy-in clamped", hostile && hostile.players[0].buyIns[0], 0);
eq("absurd buy-in clamped", hostile && hostile.players[0].buyIns[1] <= MAX_AMOUNT * 100, true);
eq("non-numeric buy-in clamped", hostile && hostile.players[0].buyIns[2], 0);
eq("negative cash-out clamped", hostile && hostile.players[0].cashOut, 0);
eq("non-string name replaced", hostile && hostile.players[1].name, "Player 2");
eq("non-array buy-ins become empty", hostile && hostile.players[1].buyIns.length, 0);

/* Spelled out rather than compared against MAX_PLAYERS: the prelude defines that
   constant too, so a self-referential assertion passes at any value. It did — raising
   the cap from 9 to 10 moved the suite total by exactly zero. Anyone changing the
   table size has to come and edit this line, which is the point. */
eq("the table holds ten", MAX_PLAYERS, 10);

var many = [];
for (var q = 0; q < 40; q++) many.push({n:"P"+q,b:[100],o:100});
var capped = decodeShare("#g=" + encodeURIComponent(JSON.stringify({c:"USD",p:many}))).players;
eq("player count capped at the table maximum", capped.length, 10);
/* (capped[9] || {}) — an indexed read with no guard turns a failing assertion into a
   crashed suite, which reports as no output at all rather than as one red line. */
eq("the tenth seat survives the cap", (capped[9] || {}).name, "P9");

log("-- load() and decodeShare() share one validator --");
/* If these ever diverge, one of the two untrusted inputs is unguarded. */
eq("readPlayers is what load() uses", typeof readPlayers, "function");
eq("readPlayers rejects a short table", readPlayers([{name:"A",buyIns:[1],cashOut:1}]), null);

log("-- rounding survives storage and links, and is validated like everything else --");
function twoPlayers(){ return [{name:"A",buyIns:[2000],cashOut:2340},
                               {name:"B",buyIns:[2000],cashOut:1660}]; }
function loadWith(extra){
  reset(); state.roundTo = 0; state.roundDest = 0;
  var payload = { players:twoPlayers(), defaultBuyIn:2000, currency:"USD", theme:"auto" };
  for(var k in extra) payload[k] = extra[k];
  store[KEY] = JSON.stringify(payload);
  return load();
}
eq("a stored step is restored", loadWith({roundTo:100}) && state.roundTo, 100);
eq("a stored destination is restored", loadWith({roundDest:3}) && state.roundDest, 3);
eq("no stored rounding means exact", loadWith({}) && state.roundTo, 0);

/* Same treatment as every other untrusted number. A step that is not on the list the
   currency offers is not a smaller or larger step - it is not a step at all. */
eq("an arbitrary step is refused", loadWith({roundTo:37}) && state.roundTo, 0);
eq("a negative step is refused", loadWith({roundTo:-100}) && state.roundTo, 0);
eq("a string step is refused", loadWith({roundTo:"100"}) && state.roundTo, 0);
eq("a destination past the end falls back", loadWith({roundDest:99}) && state.roundDest, 0);
eq("a negative destination falls back", loadWith({roundDest:-1}) && state.roundDest, 0);

/* The step is per currency, so it has to be validated against the currency being
   restored - not whichever one happened to be active a moment earlier. */
reset(); state.roundTo = 0;
store[KEY] = JSON.stringify({ players:twoPlayers(), defaultBuyIn:2000,
                              currency:"KRW", roundTo:500, theme:"auto" });
load();
eq("a dollar step does not survive into won", state.roundTo, 0);
eq("and the currency itself still loaded", state.currency, "KRW");

reset2();
state.currency = "USD"; state.roundTo = 500; state.roundDest = 2;
state.players = [{name:"A",buyIns:[2000],cashOut:2340,done:true},
                 {name:"B",buyIns:[2000],cashOut:1660,done:true}];
var rgot = decodeShare(shareUrl().slice(shareUrl().indexOf("#")));
eq("a share link carries the step", rgot && rgot.roundTo, 500);
eq("a share link carries the destination", rgot && rgot.roundDest, 2);

/* A link is hostile input, and it names its own currency - so the step in it must be
   checked against THAT currency, not against whatever this browser is showing. */
state.currency = "USD";
var mismatched = decodeShare("#g=" + encodeURIComponent(JSON.stringify(
  { c:"KRW", r:500, d:1, p:[{n:"A",b:[50000],o:60000},{n:"B",b:[50000],o:40000}] })));
eq("the link's currency is honoured", mismatched && mismatched.currency, "KRW");
eq("a step the link's currency never offered is dropped", mismatched && mismatched.roundTo, 0);
var krwLink = decodeShare("#g=" + encodeURIComponent(JSON.stringify(
  { c:"KRW", r:1000, p:[{n:"A",b:[50000],o:60000},{n:"B",b:[50000],o:40000}] })));
eq("a step it does offer survives", krwLink && krwLink.roundTo, 1000);
eq("a missing destination defaults", krwLink && krwLink.roundDest, 0);

log("-- the banker survives storage and links --");
function bankGame(markIdx){
  return [{name:"A",buyIns:[2000],cashOut:2000,banker:markIdx===0},
          {name:"B",buyIns:[2000],cashOut:2000,banker:markIdx===1},
          {name:"C",buyIns:[2000],cashOut:2000,banker:markIdx===2}];
}
reset(); state.gapMode="show"; state.payVia="fewest";
store[KEY]=JSON.stringify({players:bankGame(1),defaultBuyIn:2000,currency:"USD",
                           gapMode:"banker",payVia:"banker",theme:"auto"});
eq("load succeeds", load(), true);
eq("the banker is restored on the right seat", bankerIndex(state.players), 1);
eq("paying via the banker is restored", state.payVia, "banker");
eq("the gap going to the banker is restored", state.gapMode, "banker");

/* Exactly one. A hand-edited store can mark every seat, and two bankers would let
   bankerIndex pick one while the other still rendered as marked. */
reset();
store[KEY]=JSON.stringify({players:[{name:"A",buyIns:[2000],cashOut:2000,banker:true},
                                    {name:"B",buyIns:[2000],cashOut:2000,banker:true},
                                    {name:"C",buyIns:[2000],cashOut:2000,banker:true}],
                           defaultBuyIn:2000,currency:"USD",theme:"auto"});
load();
eq("three marked seats collapse to one", state.players.filter(function(p){ return p.banker; }).length, 1);
eq("and it is the first of them", bankerIndex(state.players), 0);

reset();
store[KEY]=JSON.stringify({players:bankGame(-1),defaultBuyIn:2000,currency:"USD",theme:"auto"});
load();
eq("no banker marked means no banker", bankerIndex(state.players), -1);
eq("a non-boolean banker flag is not truthy-coerced",
   readPlayers([{name:"A",buyIns:[1],cashOut:1,banker:"yes"},
                {name:"B",buyIns:[1],cashOut:1}])[0].banker, false);

reset2();
state.payVia="banker"; state.gapMode="banker";
state.players=[{name:"A",buyIns:[2000],cashOut:2000,done:true,banker:false},
               {name:"B",buyIns:[2000],cashOut:2000,done:true,banker:true}];
var bgot = decodeShare(shareUrl().slice(shareUrl().indexOf("#")));
eq("a link carries which seat is the banker", bgot && bankerIndex(bgot.players), 1);
eq("a link carries the payment routing", bgot && bgot.payVia, "banker");
eq("a link carries the gap setting", bgot && bgot.gapMode, "banker");

/* Links made before the banker existed carry only the old boolean. */
var oldLink = decodeShare("#g=" + encodeURIComponent(JSON.stringify(
  { c:"USD", a:true, p:[{n:"A",b:[2000],o:3000},{n:"B",b:[2000],o:1000}] })));
eq("an older link's absorb flag becomes cover-from-the-top", oldLink && oldLink.gapMode, "top");
eq("an older link has no banker", oldLink && bankerIndex(oldLink.players), -1);
eq("an older link pays the default way", oldLink && oldLink.payVia, "fewest");
var junkLink = decodeShare("#g=" + encodeURIComponent(JSON.stringify(
  { c:"USD", m:"evil", v:"evil", p:[{n:"A",b:[2000],o:3000},{n:"B",b:[2000],o:1000}] })));
eq("a junk gap mode falls back", junkLink && junkLink.gapMode, "show");
eq("a junk routing falls back", junkLink && junkLink.payVia, "fewest");

log("-- neither setting can outlive the banker it names --");
/* Un-marking the seat fixed only the screen: storage kept "banker" for both, so
   marking somebody else later silently restored a choice nobody had made again. */
reset();
state.players = [{name:"A",buyIns:[2000],cashOut:2000,banker:false},
                 {name:"B",buyIns:[2000],cashOut:2000,banker:false}];
state.gapMode = "banker"; state.payVia = "banker";
eq("dropping reports that it changed something", dropModesWithoutBanker(), true);
eq("the gap setting falls back", state.gapMode, "show");
eq("the routing falls back", state.payVia, "fewest");
eq("and doing it again reports no change", dropModesWithoutBanker(), false);

state.players[1].banker = true;
state.gapMode = "banker"; state.payVia = "banker";
eq("with a banker present nothing is dropped", dropModesWithoutBanker(), false);
eq("the gap setting stands", state.gapMode, "banker");

/* A stored game naming a banker that is not there must not load in that state. */
reset();
store[KEY] = JSON.stringify({ players:[{name:"A",buyIns:[2000],cashOut:2000},
                                       {name:"B",buyIns:[2000],cashOut:2000}],
                              defaultBuyIn:2000, currency:"USD",
                              gapMode:"banker", payVia:"banker", theme:"auto" });
load();
eq("loading a bankerless game drops the gap setting", state.gapMode, "show");
eq("loading a bankerless game drops the routing", state.payVia, "fewest");

/* Same for a crafted link, which is the version an attacker controls. */
var noBanker = decodeShare("#g=" + encodeURIComponent(JSON.stringify(
  { c:"USD", m:"banker", v:"banker", p:[{n:"A",b:[2000],o:3000},{n:"B",b:[2000],o:1000}] })));
eq("the link still decodes", !!noBanker, true);
eq("but names no banker", bankerIndex(noBanker.players), -1);

log("-- credit survives storage and links, and is bounded --");
reset();
store[KEY]=JSON.stringify({players:[{name:"A",buyIns:[2000],cashOut:0,banker:true},
                                    {name:"B",buyIns:[2000,2000],cashOut:0,owed:1500}],
                           defaultBuyIn:2000,currency:"USD",theme:"auto"});
eq("load succeeds", load(), true);
eq("a stored debt is restored", state.players[1].owed, 1500);
eq("a seat with no debt reads zero", state.players[0].owed, 0);

eq("a negative debt clamps to zero",
   readPlayers([{name:"A",buyIns:[2000],cashOut:0,owed:-500},
                {name:"B",buyIns:[2000],cashOut:0}])[0].owed, 0);
eq("a non-numeric debt clamps to zero",
   readPlayers([{name:"A",buyIns:[2000],cashOut:0,owed:"lots"},
                {name:"B",buyIns:[2000],cashOut:0}])[0].owed, 0);
eq("an absurd debt is clamped like every other amount",
   readPlayers([{name:"A",buyIns:[2000],cashOut:0,owed:1e30},
                {name:"B",buyIns:[2000],cashOut:0}])[0].owed <= MAX_AMOUNT * 100, true);
/* Stored unclamped against buy-ins on purpose: the cap belongs to the reading, so a
   game edited down to a smaller buy-in later cannot silently rewrite the debt. */
eq("bankCheck is what bounds a debt against the buy-ins",
   bankCheck(readPlayers([{name:"A",buyIns:[2000],cashOut:0,owed:500000},
                          {name:"B",buyIns:[2000],cashOut:0}])).credit, 2000);

reset2();
state.players=[{name:"A",buyIns:[2000],cashOut:2000,done:true,banker:true,owed:0},
               {name:"B",buyIns:[2000],cashOut:2000,done:true,banker:false,owed:800}];
var cgot = decodeShare(shareUrl().slice(shareUrl().indexOf("#")));
eq("a link carries the debt", cgot && cgot.players[1].owed, 800);
eq("and the seat with none", cgot && cgot.players[0].owed, 0);
var junkOwed = decodeShare("#g=" + encodeURIComponent(JSON.stringify(
  { c:"USD", p:[{n:"A",b:[2000],o:3000,w:"free money"},{n:"B",b:[2000],o:1000}] })));
eq("a junk debt in a link clamps to zero", junkOwed && junkOwed.players[0].owed, 0);
