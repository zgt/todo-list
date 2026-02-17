# Tokilist Claude Code Implementation Prompts

> **Optimized prompts for implementing major features in the Tokilist todo application**

## 📁 What's Inside

This directory contains detailed, production-ready prompts for Claude Code to implement four major features for your Tokilist app. Each prompt is designed to be copy-pasted directly into Claude Code for step-by-step implementation.

## 🎯 Available Features

### ✅ Priority System (Ready to Use)
**Status**: 100% Complete | 4/4 prompts  
**Location**: `01-priority-system/`  
**Time**: 4-6 hours  
**Difficulty**: ⭐⭐ Intermediate

Add high/medium/low priority levels to tasks with filtering, sorting, and visual indicators.

**Prompts**:
1. Database Schema & Types
2. tRPC API Integration  
3. Web UI Components
4. Mobile UI Components

---

### 🔔 Reminders (In Progress)
**Status**: 17% Complete | 1/6 prompts  
**Location**: `02-reminders/`  
**Time**: 12-16 hours  
**Difficulty**: ⭐⭐⭐⭐ Advanced

Multiple reminders per task with iOS/Android push notifications.

**Completed**:
1. ✅ Research & Database Schema

**Needed** (outlines in `REMAINING_PROMPTS.md`):
2. Expo Notifications Setup
3. Notification Scheduling Service
4. tRPC API
5. Web UI
6. Mobile UI with Native Notifications

---

### 🤝 Collaborative Lists (Planned)
**Status**: 0% Complete | 0/6 prompts  
**Location**: `03-collaborative-lists/`  
**Time**: 16-20 hours  
**Difficulty**: ⭐⭐⭐⭐⭐ Expert

Share lists with other users, real-time sync, permissions, activity tracking.

**Planned Prompts** (see `REMAINING_PROMPTS.md`):
1. Database Schema (shared lists, permissions)
2. Authorization & Access Control
3. tRPC API (invites, members, sharing)
4. Real-time Sync with WebSockets
5. Web UI (share dialog, member management)
6. Mobile UI (collaboration features)

---

### 🔽 Sub-tasks (Planned)
**Status**: 0% Complete | 0/6 prompts  
**Location**: `04-sub-tasks/`  
**Time**: 10-14 hours  
**Difficulty**: ⭐⭐⭐⭐ Advanced

Break tasks into sub-tasks with progress tracking and hierarchical display.

**Planned Prompts** (see `REMAINING_PROMPTS.md`):
1. Database Schema (self-referencing hierarchy)
2. tRPC API (recursive queries)
3. Progress Tracking Logic
4. Web UI (nested task display)
5. Mobile UI (collapsible trees)
6. Drag & Drop Reordering

---

## 🚀 Quick Start

### Option 1: Start with Priority System (Recommended)
The priority system is fully documented and ready to implement. It's the perfect starting point because:
- ✅ All prompts are complete and tested
- ✅ Covers all core patterns (DB, API, Web UI, Mobile UI)
- ✅ Easiest of the four features
- ✅ Immediate user value

**Steps**:
1. Open Claude Code in your project
2. Navigate to `01-priority-system/01-database-schema.md`
3. Copy the entire prompt
4. Paste into Claude Code
5. Review and commit changes
6. Move to prompt 02, 03, 04 in sequence

### Option 2: Start with Reminders
If you want notifications, start here. Complete the research prompt first, then use outlines in `REMAINING_PROMPTS.md` to create prompts 2-6.

### Option 3: Wait for All Prompts
Check `REMAINING_PROMPTS.md` for what's still needed. Once complete, you can implement any feature.

---

## 📖 Documentation

- **`IMPLEMENTATION_GUIDE.md`** - How to use these prompts, verification commands, troubleshooting
- **`REMAINING_PROMPTS.md`** - Detailed outlines of prompts that still need to be created
- **`README.md`** (this file) - Overview and quick start

---

## 🛠️ How to Use a Prompt

