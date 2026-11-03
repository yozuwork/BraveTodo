import { useState } from 'react'
import StageSettings from './StageSettings'
import RewardSettings from './RewardSettings'
import LevelResetCard from './LevelResetCard'

const SETTING_TABS = [
  { key: 'stages', label: '階段設置' },
  { key: 'rewards', label: '獎勵設置' },
]

export default function CharacterSettings({
  stages,
  onStageName,
  onStageInfo,
  onStageAvatar,
  onStageAvatarReplace,
  onStageAvatarRemove,
  onStageLevel,
  onStageExpPerLevel,
  onAddStage,
  onRemoveStage,
  onReorderStages,
  onStageAvatarPosition,
  levelingRules,
  rewardSettings,
  onUpdateRewardGold,
  onUpdateRewardColor,
  autoExpSettings,
  onAutoExpEnabled,
  onUpdateAutoExpThreshold,
  currentLevel,
  onResetLevel,
}) {
  const [activeSetting, setActiveSetting] = useState('stages')

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-black m-0">角色設定</h2>
          <p className="text-xs text-gray-400 m-0 mt-1">管理角色階段、升級經驗與獎勵</p>
        </div>

        <div className="inline-flex w-fit rounded-lg border border-gray-200 bg-white p-1">
          {SETTING_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSetting(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                activeSetting === tab.key
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSetting === 'stages' && onResetLevel && (
        <LevelResetCard
          currentLevel={currentLevel}
          levelingRules={levelingRules}
          onResetLevel={onResetLevel}
        />
      )}

      {activeSetting === 'stages' && (
        <StageSettings
          stages={stages}
          onNameChange={onStageName}
          onInfoChange={onStageInfo}
          onAvatarChange={onStageAvatar}
          onReplaceAvatar={onStageAvatarReplace}
          onRemoveAvatar={onStageAvatarRemove}
          onLevelChange={onStageLevel}
          onExpPerLevelChange={onStageExpPerLevel}
          onAddStage={onAddStage}
          onRemoveStage={onRemoveStage}
          onReorderStages={onReorderStages}
          onPositionChange={onStageAvatarPosition}
        />
      )}

      {activeSetting === 'rewards' && (
        <RewardSettings
          rewardSettings={rewardSettings}
          onUpdateRewardGold={onUpdateRewardGold}
          onUpdateRewardColor={onUpdateRewardColor}
          autoExpSettings={autoExpSettings}
          onAutoExpEnabled={onAutoExpEnabled}
          onUpdateAutoExpThreshold={onUpdateAutoExpThreshold}
        />
      )}
    </div>
  )
}
