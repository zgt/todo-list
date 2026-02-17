# Task Priority System - Mobile UI (Expo/React Native)

## Objective
Implement priority system UI for the React Native mobile app using Expo, including priority selection, visual indicators, filtering, and seamless integration with existing task components while following mobile UX best practices.

## Technical Context
- **Stack**: Expo SDK 54, React Native 0.81, React 19
- **Styling**: Tailwind CSS v4 with NativeWind v5
- **Navigation**: Expo Router
- **App Location**: `apps/expo/src/`
- **Design System**: Follow `DESIGN_SYSTEM.md` adapted for mobile
- **State Management**: TanStack Query via tRPC hooks

## Current State Analysis

**Existing Components**:
- Task list view (`apps/expo/src/app/index.tsx` or similar)
- Task creation/edit screens
- Category filter UI
- Custom checkbox implementation (no Radix UI on mobile)

**Mobile Constraints**:
- No shadcn/ui components (web-only)
- Custom React Native components required
- Touch-first interactions
- Limited screen space
- Bottom sheet patterns preferred

**Design Tokens** (`design-tokens.ts`):
- Colors match design system
- Spacing scale: xs, sm, md, lg, xl
- Border radius: sm(8px), md(10px), lg(12px)
- Shadows: from 2xs to 2xl plus glow effects

## Implementation Requirements

### 1. Priority Selector Component

**Component**: `apps/expo/src/components/PrioritySelector.tsx`

**Features**:
- Touch-friendly priority picker
- Visual feedback on selection
- Icon + text for each priority level
- Support for both picker and button group patterns

**Design Specifications**:
```typescript
interface PrioritySelectorProps {
  value: "high" | "medium" | "low" | null;
  onChange: (priority: "high" | "medium" | "low" | null) => void;
  disabled?: boolean;
  variant?: "picker" | "buttons";
}
```

**UI Pattern Option 1: Bottom Sheet Picker**
```tsx
<Pressable onPress={() => setPickerVisible(true)}>
  <View className="flex-row items-center gap-2 p-4 bg-surface rounded-lg">
    <PriorityIcon priority={value} />
    <Text className="text-primary">{value || "No priority"}</Text>
  </View>
</Pressable>

<BottomSheet visible={pickerVisible}>
  {["high", "medium", "low", null].map(p => (
    <PriorityOption
      key={p}
      priority={p}
      selected={p === value}
      onPress={() => {
        onChange(p);
        setPickerVisible(false);
      }}
    />
  ))}
</BottomSheet>
```

**UI Pattern Option 2: Segmented Buttons**
```tsx
<View className="flex-row gap-2 p-2 bg-surface rounded-lg">
  <PriorityButton priority="high" selected={value === "high"} onPress={() => onChange("high")} />
  <PriorityButton priority="medium" selected={value === "medium"} onPress={() => onChange("medium")} />
  <PriorityButton priority="low" selected={value === "low"} onPress={() => onChange("low")} />
</View>
```

**Visual Design**:
- High: Red/orange gradient with upward arrow
- Medium: Emerald green with dash/equal icon
- Low: Blue/cyan with downward arrow
- Touch target: Minimum 44x44 points
- Active state: Background color + border glow

### 2. Priority Badge Component

**Component**: `apps/expo/src/components/PriorityBadge.tsx`

**Features**:
- Compact pill design for task cards
- Color-coded by priority
- Icon + optional text
- Optimized for list performance (memoized)

**Design Specifications**:
```typescript
interface PriorityBadgeProps {
  priority: "high" | "medium" | "low" | null;
  size?: "sm" | "md";
  showLabel?: boolean;
}
```

**Implementation**:
```tsx
const PriorityBadge = memo(({ priority, size = "md", showLabel = true }) => {
  const config = PRIORITY_CONFIG[priority ?? "none"];
  
  return (
    <View 
      className={cn(
        "flex-row items-center gap-1 px-2 py-1 rounded-full",
        config.bgClass,
        size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1"
      )}
      style={{ borderWidth: 1, borderColor: config.borderColor }}
    >
      <config.Icon size={size === "sm" ? 12 : 16} color={config.color} />
      {showLabel && (
        <Text className={cn("text-xs font-medium", config.textClass)}>
          {config.label}
        </Text>
      )}
    </View>
  );
});
```

