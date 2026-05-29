"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
  }, [dark]);
  return (
    <button onClick={() => setDark((d) => !d)} className="rounded-md border border-surface-border p-2" aria-label="Toggle theme">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
