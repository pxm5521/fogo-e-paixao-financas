export default function Card({ title, action, children, className = '' }) {
  return (
    <div
      className={`rounded-lg border p-4 ${className}`}
      style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
