'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className="modal" onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === dialog.current) onClose(); }} aria-labelledby="modal-title">
    <div className="modal-content"><div className="modal-heading"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="닫기" onClick={onClose}><X size={20} /></button></div>{children}</div>
  </dialog>;
}
