import { AppThemeProvider, useAppTheme } from './appTheme';

export type { AppTheme as RestaurantTheme, ThemeDensity as Density, ThemeMode } from './appTheme';

// Backwards-compatible exports while we migrate to the unified app theme.
export { AppThemeProvider as RestaurantThemeProvider, useAppTheme as useRestaurantTheme } from './appTheme';

// Re-export tokens so existing imports continue to work during refactors.
export { appThemeDark, appThemeLight } from './appTheme';
