export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-surface-container-lowest w-full max-w-md rounded-xl shadow-2xl p-8 space-y-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-on-surface">{title}</h2>
        <p className="text-on-surface-variant">{message}</p>
        <div className="flex items-center gap-4 justify-end">
          <button onClick={onCancel} className="px-6 py-2 text-on-surface-variant font-bold text-sm hover:text-on-surface transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-6 py-2 rounded-lg font-bold text-sm bg-error text-on-error hover:opacity-90 transition-all">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
