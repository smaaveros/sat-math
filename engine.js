/* SAT Math simulation engine — pure logic, no DOM.
   Used by index.html in the browser and by test-engine.js in Node. */
(function (global) {
  "use strict";

  var DOMAINS = [
    "Algebra",
    "Advanced Math",
    "Problem-Solving and Data Analysis",
    "Geometry and Trigonometry"
  ];
  var DOMAIN_WEIGHTS = [0.35, 0.35, 0.15, 0.15];
  var DIFFS = ["Easy", "Medium", "Hard"];

  // Difficulty composition per 22-question module.
  function specs() {
    return {
      module1: { Easy: 7, Medium: 9, Hard: 6 },   // routing module, full range
      hard:    { Easy: 2, Medium: 8, Hard: 12 },  // upper path, can reach 800
      easy:    { Easy: 12, Medium: 8, Hard: 2 }   // lower path, capped
    };
  }

  function perModuleCount() { return 22; }
  function routingThreshold() { return 14; } // correct-in-module-1 needed for the hard path

  // ---- sampling helpers ----
  function shuffle(arr, rng) {
    rng = rng || Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Split a count across domains by weight, summing exactly to n (largest remainder).
  function domainTargets(n) {
    var exact = DOMAIN_WEIGHTS.map(function (w) { return n * w; });
    var floors = exact.map(Math.floor);
    var used = floors.reduce(function (s, x) { return s + x; }, 0);
    var rem = n - used;
    var order = exact
      .map(function (v, i) { return { i: i, frac: v - Math.floor(v) }; })
      .sort(function (a, b) { return b.frac - a.frac; });
    for (var k = 0; k < rem; k++) floors[order[k].i]++;
    return floors; // aligned to DOMAINS
  }

  // Build one module from the pool given a difficulty spec.
  // `used` is a Set of question uids already used in this run (mutated).
  function buildModule(pool, diffSpec, used, rng) {
    rng = rng || Math.random;
    used = used || new Set();
    var blocks = []; // keep difficulty order Easy -> Medium -> Hard

    DIFFS.forEach(function (diff) {
      var need = diffSpec[diff] || 0;
      if (!need) return;
      var targets = domainTargets(need);
      var picked = [];

      // by (domain, difficulty) cell
      DOMAINS.forEach(function (dom, di) {
        var want = targets[di];
        if (!want) return;
        var cell = pool.filter(function (q) {
          return q.domain === dom && q.difficulty === diff && !used.has(q.uid);
        });
        cell = shuffle(cell, rng).slice(0, want);
        cell.forEach(function (q) { used.add(q.uid); picked.push(q); });
      });

      // fill any shortfall from the same difficulty, any domain
      if (picked.length < need) {
        var rest = pool.filter(function (q) {
          return q.difficulty === diff && !used.has(q.uid);
        });
        rest = shuffle(rest, rng).slice(0, need - picked.length);
        rest.forEach(function (q) { used.add(q.uid); picked.push(q); });
      }

      blocks = blocks.concat(shuffle(picked, rng)); // shuffle domains within the difficulty block
    });

    return blocks;
  }

  function buildSimulation(pool, rng) {
    var s = specs();
    var used = new Set();
    var module1 = buildModule(pool, s.module1, used, rng);
    // pre-build both possible second modules so routing is instant; they share `used`
    return { module1: module1, used: used, specs: s };
  }

  function buildSecondModule(pool, path, used, rng) {
    var s = specs();
    return buildModule(pool, path === "hard" ? s.hard : s.easy, used, rng);
  }

  // ---- routing ----
  function routePath(correctModule1) {
    return correctModule1 >= routingThreshold() ? "hard" : "easy";
  }

  // ---- scoring (200-800) ----
  function scoreSection(path, c1, c2) {
    var per = perModuleCount();
    var threshold = routingThreshold();
    var T = c1 + c2;
    var score;
    if (path === "easy") {
      var maxT = (threshold - 1) + per;          // best reachable on the easy path
      score = 200 + (T / maxT) * 420;            // caps at 620
      if (score > 620) score = 620;
    } else {
      var minT = threshold;
      var hiT = 2 * per;
      score = 530 + ((T - minT) / (hiT - minT)) * 270; // reaches 800
      if (T >= hiT - 2) score = 800;             // 0-2 misses can still be perfect
    }
    if (score < 200) score = 200;
    if (score > 800) score = 800;
    return Math.round(score / 10) * 10;
  }

  // ---- answer checking ----
  function toNum(x) {
    if (x == null) return null;
    var s = String(x).trim().replace(/^\+/, "").replace(/\s+/g, "");
    if (/^-?\d*\.?\d+$/.test(s) && /\d/.test(s)) return parseFloat(s);
    var m = s.match(/^(-?\d*\.?\d+)\/(-?\d*\.?\d+)$/);
    if (m) {
      var den = parseFloat(m[2]);
      if (den !== 0) return parseFloat(m[1]) / den;
    }
    return null;
  }

  function acceptableTokens(correct) {
    return String(correct)
      .replace(/\bor\b/gi, ",")
      .split(",")
      .map(function (t) { return t.trim(); })
      .filter(Boolean);
  }

  function checkAnswer(question, raw) {
    if (raw == null || String(raw).trim() === "") return false;
    if (question.type === "mcq") {
      return String(raw).trim().toUpperCase() ===
             String(question.correct_answer).trim().toUpperCase();
    }
    // spr (fill-in)
    var tokens = acceptableTokens(question.correct_answer);
    var s = String(raw).trim().replace(/\s+/g, "");
    for (var i = 0; i < tokens.length; i++) {
      if (s === tokens[i].replace(/\s+/g, "")) return true;
    }
    var sv = toNum(s);
    if (sv != null) {
      for (var j = 0; j < tokens.length; j++) {
        var tv = toNum(tokens[j]);
        if (tv != null) {
          var tol = Math.max(1e-3, Math.abs(tv) * 1e-3);
          if (Math.abs(tv - sv) <= tol) return true;
        }
      }
    }
    return false;
  }

  var API = {
    DOMAINS: DOMAINS,
    DIFFS: DIFFS,
    specs: specs,
    perModuleCount: perModuleCount,
    routingThreshold: routingThreshold,
    domainTargets: domainTargets,
    shuffle: shuffle,
    buildModule: buildModule,
    buildSimulation: buildSimulation,
    buildSecondModule: buildSecondModule,
    routePath: routePath,
    scoreSection: scoreSection,
    checkAnswer: checkAnswer,
    toNum: toNum,
    acceptableTokens: acceptableTokens
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  global.SATEngine = API;
})(typeof window !== "undefined" ? window : globalThis);
