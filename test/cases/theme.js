// needs: storage


/* This suite used to carry its own CURRENCIES, state, localStorage and a hand-written
   copy of load(), all of which shadowed the real ones the `storage` prelude provides.
   The copy had drifted: it still restored `absorb`, a field the app replaced with
   gapMode, so four assertions here were certifying behaviour that no longer existed
   anywhere in the product. Removed - this suite now exercises the real load(). */

/* the boot line from the bottom of the IIFE */
function boot(){ load(); if(!themeState) themeState = systemTheme(); return themeState; }
function reset(){ themeState=null;
  state={players:[],defaultBuyIn:2000,currency:"USD",gapMode:"show",payVia:"fewest",roundTo:0,roundDest:0};
  store={}; }

var GAME = { players:[{name:"A",buyIns:[2000],cashOut:0},{name:"B",buyIns:[2000],cashOut:4000}],
             defaultBuyIn:2000, currency:"USD" };
function saved(extra){
  var o = JSON.parse(JSON.stringify(GAME));
  for(var k in extra) o[k]=extra[k];
  return JSON.stringify(o);
}

log("-- auto is gone --");
eq("only two themes", THEMES, ["dark","light"]);

log("-- a stored \"auto\" migrates to a real side --");
reset(); OS_DARK = true;  store[KEY]=saved({theme:"auto"});
eq("auto + dark OS  -> dark", boot(), "dark");
reset(); OS_DARK = false; store[KEY]=saved({theme:"auto"});
eq("auto + light OS -> light", boot(), "light");

log("-- an explicit choice survives and ignores the OS --");
reset(); OS_DARK = true;  store[KEY]=saved({theme:"light"});
eq("stored light wins over dark OS", boot(), "light");
reset(); OS_DARK = false; store[KEY]=saved({theme:"dark"});
eq("stored dark wins over light OS", boot(), "dark");

log("-- first run, nothing stored --");
reset(); OS_DARK = true;
eq("seeds from dark OS", boot(), "dark");
reset(); OS_DARK = false;
eq("seeds from light OS", boot(), "light");

log("-- junk theme falls back to the OS --");
reset(); OS_DARK = false; store[KEY]=saved({theme:"neon"});
eq("unknown value ignored", boot(), "light");

log("-- the gap setting persists, including from before it had a name --");
reset(); store[KEY]=saved({gapMode:"top"});    load();
eq("a mode round-trips", state.gapMode, "top");
/* Needs a banker actually marked: load() drops a mode that names a seat nobody has
   assigned, which is the invariant, not a bug in the fixture. */
reset();
store[KEY]=saved({gapMode:"banker", players:[{name:"A",buyIns:[2000],cashOut:0,banker:true},
                                             {name:"B",buyIns:[2000],cashOut:4000}]});
load();
eq("the banker mode round-trips when a seat is marked", state.gapMode, "banker");
reset(); store[KEY]=saved({gapMode:"banker"}); load();
eq("and is dropped when no seat is", state.gapMode, "show");
reset(); store[KEY]=saved({});                 load();
eq("missing key defaults to showing it", state.gapMode, "show");
reset(); store[KEY]=saved({gapMode:"nonsense"}); load();
eq("junk falls back to showing it", state.gapMode, "show");

/* Games saved before the banker existed carry the old boolean. Someone returning to a
   stored game should not silently lose the setting they chose. */
reset(); store[KEY]=saved({absorb:true});  load();
eq("a pre-banker absorb:true becomes cover-from-the-top", state.gapMode, "top");
reset(); store[KEY]=saved({absorb:false}); load();
eq("a pre-banker absorb:false becomes show-it", state.gapMode, "show");
reset(); store[KEY]=saved({absorb:"yes"}); load();
eq("and junk is still not truthy-coerced", state.gapMode, "show");
/* An explicit mode wins over the legacy flag when a store somehow has both. */
reset(); store[KEY]=saved({absorb:true, gapMode:"show"}); load();
eq("the newer key wins over the older one", state.gapMode, "show");
