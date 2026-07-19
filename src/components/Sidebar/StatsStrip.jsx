import { StatGlyph } from '../Main/FantasyIcons'

const ITEMS = [
  { key: 'hp', color: '#c0392b' },
  { key: 'atk', color: 'var(--fantasy-ink)' },
  { key: 'def', color: 'var(--fantasy-purple-dark)' },
  { key: 'spd', color: 'var(--fantasy-gold)' },
]

export default function StatsStrip({ stats }) {
  return (
    <div className="fantasy-parchment-panel flex items-center justify-between gap-2 px-4 py-3">
      {ITEMS.map(({ key, color }) => (
        <div key={key} className="flex items-center gap-1.5 min-w-0">
          <StatGlyph stat={key} className="h-5 w-5 shrink-0" style={{ color }} />
          <span className="text-sm font-extrabold text-[var(--fantasy-ink)] truncate">
            {stats[key].value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}
