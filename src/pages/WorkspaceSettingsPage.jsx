import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
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

// Copy / delete any workspace; both open a confirm dialog
function WorkspaceManager({ workspaces, activeId, onDuplicate, onDelete }) {
  const [action, setAction] = useState(null) // { type: 'copy' | 'delete', workspace }
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const open = (type, workspace) => {
    setAction({ type, workspace })
    setText(type === 'copy' ? `${workspace.name} 副本` : '')
  }
  const close = () => {
    if (!busy) setAction(null)
  }
  const canConfirm = action?.type === 'copy' ? text.trim() !== '' : text === action?.workspace.name

  const confirm = async () => {
    if (!canConfirm || busy) return
    setBusy(true)
    try {
      if (action.type === 'copy') await onDuplicate(action.workspace.id, text)
      else await onDelete(action.workspace.id)
      setAction(null)
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-5 py-5 flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-black m-0">管理工作區</p>
        <p className="text-xs text-gray-400 mt-0.5 m-0">複製會連同角色、任務、討伐、商店、故事、白板與圖片整份複製；LIFE 是預設工作區，無法刪除</p>
      </div>
      <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-100">
        {workspaces.map((workspace) => (
          <div key={workspace.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-sm font-semibold text-gray-800">
                {workspace.name}
                {workspace.id === activeId && <span className="ml-2 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-600">目前</span>}
              </p>
              <p className="m-0 mt-0.5 truncate text-xs text-gray-400">角色：{workspace.characterName}</p>
            </div>
            <Button
              size="small"
              startIcon={<ContentCopyOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => open('copy', workspace)}
              sx={{ color: '#7c3aed', borderRadius: 99, fontWeight: 600, fontSize: '0.75rem', textTransform: 'none' }}
            >
              複製
            </Button>
            <Button
              size="small"
              startIcon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
              onClick={() => open('delete', workspace)}
              disabled={workspace.id === DEFAULT_WORKSPACE_ID}
              sx={{ color: '#ef4444', borderRadius: 99, fontWeight: 600, fontSize: '0.75rem', textTransform: 'none' }}
            >
              刪除
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={action !== null} onClose={close} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3, mx: 2 } }}>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700, pb: 1 }}>
          {action?.type === 'copy' ? `複製「${action?.workspace.name}」` : `刪除「${action?.workspace.name}」`}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <p className="m-0 mb-2 text-xs leading-5 text-gray-500">
            {action?.type === 'copy'
              ? '新工作區的名稱。複製完成後會直接切換過去，圖片較多時需要一點時間。'
              : '會刪除這個工作區的角色、任務、討伐、商店、故事、白板等全部資料，無法復原。請輸入工作區名稱確認。'}
          </p>
          <input
            autoFocus
            value={text}
            maxLength={20}
            placeholder={action?.type === 'delete' ? action?.workspace.name : ''}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                confirm()
              }
            }}
            className={INPUT_CLASS}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={close} disabled={busy} sx={{ color: '#6b7280', textTransform: 'none', fontWeight: 600 }}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={confirm}
            disabled={!canConfirm || busy}
            sx={{
              bgcolor: action?.type === 'delete' ? '#ef4444' : '#a855f7',
              borderRadius: 99,
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              '&:hover': { bgcolor: action?.type === 'delete' ? '#dc2626' : '#9333ea' },
            }}
          >
            {busy
              ? action?.type === 'copy' ? '複製中…' : '刪除中…'
              : action?.type === 'copy' ? '複製並切換' : '刪除工作區'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default function WorkspaceSettingsPage() {
  const {
    workspaces,
    activeWorkspace,
    duplicateWorkspace,
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

  const handleResetLevel = useCallback(
    (completions) => {
      resetLifetimeCompletions(completions)
      resetStageBossHunts()
      resetMonsterHunts()
      resetGold()
    },
    [resetLifetimeCompletions, resetStageBossHunts, resetMonsterHunts, resetGold],
  )

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

        <WorkspaceManager
          workspaces={workspaces}
          activeId={activeWorkspace.id}
          onDuplicate={duplicateWorkspace}
          onDelete={deleteWorkspace}
        />
      </div>
    </main>
  )
}
