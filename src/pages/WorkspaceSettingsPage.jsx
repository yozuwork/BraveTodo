import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import LevelResetCard from '../components/Main/LevelResetCard'
import useQuests from '../hooks/useQuests'
import useCharacter from '../hooks/useCharacter'
import useStages from '../hooks/useStages'
import useMonsters from '../hooks/useMonsters'
import useWorkspaces from '../hooks/useWorkspaces'
import { stagesToLevelingRules } from '../utils/levelingRules'
import { DEFAULT_WORKSPACE_ID } from '../utils/workspace'
import { WORK_FEATURE_OPTIONS } from '../utils/workFeatures'

const SWITCH_SX = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: '#a855f7' },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#a855f7' },
}
const INPUT_CLASS = 'w-full text-sm font-semibold text-black bg-stone-50 border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors'

// Text field that saves on blur / Enter
function SavedTextField({ label, value, placeholder, maxLength = 20, onSave }) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const save = () => {
    const trimmed = draft.trim()
    if (!trimmed) setDraft(value)
    else if (trimmed !== value) onSave(trimmed)
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-gray-500">{label}</span>
      <input
        value={draft}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') setDraft(value)
        }}
        className={INPUT_CLASS}
      />
    </label>
  )
}

export default function WorkspaceSettingsPage() {
  const {
    activeWorkspace,
    renameWorkspace,
    setCharacterName,
    setWorkspaceFeature,
    setAllWorkspaceFeatures,
    deleteWorkspace,
  } = useWorkspaces()
  const { lifetimeCompletions, coreTaskCompleted, resetLifetimeCompletions } = useQuests()
  const { stages, resetStageBossHunts } = useStages()
  const levelingRules = useMemo(() => stagesToLevelingRules(stages), [stages])
  const { level, resetGold } = useCharacter(lifetimeCompletions, coreTaskCompleted, levelingRules)
  const { resetMonsterHunts } = useMonsters()
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const isDefault = activeWorkspace.id === DEFAULT_WORKSPACE_ID

  const handleResetLevel = useCallback(
    (completions) => {
      resetLifetimeCompletions(completions)
      resetStageBossHunts()
      resetMonsterHunts()
      resetGold()
    },
    [resetLifetimeCompletions, resetStageBossHunts, resetMonsterHunts, resetGold],
  )

  const handleDelete = async () => {
    if (deleteConfirm !== activeWorkspace.name || deleting) return
    setDeleting(true)
    try {
      await deleteWorkspace(activeWorkspace.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className="flex justify-center p-4 md:p-10">
      <div className="w-full max-w-[900px] flex flex-col gap-5">
        <div>
          <h1 className="text-base font-bold text-black m-0">工作區設定</h1>
          <p className="text-xs text-gray-400 m-0 mt-1">
            目前工作區：<b className="text-purple-600">{activeWorkspace.name}</b>・這裡的設定只影響這個工作區
          </p>
        </div>

        {/* Basics */}
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-5 grid gap-4 sm:grid-cols-2">
          <SavedTextField
            label="工作區名稱"
            value={activeWorkspace.name}
            placeholder="例如：WORK"
            onSave={(name) => renameWorkspace(activeWorkspace.id, name)}
          />
          <SavedTextField
            label="角色名稱"
            value={activeWorkspace.characterName}
            placeholder="例如：米莉亞"
            onSave={(name) => setCharacterName(activeWorkspace.id, name)}
          />
        </div>

        {/* Features */}
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-black m-0">功能顯示</p>
              <p className="text-xs text-gray-400 mt-0.5 m-0">關閉後，對應功能會從電腦與手機的選單隱藏；資料不會被刪除</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button size="small" onClick={() => setAllWorkspaceFeatures(activeWorkspace.id, true)} sx={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600, textTransform: 'none' }}>
                全部開啟
              </Button>
              <Button size="small" onClick={() => setAllWorkspaceFeatures(activeWorkspace.id, false)} sx={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600, textTransform: 'none' }}>
                全部關閉
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {WORK_FEATURE_OPTIONS.map((feature) => (
              <label
                key={feature.key}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-100 bg-stone-50 px-4 py-3 transition-colors hover:border-purple-200"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-800">{feature.label}</span>
                  <span className="mt-0.5 block text-xs text-gray-400">{feature.description}</span>
                </span>
                <Switch
                  checked={activeWorkspace.features[feature.key] === true}
                  onChange={(event) => setWorkspaceFeature(activeWorkspace.id, feature.key, event.target.checked)}
                  size="small"
                  sx={SWITCH_SX}
                />
              </label>
            ))}
          </div>
          <p className="m-0 text-[11px] text-gray-400">「任務」、白板與角色是每個工作區的基本功能，固定顯示。</p>
        </div>

        <LevelResetCard currentLevel={level} levelingRules={levelingRules} onResetLevel={handleResetLevel} />

        {/* Danger zone */}
        <div className="bg-white rounded-xl border border-red-100 px-5 py-5 flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-red-600 m-0">刪除工作區</p>
            <p className="text-xs text-gray-400 mt-0.5 m-0">
              {isDefault
                ? 'LIFE 是預設工作區，無法刪除。'
                : `會刪除「${activeWorkspace.name}」的角色、任務、討伐、商店、故事等全部資料，無法復原。請輸入工作區名稱確認。`}
            </p>
          </div>
          {!isDefault && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={activeWorkspace.name}
                className={`${INPUT_CLASS} sm:max-w-[240px]`}
              />
              <Button
                variant="contained"
                startIcon={<DeleteOutlineIcon />}
                onClick={handleDelete}
                disabled={deleteConfirm !== activeWorkspace.name || deleting}
                sx={{ bgcolor: '#ef4444', borderRadius: 99, fontWeight: 600, fontSize: '0.8rem', textTransform: 'none', px: 2.5, '&:hover': { bgcolor: '#dc2626' } }}
              >
                {deleting ? '刪除中…' : '刪除這個工作區'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
