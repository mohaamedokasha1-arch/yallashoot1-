"use client";

import { useActionState, type ReactNode } from "react";
import { INITIAL_ACTION_STATE, type ActionState } from "@/lib/admin/action-state";
import { cn } from "@/lib/utils/cn";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Form bound to a server action with pending state and an accessible result message. */
export function ActionForm({
  action,
  children,
  submitLabel,
  className,
  variant = "primary",
  confirmText,
}: {
  action: Action;
  children?: ReactNode;
  submitLabel: string;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  confirmText?: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_ACTION_STATE);
  return (
    <form
      action={formAction}
      className={cn("space-y-3", className)}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
      {state.fieldErrors && Object.keys(state.fieldErrors).length ? (
        <ul className="list-inside list-disc text-sm text-rose-700">
          {Object.entries(state.fieldErrors).map(([k, v]) => (
            <li key={k}>
              {k}: {v}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-bold disabled:cursor-wait disabled:opacity-60",
            variant === "primary" && "bg-[#931800] text-white hover:opacity-85",
            variant === "secondary" && "border border-line bg-surface hover:border-pitch-600",
            variant === "danger" && "bg-rose-700 text-white hover:bg-rose-800",
          )}
        >
          {pending ? "جارٍ التنفيذ…" : submitLabel}
        </button>
        {state.message ? (
          <p role="status" className={cn("text-sm font-semibold", state.ok ? "text-emerald-700" : "text-rose-700")}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
