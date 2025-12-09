/**
 * Design Tokens - Emerald Green Theme
 *
 * Central source of truth for design system values.
 * Reference: DESIGN_SYSTEM.md
 *
 * @see {@link ./DESIGN_SYSTEM.md} for complete design system documentation
 */

export const colors = {
  brand: {
    primary: '#50C878',           // Emerald green - Main brand color
    primaryBright: '#66D99A',     // Light emerald - Hover states
    primaryDim: '#388E3C',        // Dark emerald - Pressed states
  },
  background: {
    deep: '#0A1A1A',              // Deepest background layer
    surface: '#102A2A',           // Cards, panels, elevated surfaces
    hover: '#183F3F',             // Hover state background
    active: '#21716C',            // Active/selected state background
    disabled: '#0A1A1A',          // Disabled element background
  },
  text: {
    primary: '#DCE4E4',           // Main text, high contrast
    muted: '#8FA8A8',             // Secondary text, descriptions
    accent: '#50C878',            // Highlighted text, links
    disabled: '#8FA8A8',          // Disabled text
    placeholder: '#8FA8A8',       // Input placeholders
  },
  border: {
    default: '#164B49',           // Standard borders, dividers
    focused: '#21716C',           // Active/focused borders
    variant: '#164B49',           // Subtle dividers
    transparent: '#164B4900',     // Transparent border
  },
  state: {
    error: '#E57373',
    errorBg: 'rgba(229, 115, 115, 0.25)',
    success: '#50C878',
    successBg: 'rgba(80, 200, 120, 0.25)',
    warning: '#FFD700',
    warningBg: 'rgba(255, 215, 0, 0.25)',
    info: '#66B2FF',
    infoBg: 'rgba(102, 178, 255, 0.25)',
  },
  categories: {
    all: '#50C878',               // Emerald - Primary accent
    work: '#66D99A',              // Light emerald - Professional
    chores: '#BA68C8',            // Magenta - Domestic tasks
    groceries: '#FFD700',         // Gold - Shopping
    personal: '#4DD0E1',          // Cyan - Personal items
  },
  syntax: {
    keyword: '#50C878',           // Emerald - Keywords, constants
    function: '#66D99A',          // Light emerald - Functions
    string: '#99E6B3',            // Pale emerald - String literals
    number: '#FFD700',            // Gold - Numeric values
    comment: '#8FA8A8',           // Muted - Comments
    operator: '#DCE4E4',          // Text primary - Operators
    type: '#66D99A',              // Light emerald - Types, classes
    property: '#DCE4E4',          // Text primary - Properties
  },
  glass: {
    surface: 'rgba(16, 42, 42, 0.7)',        // Web glassmorphism
    surfaceMobile: 'rgba(16, 42, 42, 0.85)', // Mobile approximation
    highlight: 'rgba(102, 217, 154, 0.08)',  // Subtle glow overlay
    border: 'rgba(33, 113, 108, 0.3)',       // Frosted edge
  },
  scrollbar: {
    thumb: '#183F3F',             // Scrollbar thumb
    thumbHover: '#21716C',        // Scrollbar thumb hover
    track: '#102A2A',             // Scrollbar track
  },
} as const;

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
} as const;

export const radius = {
  sm: '8px',       // Small pills, icons
  md: '10px',      // Inputs, small buttons
  lg: '12px',      // Cards, main buttons
  xl: '16px',      // Modal corners
  full: '9999px',  // Pills, circular elements
} as const;

export const shadows = {
  '2xs': '0 2px 10px rgba(0, 0, 0, 0.1)',
  xs: '0 2px 10px rgba(0, 0, 0, 0.1)',
  sm: '0 2px 10px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.2)',
  md: '0 2px 10px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.2)',
  lg: '0 2px 10px rgba(0, 0, 0, 0.2), 0 4px 6px rgba(0, 0, 0, 0.2)',
  xl: '0 2px 10px rgba(0, 0, 0, 0.2), 0 8px 10px rgba(0, 0, 0, 0.2)',
  '2xl': '0 2px 10px rgba(0, 0, 0, 0.5)',
  glow: '0 0 20px rgba(80, 200, 120, 0.4), 0 0 40px rgba(80, 200, 120, 0.2)',
  glowHover: '0 0 30px rgba(102, 217, 154, 0.5), 0 4px 20px rgba(0, 0, 0, 0.3)',
} as const;

