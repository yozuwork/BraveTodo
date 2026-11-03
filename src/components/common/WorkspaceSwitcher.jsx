import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import WorkspacesOutlinedIcon from '@mui/icons-material/WorkspacesOutlined'

// Workspace list + "new workspace" for the nav menus; switching reloads into the chosen workspace
export default function WorkspaceSwitcher({ workspaces, activeWorkspace, onSwitch, onAdd, size = 'sm' }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const itemClass = size === 'lg'
    ? 'px-4 py-3 text-base rounded-xl'
    : 'px-3 py-2 text-sm rounded-lg'

  const create = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await onAdd(name)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <p className="m-0 px-3 pb-1 pt-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">工作區</p>
      {workspaces.map((workspace) => {
        const active = workspace.id === activeWorkspace.id
        return (
          <button
            key={workspace.id}
            type="button"
            onClick={() => onSwitch(workspace.id)}
            className={`flex w-full items-center gap-3 border-0 text-left font-semibold transition-colors ${itemClass} ${
              active ? 'bg-purple-50 text-purple-600' : 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <WorkspacesOutlinedIcon sx={{ fontSize: 18 }} />
            <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
            {active && <CheckIcon sx={{ fontSize: 16 }} />}
          </button>
        )
      })}
      <button
        type="button"
        onClick={() => {
          setName('')
          setDialogOpen(true)
        }}
        className={`flex w-full items-center gap-3 border-0 bg-transparent text-left font-semibold text-slate-400 transition-colors hover:bg-slate-50 hover:text-purple-600 ${itemClass}`}
      >
        <AddIcon sx={{ fontSize: 18 }} />
        新增工作區
      </button>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3, mx: 2 } }}>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700, pb: 1 }}>新增工作區</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                create()
              }
            }}
            maxLength={20}
            placeholder="例如：WORK、學習"
            className="w-full rounded-lg border border-gray-200 bg-stone-50 px-3 py-2.5 text-sm font-semibold text-black outline-none transition-colors focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
          />
          <p className="m-0 mt-2 text-xs leading-5 text-gray-400">
            新工作區有自己的角色、等級與任務，一開始只有任務與白板，其他功能之後可以再開啟。建立後會直接切換過去。
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ color: '#6b7280', textTransform: 'none', fontWeight: 600 }}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={create}
            disabled={!name.trim() || saving}
            sx={{ bgcolor: '#a855f7', borderRadius: 99, textTransform: 'none', fontWeight: 700, px: 3, '&:hover': { bgcolor: '#9333ea' } }}
          >
            {saving ? '建立中…' : '建立並切換'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
