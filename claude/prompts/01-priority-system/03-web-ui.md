# Task Priority System - Web UI (Next.js)

## Objective
Create user-facing UI components for the priority system in the Next.js web app, including priority selector, filtering, visual indicators, and integration with existing task components.

## Technical Context
- **Stack**: Next.js 15, React 19, TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 with `cn()` utility
- **Components**: shadcn/ui with Radix UI primitives
- **App Location**: `apps/nextjs/src/app/_components/`
- **Design System**: Follow `DESIGN_SYSTEM.md` for colors, spacing, and patterns
- **State Management**: TanStack Query via tRPC hooks

## Current State Analysis

**Existing Components**:
- Task list display (likely in `apps/nextjs/src/app/page.tsx` or `_components/`)
- Task creation forms
- Category filters
- Task cards/items

**Design System Reference** (`DESIGN_SYSTEM.md`):
- Primary color: `#50C878` (emerald green)
- Background: `#0A1A1A` (deep) / `#102A2A` (surface)
- Text: `#DCE4E4` (primary) / `#8FA8A8` (muted)
- Borders: `#164B49` (default) / `#21716C` (focused)

## Implementation Requirements

### 1. Priority Selector Component

**Component**: `PrioritySelector.tsx`

**Features**:
- Dropdown/select component for choosing priority
- Visual indicators (icons + colors) for each priority level
- Three options: High, Medium, Low
- Optional: Clear priority option (set to null)

**Design Specifications**:
```typescript
interface PrioritySelectorProps {
  value: "high" | "medium" | "low" | null;
  onChange: (priority: "high" | "medium" | "low" | null) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}
```

**Visual Design**:
- **High**: Red/orange icon (🔴 or ⬆️), urgent color scheme
- **Medium**: Yellow/amber icon (🟡 or ➡️), default color
- **Low**: Blue/green icon (🔵 or ⬇️), low priority color
- **None**: Gray icon (⚪ or ➖), neutral

**UI Pattern**:
Use shadcn/ui `<Select>` component or create custom dropdown:
- Trigger shows current priority with icon
- Dropdown menu shows all options with icons
- Hover states follow design system
- Keyboard navigation support

### 2. Priority Badge Component

**Component**: `PriorityBadge.tsx`

**Features**:
- Display-only component showing task priority
- Compact pill/badge design
- Color-coded by priority level
- Optional text label or icon-only mode

**Design Specifications**:
```typescript
interface PriorityBadgeProps {
  priority: "high" | "medium" | "low" | null;
  variant?: "default" | "compact" | "icon-only";
  showLabel?: boolean;
}
```

**Visual Design**:
Follow emerald green theme:
- High: Warm red/orange tint on surface color
- Medium: Emerald green (primary color)
- Low: Cool blue/cyan tint on surface color
- Border radius: 8px (rounded-md)
- Padding: px-2 py-1 for compact badges

### 3. Task Form Integration

**Update Components**:
- Add `PrioritySelector` to task creation form
- Add `PrioritySelector` to task edit form
- Integrate with existing form state management
- Ensure validation using tRPC schemas

**Form Layout**:
```tsx
<form>
  {/* Existing fields: title, description, category, dueDate */}
  
  <div className="space-y-2">
    <label>Priority</label>
    <PrioritySelector
      value={priority}
      onChange={setPriority}
    />
  </div>
  
  {/* Submit button */}
</form>
```

**Default Behavior**:
- New tasks: Default to "medium" priority
- Edit mode: Show current priority
- Allow clearing priority (set to null)

### 4. Task List Integration

**Update Task Cards/Items**:
- Display `PriorityBadge` on each task card
- Position badge prominently (top-right or inline with title)
- Consider task list sorting by priority
- Visual hierarchy: High priority tasks stand out

**Task Card Enhancement**:
```tsx
<div className="task-card">
  <div className="flex items-center justify-between">
    <h3>{task.title}</h3>
    <PriorityBadge priority={task.priority} />
  </div>
  {/* Rest of task card content */}
</div>
```

**Sorting Options**:
- Sort by priority (high → medium → low)
- Combine with existing sorts (due date, created date)
- Add priority sort to filter controls

### 5. Priority Filtering

**Filter UI Component**:
- Add priority filter alongside category filter
- Multi-select or radio button group
- Update URL params for shareable filters
- Integrate with existing filter state

**Filter Design**:
```tsx
<div className="filter-section">
  <h4>Priority</h4>
  <div className="flex gap-2">
    <FilterButton 
      label="High" 
      active={filters.includes("high")}
      onClick={() => toggleFilter("high")}
    />
    <FilterButton 
      label="Medium" 
      active={filters.includes("medium")}
      onClick={() => toggleFilter("medium")}
    />
    <FilterButton 
      label="Low" 
      active={filters.includes("low")}
      onClick={() => toggleFilter("low")}
    />
  </div>
</div>
```

