'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProbeDie } from '@/lib/probe/types'

const BIN_COLORS: Record<number, string> = {
  1: '#1b8a5a',
  93: '#c23b3b',
  42: '#d4652f',
  14: '#7c3aed',
  3: '#0369a1',
  20: '#be185d',
  8: '#4d7c0f',
  99: '#334155',
}

function colorForBin(bin: number | null) {
  if (bin == null) return '#94a3b8'
  if (BIN_COLORS[bin]) return BIN_COLORS[bin]
  const hue = Math.abs(Number(bin) * 47) % 360
  return `hsl(${hue} 55% 42%)`
}

function colorForTtime(ttime: number | null, min: number, max: number) {
  if (ttime == null || !Number.isFinite(ttime)) return '#94a3b8'
  const span = Math.max(max - min, 1e-6)
  const t = Math.min(1, Math.max(0, (ttime - min) / span))
  const h = 175 - t * 145
  const s = 60 + t * 15
  const l = 42 - t * 8
  return `hsl(${h} ${s}% ${l}%)`
}

interface WaferMeta {
  id: string
  lotid: string
  wafscribe: string
  dieCount: number
  yieldPct: number
  avgTtime: number
}

interface Props {
  wafer: WaferMeta | null
  dies: ProbeDie[] | null
  mode?: 'bin' | 'ttime'
}

export function ProbeWaferMap({ wafer, dies, mode = 'bin' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<
    (ProbeDie & { left: number; top: number; px: number; py: number; size: number }) | null
  >(null)

  const stats = useMemo(() => {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    let minT = Infinity
    let maxT = -Infinity
    for (const d of dies || []) {
      if (d.x < minX) minX = d.x
      if (d.x > maxX) maxX = d.x
      if (d.y < minY) minY = d.y
      if (d.y > maxY) maxY = d.y
      if (d.ttime != null && d.ttime < minT) minT = d.ttime
      if (d.ttime != null && d.ttime > maxT) maxT = d.ttime
    }
    if (!Number.isFinite(minT)) {
      minT = 0
      maxT = 1
    }
    return { minX, maxX, minY, maxY, minT, maxT }
  }, [dies])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap || !dies?.length) return

    const dpr = window.devicePixelRatio || 1
    const rect = wrap.getBoundingClientRect()
    const width = Math.max(320, Math.floor(rect.width))
    const height = Math.max(280, Math.floor(rect.height))
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const spanX = Math.max(stats.maxX - stats.minX, 1)
    const spanY = Math.max(stats.maxY - stats.minY, 1)
    const usableW = width - 56
    const usableH = height - 56
    const cell = Math.min(usableW / (spanX + 1), usableH / (spanY + 1))
    const mapW = cell * (spanX + 1)
    const mapH = cell * (spanY + 1)
    const ox = (width - mapW) / 2
    const oy = (height - mapH) / 2

    ctx.beginPath()
    ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.46, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(10,37,64,0.15)'
    ctx.lineWidth = 1
    ctx.stroke()

    type Hit = ProbeDie & { px: number; py: number; size: number }
    const hit: Hit[] = []
    for (const d of dies) {
      const px = ox + (d.x - stats.minX) * cell + cell * 0.5
      const py = oy + (stats.maxY - d.y) * cell + cell * 0.5
      const size = Math.max(2.2, cell * 0.78)
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(px - size / 2, py - size / 2, size, size, Math.min(3, size / 4))
      } else {
        ctx.rect(px - size / 2, py - size / 2, size, size)
      }
      ctx.fillStyle =
        mode === 'ttime'
          ? colorForTtime(d.ttime, stats.minT, stats.maxT)
          : colorForBin(d.curibin)
      ctx.fill()
      hit.push({ ...d, px, py, size })
    }

    ;(canvas as HTMLCanvasElement & { _hit?: Hit[] })._hit = hit
  }, [dies, mode, stats])

  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current as
      | (HTMLCanvasElement & {
          _hit?: Array<ProbeDie & { px: number; py: number; size: number }>
        })
      | null
    if (!canvas?._hit) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    let best: (ProbeDie & { px: number; py: number; size: number }) | null = null
    let bestDist = 10
    for (const d of canvas._hit) {
      const dist = Math.hypot(d.px - x, d.py - y)
      if (dist < Math.max(bestDist, d.size * 0.65)) {
        best = d
        bestDist = dist
      }
    }
    if (!best) {
      setHover(null)
      return
    }
    setHover({
      ...best,
      left: e.clientX - rect.left,
      top: e.clientY - rect.top,
    })
  }

  if (!wafer) {
    return (
      <div className="empty">Select a wafer from the table to render its die map.</div>
    )
  }

  if (!dies?.length) {
    return <div className="empty">Loading die sites for {wafer.wafscribe}…</div>
  }

  return (
    <div className="probe-wafer-stage">
      <div className="probe-wafer-toolbar">
        <div>
          <strong className="mono">{wafer.lotid}</strong>
          <span className="muted"> · </span>
          <span className="mono">{wafer.wafscribe}</span>
        </div>
        <div className="mono muted small">
          {wafer.dieCount.toLocaleString()} die · yield {wafer.yieldPct.toFixed(1)}% · avg
          ttime {wafer.avgTtime.toFixed(1)}
        </div>
      </div>
      <div className="probe-canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        />
        {hover && (
          <div className="probe-tooltip" style={{ left: hover.left, top: hover.top }}>
            {`x=${hover.x}  y=${hover.y}\nbin=${hover.curibin}  fbin=${hover.curfbin}\nttime=${hover.ttime?.toFixed?.(2) ?? '—'}`}
          </div>
        )}
      </div>
      <div className="legend">
        {mode === 'bin' ? (
          <>
            <span className="legend-item">
              <span className="swatch" style={{ background: BIN_COLORS[1] }} /> pass bin 1
            </span>
            <span className="legend-item">
              <span className="swatch" style={{ background: BIN_COLORS[93] }} /> bin 93
            </span>
            <span className="legend-item">
              <span className="swatch" style={{ background: BIN_COLORS[42] }} /> other fail
              bins
            </span>
          </>
        ) : (
          <>
            <span className="legend-item">
              <span
                className="swatch"
                style={{ background: colorForTtime(stats.minT, stats.minT, stats.maxT) }}
              />{' '}
              low ttime
            </span>
            <span className="legend-item">
              <span
                className="swatch"
                style={{ background: colorForTtime(stats.maxT, stats.minT, stats.maxT) }}
              />{' '}
              high ttime
            </span>
          </>
        )}
      </div>
    </div>
  )
}
