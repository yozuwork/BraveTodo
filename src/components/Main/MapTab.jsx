/* eslint-disable react/prop-types */
import { useRef, useState } from 'react'
import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import MapCard from './MapCard'

export default function MapTab({
  maps,
  onAdd,
  onUpdate,
  onRemove,
  onCoverChange,
  onReorder,
}) {
  const dragIdRef = useRef(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [insertBefore, setInsertBefore] = useState(true)

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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-black m-0">地圖</h2>
          <p className="text-xs text-gray-400 mt-0.5 m-0">用卡片收藏世界地圖、區域與探索備註</p>
        </div>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={onAdd}
          sx={{
            borderColor: '#047857',
            color: '#047857',
            borderRadius: 99,
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'none',
            px: 1.5,
            flexShrink: 0,
            '&:hover': { borderColor: '#065f46', bgcolor: '#ecfdf5' },
          }}
        >
          新增
        </Button>
      </div>

      {maps.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <p className="text-lg font-semibold">還沒有地圖</p>
          <p className="text-sm mt-1">新增第一張地圖卡片，開始整理你的世界。</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-5">
          {maps.map((map) => (
            <div
              key={map.id}
              draggable
              onDragStart={(e) => handleDragStart(e, map.id)}
              onDragOver={(e) => handleDragOver(e, map.id)}
              onDrop={(e) => handleDrop(e, map.id)}
              onDragEnd={handleDragEnd}
              className="relative group/drag"
              style={{ opacity: dragIdRef.current === map.id ? 0.42 : 1 }}
            >
              {dragOverId === map.id && insertBefore && (
                <div className="absolute left-0 right-0 -top-2 h-1 rounded-full bg-emerald-400 z-20" />
              )}
              <div className="absolute -left-2 top-3 z-20 opacity-0 group-hover/drag:opacity-100 transition-opacity pointer-events-none">
                <DragIndicatorIcon sx={{ fontSize: 18, color: '#10b981' }} />
              </div>
              <MapCard
                map={map}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onCoverChange={onCoverChange}
              />
              {dragOverId === map.id && !insertBefore && (
                <div className="absolute left-0 right-0 -bottom-2 h-1 rounded-full bg-emerald-400 z-20" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
