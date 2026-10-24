"use client";

/* eslint-disable @next/next/no-img-element -- signed URL of the proof, shown as is (no pixel filter) */
import { X } from "lucide-react";
import { useRef } from "react";

/**
 * A proof photo that opens enlarged in the page (native modal dialog: Esc closes it, focus
 * stays inside while open and returns to the thumbnail afterwards).
 */
export function PhotoViewer({ src, alt, label, className = "", children }: { src: string; alt: string; label: string; className?: string; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={trigger} type="button" className={className} aria-label={label} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={dialog}
        aria-label={alt}
        className="m-auto max-h-[100dvh] max-w-[100vw] bg-transparent p-3 text-fg backdrop:bg-black/85"
        onClose={() => trigger.current?.focus()}
        // a click on the dark backdrop (outside the content) closes it too
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <div className="flex flex-col items-end gap-2">
          <button type="button" autoFocus className="btn-secondary min-h-11" onClick={() => dialog.current?.close()}>
            <X size={18} aria-hidden /> Fechar
          </button>
          <img src={src} alt={alt} className="max-h-[calc(100dvh-6rem)] max-w-[calc(100vw-1.5rem)] rounded-sm object-contain" />
        </div>
      </dialog>
    </>
  );
}