**Priority Configuration Object**:
```typescript
const PRIORITY_CONFIG = {
  high: {
    label: "High",
    Icon: ArrowUpIcon,
    color: "#EF4444",
    bgClass: "bg-red-500/10",
    borderColor: "#EF4444",
    textClass: "text-red-400"
  },
  medium: {
    label: "Medium",
    Icon: MinusIcon,
    color: "#50C878",
    bgClass: "bg-primary/10",
    borderColor: "#50C878",
    textClass: "text-primary"
  },
  low: {
    label: "Low",
    Icon: ArrowDownIcon,
    color: "#3B82F6",
    bgClass: "bg-blue-500/10",
    borderColor: "#3B82F6",
    textClass: "text-blue-400"
  },
  none: {
    label: "None",
    Icon: CircleIcon,
    color: "#8FA8A8",
    bgClass: "bg-muted/10",
    borderColor: "#8FA8A8",
    textClass: "text-muted"
  }
};
```

### 3. Task Form Integration

**Update Task Creation Screen**:
- Add priority selector to new task form
- Place below category selector
- Include validation
- Default to "medium"

**Form Layout**:
```tsx
<ScrollView className="flex-1 p-4">
  <TextInput placeholder="Task title" {...} />
  <TextInput placeholder="Description" {...} />
  <CategoryPicker {...} />
  
  <View className="mt-4">
    <Text className="text-sm text-muted mb-2">Priority</Text>
    <PrioritySelector
      value={priority}
      onChange={setPriority}
      variant="picker"
    />
  </View>
  
  <DatePicker {...} />
  <SubmitButton />
</ScrollView>
```

**Edit Mode**:
- Show current priority
- Allow changing priority
- Persist changes via tRPC mutation

### 4. Task List Integration

**Update Task Card Component**:
- Add `PriorityBadge` to task cards
- Position: Top-right or inline with title
- Ensure badge doesn't interfere with swipe actions
- Optimize rendering (use `memo()`)

**Enhanced Task Card**:
```tsx
<Pressable onPress={onPress} className="p-4 mb-2 bg-surface rounded-lg">
  <View className="flex-row items-start justify-between">
    <View className="flex-1">
      <Text className="text-primary font-medium">{task.title}</Text>
      {task.category && <CategoryPill category={task.category} />}
    </View>
    <PriorityBadge priority={task.priority} size="sm" />
  </View>
  
  {/* Rest of task card content */}
</Pressable>
```

**Visual Priority Indicators**:
- High priority tasks: Subtle left border accent
- Pulsing animation for overdue high priority tasks
- Sort high priority to top of list (optional)

### 5. Priority Filtering

**Filter UI Component**:
- Add to existing category filter
- Use horizontal scrollable pill buttons
- Multi-select behavior
- Persist filter state

**Filter Design**:
```tsx
<ScrollView 
  horizontal 
  showsHorizontalScrollIndicator={false}
  className="px-4 py-2"
>
  <FilterPill
    label="High"
    icon="arrow-up"
    active={filters.includes("high")}
    onPress={() => toggleFilter("high")}
    color="red"
  />
  <FilterPill
    label="Medium"
    icon="minus"
    active={filters.includes("medium")}
    onPress={() => toggleFilter("medium")}
    color="emerald"
  />
  <FilterPill
    label="Low"
    icon="arrow-down"
    active={filters.includes("low")}
    onPress={() => toggleFilter("low")}
    color="blue"
  />
</ScrollView>
```

**Query Integration**:
```typescript
const { data: filteredTasks } = api.task.byPriority.useQuery(
  { priority: selectedPriority },
  { enabled: !!selectedPriority }
);
```

### 6. Priority Quick Actions

**Swipe Actions Enhancement**:
- Add "Set Priority" to swipe menu
- Quick priority change without opening edit screen
- Haptic feedback on change

**Implementation**:
```tsx
<Swipeable
  renderRightActions={() => (
    <>
      <SwipeAction icon="edit" onPress={handleEdit} />
      <SwipeAction icon="flag" onPress={handlePriority} />
      <SwipeAction icon="trash" onPress={handleDelete} color="red" />
    </>
  )}
>
  <TaskCard task={task} />
</Swipeable>
```

**Priority Change Bottom Sheet**:
```tsx
const handlePriority = () => {
  setQuickPriorityTask(task);
  setBottomSheetVisible(true);
};

<BottomSheet visible={bottomSheetVisible}>
  <Text className="text-lg font-semibold mb-4">Change Priority</Text>
  {["high", "medium", "low", null].map(p => (
    <PriorityOption
      key={p}
      priority={p}
      onPress={() => {
        updateTaskMutation.mutate({ 
          id: quickPriorityTask.id, 
          priority: p 
        });
        setBottomSheetVisible(false);
      }}
    />
  ))}
</BottomSheet>
```

### 7. Priority Statistics Widget

**Home Screen Widget Enhancement**:
- Add priority breakdown to stats
- Show count of high priority tasks
- Quick link to high priority view

