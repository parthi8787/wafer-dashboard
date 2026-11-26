'use client'

import { useMemo, useRef, useEffect, useState } from 'react'

type Cell = {
  x: number
  y: number
  failCount: number
  waferCount: number
  rate: number
}

interface Props {
  cells: Cell[]
  maxFail: number
  waferCount: number
  hotspots: Cell[]
}

function heatColor(t: number) {
  // pass (0) → soft teal; hotspot (1) → deep red
  if (t <= 0) return 'rgba(148, 163, 184, 0.35)'
  const h = 175 - t * 165
  const s = 55 + t * 25
  const l = 48 - t * 18
  return `hsl(${h} ${s}% ${l}%)`
}

export function CommonalityMap({ cells, maxFail, waferCount, hotspots }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<(Cell & { left: number; top: number }) | null>(
    null,
  )

  const bounds = useMemo(() => {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const c of cells) {
      if (c.x < minX) minX = c.x
      if (c.x > maxX) maxX = c.x
      if (c.y < minY) minY = c.y
      if (c.y > maxY) maxY = c.y
    }
    return { minX, maxX, minY, maxY }
  }, [cells])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap || !cells.length) return

    const dpr = window.devicePixelRatio || 1
    const rect = wrap.getBoundingClientRect()
    const width = Math.max(280, Math.floor(rect.width))
    const height = Math.max(280, Math.floor(rect.height))
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const spanX = Math.max(bounds.maxX - bounds.minX, 1)
    const spanY = Math.max(bounds.maxY - bounds.minY, 1)
    const usableW = width - 40
    const usableH = height - 40
    const cell = Math.min(usableW / (spanX + 1), usableH / (spanY + 1))
    const mapW = cell * (spanX + 1)
    const mapH = cell * (spanY + 1)
    const ox = (width - mapW) / 2
    const oy = (height - mapH) / 2

    ctx.beginPath()
    ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.46, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(10,37,64,0.15)'
    ctx.stroke()

    type Hit = Cell & { px: number; py: number; size: number }
    const hit: Hit[] = []
    const denom = Math.max(maxFail, 1)

    for (const c of cells) {
      const px = ox + (c.x - bounds.minX) * cell + cell * 0.5
      const py = oy + (bounds.maxY - c.y) * cell + cell * 0.5
      const size = Math.max(2.5, cell * 0.82)
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(px - size / 2, py - size / 2, size, size, Math.min(3, size / 4))
      } else {
        ctx.rect(px - size / 2, py - size / 2, size, size)
      }
      ctx.fillStyle = heatColor(c.failCount / denom)
      ctx.fill()
      hit.push({ ...c, px, py, size })
    }

    ;(canvas as HTMLCanvasElement & { _hit?: Hit[] })._hit = hit
  }, [cells, bounds, maxFail])

  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current as
      | (HTMLCanvasElement & { _hit?: Array<Cell & { px: number; py: number; size: number }> })
      | null
    if (!canvas?._hit) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    let best: (Cell & { px: number; py: number; size: number }) | null = null
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

  if (!cells.length) {
    return <div className="empty">No die coordinates for commonality map.</div>
  }

  return (
    <div className="ba-map-layout">
      <div className="probe-canvas-wrap ba-canvas" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        />
        {hover && (
          <div className="probe-tooltip" style={{ left: hover.left, top: hover.top }}>
            {`(x=${hover.x}, y=${hover.y})\nfailed on ${hover.failCount}/${hover.waferCount} wafers\n${(hover.rate * 100).toFixed(0)}% commonality`}
          </div>
        )}
      </div>
      <div className="ba-side">
        <p className="panel-meta" style={{ marginBottom: 10 }}>
          Stacked across <strong>{waferCount}</strong> wafers. Color = how often the same
          (x,y) fails.
        </p>
        <div className="legend" style={{ marginBottom: 12 }}>
          <span className="legend-item">
            <span className="swatch" style={{ background: heatColor(0) }} /> rare
          </span>
          <span className="legend-item">
            <span className="swatch" style={{ background: heatColor(0.5) }} /> mid
          </span>
          <span className="legend-item">
            <span className="swatch" style={{ background: heatColor(1) }} /> hotspot
          </span>
        </div>
        <h3 className="panel-title" style={{ fontSize: '0.95rem', marginBottom: 8 }}>
          Top commonality sites
        </h3>
        <div className="ba-table-wrap">
          <table className="ba-table">
            <thead>
              <tr>
                <th>X</th>
                <th>Y</th>
                <th>Fails</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {hotspots.map((h) => (
                <tr key={`${h.x},${h.y}`}>
                  <td className="mono">{h.x}</td>
                  <td className="mono">{h.y}</td>
                  <td className="mono">
                    {h.failCount}/{h.waferCount}
                  </td>
                  <td className="mono">{(h.rate * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
