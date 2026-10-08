"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/**
 * A panel that slides up from the bottom of the screen, within thumb reach
 * on a phone. A modal <dialog>: focus stays inside, Esc and a tap on the
 * backdrop close it.
 */
export default function BottomSheet({ open, onClose, title, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      // The dialog element itself is only hit on the backdrop.
      onClick={(event) => event.target === event.currentTarget && dialogRef.current?.close()}
      className="mx-auto mt-auto mb-0 max-h-[85vh] w-full max-w-2xl rounded-t-2xl bg-background p-0 text-foreground backdrop:bg-black/40 open:animate-[sheet-up_160ms_ease-out]"
    >
      <div className="px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-11 rounded-full px-4 text-muted hover:bg-surface"
          >
            閉じる
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </dialog>
  );
}

/** Large buttons for picking one value; picking one is the whole action. */
export function OptionGrid<Value extends string | number>({
  options,
  selected,
  onSelect,
  columns = 2,
}: {
  options: { value: Value; label: string }[];
  selected: Value;
  onSelect: (value: Value) => void;
  columns?: 2 | 3;
}) {
  return (
    <div role="radiogroup" className={`grid gap-2 ${columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {options.map(({ value, label }) => (
        <button
          key={String(value)}
          type="button"
          role="radio"
          aria-checked={value === selected}
          onClick={() => onSelect(value)}
          className={`min-h-12 rounded-xl px-2 py-2 font-bold ${
            value === selected ? "bg-brand text-white" : "border border-control-border bg-background text-foreground hover:bg-band"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
