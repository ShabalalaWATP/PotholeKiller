"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Dialog({ title, onClose, children, wide = false }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { dialog?.close(); };
  }, []);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.scrollTop = 0;
    const heading = dialog.querySelector("h2");
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }, [title]);
  return <dialog ref={ref} className={`dialog ${wide ? "dialog-wide" : ""}`} aria-label={title}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-inner">
      <button className="icon-button close-dialog" aria-label="Close" onClick={onClose}><X size={22} /></button>
      {children}
    </div>
  </dialog>;
}
