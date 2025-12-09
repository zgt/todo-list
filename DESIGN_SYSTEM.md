# Design System & Visual Language

> A comprehensive design system for the Todo List cross-platform app (Next.js + Expo)

## Design Philosophy

**Glassmorphic Serenity**: A modern design language featuring:
- Frosted glass effects with translucent surfaces
- Soft glow effects and ambient lighting
- Depth through layering and shadows
- Calm, organic color palette based on teal/emerald hues
- Tactile, interactive elements with smooth animations

---

## Color System

### Color Palette

Built using **HEX color values** from the Emerald Green theme with **OKLCH conversions** for advanced use cases.

#### Core Brand Colors

```css
/* Primary - Emerald accent */
Primary: #50C878                    /* Emerald green - Main brand color */
Primary Bright: #66D99A             /* Brightened for hover/glow effects */
Primary Dim: #388E3C                /* Darkened for pressed states */

/* Text Colors */
Text Primary: #DCE4E4               /* Main text, high contrast */
Text Muted: #8FA8A8                 /* Secondary text, descriptions */
Text Accent: #50C878                /* Highlighted text, links */

/* Surface Colors - Layered depth */
Background Deep: #0A1A1A            /* Deepest background layer */
Surface Base: #102A2A               /* Cards, elevated surfaces */
Surface Hover: #183F3F              /* Hover state for interactive elements */
Surface Active: #21716C             /* Active/selected state */

/* Borders */
Border Default: #164B49             /* Standard borders */
Border Focused: #21716C             /* Focus/active borders */
Border Variant: #164B49             /* Subtle dividers */
```

#### Semantic Colors

| Color Role | Light Mode | Dark Mode (Primary) | Hex Value | Usage |
|------------|------------|---------------------|-----------|-------|
| **Background** | `oklch(0.98 0.01 145)` | `#0A1A1A` | `rgb(10, 26, 26)` | Base canvas, app background |
| **Surface** | `oklch(0.95 0.03 145)` | `#102A2A` | `rgb(16, 42, 42)` | Cards, panels, elevated surfaces |
| **Foreground** | `oklch(0.15 0.05 145)` | `#DCE4E4` | `rgb(220, 228, 228)` | Primary text, icons |
| **Primary** | `oklch(0.55 0.15 145)` | `#50C878` | `rgb(80, 200, 120)` | CTAs, active elements, emerald accent |
| **Primary Bright** | `oklch(0.65 0.18 145)` | `#66D99A` | `rgb(102, 217, 154)` | Hover states, glow effects |
| **Muted** | `oklch(0.95 0.03 145)` | `#102A2A` | `rgb(16, 42, 42)` | Task cards, secondary surfaces |
| **Muted Foreground** | `oklch(0.45 0.05 145)` | `#8FA8A8` | `rgb(143, 168, 168)` | Descriptions, metadata, placeholders |
| **Border** | `oklch(0.92 0.02 145)` | `#164B49` | `rgb(22, 75, 73)` | Dividers, outlines |
| **Border Focused** | `oklch(0.35 0.12 145)` | `#21716C` | `rgb(33, 113, 108)` | Active/focused borders |
| **Destructive** | `oklch(0.6368 0.2078 25.3313)` | `#E57373` | `rgb(229, 115, 115)` | Delete, errors, warnings |
| **Success** | `oklch(0.55 0.15 145)` | `#50C878` | `rgb(80, 200, 120)` | Success states, confirmations |
| **Warning** | `oklch(0.75 0.15 90)` | `#FFD700` | `rgb(255, 215, 0)` | Warnings, cautions |
| **Info** | `oklch(0.65 0.15 240)` | `#66B2FF` | `rgb(102, 178, 255)` | Info messages, hints |

#### State Colors

