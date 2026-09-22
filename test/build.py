#!/usr/bin/env python3
"""Assemble runnable test suites out of index.html.

There is no build step for the app and no node on this machine, so the tests pull the
pure functions straight out of the single HTML file and run them under macOS's built-in
JavaScriptCore. Extracting rather than duplicating is the point: a suite can never drift
from the code it is testing.

The cutting itself lives in scripts/extract.py, shared with the Korean page build, so
there is one definition of how a function is lifted out of index.html.

Each file in test/cases/ starts with a `// needs: <prelude>` line naming what it wants:

  core     the money layer, the settlement algorithm, and the gap-splitting rule
  storage  the above plus load(), systemTheme(), and stubs for localStorage/matchMedia
  site     the raw text of index.html and the crawler files, for asserting on markup
"""
import gzip, os, re, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts"))
from extract import ROOT, SRC, script_body, region, func   # noqa: E402

CASES = os.path.join(ROOT, "test", "cases")
BUILD = os.path.join(ROOT, "test", "build")


HARNESS = '''var out = [];
function log(){ out.push(Array.prototype.join.call(arguments, " ")); }
var pass = 0, fail = 0;
function eq(label, got, want){
  var a = JSON.stringify(got), b = JSON.stringify(want);
  if(a === b){ pass++; log("  ok   " + label); }
  else { fail++; log("  FAIL " + label + "\\n        got  " + a + "\\n        want " + b); }
}
'''

STUBS = '''
/* --- stubs standing in for the browser --- */
var OS_DARK = true;
var window = { matchMedia: function(){ return { matches: OS_DARK }; } };
var store = {};
var localStorage = {
  getItem: function(k){ return store[k] || null; },
  setItem: function(k, v){ store[k] = v; }
};
'''


