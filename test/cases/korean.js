// needs: site

log("-- the Korean page is generated, not hand-maintained --");
/* The whole reason ko/index.html is built rather than written is that a second copy
   of the settlement code would drift from the first, and this repo has already lost
   a day to exactly that twice. So the assertion that matters is not "the Korean page
   has a solver" - it is "the Korean page has THE solver, byte for byte". */
function fnOf(src, decl){
  var i = src.indexOf(decl);
  if(i < 0) return null;
  var end = src.indexOf("\n  }\n", i);
  return end < 0 ? null : src.slice(i, end + 5);
}
var SHARED = ["function settleNets(entries){", "function parseMoney(text){",
              "function totalIn(p){", "function netOf(p){"];
SHARED.forEach(function(decl){
  var a = fnOf(html, "  " + decl), b = fnOf(koHtml, "  " + decl);
  eq(decl + " exists in the English app", a !== null, true);
  eq(decl + " exists on the Korean page", b !== null, true);
  /* a === b is true when both are null, so a typo in the declaration above would
     "prove" the code is shared by finding neither copy. Require real text. */
  eq(decl + " is the same code in both", a !== null && a === b, true);
});
/* fmt() is where a currency bug would show up as wrong money on screen. */
eq("fmt is shared verbatim",
   fnOf(html, "  function fmt(units){") === fnOf(koHtml, "  function fmt(units){"), true);
/* And the currency table itself, which is what makes won print without decimals. */
eq("the Korean page carries the real currency table",
   koHtml.indexOf('KRW:{ sym:"\\u20a9"') > -1 || koHtml.indexOf("KRW:{ sym:") > -1, true);

eq("no build marker survived", /@CORE|@STYLE/.test(koHtml), false);
eq("the generated page says not to edit it",
   /Do not edit here/.test(koHtml), true);
/* The template is the thing a person edits; it must never be served. */
eq("the template still holds its markers",
   /@CORE/.test(koTemplate) && /@STYLE/.test(koTemplate), true);