```css
/* Interactive States */
Hover: #183F3F          /* Element hover background */
Active: #21716C         /* Element active/pressed background */
Selected: #183F3F       /* Selected item background */
Disabled: #0A1A1A       /* Disabled element background */

/* Feedback States */
Error: #E57373          /* Error text and borders */
Error Background: rgba(229, 115, 115, 0.25)
Success: #50C878        /* Success text and borders */
Success Background: rgba(80, 200, 120, 0.25)
Warning: #FFD700        /* Warning text and borders */
Warning Background: rgba(255, 215, 0, 0.25)
Info: #66B2FF           /* Info text and borders */
Info Background: rgba(102, 178, 255, 0.25)
```

#### Category Colors (Pills/Tags)

```css
All: #50C878            /* Emerald - Primary accent */
Work: #66D99A           /* Light emerald - Professional */
Chores: #BA68C8         /* Magenta - Domestic */
Groceries: #FFD700      /* Gold - Shopping */
Personal: #4DD0E1       /* Cyan - Personal */
```

#### Syntax Highlighting Colors

For code blocks and technical UI elements:

```css
Keyword: #50C878        /* Emerald - Keywords, constants */
Function: #66D99A       /* Light emerald - Functions, constructors */
String: #99E6B3         /* Pale emerald - String literals */
Number: #FFD700         /* Gold - Numeric values */
Comment: #8FA8A8        /* Muted - Comments (italic) */
Operator: #DCE4E4       /* Text primary - Operators */
Type: #66D99A           /* Light emerald - Types, classes */
Property: #DCE4E4       /* Text primary - Properties */
Escape: #FFD700         /* Gold - Escape sequences */
```

### Gradients

```css
/* Deep ambient background gradient */
background: linear-gradient(
  135deg,
  #0A1A1A 0%,           /* Background deep */
  #102A2A 50%,          /* Surface base */
  #0A1A1A 100%          /* Background deep */
);

/* Subtle surface gradient for cards */
card-gradient: linear-gradient(
  145deg,
  #102A2A 0%,           /* Surface base */
  #0A1A1A 100%          /* Background deep */
);

/* Emerald glow gradient for active states */
glow-gradient: radial-gradient(
  ellipse at center,
  rgba(80, 200, 120, 0.4) 0%,   /* Primary with opacity */
  rgba(80, 200, 120, 0.15) 50%,
  transparent 100%
);

/* Bright emerald glow for hover */
glow-hover: radial-gradient(
  ellipse at center,
  rgba(102, 217, 154, 0.5) 0%,  /* Primary bright with opacity */
  rgba(102, 217, 154, 0.2) 50%,
  transparent 100%
);
```

### Glass Effects

```css
/* Frosted glass overlay (web only - backdrop-filter) */
glass-surface: {
  background: rgba(16, 42, 42, 0.7);     /* Surface base with transparency */
  backdrop-filter: blur(12px) saturate(150%);
  border: 1px solid rgba(33, 113, 108, 0.3);  /* Border focused */
}

/* Approximation for React Native (no backdrop-filter) */
glass-surface-mobile: {
  background: rgba(16, 42, 42, 0.85);    /* Higher opacity */
  shadowColor: #000;
  shadowOffset: { width: 0, height: 4 };
  shadowOpacity: 0.3;
  shadowRadius: 12;
}
```

---

## Typography

### Font Families

**Primary**: Geist Sans
- Clean, geometric sans-serif
- Excellent readability at all sizes
- Versatile weight range (400-700)

**Monospace**: Geist Mono
- For code snippets, IDs, technical data
- Tabular number alignment

### Type Scale

| Usage | Size (rem/px) | Weight | Line Height | Letter Spacing |
|-------|---------------|--------|-------------|----------------|
| **Display** | 3rem / 48px | 700 | 1.1 | -0.02em |
| **H1** | 2.25rem / 36px | 700 | 1.2 | -0.02em |
| **H2** | 1.875rem / 30px | 600 | 1.3 | -0.01em |
| **H3** | 1.5rem / 24px | 600 | 1.4 | 0em |
| **Body Large** | 1.125rem / 18px | 400 | 1.6 | 0em |
| **Body** | 1rem / 16px | 400 | 1.5 | 0em |
| **Body Small** | 0.875rem / 14px | 400 | 1.5 | 0.01em |
| **Caption** | 0.75rem / 12px | 500 | 1.4 | 0.02em |

