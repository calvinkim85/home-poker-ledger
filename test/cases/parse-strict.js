// needs: core

/* parseMoney used to drop every comma and strip any junk at either edge, so a typo
   came out as a different, plausible-looking number with no red field: "20,50" (a
   European decimal) became 2,050.00, "20k" became 20, and "−5" (a typographic minus)
   became +5. Each of these now fails, which marks the field and keeps the last good
   value - the honest failure the rest of parseMoney already uses. Found by the
   2026-11-05 security review. */

state.currency = "USD";
log("-- ambiguous or mistyped input is rejected, not reinterpreted --");
eq("comma decimal 20,50", parseMoney("20,50"), null);
eq("European grouping 1.000,50", parseMoney("1.000,50"), null);
eq("misplaced comma 1,0000", parseMoney("1,0000"), null);
eq("trailing multiplier 20k", parseMoney("20k"), null);
eq("Korean multiplier 3만", parseMoney("3만"), null);
eq("typographic minus", parseMoney("−5"), null);
eq("en dash minus", parseMoney("–5"), null);
eq("plus sign", parseMoney("+5"), null);
eq("trailing full-width digits", parseMoney("3０００"), null);
eq("trailing Arabic-Indic digit", parseMoney("2٠"), null);

log("-- everything people really type still parses --");
eq("plain", parseMoney("20"), 2000);
eq("grouped", parseMoney("1,000"), 100000);
eq("grouped with cents", parseMoney("1,000.50"), 100050);
eq("millions", parseMoney("1,000,000"), 100000000);
eq("symbol first", parseMoney("$40"), 4000);
eq("code after", parseMoney("50.00 USD"), 5000);
eq("lowercase code", parseMoney("40 usd"), 4000);
eq("code before", parseMoney("USD 40"), 4000);
eq("S$", parseMoney("S$20"), 2000);
eq("US$", parseMoney("US$20"), 2000);
eq("symbol after", parseMoney("20€"), 2000);
eq("CN¥ grouped", parseMoney("CN¥1,250.50"), 125050);
eq("Swiss apostrophe", parseMoney("1'000"), 100000);
eq("thin spaces", parseMoney("1 000"), 100000);
eq("invisible marks around", parseMoney("‎20‏"), 2000);
eq("zero-width space", parseMoney("​20"), 2000);
state.currency = "KRW";
eq("won sign", parseMoney("₩30,000"), 30000);
eq("won suffix", parseMoney("30000원"), 30000);
eq("grouped won suffix", parseMoney("30,000원"), 30000);
state.currency = "JPY";
eq("yen suffix", parseMoney("3000円"), 3000);
state.currency = "CNY";
eq("yuan suffix", parseMoney("100元"), 10000);
state.currency = "USD";
