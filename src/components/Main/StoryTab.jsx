/* eslint-disable react/prop-types */
import { useRef, useState } from 'react'
import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import StoryCard from './StoryCard'

export default function StoryTab({
  stories,
  onAdd,
  onUpdate,
  onRemove,
  onCoverChange,
  onTogglePin,
  onReorder,
}) {
  const [showArchived, setShowArchived] = useState(false)
  const dragIdRef = useRef(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [insertBefore, setInsertBefore] = useState(true)
  const visibleStories = showArchived
    ? stories
    : stories.filter((story) => story.status !== 'archived')
  const archivedCount = stories.filter((story) => story.status === 'archived').length

  const handleDragStart = (e, id) => {
    dragIdRef.current = id
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, id) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOverId(id)
    setInsertBefore(e.clientX < rect.left + rect.width / 2)
  }

  const handleDrop = (e, id) => {
    e.preventDefault()
    if (dragIdRef.current && dragIdRef.current !== id) {
      onReorder(dragIdRef.current, id, insertBefore)
    }
    dragIdRef.current = null
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    dragIdRef.current = null
    setDragOverId(null)
  }

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

      {visibleStories.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <p className="text-lg font-semibold">{stories.length === 0 ? '還沒有故事' : '沒有符合篩選的故事'}</p>
          <p className="text-sm mt-1">{stories.length === 0 ? '新增第一張故事卡片，開始寫下篇章。' : '已封存故事目前被隱藏。'}</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {visibleStories.map((story) => (
            <div
              key={story.id}
              draggable
              onDragStart={(e) => handleDragStart(e, story.id)}
              onDragOver={(e) => handleDragOver(e, story.id)}
              onDrop={(e) => handleDrop(e, story.id)}
              onDragEnd={handleDragEnd}
              className="relative group/drag"
              style={{ opacity: dragIdRef.current === story.id ? 0.42 : 1 }}
            >
              {dragOverId === story.id && insertBefore && (
                <div className="absolute left-0 right-0 -top-2 h-1 rounded-full bg-amber-400 z-20" />
              )}
              <div className="absolute -left-2 top-3 z-20 opacity-0 group-hover/drag:opacity-100 transition-opacity pointer-events-none">
                <DragIndicatorIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
              </div>
              <StoryCard
                story={story}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onCoverChange={onCoverChange}
                onTogglePin={onTogglePin}
              />
              {dragOverId === story.id && !insertBefore && (
                <div className="absolute left-0 right-0 -bottom-2 h-1 rounded-full bg-amber-400 z-20" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
