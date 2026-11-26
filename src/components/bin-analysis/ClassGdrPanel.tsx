'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Pareto = { bin: number; name: string; count: number; pct: number }
type Corr = {
  classBin: number
  classBinName: string
  gdrBin: number
  gdrBinName: string
  count: number
  pctOfClass: number
}
type MapDie = {
  x: number
  y: number
  classBin: number
  classBinName: string
  gdrBin: number
  gdrBinName: string
  gdrFail: boolean
  wafscribe: string
}

interface Props {
  classPareto: Pareto[]
  gdrPareto: Pareto[]
  selectedClassBin: number | null
  onSelectClassBin: (bin: number | null) => void
  correlations: Corr[]
  mapDies: MapDie[]
  classCount: number
  gdrFailCount: number
}

const GDR_COLORS: Record<number, string> = {
  1: '#1b8a5a',
  42: '#c23b3b',
  8: '#d4652f',
  20: '#7c3aed',
  3: '#0369a1',
  14: '#be185d',
  35: '#4d7c0f',
  99: '#64748b',
}

function colorForGdr(bin: number) {
  if (GDR_COLORS[bin]) return GDR_COLORS[bin]
  return `hsl(${Math.abs(bin * 47) % 360} 55% 42%)`
}

function GdrWaferMap({ dies }: { dies: MapDie[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<(MapDie & { left: number; top: number }) | null>(
    null,
  )

  const bounds = useMemo(() => {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const d of dies) {
      minX = Math.min(minX, d.x)
      maxX = Math.max(maxX, d.x)
      minY = Math.min(minY, d.y)
      maxY = Math.max(maxY, d.y)
    }
    return { minX, maxX, minY, maxY }
  }, [dies])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap || !dies.length) return
    const dpr = window.devicePixelRatio || 1
    const rect = wrap.getBoundingClientRect()
    const width = Math.max(260, Math.floor(rect.width))
    const height = Math.max(260, Math.floor(rect.height))
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
    const cell = Math.min((width - 36) / (spanX + 1), (height - 36) / (spanY + 1))
    const mapW = cell * (spanX + 1)
    const mapH = cell * (spanY + 1)
    const ox = (width - mapW) / 2
    const oy = (height - mapH) / 2

    ctx.beginPath()
    ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.46, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(10,37,64,0.15)'
    ctx.stroke()

    type Hit = MapDie & { px: number; py: number; size: number }
    const hit: Hit[] = []
    for (const d of dies) {
      const px = ox + (d.x - bounds.minX) * cell + cell * 0.5
      const py = oy + (bounds.maxY - d.y) * cell + cell * 0.5
      const size = Math.max(2.5, cell * 0.8)
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(px - size / 2, py - size / 2, size, size, Math.min(3, size / 4))
      } else {
        ctx.rect(px - size / 2, py - size / 2, size, size)
      }
      ctx.fillStyle = colorForGdr(d.gdrBin)
      ctx.fill()
      hit.push({ ...d, px, py, size })
    }
    ;(canvas as HTMLCanvasElement & { _hit?: Hit[] })._hit = hit
  }, [dies, bounds])

  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current as
      | (HTMLCanvasElement & {
          _hit?: Array<MapDie & { px: number; py: number; size: number }>
        })
      | null
    if (!canvas?._hit) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    let best: (MapDie & { px: number; py: number; size: number }) | null = null
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
    setHover({ ...best, left: e.clientX - rect.left, top: e.clientY - rect.top })
  }

  if (!dies.length) return <div className="empty">No dies for selected class bin.</div>

  return (
    <div className="probe-canvas-wrap ba-canvas" ref={wrapRef}>
      <canvas ref={canvasRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      {hover && (
        <div className="probe-tooltip" style={{ left: hover.left, top: hover.top }}>
          {`(x=${hover.x}, y=${hover.y})\nclass ${hover.classBin} ${hover.classBinName}\nGDR ${hover.gdrBin} ${hover.gdrBinName}`}
        </div>
      )}
    </div>
  )
}

export function ClassGdrPanel({
  classPareto,
  gdrPareto,
  selectedClassBin,
  onSelectClassBin,
  correlations,
  mapDies,
  classCount,
  gdrFailCount,
}: Props) {
  const chartData = classPareto.map((b) => ({
    ...b,
    label: `${b.bin}`,
    fill: selectedClassBin === b.bin ? '#0a5c54' : '#0f8a7d',
  }))

  return (
    <div className="ba-class-grid">
      <div>
        <h3 className="panel-title" style={{ fontSize: '0.95rem', marginBottom: 4 }}>
          Class bin pareto
        </h3>
        <p className="panel-meta" style={{ marginBottom: 10 }}>
          Click a class fail bin to map GDR dies at those (x,y) sites.
        </p>
        <div className="chart-wrap" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,37,64,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0a2540', border: 'none', color: '#fff' }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#fff' }}
                formatter={(v, _n, item) => {
                  const p = item?.payload as Pareto
                  return [`${v} (${p.pct.toFixed(1)}%)`, p.name]
                }}
              />
              <Bar
                dataKey="count"
                radius={[6, 6, 0, 0]}
                cursor="pointer"
                onClick={(data) => {
                  const bin = (data as { payload?: Pareto } | undefined)?.payload?.bin
                  if (bin == null) return
                  onSelectClassBin(selectedClassBin === bin ? null : bin)
                }}
              >
                {chartData.map((d) => (
                  <Cell key={d.bin} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <button
          type="button"
          className="btn-secondary"
          style={{ marginTop: 8 }}
          onClick={() => onSelectClassBin(null)}
        >
          Show all class fails
        </button>
      </div>

      <div>
        <h3 className="panel-title" style={{ fontSize: '0.95rem', marginBottom: 4 }}>
          GDR map for{' '}
          {selectedClassBin == null ? 'all class fails' : `class bin ${selectedClassBin}`}
        </h3>
        <p className="panel-meta" style={{ marginBottom: 10 }}>
          {classCount.toLocaleString()} class dies · {gdrFailCount.toLocaleString()} GDR
          fails · color = GDR soft bin
        </p>
        <GdrWaferMap dies={mapDies} />
        <div className="legend" style={{ marginTop: 8 }}>
          {gdrPareto.slice(0, 6).map((g) => (
            <span key={g.bin} className="legend-item">
              <span className="swatch" style={{ background: colorForGdr(g.bin) }} />
              GDR {g.bin} {g.name}
            </span>
          ))}
        </div>
      </div>

      <div className="ba-corr-full">
        <h3 className="panel-title" style={{ fontSize: '0.95rem', marginBottom: 8 }}>
          Class → GDR bin correlation
        </h3>
        <div className="ba-table-wrap">
          <table className="ba-table">
            <thead>
              <tr>
                <th>Class bin</th>
                <th>GDR bin</th>
                <th>Dies</th>
                <th>% of class</th>
              </tr>
            </thead>
            <tbody>
              {correlations.slice(0, 12).map((r) => (
                <tr key={`${r.classBin}-${r.gdrBin}`}>
                  <td>
                    <button
                      type="button"
                      className="ba-linkish"
                      onClick={() => onSelectClassBin(r.classBin)}
                    >
                      {r.classBin} · {r.classBinName}
                    </button>
                  </td>
                  <td className="mono">
                    {r.gdrBin} · {r.gdrBinName}
                  </td>
                  <td className="mono">{r.count.toLocaleString()}</td>
                  <td className="mono">{r.pctOfClass.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