### Font Usage Patterns

```tsx
/* Page Title */
<Text className="text-5xl font-bold">
  Todo <Text className="text-primary">List</Text>
</Text>

/* Task Title */
<Text className="text-lg font-semibold">Complete the project proposal</Text>

/* Task Description */
<Text className="text-sm text-muted-foreground">Review and finalize by Friday</Text>

/* Category Pill */
<Text className="text-sm font-medium">Work</Text>

/* Button Text */
<Text className="text-base font-semibold">Add Task</Text>
```

---

## Spacing & Layout

### Spacing Scale

Uses 0.25rem (4px) base unit:

```
1  → 0.25rem  → 4px
2  → 0.5rem   → 8px
3  → 0.75rem  → 12px
4  → 1rem     → 16px
6  → 1.5rem   → 24px
8  → 2rem     → 32px
12 → 3rem     → 48px
16 → 4rem     → 64px
```

### Layout Grid

- **Mobile**: 16px side padding, full width
- **Web**: Max-width 640px centered container
- **Card Spacing**: 8px vertical gaps between cards
- **Component Padding**: 16px internal padding
- **Section Spacing**: 24-32px between major sections

### Safe Areas

```tsx
/* Mobile - Always wrap in SafeAreaView */
<SafeAreaView className="bg-background">
  <View className="h-full w-full p-4">
    {/* Content */}
  </View>
</SafeAreaView>
```

---

## Components

### Task Cards

**Glassmorphic card** with depth and glow effects:

```tsx
<View className="
  bg-muted
  rounded-lg
  p-4
  flex flex-row items-center gap-4
  shadow-lg
">
  {/* Checkbox */}
  <Pressable>
    <View className="
      h-6 w-6
      rounded
      border-2 border-primary
      bg-primary
      items-center justify-center
    ">
      <Text className="text-background text-lg">✓</Text>
    </View>
  </Pressable>

  {/* Content */}
  <View className="grow">
    <Text className="text-foreground text-lg font-semibold">
      Task Title
    </Text>
    <Text className="text-muted-foreground mt-1 text-sm">
      Task description
    </Text>
  </View>
</View>
```

**Visual Properties**:
- Background: Muted surface with subtle translucency
- Border Radius: 12px (rounded-lg)
- Padding: 16px all sides
- Shadow: Depth layer with soft spread

### Category Pills

**Rounded pill buttons** with glow on active state:

```tsx
/* Active State */
<Pressable className="
  bg-primary/20
  border-2 border-primary
  rounded-full
  px-6 py-2
  shadow-[0_0_20px_rgba(45,212,191,0.4)]
">
  <Text className="text-primary text-sm font-medium">All</Text>
</Pressable>

/* Inactive State */
<Pressable className="
  bg-transparent
  border-2 border-border
  rounded-full
  px-6 py-2
">
  <Text className="text-muted-foreground text-sm font-medium">Work</Text>
</Pressable>
```

### Floating Action Button (FAB)

**Glowing circular button** with ambient light effect:

```tsx
<Pressable className="
  absolute bottom-8 right-8
  w-16 h-16
  bg-primary
  rounded-full
  items-center justify-center
  shadow-[0_0_30px_rgba(45,212,191,0.5)]
  shadow-2xl
">
  <Text className="text-primary-foreground text-3xl">+</Text>
</Pressable>
```

**Visual Properties**:
- Size: 64x64px
- Glow: 30px spread with primary color at 50% opacity
- Icon: 24px+, centered
- Elevation: Maximum shadow depth

### Checkbox

**Custom checkbox** with smooth transitions:

```tsx
/* Unchecked */
<View className="
  h-6 w-6
  rounded
  border-2 border-foreground
  bg-transparent
" />

/* Checked */
<View className="
  h-6 w-6
  rounded
  border-2 border-primary
  bg-primary
  items-center justify-center
">
  <Text className="text-background text-lg">✓</Text>
</View>
```

**States**:
- Unchecked: 2px border, transparent fill
- Checked: Primary background, white checkmark
- Hover (web): Slight scale increase
- Active: 90% opacity

### Text Inputs

**Minimal input** with subtle border:

```tsx
<TextInput className="
  border-input
  bg-background
  text-foreground
  rounded-md
  border
  px-3 py-2
  text-lg
" />
```

### Buttons

**Primary CTA button**:

```tsx
<Pressable className="
  bg-primary
  rounded-md
  p-3
  flex items-center
">
  <Text className="text-primary-foreground font-semibold">
    Add Task
  </Text>
</Pressable>
```

**Text Button** (destructive):

```tsx
<Pressable>
  <Text className="text-destructive font-bold uppercase text-sm">
    Delete
  </Text>
</Pressable>
```

---

## Visual Effects

### Glassmorphism

**Core glass effect** (CSS - web only):

```css
.glass-card {
  background: rgba(26, 77, 46, 0.15);
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px) saturate(180%);
  border: 1px solid rgba(45, 212, 191, 0.3);
}
```

**Approximation for React Native**:

```tsx
/* Use semi-transparent backgrounds + shadow layers */
<View className="bg-muted/80 shadow-lg" />
```

### Glow Effects

**Primary glow** (active elements):

```css
box-shadow:
  0 0 20px rgba(45, 212, 191, 0.4),  /* Inner glow */
  0 0 40px rgba(45, 212, 191, 0.2);  /* Outer glow */
```

**Ambient glow** (FAB, active pills):

```css
box-shadow:
  0 0 30px rgba(45, 212, 191, 0.5),
  0 4px 20px rgba(0, 0, 0, 0.3);
```

### Shadows

| Level | Elevation | Shadow Value | Usage |
|-------|-----------|--------------|-------|
| **2xs** | 1 | `0 2px 10px rgba(0,0,0,0.03)` | Hover states |
| **sm** | 2 | `0 2px 10px rgba(0,0,0,0.05)` | Cards, inputs |
| **md** | 3 | `0 2px 10px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.05)` | Modals |
| **lg** | 4 | `0 2px 10px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.05)` | Popovers |
| **2xl** | 5 | `0 2px 10px rgba(0,0,0,0.13)` | FAB, overlays |

### Border Radius

```
sm  → 8px   → Small pills, icons
md  → 10px  → Inputs, small buttons
lg  → 12px  → Cards, main buttons
xl  → 16px  → Modal corners
full → 9999px → Pills, FAB
```

---

## Animations & Interactions

### Timing Functions

```css
ease-smooth: cubic-bezier(0.4, 0, 0.2, 1)  /* Default */
ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)  /* Playful bounce */
ease-emphasized: cubic-bezier(0.2, 0, 0, 1)  /* Strong acceleration */
```

### Durations

- **Micro**: 100ms - Checkbox toggle, hover
- **Fast**: 200ms - Button press, pill selection
- **Normal**: 300ms - Card entrance, modal open
- **Slow**: 500ms - Page transitions

### Interactive States

**Button Press**:
```tsx
// Scale down slightly on press
<Pressable
  className="..."
  style={({ pressed }) => [
    { opacity: pressed ? 0.9 : 1 },
    { transform: [{ scale: pressed ? 0.98 : 1 }] }
  ]}
>
```

**Checkbox Toggle**:
- Transition: 200ms ease-smooth
- Scale: 1 → 1.1 → 1 (bounce)
- Opacity: Background fade-in

**Card Hover** (web):
```css
transition: all 200ms ease-smooth;

&:hover {
  transform: translateY(-2px);
  box-shadow: /* Increase shadow depth */;
}
```