eq("the template itself carries no settlement code",
   /function settleNets\(/.test(koTemplate), false);

log("-- it is a Korean page, and says so where it counts --");
var HANGUL = /[가-힣]/;
eq("the document declares Korean", /<html lang="ko">/.test(koHtml), true);
var koTitle = (koHtml.match(/<title>([^<]+)<\/title>/) || [])[1] || "";
eq("the title is in Korean", HANGUL.test(koTitle), true);
eq("the title fits a search result", koTitle.length <= 60, true);
var koDesc = (koHtml.match(/<meta name="description" content="([^"]+)"/) || [])[1] || "";
eq("the description is in Korean", HANGUL.test(koDesc), true);
eq("the description is a usable length", koDesc.length >= 40 && koDesc.length <= 160, true);
eq("the locale is declared for sharing", /og:locale" content="ko_KR"/.test(koHtml), true);
eq("the structured data declares its language", /"inLanguage": "ko"/.test(koHtml), true);
eq("prices are quoted in won", /"priceCurrency": "KRW"/.test(koHtml), true);

/* A page that looks Korean but still says "Cash out at the end" on the control the
   visitor has to use is worse than an English page, because it looks finished. */
["Cash out at the end", "Add player", "Calculate settlement", "Copy settlement",
 "Bought in", "Every seat"].forEach(function(s){
  eq("no leftover English UI: " + s, koHtml.indexOf(">" + s + "<") > -1, false);
});

log("-- the two languages point at each other --");
eq("the Korean page names itself canonical",
   /<link rel="canonical" href="https:\/\/homepokerledger\.com\/ko\/">/.test(koHtml), true);
[[koHtml, "ko", "https://homepokerledger.com/ko/"],
 [koHtml, "en", "https://homepokerledger.com/"],
 [koHtml, "x-default", "https://homepokerledger.com/"],
 [html, "ko", "https://homepokerledger.com/ko/"],
 [html, "en", "https://homepokerledger.com/"],
 [html, "x-default", "https://homepokerledger.com/"]].forEach(function(t){
  var which = t[0] === koHtml ? "the Korean page" : "the English page";
  eq(which + " declares hreflang " + t[1],
     t[0].indexOf('<link rel="alternate" hreflang="' + t[1] + '" href="' + t[2] + '">') > -1, true);
});
/* A hreflang pair only counts if both sides claim each other; a one-way link is
   ignored, and silently. */
eq("the Korean page links back to English in the page itself",
   /href="\.\.\/" hreflang="en"/.test(koHtml), true);

eq("the sitemap lists the Korean page",
   sitemap.indexOf("<loc>https://homepokerledger.com/ko/</loc>") > -1, true);

log("-- the Korean page keeps the site's privacy promise --");
eq("nothing is loaded from a third party",
   /src="https?:\/\//.test(koHtml), false);
eq("it points at the Korean privacy policy", /href="\.\.\/privacy-ko"/.test(koHtml), true);
eq("the game is stored under the Korean page's own key",
   /var KEY = "poker\.ledger\.ko\.v1"/.test(koHtml), true);
/* The English key appears deliberately, and for one thing only. Theme is a
   site-wide preference — the English app and every guide already read it from
   there, so clicking through to Korean must not flip a reader back to dark. The
   game itself must never go near that key, or the two pages would overwrite each
   other's night. */
eq("the English key is used only as the theme key",
   /var THEME_KEY = "poker\.ledger\.v1"/.test(koHtml), true);
var koCode = koHtml.replace(/\/\*[\s\S]*?\*\//g, " ");
eq("and nothing else in the Korean page mentions it",
   koCode.split('"poker.ledger.v1"').length - 1, 1);
/* Writing the theme must merge into whatever is already stored, not replace it. */
eq("the theme write preserves the rest of that record",
   /JSON\.parse\(localStorage\.getItem\(THEME_KEY\)[^)]*\)[^;]*\|\| \{\}/.test(koCode), true);
eq("only the theme field is assigned", /s\.theme = themeState;/.test(koCode), true);

log("-- the Korean guides are generated from fragments --");
var koNames = Object.keys(koGuides).sort();
var koArticles = koNames.filter(function(n){ return n !== "index.html"; });
eq("there are guides at all", koArticles.length >= 4, true);
eq("there is a guide index", koGuides["index.html"] !== undefined, true);
/* One fragment in, one page out. A fragment that stopped generating would simply
   vanish from the site rather than break anything. */
eq("every fragment produced a page", koFragments.length, koArticles.length);

var HANGUL2 = /[가-힣]/;
koNames.forEach(function(n){
  var g = koGuides[n];
  var slug = n.replace(/\.html$/, "");
  var isIndex = n === "index.html";
  eq(n + " declares Korean", /<html lang="ko">/.test(g), true);
  eq(n + " has no unfilled placeholder", /\{\{/.test(g), false);
  var title = (g.match(/<title>([^<]+)<\/title>/) || [])[1] || "";
  eq(n + " has a Korean title", HANGUL2.test(title), true);
  eq(n + " title fits a search result", title.length <= 60, true);
  var desc = (g.match(/<meta name="description" content="([^"]+)"/) || [])[1] || "";
  eq(n + " has a Korean description", HANGUL2.test(desc), true);
  eq(n + " description is a usable length", desc.length >= 30 && desc.length <= 160, true);
  var want = "https://homepokerledger.com/ko/guides/" + (isIndex ? "" : slug);
  eq(n + " canonical points at itself",
     g.indexOf('<link rel="canonical" href="' + want + '">') > -1, true);
  eq(n + " declares its language to crawlers", /"inLanguage": "ko"/.test(g), true);
  eq(n + " loads nothing from a third party", /src="https?:\/\//.test(g), false);
  /* The trail is what turns a bare URL under a search result into a path. */
  eq(n + " carries breadcrumbs", /"@type": "BreadcrumbList"/.test(g), true);
  eq(n + " breadcrumb ends on itself", g.indexOf('"item": "' + want + '"') > -1, true);
});

/* Google rejects a bare yyyy-mm-dd; it wants an offset. Learned the hard way on the
   English side, where the test had been asserting the format Google refuses. */
var ISO_KO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
koArticles.forEach(function(n){
  var pub = (koGuides[n].match(/"datePublished": "([^"]+)"/) || [])[1] || "";
  eq(n + " datePublished carries a timezone", ISO_KO.test(pub), true);
  eq(n + " is typed as an Article", /"@type": "Article"/.test(koGuides[n]), true);
});

log("-- the guide index lists exactly what exists --");
var idx = koGuides["index.html"];
eq("the index counts the guides it has",
   idx.indexOf('"numberOfItems": ' + koArticles.length) > -1, true);
koArticles.forEach(function(n){
  var slug = n.replace(/\.html$/, "");
  eq("the index links " + slug, idx.indexOf('<a href="' + slug + '">') > -1, true);
  eq("the index schema lists " + slug,
     idx.indexOf('"url": "https://homepokerledger.com/ko/guides/' + slug + '"') > -1, true);
  eq("the sitemap lists " + slug,
     sitemap.indexOf("<loc>https://homepokerledger.com/ko/guides/" + slug + "</loc>") > -1, true);
});
eq("the sitemap lists the Korean guide index",
   sitemap.indexOf("<loc>https://homepokerledger.com/ko/guides/</loc>") > -1, true);
eq("the calculator links to the guides", /href="guides\/"/.test(koHtml), true);

log("-- the guides are substantial enough to rank --");
/* Counted in characters, not words: Korean is written without spaces between
   particles and a word count understates it badly. ~1,200 characters of body text
   is roughly the 450-word floor the English guides hold to. */
koArticles.forEach(function(n){
  var body = (koGuides[n].match(/<article class="doc">([\s\S]*?)<\/article>/) || [])[1] || "";
  var chars = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, "").length;
  eq(n + " has enough body text (" + chars + " chars)", chars >= 1200, true);
});

log("-- the Korean page offers what the English one does --");
/* This is the test that was missing. The Korean page shipped without a theme
   toggle, without Clear all, without the per-seat cash-out lock, without share
   links and without any of the gap/banker/rounding controls — and every other
   assertion here passed, because they all checked that what exists is correct
   rather than that anything is missing.

   Keyed on the feature, not the wording: the labels are Korean and always will be,
   so each row names the English control and something in the Korean page that only
   exists if the same capability does. */
var PARITY = [
  ["theme toggle",        /id="themeBtn"/,        /id="themeBtn"/],
  ["currency picker",     /id="currency"/,        /id="cur"/],
  ["standard buy-in",     /id="defaultBuyIn"/,    /id="def"/],
  ["add player",          /id="addBtn"/,          /id="add"/],
  ["calculate",           /id="calcBtn"/,         /id="calc"/],
  ["new game",            /id="newBtn"/,          /id="reset"/],
  ["clear all",           /id="clearBtn"/,        /id="clear"/],
  ["rounding step",       /id="roundTo"/,         /id="roundTo"/],
  ["rounding destination",/id="roundDest"/,       /id="roundDest"/],
  ["payment routing",     /id="payVia"/,          /id="payVia"/],
  ["discrepancy handling",/id="gapMode"/,         /id="gapMode"/],
  ["bank check readout",  /id="bankOut"/,         /id="bankOut"/],
  ["rebuy button",        /"\+ Rebuy"/,           /"\+ 리바이"/],
  ["remove buy-in",       /"×"/,             /"×"/],
  ["remove player",       /"Remove"/,             /"삭제"/],
  ["cash-out lock",       /aria-pressed", p\.done/, /aria-pressed", p\.done/],
  ["banker toggle",       /setBanker\(p\.banker/,  /setBanker\(p\.banker/],
  ["credit field",        /p\.owed/,              /p\.owed/],
  ["copy settlement",     /"Copy settlement"/,    /"정산 내역 복사"/],
  ["copy share link",     /"Copy share link"/,    /"공유 링크 복사"/],
  ["settled tag",         /"settled-tag"/,        /"settled-tag"/],
  ["banker tag",          /"banker-tag"/,         /"banker-tag"/],
  ["not-all-counted warning", /Still to cash out/, /아직 안 센 사람/],
  /* Added after the English explainer turned out to have no Korean counterpart:
     every earlier assertion checked that gapMode existed on both, and none of them
     could notice that only one of the two explained what its three options do. */
  ["discrepancy explainer button", /id="absorbInfo"/,        /id="gapInfo"/],
  ["discrepancy explainer panel",  /id="absorbTip"/,         /id="gapTip"/],
  ["worked example in it",         /class="eg"/,             /class="eg"/],
  ["escape closes it",             /e\.key === "Escape"/,    /e\.key === "Escape"/]
];
PARITY.forEach(function(row){
  eq(row[0] + " exists in the English app", row[1].test(html), true);
  eq(row[0] + " exists on the Korean page", row[2].test(koHtml), true);
});

/* The shared solver returns the same shapes to both, so the Korean page has to
   handle the awkward ones too rather than rendering undefined. */
["unpaid", "unowed", "carried"].forEach(function(k){
  eq("the Korean page handles res." + k, koHtml.indexOf("res." + k) > -1 ||
     koHtml.indexOf("." + k) > -1, true);
});

/* Every currency the picker offers needs a Korean name, or one of them prints in
   English the moment somebody switches to it. */
["USD", "EUR", "GBP", "SGD", "CNY", "JPY", "KRW"].forEach(function(code){
  eq(code + " has a Korean name", new RegExp(code + ':"[^"]*[\\uac00-\\ud7a3]').test(koHtml), true);
});
eq("the receipt uses the Korean currency name, not the shared English one",
   /curName\(\) \+ " \(" \+ state\.currency/.test(koHtml), true);

log("-- the feeds list every guide and nothing else --");
/* Naver's registration flow asks for an RSS feed as well as a sitemap. A feed is a
   third place a guide can be forgotten, after the sitemap and the index — both of
   which have already caught exactly that — so it is generated from the built pages
   and checked against them here. */
function feedLinks(xml){
  return (xml.match(/<link>([^<]+)<\/link>/g) || [])
    .map(function(m){ return m.replace(/<\/?link>/g, ""); })
    .filter(function(u){ return /\/guides\//.test(u); });
}
var koLinks = feedLinks(rssKo);
eq("the Korean feed is well-formed XML", /^<\?xml version="1\.0" encoding="UTF-8"\?>/.test(rssKo), true);
eq("it declares Korean", /<language>ko-KR<\/language>/.test(rssKo), true);
eq("its channel link is the Korean section, not a description",
   /<link>https:\/\/homepokerledger\.com\/ko\/<\/link>/.test(rssKo), true);
eq("it lists exactly the Korean guides", koLinks.length, koArticles.length);
koArticles.forEach(function(n){
  var slug = n.replace(/\.html$/, "");
  eq("the Korean feed lists " + slug,
     koLinks.indexOf("https://homepokerledger.com/ko/guides/" + slug) > -1, true);
});
eq("every Korean feed item has a description",
   (rssKo.match(/<description>/g) || []).length, koArticles.length + 1);

/* Derived here rather than borrowed from pages.js: each suite gets its own prelude,
   so a name that exists in another file is not in scope, it is just undefined — and
   an undefined name aborts the whole suite rather than failing one line. */
var EN_GUIDES = Object.keys(pages).filter(function(n){
  return n.indexOf("guides/") === 0 && n !== "guides/index.html";
});
var enLinks = feedLinks(rssEn);
eq("the English feed is well-formed", /^<\?xml version="1\.0" encoding="UTF-8"\?>/.test(rssEn), true);
eq("it declares English", /<language>en-US<\/language>/.test(rssEn), true);
eq("it lists every English guide", enLinks.length, EN_GUIDES.length);
/* A feed whose links do not match the canonicals sends crawlers to URLs that
   redirect, which is the slow way to get indexed. */
eq("its links are the pages' own canonicals",
   enLinks.filter(function(u){
     return EN_GUIDES.every(function(n){
       var c = pages[n].match(/<link rel="canonical" href="([^"]+)"/)[1];
       return c !== u;
     });
   }), []);

log("-- no English words leak through the shared helpers --");
/* Caught in a screenshot of the live page: the discrepancy warning read
   "민수 (₩20,000) and 서연 (₩10,000)". The " and " comes from the shared
   listNames(), which is correct English and wrong on every line of this page. */
/* listNames still EXISTS on the page — it arrives with the shared core, and the
   core is copied verbatim on purpose. What must not exist is a call to it. */
var koCode = koHtml.replace(/\/\*[\s\S]*?\*\//g, " ");
var mentions = koCode.split("listNames(").length - 1;
var defs = koCode.split("function listNames(").length - 1;
eq("the shared joiner is present, since the core is verbatim", defs, 1);
eq("but the Korean page never calls it", mentions - defs, 0);
eq("it has its own list joiner", /function koList\(arr\)/.test(koCode), true);
/* What it produces is asserted for real in korean-text.js, which runs koList.
   This one only checks it is wired to the particle helper at all — the previous
   version pinned the exact call text and went stale the moment the call changed,
   while the behaviour it was standing in for was fine. */
eq("which is wired to the particle helper", /particle\([^)]*"과", "와"\)/.test(koCode), true);
/* Any bare English connective inside a Korean string literal is the same bug.
   Comments stripped first — the previous version matched the comment explaining
   this very rule, which is the second time today a source check has failed against
   its own prose. */
var koStrings = (koCode.match(/"[^"\\]*[\uac00-\ud7a3][^"\\]*"/g) || []);
eq("no Korean string contains an English connective",
   koStrings.filter(function(t){ return /\s(and|or)\s/.test(t); }), []);

log("-- the Korean guide index uses the same card styling as the English one --");
/* It shipped with class="guide-list", which exists nowhere in the stylesheet, so
   the list fell through to generic .doc ul styling: bullets, and every word of
   every description underlined because the whole entry is inside the <a>. Nothing
   failed — an unknown class is not an error, it is just no styling. */
var enIdx = pages["guides/index.html"];
var enClass = (enIdx.match(/<ul class="([^"]+)">/) || [])[1];
var koClass = (koGuides["index.html"].match(/<ul class="([^"]+)">/) || [])[1];
eq("the English index lists its guides in a styled list", !!enClass, true);
eq("the Korean index uses the same class", koClass, enClass);
/* And that class has to actually be defined, or both of them look like this. */
eq("the class is defined in the stylesheet",
   css.indexOf("." + enClass) > -1, true);


log("-- the Korean explainer opens only when asked, like the English one --");
/* The English page shipped with the panel wired to the dropdown's focus, so
   clicking the control covered the options you were choosing between. The Korean
   one was written after that was fixed and must not reacquire it. */
var koWiring = koHtml.replace(/\/\*[\s\S]*?\*\//g, " ");
eq("the dropdown does not open the Korean tip",
   /\$\("gapMode"\)\.addEventListener\("focus"/.test(koWiring), false);
eq("the info button opens it on hover",
   /gapInfo\.addEventListener\("mouseenter", showGapTip\)/.test(koWiring), true);
eq("and on click, which pins it",
   /gapTipPinned = true; showGapTip\(\)/.test(koWiring), true);
eq("and on keyboard focus",
   /gapInfo\.addEventListener\("focus", showGapTip\)/.test(koWiring), true);
eq("the panel starts hidden", /id="gapTip" role="tooltip" hidden/.test(koHtml), true);
/* It has to actually explain all three options, not just exist. */
["그대로 보기", "뱅커가 부담", "딴 사람들이 부담"].forEach(function(mode){
  eq("the Korean tip explains " + mode, koHtml.indexOf(mode) > -1, true);
});
