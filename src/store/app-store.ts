import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CalendarMode } from "@/lib/date";
import {
  APP_PREFERENCES_STORAGE_KEY,
  reportStorageReadFailure,
  safeLocalStorage,
} from "@/lib/safe-storage";

export type ThemeMode = "dark" | "light";

interface AppPreferences {
  theme: ThemeMode;
  calendarMode: CalendarMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  setCalendarMode: (mode: CalendarMode) => void;
}

export const useAppStore = create<AppPreferences>()(
  persist(
    (set) => ({
      theme: "dark",
      calendarMode: "jalali",
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      setTheme: (theme) => set({ theme }),
      setCalendarMode: (calendarMode) => set({ calendarMode }),
    }),
    {
      name: APP_PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({
        theme: state.theme,
        calendarMode: state.calendarMode,
      }),
      merge: (persisted, current) => {
        if (persisted === undefined || persisted === null) return current;
        if (
          typeof persisted !== "object" ||
          !("theme" in persisted) ||
          !("calendarMode" in persisted) ||
          !["dark", "light"].includes(String(persisted.theme)) ||
          !["jalali", "gregorian"].includes(String(persisted.calendarMode))
        ) {
          reportStorageReadFailure(APP_PREFERENCES_STORAGE_KEY, "invalid");
          return current;
        }
        return {
          ...current,
          theme: persisted.theme as ThemeMode,
          calendarMode: persisted.calendarMode as CalendarMode,
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error)
          reportStorageReadFailure(APP_PREFERENCES_STORAGE_KEY, "parse");
      },
    },
  ),
);
