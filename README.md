# Fourth Down Lab (第四ダウン研究所) 🏈⚡🇯🇵

**Fourth Down Lab (第四ダウン研究所)** is a standalone static analytical website that tracks genuine NFL fourth-down coaching decisions, computes counterfactual win probabilities (WP) for every available option from identical pre-snap states, evaluates coaching adherence, and tracks real-world execution outcomes without outcome bias.

Styled in a vibrant Japanese anime / shonen manga aesthetic inspired by *Eyeshield 21*, it pairs rigorous analytical data visualization with authentic Japanese football terminology, custom vector chibi mascots, dynamic manga stamps, and dual Japanese/British English typography.

---

## 🎨 Anime Design & Dashboard Polish (Polish-Dashboard Protocol)

- **Authentic Japanese Terminology:**
  - **4th Down Go Attempt:** `ギャンブル` (Gamble - official Japanese term used in NFL broadcasts and manga) / `ギャンブル決行！`
  - **Field Goal:** `フィールドゴール` / `狙撃キック (3-PTS)`
  - **Punt:** `パント` / `陣地挽回 (Defense / Territory)`
  - **Turnover on Downs:** `攻守交代`
  - **Decision Verdicts:**
    - `【 的確 】Reasonable` (Decision within 1.0 pp of optimal)
    - `【 逆張り 】Model Leaned` (Model leaned 1.0–3.0 pp towards another choice)
    - `【 大波乱 】Strongly Preferred` (Model favored alternative by > 3.0 pp)
  - **The 2x2 Outcome Matrix:**
    - `完全勝利 ★ Consistent & Succeeded` (Sound decision, positive outcome)
    - `惜敗の涙 ✕ Consistent & Failed (Unlucky)` (Sound decision, bad bounce/unlucky execution)
    - `奇跡生還 ⚡ Against Model & Succeeded (Bailed Out)` (Suboptimal risk, bailed out by athletic heroics)
    - `大爆死 ☠ Against Model & Failed` (Unrecommended gamble, catastrophic turnover)
- **Vector Anime Mascots & Stamps (`src/components/AnimeMascots.tsx`):**
  - **ブリッツ君 (Blitz-kun):** Fiery chibi quarterback analyst mascot with lightning aura, reflective visor sheen, and anime football.
  - **審判ゼブラ先生 (Referee Sensei):** Chibi anime referee throwing penalty flag with shock sweatdrops.
  - **Hanko Stamps (判子):** Vector stamps (`必勝`, `決行`, `的確`, `波乱`, `鉄壁`, `全撃`, `審議`, `伯仲`).
- **Dashboard Polish Standards:**
  - Maximum 4 font sizes, fluid responsive typography, and strict spacing scale.
  - `font-variant-numeric: tabular-nums` across all statistical columns and probabilities for vertical alignment.
  - Electric manga cyan accessibility focus ring (`:focus-visible: 3px solid #74d4ff`).
  - **Containment & Touch Parity:** Verified 0px horizontal scroll (`scrollWidth <= innerWidth`) across `320px`, `390px`, `768px`, `1280px`, and `1920px`. Minimum 44px hit areas on touch viewports. Segmented tier buttons arranged in a responsive mobile grid (`grid-cols-2 sm:grid-cols-4`) to eliminate the "cut-off filter" overflow anti-pattern.

---

## 🌟 The Core Principle: Decision Separate from Result

Judging a coaching decision by whether the subsequent play succeeded or failed introduces **outcome bias**. A sound, mathematically optimal call can fail due to execution errors or bad bounces, while an irrational call can succeed through individual athletic brilliance.

Every decision in Fourth Down Lab is isolated into two independent blocks:
1. **Before the Snap:** Pre-play win probability (WP) of each legally and practically viable option (Go for it, Field Goal, Punt), calculated from the identical situation and model, alongside the model's preferred option(s).
2. **What Happened:** The play the team actually executed, followed by the real-world outcome and realised change in win probability (WPA).

