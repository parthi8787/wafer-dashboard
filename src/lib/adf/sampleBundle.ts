import { loadMockAdfBundle } from '@/data/mockAdf'
import type { AdfDatasetBundle } from '@/data/types'

/** Sample/demo dataset when ADF_SQL_CONNECTION_STRING is not set. */
export function loadSampleBundle(): AdfDatasetBundle {
  const bundle = loadMockAdfBundle()
  return {
    ...bundle,
    sink: 'sample-data (set ADF_SQL_CONNECTION_STRING for live ADF/Synapse)',
    pipelineRunId: `sample-${new Date().toISOString().slice(0, 10)}`,
  }
}
