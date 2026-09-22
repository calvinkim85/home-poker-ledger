// needs: core

/* Adversarial and volume testing of the money layer and the settlement algorithm.
   Concurrency is not the risk here — the site is static files with no server and no
   shared state, so users never interact. The risk is one person entering something
   the arithmetic mishandles, and the damage is a wrong answer about who owes money. */

function mulberry(seed){                 /* deterministic, so a failure reproduces */
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

log("-- parseMoney against junk, in every currency --");
var JUNK = ["", " ", "abc", "12abc34", "..", "-", "--5", "1.2.3", "1e5", "0x10", "NaN",
            "Infinity", "-Infinity", "1,,000", "$-5", "٣", "1 000 000", " ", "+5",
            ".", "0.", ".5", "-0", "1e-7", "  42  ", "1.2e3"];
Object.keys(CURRENCIES).forEach(function(code){
  state.currency = code;
  JUNK.forEach(function(j){
    var v = parseMoney(j);
    eq(code + " parseMoney(" + JSON.stringify(j) + ") is null, 0, or a safe integer",
       v === null || (typeof v === "number" && isFinite(v) && v >= 0 &&
                      v === Math.round(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER), true);
  });
});
state.currency = "USD";

log("-- amounts near and beyond the float-safe range --");
var BIG = ["9007199254740991", "9007199254740992", "99999999999999999999",
           "1".repeat(25), "12345678901234567890.99"];
BIG.forEach(function(b){
  var v = parseMoney(b);
  eq("parseMoney(" + b.slice(0, 12) + "…) does not return an unsafe integer",
     v === null || Math.abs(v) <= Number.MAX_SAFE_INTEGER, true);
});

log("-- a full table settles, balances, and never invents money (500 random tables) --");
var rnd = mulberry(20260906), bad = 0, worst = 0, nonPositive = 0, tables = 0;
for(var t = 0; t < 500; t++){
  var n = 2 + Math.floor(rnd() * 8);                 /* 2..9 players */
  var players = [], pot = 0;
  for(var i = 0; i < n; i++){
    var buys = [], rebuys = 1 + Math.floor(rnd() * 12);
    for(var b = 0; b < rebuys; b++){
      var amt = Math.floor(rnd() * 500000);          /* up to $5,000 a buy-in */
      buys.push(amt); pot += amt;
    }
    players.push({ name:"P" + i, buyIns:buys, cashOut:0 });
  }
  /* Deal the whole pot back out, so the books must balance exactly. */
  var left = pot;
  for(var i = 0; i < n - 1; i++){
    var give = Math.floor(rnd() * left);
    players[i].cashOut = give; left -= give;
  }
  players[n - 1].cashOut = left;

  var res = settle(players);
  var moved = {}, transfers = res.transfers || [];
  transfers.forEach(function(x){
    if(!(x.cents > 0)) nonPositive++;
    moved[x.from] = (moved[x.from] || 0) - x.cents;
    moved[x.to]   = (moved[x.to]   || 0) + x.cents;
  });
  /* Every player must end square: what actually moved to or from them equals the
     net they were owed. net > 0 means they receive, so moved must equal net — not
     cancel it. (I had this sign inverted first time and it looked like a settlement
     bug for a while; it was the assertion.) */
  players.forEach(function(p){
    if ((moved[p.name] || 0) !== netOf(p)) bad++;
  });
  if (transfers.length > n - 1) worst = Math.max(worst, transfers.length);
  tables++;
}
eq("500 tables were generated", tables, 500);
eq("every player on every table ends square", bad, 0);
eq("no table ever needs more than n-1 transfers", worst, 0);
eq("no transfer is ever zero or negative", nonPositive, 0);

log("-- extreme but legal single tables --");
var nine = [];
for(var i = 0; i < 9; i++) nine.push({ name:"P" + i, buyIns:[2000], cashOut:0 });
nine[0].cashOut = 18000;
var r9 = settle(nine);
eq("nine players, one winner, settles in 8 transfers", (r9.transfers || []).length, 8);

var many = [{ name:"A", buyIns:[], cashOut:0 }, { name:"B", buyIns:[2000], cashOut:0 }];
for(var i = 0; i < 1000; i++) many[0].buyIns.push(2000);
eq("1,000 rebuys still totals correctly", totalIn(many[0]), 2000000);
eq("1,000 rebuys does not lose precision", netOf(many[0]), -2000000);

log("-- identical names must not collide --");
var dup = [{name:"Sam", buyIns:[2000], cashOut:0},
           {name:"Sam", buyIns:[2000], cashOut:4000},
           {name:"Sam", buyIns:[2000], cashOut:2000}];
var rd = settle(dup);
var total = (rd.transfers || []).reduce(function(a, x){ return a + x.cents; }, 0);
eq("three players all called Sam still settle", total, 2000);

log("-- the bounds that keep totals exact --");
eq("MAX_AMOUNT is declared", typeof MAX_AMOUNT, "number");
eq("MAX_BUYINS is declared", typeof MAX_BUYINS, "number");
/* The whole point of the cap: the worst possible table must still be exact. */
var worstCase = 9 * MAX_BUYINS * MAX_AMOUNT * 100;   /* minor units, 2-decimal currency */
eq("the worst possible table stays inside the safe integer range",
   worstCase < Number.MAX_SAFE_INTEGER, true);
eq("and with at least 10x headroom",
   worstCase * 10 < Number.MAX_SAFE_INTEGER, true);

log("-- over-cap input is rejected, not silently changed --");
state.currency = "USD";
[["99999999999999999999", "twenty nines"],
 ["1000000001", "one over the cap"],
 ["1e9", "exponent form is junk anyway"],
 ["12345678901234567890.99", "long with decimals"]].forEach(function(pair){
  eq("parseMoney rejects " + pair[1], parseMoney(pair[0]), null);
});
eq("exactly the cap is still accepted", parseMoney("1000000000"), 1e9 * 100);
eq("a normal amount is untouched", parseMoney("20.00"), 2000);
eq("a large but sane amount is fine", parseMoney("1000000"), 100000000);

log("-- every accepted value is a safe integer, in every currency --");
Object.keys(CURRENCIES).forEach(function(code){
  state.currency = code;
  ["0", "1", "20.00", "999999999", "1000000000", "0.01", "50000"].forEach(function(v){
    var u = parseMoney(v);
    eq(code + " parseMoney(" + v + ") is exact or rejected",
       u === null || (Number.isSafeInteger(u) && u >= 0), true);
  });
});
state.currency = "USD";

log("-- a maxed-out table still settles exactly --");
var maxed = [];
for(var i = 0; i < 9; i++){
  var b = [];
  for(var j = 0; j < MAX_BUYINS; j++) b.push(MAX_AMOUNT * 100);
  maxed.push({ name:"P" + i, buyIns:b, cashOut:0 });
}
maxed[0].cashOut = 9 * MAX_BUYINS * MAX_AMOUNT * 100;
eq("the biggest legal pot is still a safe integer", Number.isSafeInteger(totalIn(maxed[0]) * 9), true);
var rm = settle(maxed);
var sum = (rm.transfers || []).reduce(function(a, x){ return a + x.cents; }, 0);
eq("the biggest legal table settles without losing a unit",
   sum, 8 * MAX_BUYINS * MAX_AMOUNT * 100);
eq("and does it in 8 transfers", (rm.transfers || []).length, 8);