Plays are classified into an honest 2×2 matrix:
- **Consistent & Succeeded**
- **Consistent & Failed (Unlucky)**
- **Against Model & Succeeded (Bailed Out)**
- **Against Model & Failed**

*We never describe a failed good call as a "mistake" or a successful bad call as "smart".*

---

## 📐 The Comparison Metric: Win Probability (Not EPA)

Options are ranked strictly by the **expected win probability (WP)** of the possessing team from a common pre-snap baseline. Differences are reported in **percentage points of win probability (pp)**.

We do **not** use Expected Points Added (EPA) to rank decisions: expected points and win probability frequently diverge, especially late in games or when defending or chasing leads.

---

## ⚙️ Model Engine & Option Status Rules

We implement **Route A**: the Python port of Ben Baldwin's official `nfl4th` and `nflfastR` model suite via `sportsdataverse` (0.1.4):
- **Go for it:** Evaluated over a 76-class multinomial XGBoost distribution of yards gained (`fd_model.ubj`), including turnover-on-downs possession flips and automatic PAT vs 2-point decision logic (`two_pt_model.ubj`) on touchdowns.
- **Field Goal:** Evaluated via an XGBoost make-probability model (`fg_model.ubj`) parameterized by attempt distance, kicking era, and roof configuration (indoor, dome, outdoors).
- **Punt:** Evaluated across the empirical landing distribution (`punt_data.parquet`), accounting for net yardage, touchbacks, return touchdowns, and muffed catches.

### Option Statuses:
- **AVAILABLE:** A standard legal choice supported by the model.
- **UNMODELLED:** Outside the model's empirical distribution support. Inside the opponent's 31-yard line (`yardline_100 < 31`), punting is unmodelled because NFL teams do not punt in this territory (0 punts occurred inside the 31 across the entire 2026 season). In this territory, the complete feasible set consists of Go vs Field Goal.
- **UNSUPPORTED:** A clock or overtime context not supported by the model (e.g. negative game seconds).
- **MODEL FAILURE:** An expected option is missing; fails the build pipeline immediately.

### Tolerance & Boundaries:
- **`TOSS_UP_PP = 1.0 pp`:** Any option within 1.0 pp of the best option is included in the preferred set.
- **Cost Boundaries (evaluated strictly on unrounded values):**
  - **`cost <= 1.0 pp`:** *Reasonable* (within model preferred set)
  - **`1.0 < cost <= 3.0 pp`:** *Model leaned the other way*
  - **`cost > 3.0 pp`:** *Model strongly preferred another option*
  - Decisions within 0.05 pp of a boundary show exact two-decimal values in a tooltip for full explainability.

---

## 📁 Repository Structure

```
├── .github/workflows/
│   └── refresh_data.yml        # Prepared (disabled) scheduled GitHub Actions workflow
├── pipeline/
│   ├── model_engine.py         # Pure single-play decision engine and verdict classifier
│   ├── build_data.py           # Production batch pipeline generating static JSON
│   └── tests/
│       └── test_pipeline.py    # Pytest suite (validation gates, option rules, boundaries)
├── public/
│   └── data/
│       ├── decisions.json      # All 1,718 executed 4th-down decisions
│       ├── teams_summary.json  # Team adherence, genuine counts, WP given up
│       ├── games_summary.json  # Matchups and chronological cost strips
│       ├── meta.json           # Timestamps, counts, thresholds, and licences
│       └── audit_cancelled_snaps.json # 148 cancelled snaps (penalties) audit
├── src/
│   ├── components/             # Header, DecisionCard
│   ├── pages/                  # FeedPage, TeamsPage, GamesPage, MethodPage
│   ├── tests/                  # Frontend unit tests (Node test runner)
│   ├── types/                  # TypeScript interfaces
│   └── utils/                  # Team logos, formatting, contrast helpers
└── dist/                       # Static production build
```

---

## 🚀 How to Run and Refresh Data

### 1. Requirements
- Node.js 20+ (with npm)
- Python 3.10+ (with `polars`, `pandas`, `pyarrow`, `sportsdataverse`, `xgboost`, `pytest`)