---

## Dark Mode

**Strategy**: Single design system, automatic dark mode via CSS variables

### Color Adaptations

| Element | Light | Dark | Notes |
|---------|-------|------|-------|
| Background gradient | Light teal → white | Deep teal → near black | Maintains ambient feel |
| Glass cards | White translucent | Dark translucent | More opacity in dark |
| Glow intensity | Subtle (30% opacity) | Stronger (50% opacity) | Glows pop more in dark |
| Text contrast | High contrast | Medium contrast | Prevents eye strain |
| Shadows | Soft, subtle | Deeper, more pronounced | Enhances depth |

### Implementation

```tsx
/* Automatic via ThemeProvider (Next.js) */
<ThemeProvider>
  <App />
</ThemeProvider>

/* Manual system preference (Expo) */
const colorScheme = useColorScheme();
// All Tailwind classes adapt automatically
```

---

## Accessibility

### Contrast Ratios

- **Text on Background**: Minimum 7:1 (AAA)
- **Text on Primary**: Minimum 4.5:1 (AA Large)
- **Interactive Elements**: Minimum 3:1 (AA)

### Touch Targets

- **Minimum**: 44x44px (iOS), 48x48px (Android)
- **Buttons**: 48px minimum height
- **Checkboxes**: 24px (within 44px touch area)
- **FAB**: 56-64px

### Focus States

```tsx
/* Keyboard navigation (web) */
.focus-visible:ring-2 ring-ring ring-offset-2
```

### Screen Reader Support

```tsx
<Pressable
  accessible={true}
  accessibilityLabel="Complete task: Buy milk and bread"
  accessibilityRole="checkbox"
  accessibilityState={{ checked: isCompleted }}
>
```

---

## Platform-Specific Considerations

### Web (Next.js)

**Advantages**:
- Full CSS support (backdrop-filter, complex shadows)
- Hover states, focus-visible
- Smooth CSS transitions

**Components**:
- Use `@acme/ui` shadcn components
- Radix UI primitives for accessibility
- Framer Motion for complex animations (optional)

### Mobile (Expo)

**Limitations**:
- No backdrop-filter (use opacity + shadow layers)
- No hover states (focus on press states)
- Limited shadow complexity

**Native Features**:
- StatusBar integration
- SafeAreaView for notch handling
- Haptic feedback on interactions
- Pull-to-refresh patterns

### Shared Patterns

```tsx
/* Responsive spacing */
className="p-4 md:p-6 lg:p-8"  // Web
className="p-4"                 // Mobile (consistent)

/* Typography */
className="text-lg md:text-xl"  // Web scales up
className="text-lg"             // Mobile (fixed)
```

---

## Component Library Structure

### Shared (`@acme/ui` - Web only)

- Button variants (primary, secondary, destructive, ghost)
- Input, Textarea
- Checkbox, Radio, Switch (Radix UI)
- Dialog, Sheet, Popover
- Toast notifications
- Theme toggle

### Mobile-Specific (`apps/expo/src/components/`)

- CustomCheckbox (native implementation)
- TaskCard (RN optimized)
- CategoryPill (Pressable-based)
- FloatingActionButton
- MobileAuth component

### Cross-Platform Patterns

Create separate implementations using same design tokens:

```tsx
// Web: apps/nextjs/src/components/task-card.tsx
import { Card } from "@acme/ui/card";

// Mobile: apps/expo/src/components/task-card.tsx
import { View } from "react-native";
// Implement with Tailwind classes matching design system
```

---

## Design Tokens Reference

### Quick Copy-Paste Tokens

