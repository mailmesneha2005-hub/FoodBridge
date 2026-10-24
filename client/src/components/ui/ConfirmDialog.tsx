import { AlertTriangle } from 'lucide-react'
import { Button } from '../Button'
import { Modal } from './Modal'

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', destructive = false, disabled = false }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel?: string; destructive?: boolean; disabled?: boolean }) {
  return <Modal open={open} onClose={onClose} title={title}><div className="flex gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${destructive ? 'bg-rose-50 text-rose-700' : 'bg-mist text-forest'}`}><AlertTriangle size={19}/></span><p className="pt-1 text-sm leading-6 text-muted">{message}</p></div><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" disabled={disabled} onClick={onClose}>Cancel</Button><Button disabled={disabled} className={destructive ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-200' : ''} onClick={onConfirm}>{confirmLabel}</Button></div></Modal>
}
