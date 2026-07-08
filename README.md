# SAT Math Simulation

A browser-based, adaptive SAT Math practice test. Two modules of 22 questions; Module 1
performance routes the student into a harder or easier Module 2, the way the real digital
SAT works. Score is reported on the 200–800 scale with full solutions. No accounts, no
backend, nothing saved on a server — open it and practice, as many times as you want.

## Files

| File | What it is |
|------|------------|
| `index.html` | The whole app (UI + flow). Open this to run it. |
| `engine.js` | Pure logic: question selection, routing, scoring, answer checking. |
| `sat-math-questions.json` | The 1,753-question bank (the data). |
| `README.md` | This file. |

## Run it locally

Browsers block a page from loading a local JSON file via `file://`, so you need a tiny
local web server (any of these, run from this folder):

```
python3 -m http.server 8000        # then open http://localhost:8000
```

Opening `index.html` by double-clicking will show a load error — that's expected; use the
server above, or just deploy to GitHub Pages.

## Deploy to GitHub Pages

1. Create a GitHub repository.
2. Upload `index.html`, `engine.js`, `sat-math-questions.json`, and this README to the repo root.
3. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**, pick
   `main` and `/ (root)`, Save.
4. Wait ~1 minute. The site goes live at `https://<your-username>.github.io/<repo>/`.

**Before you make it public:** free GitHub Pages requires a *public* repo, which would
republish the College Board questions to anyone with the link. The questions come from
College Board's educator bank and are meant for your own classroom use, not bulk
redistribution. If that's a concern, keep the repo private and use Pages on a paid GitHub
plan, host it somewhere access-controlled, or just run it locally for your class. Worth a
quick check before publishing.

## How it works

**Composition** (each module = 22 questions): domains held at the real SAT weights —
Algebra 35%, Advanced Math 35%, Problem-Solving & Data Analysis 15%, Geometry & Trig 15%.
Difficulty differs by module:

- Module 1 (everyone): Easy 7 / Medium 9 / Hard 6 — used to route.
- Module 2 harder path: Easy 2 / Medium 8 / Hard 12 — can reach 800.
- Module 2 easier path: Easy 12 / Medium 8 / Hard 2 — score capped.

**Routing:** 14 or more correct in Module 1 → harder Module 2; otherwise easier.

**Scoring (200–800):** with `T` = total correct and the path taken,

- Easier path: `200 + (T / 35) × 420`, capped at **620**.
- Harder path: `530 + ((T − 14) / 30) × 270`, reaching **800** (0–2 misses still allow 800).

Rounded to the nearest 10. This mirrors the real test's *behavior* (easy path is capped,
only the hard path reaches 800, a strong Module 1 is required) — it is not College Board's
exact IRT equating, which isn't public.

**Math rendering:** modern questions use MathML + inline SVG, typeset with MathJax (loaded
from a CDN). The 459 older questions render their math and figures as embedded images
(stored inline in the data). Everything else is plain HTML. College Board figures also carry
a screen-reader text transcript (`.sr-only`); the app strips it from the visible question
since the graph itself is shown.

**Practice by topic:** from the home page, students can also drill a single domain (Algebra,
Advanced Math, Problem-Solving & Data Analysis, or Geometry & Trigonometry) — 22 questions
ordered easy to hard, untimed or on a 35-minute clock. Scored by number correct and percentage
(not the 200–800 scale, which only applies to the full mixed adaptive test), with the same full
solution review.

**Infinite practice:** each run randomly samples 44 questions from the 1,753-question bank
by the composition above, so tests stay varied for a long time. State lives in the browser
tab only (a refresh resumes the current test; closing the tab clears it).

## Known limitations (v1)

- The whole question bank (~26 MB, since the older questions embed their math as images)
  loads once at startup. Fine on a decent connection; if it feels slow, the bank can later be
  split into smaller files loaded on demand, or the image-based questions trimmed.
- Correct answers ship inside the JSON, so a determined student could read them from the page
  source. Acceptable for self-practice; not real test security.

---

## Dataset notes

The questions were pulled from the College Board SAT Suite Educator Question Bank. Each
question object:

| field | meaning |
|-------|---------|
| `id` | short College Board question id |
| `uid` | full source id (`external_id` or `ibn`) |
| `source` | `external_id` (modern) or `ibn` (legacy) |
| `domain` | Algebra / Advanced Math / Problem-Solving and Data Analysis / Geometry and Trigonometry |
| `skill` | the specific skill (19 total) |
| `difficulty` | `Easy` / `Medium` / `Hard` |
| `type` | `mcq` (multiple choice) or `spr` (fill-in) |
| `stem` | the question, as HTML |
| `choices` | `[{letter, html}]` for `mcq`; empty for `spr` |
| `correct_answer` | the letter for `mcq`; the value(s) for `spr` (e.g. `"403"`, `"3/2"`, `"7, 8, or 13"`) |
| `rationale` | the official explanation, as HTML |
| `answer_from_rationale` | present on 81 legacy items whose answer was read from the explanation |

Modern questions (1,294) use MathML + inline SVG. Legacy questions (459) keep their math
and figures as embedded images, with the stem built as stimulus + question so nothing is
missing. 81 legacy items had their answer read from the explanation (`answer_from_rationale`).

Counts: 1,753 unique questions. Algebra 581, Advanced Math 499, Problem-Solving & Data
Analysis 389, Geometry & Trig 284. Easy 646, Medium 573, Hard 534. Multiple-choice 1,332,
fill-in 421. Retrieved 2026-06-30.
