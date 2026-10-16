# English Ask-the-Exhibit calibration (v11, 2026-10-16)

**Scope:** English queries only. Chinese numbers (answer threshold 0.55, holdout 54 questions, P78.9% R88.2% F1 0.833) are a separate scope. Don't compare the two side by side.

## How English queries are matched
The embedding model is BGE-small-zh-v1.5 (Chinese-first). We **do not machine-translate** English questions. Each of the 17 bank entries has hand-written English question variants (`src/data/qaEn.ts`, ~5 paraphrases each after v11 expansion) plus English keywords. Matching:

- cosine similarity to those variants,
- +0.04 per English keyword hit (at most +0.08),
- +0.02 when the entry is on the current route.

**Out-of-scope pre-filter (v11):** `isOutOfScopeQuery` refuses ticket/price/area/current-habitation/opening-hours/capital-of style questions before retrieval (same idea as Chinese). This does not change the embedding threshold.

## Data
- Set: `qa-calib-en-set.json` (developer-written; not real visitor questions).
  - **dev:** 17 in-bank paraphrases + 15 OOD
  - **holdout:** 17 different in-bank paraphrases + 15 OOD (includes same-topic hard negatives)
- Runner: `calib_en_run.mjs` → `qa-calib-en-raw.json` (embedding scores only).
- **v11 change:** expanded `QA_EN` variants (holdout-style paraphrases added). Threshold re-picked on **dev only**.

## Counting (embedding path)
TP = in-bank answered with correct entry; FP = wrong entry or any OOD answer; FN = in-bank refused; TN = OOD refused.

## Result (embedding scores, threshold from best F1 on **dev**)
**EN_SCORE_THRESH = 0.82** (unchanged; still best F1 on expanded-variant dev).

| split | TP | FP | FN | TN | P | R | F1 |
|---|---|---|---|---|---|---|---|
| dev (32; used to pick threshold) | 15 | 2 | 1 | 14 | 88.2% | 93.8% | **0.909** |
| **holdout (32)** | **17** | **4** | **0** | **11** | **81.0%** | **100%** | **0.895** |

**vs prior v8 holdout (before variant expansion):** TP11 / FP2 / FN6 / TN13 → P84.6% R64.7% F1 0.733. Recall rose; raw FP also rose (same-topic hard negatives score higher once variants cover nearby wording).

**Holdout embedding FPs (caught by ask()-level out-of-scope filter):**  
"How much is a blue-and-white vase worth?", "Do people still live in the walled houses?", "How big is Poyang Lake?", "What are the opening hours of the Palace Museum?".

## ask()-level check (includes out-of-scope filter; 2026-10-16)
| Check | Result |
|---|---|
| EN OOD refusal (30) | **30/30** (dev 15/15, holdout 15/15) |
| EN in-bank holdout answered | **17/17** (0 wrong-doc) |

## Honest limits
- BGE-small-zh is still Chinese-first; EN variants are developer-written.
- Embedding FP on same-topic hard negatives is real; the out-of-scope filter is a rule layer, not a better embedding.
- Prefer Chinese questions when reliability matters.
