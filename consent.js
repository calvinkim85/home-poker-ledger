/* Consent gate for advertising cookies.
   PRV-11 / KR-09.

   The rule this implements: nothing that sets a non-essential cookie loads until the
   visitor has said yes. Not "loads and then respects a preference" — does not load.
   That is the only version that is true for Korea, where advertising cookie data is
   personal information and opt-in applies, and it is stricter than the US needs, which
   is fine.

   Consequences worth knowing:
     - The calculator itself uses no cookies at all and is completely unaffected by any
       answer given here. Declining costs the visitor nothing.
     - Until CLIENT below is filled in with a real AdSense publisher ID, no ads exist,
       so no banner is shown. An empty ID is the off switch for this whole file.
     - The banner is fixed to the bottom of the viewport rather than inserted into the
       document, so it cannot shift layout. The site measures CLS 0.000 and this keeps it.

   This file is additive. If it fails to load or throws, the page keeps working and no
   advertising loads — the failure mode is "no ads", never "ads without consent". */
(function () {
  "use strict";

  /* Filled in by scripts/enable-adsense.sh once the AdSense account is approved.
     Empty means there is no advertising on this site, so there is nothing to consent to. */
  var CLIENT = "";

  var KEY = "poker.ledger.consent.v1";
  var GRANTED = "granted", DENIED = "denied";

  function read() {
    try { var v = localStorage.getItem(KEY); return v === GRANTED || v === DENIED ? v : null; }
    catch (e) { return null; }
  }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  /* Google Consent Mode v2. Declared before any Google tag loads so that if one ever
     does, it starts denied rather than starting on and being corrected. */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  function signal(state) {
    gtag("consent", state === GRANTED ? "update" : "default", {
      ad_storage: state === GRANTED ? "granted" : "denied",
      ad_user_data: state === GRANTED ? "granted" : "denied",
      ad_personalization: state === GRANTED ? "granted" : "denied",
      analytics_storage: "denied"
    });
  }
  signal(read() === GRANTED ? GRANTED : DENIED);

  var adsLoaded = false;
  function loadAds() {
    if (adsLoaded || !CLIENT) return;
    adsLoaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
            encodeURIComponent(CLIENT);
    document.head.appendChild(s);
    var slot = document.getElementById("adslot");
    if (slot) { slot.hidden = false; slot.removeAttribute("aria-hidden"); }
  }

  var style, banner;
  function injectStyle() {
    if (style) return;
    style = document.createElement("style");
    style.textContent =
      '.cc{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;justify-content:center;' +
        'padding:12px clamp(10px,2.4vw,20px);pointer-events:none}' +
      '.cc-in{pointer-events:auto;max-width:640px;width:100%;background:var(--card,#fbf7ef);' +
        'border:1px solid var(--card-edge,#ddd2bd);border-radius:13px;' +
        'box-shadow:0 24px 50px -20px var(--shadow,rgba(10,26,20,.42));' +
        'padding:15px 17px;display:flex;gap:13px;align-items:flex-start;flex-wrap:wrap}' +
      '.cc-t{flex:1 1 260px;min-width:0;font-family:var(--body,system-ui),sans-serif;' +
        'font-size:.82rem;line-height:1.6;color:var(--ink,#22201c);margin:0}' +
      '.cc-t a{color:inherit;text-underline-offset:2px;text-decoration-color:var(--gold,#84662c)}' +
      '.cc-b{display:flex;gap:8px;flex:0 0 auto}' +
      '.cc-btn{font-family:var(--mono,monospace);font-size:.63rem;letter-spacing:.15em;' +
        'text-transform:uppercase;padding:9px 13px;border-radius:9px;cursor:pointer;' +
        'border:1px solid var(--card-edge,#ddd2bd);background:transparent;color:var(--ink,#22201c);' +
        'transition:background .15s ease,border-color .15s ease}' +
      '.cc-btn:hover{background:var(--card-sunk,#f2ebdd);border-color:var(--gold,#84662c)}' +
      '.cc-btn:focus-visible{outline:2px solid var(--gold,#84662c);outline-offset:2px}' +
      '.cc-btn.yes{background:var(--felt-deep,#14523c);border-color:var(--felt-deep,#14523c);' +
        'color:var(--on-felt,#fcfaf5)}' +
      '@media (prefers-reduced-motion:reduce){.cc-btn{transition-duration:.01ms}}';
    document.head.appendChild(style);
  }

  function close() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }

  function decide(v) { write(v); signal(v); close(); if (v === GRANTED) loadAds(); }

  function prefix() {
    /* The banner is shown on pages one and two levels deep, so the policy link has to
       resolve from both. */
    return /\/guides\//.test(location.pathname) ? "../" : "";
  }

  function show() {
    if (banner || !CLIENT) return;
    injectStyle();
    banner = document.createElement("div");
    banner.className = "cc";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Cookie choices");
    var ko = document.documentElement.lang === "ko";
    banner.innerHTML =
      '<div class="cc-in">' +
        '<p class="cc-t">' + (ko
          ? '이 사이트는 광고를 통해 무료로 운영됩니다. 광고 쿠키 사용에 동의하시겠습니까? ' +
            '거부하셔도 정산기의 모든 기능은 그대로 이용하실 수 있습니다. ' +
            '<a href="' + prefix() + 'privacy-ko.html">개인정보처리방침</a>'
          : 'This site is free because of advertising. May we use advertising cookies? ' +
            'The calculator works exactly the same either way — it uses no cookies at all. ' +
            '<a href="' + prefix() + 'privacy.html">Privacy policy</a>') +
        '</p>' +
        '<div class="cc-b">' +
          '<button type="button" class="cc-btn no">' + (ko ? '거부' : 'No') + '</button>' +
          '<button type="button" class="cc-btn yes">' + (ko ? '동의' : 'Allow') + '</button>' +
        '</div>' +
      '</div>';
    banner.querySelector(".no").addEventListener("click", function () { decide(DENIED); });
    banner.querySelector(".yes").addEventListener("click", function () { decide(GRANTED); });
    document.body.appendChild(banner);
    banner.querySelector(".yes").focus();
  }



  function start() {
    /* The "Cookie settings" links only mean something when there is advertising to
       consent to. With no publisher ID they would open a dialog about nothing, so
       they stay hidden until there is. */
    var links = document.querySelectorAll("[data-consent-reopen]");
    for (var i = 0; i < links.length; i++) {
      if (!CLIENT) { links[i].hidden = true; continue; }
      links[i].hidden = false;
      links[i].addEventListener("click", function (e) {
        e.preventDefault();
        window.PokerLedgerConsent.reopen();
      });
    }
    var v = read();
    if (v === GRANTED) loadAds();
    else if (v === null) show();
  }

  /* Exposed so the "Cookie settings" footer link can reopen the choice at any time,
     which is what makes the consent withdrawable rather than one-way. */
  window.PokerLedgerConsent = {
    state: read,
    reopen: function () { close(); banner = null; show(); },
    hasAds: function () { return !!CLIENT; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else { start(); }
})();
