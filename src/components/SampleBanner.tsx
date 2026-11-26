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
      ? 'Drop your probe CSV into data/probe/ then pick it from the file dropdown and Load.'
      : 'Drop your class/GDR CSV into data/bin-analysis/ then pick it from the file dropdown and Load.')

  return (
    <div className="sample-banner" role="status">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  )
}
