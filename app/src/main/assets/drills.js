/* Drill generators: each returns {q, a} with a as a string, so practice never runs out.
   Every generator is tested against brute-force arithmetic in tools/test_drills.js. */
(function (root) {
  "use strict";

  function ri(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function digitSum(n) { n = Math.abs(n); while (n > 9) n = String(n).split("").reduce(function (s, d) { return s + (+d); }, 0); return n; }
  function gcd(a, b) { while (b) { var t = b; b = a % b; a = t; } return a; }

  var G = {
    // 1 Nikhilam: two numbers near a base
    nikhilam: function () {
      var base = pick([10, 100, 100, 100, 1000]);
      var span = base === 10 ? 3 : base === 100 ? 13 : 12;
      var a = base - ri(1, span), b = base - ri(1, span);
      if (Math.random() < 0.3) { a = base + ri(1, span); b = base + ri(1, span); }
      return {q: a + " \u00d7 " + b, a: String(a * b)};
    },
    // 2 Yavadunam: square near a base
    yavSquare: function () {
      var base = pick([100, 100, 1000]);
      var d = ri(1, base === 100 ? 13 : 12) * (Math.random() < 0.5 ? -1 : 1);
      var n = base + d;
      return {q: n + "\u00b2", a: String(n * n)};
    },
    // 3 Anurupyena: working base 50 or 200
    anurupyena: function () {
      var w = pick([50, 50, 200]);
      var s = w === 50 ? 6 : 12;
      var a = w + ri(-s, s), b = w + ri(-s, s);
      if (a === w) a += 1;
      if (b === w) b -= 1;
      return {q: a + " \u00d7 " + b, a: String(a * b)};
    },
    // 4 Urdhva: any two-digit product
    urdhva: function () {
      var a = ri(23, 89), b = ri(23, 89);
      return {q: a + " \u00d7 " + b, a: String(a * b)};
    },
    // 5 Ekadhikena: squares ending in 5
    ekadhikena: function () {
      var t = ri(2, 14), n = t * 10 + 5;
      return {q: n + "\u00b2", a: String(n * n)};
    },
    // 6 Antyayordashake'pi: same leading part, last digits add to 10
    antyayor: function () {
      var t = ri(2, 9), u = ri(1, 9), a = t * 10 + u, b = t * 10 + (10 - u);
      return {q: a + " \u00d7 " + b, a: String(a * b)};
    },
    // 7 Ekanyunena: multiply by 9, 99, 999
    ekanyunena: function () {
      var k = pick([9, 99, 99, 999]);
      var lim = k === 9 ? 9 : k === 99 ? 99 : 999;
      var n = ri(Math.floor(lim / 10) + 1, lim);
      return {q: n + " \u00d7 " + k, a: String(n * k)};
    },
    // 8 Duplex: square of any two-digit number
    duplex: function () {
      var n = ri(21, 98);
      return {q: n + "\u00b2", a: String(n * n)};
    },
    // 9 Vilokanam: root of a perfect square or cube
    vilokanam: function () {
      if (Math.random() < 0.6) { var r = ri(12, 97); return {q: "\u221a" + (r * r), a: String(r)}; }
      var c = ri(11, 89);
      return {q: "\u221b" + (c * c * c), a: String(c)};
    },
    // 10 Kevalaih: remainder of a large number by 7, 11 or 13
    kevalaih: function () {
      var d = pick([7, 11, 13]);
      var n = ri(100000, 999999);
      return {q: "Remainder of " + n + " \u00f7 " + d, a: String(n % d)};
    },
    // 11 Gunitasamuccayah: coefficient sum of a product
    gunita: function () {
      var a = ri(1, 4), b = ri(1, 9), c = ri(1, 4), d = ri(1, 9);
      return {q: "Coefficient sum of (" + (a > 1 ? a : "") + "x + " + b + ")(" + (c > 1 ? c : "") + "x + " + d + ")",
              a: String((a + b) * (c + d))};
    },
    // 12 Beejank: digit sum to one digit
    beejank: function () {
      var n = Math.random() < 0.5 ? ri(1000, 99999) : ri(23, 98) * ri(23, 98);
      return {q: "Digit sum (one digit) of " + n, a: String(digitSum(n))};
    },
    // 13 Sankalana: swapped-coefficient pair, ask x + y
    sankalana: function () {
      var a = ri(11, 49), b = a + ri(2, 20), x = ri(1, 9), y = ri(1, 9);
      var c1 = a * x + b * y, c2 = b * x + a * y;
      return {q: a + "x + " + b + "y = " + c1 + "\n" + b + "x + " + a + "y = " + c2 + "\nx + y = ?", a: String(x + y)};
    },
    // 14 Paravartya: divide by a number just above a base, ask the quotient
    paravartya: function () {
      var d = 100 + ri(2, 19), q = ri(11, 89), r = ri(0, d - 1);
      return {q: (d * q + r) + " \u00f7 " + d + ". Quotient?", a: String(q)};
    },
    // 16 Vestanam: divisibility by 7, 13, 17 or 19
    vestanam: function () {
      var d = pick([7, 13, 17, 19]), k = ri(11, 299);
      return {q: "Is " + (d * k) + " divisible by " + d + "? Type 1 for yes, 0 for no", a: "1"};
    },
    // 17 Shesanyankena: remainder of a product
    sisyate: function () {
      var d = pick([7, 11, 13]), a = ri(21, 99), b = ri(21, 99);
      return {q: "Remainder of (" + a + " \u00d7 " + b + ") \u00f7 " + d, a: String((a * b) % d)};
    },
    // 18 Dhvajanka: straight division by a two-digit number
    dhvajanka: function () {
      var d = ri(23, 89), q = ri(11, 89);
      return {q: (d * q) + " \u00f7 " + d, a: String(q)};
    },
    // 19 Puranapuranabhyam: powers of x + 1/x
    purana: function () {
      var k = ri(3, 9);
      if (Math.random() < 0.5) return {q: "x + 1/x = " + k + "\nx\u00b2 + 1/x\u00b2 = ?", a: String(k * k - 2)};
      return {q: "x + 1/x = " + k + "\nx\u00b3 + 1/x\u00b3 = ?", a: String(k * k * k - 3 * k)};
    }
  };

  /* Returns a fresh drill for a lesson, or null when the lesson has no generator
     (then the app falls back to the lesson's fixed drill list). */
  function drill(genKey) {
    var f = G[genKey];
    return f ? f() : null;
  }

  root.SutraDrills = {gen: G, drill: drill, digitSum: digitSum, gcd: gcd};
})(typeof window !== "undefined" ? window : global);
