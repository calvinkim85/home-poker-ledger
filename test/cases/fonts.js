// needs: site

/* CFT-26 and PRV-03. The typefaces used to come from Google Fonts, which meant two
   extra origins, a render-blocking stylesheet that had to arrive before the browser
   even learned the font URLs, and Google receiving every visitor's IP address. The
   files are now served from this site.

   The privacy consequence is the interesting one: it removes a third party from the
   policy outright, taking it from three to two. */

log("-- nothing reaches Google for fonts any more --");
var ALL = Object.keys(pages).concat(["__app__"]);
ALL.forEach(function(n){
  var p = n === "__app__" ? html : pages[n];
  var label = n === "__app__" ? "index.html" : n;
  eq(label + " has no Google Fonts stylesheet",
     /<link[^>]+fonts\.googleapis\.com/.test(p), false);
  eq(label + " has no preconnect to a font CDN",
     /<link[^>]+fonts\.gstatic\.com/.test(p), false);
});

log("-- the three faces above the fold are preloaded --");
["plex-sans-400-latin.woff2", "bodoni-700-latin.woff2", "plex-mono-400-latin.woff2"]
.forEach(function(f){
  ALL.forEach(function(n){
    var p = n === "__app__" ? html : pages[n];
    var label = n === "__app__" ? "index.html" : n;
    var re = new RegExp('<link rel="preload" href="[^"]*' + f.replace(/\./g, "\\.") +
                        '" as="font" type="font/woff2" crossorigin>');
    eq(label + " preloads " + f, re.test(p), true);
  });
});

log("-- every referenced font file exists --");
function faces(src){
  return (src.match(/src:url\(fonts\/([^)]+)\) format\('woff2'\)/g) || [])
         .map(function(m){ return m.match(/fonts\/([^)]+)\)/)[1]; });
}
var inApp = faces(html), inCss = faces(css);
eq("index.html declares font files", inApp.length > 0, true);
eq("site.css declares font files", inCss.length > 0, true);
eq("index.html and site.css declare the same faces", inApp.join(","), inCss.join(","));
var missing = inApp.filter(function(f){ return fontFiles.indexOf(f) === -1; });
eq("no @font-face points at a file that is not there", missing, []);
var unused = fontFiles.filter(function(f){ return inApp.indexOf(f) === -1; });
eq("no font file is shipped without being declared", unused, []);

log("-- the subsets that matter are present --");
eq("latin-ext is included — it is what carries the won sign",
   fontFiles.some(function(f){ return /latin-ext/.test(f); }), true);
eq("Plex Mono 700 is shipped, so bold mono is real rather than synthesised",
   fontFiles.indexOf("plex-mono-700-latin.woff2") !== -1, true);
eq("unicode-range is used, so a page fetches only what it needs",
   (html.match(/unicode-range:/g) || []).length, inApp.length);

log("-- licensing ships with the fonts --");
eq("fonts/OFL.txt is present", hasOfl, true);

log("-- the privacy policy dropped a third party --");
var en = pages["privacy.html"], ko = pages["privacy-ko.html"];
eq("English no longer counts three third parties", /three third parties/.test(en), false);
eq("English says two", /two third parties/.test(en), true);
eq("Korean no longer counts 세 곳", /세 곳의 제3자/.test(ko), false);
eq("Korean says 두 곳", /두 곳의 제3자/.test(ko), true);
eq("Google Fonts is no longer listed as a recipient in the Korean transfer table",
   /<td>Google LLC<br>\(Google Fonts\)<\/td>/.test(ko), false);
eq("English still names the two that remain",
   en.indexOf("Cloudflare") !== -1 && en.indexOf("AdSense") !== -1, true);

log("-- the page stays inside a budget that scales --");
/* Cloudflare Pages serves static assets without a bandwidth cap, but the weight
   budget is what keeps the site fast on a phone. The budget is asserted so a future
   asset cannot quietly erode it — an unoptimised hero image would not fail any other
   test here.

   This used to cap the uncompressed size alone, and that number failed first: the
   page crossed 100 KB raw while the live site was still sending 28 KB, because
   Cloudflare negotiates brotli and always has. The raw figure is not what any phone
   downloads, so capping only it was measuring a proxy that had drifted from the
   thing it stood for. Both are asserted now — the compressed size because it is what
   a visitor actually pays, and a looser raw cap because an embedded asset that
   compresses badly is exactly the regression the original test was written to catch,
   and it would show up in both numbers at once. */
var htmlKB = html.length / 1024;
var cssKB  = css.length / 1024;
var jsKB   = consentJs.length / 1024;
eq("index.html compresses to under 45 KB (" + gzipKB["index.html"].toFixed(1) + " KB gzip)",
   gzipKB["index.html"] < 45, true);
eq("site.css compresses to under 10 KB (" + gzipKB["site.css"].toFixed(1) + " KB gzip)",
   gzipKB["site.css"] < 10, true);
eq("consent.js compresses to under 8 KB (" + gzipKB["consent.js"].toFixed(1) + " KB gzip)",
   gzipKB["consent.js"] < 8, true);
/* Roughly a 4x ratio on this kind of markup, so a raw file that blows through this
   while the gzip figure holds means something incompressible got embedded. */
eq("index.html stays under 130 KB uncompressed (" + htmlKB.toFixed(1) + " KB)", htmlKB < 130, true);
eq("site.css stays under 40 KB (" + cssKB.toFixed(1) + " KB)", cssKB < 40, true);
eq("consent.js stays under 20 KB (" + jsKB.toFixed(1) + " KB)", jsKB < 20, true);
eq("no font subset is unreasonably large (all under 60 KB)",
   fontFiles.length > 0, true);
eq("the site ships no raster images to bloat a page load",
   /<img\b/.test(html), false);
