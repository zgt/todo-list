#!/bin/bash
set -e
cd /home/m/coding/todo-list
CC="claude --dangerously-skip-permissions -p"

echo "=== FIX 3: Remove task count from sidebar lists ==="
$CC "In apps/nextjs/src/app/_components/sidebar-nav.tsx (or wherever the sidebar list items are rendered), remove the task count number that appears next to shared list names (e.g. the '4' next to 'Matt + Oceana <3'). Keep the member/share icon but remove the numeric count."

echo "=== FIX 4: Add Tokilist title to main page ==="
$CC "In apps/nextjs/src/app/page.tsx or the main task list layout, add a 'Tokilist' heading/title between the sidebar toggle button and the filter buttons (Category, Priority, List). It should be styled consistently with other page titles like 'Categories', 'Settings', etc. Use a similar h1/heading style."

echo "=== FIX 5: Improve Music Leagues page cards ==="
$CC "In apps/nextjs/src/app/music/page.tsx (or the music leagues components), improve the card styling. The 'Test' league card is too empty and the arrow icon is barely visible. The 'Join a League' card has different visual weight. Make the cards more consistent - add a subtle glass-card background, better borders, make the arrow more visible, and balance the two card styles. Use the existing glass-card/dark theme styling from the rest of the app."

echo "=== FIX 6: Center List Settings page content ==="
$CC "In apps/nextjs/src/app/lists/[listId]/page.tsx (or the list settings page component), center the content. Currently all cards (name, members, danger zone) are left-aligned and narrow, leaving the right side empty. Center them horizontally with a reasonable max-width (like max-w-2xl or max-w-3xl mx-auto)."

echo "=== FIX 7: Improve Settings page styling ==="
$CC "In apps/nextjs/src/app/settings/page.tsx, improve the styling. The content feels narrow. Make the layout more balanced - consider a wider max-width, better card styling for the form sections, and consistent spacing. Use the glass-card styling from the rest of the app for the form sections."

echo "=== FIX 9: Make subtask count more visible ==="
$CC "In apps/nextjs/src/app/_components/tasks.tsx, find where the subtask count is displayed (e.g. '6/7' next to 'Jeans'). The count text is too faint against the dark background. Make it more visible - increase opacity, use a slightly brighter color (like text-[#9CA3AF] or text-gray-400), and maybe slightly larger font size."

echo "=== FIX 10: Only show priority if High or Low ==="
$CC "In apps/nextjs/src/app/_components/tasks.tsx (and apps/nextjs/src/app/_components/priority.tsx if needed), change the priority badge/pill to only render when the priority is 'high' or 'low'. Hide it completely when priority is 'medium' (the default). This applies to both collapsed and expanded task views."

echo "=== FIX 11: Stronger completed task styling ==="
$CC "In apps/nextjs/src/app/_components/tasks.tsx, make completed tasks more visually distinct. Currently completed tasks (green checkmark) look almost the same as incomplete ones. Add: (a) line-through/strikethrough on the task title text, (b) stronger opacity reduction on the whole row (like opacity-50 or opacity-60), (c) slightly muted colors on badges/pills."

echo "=== FIX 12: Improve new task / edit task form ==="
$CC "In apps/nextjs/src/app/_components/tasks.tsx, find the new task and edit task form/inline editor. Make these changes: (a) Remove the chevron/arrow icon next to the title input in the new task form. (b) Make the title input and subtask input fields less transparent - give them a more visible background (like bg-white/10 or bg-[#1a2f2e]). (c) Make the form more compact vertically - reduce padding/margins between elements. (d) The priority pill button is much bigger than the other buttons (Due date, Set category, Reminder, List, Repeat) - make them all the same size. (e) Move the Cancel and Save buttons to the same row as the other action buttons (Due date, Category, etc.) instead of being on a separate row below."

echo "=== FIX 14: Improve expanded task view ==="
$CC "In apps/nextjs/src/app/_components/tasks.tsx, find the expanded/detail view of a task (when you click the expand arrow). Improve its styling: better visual hierarchy, cleaner layout for the description area, subtask list, and action buttons (Snooze, Edit, Delete). Make the expanded area feel more polished - use consistent padding, subtle dividers between sections, and make the action buttons (Snooze/Edit/Delete) more compact and aligned. The badges/pills in expanded view should also look cleaner."

echo "=== ALL FIXES COMPLETE ==="
