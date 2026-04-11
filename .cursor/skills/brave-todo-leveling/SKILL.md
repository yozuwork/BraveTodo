---
name: brave-todo-leveling
description: >-
  Applies Brave Todo experience, level caps, exp bar math, and stat scaling from
  project docs. Use when changing leveling, XP, character stats, or
  useCharacter.js; when the user mentions 經驗、等級、升級、勇者、或 lifetimeCompletions.
---

# Brave Todo：經驗等級規則

## 必讀來源

在修改等級、經驗條、能力值或相關 UI 行為前，**先讀**專案內文件：

- [docs/experience-leveling.md](../../../docs/experience-leveling.md)

該文件為規則的單一事實來源；實作以 `src/hooks/useCharacter.js` 為準。

## 工作方式

1. **對照文件**：確認區間（3 / 5 / 10 任務一級）、門檻（15、40）、等級上限（120）、`expProgress` 算法與 `stats` 公式。
2. **改程式**：更新 `calcLevelInfo`、常數 `TASKS_TO_LV6` / `TASKS_TO_LV10`、`BASE_STATS` 與 `stats` 的 `useMemo`（若規則變更）。
3. **改文件**：使用者若調整規則，**同步更新** `docs/experience-leveling.md`，使文件與程式一致。
4. **邊界**：測試完成數在 0、14→15、39→40、以及 LV120 附近的行為。

## 不要做的事

- 不要另起一套與文件衝突的公式而不更新 `docs/experience-leveling.md`。
- 不要只改 UI 數字而忽略 `calcLevelInfo` 與文件的對應關係。
