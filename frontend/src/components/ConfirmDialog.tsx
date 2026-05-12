import { AlertTriangle } from 'lucide-react';
import { Button } from './forms';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  isWorking?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  isWorking = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="space-y-4">
        <div className="flex gap-3 rounded-2xl border border-red-400/25 bg-red-400/10 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-400/15 text-red-200">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-black text-red-100">This action cannot be undone</div>
            <p className="mt-1 text-xs leading-5 text-slate-300">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
          <Button type="button" onClick={onCancel} disabled={isWorking}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isWorking}
            className="border-red-300/50 bg-red-500/15 text-red-50 hover:border-red-200 hover:bg-red-500/25"
          >
            {isWorking ? 'Deleting...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