```typescript
// colors.ts - Emerald Green Theme
export const colors = {
  brand: {
    primary: '#50C878',           // Emerald green
    primaryBright: '#66D99A',     // Light emerald (hover)
    primaryDim: '#388E3C',        // Dark emerald (pressed)
  },
  background: {
    deep: '#0A1A1A',              // Deepest layer
    surface: '#102A2A',           // Cards, panels
    hover: '#183F3F',             // Hover state
    active: '#21716C',            // Active/selected
  },
  text: {
    primary: '#DCE4E4',           // Main text
    muted: '#8FA8A8',             // Secondary text
    accent: '#50C878',            // Highlighted text
    disabled: '#8FA8A8',          // Disabled text
  },
  border: {
    default: '#164B49',           // Standard borders
    focused: '#21716C',           // Active/focused
    variant: '#164B49',           // Subtle dividers
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
    all: '#50C878',               // Emerald
    work: '#66D99A',              // Light emerald
    chores: '#BA68C8',            // Magenta
    groceries: '#FFD700',         // Gold
    personal: '#4DD0E1',          // Cyan
  },
  syntax: {
    keyword: '#50C878',           // Emerald
    function: '#66D99A',          // Light emerald
    string: '#99E6B3',            // Pale emerald
    number: '#FFD700',            // Gold
    comment: '#8FA8A8',           // Muted
    operator: '#DCE4E4',          // Text primary
    type: '#66D99A',              // Light emerald
    property: '#DCE4E4',          // Text primary
  },
  glass: {
    surface: 'rgba(16, 42, 42, 0.7)',
    surfaceMobile: 'rgba(16, 42, 42, 0.85)',
    highlight: 'rgba(102, 217, 154, 0.08)',
    border: 'rgba(33, 113, 108, 0.3)',
  },
};

// spacing.ts
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
};

// borderRadius.ts
export const radius = {
  sm: '8px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

// shadows.ts - Dark mode optimized
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
};
```

---

## Usage Examples

### Creating a New Task Card

```tsx
import { View, Text, Pressable } from 'react-native';

<View className="bg-muted rounded-lg p-4 shadow-lg">
  <View className="flex-row items-center gap-4">
    {/* Checkbox */}
    <Pressable>
      <View className="h-6 w-6 rounded border-2 border-primary bg-primary items-center justify-center">
        <Text className="text-background text-lg">✓</Text>
      </View>
    </Pressable>

    {/* Content */}
    <View className="flex-1">
      <Text className="text-foreground text-lg font-semibold">
        Task Title
      </Text>
      <Text className="text-muted-foreground text-sm mt-1">
        Description text
      </Text>

      {/* Category Pill */}
      <View className="bg-primary/20 rounded-full px-3 py-1 self-start mt-2">
        <Text className="text-primary text-sm font-medium">Work</Text>
      </View>
    </View>
  </View>
</View>
```

### Category Filter Pills

```tsx
const categories = ['All', 'Work', 'Chores', 'Groceries'];
const [active, setActive] = useState('All');

<View className="flex-row gap-2">
  {categories.map(cat => (
    <Pressable
      key={cat}
      onPress={() => setActive(cat)}
      className={`
        rounded-full px-6 py-2 border-2
        ${active === cat
          ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(45,212,191,0.4)]'
          : 'bg-transparent border-border'
        }
      `}
    >
      <Text className={active === cat ? 'text-primary' : 'text-muted-foreground'}>
        {cat}
      </Text>
    </Pressable>
  ))}
</View>
```

---

## Brand Voice & Personality

**Tone**: Calm, focused, empowering
**Personality**: Minimalist professional with subtle playfulness

**Copy Guidelines**:
- Use sentence case for task titles
- Keep descriptions concise (1-2 lines)
- Empty states: Encouraging, not patronizing
  - ✅ "No tasks yet. Create one below!"
  - ❌ "Wow, you have nothing to do!"
- Error messages: Clear, actionable
  - ✅ "You need to be logged in to create tasks"
  - ❌ "Error: Unauthorized"

---

## Complete Color Mapping Reference

### Emerald Green Theme to UI Component Mapping

This table shows how each Zed theme color maps to specific UI elements in the app:

