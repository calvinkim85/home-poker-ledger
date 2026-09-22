#!/usr/bin/env python3
"""Generate the Korean section from templates plus the money code in index.html.

The Korean pages are a separate interface, not a translated one: Korean is SOV with
particles, so the English app's habit of gluing sentence fragments around values
("A" + " pays " + "B") has no Korean equivalent to translate into. The wording is
written as Korean from the start.

What is emphatically NOT rewritten is the arithmetic. Currency handling, parsing,
formatting, totals and the settlement solver are lifted out of index.html at build
time, so there is exactly one implementation of the part where a bug costs somebody
real money, and it is the one covered by the whole test suite. The component CSS is
shared the same way.

Guides are assembled from content fragments rather than written as whole pages. The
English side shows why: its head, breadcrumbs and structured data are pasted into
twenty-one files, so a schema fix has to be made twenty-one times and one of them
gets missed.

Run by scripts/build-site.sh, and by test/build.py so the output can be asserted on.
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract import ROOT, script_body, region, func, style_block   # noqa: E402

TEMPLATE = os.path.join(ROOT, "ko", "app.html")
OUT = os.path.join(ROOT, "ko", "index.html")
GUIDES = os.path.join(ROOT, "ko", "guides")
MARKER = "/* @CORE */"
STYLE_MARKER = "/* @STYLE */"
DATE = "2026-09-18T10:00:00+09:00"


def core_js():
    js = script_body()
    return "\n".join([
        region(js, "var CURRENCIES = {", "var CURRENCY_ORDER"),
        region(js, "var CURRENCY_ORDER", "\n\n"),
        region(js, "  var MAX_AMOUNT", "\n\n"),
        region(js, "  function cur(){", "  /* ---------- persistence"),
        region(js, "  function totalIn(p){", "  /* ---------- rendering"),
        # Storage-side validators and the share codec. The Korean page needs the same
        # guarantees about untrusted input that the English one has, and a share link
        # is the one input a stranger controls.
        func(js, "  function clampUnits(c){"),
        func(js, "  function readRound(v, code){"),
        func(js, "  function readGapMode(v, legacyAbsorb){"),
        func(js, "  function readPayVia(v){"),
        func(js, "  function readDest(v){"),
        func(js, "  function readPlayers(raw){"),
        region(js, "  var SHARE_BASE", "\n  function shareUrl"),
        func(js, "  function shareUrl(){"),
        func(js, "  function decodeShare(hash){"),
    ])


def read_part(path):
    """`key: value` lines, then a --- line, then the body HTML."""
    raw = open(path, encoding="utf-8").read()
    if "\n---\n" not in raw:
        sys.exit("%s has no --- separator" % path)
    head, body = raw.split("\n---\n", 1)
    meta = {}
    for line in head.strip().split("\n"):
        k, _, v = line.partition(":")
        meta[k.strip()] = v.strip()
    for need in ("title", "h1", "sub", "desc"):
        if not meta.get(need):
            sys.exit("%s is missing `%s`" % (path, need))
    return meta, body.rstrip() + "\n"


def fill(tpl, **kw):
    for k, v in kw.items():
        tpl = tpl.replace("{{%s}}" % k, v)
    if "{{" in tpl:
        leftover = tpl[tpl.index("{{"):tpl.index("{{") + 40]
        sys.exit("build-ko: unfilled placeholder near %r" % leftover)
    return tpl


def build_guides(style):
    parts = sorted(f for f in os.listdir(GUIDES) if f.endswith(".part.html"))
    if not parts:
        sys.exit("build-ko: no guide fragments found")
    wrap = open(os.path.join(GUIDES, "_wrap.html"), encoding="utf-8").read()
    wrap = wrap.replace(STYLE_MARKER, style)

    written = []
    for f in parts:
        slug = f[:-len(".part.html")]
        meta, body = read_part(os.path.join(GUIDES, f))
        page = fill(wrap, TITLE=meta["title"], H1=meta["h1"], SUB=meta["sub"],
                    DESC=meta["desc"], SLUG=slug, DATE=DATE, BODY=body)
        open(os.path.join(GUIDES, slug + ".html"), "w", encoding="utf-8").write(page)
        written.append((slug, meta))

    items = "".join(
        '      <li><a href="%s"><b>%s</b>\n        <span>%s</span></a></li>\n'
        % (slug, m["h1"], m["desc"]) for slug, m in written).rstrip()
    listel = ",\n".join(
        '      {\n        "@type": "ListItem",\n        "position": %d,\n'
        '        "url": "https://homepokerledger.com/ko/guides/%s",\n'
        '        "name": "%s"\n      }' % (i + 1, slug, m["h1"])
        for i, (slug, m) in enumerate(written))

    idx = open(os.path.join(GUIDES, "_index.html"), encoding="utf-8").read()
    idx = fill(idx.replace(STYLE_MARKER, style),
               ITEMS=items, LISTEL=listel, COUNT=str(len(written)), DATE=DATE)
    open(os.path.join(GUIDES, "index.html"), "w", encoding="utf-8").write(idx)
    return [s for s, _ in written]


def build():
    tpl = open(TEMPLATE, encoding="utf-8").read()
    if MARKER not in tpl:
        sys.exit("ko/app.html is missing the %s marker" % MARKER)
    core = core_js()

    banner = ("  /* ---------------------------------------------------------------\n"
              "     Lifted from index.html by scripts/build_ko.py. Do not edit here —\n"
              "     edit index.html and rebuild, or the two will disagree about money.\n"
              "     --------------------------------------------------------------- */\n")
    out = tpl.replace(MARKER, banner + core)
    if STYLE_MARKER not in out:
        sys.exit("ko/app.html is missing the %s marker" % STYLE_MARKER)
    out = out.replace(STYLE_MARKER, style_block())

    # A generated page that silently lost the solver would still load, still look
    # right, and settle nothing. Fail the build instead.
    for needed in ["function settleNets(", "function parseMoney(", "function fmt(",
                   "function totalIn(", "var CURRENCIES = {"]:
        if needed not in out:
            sys.exit("build-ko: %r missing from the generated page" % needed)
    for probe in ["@CORE", "@STYLE"]:
        if probe in out:
            sys.exit("build-ko: the %s marker survived substitution" % probe)
    # Without the shared block the page works and looks broken, which is worse.
    for needed in [".seat{", ".summary th,", ".btn{"]:
        if needed not in out:
            sys.exit("build-ko: %r missing — the page would render unstyled" % needed)

    open(OUT, "w", encoding="utf-8").write(out)
    slugs = build_guides(style_block())
    print("build-ko: ko/index.html ready (%.1f KB, %.1f KB shared logic); %d guides: %s"
          % (len(out) / 1024, len(core) / 1024, len(slugs), ", ".join(slugs)))


if __name__ == "__main__":
    build()
