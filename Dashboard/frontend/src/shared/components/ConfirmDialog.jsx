import Modal from './Modal.jsx'

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
}) => (
  <Modal isOpen={open} onClose={onClose} title={title}>
    <p className="text-sm text-muted-foreground">{description}</p>
    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
          variant === 'danger'
            ? 'bg-destructive hover:bg-destructive/90'
            : 'bg-primary hover:bg-primary/90'
        }`}
      >
        {loading ? 'Processing…' : confirmLabel}
      </button>
    </div>
  </Modal>
)

export default ConfirmDialog
