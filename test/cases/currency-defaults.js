// needs: core

/* Switching currency used to rescale by the minor unit alone, so $50 became 50 won —
   a number nobody buys in for. Each currency now carries its own standard buy-in.

   These are not conversions of one another and must not be checked against an exchange
   rate; they are the round amount people actually hand over. What IS worth asserting is
   that each one is a sane, round, human amount in its own currency. */

log("-- every currency has a standard buy-in --");
var CODES = ["USD", "EUR", "GBP", "SGD", "CNY", "JPY", "KRW"];
CODES.forEach(function(code){
  var c = CURRENCIES[code];
  eq(code + " exists", !!c, true);
  eq(code + " declares a default buy-in", typeof c.def, "number");
  eq(code + " default is a positive whole number of minor units",
     c.def > 0 && c.def === Math.round(c.def), true);
});

log("-- each default is a round number in its own currency --");
CODES.forEach(function(code){
  var c = CURRENCIES[code];
  var major = c.def / Math.pow(10, c.dec);
  eq(code + " default is a whole major unit (" + major + ")", major === Math.round(major), true);
  /* Nobody buys in for 47. Every default is a round amount in its own major unit. */
  eq(code + " default is a round amount", major % 10 === 0, true);
});

log("-- the defaults are in a sane band for a home game --");
/* Deliberately loose: these are not rate conversions and rates drift. The point is
   that no currency is off by an order of magnitude, which is the bug being fixed. */
var majors = {};
CODES.forEach(function(code){
  majors[code] = CURRENCIES[code].def / Math.pow(10, CURRENCIES[code].dec);
});
/* Set from what home games actually use — "typically $20" in the US, £20-£200 in the
   UK, ₩10,000-30,000 for casual play in Korea — and from this site's own guides, which
   teach a $20 buy-in throughout. Not exchange-rate conversions of one another. */
eq("USD is 20", majors.USD, 20);
eq("EUR is 20", majors.EUR, 20);
eq("GBP is 20", majors.GBP, 20);
eq("SGD is 20", majors.SGD, 20);
eq("CNY is 100, not 20 — 20 yuan is under three dollars", majors.CNY, 100);
eq("JPY is 3000, not 20 — 20 yen is loose change", majors.JPY, 3000);
eq("KRW is 30000, not 20 — 20 won is worth nothing", majors.KRW, 30000);

log("-- the defaults agree with the guides, which teach a $20 buy-in --");
eq("the USD default matches the buy-in used throughout the written content",
   majors.USD, 20);

log("-- the no-minor-unit currencies stay whole --");
["JPY", "KRW"].forEach(function(code){
  eq(code + " has no minor unit", CURRENCIES[code].dec, 0);
  eq(code + " default needs no rounding", CURRENCIES[code].def % 1, 0);
});

log("-- switching never produces a default of a different magnitude than the currency --");
/* The original bug in one assertion: a default must never be so small that it would
   read as loose change in its own currency. */
CODES.forEach(function(code){
  var c = CURRENCIES[code];
  var major = c.def / Math.pow(10, c.dec);
  var floor = c.dec === 0 ? 1000 : 10;   /* yen/won live in thousands; the rest in tens */
  eq(code + " default is not loose change (" + major + " >= " + floor + ")", major >= floor, true);
});
