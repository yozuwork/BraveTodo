import { TabGlyph } from './FantasyIcons'

const ALL_TABS = [
  { key: 'Tasks',       label: '任務' },
  { key: 'HuntMission', label: '討伐任務', huntOnly: true },
  { key: 'Hunt',        label: '時代' },
  { key: 'RewardShop',  label: '獎勵商店' },
  { key: 'Story',       label: '故事' },
  { key: 'Npc',         label: 'NPC' },
  { key: 'Map',         label: '地圖' },
  { key: 'Skills',      label: 'SKILLS' },
  { key: 'Inbox',       label: '收集箱' },
]

export default function TabNav({ activeTab, onTabChange, hasActiveHunt }) {
  const visibleTabs = ALL_TABS.filter((t) => {
    if (t.huntOnly && !hasActiveHunt) return false
    return true
  })

  return (
    <nav className="flex gap-1 overflow-x-auto border-b-2 border-[var(--fantasy-gold)]/40 pb-1">
      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.key
        const isHunt = tab.key === 'HuntMission'
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`shrink-0 flex flex-col items-center gap-1 rounded-t-xl px-3 pt-2 pb-1.5 cursor-pointer border-none transition-colors whitespace-nowrap
              ${isActive
                ? isHunt
                  ? 'bg-red-500/15 text-red-600'
                  : 'bg-[var(--fantasy-purple)]/12 text-[var(--fantasy-purple-dark)]'
                : 'bg-transparent text-[var(--fantasy-muted)] hover:text-[var(--fantasy-ink)]'
              }`}
          >
            <span className="relative flex h-6 w-6 items-center justify-center">
              {isHunt && hasActiveHunt && (
                <span
                  className="absolute -top-1 -right-1 inline-block w-2 h-2 rounded-full bg-red-500"
                  style={{ animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }}
                />
              )}
              <TabGlyph tab={tab.key === 'HuntMission' ? 'Hunt' : tab.key} className="h-full w-full" />
            </span>
            <span className="text-[0.68rem] font-bold uppercase tracking-wide">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
