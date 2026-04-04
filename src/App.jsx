import { useState } from 'react'
import Button from '@mui/material/Button'
import PersonIcon from '@mui/icons-material/Person'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import CharacterCard from './components/Sidebar/CharacterCard'
import StatsCard from './components/Sidebar/StatsCard'
import QuestHub from './components/Main/QuestHub'
import useQuests from './hooks/useQuests'
import useCharacter from './hooks/useCharacter'

export default function App() {
  const { quests, addQuest, toggleQuest, removeQuest, toggleCoreTask, clearCompleted, completedCount, coreTaskCompleted } = useQuests()
  const { avatar, isEditMode, toggleEditMode, updateAvatar, imagePosition, updateImagePosition, level, expProgress, coreTaskProgress, stats } =
    useCharacter(completedCount, coreTaskCompleted)
  const [mobileTab, setMobileTab] = useState('character')

  return (
    <div className="min-h-screen bg-stone-50 relative overflow-x-hidden">
      <Button
        variant="contained"
        onClick={toggleEditMode}
        sx={{
          position: 'fixed',
          top: { xs: 12, md: 20 },
          right: { xs: 12, md: 20 },
          bgcolor: '#a855f7',
          borderRadius: 99,
          fontWeight: 600,
          fontSize: { xs: '0.7rem', md: '0.85rem' },
          textTransform: 'uppercase',
          px: { xs: 2, md: 3 },
          zIndex: 50,
          '&:hover': { bgcolor: '#9333ea' },
        }}
      >
        {isEditMode ? 'Exit Edit' : 'Edit Mode'}
      </Button>

      <div className="flex justify-center items-start p-4 md:p-10 pb-20 md:pb-10">
        <div className="w-full max-w-[1200px] flex flex-col md:flex-row gap-6 md:gap-10">

          {/* Sidebar */}
          <aside className={`w-full md:w-[380px] md:shrink-0 flex flex-col gap-6 md:gap-8 ${mobileTab === 'quests' ? 'hidden md:flex' : 'flex'}`}>
            <CharacterCard
              level={level}
              avatar={avatar}
              isEditMode={isEditMode}
              onAvatarChange={updateAvatar}
              imagePosition={imagePosition}
              onImagePositionChange={updateImagePosition}
            />
            <StatsCard expProgress={expProgress} coreTaskProgress={coreTaskProgress} stats={stats} />
          </aside>

          {/* Quest Hub */}
          <div className={`w-full flex-1 ${mobileTab === 'character' ? 'hidden md:block' : 'block'}`}>
            <QuestHub
              quests={quests}
              onAdd={addQuest}
              onToggle={toggleQuest}
              onRemove={removeQuest}
              onToggleCore={toggleCoreTask}
              onClearCompleted={clearCompleted}
            />
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 flex z-40">
        <button
          onClick={() => setMobileTab('character')}
          className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors cursor-pointer border-none bg-transparent ${
            mobileTab === 'character' ? 'text-purple-500' : 'text-gray-400'
          }`}
        >
          <PersonIcon fontSize="small" />
          <span className="text-[0.65rem] font-semibold">角色</span>
        </button>
        <button
          onClick={() => setMobileTab('quests')}
          className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors cursor-pointer border-none bg-transparent ${
            mobileTab === 'quests' ? 'text-purple-500' : 'text-gray-400'
          }`}
        >
          <FormatListBulletedIcon fontSize="small" />
          <span className="text-[0.65rem] font-semibold">任務</span>
        </button>
      </nav>
    </div>
  )
}
