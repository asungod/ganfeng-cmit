# Extension proof: route 4, 西山万寿宫庙会 (v8, 2026-10-16)

## Facts used, all fetched with curl and checked word for word on 2026-10-16
1. **ihchina project page** (https://www.ihchina.cn/project_details/15133.html)
   - Project identifiers: 庙会（西山万寿宫庙会）; project no. 991; code Ⅹ-84; 2011, 3rd batch; category 民俗 (folk custom); nominated by 江西省新建县.
   - Quoted lines: 「八月（号净月）初一晨旦开朝……夜晚民间戏班演出」 and 「每年七月二十至九月初一……“香期”」.
2. **State Council notice listing the 3rd batch** (Ministry of Culture and Tourism disclosure page, https://zwgk.mct.gov.cn/zfxxgkml/fwzwhyc/202012/t20201206_916812.html)
   - Lists 991 Ⅹ-84 庙会（…西山万寿宫庙会…） under 江西省新建县.

## What is sourced and what is convention
- **Grid:** activity {开朝进香 (opening-court incense procession), 戏班演出 (opera troupe performance)} × time slot {晨旦 dawn, 白日 daytime, 夜晚 night}.
- **Sourced anchors (2):**
  - 开朝 × 晨旦 = 合 (compatible)
  - 戏班 × 夜晚 = 合 (compatible)
- **Design convention (4, not historical fact):**
  - 开朝 × 夜晚 = 冲 (conflict), re-locked to 晨旦
  - 开朝 × 白日 = 勉 (borderline)
  - 戏班 × 晨旦 = 勉 (borderline)
  - 戏班 × 白日 = 勉 (borderline)
- The rule status is `design`. The UI says outright that the original text does not say there were no daytime performances.
- **No 3D scene.** The header is stamped "模板演示 · 无三维场景" (template demo · no 3D scene).
- **No new Ask-the-Exhibit entries.** This keeps the ZH and EN calibration numbers valid.

## Measured effort (commit a10e0cc, `git show --stat`)
- **15 files changed, +216 / −6 lines.**
- **New files:**
  - `src/data/wanshou.ts` (28 lines)
  - `src/exhibits/wanshou.ts` (76 lines)
- **Edited files:**
  - `evidenceRules.ts` (+24)
  - `sources.ts` (+23)
  - `en-exact.json` / `en-src.json` / `gloss.ts` (EN copy, +40)
  - `types.ts`, `router.ts`, `main.ts` (hotkey 4), `hall.ts` (door), `i18n.ts`, `corpus.ts`, `engineHud.ts`, `styles.css`
- **Tests:** E2E 4 new cases (`oracle.ts` +3 lines), all passing.
- **Time:**
  - Coding: box clock 12:12:52 → commit at 12:16:16 CST, about 3.5 minutes of AI-assisted coding.
  - **Not included:** source research (curl and verification) before that, and the EN wording fixes plus E2E runs afterwards, about 20 more minutes.
  - These times are for an AI coding assistant, not a human developer.

## Reused without change
`table.ts` (`lookup` / `fallbackRow`), the `evidence.ts` audit panel and "Try it", the lookup log, and the DOM EN translator.
