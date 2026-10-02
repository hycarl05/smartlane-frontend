export default function VmsBoardPreview({ line1, line2, compact = false, label = 'VMS message preview' }) {
  return <div className={`vms-preview-board${compact ? ' vms-preview-board--compact' : ''}`} aria-label={label}>
    <div>{line1 || 'LINE 1'}</div>
    <div>{line2 || 'LINE 2'}</div>
  </div>;
}
