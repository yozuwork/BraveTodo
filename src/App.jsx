import { useState, useEffect, useRef, useCallback } from 'react'
import Button from '@mui/material/Button'
import PersonIcon from '@mui/icons-material/Person'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import TuneIcon from '@mui/icons-material/Tune'
import CharacterCard from './components/Sidebar/CharacterCard'
import StatsCard from './components/Sidebar/StatsCard'
import QuestHub from './components/Main/QuestHub'
import LevelUpEffect from './components/LevelUpEffect/LevelUpEffect'
import useQuests from './hooks/useQuests'
import useCharacter from './hooks/useCharacter'
import useStages from './hooks/useStages'
import useInbox from './hooks/useInbox'
import useLevelingRules from './hooks/useLevelingRules'
import useMonsters from './hooks/useMonsters'

export default function App() {
  const {
    quests, addQuest, toggleQuest, updateQuest, removeQuest, toggleCoreTask, clearCompleted,
    addSubTask, toggleSubTask, removeSubTask, updateSubTask,
    lifetimeCompletions, resetLifetimeCompletions, coreTaskCompleted,
  } = useQuests()
  const { rules: levelingRules, updateExpPerLevel } = useLevelingRules()
  const { avatar, isEditMode, toggleEditMode, updateAvatar, imagePosition, updateImagePosition, level, expProgress, coreTaskProgress, stats } =
    useCharacter(lifetimeCompletions, coreTaskCompleted, levelingRules)
  const { stages, updateStageName, updateStageAvatar } = useStages()
  const { inboxItems, addInboxItem, removeInboxItem, updateInboxItem } = useInbox()
  const { monsters, addMonster, updateMonster, removeMonster, updateMonsterAvatar } = useMonsters()

  const handlePromoteToQuest = useCallback((id, text) => {
    addQuest(text)
    removeInboxItem(id)
  }, [addQuest, removeInboxItem])
  const [mobileTab, setMobileTab] = useState('character')

  const currentStage = stages.find(
    (s) => level >= s.minLevel && level < s.maxLevel
  ) ?? stages[stages.length - 1]

  // Level-up effect
  const [showLevelUp, setShowLevelUp] = useState(false)
  const prevLevelRef = useRef(null)

  useEffect(() => {
    if (prevLevelRef.current !== null && level > prevLevelRef.current) {
      setShowLevelUp(true)
    }
    prevLevelRef.current = level
  }, [level])

  const handleLevelUpComplete = useCallback(() => setShowLevelUp(false), [])

  return (
    <div className="min-h-screen bg-stone-50 relative overflow-x-hidden">
      <Button
        variant="contained"
        onClick={toggleEditMode}
        sx={{
          display: { xs: 'none', md: 'inline-flex' },
          position: 'fixed',
          top: { md: 20 },
          right: { md: 20 },
          bgcolor: '#a855f7',
          borderRadius: 99,
          fontWeight: 600,
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          px: 3,
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
              avatar={currentStage.avatarSrc}
              isEditMode={isEditMode}
              onAvatarChange={(file) => updateStageAvatar(currentStage.id, file)}
              imagePosition={imagePosition}
              onImagePositionChange={updateImagePosition}
            />
            <StatsCard expProgress={expProgress} coreTaskProgress={coreTaskProgress} stats={stats} level={level} currentStage={currentStage} />
          </aside>

          {/* Quest Hub */}
          <div className={`w-full flex-1 ${mobileTab === 'character' ? 'hidden md:block' : 'block'}`}>
            <QuestHub
              quests={quests}
              onAdd={addQuest}
              onToggle={toggleQuest}
              onUpdate={updateQuest}
              onRemove={removeQuest}
              onToggleCore={toggleCoreTask}
              onClearCompleted={clearCompleted}
              isEditMode={isEditMode}
              stages={stages}
              onStageName={updateStageName}
              onStageAvatar={updateStageAvatar}
              inboxItems={inboxItems}
              levelingRules={levelingRules}
              onUpdateExpPerLevel={updateExpPerLevel}
              atk={stats.atk.value}
              onAddSubTask={addSubTask}
              onToggleSubTask={toggleSubTask}
              onRemoveSubTask={removeSubTask}
              onUpdateSubTask={updateSubTask}
              currentLevel={level}
              onResetLevel={resetLifetimeCompletions}
              monsters={monsters}
              onAddMonster={addMonster}
              onUpdateMonster={updateMonster}
              onRemoveMonster={removeMonster}
              onMonsterAvatarChange={updateMonsterAvatar}
              onInboxAdd={addInboxItem}
              onInboxRemove={removeInboxItem}
              onInboxUpdate={updateInboxItem}
              onPromoteToQuest={handlePromoteToQuest}
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
        <button
          onClick={toggleEditMode}
          className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors cursor-pointer border-none bg-transparent ${
            isEditMode ? 'text-purple-500' : 'text-gray-400'
          }`}
        >
          <TuneIcon fontSize="small" />
          <span className="text-[0.65rem] font-semibold">編輯</span>
        </button>
      </nav>

      {/* Level up special effect */}
      <LevelUpEffect visible={showLevelUp} onComplete={handleLevelUpComplete} />
    </div>
  )
}
