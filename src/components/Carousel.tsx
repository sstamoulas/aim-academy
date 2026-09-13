import { useState, useEffect, useRef } from 'react'

// ── Theme tokens ──────────────────────────────────────────────────────────────

const THEMES = {
  dark: {
    arrowCls: 'bg-black/50 hover:bg-black/70 text-white',
    dotActive: 'bg-white w-5 h-2',
    dotInactive: 'bg-white/50 w-2 h-2 hover:bg-white/80',
    progressCls: 'bg-white/70',
    progressTrack: 'bg-white/20',
  },
  light: {
    arrowCls: 'bg-white shadow-md border border-stone-200 text-stone-600 hover:text-sage-700',
    dotActive: 'bg-sage-600 w-5 h-2',
    dotInactive: 'bg-stone-300 w-2 h-2 hover:bg-stone-400',
    progressCls: 'bg-sage-600',
    progressTrack: 'bg-stone-200',
  },
  amber: {
    arrowCls: 'bg-white/20 border border-white/30 text-white hover:bg-white/30',
    dotActive: 'bg-amber-300 w-5 h-2',
    dotInactive: 'bg-white/30 w-2 h-2 hover:bg-white/50',
    progressCls: 'bg-amber-300',
    progressTrack: 'bg-white/20',
  },
} as const

type Theme = keyof typeof THEMES

// ── Props ─────────────────────────────────────────────────────────────────────

interface CarouselProps {
  count: number
  renderSlide: (index: number, isActive: boolean) => React.ReactNode
  /** Auto-advance interval in ms. Omit or 0 to disable. */
  interval?: number
  /** Skip auto-advance when true (e.g. current slide is a video). */
  skipAutoAdvance?: boolean
  /** 'slide' = horizontal strip (default); 'fade' = crossfade in place. */
  mode?: 'slide' | 'fade'
  /** Max visual drag offset in px. Default 150. */
  clampPx?: number
  /** Classes for the outermost container. */
  className?: string
  /** Make the slide strip fill the parent's height (needed when parent has aspect-ratio). */
  fillHeight?: boolean
  /** Color scheme for arrows / dots / progress. Default 'dark'. */
  theme?: Theme
  /** Show prev/next arrow buttons. */
  arrows?: boolean
  /** Dot indicators: 'overlay' = inside carousel, 'below' = outside. */
  dots?: 'overlay' | 'below' | false
  /** "N / total" counter badge (overlay, top-right). */
  counter?: boolean
  /** Progress bar: 'overlay' = inside, 'below' = outside. */
  progressBar?: 'overlay' | 'below' | false
  /** Progress animation duration. Defaults to `interval`. */
  progressInterval?: number
  /** Called whenever the active slide index changes. */
  onCurrentChange?: (index: number) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Carousel({
  count,
  renderSlide,
  interval = 0,
  skipAutoAdvance = false,
  mode = 'slide',
  clampPx = 150,
  className = '',
  fillHeight = false,
  theme = 'dark',
  arrows = false,
  dots = false,
  counter = false,
  progressBar = false,
  progressInterval,
  onCurrentChange,
}: CarouselProps) {
  const tk = THEMES[theme]
  const isSingle = count <= 1
  const progMs = progressInterval ?? interval

  const [current, setCurrent] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const pointerStartX = useRef(0)

  function go(i: number) {
    setCurrent(i)
    onCurrentChange?.(i)
  }
  const prev = () => go((current - 1 + count) % count)
  const next = () => go((current + 1) % count)

  // Auto-advance
  useEffect(() => {
    if (!interval || isSingle || dragging || skipAutoAdvance) return
    const id = setInterval(() => {
      setCurrent(c => {
        const n = (c + 1) % count
        onCurrentChange?.(n)
        return n
      })
    }, interval)
    return () => clearInterval(id)
  }, [interval, isSingle, dragging, skipAutoAdvance, count])

  // Touch
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX }
  function onTouchMove(e: React.TouchEvent) {
    if (isSingle) return
    setDragOffset(e.touches[0].clientX - touchStartX.current)
  }
  function onTouchEnd() {
    if (dragOffset < -50) next(); else if (dragOffset > 50) prev()
    setDragOffset(0)
  }

