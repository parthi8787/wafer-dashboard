import type { AdfDatasetBundle } from '../data/types'

/** Same-origin API route served by Next.js (works hosted and locally). */
const API_PATH = '/api/wafer-track/bundle'

export async function fetchAdfDataset(): Promise<AdfDatasetBundle> {
  const res = await fetch(API_PATH, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`ADF API ${res.status}: ${res.statusText}`)
  }
  return (await res.json()) as AdfDatasetBundle
}

export function adfApiBase() {
  return API_PATH
}
