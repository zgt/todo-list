# Design System & Visual Language

> A comprehensive design system for the Tokilist cross-platform app (Next.js + Expo)

## Design Philosophy

**Glassmorphic Serenity**: A modern design language featuring:

- Frosted glass effects with translucent surfaces
- Soft glow effects and ambient lighting
- Depth through layering and shadows
- Calm palette: a fresh green accent (`#4ade80`) over deep teal-black surfaces
- Tactile, interactive elements with smooth animations

---

## Color System

### Single source of truth

**All color and radius values live in `tooling/tailwind/theme.css`.** This document
describes what those tokens mean and when to use them — if the two ever disagree,
`theme.css` wins and this doc is wrong. Use **Tailwind utility classes backed by
tokens** (`bg-primary`, `text-muted-foreground`, `border-border-strong`); never
hardcode hex in components.

The palette has **two layers**:

1. **shadcn "Liquid Glass" tokens** — translucent-white surfaces/borders
   (`--card`, `--border`, `--input`, `--secondary`, `--muted`, `--hover`) used by
   `@acme/ui` primitives. These are deliberately `rgba(255,255,255, …)` so they read
   as frosted glass over the ambient background.
2. **Solid teal app scale** — opaque colors for the task UI's own cards, borders,
   inputs, and panels (`--surface`, `--surface-2`, `--surface-hover`,
   `--border-strong`, `--border-focus`). Opaque so `/NN` opacity modifiers work.

#### Core Brand Colors

```text
Primary — green (Tailwind green-400 family)
  --primary             #4ade80   Main brand green — CTAs, accents, active
  --primary-hover       #86efac   Hover / bright (green-300)
  --primary-foreground  #000000   Ink on primary (labels, icons on green)

Text
  --foreground          #e0e7e7   Primary text, high contrast
  --muted-foreground    #8fa8a8   Secondary text, descriptions, placeholders

Solid teal surface scale (deep → elevated → hover)
  --background          #020404   App canvas base (behind the gradient)
  --surface             #0a1a1a   Deep surface / popover base
  --surface-2           #102a2a   Elevated surface: cards, inputs, panels
  --surface-hover       #183f3f   Hover / active surface background

Solid borders
  --border-strong       #164b49   Default solid border & divider
  --border-focus        #21716c   Focused / active / selected border + ring

Destructive
  --destructive         #ef4444   Errors, delete
  --destructive-hover   #dc2626   Destructive hover / pressed (red-600)
```

#### Semantic Tokens (dark-only)

The app ships a single dark theme. Value shown is exactly what `theme.css` defines.

| Role                   | Token → utility                                                | Value     | Usage                                           |
| ---------------------- | -------------------------------------------------------------- | --------- | ----------------------------------------------- |
| **Background**         | `--background` → `bg-background`                               | `#020404` | App canvas base (behind gradient)               |
| **Surface (deep)**     | `--surface` → `bg-surface`                                     | `#0a1a1a` | Deep surface, popover base, deepest panels      |
| **Surface (elevated)** | `--surface-2` → `bg-surface-2`                                 | `#102a2a` | Task cards, inputs, dropdowns, panels           |
| **Surface (hover)**    | `--surface-hover` → `bg-surface-hover`                         | `#183f3f` | Hover / active row & button backgrounds         |
| **Foreground**         | `--foreground` → `text-foreground`                             | `#e0e7e7` | Primary text, icons                             |
| **Muted foreground**   | `--muted-foreground` → `text-muted-foreground`                 | `#8fa8a8` | Descriptions, metadata, placeholders            |
| **Primary**            | `--primary` → `bg-primary` / `text-primary`                    | `#4ade80` | CTAs, active elements, brand green              |
| **Primary hover**      | `--primary-hover` → `hover:bg-primary-hover`                   | `#86efac` | Hover / bright green                            |
| **Primary foreground** | `--primary-foreground` → `text-primary-foreground`             | `#000000` | Ink on primary green                            |
| **Border (default)**   | `--border-strong` → `border-border-strong`                     | `#164b49` | Solid dividers, outlines                        |
| **Border (focus)**     | `--border-focus` → `border-border-focus` / `ring-border-focus` | `#21716c` | Focused / active / selected borders, focus ring |
| **Destructive**        | `--destructive` → `text-destructive` / `bg-destructive`        | `#ef4444` | Delete, errors                                  |
| **Destructive hover**  | `--destructive-hover` → `hover:bg-destructive-hover`           | `#dc2626` | Destructive hover / pressed                     |

