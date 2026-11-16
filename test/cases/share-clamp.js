// needs: storage

/* decodeShare runs before boot sets state.currency, so a link's amounts were clamped
   against whatever currency this browser was showing (USD at boot), not the link's
   own. A KRW link could therefore carry 100x MAX_AMOUNT: ₩99,999,999,999 per entry,
   and ten such entries summed past Number.MAX_SAFE_INTEGER. Likewise a hand-edited
   store's defaultBuyIn was never clamped at all: 1.7e308 plus two rebuys rendered "$∞".
   Found by both 2026-11-05 security reviews. */

function reset(){ state={players:[],defaultBuyIn:2000,currency:"USD",gapMode:"show",payVia:"fewest",roundTo:0,roundDest:0}; store={}; }

log("-- a link's amounts are bounded by the link's currency --");
reset();
var g = decodeShare("#g=" + encodeURIComponent(JSON.stringify({ c:"KRW", p:[{n:"A",b:[1e12],o:0},{n:"B",b:[0],o:1e12}] })));
eq("KRW buy-in capped at MAX_AMOUNT won", g.players[0].buyIns[0], MAX_AMOUNT);
eq("KRW cash-out capped at MAX_AMOUNT won", g.players[1].cashOut, MAX_AMOUNT);
eq("browser currency untouched by decoding", state.currency, "USD");
var u = decodeShare("#g=" + encodeURIComponent(JSON.stringify({ c:"USD", p:[{n:"A",b:[1e12],o:0},{n:"B",b:[0],o:0}] })));
eq("USD cap is MAX_AMOUNT dollars in cents", u.players[0].buyIns[0], MAX_AMOUNT * 100);
state.currency = "KRW";
var u2 = decodeShare("#g=" + encodeURIComponent(JSON.stringify({ c:"USD", p:[{n:"A",b:[123456],o:0},{n:"B",b:[0],o:0}] })));
eq("a USD link opened in a KRW browser keeps its cents", u2.players[0].buyIns[0], 123456);

log("-- the stored standard buy-in is bounded too --");
reset();
store[KEY] = JSON.stringify({ players:[{name:"A",buyIns:[100],cashOut:0},{name:"B",buyIns:[100],cashOut:200}],
                              defaultBuyIn:1.7e308, currency:"USD" });
load();
eq("defaultBuyIn capped", state.defaultBuyIn, MAX_AMOUNT * 100);
reset();
store[KEY] = JSON.stringify({ players:[{name:"A",buyIns:[100],cashOut:0},{name:"B",buyIns:[100],cashOut:200}],
                              defaultBuyIn:1500.4, currency:"USD" });
load();
eq("an ordinary value is just rounded", state.defaultBuyIn, 1500);
