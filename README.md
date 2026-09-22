# Home Poker Ledger

Settle a home poker game: enter each player's buy-ins and cash-out, get who pays
whom in the fewest payments.

**Live → [homepokerledger.com](https://homepokerledger.com/)**
· **한국어 → [homepokerledger.com/ko](https://homepokerledger.com/ko/)**

Free, no account, nothing to install. This repository is the source.

---

## The whole application is one HTML file

`index.html` is 116 KB and contains the markup, the styles, and the logic. No
framework, no bundler, no build step, no dependencies, no `node_modules`. Open it
from disk with no web server and it works.

That is not minimalism for its own sake. It is what makes the next three
properties possible.

### There is no server

Nothing is uploaded, because there is nowhere to upload it to. The site is static
files on a CDN. Player names and amounts exist only in the tab you typed them
into.

### Share links use the URL fragment

A whole evening's ledger encodes into the part of the URL after `#`. **Browsers
never transmit the fragment to a server** — not in the request line, not in
`Referer`. So you can send someone the complete game state and it still has not
touched anyone's infrastructure.

### Money is never a float

Every amount is an integer count of the currency's smallest unit — cents for USD,
whole won for KRW. `0.1 + 0.2` is the classic demonstration of why, and in a tool
about who owes whom, arithmetic that is quietly wrong is the worst possible
failure, because nothing looks broken.

Currencies with no minor unit — yen, won — are handled as whole units rather than
being given two decimal places they do not have. This breaks most calculators.

---

## The settlement

A home game has no house, so the money in equals the money out and the only thing
that matters is each player's **net**. Nets sum to zero when the count is right.

The question is how to move the money in as few payments as possible. Sort
winners by what they are owed and losers by what they owe, then repeatedly match
the largest against the largest:

```
while there is a winner and a loser left:
    amount = min(largest owed, largest owing)
    record: loser pays winner `amount`
    subtract `amount` from both
    drop whichever has reached zero
```

Each payment zeroes at least one person, so *n* players always settle in at most
*n* − 1 payments.

### Worked example

Four players, $20 each, one rebuy for Dan:

| Player | Bought in | Cashed out | Net |
|---|---|---|---|
| Alice | $20 | $65 | **+$45** |
| Bob   | $20 | $0  | **−$20** |
| Cara  | $20 | $10 | **−$10** |
| Dan   | $40 | $25 | **−$15** |

```
Bob  → Alice  $20     (Bob settled; Alice still owed $25)
Dan  → Alice  $15     (Dan settled; Alice still owed $10)
Cara → Alice  $10     (everyone settled)
```

Three payments instead of the six that "everyone pays everyone" produces.

### Or route through the banker

Most home games run a bank — one person holds the cash and sells chips both ways.
Mark that seat as banker and payments route hub-and-spoke through them instead,
which is what those games actually do. A discrepancy can be made to land on the
banker, and unpaid buy-ins are tracked against the cash box during the night.

---

## The check that matters more than the settlement

Before any payment is computed, total buy-ins are compared against total
cash-outs. They should be identical.

**When they are not, the tool says so and by how much, rather than adjusting a
number until it fits.** Almost always the cause is a rebuy nobody wrote down, and
it has a signature: the gap is a round number equal to somebody's buy-in. If you
are short exactly one buy-in, you are not short — you are missing a line.

Quietly reconciling would make this worse than a piece of paper.

---

## Tests

2,631 assertions across 17 suites, run through macOS JavaScriptCore:

```sh
python3 test/build.py && sh test/run.sh
```

`test/build.py` extracts regions and named functions straight out of `index.html`
into preludes, so the suites test the shipped code rather than a copy of it. There
is no test-only build of the app and no way for the two to drift.

JavaScriptCore via `osascript` has no `gzip`, no `btoa`/`atob` and no
`TextEncoder`, which shaped several decisions in here.

## Build

```sh
sh scripts/build-site.sh     # assembles dist/ for Cloudflare Pages
```

The Korean page is **generated**, not hand-maintained: `scripts/build_ko.py`
extracts the money code out of `index.html` and injects it into `ko/app.html`. The
build fails if the Korean page ships without the settlement functions. The two
pages cannot disagree about arithmetic, which is the only way to run a second
language on a tool like this without eventually being wrong in one of them.

## Layout

```
index.html          the entire application
site.css            styles for the content pages
ko/                 Korean template + guides (ko/index.html is generated)
guides/             long-form pieces on running the money side of a home game
test/               17 suites, 2,631 assertions
scripts/            build, Korean generation, feeds, preflight
_headers            CSP, HSTS, frame-ancestors — applied by Cloudflare Pages
```

## Feedback

Issues and suggestions are welcome. If your game does something this does not
handle, that is the most useful thing you can tell me.