> **Glass tokens** (`--card`, `--border`, `--input`, `--muted`, `--secondary`,
> `--hover`) are translucent white (`rgba(255,255,255, 0.03–0.1)`). Use `bg-card`,
> `border-border`, etc. for `@acme/ui` components; use the **solid** tokens above for
> the task UI's own chrome. They are not interchangeable — glass floats over the
> gradient, solid teal builds structure.

#### Priority Colors

Semantic accents for task priority (own tokens, kept distinct from `destructive`
even though `high` shares its value):

| Priority | Token → utility                              | Value     |
| -------- | -------------------------------------------- | --------- |
| High     | `--priority-high` → `text-priority-high`     | `#ef4444` |
| Medium   | `--priority-medium` → `text-priority-medium` | `#f59e0b` |
| Low      | `--priority-low` → `text-priority-low`       | `#3b82f6` |

#### Category / list swatch palette

Shared-list and category colors are **user-chosen data**, not theme tokens. The
picker offers a fixed swatch palette (`create-list-dialog.tsx` `PRESET_COLORS`):
`#50C878 #4A90D9 #E57373 #FFB74D #BA68C8 #4DB6AC #F06292 #FFD54F`. These stay as
literal hex on purpose.

### Gradients

App background gradient (`apps/nextjs/src/app/styles.css`); `#020404` == `--background`,
`#051010` is a bespoke mid-stop:

```css
background: linear-gradient(
  135deg,
  var(--background) 0%,
  #051010 50%,
  var(--background) 100%
);
```

Green glow — use the `shadow-glow` / `shadow-glow-hover` utilities (`--primary` =
`rgb(74, 222, 128)`):

```css
/* --shadow-glow (active) */
box-shadow:
  0 0 20px rgba(74, 222, 128, 0.4),
  0 0 40px rgba(74, 222, 128, 0.2);

/* --shadow-glow-hover (hover; --primary-hover = rgb(134, 239, 172)) */
box-shadow:
  0 0 30px rgba(134, 239, 172, 0.5),
  0 4px 20px rgba(0, 0, 0, 0.3);
```

### Glass Effects

The frosted-glass look comes from the shadcn glass tokens plus `backdrop-blur`:

```css
/* Frosted glass overlay (web only) */
.glass {
  background: var(--card); /* rgba(255,255,255,0.03) */
  backdrop-filter: blur(12px) saturate(150%);
  border: 1px solid var(--border); /* rgba(255,255,255,0.08) */
}
```

In components, prefer utilities: `bg-card border border-border backdrop-blur-sm`.
On mobile (no `backdrop-filter`), approximate with a solid surface + shadow:
`bg-surface-2/90 shadow-lg`.

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

| Usage          | Size (rem/px)   | Weight | Line Height | Letter Spacing |
| -------------- | --------------- | ------ | ----------- | -------------- |
| **Display**    | 3rem / 48px     | 700    | 1.1         | -0.02em        |
| **H1**         | 2.25rem / 36px  | 700    | 1.2         | -0.02em        |
| **H2**         | 1.875rem / 30px | 600    | 1.3         | -0.01em        |
| **H3**         | 1.5rem / 24px   | 600    | 1.4         | 0em            |
| **Body Large** | 1.125rem / 18px | 400    | 1.6         | 0em            |
| **Body**       | 1rem / 16px     | 400    | 1.5         | 0em            |
| **Body Small** | 0.875rem / 14px | 400    | 1.5         | 0.01em         |
| **Caption**    | 0.75rem / 12px  | 500    | 1.4         | 0.02em         |

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
  <View className="h-full w-full p-4">{/* Content */}</View>
