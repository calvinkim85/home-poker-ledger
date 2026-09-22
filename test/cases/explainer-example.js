// needs: core

/* The tooltip prints a worked example. If the algorithm ever drifts from it the
   explainer becomes a lie, so pin the exact numbers it shows. */
log("-- the explainer's worked example --");
var m;
m=[4000,3200]; splitFromTop(m,400);
eq("$4 gap: Alice covers it alone -> +$36 / +$32",
   [fmtSigned(m[0]), fmtSigned(m[1])], ["+$36.00","+$32.00"]);
m=[4000,3200]; splitFromTop(m,1000);
eq("$10 gap: halved -> +$35 / +$27",
   [fmtSigned(m[0]), fmtSigned(m[1])], ["+$35.00","+$27.00"]);
m=[4000,3200]; splitFromTop(m,1000);
eq("and the leader is still ahead", m[0] > m[1], true);
