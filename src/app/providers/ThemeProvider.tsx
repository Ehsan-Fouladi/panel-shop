import { type ReactNode, useEffect } from "react";
import { useAppStore } from "@/store/app-store";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.doranTheme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return children;
}