</SafeAreaView>
```

---

## Components

### Task Cards

**Glassmorphic card** with depth and glow effects:

```tsx
<View className="bg-muted flex flex-row items-center gap-4 rounded-lg p-4 shadow-lg">
  {/* Checkbox */}
  <Pressable>
    <View className="border-primary bg-primary h-6 w-6 items-center justify-center rounded border-2">
      <Text className="text-background text-lg">✓</Text>
    </View>
  </Pressable>

  {/* Content */}
  <View className="grow">
    <Text className="text-foreground text-lg font-semibold">Task Title</Text>
    <Text className="text-muted-foreground mt-1 text-sm">Task description</Text>
  </View>
</View>
```

**Visual Properties**:

- Background: Muted surface with subtle translucency
- Border Radius: 24px (rounded-lg)
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
  shadow-glow
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
<Pressable className="bg-primary shadow-glow-hover absolute right-8 bottom-8 h-16 w-16 items-center justify-center rounded-full shadow-2xl">
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
<TextInput className="border-input bg-background text-foreground rounded-md border px-3 py-2 text-lg" />
```

### Buttons

**Primary CTA button**:

```tsx
<Pressable className="bg-primary flex items-center rounded-md p-3">
  <Text className="text-primary-foreground font-semibold">Add Task</Text>
</Pressable>
```

**Text Button** (destructive):

```tsx
<Pressable>
  <Text className="text-destructive text-sm font-bold uppercase">Delete</Text>
</Pressable>
```

---

## Visual Effects

### Glassmorphism

**Core glass effect** (CSS - web only) — backed by the glass tokens:

```css
.glass-card {
  background: var(--card); /* rgba(255,255,255,0.03) */
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px) saturate(180%);
  border: 1px solid var(--border); /* rgba(255,255,255,0.08) */
}
```

**Approximation for React Native**:

```tsx
/* Use a solid surface + shadow layers */
<View className="bg-surface-2/90 shadow-lg" />
```

### Glow Effects

Prefer the `shadow-glow` / `shadow-glow-hover` utilities (green, `--primary`
`rgb(74,222,128)`) rather than hand-rolled box-shadows:

```css
/* --shadow-glow (active elements) */
box-shadow:
  0 0 20px rgba(74, 222, 128, 0.4),
  0 0 40px rgba(74, 222, 128, 0.2);

/* --shadow-glow-hover (FAB, active pills; --primary-hover = rgb(134, 239, 172)) */
box-shadow:
  0 0 30px rgba(134, 239, 172, 0.5),
  0 4px 20px rgba(0, 0, 0, 0.3);
```

### Shadows

Elevation scale from `theme.css`; use `shadow-{2xs,xs,sm,md,lg,xl,2xl}`:

| Level        | Shadow Value                    | Usage                     |
| ------------ | ------------------------------- | ------------------------- |
| **2xs / xs** | `0px 2px 10px rgba(0,0,0,0.2)`  | Hover states, subtle lift |
| **sm**       | `0px 4px 16px rgba(0,0,0,0.3)`  | Cards, inputs             |
| **md**       | `0px 8px 24px rgba(0,0,0,0.4)`  | Dropdowns, popovers       |
| **lg**       | `0px 16px 32px rgba(0,0,0,0.5)` | Modals                    |
| **xl**       | `0px 24px 48px rgba(0,0,0,0.6)` | Large overlays            |
| **2xl**      | `0px 32px 64px rgba(0,0,0,0.7)` | FAB, top-level overlays   |

### Border Radius

Driven by a single base token `--radius: 1.5rem` (24px). The scale is derived from
it in `theme.css` (`@theme inline`), so the whole UI has a soft, rounded feel:

```
--radius-sm → calc(1.5rem - 4px) → 20px → rounded-sm  (small controls, chips)
--radius-md → calc(1.5rem - 2px) → 22px → rounded-md  (inputs, buttons)
--radius-lg → 1.5rem             → 24px → rounded-lg  (cards, panels)
--radius-xl → calc(1.5rem + 4px) → 28px → rounded-xl  (modals, large surfaces)
rounded-full → 9999px → pills, FAB, avatars
```

