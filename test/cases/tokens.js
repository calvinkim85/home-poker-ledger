// needs: site

/* index.html carries its own copy of the design tokens because it has to work as a
   single self-contained file. site.css carries a second copy for the document pages.
   Two copies of a palette drift — one gets a colour fix and the other does not, and
   the privacy page slowly stops looking like the app.

   So: every token declared in index.html must exist in site.css with an identical
   value, in all three blocks. This is the whole reason the duplication is tolerable. */

function blocks(src){
  /* The three declaration blocks, in source order: light, the dark media query,
     and the explicit dark override the theme toggle sets. */
  var out = [], re = /(:root(?:\[data-theme="dark"\])?|:root:not\(\[data-theme="light"\]\))\s*\{([^}]*)\}/g, m;
  while((m = re.exec(src))) out.push(m[2]);
  return out;
}
function parse(block){
  var vars = {}, re = /(--[a-z-]+)\s*:\s*([^;]+);/g, m;
  while((m = re.exec(block))) vars[m[1]] = m[2].trim();
  return vars;
}

var appStyle = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
var appBlocks = blocks(appStyle);
var cssBlocks = blocks(css);

log("-- both files declare the same three palette blocks --");
eq("index.html has three token blocks", appBlocks.length, 3);
eq("site.css has three token blocks", cssBlocks.length, 3);

["light", "dark (media query)", "dark (explicit)"].forEach(function(label, i){
  var app = parse(appBlocks[i] || ""), sheet = parse(cssBlocks[i] || "");
  var names = Object.keys(app);
  log("-- " + label + ": " + names.length + " tokens agree --");
  eq(label + " block is not empty", names.length > 0, true);
  var missing = [], differs = [];
  names.forEach(function(n){
    if(!(n in sheet)) missing.push(n);
    else if(sheet[n] !== app[n]) differs.push(n + " (app " + app[n] + " / css " + sheet[n] + ")");
  });
  eq(label + ": no token missing from site.css", missing, []);
  eq(label + ": no token disagrees with index.html", differs, []);
});

log("-- site.css is actually wired up --");
eq("site.css defines the shared document container", css.indexOf(".doc{") !== -1, true);
eq("site.css respects reduced motion",
   css.indexOf("prefers-reduced-motion") !== -1, true);
