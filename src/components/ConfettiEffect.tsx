import { useEffect, useState } from 'react'

interface ConfettiEffectProps {
  active: boolean
  title?: string
  subTitle?: string
  onFinish?: () => void
}

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  rotation: number
  speedX: number
  speedY: number
  shape: 'circle' | 'star' | 'rect'
}

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#eab308']

export default function ConfettiEffect({
  active,
  title = '🎉 太棒啦！攻克错题！',
  subTitle = '获得 +2 颗智慧之星 🌟🌟',
  onFinish,
}: ConfettiEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!active) {
      setVisible(false)
      return
    }

    setVisible(true)
    const newParticles: Particle[] = Array.from({ length: 45 }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // %
      y: -10 - Math.random() * 20, // %
      size: 10 + Math.random() * 14,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      speedX: (Math.random() - 0.5) * 2,
      speedY: 2 + Math.random() * 3,
      shape: Math.random() > 0.5 ? 'star' : Math.random() > 0.5 ? 'rect' : 'circle',
    }))

    setParticles(newParticles)

    const timer = setTimeout(() => {
      setVisible(false)
      onFinish?.()
    }, 2800)

    return () => clearTimeout(timer)
  }, [active, onFinish])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs transition-opacity duration-300"
      onClick={() => {
        setVisible(false)
        onFinish?.()
      }}
    >
      {/* 飘落动画 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute animate-bounce"
            style={{
              left: `${p.x}%`,
              top: `${Math.min(95, p.y + 60)}%`,
              transform: `rotate(${p.rotation}deg)`,
              transition: 'top 2s ease-out',
            }}
          >
            {p.shape === 'star' ? (
              <span style={{ fontSize: `${p.size}px`, color: p.color }}>⭐</span>
            ) : p.shape === 'circle' ? (
              <div
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  borderRadius: '50%',
                }}
              />
            ) : (
              <div
                style={{
                  width: `${p.size * 1.5}px`,
                  height: `${p.size * 0.8}px`,
                  backgroundColor: p.color,
                  borderRadius: '3px',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* 奖励卡片 */}
      <div className="relative mx-4 flex max-w-sm flex-col items-center rounded-3xl bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#fef3c7] text-4xl shadow-inner animate-pulse">
          🌟
        </div>
        <h3 className="mt-4 text-2xl font-bold text-[#1f3b4d]">{title}</h3>
        <p className="mt-2 text-base font-medium text-[#d97706]">{subTitle}</p>
        <button
          type="button"
          className="mt-6 rounded-2xl bg-[#2f5d50] px-6 py-2.5 text-base font-semibold text-white shadow-md hover:bg-[#254b40]"
          onClick={() => {
            setVisible(false)
            onFinish?.()
          }}
        >
          太棒了，继续加油！
        </button>
      </div>
    </div>
  )
}
