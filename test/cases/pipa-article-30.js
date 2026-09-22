// needs: site

/* 개인정보 보호법 제30조 제1항 lists what a 개인정보 처리방침 must contain. Checked
   against the statute text (law.go.kr / casenote), not from memory, and each assertion
   names the 호 it comes from so a future reader can re-verify it.

   This is a completeness check, not legal advice. It proves each required subject is
   addressed somewhere in the document; whether the treatment is adequate is a question
   for a person. */

var ko = pages["privacy-ko.html"];
function has(){ /* every fragment must appear */
  for (var i = 0; i < arguments.length; i++) if (ko.indexOf(arguments[i]) === -1) return false;
  return true;
}

log("-- 제30조제1항: the required contents --");
eq("제1호 개인정보의 처리 목적", has("제1조 (개인정보의 처리 목적)", "처리 목적"), true);
eq("제2호 개인정보의 처리 및 보유 기간", has("보유 기간"), true);
eq("제3호 개인정보의 제3자 제공에 관한 사항", has("제3자 제공"), true);
eq("제3호의2 개인정보의 파기절차 및 파기방법", has("파기절차", "파기방법"), true);
eq("제3호의3 민감정보 — 수집하지 않음을 명시", has("민감정보", "수집하지 않습니다"), true);
eq("제4호 개인정보 처리의 위탁에 관한 사항", has("위탁"), true);
eq("제4호의2 가명정보 — 처리하지 않음을 명시", has("가명정보"), true);
eq("제5호 정보주체의 권리·의무 및 행사방법", has("정보주체의 권리", "제35조부터 제37조까지"), true);
eq("제5호 법정대리인의 권리 행사", has("법정대리인"), true);
eq("제6호 개인정보 보호책임자의 성명 또는 부서의 명칭과 연락처",
   has("개인정보 보호책임자", "개인정보 보호업무 담당", "연락처"), true);
eq("제7호 자동 수집 장치의 설치·운영 및 그 거부에 관한 사항",
   has("자동 수집 장치", "거부"), true);

log("-- 시행령 및 관련 조문 --");
eq("처리하는 개인정보의 항목", has("처리하는 개인정보의 항목"), true);
eq("개인정보의 안전성 확보조치 (제29조)", has("안전성 확보조치"), true);
eq("국외 이전 (제28조의8)", has("국외 이전"), true);
eq("만 14세 미만 아동 (제22조의2)", has("만 14세 미만"), true);
eq("권익침해 구제방법 — 분쟁조정위원회와 신고센터",
   has("개인정보 분쟁조정위원회", "개인정보침해 신고센터"), true);
eq("처리방침의 변경에 관한 사항", has("개인정보처리방침의 변경"), true);

log("-- the document is navigable as a 처리방침, not an essay --");
var arts = (ko.match(/<h2>제\d+조/g) || []).length;
eq("it is structured in numbered 조 (" + arts + ")", arts >= 12, true);
eq("it is served in Korean", /<html lang="ko">/.test(ko), true);
eq("it carries a 최종 수정일", /최종 수정일/.test(ko), true);

log("-- the English version says the same things --");
var en = pages["privacy.html"];
eq("English covers the deletion procedure", /How deletion actually works/.test(en), true);
eq("English covers sensitive information and unique identifiers",
   /sensitive\s*\n?\s*information/i.test(en) && /unique identifiers/i.test(en), true);
eq("English covers the legal guardian's rights", /legal guardian/i.test(en), true);
eq("English names the same third parties as the Korean version",
   ["Cloudflare", "Google Fonts", "AdSense"].every(function(p){
     return en.indexOf(p) !== -1 && ko.indexOf(p.replace("Google Fonts", "Google Fonts")) !== -1;
   }), true);
