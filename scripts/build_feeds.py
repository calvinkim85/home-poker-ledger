#!/usr/bin/env python3
"""Generate RSS feeds for the English and Korean guide sections.

Naver's Search Advisor accepts an RSS feed alongside a sitemap and uses it to pick
up new pages faster, so registering without one leaves a step of their own flow
with nothing to submit. Google and Bing ignore RSS for discovery these days, but
the English feed costs nothing and is a normal thing for a site with articles.

Titles and descriptions are read back out of the built pages rather than kept in a
list here — a list would be a third place to forget a guide, after the sitemap and
the index, both of which have already caught exactly that mistake.
"""
import os, re, sys
from email.utils import format_datetime
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract import ROOT   # noqa: E402

SITE = "https://homepokerledger.com"
BUILT = datetime(2026, 9, 18, 10, 0, 0, tzinfo=timezone.utc)


def esc(t):
    return (t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;"))


def page_meta(path):
    html = open(path, encoding="utf-8").read()
    title = (re.search(r"<title>([^<]+)</title>", html) or [None, ""])[1]
    desc = (re.search(r'<meta name="description" content="([^"]+)"', html) or [None, ""])[1]
    canon = (re.search(r'<link rel="canonical" href="([^"]+)"', html) or [None, ""])[1]
    return title.strip(), desc.strip(), canon.strip()


def feed(out_path, *, title, link, desc, lang, pages):
    items = []
    for p in pages:
        t, d, url = page_meta(p)
        if not url:
            sys.exit("build-feeds: %s has no canonical URL" % p)
        items.append(
            "    <item>\n"
            "      <title>%s</title>\n"
            "      <link>%s</link>\n"
            "      <guid isPermaLink=\"true\">%s</guid>\n"
            "      <description>%s</description>\n"
            "      <pubDate>%s</pubDate>\n"
            "    </item>" % (esc(t), esc(url), esc(url), esc(d), format_datetime(BUILT)))
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        '  <channel>\n'
        '    <title>%s</title>\n'
        '    <link>%s</link>\n'
        '    <description>%s</description>\n'
        '    <language>%s</language>\n'
        '    <lastBuildDate>%s</lastBuildDate>\n'
        '    <atom:link href="%s" rel="self" type="application/rss+xml"/>\n'
        '%s\n'
        '  </channel>\n'
        '</rss>\n'
        % (esc(title), esc(link), esc(desc), lang, format_datetime(BUILT),
           esc(SITE + "/" + out_path), "\n".join(items)))
    open(os.path.join(ROOT, out_path), "w", encoding="utf-8").write(xml)
    return len(items)


def build():
    en_dir = os.path.join(ROOT, "guides")
    en = [os.path.join(en_dir, f) for f in sorted(os.listdir(en_dir))
          if f.endswith(".html") and f != "index.html"]
    n_en = feed("rss.xml", title="Home Poker Ledger — guides", link=SITE,
                desc="Short guides on running and settling a home poker game.",
                lang="en-US", pages=en)

    ko_dir = os.path.join(ROOT, "ko", "guides")
    ko = [os.path.join(ko_dir, f) for f in sorted(os.listdir(ko_dir))
          if f.endswith(".html") and f != "index.html"
          and not f.startswith("_") and not f.endswith(".part.html")]
    n_ko = feed("ko/rss.xml", title="홈 홀덤 가이드", link=SITE + "/ko/",
                desc="홈 홀덤을 여는 사람을 위한 짧은 가이드 모음.",
                lang="ko-KR", pages=ko)
    print("build-feeds: rss.xml (%d) and ko/rss.xml (%d)" % (n_en, n_ko))


if __name__ == "__main__":
    build()
