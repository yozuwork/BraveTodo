import { useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import Button from '@mui/material/Button'
import TabNav from './TabNav'
import QuestItem from './QuestItem'

export default function QuestHub({ quests, onAdd, onToggle, onRemove, onToggleCore, onClearCompleted }) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onAdd(inputValue.trim())
      setInputValue('')
    }
  }

  const hasCompleted = quests.some((q) => q.completed)

  return (
    <div className="flex-1 flex flex-col gap-5">
      <div className="flex flex-col gap-4 mb-5">
        <h1 className="text-black text-2xl md:text-4xl font-extrabold uppercase m-0 tracking-tight">
          米莉亞
        </h1>
        <TabNav />
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-btn pointer-events-none">
            <AddIcon fontSize="small" />
          </span>
          <input
            type="text"
            className="w-full bg-white text-black border border-gray-200 rounded-xl py-4 pl-12 pr-20 text-sm focus:outline-none focus:border-purple-400 transition-colors"
            placeholder="Add new quest..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono pointer-events-none">
            ENTER ↵
          </span>
        </div>

        {hasCompleted && (
          <div className="flex justify-end">
            <Button
              size="small"
              onClick={onClearCompleted}
              sx={{
                color: '#ef4444',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { bgcolor: '#fee2e2' },
              }}
            >
              清除已完成任務
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {quests.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <p className="text-lg font-semibold">No quests yet</p>
              <p className="text-sm mt-1">Add your first quest above to begin your adventure!</p>
            </div>
          ) : (
            quests.map((quest) => (
              <QuestItem
                key={quest.id}
                quest={quest}
                onToggle={onToggle}
                onRemove={onRemove}
                onToggleCore={onToggleCore}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
