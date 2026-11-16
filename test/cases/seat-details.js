// needs: core

/* Two small ways the screen disagreed with the game. Found by the 2026-11-05 security
   review.
   1. Marking a seat as banker kept any "owes the bank" it had: the field disappears
      for the banker, so $20.00 "on credit" stayed in the bank check and the copied
      text with no way to see or clear it.
   2. "Still to cash out" numbered unnamed seats by their place in the waiting list,
      not at the table: seats 2 and 3 were announced as "Player 1 and Player 2". */

log("-- a new banker owes the bank nothing --");
state.players = [
  { name:"A", buyIns:[2000], cashOut:0, banker:true, owed:0 },
  { name:"B", buyIns:[2000], cashOut:0, banker:false, owed:2000 },
  { name:"C", buyIns:[2000], cashOut:0, banker:false, owed:1000 }
];
setBanker(1);
eq("B is the banker", bankerIndex(state.players), 1);
eq("B's owed cleared", state.players[1].owed, 0);
eq("C still owes", state.players[2].owed, 1000);
setBanker(-1);
eq("un-marking keeps everyone else's owed", state.players[2].owed, 1000);

log("-- waiting seats keep their table numbers --");
var ps = [{ name:"Ann", done:true }, { name:"", done:false }, { name:"", done:false }, { name:"Dee", done:false }];
eq("numbers follow the seat", waitingNames(ps, seatName), ["Player 2", "Player 3", "Dee"]);
eq("nobody waiting", waitingNames([{ name:"x", done:true }], seatName), []);