1. **Read the entire prompt** first to understand what will be implemented
2. **Open Claude Code** in your project directory
3. **Copy the prompt** from start to finish
4. **Paste into Claude Code** and let it work
5. **Review the changes** carefully
6. **Run tests** from the Testing Checklist
7. **Commit** before moving to the next prompt

### Important Notes:
- Do prompts **in order** within each feature
- **Don't skip** the testing checklist
- **Commit between prompts** for easy rollback
- **Read Code Quality Standards** in each prompt

---

## ✅ Success Criteria

Each prompt includes a **Success Criteria** checklist. Don't move to the next prompt until all items are checked.

Example from Priority System Schema prompt:
```
- ✅ priority field added to Task table
- ✅ Indexes created for performance
- ✅ Check constraints enforce valid values
- ✅ TaskPriority Zod enum created
- ✅ Schema push completes without errors
```

---

## 🧪 Testing Commands

After each prompt, run:

```bash
# Type checking
pnpm typecheck

# Push database changes
pnpm db:push

# View database
pnpm db:studio

# Dev server (web)
pnpm dev:next

# Mobile simulator
pnpm ios
pnpm android
```

---

## 🎨 Design System

All UI prompts reference the project's design system. Key files:
- `DESIGN_SYSTEM.md` - Colors, spacing, typography
- `design-tokens.ts` - Reusable design tokens

**Emerald Green Theme**:
- Primary: `#50C878` (emerald green)
- Background: `#0A1A1A` (deep) / `#102A2A` (surface)
- Text: `#DCE4E4` (primary) / `#8FA8A8` (muted)

---

## 🏗️ Project Structure

```
apps/
  ├── expo/               # React Native mobile app
  └── nextjs/             # Next.js web app
packages/
  ├── api/                # tRPC router definitions
  ├── auth/               # Better Auth config
  ├── db/                 # Drizzle schema and client
  └── ui/                 # Shared UI components
```

Database changes go in: `packages/db/src/schema.ts`  
API changes go in: `packages/api/src/router/`  
Web UI goes in: `apps/nextjs/src/app/_components/`  
Mobile UI goes in: `apps/expo/src/components/`

---

## 🔄 Current Status Summary

| Feature              | Prompts | Status | Ready to Use? |
|----------------------|---------|--------|---------------|
| Priority System      | 4/4     | ✅ 100% | YES           |
| Reminders            | 1/6     | 🟡 17%  | Partial       |
| Collaborative Lists  | 0/6     | ⚪ 0%   | No            |
| Sub-tasks            | 0/6     | ⚪ 0%   | No            |

**Total**: 5/22 prompts complete (23%)

---

## 📝 Contributing

If you create any of the missing prompts:
1. Follow the format of existing prompts
2. Include all required sections
3. Test with Claude Code before committing
4. Update this README with status
5. Add to the appropriate folder

---

## 🆘 Help & Support

**Having issues?**
- Check `IMPLEMENTATION_GUIDE.md` for troubleshooting
- Review `CLAUDE.md` in project root for project patterns
- Check existing prompts for examples
- Look at completed features for reference

**Found a bug in a prompt?**
- Note what didn't work
- Check if it's a Claude Code limitation
- Refine the prompt and update the file

---

## 🗺️ Roadmap

### Immediate (Week 1)
- ✅ Complete Priority System prompts
- ✅ Create Reminders research prompt
- 🟡 Complete remaining Reminders prompts

### Short-term (Week 2-3)
- ⚪ Create all Collaborative Lists prompts
- ⚪ Create all Sub-tasks prompts
- ⚪ Test all prompts end-to-end

### Long-term (Month 2+)
- Additional features as needed
- Refinement based on usage
- Community contributions

---

## 📄 License

These prompts are part of the Tokilist project. Use them freely to implement features in your own Tokilist fork or similar projects.

---

**Last Updated**: 2026-02-16  
**Version**: 1.0  
**Maintained by**: Claude AI Assistant

**Ready to start?** → Open `01-priority-system/01-database-schema.md` and begin! 🚀