**Stats Display**:
```tsx
<View className="p-4 bg-surface rounded-lg">
  <Text className="text-sm text-muted mb-2">By Priority</Text>
  <View className="space-y-2">
    <StatRow icon="arrow-up" label="High" count={stats.high} color="red" />
    <StatRow icon="minus" label="Medium" count={stats.medium} color="emerald" />
    <StatRow icon="arrow-down" label="Low" count={stats.low} color="blue" />
  </View>
</View>
```

## Implementation Steps

### Step 1: Create Core Components
1. Create `PrioritySelector.tsx` with bottom sheet variant
2. Create `PriorityBadge.tsx` with memoization
3. Create `PriorityOption.tsx` for picker items
4. Add `PRIORITY_CONFIG` constant
5. Test components in isolation

### Step 2: Update Task Forms
1. Import `PrioritySelector` into create screen
2. Add to edit screen
3. Connect to form state
4. Add validation
5. Test create/update flows

### Step 3: Integrate with Task Display
1. Add `PriorityBadge` to task cards
2. Update task list component
3. Add visual priority indicators
4. Optimize rendering performance

### Step 4: Add Filtering
1. Create priority filter pills
2. Add to filter bar
3. Integrate with tRPC queries
4. Persist filter state
5. Test filter combinations

### Step 5: Add Quick Actions
1. Extend swipe actions
2. Create priority change bottom sheet
3. Add haptic feedback
4. Test UX flow

### Step 6: Add Statistics
1. Create stats widget
2. Fetch priority counts
3. Add to home/dashboard screen
4. Test real-time updates

## Code Quality Standards

**React Native Patterns**:
- Use `memo()` for frequently rendered components
- Optimize FlatList/ScrollView rendering
- Proper TypeScript types for all props
- Use NativeWind classes exclusively

**Performance**:
- Memoize expensive calculations
- Use `useCallback` for event handlers
- Optimize re-renders with React.memo
- Profile with React DevTools

**UX Design**:
- 44x44pt minimum touch targets
- Haptic feedback on interactions
- Loading states for async operations
- Error handling with user feedback

**Accessibility**:
- Proper accessibility labels
- Screen reader support
- Dynamic type sizing
- High contrast mode support

## Expected Deliverables

1. **PrioritySelector.tsx**: Touch-friendly priority picker
2. **PriorityBadge.tsx**: Optimized badge component
3. **Updated Task Screens**: Priority in create/edit
4. **Enhanced Task Cards**: Priority badges
5. **Filter UI**: Priority filtering
6. **Quick Actions**: Swipe-to-change-priority
7. **Statistics**: Priority breakdown widget

## Success Criteria

- ✅ Can select priority when creating task
- ✅ Can change priority when editing task
- ✅ Priority badges display on task cards
- ✅ Can filter by priority level
- ✅ Swipe actions include priority change
- ✅ Statistics show accurate counts
- ✅ Touch targets meet accessibility standards
- ✅ Haptic feedback works correctly
- ✅ No performance issues in long lists
- ✅ Animations are smooth (60fps)
- ✅ Works on both iOS and Android

## Testing Checklist

After implementation:
- [ ] Can select priority in new task form
- [ ] Can change priority in edit screen
- [ ] Priority badge shows correct colors
- [ ] Can filter to high priority tasks
- [ ] Can filter to medium priority tasks
- [ ] Can filter to low priority tasks
- [ ] Swipe action changes priority
- [ ] Haptic feedback triggers
- [ ] Statistics display correct counts
- [ ] Scrolling performance is smooth
- [ ] Works in dark/light mode
- [ ] Screen reader announces priority
- [ ] iOS and Android both work

## Mobile-Specific Considerations

**Icons**:
Use `@expo/vector-icons` or Lucide React Native:
```tsx
import { ArrowUp, Minus, ArrowDown } from "lucide-react-native";
```

**Bottom Sheets**:
Consider using `@gorhom/bottom-sheet` for native feel:
```bash
cd apps/expo
npx expo install @gorhom/bottom-sheet
```

**Haptic Feedback**:
```tsx
import * as Haptics from "expo-haptics";

const handlePriorityChange = (priority) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  onChange(priority);
};
```

**Platform Differences**:
- iOS: Use SF Symbols styling
- Android: Material Design patterns
- Handle safe areas with `SafeAreaView`

## Implementation Notes

**Next Steps**:
After mobile UI is complete, priority system is fully implemented across:
- ✅ Database schema
- ✅ tRPC API
- ✅ Web UI
- ✅ Mobile UI

**iOS Widget Update** (Optional):
Update `apps/expo/widgets` to show priority counts in home screen widget.

**Testing on Device**:
```bash
cd apps/expo
npx expo run:ios
npx expo run:android
```