export const typography = {
  fontFamily: {
    sans: 'Geist Sans, system-ui, -apple-system, sans-serif',
    mono: 'Geist Mono, ui-monospace, monospace',
  },
  fontSize: {
    display: '3rem',      // 48px
    h1: '2.25rem',        // 36px
    h2: '1.875rem',       // 30px
    h3: '1.5rem',         // 24px
    bodyLarge: '1.125rem', // 18px
    body: '1rem',         // 16px
    bodySmall: '0.875rem', // 14px
    caption: '0.75rem',   // 12px
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.1,
    snug: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '0em',
    wide: '0.01em',
    wider: '0.02em',
  },
} as const;

export const animation = {
  duration: {
    micro: '100ms',   // Checkbox toggle, hover
    fast: '200ms',    // Button press, pill selection
    normal: '300ms',  // Card entrance, modal open
    slow: '500ms',    // Page transitions
  },
  easing: {
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  },
} as const;

export const breakpoints = {
  mobile: '0px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
} as const;

/**
 * Component-specific presets for quick application
 */
export const componentPresets = {
  taskCard: {
    backgroundColor: colors.background.surface,
    textColor: colors.text.primary,
    textColorMuted: colors.text.muted,
    borderColor: colors.border.default,
    hoverBackground: colors.background.hover,
    padding: spacing.md,
    borderRadius: radius.lg,
    shadow: shadows.lg,
  },
  categoryPill: {
    active: {
      backgroundColor: `${colors.brand.primary}33`, // 20% opacity
      borderColor: colors.border.focused,
      textColor: colors.text.accent,
      shadow: shadows.glow,
    },
    inactive: {
      backgroundColor: 'transparent',
      borderColor: colors.border.default,
      textColor: colors.text.muted,
    },
    padding: `${spacing.sm} ${spacing.lg}`,
    borderRadius: radius.full,
  },
  button: {
    primary: {
      backgroundColor: colors.brand.primary,
      textColor: colors.background.deep,
      hoverBackground: colors.brand.primaryBright,
      activeBackground: colors.brand.primaryDim,
    },
    ghost: {
      backgroundColor: 'transparent',
      textColor: colors.text.primary,
      hoverBackground: colors.background.hover,
    },
    destructive: {
      backgroundColor: colors.state.error,
      textColor: colors.text.primary,
    },
    padding: spacing.md,
    borderRadius: radius.md,
  },
  input: {
    backgroundColor: colors.background.surface,
    borderColor: colors.border.default,
    borderColorFocused: colors.border.focused,
    textColor: colors.text.primary,
    placeholderColor: colors.text.placeholder,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  fab: {
    backgroundColor: colors.brand.primary,
    iconColor: colors.background.deep,
    shadow: shadows['2xl'],
    glow: shadows.glowHover,
    size: '64px',
  },
} as const;

/**
 * Tailwind CSS class helpers
 * Use these for consistent styling across components
 */
export const tw = {
  taskCard: 'bg-[#102A2A] rounded-lg p-4 shadow-lg border border-[#164B49]',
  taskCardHover: 'hover:bg-[#183F3F] transition-colors duration-200',

  pillActive: 'bg-[#50C87833] border-2 border-[#21716C] text-[#50C878] rounded-full px-6 py-2',
  pillInactive: 'bg-transparent border-2 border-[#164B49] text-[#8FA8A8] rounded-full px-6 py-2',

  buttonPrimary: 'bg-[#50C878] text-[#0A1A1A] hover:bg-[#66D99A] active:bg-[#388E3C] rounded-md px-4 py-3 font-semibold transition-colors duration-200',
  buttonGhost: 'bg-transparent text-[#DCE4E4] hover:bg-[#183F3F] rounded-md px-4 py-3 transition-colors duration-200',
  buttonDestructive: 'text-[#E57373] font-bold uppercase text-sm',

  input: 'bg-[#102A2A] border border-[#164B49] focus:border-[#21716C] text-[#DCE4E4] placeholder:text-[#8FA8A8] rounded-md px-3 py-2',

  textPrimary: 'text-[#DCE4E4]',
  textMuted: 'text-[#8FA8A8]',
  textAccent: 'text-[#50C878]',

  backgroundDeep: 'bg-[#0A1A1A]',
  backgroundSurface: 'bg-[#102A2A]',
} as const;

/**
 * Type exports for TypeScript autocomplete
 */
export type Color = typeof colors;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Shadow = typeof shadows;
export type Typography = typeof typography;
export type Animation = typeof animation;
export type ComponentPreset = typeof componentPresets;
