import { useState } from "react";
import Button from "@mui/material/Button";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { calcCompletionsForLevel, getHighestConfiguredLevel } from "../../utils/levelingRules";

export default function LevelResetCard({ currentLevel, levelingRules, onResetLevel }) {
  const maxLevel = getHighestConfiguredLevel(levelingRules);
  const [targetLevel, setTargetLevel] = useState(1);
  const [confirmed, setConfirmed] = useState(false);

  const handleInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setTargetLevel("");
      return;
    }
    setTargetLevel(Math.min(maxLevel, Math.max(1, val)));
    setConfirmed(false);
  };

  const handleReset = () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    const completions = calcCompletionsForLevel(
      Number(targetLevel) || 1,
      levelingRules,
    );
    onResetLevel(completions);
    setConfirmed(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-5 py-5 flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-black m-0">等級重置</p>
        <p className="text-xs text-gray-400 mt-0.5 m-0">
          將目前等級重置到指定等級（目前 LV{currentLevel}）
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 shrink-0">重置到</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-mono text-gray-500">LV</span>
          <input
            type="number"
            min={1}
            max={maxLevel}
            value={targetLevel}
            onChange={handleInput}
            onFocus={() => setConfirmed(false)}
            className="w-20 text-sm font-bold text-black bg-stone-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors text-center"
          />
        </div>
        <span className="text-xs text-gray-400">（1 ~ {maxLevel}）</span>
      </div>

      {confirmed && (
        <p className="text-xs text-red-500 m-0">
          確定要重置到 LV{targetLevel} 嗎？再按一次確認。
        </p>
      )}

      <Button
        variant="contained"
        startIcon={<RestartAltIcon />}
        onClick={handleReset}
        sx={{
          alignSelf: "flex-start",
          bgcolor: confirmed ? "#ef4444" : "#6b7280",
          borderRadius: 99,
          fontWeight: 600,
          fontSize: "0.8rem",
          textTransform: "none",
          px: 2.5,
          "&:hover": { bgcolor: confirmed ? "#dc2626" : "#4b5563" },
        }}
      >
        {confirmed ? "確認重置" : "重置等級"}
      </Button>
    </div>
  );
}