  // Pointer / mouse drag
  function onPointerDown(e: React.PointerEvent) {
    if (isSingle) return
    pointerStartX.current = e.clientX
    setDragging(true)
    containerRef.current?.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    setDragOffset(e.clientX - pointerStartX.current)
  }
  function onPointerUp() {
    if (!dragging) return
    if (dragOffset < -50) next(); else if (dragOffset > 50) prev()
    setDragOffset(0)
    setDragging(false)
  }

  const clampedOffset = Math.max(-clampPx, Math.min(clampPx, dragOffset))

  const sharedHandlers = {
    onTouchStart, onTouchMove, onTouchEnd,
    onPointerDown, onPointerMove, onPointerUp,
    onMouseLeave: onPointerUp,
  }

  // ── Shared chrome ─────────────────────────────────────────────────────────

  const Arrows = arrows && !isSingle ? (
    <>
      <button onPointerDown={e => e.stopPropagation()} onClick={prev} aria-label="Previous"
        className={`absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-lg transition opacity-0 group-hover:opacity-100 z-10 ${tk.arrowCls}`}>‹</button>
      <button onPointerDown={e => e.stopPropagation()} onClick={next} aria-label="Next"
        className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-lg transition opacity-0 group-hover:opacity-100 z-10 ${tk.arrowCls}`}>›</button>
    </>
  ) : null

  const Counter = counter && !isSingle ? (
    <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-quick font-bold px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition z-10">
      {current + 1} / {count}
    </div>
  ) : null

  function Dots({ pos }: { pos: 'overlay' | 'below' }) {
    if (dots !== pos || isSingle) return null
    return (
      <div className={`flex gap-2 ${pos === 'overlay' ? 'absolute bottom-3 inset-x-0 justify-center' : 'justify-center mt-4'}`}>
        {Array.from({ length: count }).map((_, i) => (
          <button key={i} onPointerDown={e => e.stopPropagation()} onClick={() => go(i)}
            className={`rounded-full transition-all duration-300 ${i === current ? tk.dotActive : tk.dotInactive}`} />
        ))}
      </div>
    )
  }

  function Progress({ pos }: { pos: 'overlay' | 'below' }) {
    if (progressBar !== pos || isSingle || dragging || skipAutoAdvance || !progMs) return null
    return pos === 'overlay' ? (
      <div className={`absolute bottom-0 inset-x-0 h-0.5 ${tk.progressTrack}`}>
        <div key={current} className={`h-full origin-left ${tk.progressCls}`}
          style={{ animation: `progress-bar ${progMs}ms linear forwards` }} />
      </div>
    ) : (
      <div className="flex justify-center mt-3">
        <div className={`w-16 h-0.5 rounded-full overflow-hidden ${tk.progressTrack}`}>
          <div key={current} className={`h-full origin-left rounded-full ${tk.progressCls}`}
            style={{ animation: `progress-bar ${progMs}ms linear forwards` }} />
        </div>
      </div>
    )
  }

  // ── Fade mode ─────────────────────────────────────────────────────────────

  if (mode === 'fade') {
    return (
      <div ref={containerRef} className={`group select-none ${className}`}
        style={{ cursor: isSingle ? 'default' : dragging ? 'grabbing' : 'grab' }}
        {...sharedHandlers}>
        <div className="relative">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className={`transition-opacity duration-500 ${
              i === current ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}>
              {renderSlide(i, i === current)}
            </div>
          ))}
        </div>
        <Dots pos="below" />
        <Progress pos="below" />
      </div>
    )
  }

  // ── Slide mode ────────────────────────────────────────────────────────────

  return (
    <div className={`relative overflow-hidden group ${className}`}>
      <div
        ref={containerRef}
        className={`flex select-none ${fillHeight ? 'h-full' : ''}`}
        style={{
          width: `${count * 100}%`,
          transform: `translateX(calc(-${(current / count) * 100}% + ${clampedOffset / count}px))`,
          transition: dragging ? 'none' : 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)',
          cursor: isSingle ? 'default' : dragging ? 'grabbing' : 'grab',
        }}
        {...sharedHandlers}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex-shrink-0" style={{ width: `${100 / count}%` }}>
            {renderSlide(i, i === current)}
          </div>
        ))}
      </div>
      {Arrows}
      {Counter}
      <Dots pos="overlay" />
      <Progress pos="overlay" />
    </div>
  )
}