def build():
    # The Korean page is generated, so regenerate before any suite reads it —
    # otherwise the tests certify whatever was last written to disk.
    import build_ko, build_feeds
    build_ko.build()
    build_feeds.build()

    js = script_body()
    core = "\n".join([
        region(js, "var CURRENCIES = {", "var CURRENCY_ORDER"),
        region(js, "var CURRENCY_ORDER", "\n\n"),
        region(js, "  var ROUND_DESTS", "\n\n"),
        region(js, "  var GAP_MODES", "\n\n"),
        'var state = { players:[], defaultBuyIn:2000, currency:"USD", absorb:false,'
        ' roundTo:0, roundDest:0,'
        ' gapMode:"show", payVia:"fewest" };\n',
        # the safety bounds parseMoney and load() rely on
        region(js, "  var MAX_AMOUNT", "\n\n"),
        region(js, "  function cur(){", "  /* ---------- persistence"),
        region(js, "  function totalIn(p){", "  /* ---------- rendering"),
        # settlementText lives among the rendering code, but it produces plain text
        # rather than DOM, so it can be run and asserted on like any other pure
        # function. It is the artifact players keep, so it gets tested as one.
        func(js, "  function settlementText(res, rows,"),
        # rounding is money arithmetic, so it belongs with the rest of it
        func(js, "  function roundStep(){"),
        func(js, "  function roundDestName(){"),
        func(js, "  function roundingPlan(players){"),
        func(js, "  function bankerIndex(players){"),
        func(js, "  function dropModesWithoutBanker(){"),
        func(js, "  function seatName(p, i){"),
        func(js, "  function settleViaBanker(entries, bankerIdx){"),
        func(js, "  function gapToBanker(entries, bankerIdx, diff){"),
        func(js, "  function adjustedColumn(adj, gapOnBanker){"),
        func(js, "  function bankCheck(players){"),
        func(js, "  function creditors(players){"),
    ])
    # The Korean page has logic of its own now — list joining with particle
    # agreement, the name relabelling, the currency names. None of it was covered,
    # and a source-level check "does koList get called" passed while the output was
    # visibly wrong. Extract and run it like everything else.
    ko_js = open(os.path.join(ROOT, "ko", "app.html"), encoding="utf-8").read()
    ko_body = re.search(r"<script>\n(.*?)\n</script>", ko_js, re.S).group(1)
    korean = "\n".join([
        region(js, "var CURRENCIES = {", "var CURRENCY_ORDER"),
        region(js, "  var MAX_AMOUNT", "\n\n"),
        'var state = { players:[], defaultBuyIn:30000, currency:"KRW" };',
        region(js, "  function cur(){", "  /* ---------- persistence"),
        func(ko_body, "  function particle(word, withBatchim, without){"),
        func(ko_body, "  function koList(arr){"),
        func(ko_body, "  function curName(){"),
        region(ko_body, "  var KO_CURRENCY_NAME", "\n  function curName"),
    ])

    storage = "\n".join([
        core,
        'var KEY = "poker.ledger.v1";',
        "var MIN_PLAYERS = 2, MAX_PLAYERS = 10;",
        region(js, "  var THEMES = [", "  var root ="),
        "var themeState = null;",
        STUBS,
        func(js, "  function clampUnits(c){"),
        func(js, "  function readRound(v, code){"),
        func(js, "  function readGapMode(v, legacyAbsorb){"),
        func(js, "  function readPayVia(v){"),
        func(js, "  function readDest(v){"),
        func(js, "  function readPlayers(raw){"),
        region(js, "  var SHARE_BASE", "\n  function shareUrl"),
        func(js, "  function shareUrl(){"),
        func(js, "  function decodeShare(hash){"),
        func(js, "  function load(){"),
    ])
    def js_string(text):
        return "\"" + text.replace("\\", "\\\\").replace('"', '\\"') \
                          .replace("\n", "\\n").replace("\r", "") + "\""

    def read(name):
        path = os.path.join(ROOT, name)
        return open(path, encoding="utf-8").read() if os.path.exists(path) else ""

    html = open(SRC, encoding="utf-8").read()
    guide = re.search(r"<details class=\"guide\".*?</details>", html, re.S)
    guide_words = len(re.sub(r"<[^>]+>", " ", guide.group(0)).split()) if guide else 0
    # Guides are globbed, not listed. The list used to be typed by hand here and again
    # in pages.js, and a guide added to only one of them was silently untested.
    pages = ["privacy.html", "privacy-ko.html", "terms.html", "404.html",
             "how-it-works.html"] + sorted(
                 "guides/" + f for f in os.listdir(os.path.join(ROOT, "guides"))
                 if f.endswith(".html"))
    site = HARNESS + "\n".join([
        "var html = %s;" % js_string(html),
        "var head = %s;" % js_string(html[:html.find("</head>")]),
        "var sitemap = %s;" % js_string(read("sitemap.xml")),
        "var robots = %s;" % js_string(read("robots.txt")),
        "var ads = %s;" % js_string(read("ads.txt")),
        "var manifest = %s;" % js_string(read("manifest.webmanifest")),
        "var fontFiles = %s;" % ("[" + ", ".join(
            js_string(f) for f in sorted(os.listdir(os.path.join(ROOT, "fonts")))
            if f.endswith(".woff2")) + "]"),
        "var hasOfl = %s;" % ("true" if os.path.exists(os.path.join(ROOT, "fonts", "OFL.txt")) else "false"),
        "var css = %s;" % js_string(read("site.css")),
        "var consentJs = %s;" % js_string(read("consent.js")),
        "var ogCard = %s;" % js_string(read("scripts/og-card.html")),
        "var koHtml = %s;" % js_string(read("ko/index.html")),
        "var koTemplate = %s;" % js_string(read("ko/app.html")),
        "var rssEn = %s;" % js_string(read("rss.xml")),
        "var rssKo = %s;" % js_string(read("ko/rss.xml")),
        "var koGuides = {%s};" % ", ".join(
            "%s: %s" % (js_string(f), js_string(read("ko/guides/" + f)))
            for f in sorted(os.listdir(os.path.join(ROOT, "ko", "guides")))
            if f.endswith(".html") and not f.startswith("_")
            and not f.endswith(".part.html")),
        "var koFragments = %s;" % ("[" + ", ".join(
            js_string(f) for f in sorted(os.listdir(os.path.join(ROOT, "ko", "guides")))
            if f.endswith(".part.html")) + "]"),
        "var guideWords = %d;" % guide_words,
        # The budget that matters is what a phone actually pulls down, and every host
        # worth using negotiates compression. JXA has no gzip, so it is measured here.
        "var gzipKB = {%s};" % ", ".join(
            "%s: %.2f" % (js_string(n), len(gzip.compress(t.encode("utf-8"), 9)) / 1024)
            for n, t in [("index.html", html), ("site.css", read("site.css")),
                         ("consent.js", read("consent.js"))]),
        "/* pages */",
        "var pages = {%s};" % ", ".join(
            "%s: %s" % (js_string(n), js_string(read(n))) for n in pages),
    ])

    preludes = {"core": HARNESS + core,
                "korean": HARNESS + korean,
                "storage": HARNESS + storage + "\nvar html = %s;\n" % js_string(html),
                "site": site}

    os.makedirs(BUILD, exist_ok=True)
    built = []
    for name in sorted(os.listdir(CASES)):
        if not name.endswith(".js"):
            continue
        body = open(os.path.join(CASES, name), encoding="utf-8").read()
        m = re.match(r"//\s*needs:\s*(\w+)", body)
        if not m:
            sys.exit("%s is missing its `// needs:` line" % name)
        kind = m.group(1)
        if kind not in preludes:
            sys.exit("%s asks for unknown prelude %r" % (name, kind))
        outp = os.path.join(BUILD, name)
        tail = ('\nlog(""); log("PASS " + pass + "   FAIL " + fail);\n'
                'var __f = $.NSString.alloc.initWithUTF8String(out.join("\\n"));\n'
                '__f.writeToFileAtomicallyEncodingError(%r, true, $.NSUTF8StringEncoding, $());\n'
                '"done";\n' % (outp[:-3] + ".txt"))
        open(outp, "w", encoding="utf-8").write(preludes[kind] + "\n" + body + tail)
        built.append(name)
    print("built %d suites: %s" % (len(built), ", ".join(built)))


if __name__ == "__main__":
    build()
