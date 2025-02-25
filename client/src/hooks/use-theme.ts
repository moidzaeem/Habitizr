
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => {
        set({ theme });
        if (typeof window !== "undefined") {
          const root = window.document.documentElement;
          root.classList.remove("light", "dark");
          root.classList.add(theme);
        }
      },
    }),
    {
      name: "theme-storage",
    }
  )
);

// Initialize theme on client side
if (typeof window !== "undefined") {
  const root = window.document.documentElement;
  root.classList.add("light");
}
