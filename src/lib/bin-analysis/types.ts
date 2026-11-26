export interface ClassDieRow {
  lotid: string
  wafscribe: string
  dieX: number
  dieY: number
  stage: string
  classBin: number
  classBinName: string
  gdrBin: number
  gdrBinName: string
  gdrFail: boolean
  testerId: string
  testSite: number
  handlerId: string
  chamber: string
  proberId: string
  testedAt: string
}

export interface BinAnalysisFiltersMeta {
  lotids: string[]
  wafscribes: string[]
  classBins: Array<{ value: number; label: string }>
  gdrBins: Array<{ value: number; label: string }>
  testers: string[]
  handlers: string[]
  chambers: string[]
  probers: string[]
}

export interface BinAnalysisSnapshot {
  csvPath: string | null
  loaded: boolean
  loading: boolean
  error: string | null
  loadedAt: string | null
  rowCount: number
  fileBytes: number
  filters: BinAnalysisFiltersMeta
  dies: ClassDieRow[]
}
