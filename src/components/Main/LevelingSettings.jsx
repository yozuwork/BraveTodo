export default function LevelingSettings({ rules, onUpdateExpPerLevel }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-bold text-black m-0">升級設定</h2>
        <span className="text-xs text-gray-400">設定每個等級區間升一級所需的經驗值</span>
      </div>
      <div className="flex flex-col gap-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="bg-white rounded-xl px-5 py-4 flex items-center gap-5 border border-gray-100 hover:border-gray-200 transition-colors"
          >
            <div className="shrink-0 text-xs font-mono text-gray-400 w-28 text-center">
              LV{rule.minLevel} — LV{rule.maxLevel}
            </div>
            <div className="flex-1 flex items-center gap-3">
              <span className="text-sm text-gray-500">每升一級需要</span>
              <input
                type="number"
                min="1"
                value={rule.expPerLevel}
                onChange={(e) => onUpdateExpPerLevel(rule.id, e.target.value)}
                className="w-20 text-sm font-semibold text-black bg-stone-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors text-center"
              />
              <span className="text-sm text-gray-500">經驗</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
