import LinearProgress from '@mui/material/LinearProgress'
import Button from '@mui/material/Button'

function StatItem({ label, value, bonus }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-gray-400 uppercase text-[0.65rem] mb-1 font-semibold">{label}</span>
      <span className="text-2xl font-extrabold text-black">{value}</span>
      <span className="text-green-text text-xs font-bold">+{bonus}</span>
    </div>
  )
}

export default function StatsCard({ expProgress, stats }) {
  return (
    <div className="bg-white rounded-2xl p-8 flex flex-col gap-5">
      <div>
        <div className="text-gray-400 uppercase text-xs font-semibold tracking-wide mb-2">
          Experience Point
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

      <div>
        <div className="text-gray-400 uppercase text-xs font-semibold tracking-wide mb-2">
          Health Status
        </div>
        <LinearProgress
          variant="determinate"
          value={92}
          sx={{
            height: 8,
            borderRadius: 99,
            bgcolor: '#e5e7eb',
            '& .MuiLinearProgress-bar': {
              bgcolor: '#4ade80',
              borderRadius: 99,
            },
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <StatItem label="ATK" value={stats.atk.value} bonus={stats.atk.bonus} />
        <StatItem label="DEF" value={stats.def.value} bonus={stats.def.bonus} />
        <StatItem label="SPD" value={stats.spd.value} bonus={stats.spd.bonus} />
      </div>

      <Button
        variant="outlined"
        fullWidth
        sx={{
          borderColor: '#e5e7eb',
          color: 'black',
          fontWeight: 600,
          borderRadius: '10px',
          textTransform: 'none',
          py: 1.2,
          '&:hover': { bgcolor: '#f3f4f6', borderColor: '#e5e7eb' },
        }}
      >
        More Stats
      </Button>
    </div>
  )
}
