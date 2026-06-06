/* eslint-disable react/prop-types */
import { useState } from 'react'
import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import StoryCard from './StoryCard'

export default function StoryTab({
  stories,
  onAdd,
  onUpdate,
  onRemove,
  onCoverChange,
  onTogglePin,
}) {
  const [showArchived, setShowArchived] = useState(false)
  const visibleStories = showArchived
    ? stories
    : stories.filter((story) => story.status !== 'archived')
  const sortedStories = [...visibleStories].sort((a, b) => {
    if ((a.pinned ?? false) !== (b.pinned ?? false)) return a.pinned ? -1 : 1
    return (b.createdAt ?? b.id ?? 0) - (a.createdAt ?? a.id ?? 0)
  })
  const archivedCount = stories.filter((story) => story.status === 'archived').length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 max-md:flex-col">
        <div>
          <h2 className="text-base font-bold text-black m-0">故事</h2>
          <p className="text-xs text-gray-400 mt-0.5 m-0">用卡片收藏篇章，點開即可撰寫文章</p>
        </div>
        <div className="flex items-center gap-3 max-md:w-full max-md:justify-between">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-amber-600"
            />
            顯示已封存故事{archivedCount > 0 ? ` (${archivedCount})` : ''}
          </label>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={onAdd}
            sx={{
              borderColor: '#b45309',
              color: '#b45309',
              borderRadius: 99,
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'none',
              px: 1.5,
              flexShrink: 0,
              '&:hover': { borderColor: '#92400e', bgcolor: '#fffbeb' },
            }}
          >
            新增
          </Button>
        </div>
      </div>

      {sortedStories.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <p className="text-lg font-semibold">{stories.length === 0 ? '還沒有故事' : '沒有符合篩選的故事'}</p>
          <p className="text-sm mt-1">{stories.length === 0 ? '新增第一張故事卡片，開始寫下篇章。' : '已封存故事目前被隱藏。'}</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {sortedStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
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