**Query Integration**:
Use tRPC `byPriority` query when priority filter is active:
```typescript
const { data: tasks } = api.task.byPriority.useQuery(
  { priority: selectedPriority },
  { enabled: !!selectedPriority }
);
```

### 6. Priority Statistics Dashboard

**Component**: `PriorityStats.tsx`

**Features**:
- Show count of tasks by priority
- Visual breakdown (progress bars or pie chart)
- Quick links to filtered views
- Optional: High priority task count badge

**Design**:
```tsx
<div className="priority-stats">
  <h3>Tasks by Priority</h3>
  <div className="space-y-2">
    <div className="flex justify-between">
      <span>High</span>
      <span className="font-semibold">{stats.high}</span>
    </div>
    {/* Progress bar */}
  </div>
  {/* Repeat for medium, low */}
</div>
```

**Data Source**:
```typescript
const { data: stats } = api.task.priorityStats.useQuery();
```

## Implementation Steps

### Step 1: Create Core Components
1. Create `PrioritySelector.tsx` with shadcn/ui Select
2. Create `PriorityBadge.tsx` for display
3. Add to `components/` or `_components/` directory
4. Implement proper TypeScript types
5. Apply design system colors and spacing

### Step 2: Update Forms
1. Import `PrioritySelector` into task creation form
2. Add to task edit form
3. Connect to form state (React Hook Form or TanStack Form)
4. Ensure validation works with schema

### Step 3: Integrate with Task Display
1. Add `PriorityBadge` to task cards
2. Update task list sorting logic
3. Add visual hierarchy for high priority tasks
4. Test responsive behavior

### Step 4: Add Filtering
1. Create priority filter UI
2. Integrate with existing filter state
3. Connect to tRPC `byPriority` query
4. Add URL param support (optional)

### Step 5: Add Statistics
1. Create `PriorityStats` component
2. Fetch data with `priorityStats` query
3. Add to dashboard or sidebar
4. Implement click-to-filter interaction

## Code Quality Standards

**React Patterns**:
- Use `"use client"` directive for interactive components
- Functional components with TypeScript
- Proper prop types with interfaces
- Use React hooks for state management

**Styling**:
- Follow design system color palette strictly
- Use `cn()` utility for conditional classes
- Responsive design (mobile-first)
- Consistent spacing using Tailwind scale

**Accessibility**:
- Proper ARIA labels on selectors
- Keyboard navigation support
- Screen reader friendly
- Color contrast meets WCAG standards

**Performance**:
- Memoize components if needed
- Use React Query caching effectively
- Optimize re-renders
- Lazy load statistics if not critical

## Expected Deliverables

1. **PrioritySelector.tsx**: Interactive priority chooser
2. **PriorityBadge.tsx**: Display component for priority
3. **Updated Forms**: Priority field in create/edit
4. **Updated Task Cards**: Priority badges on tasks
5. **Filter UI**: Priority filtering interface
6. **PriorityStats.tsx**: Statistics dashboard component
7. **Integration**: All components working together

## Success Criteria

- ✅ Priority selector works in create form
- ✅ Priority selector works in edit form
- ✅ Priority badges display correctly on tasks
- ✅ Can filter tasks by priority level
- ✅ Priority statistics display accurate counts
- ✅ Visual design matches design system
- ✅ Mobile responsive on all screens
- ✅ Keyboard navigation works
- ✅ No TypeScript errors
- ✅ Real-time updates when priority changes
- ✅ Sorting by priority works correctly

## Testing Checklist

After implementation:
- [ ] Can select priority when creating task
- [ ] Can change priority when editing task
- [ ] Priority badge shows correct color/icon
- [ ] Can filter to show only high priority tasks
- [ ] Can filter to show only medium priority tasks
- [ ] Can filter to show only low priority tasks
- [ ] Statistics show correct task counts
- [ ] High priority tasks are visually distinct
- [ ] Components are responsive on mobile
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces priority correctly

## Design Reference

**Color Palette for Priority**:
- High: `#EF4444` (red-500) or `#F97316` (orange-500)
- Medium: `#50C878` (emerald green - primary)
- Low: `#3B82F6` (blue-500) or `#8FA8A8` (text-muted)

**Icons**:
- Use Radix Icons or Lucide React for consistency
- Suggested: `<ArrowUpIcon />`, `<MinusIcon />`, `<ArrowDownIcon />`

**Component Patterns** (from existing codebase):
- Reuse patterns from category pills/filters
- Follow form input patterns from task creation
- Match button styles from existing UI

## Implementation Notes

**shadcn/ui Integration**:
If not already present, add Select component:
```bash
pnpm ui-add
# Select: select
```

**Next Steps**:
After web UI completion, implement mobile UI (Expo) with React Native components following similar patterns but adapted for mobile UX.
