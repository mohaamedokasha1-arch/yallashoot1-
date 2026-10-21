"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { SKIN_STORAGE_KEY } from "@/lib/site";

const EVENT = "ys-skin-change";

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== SKIN_STORAGE_KEY) return;
    document.documentElement.classList.toggle("night", e.newValue === "night");
    onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const isNight = () => document.documentElement.classList.contains("night");
const serverSnapshot = () => false;

/** Day / night skin switch (the moon / sun button of the header). */
export function ThemeToggle() {
  const night = useSyncExternalStore(subscribe, isNight, serverSnapshot);
  return (
    <button
      type="button"
      className="ys-hbtn ys-theme-btn"
      aria-pressed={night}
      aria-label="الوضع الليلي"
      title={night ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
      onClick={() => {
        const next = !isNight();
        document.documentElement.classList.toggle("night", next);
        try {
          localStorage.setItem(SKIN_STORAGE_KEY, next ? "night" : "day");
        } catch {
          // Storage may be unavailable (private mode); the switch still works for this page.
        }
        window.dispatchEvent(new Event(EVENT));
      }}
    >
      <Moon aria-hidden="true" className="icon-moon" />
      <Sun aria-hidden="true" className="icon-sun" />
    </button>
  );
}
