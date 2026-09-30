/* Drives the whole app in a headless DOM: every screen, a full drill set, a guided run,
   topic practice, a timed exam including the time-out path, and progress.
   Any thrown error or wrong score fails the build. */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const A = "app/src/main/assets/";
const lessons = JSON.parse(fs.readFileSync(A + "lessons.json", "utf8"));
const questions = JSON.parse(fs.readFileSync(A + "questions.json", "utf8"));

let fails = 0;
function check(cond, msg) { if (!cond) { console.log("FAIL " + msg); fails++; } else console.log("ok   " + msg); }

const dom = new JSDOM(fs.readFileSync(A + "index.html", "utf8"), {
  runScripts: "outside-only", url: "https://localhost/", pretendToBeVisual: true
});
const w = dom.window, d = w.document;

// storage bridge stub
let store = null;
w.Android = {
  save: s => { store = s; },
  load: () => store || "",
  finishApp: () => { w.__finished = true; }
};
w.fetch = (u) => Promise.resolve({ json: () => Promise.resolve(u.indexOf("lessons") >= 0 ? lessons : questions) });
w.confirm = () => true;
w.alert = () => {};
const errors = [];
w.addEventListener("error", e => errors.push(String(e.error || e.message)));

w.eval(fs.readFileSync(A + "drills.js", "utf8"));
w.eval(fs.readFileSync(A + "app.js", "utf8"));

const $ = s => d.querySelector(s);
const $$ = s => Array.from(d.querySelectorAll(s));
const txt = () => d.getElementById("main").textContent;
function clickNav(name) { $$("#nav button").find(b => b.dataset.go === name).click(); }
function key(k) { const b = $$("#pad button").find(x => x.dataset.k === k); if (!b) throw new Error("no key " + k); b.click(); }
function typeAnswer(a) { for (const c of String(a)) key(c); }