| Theme Color | Hex Value | UI Element | Usage Example |
|-------------|-----------|------------|---------------|
| **Backgrounds** |
| `background` | `#0A1A1A` | App background, page canvas | Main screen background |
| `surface.background` | `#102A2A` | Task cards, panels, modals | Card background |
| `elevated_surface.background` | `#102A2A` | Dropdowns, popovers | Floating elements |
| `element.background` | `#102A2A` | Input backgrounds | Text input base |
| `element.hover` | `#183F3F` | Hover state background | Button/card hover |
| `element.active` | `#21716C` | Active/pressed state | Button pressed |
| `element.selected` | `#183F3F` | Selected item background | Active tab, selected row |
| **Text & Icons** |
| `text` | `#DCE4E4` | Primary text | Task titles, body text |
| `text.muted` | `#8FA8A8` | Secondary text | Descriptions, timestamps |
| `text.accent` | `#50C878` | Highlighted text | Links, emphasized text |
| `text.placeholder` | `#8FA8A8` | Input placeholders | "What needs to be done?" |
| `icon` | `#DCE4E4` | Default icons | Navigation icons |
| `icon.accent` | `#50C878` | Accent icons | Active filter pill icon |
| **Borders** |
| `border` | `#164B49` | Standard borders | Card outlines, dividers |
| `border.focused` | `#21716C` | Focus/active borders | Input focus ring |
| `border.selected` | `#21716C` | Selected element border | Active pill border |
| **Interactive Elements** |
| `drop_target.background` | `#21716C` | Drag-and-drop target | Reorder tasks |
| `ghost_element.hover` | `#183F3F00` | Transparent hover | Icon buttons |
| `ghost_element.selected` | `#21716C80` | Ghost selected | Subtle selection |
| **Status & Feedback** |
| `error` | `#E57373` | Error text/icons | Validation errors |
| `error.background` | `rgba(229, 115, 115, 0.25)` | Error backgrounds | Error alerts |
| `success` | `#50C878` | Success text/icons | Task completed |
| `success.background` | `rgba(80, 200, 120, 0.25)` | Success backgrounds | Success toasts |
| `warning` | `#FFD700` | Warning text/icons | Unsaved changes |
| `warning.background` | `rgba(255, 215, 0, 0.25)` | Warning backgrounds | Warning banners |
| `info` | `#66B2FF` | Info text/icons | Hints, tooltips |
| `info.background` | `rgba(102, 178, 255, 0.25)` | Info backgrounds | Info alerts |
| **Scrollbars** |
| `scrollbar_thumb.background` | `#183F3F` | Scrollbar thumb | Scroll indicator |
| `scrollbar.thumb.hover_background` | `#21716C` | Scrollbar hover | Hover scroll indicator |
| `scrollbar.track.background` | `#102A2A` | Scrollbar track | Scroll background |

### Terminal ANSI Color Usage

For code snippets, technical UI, and syntax highlighting:

| ANSI Color | Hex Value | UI Usage |
|------------|-----------|----------|
| `green` | `#50C878` | Success messages, keywords |
| `bright_green` | `#66D99A` | Function names, highlights |
| `yellow` | `#FFD700` | Warnings, numbers |
| `red` | `#E57373` | Errors, destructive actions |
| `blue` | `#66B2FF` | Info, links, types |
| `cyan` | `#4DD0E1` | Accent, metadata |
| `magenta` | `#BA68C8` | Special elements, tags |
| `white` | `#DCE4E4` | Primary text |
| `bright_black` | `#164B49` | Muted borders |

### CSS Variable Mapping

For implementing in `tooling/tailwind/theme.css`:

