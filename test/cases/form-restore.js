// needs: site

/* After leaving the page and pressing Back, Chrome restored whatever text was last in
   each field, including junk that had never been accepted: a buy-in reading "1_000",
   not marked red, while the saved value and the settlement still used 20.00. Found by
   the 2026-11-05 chaos run. autocomplete="off" opts a control out of that restore, so
   every field is rebuilt from the saved game instead. */

[["English", html], ["Korean", koTemplate]].forEach(function(pair){
  var src = pair[1];
  var m = /var el = function\(tag, cls, text\)\{[\s\S]*?\n  \};|function el\(tag, cls, text\)\{[\s\S]*?\n  \}/.exec(src);
  eq(pair[0] + ": element helper found", !!m, true);
  eq(pair[0] + ": generated inputs opt out of restore", !!m && /autocomplete = "off"/.test(m[0]), true);
  var statics = src.match(/<input[^>]*>/g) || [];
  eq(pair[0] + ": static inputs opt out too", statics.length > 0 && statics.every(function(t){ return /autocomplete="off"/.test(t); }), true);
});
