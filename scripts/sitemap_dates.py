"""Keep sitemap.xml's <lastmod> dates true.

Google uses <lastmod> to decide which pages to re-crawl, and only while it trusts the dates.
The sitemap is maintained by hand, and by October 2026 every date in it said September: the
guides had all been edited on 2026-10-05 (related-guides links) and nothing told Google.

Each URL's date is the day its source file last changed in git. A file with uncommitted
changes counts as changed today, so running this before committing gives the right answer.

    python3 scripts/sitemap_dates.py          rewrite the dates in place
    python3 scripts/sitemap_dates.py --check  exit 1 and list any that are stale

Deliberately NOT run by build-site.sh: Cloudflare Pages may build from a shallow clone, where
every file's "last commit" is the deploy commit. That would stamp every page with the deploy
date, which is exactly the kind of lastmod Google learns to ignore. Run it locally; the
committed sitemap is what ships.
"""
import datetime, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
SITE = "https://homepokerledger.com/"
SITEMAP = os.path.join(ROOT, "sitemap.xml")


def source_for(url):
    """The committed file that a sitemap URL is served from."""
    path = url[len(SITE):]
    if path == "" or path.endswith("/"):
        return path + "index.html"
    return path + ".html"


def git(*args):
    return subprocess.run(["git", "-C", ROOT] + list(args),
                          capture_output=True, text=True, check=True).stdout.strip()


DEPLOY_REMOTE = "calvinkim85/poker-ledger.git"


def has_history():
    """True only inside the deploy repo's own history.

    The public mirror (calvinkim85/home-poker-ledger) has different, later commit dates for the
    same files, and the isolated test runner copies the tree without .git. In both, the true
    dates are unknowable, so the check is skipped rather than failing on someone else's clock."""
    try:
        if git("rev-parse", "--is-inside-work-tree") != "true":
            return False
        return git("remote", "get-url", "origin").endswith(DEPLOY_REMOTE)
    except (OSError, subprocess.CalledProcessError):
        return False


def last_changed(rel):
    if git("status", "--porcelain", "--", rel):
        return datetime.date.today().isoformat()
    return git("log", "-1", "--format=%cs", "--", rel)


def expected():
    """{url: date} for every <loc> in the sitemap, or None without git history."""
    if not has_history():
        return None
    xml = open(SITEMAP, encoding="utf-8").read()
    out = {}
    for url in re.findall(r"<loc>([^<]+)</loc>", xml):
        rel = source_for(url)
        if not os.path.exists(os.path.join(ROOT, rel)):
            sys.exit("sitemap_dates: %s has no source file %s" % (url, rel))
        out[url] = last_changed(rel)
    return out


def main():
    want = expected()
    if want is None:
        sys.exit("sitemap_dates: run this in the deploy repo (%s); its git history is the source of the dates" % DEPLOY_REMOTE)
    xml = open(SITEMAP, encoding="utf-8").read()

    def fix(m):
        return "%s<lastmod>%s</lastmod>" % (m.group(1), want[m.group(2)])

    pattern = re.compile(r"(<loc>([^<]+)</loc>\s*)<lastmod>[^<]*</lastmod>")
    stale = [(u, d) for u, d in re.findall(r"<loc>([^<]+)</loc>\s*<lastmod>([^<]*)</lastmod>", xml)
             if want[u] != d]
    if "--check" in sys.argv:
        for u, d in stale:
            print("stale: %s says %s, last changed %s" % (u, d, want[u]))
        sys.exit(1 if stale else 0)
    new = pattern.sub(fix, xml)
    if len(pattern.findall(xml)) != len(want):
        sys.exit("sitemap_dates: every <url> needs exactly one <lastmod> after its <loc>")
    open(SITEMAP, "w", encoding="utf-8").write(new)
    print("sitemap_dates: %d urls, %d dates updated" % (len(want), len(stale)))


if __name__ == "__main__":
    main()
