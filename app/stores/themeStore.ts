import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Theme {
  type: string;
  color: string;
}

const AvailableThemes: Theme[] = [{
  type: 'black',
  color: '#0B0908'
}, {
  type: 'maroon',
  color: '#5C1A28'
}];

interface ThemeStore {
  themes: Theme[];
  theme: Theme;
  nextTheme: () => void;
  setTheme: (type: string) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      themes: [...AvailableThemes],
      theme: AvailableThemes[0],
      nextTheme: () => {
        const themes = get().themes;
        const activeThemeIndex = themes.findIndex(theme => theme.type === get().theme.type);
        const nextThemeIndex = (activeThemeIndex + 1) % themes.length;
        set(() => ({ theme: themes[nextThemeIndex] }));
      },
      setTheme: (type) => {
        const theme = get().themes.find((t) => t.type === type);
        if (theme) set(() => ({ theme }));
      },
    }),
    {
      name: "theme-storage",
      version: 2,
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);