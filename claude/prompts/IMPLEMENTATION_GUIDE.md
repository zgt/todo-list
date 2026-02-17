# Tokilist Feature Implementation Guide

This directory contains detailed, optimized prompts for Claude Code to implement four major features for the Tokilist todo app. Each feature is broken down into logical implementation sections that can be tackled independently.

## Features Overview

### 1. Task Priority System (`01-priority-system/`)
Add high/medium/low priority levels to tasks with visual indicators, filtering, and sorting.

**Prompts**:
- `01-database-schema.md` - Add priority field to database
- `02-trpc-api.md` - Extend API with priority queries
- `03-web-ui.md` - Build web UI components  
- `04-mobile-ui.md` - Build mobile UI components

**Estimated Time**: 4-6 hours
**Difficulty**: ⭐⭐ (Intermediate)
**Dependencies**: None

---

### 2. Task Reminders (`02-reminders/`)
Multiple reminders per task with iOS/Android notifications, including absolute, relative, and recurring reminders.

**Prompts**:
- `01-research-and-schema.md` - Research notifications + database schema
- `02-expo-setup.md` - Configure Expo notifications
- `03-notification-service.md` - Build notification scheduling service
- `04-trpc-api.md` - Create reminder management API
- `05-web-ui.md` - Build web reminder UI
- `06-mobile-ui.md` - Build mobile reminder UI with native notifications

**Estimated Time**: 12-16 hours
**Difficulty**: ⭐⭐⭐⭐ (Advanced)
**Dependencies**: Expo notifications package, platform-specific permissions

---

### 3. Collaborative Lists (`03-collaborative-lists/`)
Share task lists with other users, including permissions, real-time sync, and activity tracking.

**Prompts**:
- `01-database-schema.md` - Shared lists + permissions schema
- `02-permissions-logic.md` - Authorization and access control
- `03-trpc-api.md` - Sharing and collaboration API
- `04-realtime-sync.md` - Real-time updates with tRPC subscriptions
- `05-web-ui.md` - Sharing UI, invites, member management
- `06-mobile-ui.md` - Mobile collaboration features

**Estimated Time**: 16-20 hours
**Difficulty**: ⭐⭐⭐⭐⭐ (Expert)
**Dependencies**: Better Auth (already configured), WebSocket support

---

### 4. Sub-tasks (`04-sub-tasks/`)
Break down tasks into smaller checklist items with progress tracking and hierarchical display.

**Prompts**:
- `01-database-schema.md` - Self-referencing task hierarchy
- `02-trpc-api.md` - Hierarchical queries and operations
- `03-progress-tracking.md` - Calculate completion percentages
- `04-web-ui.md` - Nested task display and editing
- `05-mobile-ui.md` - Mobile sub-task management
- `06-drag-drop.md` - Reordering and indentation

**Estimated Time**: 10-14 hours
**Difficulty**: ⭐⭐⭐⭐ (Advanced)
**Dependencies**: None

---

## How to Use These Prompts

### For Claude Code (AI IDE):

1. **Open Claude Code** in your project directory
2. **Navigate to the feature** you want to implement
3. **Copy the entire prompt** from the .md file
4. **Paste into Claude Code** with the instruction: "Implement this feature following the prompt exactly"
5. **Review changes** and test before moving to the next section

### Best Practices:

- **Do prompts in order** - each builds on the previous
- **Test after each section** - don't accumulate errors
- **Commit between prompts** - easy rollback if needed
- **Read the full prompt** - understand the requirements first
- **Check success criteria** - validate implementation is complete

### Verification Commands:

```bash
# Type checking
pnpm typecheck

# Database push
pnpm db:push

# Database studio
pnpm db:studio

# Dev server
pnpm dev

# iOS simulator
pnpm ios

# Android simulator
pnpm android
```

---

## Implementation Order Recommendations

### If You're New to the Codebase:
**Start with**: Priority System (easiest, covers core patterns)

### If You Want Quick Wins:
**Start with**: Priority System or Sub-tasks (visible user impact)

### If You're Ambitious:
**Start with**: Reminders (complex but extremely useful)

### If You Want Team Features:
**Start with**: Collaborative Lists (enables team usage)

---

## Prompt Format Explanation

Each prompt follows a consistent structure:

### 1. **Objective**
Clear goal and what will be built

### 2. **Technical Context**
- Stack details
- Relevant file locations
- Current patterns to follow

### 3. **Current State Analysis**
- What exists now
- Where to integrate
- Dependencies

### 4. **Implementation Requirements**
Detailed specs broken down by component/feature

### 5. **Implementation Steps**
Step-by-step guide

### 6. **Code Quality Standards**
Patterns, naming, style to follow

### 7. **Expected Deliverables**
Concrete list of files/changes

### 8. **Success Criteria**
Checklist of what "done" looks like

### 9. **Testing Checklist**
Manual verification steps

---

## Support Files Reference

### Design System
- `DESIGN_SYSTEM.md` - Colors, spacing, component patterns
- `design-tokens.ts` - Reusable design tokens
- `CLAUDE.md` - Project-specific Claude Code guidance

### Database
- `packages/db/src/schema.ts` - Main database schema
- `packages/db/src/auth-schema.ts` - Auth tables
- `drizzle.config.ts` - Drizzle ORM configuration

### API
- `packages/api/src/router/` - tRPC route definitions
- `packages/api/src/root.ts` - Root router registration

### Web App
- `apps/nextjs/src/app/` - Next.js app directory
- `apps/nextjs/src/app/_components/` - React components

### Mobile App
- `apps/expo/src/app/` - Expo app structure
- `apps/expo/src/components/` - React Native components

---

## Troubleshooting

### "Schema push fails"
```bash
cd packages/db
pnpm push
```

### "Type errors after schema changes"
Drizzle auto-generates types, but restart your IDE to pick them up.

### "tRPC procedures not showing in client"
Make sure the router is registered in `packages/api/src/root.ts`

### "Mobile app crashes on notification"
Check `app.json` notification configuration and permissions.

### "Styles not working on mobile"
NativeWind v5 requires different class names than web Tailwind sometimes.

---

## Contributing Back

If you implement these features:
1. Consider contributing improvements to this guide
2. Document any edge cases you found
3. Share your implementation timeline
4. Report any prompt inaccuracies

---

## Questions?

- Check `CLAUDE.md` in project root for project patterns
- Read `README.md` for setup and commands
- Review `DESIGN_SYSTEM.md` for UI guidelines
- Check existing code for similar patterns

---

**Version**: 1.0
**Last Updated**: 2026-02-16
**Maintained by**: Claude AI Assistant

For the most up-to-date version of these prompts, check the `claude/prompts/` directory in your project.
