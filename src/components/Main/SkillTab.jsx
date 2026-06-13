/* eslint-disable react/prop-types */
import { useState } from 'react'
import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import SkillCard from './SkillCard'

export default function SkillTab({
  skills,
  stages,
  currentLevel,
  onAdd,
  onUpdate,
  onRemove,
  onCoverChange,
  onTogglePin,
}) {
  const [showArchived, setShowArchived] = useState(false)
  const visibleSkills = showArchived
    ? skills
    : skills.filter((skill) => skill.status !== 'archived')
  const sortedSkills = [...visibleSkills].sort((a, b) => {
    if ((a.pinned ?? false) !== (b.pinned ?? false)) return a.pinned ? -1 : 1
    return (b.createdAt ?? b.id ?? 0) - (a.createdAt ?? a.id ?? 0)
  })
  const archivedCount = skills.filter((skill) => skill.status === 'archived').length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 max-md:flex-col">
        <div>
          <h2 className="text-base font-bold text-black m-0">技能</h2>
          <p className="text-xs text-gray-400 mt-0.5 m-0">用卡片收藏技能、等級與修練筆記</p>
        </div>
        <div className="flex items-center gap-3 max-md:w-full max-md:justify-between">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-violet-600"
            />
            顯示已封存技能{archivedCount > 0 ? ` (${archivedCount})` : ''}
          </label>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={onAdd}
            sx={{
              borderColor: '#7c3aed',
              color: '#7c3aed',
              borderRadius: 99,
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'none',
              px: 1.5,
              flexShrink: 0,
              '&:hover': { borderColor: '#6d28d9', bgcolor: '#f5f3ff' },
            }}
          >
            新增
          </Button>
        </div>
      </div>

      {sortedSkills.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <p className="text-lg font-semibold">{skills.length === 0 ? '還沒有技能' : '沒有符合篩選的技能'}</p>
          <p className="text-sm mt-1">{skills.length === 0 ? '新增第一張技能卡片，開始記錄修練路線。' : '已封存技能目前被隱藏。'}</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {sortedSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              stages={stages}
              currentLevel={currentLevel}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onCoverChange={onCoverChange}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      )}
    </div>
  )
}
