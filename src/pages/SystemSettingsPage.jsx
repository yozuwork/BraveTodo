import { useCallback, useState } from 'react'
import OtherSettings from '../components/Main/OtherSettings'
import SaveManagement from '../components/Main/SaveManagement'
import StorageUsage from '../components/Main/StorageUsage'
import useQuests from '../hooks/useQuests'
import useCharacter from '../hooks/useCharacter'
import useStages, { resolveCurrentStage } from '../hooks/useStages'
import useMonsters from '../hooks/useMonsters'
import useLevelingRules from '../hooks/useLevelingRules'

const SYSTEM_TABS = [
  { key: 'general', label: '其他設定' },
  { key: 'saves', label: '存檔管理' },
]

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const {
    lifetimeCompletions,
    coreTaskCompleted,
    resetLifetimeCompletions,
  } = useQuests()
  const { rules: levelingRules } = useLevelingRules()
  const { level } = useCharacter(lifetimeCompletions, coreTaskCompleted, levelingRules)
  const { stages, resetStageBossHunts } = useStages()
  const { resetMonsterHunts } = useMonsters()
  const currentStage = resolveCurrentStage(stages, level)

  const handleResetLevel = useCallback(
    (completions) => {
      resetLifetimeCompletions(completions)
      resetStageBossHunts()
      resetMonsterHunts()
    },
    [resetLifetimeCompletions, resetStageBossHunts, resetMonsterHunts],
  )

  return (
    <main className="flex justify-center p-4 md:p-10">
      <div className="w-full max-w-[900px]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-base font-bold text-black m-0">系統設置</h1>
              <p className="text-xs text-gray-400 m-0 mt-1">管理應用程式偏好與本機存檔</p>
            </div>

            <div className="inline-flex w-fit rounded-lg border border-gray-200 bg-white p-1">
              {SYSTEM_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-purple-50 text-purple-600'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'general' && (
            <>
              <OtherSettings
                currentLevel={level}
                levelingRules={levelingRules}
                onResetLevel={handleResetLevel}
              />
              <StorageUsage />
            </>
          )}

          {activeTab === 'saves' && (
            <SaveManagement
              currentLevel={level}
              currentStage={currentStage}
            />
          )}
        </div>
      </div>
    </main>
  )
}