### 2. Run the Data Pipeline
```bash
# Refreshes all JSON datasets from raw play-by-play parquet
python pipeline/build_data.py
```

### 3. Run Pipeline Unit Tests
```bash
python -m pytest pipeline/tests/test_pipeline.py -v
```

### 4. Run Frontend Unit Tests
```bash
npm test
```

### 5. Start Development Server
```bash
npm run dev
```

### 6. Build for Production
```bash
npm run build
```

---

## 🔍 Validation Summary

1. **2020 NFC Championship Benchmark:**
   - GB vs TB, Q4 2:09, 4th & 8 on TB 8 (`yardline_100 = 8`), trailing by 8.
   - `go_wp`: 0.122 (published ~0.137, -1.5 pp)
   - `fg_wp`: 0.114 (published ~0.100, +1.4 pp)
   - `wp_succeed`: 0.338 (published 0.345, -0.7 pp)
   - `wp_fail`: 0.045 (published 0.036, +0.9 pp)
   - `fg_make_prob`: 0.982 (published 0.976, +0.6 pp)
   - All win probabilities within the 1.5 pp validation gate tolerance.
2. **Mathematical & Physical Sanity Checks:**
   - Probabilities strictly in $[0, 1]$: **0 violations**.
   - Field goal make probability monotonic with distance across all roof types and eras: **0 violations**.
   - Conversion probability monotonic with distance to gain: **0 violations**.
   - Go WP monotonic with distance to gain in identical situations: **0 violations**.
3. **Audit Status:**
   - Validated against one published example only, supplemented by comprehensive mathematical and physical property checks.

---

## ⚖️ Licences & Credits

- **nflverse Play-by-Play Data:** Licensed under **CC-BY 4.0** (Creative Commons Attribution 4.0 International). Data provided by the nflverse project ([github.com/nflverse](https://github.com/nflverse)).
- **nfl4th Model Surface:** Licensed under **MIT**. Created by Ben Baldwin ([github.com/nflverse/nfl4th](https://github.com/nflverse/nfl4th)).
- **sportsdataverse Python Package:** Licensed under **MIT**. Created by Saiem Gilani ([py.sportsdataverse.org](https://py.sportsdataverse.org)).
- **Dependencies:** React, Vite, Tailwind CSS v4, Lucide Icons, Polars, Pandas, XGBoost, PyArrow all licensed under permissive open-source licences (MIT, Apache 2.0, BSD).
- **Cost:** 100% Free (£0.00 / $0.00). No paid APIs, no hosted database, zero cloud infrastructure cost.

---

## ⚠️ Unverified Items & Known Limits

1. **Unverified Items:**
   - We could not verify intra-game update latency of nflverse GitHub release parquets during active Sunday windows; hence the design as a historical static log with clear "Data as of" timestamps.
   - We could not verify whether GitHub Actions minutes on private repositories are desired by the user; the scheduled workflow is provided in `.github/workflows/refresh_data.yml` but left disabled.
2. **Known Model Limits:**
   - Personnel, punter leg strength, returner capability, and real-time injuries are not modelled.
   - Micro-weather (wind gusts, freezing temperatures) is not modelled.
   - Return penalties and return touchdowns from blocked kicks are not covered.
   - Planned fake punts or kicks cannot be distinguished from regular offensive plays in play-by-play data.

---

## 📡 Live Mode Architecture Note

To extend Fourth Down Lab into a live in-game tracker in a future phase:
1. `model_engine.evaluate_decision_row` is already structured as a pure, single-play function taking one situation dictionary and returning option WPs in ~5 ms.
2. A live ingest worker would poll an active game data source (such as ESPN Scoreboard or live NFL API feeds) on a 15-second interval.
3. The live payload must provide: `posteam`, `defteam`, `down`, `ydstogo`, `yardline_100`, `qtr`, `quarter_seconds_remaining`, `score_differential`, `timeouts_remaining`, `spread_line`, `total_line`, and `roof`.
4. The worker would compute live counterfactuals for active 4th-down situations and broadcast via lightweight SSE or static JSON polling.
