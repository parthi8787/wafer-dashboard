'use client'

import { useEffect, useRef, useState } from 'react'

export function LotMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const allSelected = options.length > 0 && selected.length === options.length
  const label =
    selected.length === 0
      ? 'All lots'
      : selected.length === 1
        ? selected[0]
        : `${selected.length} lots`

  function toggle(lot: string) {
    if (selected.length === 0) {
      // leaving All → this lot only
      onChange([lot])
      return
    }
    if (selected.includes(lot)) {
      const next = selected.filter((x) => x !== lot)
      onChange(next)
    } else {
      onChange([...selected, lot])
    }
  }

  function toggleAll() {
    // empty selection means All (no lot filter)
    onChange([])
  }

  return (
    <div className="lot-multi" ref={rootRef}>
      <button
        type="button"
        className="lot-multi-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {label}
        <span className="lot-multi-caret">▾</span>
      </button>
      {open && (
        <div className="lot-multi-menu">
          <label className="lot-multi-item lot-multi-all">
            <input
              type="checkbox"
              checked={selected.length === 0 || allSelected}
              onChange={toggleAll}
            />
            <span>All lots</span>
          </label>
          <div className="lot-multi-list">
            {options.map((lot) => (
              <label key={lot} className="lot-multi-item">
                <input
                  type="checkbox"
                  checked={selected.length === 0 || selected.includes(lot)}
                  onChange={() => toggle(lot)}
                />
                <span className="mono">{lot}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
