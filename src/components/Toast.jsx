export default function Toast({ toast }) {
  if (!toast) return null
  const bg = toast.type === 'error' ? 'var(--color-danger)' : toast.type === 'success' ? 'var(--color-success)' : 'var(--color-ink)'
  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 max-w-[90vw] text-center"
      style={{ background: bg }}
    >
      {toast.msg}
    </div>
  )
}
