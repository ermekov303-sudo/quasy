import { useEffect, useRef, type ReactNode } from 'react'

/** Native <dialog>: focus trap, Esc to close and backdrop come from the platform. */
export function Dialog({ open, onClose, title, children, actions }: {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  actions: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const openRef = useRef(open)

  useEffect(() => {
    openRef.current = open
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      // only user-initiated closes (Esc) report back; a programmatic close (e.g. switching to another dialog) must not
      onClose={() => openRef.current && onClose()}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-[var(--radius-card)] bg-surface p-6 text-fg"
    >
      <h2 id="dialog-title" className="text-lg font-bold">{title}</h2>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
      <div className="mt-6 flex flex-col gap-2">{actions}</div>
    </dialog>
  )
}
