// needs: site

/* WEB-11 / EU-01. The light palette failed WCAG AA on five pairs before launch:
   muted labels sat at 4.01:1 and the gold used for the suits and the transfer arrow
   at 2.64:1. Both are small text. Nothing in the build catches a colour edit, so the
   ratios are asserted here straight off the :root blocks in index.html.

   Normal-size text needs 4.5:1 at AA. Every pair below is normal text or smaller. */

function block(name){
  var i = html.indexOf(name);
  eq("the " + name + " token block exists", i !== -1, true);
  return html.slice(i, html.indexOf("}", i));
}
function token(src, name){
  var m = src.match(new RegExp("--" + name + ":\\s*(#[0-9a-fA-F]{3,6})"));
  return m ? m[1] : null;
}
function lum(hex){
  var h = hex.replace("#", "");
  if(h.length === 3) h = h.charAt(0)+h.charAt(0)+h.charAt(1)+h.charAt(1)+h.charAt(2)+h.charAt(2);
  var v = [0,2,4].map(function(i){
    var x = parseInt(h.substr(i,2), 16) / 255;
    return x <= 0.03928 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4);
  });
  return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2];
}
function ratio(a, b){
  var L1 = lum(a), L2 = lum(b);
  return (Math.max(L1,L2) + 0.05) / (Math.min(L1,L2) + 0.05);
}

/* The light palette is the bare :root; the dark one overrides it under the media query. */
var light = block(":root{");
var darkSrc = html.slice(html.indexOf("prefers-color-scheme: dark"));
var dark = darkSrc.slice(0, darkSrc.indexOf("}"));

var PAIRS = [
  ["ink",      "card",      "body text on a card"],
  ["ink-soft", "card",      "muted labels on a card"],
  ["ink-soft", "card-sunk", "muted labels on a sunk field"],
  ["ink-soft", "chip",      "the currency mark inside a buy-in chip"],
  ["flat",     "card",      "a net of exactly zero in the results table"],
  ["gold",     "card",      "the suits and the transfer arrow"],
  ["gold",     "card-sunk", "the same, over a sunk field"],
  ["alert",    "alert-bg",  "the discrepancy banner heading"],
  ["win",      "card",      "a winning net"],
  ["loss",     "card",      "a losing net"],
  ["on-felt",     "felt",   "the footer over the felt"],
  ["on-felt-dim", "felt",   "the dimmed footer over the felt"]
];

["light", "dark"].forEach(function(theme){
  var src = theme === "light" ? light : dark;
  log("-- " + theme + " palette meets WCAG 2.1 AA (4.5:1) --");
  PAIRS.forEach(function(p){
    /* Dark only redeclares what it changes; fall back to light for the rest. */
    var fg = token(src, p[0]) || token(light, p[0]);
    var bg = token(src, p[1]) || token(light, p[1]);
    eq(p[2] + " (" + fg + " on " + bg + ")", ratio(fg, bg) >= 4.5, true);
  });
});

log("-- the two palettes stay distinct --");
eq("dark redefines the card colour", token(dark, "card") !== token(light, "card"), true);
eq("dark is genuinely darker than light",
   lum(token(dark, "card")) < lum(token(light, "card")), true);
