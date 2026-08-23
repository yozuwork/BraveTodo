import { useEffect, useState } from 'react'
import Switch from '@mui/material/Switch'
import { AUTO_EXP_TIERS } from '../../utils/questAutoExp'

const TONE_CLASS = {
  stone: {
    badge: 'bg-stone-100 text-stone-500',
    ring: 'focus:border-stone-400 focus:ring-stone-200',
  },
  sky: {
    badge: 'bg-sky-50 text-sky-500',
    ring: 'focus:border-sky-400 focus:ring-sky-200',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-600',
    ring: 'focus:border-amber-400 focus:ring-amber-200',
  },
  orange: {
    badge: 'bg-orange-50 text-orange-600',
    ring: 'focus:border-orange-400 focus:ring-orange-200',
  },
}

function CoinIcon() {
  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="coin"
      className="h-5 w-5 object-contain"
    >
      <circle cx="64" cy="64" r="52" fill="#F4BF1A" />
      <circle cx="64" cy="64" r="43" fill="#F8D94A" />
      <circle cx="64" cy="64" r="38" stroke="#F6E27A" strokeWidth="3" opacity="0.9" />
      <path d="M64 41V49" stroke="#ED9B1C" strokeWidth="7" strokeLinecap="round" />
      <path d="M64 79V87" stroke="#ED9B1C" strokeWidth="7" strokeLinecap="round" />
      <path
        d="M74 49.5C71.4 46.8 67.9 45.3 63.8 45.3C57.7 45.3 53.3 48.7 53.3 53.4C53.3 58 57 60.3 63.8 61.9C70.6 63.5 74.7 66 74.7 71.1C74.7 76.5 69.8 80.4 63.2 80.4C58.3 80.4 54.3 78.4 51.4 75"
        stroke="#ED9B1C"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function RewardSettings({
  rewardSettings,
  onUpdateRewardGold,
  onUpdateRewardColor,
  autoExpSettings,
  onAutoExpEnabled,
  onUpdateAutoExpThreshold,
}) {
  const [draftValues, setDraftValues] = useState(() =>
    Object.fromEntries(rewardSettings.map((item) => [item.expValue, String(item.gold)]))
  )

  useEffect(() => {
    setDraftValues(Object.fromEntries(rewardSettings.map((item) => [item.expValue, String(item.gold)])))
  }, [rewardSettings])

  const handleChange = (expValue, value) => {
    if (!/^\d*$/.test(value)) return
    setDraftValues((prev) => ({ ...prev, [expValue]: value }))
    if (value !== '') onUpdateRewardGold(expValue, value)
  }

  const handleBlur = (expValue) => {
    if (draftValues[expValue] !== '') return
    setDraftValues((prev) => ({ ...prev, [expValue]: '0' }))
    onUpdateRewardGold(expValue, '0')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-black m-0">獎勵設置</h2>
        <p className="text-xs text-gray-400 m-0">這裡會對應任務的預設級別，完成任務後就能依級別發放不同金幣。</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="m-0 text-sm font-semibold text-black">依子任務自動調整 EXP</p>
            <p className="m-0 mt-1 text-xs leading-5 text-gray-400">
              新增或刪除子任務時，自動切換任務級別。此功能預設關閉。
            </p>
          </div>
          <Switch
            checked={autoExpSettings?.enabled === true}
            onChange={(event) => onAutoExpEnabled(event.target.checked)}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': { color: '#a855f7' },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#a855f7' },
            }}
            inputProps={{ 'aria-label': '依子任務自動調整經驗獎勵' }}
          />
        </div>

        <div className={`mt-4 grid gap-2 sm:grid-cols-2 ${autoExpSettings?.enabled ? '' : 'opacity-45'}`}>
          {AUTO_EXP_TIERS.map((tier) => (
            <label key={tier.expValue} className="flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2.5">
              <span className="text-xs font-semibold text-gray-600">{tier.label} +{tier.expValue}</span>
              <span className="flex items-center gap-2 text-xs text-gray-400">
                至少
                <input
                  type="number"
                  min="1"
                  disabled={!autoExpSettings?.enabled}
                  value={autoExpSettings?.thresholds?.[String(tier.expValue)] ?? tier.defaultSubTaskCount}
                  onChange={(event) => onUpdateAutoExpThreshold(tier.expValue, event.target.value)}
                  className="w-16 rounded-md border border-gray-200 bg-white px-2 py-1 text-center font-bold text-black outline-none focus:border-purple-400 disabled:cursor-not-allowed"
                />
                個
              </span>
            </label>
          ))}
        </div>
        <p className="m-0 mt-3 text-[11px] text-gray-400">未達第一個門檻時維持「一般 +1」；手動選擇仍可使用，下次增減子任務時會重新套用。</p>
      </div>

      <div className="grid gap-3">
        {rewardSettings.map((item) => {
          const tone = TONE_CLASS[item.tone] ?? TONE_CLASS.stone
          return (
            <div
              key={item.expValue}
              className="bg-white rounded-xl px-5 py-4 flex flex-col gap-4 border border-gray-100 hover:border-gray-200 transition-colors sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-50 ring-1 ring-amber-100">
                  <CoinIcon />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-black">{item.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone.badge}`}>
                      task 級別
                    </span>
                  </div>
                  <p className="m-0 mt-1 text-xs text-gray-400">對應任務標籤：{item.label}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:justify-end">
                <label className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-gray-500">
                  級別顏色
                  <input
                    type="color"
                    value={item.color}
                    onChange={(e) => onUpdateRewardColor(item.expValue, e.target.value)}
                    className="h-9 w-11 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
                    aria-label={`${item.label}級別顏色`}
                  />
                </label>
                <span className="text-sm text-gray-500 whitespace-nowrap">完成可得</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={draftValues[item.expValue] ?? String(item.gold)}
                  onChange={(e) => handleChange(item.expValue, e.target.value)}
                  onBlur={() => handleBlur(item.expValue)}
                  className={`w-20 text-sm font-semibold text-black bg-stone-50 border border-gray-200 rounded-lg px-3 py-2 outline-none ring-1 ring-transparent transition-colors text-center ${tone.ring}`}
                />
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700">
                  <CoinIcon />
                  金幣
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
