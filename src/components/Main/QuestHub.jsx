import { useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import TabNav from './TabNav'
import QuestItem from './QuestItem'

export default function QuestHub({ quests, onAdd, onToggle, onRemove }) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onAdd(inputValue.trim())
      setInputValue('')
    }
  }

  return (
    <div className="flex-1 flex flex-col gap-5">
      <div className="flex flex-col gap-4 mb-5">
        <h1 className="text-black text-4xl font-extrabold uppercase m-0 tracking-tight">
          Vanguard Hub
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
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
