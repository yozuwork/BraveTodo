import { useState } from 'react'
import HeroStageSettings from './HeroStageSettings'
import HeroLevelingSettings from './HeroLevelingSettings'
import HeroRewardSettings from './HeroRewardSettings'
import HeroOtherSettings from './HeroOtherSettings'

const SETTING_TABS = [
  { key: 'stages', label: '階段設置' },
  { key: 'leveling', label: '升級設定' },
  { key: 'rewards', label: '獎勵設置' },
  { key: 'other', label: '其他設定' },
]

export default function HeroCharacterSettings({
  stages,
  onStageName,
  onStageAvatar,
  onStageAvatarReplace,
  onStageAvatarRemove,
  onStageLevel,
  onAddStage,
  onRemoveStage,
  onReorderStages,
  onStageAvatarPosition,
  levelingRules,
  onUpdateExpPerLevel,
  onUpdateLevelRange,
  onAddLevelingRule,
  onRemoveLevelingRule,
  rewardSettings,
  onUpdateRewardGold,
  currentLevel,
  onResetLevel,
  lifeCurrentLevel,
  lifeLevelingRules,
  onResetLifeLevel,
}) {
  const [activeSetting, setActiveSetting] = useState('stages')

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-black m-0">英雄角色設定</h2>
          <p className="text-xs text-gray-400 m-0 mt-1">管理英雄的階段、升級規則與獎勵設置</p>
        </div>

        <div className="inline-flex w-fit flex-wrap rounded-lg border border-gray-200 bg-white p-1">
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

      {activeSetting === 'stages' && (
        <HeroStageSettings
          stages={stages}
          onNameChange={onStageName}
          onAvatarChange={onStageAvatar}
          onReplaceAvatar={onStageAvatarReplace}
          onRemoveAvatar={onStageAvatarRemove}
          onLevelChange={onStageLevel}
          onAddStage={onAddStage}
          onRemoveStage={onRemoveStage}
          onReorderStages={onReorderStages}
          onPositionChange={onStageAvatarPosition}
        />
      )}

      {activeSetting === 'leveling' && (
        <HeroLevelingSettings
          rules={levelingRules}
          onUpdateExpPerLevel={onUpdateExpPerLevel}
          onUpdateLevelRange={onUpdateLevelRange}
          onAddLevelingRule={onAddLevelingRule}
          onRemoveLevelingRule={onRemoveLevelingRule}
        />
      )}

      {activeSetting === 'rewards' && (
        <HeroRewardSettings
          rewardSettings={rewardSettings}
          onUpdateRewardGold={onUpdateRewardGold}
        />
      )}

      {activeSetting === 'other' && (
        <HeroOtherSettings
          currentLevel={currentLevel}
          levelingRules={levelingRules}
          onResetLevel={onResetLevel}
          lifeCurrentLevel={lifeCurrentLevel}
          lifeLevelingRules={lifeLevelingRules}
          onResetLifeLevel={onResetLifeLevel}
        />
      )}
    </div>
  )
}
