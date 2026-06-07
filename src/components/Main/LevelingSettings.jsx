import { useEffect, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'

const makeDraftValues = (rules) =>
  Object.fromEntries(
    rules.map((rule) => [
      rule.id,
      {
        minLevel: String(rule.minLevel),
        maxLevel: String(rule.maxLevel),
        expPerLevel: String(rule.expPerLevel),
      },
    ])
  )

export default function LevelingSettings({
  rules,
  onUpdateExpPerLevel,
  onUpdateLevelRange,
  onAddLevelingRule,
  onRemoveLevelingRule,
}) {
  const [draftValues, setDraftValues] = useState(() =>
    makeDraftValues(rules)
  )

  useEffect(() => {
    setDraftValues(makeDraftValues(rules))
  }, [rules])

  const handleChange = (id, field, value) => {
    if (!/^\d*$/.test(value)) return

    setDraftValues((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }))

    if (value !== '') {
      if (field === 'expPerLevel') {
        onUpdateExpPerLevel(id, value)
      } else {
        onUpdateLevelRange(id, field, value)
      }
    }
  }

  const handleBlur = (id, field) => {
    if (draftValues[id]?.[field] !== '') return

    setDraftValues((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: '1',
      },
    }))

    if (field === 'expPerLevel') {
      onUpdateExpPerLevel(id, '1')
    } else {
      onUpdateLevelRange(id, field, '1')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-bold text-black m-0">升級設定</h2>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-gray-400 sm:inline">未設定的等級範圍預設每級 1 經驗</span>
          <button
            type="button"
            onClick={onAddLevelingRule}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600"
            title="新增升級階段"
            aria-label="新增升級階段"
          >
            <AddIcon sx={{ fontSize: 18 }} />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="bg-white rounded-xl px-5 py-4 flex flex-col gap-4 border border-gray-100 hover:border-gray-200 transition-colors sm:flex-row sm:items-center sm:gap-5"
          >
            <div className="shrink-0 flex items-center gap-2 text-xs font-mono text-gray-400 sm:w-44">
              <span>LV</span>
              <input
                type="text"
                inputMode="numeric"
                value={draftValues[rule.id]?.minLevel ?? String(rule.minLevel)}
                onChange={(e) => handleChange(rule.id, 'minLevel', e.target.value)}
                onBlur={() => handleBlur(rule.id, 'minLevel')}
                className="w-14 text-sm font-semibold text-black bg-stone-50 border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors text-center"
              />
              <span>—</span>
              <span>LV</span>
              <input
                type="text"
                inputMode="numeric"
                value={draftValues[rule.id]?.maxLevel ?? String(rule.maxLevel)}
                onChange={(e) => handleChange(rule.id, 'maxLevel', e.target.value)}
                onBlur={() => handleBlur(rule.id, 'maxLevel')}
                className="w-14 text-sm font-semibold text-black bg-stone-50 border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors text-center"
              />
            </div>
            <div className="flex-1 flex items-center gap-3">
              <span className="text-sm text-gray-500">每升一級需要</span>
              <input
                type="text"
                inputMode="numeric"
                value={draftValues[rule.id]?.expPerLevel ?? String(rule.expPerLevel)}
                onChange={(e) => handleChange(rule.id, 'expPerLevel', e.target.value)}
                onBlur={() => handleBlur(rule.id, 'expPerLevel')}
                className="w-20 text-sm font-semibold text-black bg-stone-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors text-center"
              />
              <span className="text-sm text-gray-500">經驗</span>
            </div>
            <button
              type="button"
              onClick={() => onRemoveLevelingRule(rule.id)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-gray-300 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-500"
              title="刪除升級階段"
              aria-label="刪除升級階段"
            >
              <DeleteIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
