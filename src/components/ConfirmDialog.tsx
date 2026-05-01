import { AlertTriangle, X } from 'lucide-react'
import { useEffect } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = '取消',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="confirm-backdrop" onClick={onClose} role="presentation">
      <section
        className="confirm-dialog"
        aria-label={title}
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="confirm-dialog__header">
          <div className="confirm-dialog__mark" aria-hidden="true">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="eyebrow">Danger Zone</p>
            <h2>{title}</h2>
          </div>
          <button className="ghost-icon" onClick={onClose} type="button" aria-label="关闭">
            <X size={18} />
          </button>
        </header>

        <div className="confirm-dialog__body">
          <p>{description}</p>
        </div>

        <footer className="confirm-dialog__actions">
          <button className="text-button" type="button" onClick={onClose}>
            {cancelLabel}
          </button>
          <button className="primary-button danger-button" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  )
}
