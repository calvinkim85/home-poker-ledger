// needs: storage

/* Opening somebody's share link used to replace your own saved game the first time you
   touched anything: boot skipped save(), but every handler (theme, typing a name)
   called it, and save() wrote whatever was on screen - the friend's game. Found by the
   2026-11-05 chaos run and both security reviews. */

function reset(){ state={players:[],defaultBuyIn:2000,currency:"USD",gapMode:"show",payVia:"fewest",roundTo:0,roundDest:0}; themeState="dark"; store={}; viewingShared=false; }

log("-- while a shared game is on screen, save() leaves your own game alone --");
reset();
var mine = JSON.stringify({ players:[{name:"Me",buyIns:[2000],cashOut:0},{name:"You",buyIns:[2000],cashOut:4000}],
                            defaultBuyIn:2000, currency:"USD", theme:"dark" });
store[KEY] = mine;
var shared = decodeShare("#g=" + encodeURIComponent(JSON.stringify({ c:"USD", p:[{n:"Friend1",b:[2000],o:3000},{n:"Friend2",b:[2000],o:1000}] })));
state.players = shared.players; viewingShared = true;
themeState = "light";
save();
var after = JSON.parse(store[KEY]);
eq("own players survive", after.players.map(function(p){ return p.name; }), ["Me", "You"]);
eq("own amounts survive", after.players[1].cashOut, 4000);
eq("the colour scheme is still remembered", after.theme, "light");

log("-- with nothing saved yet, viewing a link stores nothing --");
reset();
state.players = shared.players; viewingShared = true;
save();
eq("storage still empty", store[KEY] || null, null);

log("-- your own game still saves normally --");
reset();
state.players = [{name:"A",buyIns:[100],cashOut:0},{name:"B",buyIns:[100],cashOut:200}];
save();
eq("saved", JSON.parse(store[KEY]).players[1].cashOut, 200);
