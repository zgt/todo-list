"use client";

import * as React from "react";

/**
 * Dark-mode-only theme provider.
 * Ensures the `dark` class is always on <html> and provides a static context.
 */

interface ThemeContextProps {
  theme: "dark";
}

const ThemeContext = React.createContext<ThemeContextProps>({ theme: "dark" });

export function ThemeProvider({ children }: React.PropsWithChildren) {
  React.useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <ThemeContext value={{ theme: "dark" }}>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.classList.add("dark");`,
        }}
        suppressHydrationWarning
      />
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  return React.use(ThemeContext);
}

/** @deprecated App is dark-mode only. This is a no-op kept for compatibility. */
export function ThemeToggle() {
  return null;
}
