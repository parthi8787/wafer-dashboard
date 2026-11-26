export function SampleBanner({
  kind,
  detail,
}: {
  kind: 'probe' | 'bin-analysis'
  detail?: string
}) {
  const title =
    kind === 'probe'
      ? 'Showing sample probe CSV'
      : 'Showing sample Class / GDR CSV'
  const body =
    detail ||
    (kind === 'probe'
      ? 'Replace data/probe/wafer-data.csv (or Load path) with your 90-day extract before production use.'
      : 'Replace data/bin-analysis/class-gdr-dies.csv with your class + GDR die extract (see schema below).')

  return (
    <div className="sample-banner" role="status">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  )
}
