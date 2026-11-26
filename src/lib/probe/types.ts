export interface ProbeDie {
  x: number
  y: number
  ttime: number | null
  curibin: number | null
  curfbin: number | null
}

export interface ProbeWaferSummary {
  id: string
  lotid: string
  wafscribe: string
  prdct: string
  prgnm: string
  lcode: string
  begindt: string
  enddate: string
  endDay: string
  tempr: number
  total: number
  dieCount: number
  passCount: number
  /** Sum of ttime across all dies (legacy / map use). */
  sumTtime: number
  /** Sum of ttime for good bin only (curibin == 1). */
  sumGoodTtime: number
  minTtime: number
  maxTtime: number
  binCounts: Record<string, number>
}

export interface ProbeFiltersMeta {
  lotids: string[]
  prdcts: string[]
  prgnms: string[]
  lcodes: string[]
  wafscribes: string[]
}

export interface ProbeStoreSnapshot {
  csvPath: string | null
  loaded: boolean
  loading: boolean
  error: string | null
  loadedAt: string | null
  rowCount: number
  fileBytes: number
  dateMin: string | null
  dateMax: string | null
  filters: ProbeFiltersMeta
  wafers: ProbeWaferSummary[]
}
