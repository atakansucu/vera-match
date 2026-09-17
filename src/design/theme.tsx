import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { palette, radii, spacing, typography, type ColorScheme, type ThemeColors } from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
}

function buildTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: palette[scheme],
    spacing,
    radii,
    typography,
  };
}

const ThemeContext = createContext<Theme>(buildTheme('light'));

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme = systemScheme === 'dark' ? 'dark' : 'light';
  const theme = useMemo(() => buildTheme(scheme), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
