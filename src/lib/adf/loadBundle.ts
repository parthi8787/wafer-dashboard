import type { AdfDatasetBundle } from '@/data/types'
import { loadSampleBundle } from './sampleBundle'
import { hasAdfSqlConfig, loadSqlBundle } from './sqlBundle'

export async function loadAdfBundle(filters?: {
  lotId?: string
  asOf?: string
}): Promise<AdfDatasetBundle> {
  if (hasAdfSqlConfig()) {
    try {
      return await loadSqlBundle(filters)
    } catch (err) {
      console.error('ADF SQL load failed, falling back to sample data', err)
      const sample = loadSampleBundle()
      return {
        ...sample,
        sink: `sample-data (ADF SQL error: ${err instanceof Error ? err.message : 'unknown'})`,
      }
    }
  }
  return loadSampleBundle()
}