> These map onto Tailwind's `rounded-{sm,md,lg,xl}` utilities. Note the base is
> large by design — `rounded-md` is 22px, **not** the Tailwind default 6px.

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

| Element             | Light                | Dark                    | Notes                  |
| ------------------- | -------------------- | ----------------------- | ---------------------- |
| Background gradient | Light teal → white   | Deep teal → near black  | Maintains ambient feel |
| Glass cards         | White translucent    | Dark translucent        | More opacity in dark   |
| Glow intensity      | Subtle (30% opacity) | Stronger (50% opacity)  | Glows pop more in dark |
| Text contrast       | High contrast        | Medium contrast         | Prevents eye strain    |
| Shadows             | Soft, subtle         | Deeper, more pronounced | Enhances depth         |

### Implementation

```tsx
/* Automatic via ThemeProvider (Next.js) */
<ThemeProvider>
  <App />
</ThemeProvider>;

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
className = "p-4 md:p-6 lg:p-8"; // Web
className = "p-4"; // Mobile (consistent)

/* Typography */
className = "text-lg md:text-xl"; // Web scales up
className = "text-lg"; // Mobile (fixed)
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

// Mobile: apps/expo/src/components/task-card.tsx
import { View } from "react-native";

import { Card } from "@acme/ui/card";

// Implement with Tailwind classes matching design system
```

---

## Design Tokens Reference

### Quick Copy-Paste Tokens

> These mirror `tooling/tailwind/theme.css`. In app code, use the Tailwind
> utilities (`bg-primary`, `text-muted-foreground`, `border-border-strong`), not
> these literals — they're here for reference only.

```typescript
// Values as defined in theme.css (:root)
export const colors = {
  primary: "#4ade80", // --primary (green-400)
  primaryHover: "#86efac", // --primary-hover (green-300)
  primaryForeground: "#000000", // --primary-foreground (ink on green)

  foreground: "#e0e7e7", // --foreground (primary text)
  mutedForeground: "#8fa8a8", // --muted-foreground (secondary text)

  // Solid teal surface scale
  background: "#020404", // --background (canvas base)
  surface: "#0a1a1a", // --surface (deep surface / popover)
  surface2: "#102a2a", // --surface-2 (cards, inputs, panels)
  surfaceHover: "#183f3f", // --surface-hover (hover/active bg)

  // Solid borders
  borderStrong: "#164b49", // --border-strong (default border)
  borderFocus: "#21716c", // --border-focus (focus/active border, ring)

  // Destructive
  destructive: "#ef4444", // --destructive
  destructiveHover: "#dc2626", // --destructive-hover

  // Priority accents
  priorityHigh: "#ef4444", // --priority-high
  priorityMedium: "#f59e0b", // --priority-medium
  priorityLow: "#3b82f6", // --priority-low

  // shadcn "glass" tokens (translucent white)
  glass: {
    card: "rgba(255, 255, 255, 0.03)", // --card
    border: "rgba(255, 255, 255, 0.08)", // --border
    input: "rgba(255, 255, 255, 0.05)", // --input
    hover: "rgba(255, 255, 255, 0.10)", // --hover
  },
};

// spacing.ts
export const spacing = {
  xs: "0.25rem", // 4px
  sm: "0.5rem", // 8px
  md: "1rem", // 16px
  lg: "1.5rem", // 24px
  xl: "2rem", // 32px
  "2xl": "3rem", // 48px
};

// borderRadius.ts — derived from --radius: 1.5rem
export const radius = {
  sm: "20px", // calc(1.5rem - 4px)
  md: "22px", // calc(1.5rem - 2px)
  lg: "24px", // 1.5rem
  xl: "28px", // calc(1.5rem + 4px)
  full: "9999px",
};

// shadows.ts — dark-mode elevation scale (theme.css)
export const shadows = {
  "2xs": "0px 2px 10px 0px rgba(0, 0, 0, 0.2)",
  xs: "0px 2px 10px 0px rgba(0, 0, 0, 0.2)",
  sm: "0px 4px 16px 0px rgba(0, 0, 0, 0.3)",
  md: "0px 8px 24px 0px rgba(0, 0, 0, 0.4)",
  lg: "0px 16px 32px 0px rgba(0, 0, 0, 0.5)",
  xl: "0px 24px 48px 0px rgba(0, 0, 0, 0.6)",
  "2xl": "0px 32px 64px 0px rgba(0, 0, 0, 0.7)",
  // Green glow (--primary #4ade80, --primary-hover #86efac)
  glow: "0 0 20px rgba(74, 222, 128, 0.4), 0 0 40px rgba(74, 222, 128, 0.2)",
  glowHover: "0 0 30px rgba(134, 239, 172, 0.5), 0 4px 20px rgba(0, 0, 0, 0.3)",
};
```

