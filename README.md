# Home Poker Ledger

Settle a home poker game: enter each player's buy-ins and cash-out, get who pays
whom in the fewest payments.

**Live tool → [homepokerledger.com](https://homepokerledger.com/)**
· **한국어 → [homepokerledger.com/ko](https://homepokerledger.com/ko/)**

Free, no account, nothing to install. It runs entirely in the browser — there is no
server, so the names and amounts you type never leave your device.

This repository is documentation, not source. The app is a single HTML file served
at the address above; what follows is how the arithmetic works, written out so you
can check it or reimplement it yourself.

---

## The problem

A home game has no house. The money that goes in is the money that comes out, so at
the end the only thing that matters is each player's **net**: what they cashed out
minus everything they bought in for.

Add every net together and, if the count is right, they come to exactly zero. The
winners are owed precisely what the losers owe.

The question is then how to move the money with as few payments as possible. Six
people sending six separate transfers is not necessary when three will do.

## The algorithm

Sort the winners by how much they are owed, and the losers by how much they owe.
Repeatedly take the largest of each and settle as much as one payment can cover:

```
while there is a winner and a loser left:
    amount = min(largest amount owed, largest amount owing)
    record: loser pays winner `amount`
    subtract `amount` from both
    drop whichever has reached zero
```

Each payment zeroes out at least one person, so a table of *n* players always
settles in at most *n* − 1 payments.

### Worked example

Four players, $20 each, one rebuy for Dan:

| Player | Bought in | Cashed out | Net |
|---|---|---|---|
| Alice | $20 | $65 | **+$45** |
| Bob   | $20 | $0  | **−$20** |
| Cara  | $20 | $10 | **−$10** |
| Dan   | $40 | $25 | **−$15** |

Nets sum to zero, so the books balance. Matching largest against largest:

```
Bob  → Alice  $20     (Bob settled; Alice still owed $25)
Dan  → Alice  $15     (Dan settled; Alice still owed $10)
Cara → Alice  $10     (everyone settled)
```

Three payments for four players, rather than the six that "everyone pays everyone"
would produce.

## Money is never held as a float

Every amount is an integer count of the currency's smallest unit — cents for USD,
whole won for KRW. Floating-point cents produce the classic `0.1 + 0.2` error, and
in a tool about who owes whom, arithmetic that is quietly wrong is the worst
possible failure, because nothing looks broken.

Currencies without a minor unit (yen, won) are handled as whole units rather than
being displayed with two decimal places they do not have.

## The check that matters more than the settlement

Before any payments are calculated, total buy-ins are compared against total
cash-outs. They should be identical.

When they are not, the tool says so and by how much, rather than adjusting a number
until it fits. Almost always the cause is a rebuy nobody wrote down — and it has a
signature: the gap is usually a round number equal to somebody's buy-in. If you are
short exactly one buy-in, you are not short at all; you are missing a line.

Quietly making the numbers reconcile is the one behaviour that would make the tool
worse than a piece of paper.

## Guides

Longer pieces on running the money side of a home game:

- [When the bank comes up short](https://homepokerledger.com/guides/bank-came-up-short)
- [Being the banker](https://homepokerledger.com/guides/being-the-banker)
- [Five ways a settlement goes wrong](https://homepokerledger.com/guides/settlement-mistakes)
- [Chip denominations and starting stacks](https://homepokerledger.com/guides/chip-denominations)
- [All guides](https://homepokerledger.com/guides/) · [한국어 가이드](https://homepokerledger.com/ko/guides/)

## Feedback

Issues and suggestions are welcome here. If your game does something the tool does
not handle, that is the most useful thing you can tell me.