(async function () {
  await new Promise(r => setTimeout(r, 50));

  // ---- home
  check(/day streak/.test(txt()), "home renders with a streak card");
  check(/Continue learning/.test(txt()), "home shows the next lesson");

  // ---- learn: every lesson, every animation step
  clickNav("learn");
  check(/Method/.test(txt()), "learn screen renders");
  for (let i = 0; i < lessons.length; i++) {
    const chip = $$("#chips button").find(b => +b.dataset.i === i);
    if (chip) chip.click();
    else { // tier filter may hide it; go directly
      $$("#seg button")[0].click();
      $$("#chips button").find(b => +b.dataset.i === i).click();
    }
    const l = lessons[i];
    if (!txt().includes(l.name)) { console.log("FAIL lesson " + i + " title missing"); fails++; break; }
    for (let s = 0; s < l.anim.length; s++) $("#aN").click();   // walk the animation
    for (let s = 0; s < l.anim.length; s++) $("#aB").click();
  }
  check(true, "all " + lessons.length + " lessons render and step through their animation");
  $$("#seg button")[1].click(); check(/Tier A/.test(txt()), "tier A filter works");
  $$("#seg button")[2].click(); check(/Tier B/.test(txt()), "tier B filter works");
  $$("#seg button")[0].click();

  // ---- guided run on lesson 1
  $$("#chips button").find(b => +b.dataset.i === 0).click();
  $("#bG").click();
  check(/Step 1 of/.test(d.getElementById("hPill").textContent + txt()) || /How far/.test(txt()), "guided practice opens");
  for (const [, ans] of lessons[0].guided) typeAnswer(ans);
  check(/Solved step by step/.test(txt()), "guided run completes");
  check(/Learning|Practised|Mastered/.test(txt()), "guided run awards a badge");
  const afterGuided = JSON.parse(store);
  check(afterGuided.streak === 1, "streak counted once (got " + afterGuided.streak + ")");
  check(afterGuided.mastery["0"] >= 1, "lesson 0 marked as learning");

  // ---- drill set, all answers correct
  $("#bD").click();
  check(/Question 1 of/.test(txt()), "drill set starts");
  let answered = 0;
  for (let n = 0; n < 12 && !/Set complete/.test(txt()); n++) {
    const state = w.__test_state || null;
    const qEl = $(".qbig");
    if (!qEl) break;
    // read the current question straight from the DOM and solve it independently
    const set = JSON.parse(store);
    const nextBtn = $("#bN");
    if (nextBtn) { nextBtn.click(); continue; }
    const ans = solve(qEl.textContent);
    if (ans === null) { console.log("FAIL could not solve drill: " + qEl.textContent); fails++; break; }
    typeAnswer(ans);
    answered++;
  }
  while (!/Set complete/.test(txt()) && $("#bN")) $("#bN").click();
  check(/Set complete/.test(txt()), "drill set finishes after " + answered + " answers");
  check(/correct .*average/.test(txt()), "drill summary shows score and average time");
  const afterDrill = JSON.parse(store);
  check(afterDrill.drillStats["0"] && afterDrill.drillStats["0"].lastOf === 5, "drill stats saved");
  check(afterDrill.mastery["0"] === 3, "all-correct fast set earns Mastered (got " + afterDrill.mastery["0"] + ")");

  // ---- topic practice
  clickNav("practice");
  check(/Question 1 of/.test(txt()), "practice tab reopens drills");
  clickNav("home");
  $("#goT").click();
  check(/questions across/.test(txt()), "topic list renders");
  $$("button[data-t]")[0].click();
  check($$(".opt").length === 4, "topic question shows four options");
  $$(".opt")[0].click();
  check(/Solution/.test(txt()), "answering reveals the worked solution");
  check($(".opt.right") !== null, "correct option is marked");
  $("#bN").click();
  check(/Question 2 of/.test(txt()), "moves to the next topic question");

  // ---- free exam, scored by hand
  clickNav("exams");
  check(/Quick test/.test(txt()), "exams screen renders");
  $$("button[data-p]").find(b => b.dataset.p === "free").click();
  check(/Question 1 of/.test(d.getElementById("hSub").textContent), "free test starts");
  check($$("#pal button").length === 10, "palette has 10 questions");
  // answer: first 6 correct, next 2 wrong, last 2 skipped
  const pool = w.__pool || null;
  let expectRight = 0, expectWrong = 0;
  for (let k = 0; k < 8; k++) {
    $$("#pal button")[k].click();
    const opts = $$(".opt");
    const correctIdx = correctIndexFromDom();
    const chooseCorrect = k < 6;
    const idx = chooseCorrect ? correctIdx : (correctIdx + 1) % 4;
    opts[idx].click();
    if (chooseCorrect) expectRight++; else expectWrong++;
  }
  $("#bS").click();
  const wantScore = expectRight * 2 - expectWrong * 0.5;
  check(/Your score/.test(txt()), "result screen renders");
  check(txt().includes(String(wantScore)), "score is " + wantScore + " (+2 / -0.5 marking)");
  check(/Unanswered/.test(txt()), "unanswered count shown");
  check(/Review answers/.test(txt()), "answer review shown");

  // ---- exam time-out path
  clickNav("exams");
  $$("button[data-p]").find(b => b.dataset.p === "free").click();
  w.__forceEnd();
  await new Promise(r => setTimeout(r, 700));
  check(/Time was up/.test(d.getElementById("hSub").textContent), "exam auto-submits when the timer runs out");

  // ---- pro paywall
  clickNav("exams");
  $$("button[data-p]").find(b => b.dataset.p === "t1").click();
  check(/Unlock Sutra Speed Pro/.test(txt()), "pro paper shows the paywall");
  check(/199/.test(txt()), "paywall shows the price");
  $("#bU").click();
  check(/Question 1 of/.test(d.getElementById("hSub").textContent), "unlocking starts the paper");
  check($$("#pal button").length === 25, "25-question paper built");
  $("#bS").click();

  // ---- progress
  clickNav("progress");
  check(/Day streak/.test(txt()), "progress renders");
  check(/Mastered/.test(txt()), "progress shows badges");
  check(/Topics/.test(txt()), "progress shows topic accuracy");

  // ---- persistence across a reload
  const saved = store;
  check(JSON.parse(saved).streak >= 1, "state persisted through the bridge");

  // ---- back button
  clickNav("learn");
  w.onAndroidBack();
  check(/day streak/.test(txt()), "back from learn goes home");
  w.onAndroidBack();
  check(w.__finished === true, "back from home closes the app");

  check(errors.length === 0, "no uncaught errors" + (errors.length ? ": " + errors[0] : ""));
  console.log(fails ? "\n" + fails + " FAILURE(S)" : "\nall screens work");
  process.exit(fails ? 1 : 0);

  // -------- helpers
  function correctIndexFromDom() {
    // find the current question in the bank by its stem, then read its key
    const stem = $(".stem").textContent;
    const q = questions.questions.find(x => x.stem === stem);
    if (!q) throw new Error("question not found in bank: " + stem);
    return q.correct_index;
  }
  function solve(q) {
    q = q.replace(/\u00d7/g, "*").replace(/\u00f7/g, "/").replace(/\u2212/g, "-").trim();
    let m;
    if ((m = q.match(/^(\d+) \* (\d+)$/))) return String(+m[1] * +m[2]);
    if ((m = q.match(/^(\d+)\u00b2$/))) return String(+m[1] * +m[1]);
    if ((m = q.match(/^\u221a(\d+)$/))) return String(Math.round(Math.sqrt(+m[1])));
    if ((m = q.match(/^\u221b(\d+)$/))) return String(Math.round(Math.cbrt(+m[1])));
    if ((m = q.match(/Remainder of (\d+) \/ (\d+)/))) return String(+m[1] % +m[2]);
    if ((m = q.match(/Remainder of \((\d+) \* (\d+)\) \/ (\d+)/))) return String((+m[1] * +m[2]) % +m[3]);
    if ((m = q.match(/Digit sum \(one digit\) of (\d+)/))) { let x = +m[1]; while (x > 9) x = String(x).split("").reduce((s, c) => s + +c, 0); return String(x); }
    if ((m = q.match(/Coefficient sum of \((\d*)x \+ (\d+)\)\((\d*)x \+ (\d+)\)/))) {
      const a = m[1] === "" ? 1 : +m[1], b = +m[2], c = m[3] === "" ? 1 : +m[3], e = +m[4];
      return String((a + b) * (c + e));
    }
    if ((m = q.match(/^(\d+) \/ (\d+)\. Quotient\?$/))) return String(Math.floor(+m[1] / +m[2]));
    if ((m = q.match(/^(\d+) \/ (\d+)$/))) return String(+m[1] / +m[2]);
    if ((m = q.match(/Is (\d+) divisible by (\d+)/))) return (+m[1] % +m[2] === 0) ? "1" : "0";
    if ((m = q.match(/x \+ 1\/x = (\d+)[\s\S]*x\u00b3/))) { const k = +m[1]; return String(k * k * k - 3 * k); }
    if ((m = q.match(/x \+ 1\/x = (\d+)[\s\S]*x\u00b2/))) { const k = +m[1]; return String(k * k - 2); }
    if ((m = q.match(/(\d+)x \+ (\d+)y = (\d+)[\s\S]*?(\d+)x \+ (\d+)y = (\d+)/))) {
      const a = +m[1], b = +m[2], c1 = +m[3], b2 = +m[4], a2 = +m[5], c2 = +m[6];
      const det = a * a2 - b * b2;
      return String(Math.round(((c1 * a2 - b * c2) + (a * c2 - c1 * b2)) / det));
    }
    return null;
  }
})();
