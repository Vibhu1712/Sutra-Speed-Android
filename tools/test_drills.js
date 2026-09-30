// Brute-force test of every drill generator: 4000 samples each, answer re-derived from the
// question text itself (not from the generator's own arithmetic).
const fs = require("fs");
eval(fs.readFileSync("app/src/main/assets/drills.js", "utf8"));
const G = global.SutraDrills.gen;
const N = 4000;
let fails = 0;

function nums(s) { return (s.match(/\d+/g) || []).map(Number); }

const checks = {
  nikhilam: d => { const [a, b] = nums(d.q); return String(a * b); },
  yavSquare: d => { const [n] = nums(d.q); return String(n * n); },
  anurupyena: d => { const [a, b] = nums(d.q); return String(a * b); },
  urdhva: d => { const [a, b] = nums(d.q); return String(a * b); },
  ekadhikena: d => { const [n] = nums(d.q); return String(n * n); },
  antyayor: d => { const [a, b] = nums(d.q); return String(a * b); },
  ekanyunena: d => { const [n, k] = nums(d.q); return String(n * k); },
  duplex: d => { const [n] = nums(d.q); return String(n * n); },
  vilokanam: d => { const [n] = nums(d.q); return d.q[0] === "\u221a" ? String(Math.round(Math.sqrt(n))) : String(Math.round(Math.cbrt(n))); },
  kevalaih: d => { const [n, dv] = nums(d.q); return String(n % dv); },
  gunita: d => { const m = d.q.match(/\((\d*)x \+ (\d+)\)\((\d*)x \+ (\d+)\)/); const a = m[1] === "" ? 1 : +m[1], b = +m[2], c = m[3] === "" ? 1 : +m[3], e = +m[4]; return String((a + b) * (c + e)); },
  beejank: d => { const [n] = nums(d.q); let x = n; while (x > 9) x = String(x).split("").reduce((s, c) => s + +c, 0); return String(x); },
  sankalana: d => {
    const [a, b, c1, b2, a2, c2] = nums(d.q.replace(/x \+ y = \?/, ""));
    const det = a * a2 - b * b2, x = (c1 * a2 - b * c2) / det, y = (a * c2 - c1 * b2) / det;
    return String(Math.round(x + y));
  },
  paravartya: d => { const [n, dv] = nums(d.q); return String(Math.floor(n / dv)); },
  vestanam: d => { const [n, dv] = nums(d.q); return n % dv === 0 ? "1" : "0"; },
  sisyate: d => { const [a, b, dv] = nums(d.q); return String((a * b) % dv); },
  dhvajanka: d => { const [n, dv] = nums(d.q); return String(n / dv); },
  purana: d => { const k = +d.q.match(/x \+ 1\/x = (\d+)/)[1]; return /x\u00b3 \+ 1\/x\u00b3/.test(d.q) ? String(k * k * k - 3 * k) : String(k * k - 2); }
};

for (const key of Object.keys(G)) {
  if (!checks[key]) { console.log("NO CHECK for " + key); fails++; continue; }
  let bad = 0, sample = null;
  for (let i = 0; i < N; i++) {
    const d = G[key]();
    const want = checks[key](d);
    if (want !== d.a) { bad++; if (!sample) sample = JSON.stringify(d) + " expected " + want; }
    if (!/^-?\d+$/.test(d.a)) { bad++; if (!sample) sample = "non-integer answer " + JSON.stringify(d); }
  }
  if (bad) { console.log("FAIL " + key + ": " + bad + "/" + N + "  " + sample); fails++; }
  else console.log("ok   " + key + " (" + N + " samples)");
}
// every lesson's gen key must exist
const lessons = JSON.parse(fs.readFileSync("app/src/main/assets/lessons.json", "utf8"));
for (const l of lessons) if (l.gen && !G[l.gen]) { console.log("FAIL lesson " + l.tab + " points at missing generator " + l.gen); fails++; }
console.log(fails ? "\n" + fails + " FAILURE(S)" : "\nall generators correct");
process.exit(fails ? 1 : 0);
