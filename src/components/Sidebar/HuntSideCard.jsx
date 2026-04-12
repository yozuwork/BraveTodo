import { TYPE_CONFIG } from '../../hooks/useMonsters'

const STAGE_COLORS = ['#a855f7', '#3b82f6', '#f97316', '#ef4444', '#10b981', '#f59e0b']

export default function HuntSideCard({ target }) {
  if (!target) return null

  const { id, name, type, avatarSrc, avatar, huntTasks = [], recommendedLevel, stageRange, _type } = target
  const isStageBoss = _type === 'stageBoss'

  const accent = isStageBoss
    ? STAGE_COLORS[(id - 1) % STAGE_COLORS.length]
    : (TYPE_CONFIG[type] ?? TYPE_CONFIG.minion).accent

  const typeLabel = isStageBoss
    ? `第${id}階段Boss`
    : (TYPE_CONFIG[type] ?? TYPE_CONFIG.minion).label

  const displayAvatar = avatarSrc ?? avatar

  const completedCount = huntTasks.filter((t) => t.completed).length
  const totalCount = huntTasks.length
  const hpPercent = totalCount > 0 ? ((totalCount - completedCount) / totalCount) * 100 : 100

  const hpColor =
    hpPercent > 60 ? '#22c55e' :
    hpPercent > 30 ? '#f59e0b' :
    '#ef4444'

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: '#111827',
        border: `2px solid ${accent}66`,
        boxShadow: `0 0 24px ${accent}33, 0 0 8px rgba(239,68,68,0.3)`,
        minHeight: 420,
      }}
    >
      {/* ── Full-bleed avatar ── */}
      <div className="relative w-full" style={{ height: 320 }}>
        {displayAvatar ? (
          <img
            src={displayAvatar}
            alt={name}
            className="w-full h-full object-contain"
            style={{ background: '#111827' }}
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-6xl font-extrabold"
            style={{
              background: `linear-gradient(135deg, ${accent}33 0%, #111827 100%)`,
              color: accent,
            }}
          >
            {name[0]}
          </div>
        )}

        {/* Gradient fade at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #111827 0%, transparent 100%)' }}
        />

        {/* Type badge — top right */}
        <span
          className="absolute top-3 right-3 text-xs font-bold text-white px-2.5 py-1 rounded-full z-10"
          style={{ background: accent }}
        >
          {typeLabel}
        </span>

        {/* Hunting indicator — top left */}
        <div
          className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full z-10"
          style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"
            style={{ animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite' }}
          />
          <span className="text-red-400 text-[10px] font-bold">討伐中</span>
        </div>
      </div>

      {/* ── Info + HP section ── */}
      <div className="px-5 pb-5 -mt-2 relative z-10 flex flex-col gap-3">
        <div>
          <h2 className="text-white text-xl font-extrabold m-0 leading-tight">{name}</h2>
          {isStageBoss && stageRange ? (
            <p className="text-gray-500 text-xs font-mono mt-0.5 m-0">
              LV{stageRange.min} — <span className="font-bold" style={{ color: accent }}>LV{stageRange.max}</span>
              <span className="ml-1 text-gray-600">晉級關卡</span>
            </p>
          ) : (
            <p className="text-gray-500 text-xs font-mono mt-0.5 m-0">
              推薦等級 <span className="font-bold" style={{ color: accent }}>LV {recommendedLevel}</span>
            </p>
          )}
        </div>

        {/* HP Bar */}
        <div
          className="p-3 rounded-xl"
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">HP</span>
            <span className="text-sm font-bold font-mono" style={{ color: hpColor }}>
              {Math.round(hpPercent)}%
            </span>
          </div>

          <div className="h-4 rounded-full overflow-hidden bg-gray-800 relative">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${hpPercent}%`,
                background: `linear-gradient(90deg, ${hpColor}88, ${hpColor})`,
                boxShadow: `0 0 8px ${hpColor}88`,
              }}
            />
            {totalCount > 1 && huntTasks.map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px"
                style={{ left: `${((i + 1) / totalCount) * 100}%`, background: 'rgba(17,24,39,0.7)' }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-gray-500">任務進度</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: hpColor }}>
              {completedCount} / {totalCount === 0 ? '?' : totalCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
