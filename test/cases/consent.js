// needs: site

/* PRV-11 / KR-09. The requirement is not "respects a preference" — it is that nothing
   setting a non-essential cookie is fetched at all until the visitor says yes.

   The gate is enforced in consent.js rather than in markup, so these assertions read
   that file. The browser-side behaviour (banner shows, decline stores and loads
   nothing, allow loads adsbygoogle, CLS stays 0) was verified by driving the page. */

log("-- the publisher ID is the single switch, and it is off --");
eq("consent.js declares exactly one CLIENT constant",
   (consentJs.match(/var CLIENT = /g) || []).length, 1);
/* Empty before approval, a real ID after. Asserting "always empty" would fail the
   day advertising is switched on, so assert the shape instead: anything that is
   neither blank nor a valid publisher ID is a typo that would silently serve no ads. */
var clientVal = (consentJs.match(/var CLIENT = "([^"]*)";/) || [])[1];
eq("the publisher ID is blank or well-formed",
   clientVal === "" || /^ca-pub-\d{16}$/.test(clientVal), true);
if (clientVal === "") log("   (advertising is off — no publisher ID)");
else log("   (advertising is on — " + clientVal + ")");

log("-- advertising is fetched only from inside the grant path --");
eq("the AdSense host appears exactly once",
   (consentJs.match(/pagead2\.googlesyndication\.com/g) || []).length, 1);
eq("it is built inside loadAds(), not at the top level",
   consentJs.indexOf("function loadAds()") < consentJs.indexOf("pagead2.googlesyndication.com"), true);
eq("loadAds() returns early without a publisher ID",
   /function loadAds\(\)\s*\{[\s\S]{0,120}if \(adsLoaded \|\| !CLIENT\) return;/.test(consentJs), true);
/* Every place that calls loadAds() must be gated on a grant. Counting call sites
   would break whenever the file is edited; checking the guard is the actual rule. */
var unguarded = consentJs.split("\n").filter(function(line){
  return line.indexOf("loadAds()") !== -1 &&
         line.indexOf("function loadAds()") === -1 &&
         line.indexOf("GRANTED") === -1;
});
eq("every loadAds() call is gated on consent being granted", unguarded, []);

log("-- no page loads advertising on its own --");
Object.keys(pages).concat(["__app__"]).forEach(function(n){
  var p = n === "__app__" ? html : pages[n];
  var label = n === "__app__" ? "index.html" : n;
  eq(label + " embeds no ad script", p.indexOf("googlesyndication") === -1, true);
  eq(label + " loads the consent gate", /<script src="[^"]*consent\.js" defer><\/script>/.test(p), true);
  eq(label + " offers a way to change the answer", p.indexOf("data-consent-reopen") !== -1, true);
});

log("-- Consent Mode v2 starts denied --");
["ad_storage", "ad_user_data", "ad_personalization"].forEach(function(k){
  eq("consent.js declares " + k, consentJs.indexOf(k) !== -1, true);
});
eq("the default signal is sent before anything can load",
   consentJs.indexOf("signal(read() === GRANTED ? GRANTED : DENIED)") <
   consentJs.indexOf("function loadAds()"), true);
eq("analytics storage is denied outright — the site has no analytics",
   /analytics_storage: "denied"/.test(consentJs), true);

log("-- the banner cannot shift the layout --");
eq("the banner is fixed-position", /\.cc\{position:fixed/.test(consentJs), true);

log("-- the choice is reversible and offered in Korean --");
eq("consent.js can reopen the dialog", /reopen: function/.test(consentJs), true);
eq("consent.js has Korean copy for the Korean page", consentJs.indexOf("개인정보처리방침") !== -1, true);
eq("the ad slot in the app stays hidden in markup",
   /<aside class="adslot" id="adslot" hidden/.test(html), true);

log("-- the footer is English everywhere, in every browser --");
/* A previous version reordered these two links from navigator.language, so a Korean
   browser was shown the Korean policy first. The site is deliberately English-only
   apart from the policy Korean law requires, so that behaviour was removed: the
   footer now renders identically for everyone and the Korean policy is simply one
   labelled link away. */
eq("consent.js no longer reorders the policy links",
   /orderPolicyLinks/.test(consentJs), false);
eq("consent.js does not read the browser's language at all",
   /navigator\.languages?/.test(consentJs), false);

