// needs: korean

log("-- Korean list joining, with particle agreement --");
/* This shipped wrong and a source-level test passed anyway, because it asserted
   that koList calls the particle helper rather than looking at what came out.
   The live page read "민수(₩20,000)민수와 서연(₩10,000)" — josa() returns the word
   WITH its particle, so the name was emitted twice. */
function N(name, amt){ return { name:name, amt:amt }; }
state.currency = "KRW";

eq("one name is returned alone", koList([N("민수", 20000)]), "민수(₩20,000)");

/* 수 ends in a vowel, so 와; 연 ends in ㄴ, so 과. The particle agrees with the
   name before it, not with the amount, which always ends in ")". */
eq("a vowel-final name takes 와", koList([N("민수", 20000), N("서연", 10000)]),
   "민수(₩20,000)와 서연(₩10,000)");
eq("a consonant-final name takes 과", koList([N("서연", 10000), N("민수", 20000)]),
   "서연(₩10,000)과 민수(₩20,000)");
eq("the name is never repeated",
   koList([N("민수", 20000), N("서연", 10000)]).split("민수").length - 1, 1);

eq("three names use commas then the particle",
   koList([N("현우", 5000), N("민수", 20000), N("서연", 10000)]),
   "현우(₩5,000), 민수(₩20,000)와 서연(₩10,000)");

/* A Latin name has no pronounceable particle in Korean, so fall back to a comma
   rather than inventing one — "Mike와" is worse than "Mike,". */
eq("a latin name falls back to a comma",
   koList([N("Mike", 5000), N("서연", 10000)]), "Mike(₩5,000), 서연(₩10,000)");
eq("particle returns nothing for latin", particle("Mike", "과", "와"), "");
eq("particle returns only the particle, never the word",
   particle("민수", "과", "와"), "와");

log("-- currency names are Korean --");
["USD","EUR","GBP","SGD","CNY","JPY","KRW"].forEach(function(code){
  state.currency = code;
  eq(code + " has a Korean name", /[가-힣]/.test(curName()), true);
});
state.currency = "KRW";
eq("won is named in Korean", curName(), "한국 원");
