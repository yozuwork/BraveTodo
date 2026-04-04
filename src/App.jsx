import Button from '@mui/material/Button'
import Fab from '@mui/material/Fab'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import CharacterCard from './components/Sidebar/CharacterCard'
import StatsCard from './components/Sidebar/StatsCard'
import QuestHub from './components/Main/QuestHub'
import useQuests from './hooks/useQuests'
import useCharacter from './hooks/useCharacter'

export default function App() {
  const { quests, addQuest, toggleQuest, removeQuest, completedCount, totalExp } = useQuests()
  const { avatar, isEditMode, toggleEditMode, updateAvatar, level, expProgress, stats } =
    useCharacter(totalExp)

  return (
    <div className="min-h-screen bg-stone-50 flex justify-center items-start p-10 relative overflow-x-hidden">
      <Button
        variant="contained"
        onClick={toggleEditMode}
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
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

      <div className="w-[1200px] max-w-full flex gap-10 pb-40">
        <aside className="w-[380px] flex flex-col gap-8 shrink-0">
          <CharacterCard
            level={level}
            avatar={avatar}
            isEditMode={isEditMode}
            onAvatarChange={updateAvatar}
          />
          <StatsCard expProgress={expProgress} stats={stats} />
        </aside>

        <QuestHub
          quests={quests}
          onAdd={addQuest}
          onToggle={toggleQuest}
          onRemove={removeQuest}
        />
      </div>

      <Fab
        variant="extended"
        onClick={() => {}}
        sx={{
          position: 'fixed',
          bottom: 30,
          left: '50%',
          transform: 'translateX(-50%)',
          bgcolor: '#a855f7',
          color: 'white',
          fontWeight: 800,
          fontSize: '0.95rem',
          textTransform: 'uppercase',
          px: 5,
          py: 1.5,
          boxShadow: '0 5px 15px rgba(168, 85, 247, 0.3)',
          zIndex: 50,
          '&:hover': { bgcolor: '#9333ea' },
        }}
      >
        <RocketLaunchIcon sx={{ mr: 1 }} />
        Activate Quests ({quests.length})
      </Fab>

      <div className="fixed bottom-0 left-0 w-full h-20 bg-white/10 backdrop-blur-lg border-t border-black/5 pointer-events-none" />
    </div>
  )
}
