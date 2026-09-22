#!/usr/bin/env python3
"""Pull named pieces of JavaScript out of index.html.

The app is one HTML file with no build step, so anything that needs its logic —
the test suites, the Korean page — takes it from the source rather than keeping a
copy. Extracting is the whole point: a copy drifts, and this repo has already been
bitten twice by one (a fossil load() in the theme suite, a hand-typed guide list).

Shared by test/build.py and scripts/build-ko.py so there is exactly one definition
of "how do we cut a function out of index.html".
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "index.html")


def script_body(path=SRC):
    html = open(path, encoding="utf-8").read()
    m = re.search(r"<script>\n(.*?)\n</script>", html, re.S)
    if not m:
        sys.exit("could not find the <script> block in %s" % path)
    return m.group(1)


def region(js, start, end):
    """Everything from the line containing `start` up to the next `end`."""
    i = js.index(start)
    return js[i:js.index(end, i)]


def func(js, decl):
    """A single top-level function, matched by its two-space indented closing brace."""
    i = js.index(decl)
    return js[i:js.index("\n  }\n", i) + 5]


def style_block(path=SRC):
    """The app's component CSS, which lives inline in index.html rather than in
    site.css. The Korean page needs the same buttons, seats and summary table, and
    a second copy would drift the way every other copy in this repo has."""
    html = open(path, encoding="utf-8").read()
    m = re.search(r"<style>\n(.*?)\n</style>", html, re.S)
    if not m:
        sys.exit("could not find the <style> block in %s" % path)
    return m.group(1)
