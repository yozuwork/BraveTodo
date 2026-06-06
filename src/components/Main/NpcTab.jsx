/* eslint-disable react/prop-types */
import { useState } from 'react'
import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import NpcCard from './NpcCard'

const NPC_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'visible', label: '顯示中' },
  { key: 'hidden', label: '隱藏中' },
]

export default function NpcTab({
  npcs,
  onAdd,
  onUpdate,
  onRemove,
  onCoverChange,
}) {
  const [activeFilter, setActiveFilter] = useState('all')
  const filteredNpcs = activeFilter === 'all'
    ? npcs
    : npcs.filter((npc) => (npc.visibility ?? 'visible') === activeFilter)
  const sortedNpcs = [...filteredNpcs].sort((a, b) => (
    (b.createdAt ?? b.id ?? 0) - (a.createdAt ?? a.id ?? 0)
  ))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-black m-0">NPC</h2>
          <p className="text-xs text-gray-400 mt-0.5 m-0">用卡片整理角色、關係與設定筆記</p>
        </div>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={onAdd}
          sx={{
            borderColor: '#0e7490',
            color: '#0e7490',
            borderRadius: 99,
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'none',
            px: 1.5,
            flexShrink: 0,
            '&:hover': { borderColor: '#155e75', bgcolor: '#ecfeff' },
          }}
        >
          新增
        </Button>
      </div>

      <div className="flex border-b border-gray-200">
        {NPC_FILTERS.map((filter) => {
          const active = activeFilter === filter.key
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`px-4 py-2 text-sm font-semibold border border-transparent border-b-0 rounded-t-md bg-transparent transition-colors ${
                active
                  ? 'text-black bg-white border-gray-200 -mb-px'
                  : 'text-blue-600 hover:text-blue-700 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      {sortedNpcs.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <p className="text-lg font-semibold">{npcs.length === 0 ? '還沒有 NPC' : '沒有符合篩選的 NPC'}</p>
          <p className="text-sm mt-1">{npcs.length === 0 ? '新增第一張 NPC 卡片，開始整理角色設定。' : '切換上方分頁查看其他狀態。'}</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {sortedNpcs.map((npc) => (
            <NpcCard
              key={npc.id}
              npc={npc}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onCoverChange={onCoverChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}
