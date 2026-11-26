import fs from 'node:fs'
import path from 'node:path'

export type CsvFileOption = {
  /** Project-relative path suitable for Load API, e.g. data/probe/wafer-data.csv */
  value: string
  /** Filename only for display */
  label: string
  bytes: number
}

function dataRoot() {
  const rootName = process.env.PROBE_DATA_ROOT || 'data'
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), rootName)
}

/**
 * List *.csv files under data/<subdir> (non-recursive).
 * Returns project-relative paths under the data root.
 */
export function listCsvFiles(subdir: string): CsvFileOption[] {
  const root = dataRoot()
  const dir = path.join(root, subdir)
  if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) return []

  const entries = fs.readdirSync(/*turbopackIgnore: true*/ dir, {
    withFileTypes: true,
  })
  const out: CsvFileOption[] = []
  for (const ent of entries) {
    if (!ent.isFile()) continue
    if (!ent.name.toLowerCase().endsWith('.csv')) continue
    const abs = path.join(dir, ent.name)
    const st = fs.statSync(/*turbopackIgnore: true*/ abs)
    const rel = path
      .join(process.env.PROBE_DATA_ROOT || 'data', subdir, ent.name)
      .replace(/\\/g, '/')
    out.push({
      value: rel,
      label: ent.name,
      bytes: st.size,
    })
  }
  return out.sort((a, b) => a.label.localeCompare(b.label))
}

/** Map an absolute csvPath back to a dropdown value when possible. */
export function toRelativeCsvOption(
  absolutePath: string | null | undefined,
  options: CsvFileOption[],
): string {
  if (!absolutePath) return options[0]?.value || ''
  const normalized = absolutePath.replace(/\\/g, '/')
  const hit = options.find(
    (o) =>
      normalized.endsWith(`/${o.value}`) ||
      normalized.endsWith(`/${o.label}`) ||
      normalized.includes(`/${o.value.split('/').slice(-2).join('/')}`),
  )
  return hit?.value || options[0]?.value || ''
}