---

## Usage Examples

### Creating a New Task Card

```tsx
import { Pressable, Text, View } from "react-native";

<View className="bg-muted rounded-lg p-4 shadow-lg">
  <View className="flex-row items-center gap-4">
    {/* Checkbox */}
    <Pressable>
      <View className="border-primary bg-primary h-6 w-6 items-center justify-center rounded border-2">
        <Text className="text-background text-lg">✓</Text>
      </View>
    </Pressable>

    {/* Content */}
    <View className="flex-1">
      <Text className="text-foreground text-lg font-semibold">Task Title</Text>
      <Text className="text-muted-foreground mt-1 text-sm">
        Description text
      </Text>

      {/* Category Pill */}
      <View className="bg-primary/20 mt-2 self-start rounded-full px-3 py-1">
        <Text className="text-primary text-sm font-medium">Work</Text>
      </View>
    </View>
  </View>
</View>;
```

### Category Filter Pills

```tsx
const categories = ["All", "Work", "Chores", "Groceries"];
const [active, setActive] = useState("All");

<View className="flex-row gap-2">
  {categories.map((cat) => (
    <Pressable
      key={cat}
      onPress={() => setActive(cat)}
      className={`rounded-full border-2 px-6 py-2 ${
        active === cat
          ? "bg-primary/20 border-primary shadow-glow"
          : "border-border bg-transparent"
      } `}
    >
      <Text
        className={active === cat ? "text-primary" : "text-muted-foreground"}
      >
        {cat}
      </Text>
    </Pressable>
  ))}
</View>;
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

## Component → Token Reference

Use these token-backed Tailwind utilities. Never hardcode hex in components — the
one migration exception is the `priority.tsx` config map (see
`.claude/docs/token-migration-map.md`).

**Task Card** (solid teal, not glass):

```text
bg-surface-2               #102a2a
text-foreground            title        #e0e7e7
text-muted-foreground      description  #8fa8a8
border-border-strong       #164b49
hover:bg-surface-hover     #183f3f
```

**Category / filter pills**:

```text
Active:    bg-primary/20  border-border-focus  text-primary  shadow-glow
Inactive:  bg-transparent  border-border-strong  text-muted-foreground
```

**Floating Action Button (FAB)**:

```text
bg-primary               #4ade80
text-primary-foreground  ink on green (#000)
shadow-glow-hover        ambient green glow
```

**Input fields**:

```text
bg-surface-2                 #102a2a
border-border-strong         #164b49
focus:border-border-focus    #21716c
text-foreground              #e0e7e7
placeholder:text-muted-foreground
```

**Buttons**:

```text
Primary:      bg-primary text-primary-foreground hover:bg-primary-hover    (#4ade80 → #86efac)
Destructive:  bg-destructive text-white hover:bg-destructive-hover         (#ef4444 → #dc2626)
Ghost:        bg-transparent text-foreground hover:bg-surface-hover
```

> shadcn `@acme/ui` primitives (Dialog, Popover, Card, Button variants) use the
> **glass** tokens (`bg-card`, `border-border`, `bg-popover`) instead — they layer
> over the ambient gradient. Reach for solid teal tokens only in the app's own
> hand-built chrome.

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

_Last Updated: 2026-07-13 — color & radius sections realigned to `tooling/tailwind/theme.css` (Liquid Glass theme)._
