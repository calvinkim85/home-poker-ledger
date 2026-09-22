// needs: site

/* The canonical link, the Open Graph URL and image, the manifest scope and the sitemap
   all have to name the same site. Getting them out of step is the classic way a domain
   migration half-lands: everything still renders, and nothing complains until Search
   Console reports duplicate content weeks later. */

log("-- one site URL, agreed everywhere --");
var canonical = head.match(/<link rel="canonical" href="([^"]+)"/);
eq("index.html declares a canonical URL", !!canonical, true);
var SITE = canonical ? canonical[1] : "";
eq("canonical ends in a slash", /\/$/.test(SITE), true);
eq("canonical is https", /^https:\/\//.test(SITE), true);

eq("og:url matches canonical",
   (head.match(/<meta property="og:url" content="([^"]+)"/) || [])[1], SITE);
eq("og:image sits under the site",
   (head.match(/<meta property="og:image" content="([^"]+)"/) || [])[1], SITE + "og.png");
eq("twitter:image matches og:image",
   (head.match(/<meta name="twitter:image" content="([^"]+)"/) || [])[1], SITE + "og.png");
eq("sitemap lists the canonical URL", sitemap.indexOf("<loc>" + SITE + "</loc>") !== -1, true);
eq("every sitemap URL sits under the canonical site",
   (sitemap.match(/<loc>([^<]+)<\/loc>/g) || []).filter(function(l){
     return l.indexOf("<loc>" + SITE) !== 0;
   }), []);
eq("robots.txt points at the sitemap",
   robots.indexOf("Sitemap: " + SITE + "sitemap.xml") !== -1, true);

log("-- the card social scrapers will render --");
eq("og:image dimensions declared 1200x630",
   [(head.match(/<meta property="og:image:width" content="([^"]+)"/) || [])[1],
    (head.match(/<meta property="og:image:height" content="([^"]+)"/) || [])[1]],
   ["1200", "630"]);
eq("summary_large_image card",
   (head.match(/<meta name="twitter:card" content="([^"]+)"/) || [])[1], "summary_large_image");
eq("og:image has alt text",
   /<meta property="og:image:alt" content="[^"]{10,}"/.test(head), true);
eq("a meta description exists",
   /<meta name="description" content="[^"]{30,}"/.test(head), true);

log("-- the guide Google and AdSense both need --");
eq("guide is present", html.indexOf('<details class="guide"') !== -1, true);
eq("guide is collapsed by default (no open attribute)",
   /<details class="guide" id="guide"(?![^>]*\bopen\b)/.test(html), true);
eq("guide uses real headings", (html.match(/<h2>/g) || []).length >= 5, true);
eq("guide is substantial enough to be worth indexing", guideWords > 800, true);

log("-- no advertising is loaded --");
eq("no AdSense script", html.indexOf("googlesyndication") === -1, true);
eq("ad slot still hidden", /<aside class="adslot" id="adslot" hidden/.test(html), true);
/* ads.txt is comments-only until AdSense approves. Once it carries a line, that
   line has to name the same publisher as consent.js — a mismatch here is the classic
   way a site serves ads that earn nothing, and nothing else would notice. */
var adsLines = ads.split("\n").filter(function(l){
  return l.trim() && l.trim().charAt(0) !== "#";
});
var pub = (typeof consentJs === "string" ? consentJs : "").match(/var CLIENT = "ca-pub-(\d{16})";/);
if (!pub) {
  eq("ads.txt is comments only while advertising is off", adsLines.length, 0);
} else {
  eq("ads.txt carries exactly one publisher line", adsLines.length, 1);
  eq("ads.txt names the same publisher as consent.js",
     adsLines[0].indexOf("pub-" + pub[1]) !== -1, true);
  eq("ads.txt declares a DIRECT relationship", /DIRECT/.test(adsLines[0]), true);
}

log("-- the title and description are doing search work, not just naming the app --");
var title = (head.match(/<title>([^<]+)<\/title>/) || [])[1] || "";
var desc  = (head.match(/<meta name="description" content="([^"]+)"/) || [])[1] || "";
eq("the title carries the product name", /Home Poker Ledger/.test(title), true);
eq("the title fits a search result without truncating (<= 60 chars)", title.length <= 60, true);
eq("the title says what the thing does, not only what it is called",
   /calculator|payout|buy-in|settle/i.test(title.replace("Home Poker Ledger", "")), true);
eq("the description is long enough to be used and short enough to survive",
   desc.length >= 110 && desc.length <= 165, true);
eq("the description names the core action", /who pays whom/i.test(desc), true);
eq("the description says it is free", /free/i.test(desc), true);

log("-- structured data --");
var ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
eq("index.html carries JSON-LD", !!ld, true);
var parsed = null;
try { parsed = JSON.parse(ld[1]); } catch (e) { parsed = null; }
eq("the JSON-LD parses", !!parsed, true);
eq("it declares a WebApplication", parsed && parsed["@type"], "WebApplication");
eq("it declares the app free", parsed && parsed.offers && parsed.offers.price, "0");
eq("the structured-data name matches the page", parsed && parsed.name, "Home Poker Ledger");
eq("the structured-data URL matches the canonical", parsed && parsed.url, SITE);

log("-- the home-screen label will not truncate --");
var mani = null;
try { mani = JSON.parse(manifest); } catch (e) {}
eq("manifest parses", !!mani, true);
eq("short_name is short enough for an icon label",
   mani && mani.short_name.length <= 12, true);
eq("the full name is the product name", mani && mani.name, "Home Poker Ledger");

log("-- the differentiator is in the title, where it drives the click --");
/* Free-versus-subscription is the wedge against the paid alternatives, so it belongs
   in the line people actually read in a search result. It was previously only in the
   meta description, which Google often rewrites and which carries far less weight on
   the click decision. */
eq("the title says it is free", /free/i.test(title), true);
eq("the description still says it too", /free/i.test(desc), true);

log("-- the favicon can actually appear in Google results --");
/* Google's requirements: the favicon must be a crawlable FILE, and the supported
   formats are BMP, GIF, ICO, PNG, JPEG, PPM and TIFF. Both of the previous setups
   failed it — the <link> used a data: URI (nothing to crawl) and the only real icon
   file was an SVG (not a supported format). Browsers still prefer the SVG, so both
   are declared and the PNG is listed first. */
eq("no data: URI favicon — Googlebot cannot crawl one",
   /rel="icon"[^>]*href="data:/.test(html), false);
eq("a PNG favicon is declared",
   /<link rel="icon" type="image\/png" sizes="48x48" href="[^"]*favicon-48\.png">/.test(html), true);
eq("at least 96px is offered — Google recommends larger than 48",
   /favicon-96\.png/.test(html) && /favicon-192\.png/.test(html), true);
eq("the SVG is kept for browsers, after the PNGs",
   html.indexOf("favicon-192.png") < html.indexOf('type="image/svg+xml"'), true);
eq("the apple touch icon is a real raster file",
   /rel="apple-touch-icon"[^>]*favicon-192\.png/.test(html), true);
eq("every page declares the icon, not just the home page",
   Object.keys(pages).every(function(n){ return /favicon-48\.png/.test(pages[n]); }), true);

var mIcons = (JSON.parse(manifest).icons || []);
eq("the manifest ships raster icons for install prompts",
   mIcons.filter(function(i){ return i.type === "image/png"; }).length >= 2, true);

log("-- the copied settlement carries the site name --");
/* The summary text is pasted into the table's group chat, where the other players
   read it. Without the domain on it, the most qualified audience this site will
   ever have has no idea what produced the answer.

   What the line SAYS is asserted for real in money-and-settlement.js, which runs
   settlementText() and reads the output. The one thing worth pinning at the source
   level is the date's construction: toISOString() is UTC, so a game settled at half
   past midnight would be stamped with the previous day. That bug is invisible to a
   test run in daylight, and it cannot be caught by reading the output at all. */
/* Comments stripped first: the block above this code explains why toISOString is
   wrong, and the naive check failed on that explanation rather than on any call.
   A source-level test that cannot tell prose from code is worse than none. */
var code = html.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\s+/g, " ");
eq("the clipboard summary still carries the domain",
   /"Settled " \+ .*homepokerledger\.com"/.test(code), true);
eq("the receipt date is built from local calendar parts, never UTC",
   /toISOString/.test(code), false);

log("-- the Naver ownership tag stays put --");
/* Naver re-checks this tag, not just once at registration: remove it and the site
   silently loses verification, and the first symptom is Korean traffic that never
   arrives. It is a token, not a secret — it proves ownership to Naver and does
   nothing else — so asserting the exact value is safe and is the point. */
var NAVER = 'content="1fbc33b127a1a4b818631086bbfc73da88280353"';
eq("the site root carries the Naver verification tag",
   head.indexOf('name="naver-site-verification"') > -1 && head.indexOf(NAVER) > -1, true);

log("-- every control in the setup panel is styled by one rule --");
/* The panel had a styling rule written as `select#currency`, from when there was
   exactly one dropdown. Four more were added later — rounding, the change
   destination, payment routing, discrepancy handling — and every one rendered as a
   bare native control: 19px tall, beside a 44px styled neighbour and a 45px money
   input. Three control heights in a panel meant to read as one thing.

   Nothing failed. The page worked, the tests passed, and it just looked wrong, which
   is the one category of defect this suite cannot see. So assert the shape that made
   it possible instead: controls are styled by what they ARE, never by which one. */
var css2 = html.replace(/\/\*[\s\S]*?\*\//g, " ");
eq("the setup dropdowns share one rule", /\.setup select\{/.test(css2), true);
eq("no dropdown is styled by its id alone", /select#[a-zA-Z]/.test(css2), false);

/* Every select the markup declares must sit inside the panel that rule targets. */
var setupBlock = html.slice(html.indexOf('<section class="setup">'),
                            html.indexOf("</section>", html.indexOf('<section class="setup">')));
var setupSelects = (setupBlock.match(/<select id="([^"]+)"/g) || [])
  .map(function(m){ return m.replace(/.*id="|"/g, ""); });
eq("the panel holds every settings dropdown", setupSelects.sort(),
   ["currency", "gapMode", "payVia", "roundDest", "roundTo"]);

/* The grid is what keeps them aligned; flex-wrap sized each field to its own text. */
eq("the panel is laid out as a grid", /\.setup\{[^}]*display:grid/.test(css2.replace(/\s+/g, " ")), true);
eq("the seat count and add button sit in their own row",
   /<div class="setup-foot">/.test(html), true);

log("-- no dropdown label is too long for its column --");
/* "$ USD — US dolla" shipped, cut mid-word, because a select clips rather than
   wraps and nothing here could see it. The panel is a grid of ~236px columns and
   the labels are .82rem monospace, which leaves room for roughly 24 characters
   after the padding and the arrow.

   Counted in characters rather than measured: the suite has no DOM and no font
   metrics, and an approximate bound that fails loudly beats an exact one that
   cannot exist. The CSS ellipsis is the safety net under this, not a substitute —
   it makes an overlong label read as truncated instead of broken. */
var LABEL_BUDGET = 24;
/* Sliced rather than matched with a constructed RegExp: building one from a string
   needs four backslashes to express one escaped brace, and the first version got
   that wrong and reported the labels as simply absent. */
function labelsIn(name){
  var start = html.indexOf("var " + name + " = {");
  if(start < 0) return null;
  var body = html.slice(start, html.indexOf("}", start));
  return (body.match(/"([^"]*)"/g) || []).map(function(t){ return t.slice(1, -1); });
}
[["PAY_LABEL"], ["GAP_LABEL"]].forEach(function(row){
  var vals = labelsIn(row[0]);
  eq(row[0] + " is declared", vals !== null && vals.length > 0, true);
  eq(row[0] + " labels fit a column",
     (vals || []).filter(function(v){ return v.length > LABEL_BUDGET; }), []);
});
var dests = (html.match(/var ROUND_DESTS = \[([^\]]*)\]/) || [])[1] || "";
eq("ROUND_DESTS labels fit a column",
   (dests.match(/"([^"]*)"/g) || []).map(function(t){ return t.slice(1, -1); })
     .filter(function(v){ return v.length > LABEL_BUDGET; }), []);

/* The currency labels are the longest in the app, and the first version of this
   check approximated them as name + " USD — ", which is neither how they are built
   nor the worst case. It passed while "S$ SGD — Singapore dollar" was clipping on
   screen. Reconstruct the real string from the real table instead. */
var curRows = (html.match(/^\s*[A-Z]{3}:\{[^}]*\}/gm) || []);
eq("the currency table was found", curRows.length >= 7, true);
/* The separators are read out of the line that builds the option, not assumed.
   The previous version hardcoded the short form, so widening the real separators
   back to "  " and an em dash changed the page and not the test — it passed while
   the label clipped. A check that cannot see the thing it guards is worse than
   none, because it reports safety. */
var buildLine = (html.match(/o\.textContent = c\.sym[^;]*;/) || [""])[0];
eq("the option-building line was found", buildLine.length > 0, true);
var sepChars = (buildLine.match(/"([^"]*)"/g) || [])
  .map(function(t){ return t.slice(1, -1).replace(/\\u[0-9a-fA-F]{4}/g, "x"); })
  .join("").length;
var curLabels = curRows.map(function(row){
  var code = row.match(/([A-Z]{3}):\{/)[1];
  var sym  = (row.match(/sym:"([^"]*)"/) || ["", "?"])[1]
               .replace(/\\u[0-9a-fA-F]{4}/g, "x");   /* an escape is one glyph */
  var name = (row.match(/name:"([^"]*)"/) || ["", ""])[1];
  return sym + code + name + new Array(sepChars + 1).join(" ");
});
eq("no currency label overflows its column",
   curLabels.filter(function(l){ return l.length > LABEL_BUDGET; }), []);

/* And the ellipsis has to actually be there, or a narrow window cuts mid-word. */
var cssNoComments = html.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\s+/g, " ");
eq("dropdowns truncate with an ellipsis rather than mid-word",
   /\.setup select\{[^}]*text-overflow:ellipsis/.test(cssNoComments), true);

log("-- the explainer opens only when asked for --");
/* The tip used to hang off a checkbox, where opening it on focus was defensible.
   When the checkbox became a dropdown the same wiring came along, so clicking the
   control to change the setting popped an explanation over the options you were
   trying to read. The "?" button is the affordance; the control is not. */
var wiring = html.replace(/\/\*[\s\S]*?\*\//g, " ");
eq("the dropdown does not open the tip on focus",
   /gapSel\.addEventListener\("focus"/.test(wiring), false);
eq("nor close it on blur",
   /gapSel\.addEventListener\("blur"/.test(wiring), false);
eq("the info button still opens it on hover",
   /addEventListener\("mouseenter", showTip\)/.test(wiring), true);
eq("and on click, which pins it", /tipPinned = true; showTip\(\)/.test(wiring), true);
eq("and on keyboard focus, so it is reachable without a mouse",
   /absorbInfo\.addEventListener\("focus", showTip\)/.test(wiring), true);
eq("Escape still closes it", /e\.key === "Escape"/.test(wiring), true);

log("-- the brand is declared as an entity, not just a page title --");
/* Searching the brand name "homepokerledger" on Google returns pokerledger.club,
   PokerLedger.net and an Instagram account — Google normalises it to "poker ledger"
   and hands the query to stronger entities that own those three generic words. The
   homepage is indexed; it simply does not win its own name.

   alternateName tells Google the closed-up form is this thing's name too, and
   sameAs is the standard way to assert that an off-site profile is the same entity.
   Neither beats an established brand alone, and both are free. */
eq("the app schema declares alternate names",
   Array.isArray(parsed && parsed.alternateName) && parsed.alternateName.length >= 2, true);
eq("including the closed-up form people actually type",
   (parsed.alternateName || []).indexOf("homepokerledger") > -1, true);
eq("and the Korean name, so the two sections read as one entity",
   (parsed.alternateName || []).some(function(n){ return /[가-힣]/.test(n); }), true);
/* sameAs is the other half: the standard way to say an off-site profile is the
   same entity. It exposes the operator's GitHub handle, which the site had
   deliberately kept off it — Calvin weighed that and chose to link. pages.js allows
   the handle in this one line and nowhere else. */
eq("sameAs points at the public documentation repository",
   Array.isArray(parsed && parsed.sameAs) &&
   parsed.sameAs[0] === "https://github.com/calvinkim85/home-poker-ledger", true);
/* JSON-LD is JSON. A comment or a trailing comma silently invalidates the whole
   block, and nothing on the page would look different. */
eq("the block is still parseable JSON", !!parsed, true);
