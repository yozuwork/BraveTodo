import LinearProgress from '@mui/material/LinearProgress'

export default function HeroStatsCard({ level, expProgress }) {
  return (
    <div className="bg-white rounded-2xl p-5 md:p-8 flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-black text-lg font-extrabold">英雄</span>
          <span className="text-gray-400 text-sm font-semibold">Lv.{level}</span>
        </div>
        <div className="text-gray-400 uppercase text-xs font-semibold tracking-wide mb-2">
          經驗值
        </div>
        <LinearProgress
          variant="determinate"
          value={expProgress}
          sx={{
            height: 8,
            borderRadius: 99,
            bgcolor: '#e5e7eb',
            '& .MuiLinearProgress-bar': {
              bgcolor: '#1f1f1f',
              borderRadius: 99,
            },
          }}
        />
      </div>
    </div>
  )
}