```css
:root {
  /* From Zed theme - Dark mode primary */
  --background: #0A1A1A;                    /* background */
  --surface: #102A2A;                       /* surface.background */
  --foreground: #DCE4E4;                    /* text */

  --primary: #50C878;                       /* text.accent / terminal.ansi.green */
  --primary-bright: #66D99A;                /* terminal.ansi.bright_green */
  --primary-dim: #388E3C;                   /* terminal.ansi.dim_green */

  --muted: #102A2A;                         /* element.background */
  --muted-foreground: #8FA8A8;              /* text.muted */

  --border: #164B49;                        /* border */
  --border-focused: #21716C;                /* border.focused */

  --hover: #183F3F;                         /* element.hover */
  --active: #21716C;                        /* element.active */
  --selected: #183F3F;                      /* element.selected */

  --destructive: #E57373;                   /* terminal.ansi.red */
  --warning: #FFD700;                       /* terminal.ansi.yellow */
  --success: #50C878;                       /* created */
  --info: #66B2FF;                          /* terminal.ansi.blue */

  /* Scrollbar */
  --scrollbar-thumb: #183F3F;               /* scrollbar_thumb.background */
  --scrollbar-track: #102A2A;               /* scrollbar.track.background */

  /* Shadows (dark mode optimized) */
  --shadow-color: rgba(0, 0, 0, 0.5);

  /* Glow effects */
  --glow-primary: rgba(80, 200, 120, 0.4);
  --glow-hover: rgba(102, 217, 154, 0.5);
}
```

### Component-Specific Color Applications

**Task Card**:
```tsx
background: #102A2A          // surface.background
text: #DCE4E4                // text
description: #8FA8A8         // text.muted
border: #164B49              // border
hover: #183F3F               // element.hover
```

**Category Pills**:
```tsx
// Active state
background: rgba(80, 200, 120, 0.2)   // primary with opacity
border: #21716C                       // border.focused
text: #50C878                         // text.accent
glow: 0 0 20px rgba(80, 200, 120, 0.4)

// Inactive state
background: transparent
border: #164B49                       // border
text: #8FA8A8                         // text.muted
```

**Floating Action Button (FAB)**:
```tsx
background: #50C878          // text.accent (primary)
icon: #0A1A1A                // background (contrast)
shadow: rgba(0, 0, 0, 0.5)   // deep shadow
glow: rgba(80, 200, 120, 0.5) // emerald glow
```

**Input Fields**:
```tsx
background: #102A2A          // element.background
border: #164B49              // border
border-focus: #21716C        // border.focused
text: #DCE4E4                // text
placeholder: #8FA8A8         // text.placeholder
```

**Buttons**:
```tsx
// Primary
background: #50C878          // text.accent
text: #0A1A1A                // background (high contrast)
hover: #66D99A               // bright_green
active: #388E3C              // dim_green

// Ghost
background: transparent
text: #DCE4E4                // text
hover: #183F3F               // element.hover
```

---

## File Organization

```
apps/
├── nextjs/
│   └── src/
│       ├── components/
│       │   ├── task-card.tsx
│       │   ├── category-pills.tsx
│       │   └── layout/
│       └── app/
│           └── styles.css        # Global styles
├── expo/
│   └── src/
│       ├── components/
│       │   ├── task-card.tsx     # RN version
│       │   ├── category-pills.tsx
│       │   └── ui/
│       │       ├── custom-checkbox.tsx
│       │       └── fab.tsx
│       └── app/
packages/
└── ui/                           # Shared web components
    └── src/
        ├── button.tsx
        ├── card.tsx
        └── theme.tsx
tooling/
└── tailwind/
    └── theme.css                 # Design tokens
```

---

## Next Steps

1. **Audit existing components** against this system
2. **Create component variants** following the patterns
3. **Document component props** and usage examples
4. **Build Storybook/preview** for web components
5. **Create Figma file** mirroring this system
6. **Test accessibility** with screen readers and color contrast tools

---

## Resources

- **Color Tool**: [OKLCH Color Picker](https://oklch.com)
- **Accessibility**: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- **Tailwind CSS v4**: [Documentation](https://tailwindcss.com)
- **Radix UI**: [Component Primitives](https://radix-ui.com)
- **React Native**: [Styling Guide](https://reactnative.dev/docs/style)

---

*Last Updated: 2025-12-08*
