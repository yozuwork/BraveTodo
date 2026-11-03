export const WORK_FEATURE_OPTIONS = [
  { key: 'Hunt', label: '討伐', description: '討伐目標與戰鬥任務' },
  { key: 'RewardShop', label: '獎勵商店', description: '金幣獎勵與兑換內容' },
  { key: 'Story', label: '故事', description: '故事卡與冒險紀錄' },
  { key: 'Npc', label: 'NPC', description: '角色與關係設定' },
  { key: 'Map', label: '地圖', description: '世界地圖與探索備註' },
  { key: 'Skills', label: 'SKILL', description: '技能與能力卡片' },
  { key: 'Inbox', label: '收集箱', description: '尚未整理的任務想法' },
]

export const allFeatures = (enabled) =>
  Object.fromEntries(WORK_FEATURE_OPTIONS.map((feature) => [feature.key, enabled]))
