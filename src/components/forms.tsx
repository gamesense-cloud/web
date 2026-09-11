"use client";

import { useActionState, useTransition, type ReactNode } from "react";
import type { ActionState } from "@/app/actions";

/**
 * One wrapper for every form on the dashboard. Server actions return
 * { error } or { ok }, and this renders whichever came back plus a pending
 * state on the submit button, so no page needs its own copy of that.
 */
export function ActionForm({
  action,
  submit,
  hint,
  children,
  className = "form",
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  submit: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form className={className} action={formAction}>
      {children}
      {state.error && <div className="form-error">{state.error}</div>}
      {state.ok && <div className="form-ok">{state.ok}</div>}
      <div className="foot">
        {hint && <span className="hint">{hint}</span>}
        <button type="submit" className="btn push" disabled={pending}>
          {pending ? "working…" : submit}
        </button>
      </div>
    </form>
  );
}

/** A button that calls a server action with fixed arguments. */
export function ActionButton({
  run,
  children,
  className = "btn btn-sm",
  confirm,
}: {
  run: () => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  confirm?: string;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const result = await run();
          if (result?.error) window.alert(result.error);
        });
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}

/** A <select> that fires a server action on change. */
export function ActionSelect({
  value,
  options,
  run,
  label,
}: {
  value: string;
  options: string[];
  run: (next: string) => Promise<ActionState>;
  label: string;
}) {
  const [pending, start] = useTransition();

  return (
    <select
      className="field"
      aria-label={label}
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        start(async () => {
          const result = await run(next);
          if (result?.error) window.alert(result.error);
        });
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}
