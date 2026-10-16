# English Ask-the-Exhibit calibration (v8, 2026-10-16)

**Scope:** English queries only. The Chinese numbers (answer threshold 0.55, holdout 54 questions, P78.9% R88.2% F1 0.833) are a separate scope. Don't compare the two side by side.

## How English queries are matched
The embedding model is BGE-small-zh-v1.5, which was trained mainly on Chinese text. We **do not machine-translate** English questions. Instead, each of the 17 bank entries has about 3 English question variants that we wrote ourselves (`src/data/qaEn.ts`). An English query is matched by:

- cosine similarity to those variants,
- plus 0.04 per English keyword hit (at most +0.08),
- plus 0.02 when the entry is on the current route.

The answer shown is the English translation of the same bank answer. The source excerpts stay in Chinese, with our English translation shown next to them.

## Data
Set: `qa-calib-en-set.json`. All questions were written by the developer. None are real visitor questions.

- **dev:** 17 in-bank paraphrases and 15 out-of-bank questions.
- **holdout:** 17 different in-bank paraphrases and 15 out-of-bank questions, 5 of them same-topic hard negatives.

Runner: `calib_en_run.mjs` (headless Chrome, built app, BGE status `ready`). Raw output: `qa-calib-en-raw.json`.

**Counting rules:**
- TP: an in-bank question answered with the correct entry.
- FP: an answer with the wrong entry, or any answer to an out-of-bank question.
- FN: an in-bank question that was refused.
- TN: an out-of-bank question that was refused.

## Result
The threshold was picked by best F1 on dev: **EN_SCORE_THRESH = 0.82**.

| split | TP | FP | FN | TN | P | R | F1 |
|---|---|---|---|---|---|---|---|
| dev (32; used to pick the threshold, so this is optimistic) | 12 | 2 | 4 | 14 | 85.7% | 75.0% | 0.800 |
| **holdout (32)** | **11** | **2** | **6** | **13** | **84.6%** | **64.7%** | **0.733** |

**Holdout false positives:** "How much is a blue-and-white vase worth?" and "How big is Poyang Lake?". Both are same-topic or near-topic questions that the exhibit answered when it should have refused.

**Honest limits:**
- English recall is clearly lower than Chinese.
- The sample is small, and the developer wrote both the variants and the test questions.
- If you need more reliable answers, ask in Chinese.

**A known failure, reproduced 2026-10-16:** "What is the capital of Japan?" and "What is the capital of France?" both score 0.8475, with the variant "What is Pengli?" as the nearest match. That is above 0.82, so the exhibit wrongly answers with the Pengli entry. BGE-small-zh barely tells apart the English words that differ between these questions. "Who painted the Mona Lisa?" scores 0.747 and is refused.
