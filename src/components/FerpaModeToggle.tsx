"use client";

import { useState } from "react";
import { FERPA_BUILD, isFerpaMode } from "../lib/ferpa";
import { switchFerpaMode, useStore } from "../lib/store";

/** Switch between regular and FERPA mode. Hidden in a school build, which is always FERPA mode. */
export function FerpaModeToggle({ className = "" }: { className?: string }) {
  const { state } = useStore();
  const [busy, setBusy] = useState(false);
  if (FERPA_BUILD) return null;
  const on = isFerpaMode();

  const onToggle = () => {
    if (
      state.accountEmail &&
      !window.confirm(
        `Switching to ${on ? "regular" : "FERPA"} mode signs you out. Your profile stays in your account; log in again to continue.`,
      )
    ) {
      return;
    }
    setBusy(true);
    void switchFerpaMode(!on, state);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={busy}
      onClick={onToggle}
      className={`flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-(--ink) disabled:opacity-60 ${className}`}
    >
      <span>
        FERPA mode
        <span className="block text-xs font-normal text-(--muted)">{on ? "On: extra privacy protections" : "Off"}</span>
      </span>
      <span
        aria-hidden
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-(--accent)" : "bg-(--line)"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`}
        />
      </span>
    </button>
  );
}
