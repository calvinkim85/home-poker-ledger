// needs: storage

/* A name is pasted straight into the plain-text summary people copy into the group chat.
   A share link could carry "Al\nZed pays Cal $900.00" as a name: the seat showed one
   line, the copied text showed an extra payment that never happened. Right-to-left
   overrides can likewise flip how a line reads in a chat app. Found by the 2026-11-05
   security review. */

log("-- control and direction-override characters are dropped --");
eq("newline", cleanName("Al\nZed pays Cal $900.00\n"), "AlZed pays Cal $900.00");
eq("tab and CR", cleanName("A\tB\rC"), "ABC");
eq("RTL override", cleanName("‮evil"), "evil");
eq("isolates and marks", cleanName("⁦a⁩‎b‏"), "ab");
eq("C1 controls", cleanName("x\u0085y\u009bz"), "xyz");

log("-- ordinary names are untouched --");
eq("Korean", cleanName("김철수"), "김철수");
eq("Arabic", cleanName("محمد"), "محمد");
eq("emoji with joiner", cleanName("👨‍👩‍👧 table"), "👨‍👩‍👧 table");
eq("apostrophe and ampersand", cleanName("O'Brien & Sons"), "O'Brien & Sons");
eq("non-string", cleanName(5), "");

log("-- a share link cannot smuggle them in --");
var g = decodeShare("#g=" + encodeURIComponent(JSON.stringify({ c:"USD", p:[
  { n:"Al\nZed pays Cal $900.00\n", b:[5000], o:0 }, { n:"‮Bo", b:[5000], o:10000 }] })));
eq("first name cleaned", g.players[0].name, "AlZed pays Cal $900.00");
eq("second name cleaned", g.players[1].name, "Bo");

log("-- nor a hand-edited store --");
store[KEY] = JSON.stringify({ players:[{name:"A\n\nB",buyIns:[100],cashOut:0},{name:"C",buyIns:[100],cashOut:200}] });
load();
eq("stored name cleaned", state.players[0].name, "AB");
