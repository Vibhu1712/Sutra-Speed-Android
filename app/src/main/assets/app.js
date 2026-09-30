/* Sutra Speed: Vedic Maths
   Screens: home, learn, guided, practice, topics, exams, exam, progress.
   State lives in one object, saved through the Android bridge (or localStorage in a browser). */
(function () {
  "use strict";

  var L = [], Q = [], S = null, V = {}, tick = null;
  var hasBridge = typeof Android !== "undefined" && Android && typeof Android.save === "function";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var main = document.getElementById("main");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c];
    });
  }
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function clock(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ---------------------------------------------------------------- state
  var BLANK = {
    name: "", streak: 0, lastDay: "", days: [],
    mastery: {},            // lesson index -> 0 none, 1 learning, 2 practised, 3 mastered
    drillStats: {},         // lesson index -> {sets, best, lastCorrect, lastOf, lastAvg}
    topicStats: {},         // topic -> {seen, right}
    seenQ: {},              // question id -> 1, so topic practice does not repeat
    pro: false, exams: []   // exam history
  };
  function load() {
    var raw = null;
    try { raw = hasBridge ? Android.load() : localStorage.getItem("sutraSpeed"); } catch (e) {}
    try { S = raw ? JSON.parse(raw) : null; } catch (e) { S = null; }
    if (!S || typeof S !== "object") S = JSON.parse(JSON.stringify(BLANK));
    for (var k in BLANK) if (!(k in S)) S[k] = JSON.parse(JSON.stringify(BLANK[k]));
  }
  function save() {
    var s = JSON.stringify(S);
    try { if (hasBridge) Android.save(s); else localStorage.setItem("sutraSpeed", s); } catch (e) {}
  }
  function countToday() {
    var t = today();
    if (S.lastDay === t) return;
    S.streak = (S.lastDay && daysBetween(S.lastDay, t) === 1) ? S.streak + 1 : 1;
    S.lastDay = t;
    S.days.push(t);
    if (S.days.length > 60) S.days = S.days.slice(-60);
  }
  function setMastery(i, lvl) { S.mastery[i] = Math.max(S.mastery[i] || 0, lvl); }
  var BADGE = [["Not started", ""], ["Learning", "t"], ["Practised", "r"], ["Mastered", "dark"]];
  function badge(i) { var b = BADGE[S.mastery[i] || 0]; return '<span class="pill ' + b[1] + '">' + b[0] + "</span>"; }

  // ---------------------------------------------------------------- shell
  function head(title, sub, pill, back) {
    $("#hTitle").textContent = title;
    $("#hSub").textContent = sub || "";
    var p = $("#hPill");
    p.textContent = pill || "";
    p.classList.toggle("hide", !pill);
    var b = $("#hBack");
    b.classList.toggle("hide", !back);
    b.onclick = back || null;
  }
  function nav(on) {
    var n = document.getElementById("nav");
    n.classList.toggle("hide", on === false);
    Array.prototype.forEach.call(n.children, function (b) { b.classList.toggle("on", b.dataset.go === V.screen); });
  }
  function go(screen, opts) {
    if (tick) { clearInterval(tick); tick = null; }
    V = Object.assign({screen: screen}, opts || {});
    render();
  }
  function render() {
    main.scrollTop = 0;
    ({home: home, learn: learn, guided: guided, practice: practice, topics: topics,
      exams: exams, exam: exam, progress: progress})[V.screen]();
    nav(V.screen !== "exam" || V.exDone);
  }
  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-go]");
    if (b) go(b.dataset.go);
  });

  // ---------------------------------------------------------------- home
  function home() {
    head("Sutra Speed", S.name ? "Namaste, " + S.name : "Vedic maths for SSC and banking", null, null);
    var mastered = Object.keys(S.mastery).filter(function (k) { return S.mastery[k] === 3; }).length;
    var next = 0;
    for (var i = 0; i < L.length; i++) { if ((S.mastery[i] || 0) < 2) { next = i; break; } }
    var wk = [], d = new Date();
    for (var k = 6; k >= 0; k--) {
      var t = new Date(d.getTime() - k * 86400000);
      var key = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
      wk.push('<div><i class="' + (S.days.indexOf(key) >= 0 ? "on" : k === 0 ? "today" : "") + '"></i>' + "MTWTFSS"[(t.getDay() + 6) % 7] + "</div>");
    }
    main.innerHTML =
      '<div class="card"><div class="sp"><div class="row" style="gap:8px;align-items:baseline">' +
        '<span class="big" style="color:var(--rust)">' + S.streak + '</span><span style="font-weight:600">day streak</span></div>' +
        '<span class="sm mut">' + mastered + " of " + L.length + ' mastered</span></div>' +
        '<div class="week" style="margin:10px 0">' + wk.join("") + "</div>" +
        '<div class="sm mut">' + (S.lastDay === today()
          ? "Today counted. Come back tomorrow to keep it going."
          : "Finish one drill set or step-by-step session today to extend your streak.") + "</div></div>" +
      '<div class="card" style="background:var(--rust);color:#fff;border:none">' +
        '<div class="lbl" style="color:#F7E3D4">Continue learning</div>' +
        '<div style="font-size:22px;font-weight:600">Lesson ' + (next + 1) + " \u00b7 " + esc(L[next].tab) + "</div>" +
        '<div class="sm" style="color:#FBEFE6;margin:6px 0 10px 0">' + esc(L[next].meaning) + "</div>" +
        '<button class="b alt" id="goL" style="background:#FFFDF8;color:var(--rustd);border:none">Open lesson</button></div>' +
      '<div class="pair"><button class="b alt" id="goD" style="min-height:104px;display:block;text-align:left;padding:14px">' +
        '<div style="font-size:16px;font-weight:600">Sutra drills</div><div class="sm mut" style="font-weight:400;margin-top:4px">Endless timed questions on the keypad</div></button>' +
        '<button class="b alt" id="goT" style="min-height:104px;display:block;text-align:left;padding:14px">' +
        '<div style="font-size:16px;font-weight:600">Topic practice</div><div class="sm mut" style="font-weight:400;margin-top:4px">' + Q.length + ' checked exam questions</div></button></div>' +
      '<button class="b dark" id="goE" style="text-align:left;padding:14px;min-height:76px">' +
        '<div class="sp"><div><div style="font-size:16px;font-weight:600">Exams</div>' +
        '<div class="sm" style="color:#D9D3C7;font-weight:400">Free 10-question test \u00b7 full papers with Pro</div></div>' +
        '<span class="pill r">' + (S.pro ? "PRO" : "FREE") + "</span></div></button>";
    $("#goL").onclick = function () { go("learn", {lesson: next}); };
    $("#goD").onclick = function () { go("practice"); };
    $("#goT").onclick = function () { go("topics"); };
    $("#goE").onclick = function () { go("exams"); };
  }

  // ---------------------------------------------------------------- learn
  function learn() {
    var i = V.lesson || 0, l = L[i], tier = V.tier || "all";
    head("Learn the sutras", "Lesson " + (i + 1) + " of " + L.length, l.tier === "A" ? "Tier A" : "Tier B", null);
    var shown = L.map(function (x, j) { return {x: x, j: j}; }).filter(function (o) { return tier === "all" || o.x.tier === tier; });
    main.innerHTML =
      '<div class="seg" id="seg">' +
        '<button data-t="all" class="' + (tier === "all" ? "on" : "") + '">All ' + L.length + "</button>" +
        '<button data-t="A" class="' + (tier === "A" ? "on" : "") + '">Tier A \u00b7 core</button>' +
        '<button data-t="B" class="' + (tier === "B" ? "on" : "") + '">Tier B \u00b7 advanced</button></div>' +
      '<div class="chips" id="chips">' + shown.map(function (o) {
        return '<button class="chip ' + (o.j === i ? "on" : "") + '" data-i="' + o.j + '">' + (o.j + 1) + " \u00b7 " + esc(o.x.tab) + "</button>";
      }).join("") + "</div>" +
      '<div class="row" style="margin-bottom:6px">' + badge(i) + '<span class="pill">' + (l.tier === "A" ? "Tier A \u00b7 core" : "Tier B \u00b7 advanced") + "</span></div>" +
      "<h2>" + esc(l.name) + "</h2>" +
      '<p style="font-style:italic;color:var(--rustd)">\u201c' + esc(l.meaning) + "\u201d</p>" +
      '<div class="card"><div class="lbl">Use it for</div>' + esc(l.use) + "</div>" +
      '<div class="card"><h3>Method</h3>' + l.method.map(function (s, n) {
        return '<div class="row" style="flex-wrap:nowrap;align-items:flex-start;margin-bottom:8px">' +
          '<span style="width:26px;height:26px;border-radius:13px;background:var(--teal);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0">' + (n + 1) + "</span>" +
          "<span>" + esc(s) + "</span></div>";
      }).join("") + "</div>" +
      '<div class="anim" id="anim"></div>' +
      '<div class="warn"><div class="lbl" style="color:var(--redink)">Watch out</div>' + esc(l.watch) + "</div>" +
      '<div class="row" style="margin:12px 0"><span class="sm mut">In the exam:</span>' +
        l.topics.map(function (t) { return '<span class="pill">' + esc(t) + "</span>"; }).join("") + "</div>" +
      '<button class="b teal" id="bG">Try it step by step</button>' +
      '<button class="b main" id="bP">Practise this sutra</button>' +
      '<div class="pair"><button class="b alt" id="bPrev">\u2190 Previous</button><button class="b alt" id="bNext">Next \u2192</button></div>';
    drawAnim(i, V.step === undefined ? -1 : V.step);
    $("#seg").onclick = function (e) { var b = e.target.closest("button"); if (b) go("learn", {lesson: i, tier: b.dataset.t}); };
    $("#chips").onclick = function (e) { var b = e.target.closest("button"); if (b) go("learn", {lesson: +b.dataset.i, tier: tier}); };
    $("#bG").onclick = function () { go("guided", {lesson: i, step: 0, typed: ""}); };
    $("#bP").onclick = function () { go("practice", {lesson: i}); };
    $("#bPrev").onclick = function () { go("learn", {lesson: Math.max(0, i - 1), tier: tier}); };
    $("#bNext").onclick = function () { go("learn", {lesson: Math.min(L.length - 1, i + 1), tier: tier}); };
  }

  function drawAnim(i, step) {
    var l = L[i], n = l.anim.length;
    var cs = step >= 0 ? l.anim[step] : null, hi = cs ? cs[0] : [];
    function row(cls, arr, r) {
      return '<div class="line ' + cls + '">' + arr.map(function (k, j) {
        var id = r + ":" + j, vis = k[1] === null || step >= k[1], on = hi.indexOf(id) >= 0;
        return '<span class="tok' + (on ? " on" : "") + (vis ? "" : " off") + '">' + esc(k[0] || " ") + "</span>";
      }).join("") + "</div>";
    }
    var reveal = l.parts.map(function (_, p) { for (var s = 0; s < l.anim.length; s++) if (l.anim[s][2] === p) return s; return -1; });
    $("#anim").innerHTML =
      '<div class="sp"><span class="lbl" style="color:#D9D3C7;margin:0">Watch the trick</span>' +
      '<span class="sm" style="color:#B8B1A3">' + (step >= 0 ? "Step " + (step + 1) + " of " + n : n + " steps") + "</span></div>" +
      '<div style="margin:12px 0 4px 0">' + row("r0", l.r0, "0") + ((l.r1 && l.r1.length) ? row("r1", l.r1, "1") : "") + "</div>" +
      '<div class="cap">' + esc(cs ? cs[1] : "Press Play to watch the trick, or step through it.") + "</div>" +
      '<div class="row" style="justify-content:center"><span class="sm" style="color:#B8B1A3">Answer</span>' +
        l.parts.map(function (t, p) {
          var on = reveal[p] >= 0 && step >= reveal[p], fresh = cs && cs[2] === p;
          return '<span class="part' + (on ? " on" : "") + (fresh ? " fresh" : "") + '">' + esc(on ? t : "?") + "</span>";
        }).join("") +
        (step >= n - 1 ? '<span class="mono" style="font-size:19px;color:#F3C9A8">= ' + esc(l.exA) + "</span>" : "") + "</div>" +
      '<div class="dots">' + l.anim.map(function (_, s) { return '<i class="' + (s <= step ? "on" : "") + '"></i>'; }).join("") + "</div>" +
      '<div class="ctl"><button class="side" id="aB" aria-label="Previous step">\u2039</button>' +
        '<button class="play" id="aP">' + (V.playing ? "Pause" : step >= n - 1 ? "Replay" : "Play") + "</button>" +
        '<button class="side" id="aN" aria-label="Next step">\u203a</button></div>';
    $("#aB").onclick = function () { stopPlay(); V.step = Math.max(-1, step - 1); drawAnim(i, V.step); };
    $("#aN").onclick = function () { stopPlay(); V.step = Math.min(n - 1, step + 1); drawAnim(i, V.step); };
    $("#aP").onclick = function () {
      if (V.playing) { stopPlay(); drawAnim(i, V.step); return; }
      V.step = step >= n - 1 ? 0 : step + 1;
      drawAnim(i, V.step);
      if (V.step < n - 1) {
        V.playing = true;
        tick = setInterval(function () {
          V.step++;
          drawAnim(i, V.step);
          if (V.step >= n - 1) stopPlay(), drawAnim(i, V.step);
        }, 2000);
        drawAnim(i, V.step);
      }
    };
  }
  function stopPlay() { V.playing = false; if (tick) { clearInterval(tick); tick = null; } }

  // ---------------------------------------------------------------- guided
  function guided() {
    var i = V.lesson, l = L[i], st = V.step || 0, done = st >= l.guided.length;
    head("Step by step", esc(l.tab), done ? "Done" : "Step " + (st + 1) + " of " + l.guided.length, function () { go("learn", {lesson: i}); });
    if (done) {
      setMastery(i, 1); countToday(); save();
      main.innerHTML = '<div class="card"><h2>Solved step by step</h2>' +
        "<p>" + esc(l.exQ.replace(/\n/g, ", ")) + " = <b>" + esc(l.exA) + "</b>. You applied every step of " + esc(l.tab) + " yourself.</p>" +
        '<div class="row">' + badge(i) + '<span class="pill r">' + S.streak + "-day streak</span></div></div>" +
        '<button class="b main" id="bD">Now drill it against the clock</button>' +
        '<button class="b ghost" id="bL">Back to the lesson</button>';
      $("#bD").onclick = function () { go("practice", {lesson: i}); };
      $("#bL").onclick = function () { go("learn", {lesson: i}); };
      return;
    }
    var g = l.guided[st], typed = V.typed || "", wrong = V.wrong;
    main.innerHTML =
      '<div class="qbig" style="text-align:left;font-size:24px">' + esc(l.exQ) + "</div>" +
      '<div class="steps">' + l.guided.map(function (_, k) { return '<i class="' + (k < st ? "done" : k === st ? "cur" : "") + '"></i>'; }).join("") + "</div>" +
      l.guided.slice(0, st).map(function (x) {
        return '<div class="sp sm mut" style="margin-bottom:4px"><span>\u2713 ' + esc(x[0]) + '</span><span class="mono" style="color:var(--ink)">' + esc(x[1]) + "</span></div>";
      }).join("") +
      '<div style="font-size:17px;font-weight:600;margin:12px 0 8px 0">' + esc(g[0]) + "</div>" +
      '<div class="box ' + (wrong ? "wrong" : typed ? "" : "empty") + '">' + esc(typed || "Type your answer") + "</div>" +
      (wrong ? '<div class="sp sm" style="color:var(--redink);margin-bottom:8px"><span>Not quite. Try again.</span>' +
        '<button class="b alt" id="bR" style="width:auto;min-height:44px;margin:0;border-color:var(--red);color:var(--redink)">Show answer</button></div>' : "") +
      pad();
    wirePad(function (k) {
      if (k === "del") { V.typed = typed.slice(0, -1); V.wrong = false; return render(); }
      if (k === "go") { if (!typed) return; if (typed === g[1]) return gNext(); V.wrong = true; return render(); }
      var nt = (typed + k).slice(0, 9);
      if (nt === g[1]) return gNext();
      V.typed = nt; V.wrong = false; render();
    });
    if (wrong) $("#bR").onclick = gNext;
    function gNext() { V.step = st + 1; V.typed = ""; V.wrong = false; render(); }
  }

  function pad() {
    return '<div class="pad" id="pad">' + ["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "go"].map(function (k) {
      return '<button data-k="' + k + '" class="' + (k === "del" ? "act" : k === "go" ? "go" : "") + '" aria-label="' +
        (k === "del" ? "Delete" : k === "go" ? "Check answer" : "Digit " + k) + '">' +
        (k === "del" ? "\u232b" : k === "go" ? "Check" : k) + "</button>";
    }).join("") + "</div>";
  }
  function wirePad(fn) {
    var p = $("#pad");
    if (p) p.onclick = function (e) { var b = e.target.closest("button[data-k]"); if (b) fn(b.dataset.k); };
  }

  // ---------------------------------------------------------------- drills
  var SET = 5;
  function practice() {
    var i = V.lesson === undefined ? 0 : V.lesson;
    if (!V.set) {
      V.set = makeSet(i); V.qi = 0; V.typed = ""; V.state = null; V.tries = 0; V.res = []; V.t0 = Date.now(); V.done = false;
    }
    var l = L[i], target = l.tier === "A" ? 30 : 45;
    head("Sutra drills", esc(l.tab), null, null);
    if (V.done) return drillDone(i, target);
    var d = V.set[V.qi], typed = V.typed, st = V.state;
    var secs = st ? V.lastSecs : Math.round((Date.now() - V.t0) / 1000);
    main.innerHTML =
      '<div class="chips" id="chips">' + L.map(function (x, j) {
        return '<button class="chip ' + (j === i ? "on" : "") + '" data-i="' + j + '">' + (j + 1) + " \u00b7 " + esc(x.tab) + "</button>";
      }).join("") + "</div>" +
      '<div class="sp" style="margin-bottom:8px"><span class="sm" style="font-weight:600;color:var(--teal)">Question ' + (V.qi + 1) + " of " + V.set.length + "</span>" +
        '<span class="timer ' + (!st && secs > target ? "low" : "") + '" id="clk">' + clock(secs) + "</span></div>" +
      '<div class="card"><div class="sm mut" style="text-align:center">Target ' + target + " s</div>" +
        '<div class="qbig">' + esc(d.q) + "</div></div>" +
      '<div class="box ' + (st === "right" ? "right" : st === "wrong" ? "wrong" : st === "shown" ? "shown" : typed ? "" : "empty") + '">' +
        esc(st === "shown" ? d.a : (typed || "Type your answer")) + "</div>" +
      (st === "wrong" ? '<div class="sp sm" style="color:var(--redink);margin-bottom:8px"><span>Not quite. Edit and check again.</span>' +
        '<button class="b alt" id="bR" style="width:auto;min-height:44px;margin:0;border-color:var(--red);color:var(--redink)">Show answer</button></div>' : "") +
      (st === "right" || st === "shown"
        ? '<div class="' + (st === "right" ? "note" : "warn") + '">' +
            (st === "right" ? "Correct in " + secs + " s" + (secs <= target ? ", within the target." : ". Aim for " + target + " s.")
                            : "The answer is " + esc(d.a) + ". This one counts as missed.") + "</div>" +
          '<button class="b main" id="bN">' + (V.qi + 1 < V.set.length ? "Next question" : "See results") + "</button>"
        : pad());
    $("#chips").onclick = function (e) { var b = e.target.closest("button"); if (b) go("practice", {lesson: +b.dataset.i}); };
    if (st === "right" || st === "shown") {
      $("#bN").onclick = function () {
        if (V.qi + 1 < V.set.length) { V.qi++; V.typed = ""; V.state = null; V.tries = 0; V.t0 = Date.now(); return render(); }
        finishSet(i, target);
      };
    } else {
      wirePad(function (k) {
        if (k === "del") { V.typed = typed.slice(0, -1); V.state = null; return render(); }
        if (k === "go") { if (!typed) return; return judge(typed, d); }
        var nt = (typed + k).slice(0, 9);
        V.typed = nt;
        if (nt === d.a) return judge(nt, d);
        V.state = null; render();
      });
      if (st === "wrong") $("#bR").onclick = function () {
        V.state = "shown"; V.lastSecs = Math.round((Date.now() - V.t0) / 1000);
        V.res.push({ok: false, secs: V.lastSecs}); render();
      };
      tick = setInterval(function () {
        var c = $("#clk");
        if (!c || V.state) return;
        var s = Math.round((Date.now() - V.t0) / 1000);
        c.textContent = clock(s);
        c.classList.toggle("low", s > target);
      }, 500);
    }
    function judge(t, dd) {
      V.lastSecs = Math.round((Date.now() - V.t0) / 1000);
      if (t === dd.a) { V.state = "right"; V.res.push({ok: V.tries === 0, secs: V.lastSecs}); }
      else { V.state = "wrong"; V.tries++; }
      render();
    }
  }
  function makeSet(i) {
    var l = L[i], out = [];
    for (var k = 0; k < SET; k++) {
      var g = l.gen ? window.SutraDrills.drill(l.gen) : null;
      out.push(g || {q: l.drills[k % l.drills.length][0], a: l.drills[k % l.drills.length][1]});
    }
    return out;
  }
  function finishSet(i, target) {
    var right = V.res.filter(function (r) { return r.ok; }).length;
    var avg = Math.round(V.res.reduce(function (a, r) { return a + r.secs; }, 0) / V.res.length);
    setMastery(i, right === V.res.length && avg <= target ? 3 : 2);
    var st = S.drillStats[i] || {sets: 0, best: 0};
    st.sets++; st.best = Math.max(st.best, right); st.lastCorrect = right; st.lastOf = V.res.length; st.lastAvg = avg;
    S.drillStats[i] = st;
    countToday(); save();
    V.done = true; V.summary = {right: right, of: V.res.length, avg: avg, target: target};
    render();
  }
  function drillDone(i, target) {
    var s = V.summary;
    main.innerHTML = '<div class="card"><h2>Set complete</h2>' +
      '<div style="font-size:17px">' + s.right + " of " + s.of + " correct \u00b7 average " + s.avg + " s</div>" +
      '<div class="row" style="margin:10px 0">' + badge(i) + '<span class="pill r">' + S.streak + "-day streak</span></div>" +
      '<div class="sm mut">' + ((S.mastery[i] || 0) === 3
        ? "Every answer right within " + target + " s. Come back tomorrow to keep it sharp."
        : "Get every answer right with an average under " + target + " s to earn Mastered.") + "</div></div>" +
      '<button class="b main" id="bA">Drill this sutra again</button>' +
      '<button class="b alt" id="bN">Next sutra \u2192</button>' +
      '<button class="b ghost" id="bL">Back to the lesson</button>';
    $("#bA").onclick = function () { go("practice", {lesson: i}); };
    $("#bN").onclick = function () { go("practice", {lesson: (i + 1) % L.length}); };
    $("#bL").onclick = function () { go("learn", {lesson: i}); };
  }

  // ---------------------------------------------------------------- topic practice
  function topicList() {
    var t = [], seen = {};
    Q.forEach(function (q) { if (!seen[q.topic]) { seen[q.topic] = 1; t.push(q.topic); } });
    return t;
  }
  function topics() {
    var t = V.topic || null;
    head("Topic practice", t || "Pick a topic", null, t ? function () { go("topics"); } : null);
    if (!t) {
      main.innerHTML = '<div class="note">' + Q.length + " questions across " + topicList().length +
        " topics. Each answer was checked twice by computer, and every question shows a worked solution.</div>" +
        topicList().map(function (x) {
          var st = S.topicStats[x] || {seen: 0, right: 0};
          var n = Q.filter(function (q) { return q.topic === x; }).length;
          return '<button class="b alt" data-t="' + esc(x) + '" style="text-align:left;padding:12px 14px;min-height:64px">' +
            '<div class="sp"><span><div style="font-weight:600">' + esc(x) + "</div>" +
            '<div class="sm mut" style="font-weight:400">' + n + " questions" +
            (st.seen ? " \u00b7 " + st.right + "/" + st.seen + " right so far" : "") + "</div></span>" +
            '<span class="pill">' + (st.seen ? Math.round(100 * st.right / st.seen) + "%" : "New") + "</span></div></button>";
        }).join("");
      main.onclick = function (e) { var b = e.target.closest("button[data-t]"); if (b) go("topics", {topic: b.dataset.t, qi: null}); };
      return;
    }
    if (!V.pool) {
      var pool = Q.filter(function (q) { return q.topic === t; });
      var fresh = pool.filter(function (q) { return !S.seenQ[q.id]; });
      V.pool = shuffle((fresh.length ? fresh : pool).slice());
      V.qi = 0; V.pick = null;
    }
    var q = V.pool[V.qi];
    main.innerHTML =
      '<div class="sp" style="margin-bottom:8px"><span class="sm" style="font-weight:600;color:var(--teal)">Question ' + (V.qi + 1) + " of " + V.pool.length + "</span>" +
        '<span class="pill">' + esc(q.subtopic) + " \u00b7 level " + q.difficulty + "</span></div>" +
      (q.passage ? '<div class="passage">' + esc(q.passage) + "</div>" : "") +
      '<div class="stem">' + esc(q.stem) + "</div>" +
      q.options.map(function (o, k) {
        var cls = "";
        if (V.pick !== null && V.pick !== undefined) {
          if (k === q.correct_index) cls = "right";
          else if (k === V.pick) cls = "wrong";
          else cls = "dim";
        }
        return '<button class="opt ' + cls + '" data-k="' + k + '"><span class="ltr">' + "ABCD"[k] + "</span><span>" + esc(o) + "</span></button>";
      }).join("") +
      (V.pick !== null && V.pick !== undefined
        ? '<div class="note" style="margin-top:8px"><div class="lbl" style="color:var(--teald)">Solution</div>' + esc(q.explanation) + "</div>" +
          (q.tricks && q.tricks.length ? '<div class="row" style="margin-top:8px"><span class="sm mut">Shortcut:</span>' +
            q.tricks.map(function (x) { return '<span class="pill t">' + esc(x) + "</span>"; }).join("") + "</div>" : "") +
          '<button class="b main" id="bN">' + (V.qi + 1 < V.pool.length ? "Next question" : "Back to topics") + "</button>"
        : "");
    main.onclick = function (e) {
      var o = e.target.closest("button[data-k]");
      if (o && (V.pick === null || V.pick === undefined)) {
        V.pick = +o.dataset.k;
        var stt = S.topicStats[t] || {seen: 0, right: 0};
        stt.seen++; if (V.pick === q.correct_index) stt.right++;
        S.topicStats[t] = stt; S.seenQ[q.id] = 1; countToday(); save();
        render();
      }
    };
    var bn = $("#bN");
    if (bn) bn.onclick = function () {
      if (V.qi + 1 < V.pool.length) { V.qi++; V.pick = null; return render(); }
      go("topics");
    };
  }

  // ---------------------------------------------------------------- exams
  var PRESETS = [
    {id: "free", n: 10, mins: 5, plus: 2, minus: 0.5, name: "Quick test", sub: "Mixed topics, free for everyone", pro: false},
    {id: "t1", n: 25, mins: 15, plus: 2, minus: 0.5, name: "25 questions", sub: "Sectional paper, Tier 1 style", pro: true},
    {id: "t2", n: 30, mins: 30, plus: 3, minus: 1, name: "30 questions", sub: "Mathematical abilities, Tier 2 style", pro: true},
    {id: "ext", n: 50, mins: 30, plus: 2, minus: 0.5, name: "50 questions", sub: "Extended practice paper", pro: true}
  ];
  function exams() {
    head("Exams", "Timed papers with exam marking", S.pro ? "PRO" : null, null);
    var last = S.exams.slice(-3).reverse();
    main.innerHTML =
      '<div class="card" style="background:var(--teall);border:none;color:var(--teald)">' +
        '<div class="sp"><span style="font-size:17px;font-weight:600">Quick test</span><span class="pill" style="background:var(--teal);color:#fff">FREE</span></div>' +
        '<div style="font-size:21px;font-weight:600;margin:6px 0">10 questions \u00b7 5 minutes</div>' +
        '<div class="sm">One timer for the whole paper. +2 for a correct answer, \u22120.5 for a wrong one.</div>' +
        '<button class="b teal" data-p="free">Start free test</button></div>' +
      '<div class="sp" style="margin:14px 0 8px 0"><h2 style="margin:0">Full papers</h2><span class="pill dark">PRO</span></div>' +
      PRESETS.slice(1).map(function (p) {
        return '<button class="b alt" data-p="' + p.id + '" style="text-align:left;padding:14px;min-height:76px">' +
          '<div class="sp"><span style="font-size:17px;font-weight:600">' + p.name + " \u00b7 " + p.mins + " min</span>" +
          '<span class="sm">+' + p.plus + " / \u2212" + p.minus + "</span></div>" +
          '<div class="sm mut" style="font-weight:400;margin-top:4px">' + p.sub + "</div></button>";
      }).join("") +
      (last.length ? '<div class="card" style="margin-top:14px"><div class="lbl">Recent attempts</div>' +
        last.map(function (e) {
          return '<div class="sp sm" style="margin-bottom:6px"><span>' + e.n + " questions \u00b7 " + e.when + "</span>" +
            '<span class="mono">' + e.score + " / " + e.max + "</span></div>";
        }).join("") + "</div>" : "");
    main.onclick = function (e) {
      var b = e.target.closest("button[data-p]");
      if (!b) return;
      var p = PRESETS.filter(function (x) { return x.id === b.dataset.p; })[0];
      if (p.pro && !S.pro) return paywall(p);
      startExam(p);
    };
  }
  function paywall(p) {
    main.innerHTML =
      '<div class="card"><h2>Unlock Sutra Speed Pro</h2>' +
      "<p>Full 25, 30 and 50-question papers with one overall timer, negative marking and a question palette.</p>" +
      "<p>Score by topic and a worked solution for every question.</p>" +
      '<p class="sm mut">One payment, no renewal.</p>' +
      '<div style="font-size:24px;font-weight:600;margin:10px 0">\u20b9199 lifetime</div>' +
      '<button class="b dark" id="bU">Unlock Pro</button>' +
      '<button class="b ghost" id="bC">Not now</button></div>' +
      '<div class="warn">This build has no payment wired in yet. Play Billing needs a published app and a product id, so ' +
      '"Unlock Pro" just switches the flag on for testing.</div>';
    $("#bU").onclick = function () { S.pro = true; save(); startExam(p); };
    $("#bC").onclick = function () { go("exams"); };
  }
  function startExam(p) {
    var pool = shuffle(Q.filter(function (q) { return !q.passage; }).slice()).slice(0, p.n);
    if (pool.length < p.n) pool = shuffle(Q.slice()).slice(0, p.n);
    go("exam", {preset: p, pool: pool, ans: [], exIdx: 0, endAt: Date.now() + p.mins * 60000, exDone: false});
  }
  window.__forceEnd = function () { if (V.endAt) V.endAt = Date.now() - 1000; };
  function exam() {
    var p = V.preset, q = V.pool[V.exIdx];
    if (V.exDone) return examResult();
    var left = Math.max(0, Math.round((V.endAt - Date.now()) / 1000));
    if (left <= 0) return submitExam(true);
    head(p.n + "-question test", "Question " + (V.exIdx + 1) + " of " + p.n, null, null);
    main.innerHTML =
      '<div class="sp" style="margin-bottom:8px"><span class="sm mut">+' + p.plus + " correct \u00b7 \u2212" + p.minus + " wrong \u00b7 0 unanswered</span>" +
        '<span class="timer ' + (left <= 60 ? "low" : "") + '" id="clk">' + clock(left) + "</span></div>" +
      '<div class="grid" id="pal" style="margin-bottom:10px">' + V.pool.map(function (_, k) {
        return '<button class="' + (V.ans[k] !== undefined && V.ans[k] !== null ? "ans " : "") + (k === V.exIdx ? "cur" : "") + '" data-g="' + k + '">' + (k + 1) + "</button>";
      }).join("") + "</div>" +
      '<div class="card"><span class="pill">' + esc(q.topic) + "</span>" +
        (q.passage ? '<div class="passage" style="margin-top:8px">' + esc(q.passage) + "</div>" : "") +
        '<div class="stem">' + esc(q.stem) + "</div></div>" +
      q.options.map(function (o, k) {
        return '<button class="opt ' + (V.ans[V.exIdx] === k ? "sel" : "") + '" data-k="' + k + '"><span class="ltr">' + "ABCD"[k] + "</span><span>" + esc(o) + "</span></button>";
      }).join("") +
      '<div class="pair"><button class="b alt" id="bP">\u2190 Previous</button>' +
        '<button class="b alt" id="bC">Clear</button><button class="b alt" id="bN">Next \u2192</button></div>' +
      '<button class="b dark" id="bS">Submit test</button>';
    $("#pal").onclick = function (e) { var b = e.target.closest("button[data-g]"); if (b) { V.exIdx = +b.dataset.g; render(); } };
    main.querySelectorAll("button[data-k]").forEach(function (b) {
      b.onclick = function () {
        var k = +b.dataset.k;
        V.ans[V.exIdx] = V.ans[V.exIdx] === k ? null : k;
        render();
      };
    });
    $("#bP").onclick = function () { V.exIdx = Math.max(0, V.exIdx - 1); render(); };
    $("#bN").onclick = function () { V.exIdx = Math.min(V.pool.length - 1, V.exIdx + 1); render(); };
    $("#bC").onclick = function () { V.ans[V.exIdx] = null; render(); };
    $("#bS").onclick = function () { submitExam(false); };
    tick = setInterval(function () {
      var s = Math.max(0, Math.round((V.endAt - Date.now()) / 1000));
      var c = $("#clk");
      if (c) { c.textContent = clock(s); c.classList.toggle("low", s <= 60); }
      if (s <= 0) submitExam(true);
    }, 500);
  }
  function submitExam(timeUp) {
    if (tick) { clearInterval(tick); tick = null; }
    V.exDone = true; V.timeUp = timeUp;
    var p = V.preset, right = 0, wrong = 0;
    V.pool.forEach(function (q, k) {
      var a = V.ans[k];
      if (a === undefined || a === null) return;
      if (a === q.correct_index) right++; else wrong++;
    });
    V.score = right * p.plus - wrong * p.minus;
    V.right = right; V.wrong = wrong;
    S.exams.push({n: p.n, score: V.score, max: p.n * p.plus, when: today()});
    if (S.exams.length > 20) S.exams = S.exams.slice(-20);
    V.pool.forEach(function (q, k) {
      var a = V.ans[k];
      if (a === undefined || a === null) return;
      var st = S.topicStats[q.topic] || {seen: 0, right: 0};
      st.seen++; if (a === q.correct_index) st.right++;
      S.topicStats[q.topic] = st;
    });
    countToday(); save();
    render();
  }
  function examResult() {
    var p = V.preset, skip = p.n - V.right - V.wrong;
    var byTopic = {};
    V.pool.forEach(function (q, k) {
      var t = byTopic[q.topic] || (byTopic[q.topic] = {n: 0, r: 0});
      t.n++;
      if (V.ans[k] === q.correct_index) t.r++;
    });
    head("Test complete", V.timeUp ? "Time was up" : "Submitted", null, null);
    main.innerHTML =
      '<div class="card" style="background:var(--ink);color:#fff;border:none">' +
        '<div class="lbl" style="color:#D9D3C7">Your score</div>' +
        '<div class="row" style="align-items:baseline"><span class="big" style="font-size:42px;color:#F3C9A8">' + V.score + "</span>" +
        '<span style="color:#D9D3C7">out of ' + (p.n * p.plus) + "</span></div>" +
        '<div class="stat" style="margin-top:10px">' +
          '<div><div style="font-size:21px;font-weight:600">' + V.right + '</div><div class="sm" style="color:#D9D3C7">Correct</div></div>' +
          '<div><div style="font-size:21px;font-weight:600">' + V.wrong + '</div><div class="sm" style="color:#D9D3C7">Wrong</div></div>' +
          '<div><div style="font-size:21px;font-weight:600">' + skip + '</div><div class="sm" style="color:#D9D3C7">Unanswered</div></div>' +
        "</div></div>" +
      '<div class="card"><div class="lbl">By topic</div>' + Object.keys(byTopic).map(function (t) {
        var x = byTopic[t];
        return '<div class="sp sm" style="margin-bottom:6px"><span>' + esc(t) + "</span><span>" + x.r + " / " + x.n + "</span></div>";
      }).join("") + "</div>" +
      "<h2>Review answers</h2>" +
      V.pool.map(function (q, k) {
        var a = V.ans[k], has = a !== undefined && a !== null, ok = has && a === q.correct_index;
        return '<div class="card"><div class="sp"><span class="sm" style="font-weight:600">Q' + (k + 1) + " \u00b7 " + esc(q.topic) + "</span>" +
          '<span class="pill ' + (ok ? "ok" : has ? "no" : "") + '">' + (ok ? "+" + p.plus : has ? "\u2212" + p.minus : "0") + "</span></div>" +
          '<div class="sm" style="margin:6px 0">' + esc(q.stem) + "</div>" +
          '<div class="sm mut">Your answer: ' + esc(has ? q.options[a] : "Not answered") + " \u00b7 Correct: " + esc(q.options[q.correct_index]) + "</div>" +
          '<div class="sm" style="color:var(--teald);margin-top:6px">' + esc(q.explanation) + "</div></div>";
      }).join("") +
      '<button class="b teal" id="bA">Take another test</button>' +
      '<button class="b ghost" id="bB">Back to exams</button>';
    $("#bA").onclick = function () { startExam(p); };
    $("#bB").onclick = function () { go("exams"); };
  }

  // ---------------------------------------------------------------- progress
  function progress() {
    head("Progress", "Streaks, badges and accuracy", null, null);
    var mastered = 0, started = 0;
    L.forEach(function (_, i) { var m = S.mastery[i] || 0; if (m === 3) mastered++; if (m > 0) started++; });
    var tp = Object.keys(S.topicStats);
    main.innerHTML =
      '<div class="stat" style="margin-bottom:12px">' +
        '<div class="card"><div class="big" style="font-size:26px;color:var(--rust)">' + S.streak + '</div><div class="sm mut">Day streak</div></div>' +
        '<div class="card"><div class="big" style="font-size:26px">' + mastered + '</div><div class="sm mut">Mastered</div></div>' +
        '<div class="card"><div class="big" style="font-size:26px">' + started + '</div><div class="sm mut">Started</div></div></div>' +
      '<div class="note">Learning after a step-by-step session, Practised after a drill set, Mastered when a whole set is right within the target time.</div>' +
      '<h2 style="margin:14px 0 8px 0">Sutras</h2>' +
      L.map(function (l, i) {
        var st = S.drillStats[i];
        return '<button class="b alt" data-i="' + i + '" style="text-align:left;padding:12px 14px;min-height:62px">' +
          '<div class="sp"><span><div style="font-weight:600">' + (i + 1) + " \u00b7 " + esc(l.tab) + "</div>" +
          '<div class="sm mut" style="font-weight:400">' + (st ? "Last set " + st.lastCorrect + "/" + st.lastOf + " \u00b7 average " + st.lastAvg + " s" : "No drills yet") + "</div></span>" +
          badge(i) + "</div></button>";
      }).join("") +
      (tp.length ? '<h2 style="margin:14px 0 8px 0">Topics</h2>' + tp.map(function (t) {
        var x = S.topicStats[t], pct = Math.round(100 * x.right / x.seen);
        return '<div class="card"><div class="sp"><span>' + esc(t) + '</span><span class="sm mut">' + x.right + "/" + x.seen + " \u00b7 " + pct + "%</span></div>" +
          '<div class="bar"><i style="width:' + pct + '%"></i></div></div>';
      }).join("") : "") +
      '<button class="b ghost" id="bX" style="margin-top:14px">Reset all progress</button>';
    main.onclick = function (e) {
      var b = e.target.closest("button[data-i]");
      if (b) go("learn", {lesson: +b.dataset.i});
    };
    $("#bX").onclick = function () {
      if (!confirm("Clear your streak, badges and all statistics? This cannot be undone.")) return;
      S = JSON.parse(JSON.stringify(BLANK));
      save(); go("home");
    };
  }

  // ---------------------------------------------------------------- boot
  window.onAndroidBack = function () {
    if (V.screen === "exam" && !V.exDone) { if (confirm("Leave the test? Your answers will be lost.")) go("exams"); return; }
    if (V.screen === "guided") return go("learn", {lesson: V.lesson});
    if (V.screen === "topics" && V.topic) return go("topics");
    if (V.screen !== "home") return go("home");
    if (hasBridge && typeof Android.finishApp === "function") Android.finishApp();
  };

  Promise.all([
    fetch("lessons.json").then(function (r) { return r.json(); }),
    fetch("questions.json").then(function (r) { return r.json(); })
  ]).then(function (res) {
    L = res[0];
    Q = res[1].questions;
    load();
    go("home");
  }).catch(function (e) {
    main.innerHTML = '<div class="warn">Could not load the app data.<br>' + esc(e) + "</div>";
  });
})();
