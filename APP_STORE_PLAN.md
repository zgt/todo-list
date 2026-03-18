# 🍎 Tokilist — App Store Submission Readiness Plan

## What Apple Requires (and where Tokilist stands)

**✅ = Ready | ⚠️ = Needs Work | ❌ = Missing**

---

## 1. Technical Requirements

| Item | Status | Notes |
|------|--------|-------|
| Built with latest Xcode/SDK | ⚠️ | Starting April 2026, must use iOS 26 SDK. Check Expo SDK + EAS build config |
| No crashes on fresh install | ⚠️ | Need full test pass on clean device (no dev data) |
| All features functional | ⚠️ | No placeholder screens, "coming soon" sections, or broken flows |
| App icon (light + dark) | ✅ | Both `icon-light.png` and `icon-dark.png` configured |
| Splash screen | ✅ | Configured with expo-splash-screen |
| Bundle ID | ✅ | `com.zgtf.todolist` |
| Responsive layout | ✅ | Bottom bar responsive on small (375pt) and large screens |
| Auth working in production | ✅ | Fixed baseURL mismatch (was using Vercel domain instead of calayo.net) |
| `ITSAppUsesNonExemptEncryption` | ✅ | Set to `false` in app.config.ts |

## 2. Account & Privacy (CRITICAL — top rejection reasons)

| Item | Status | Notes |
|------|--------|-------|
| **Privacy Policy** | ✅ | Hosted at calayo.net/privacy, linked in app profile/settings |
| **Terms of Service** | ✅ | Hosted at calayo.net/terms, linked in app profile/settings |
| **Account Deletion** | ✅ | "Delete Account" in profile with confirmation dialog, full data wipe |
| **Privacy Nutrition Labels** | ✅ | Documented below — ready to enter in App Store Connect |
| **Contact Support** | ✅ | support@calayo.net linked in profile settings with mail icon |

## 3. User-Generated Content (UGC)

| Item | Status | Notes |
|------|--------|-------|
| **Report content** | ✅ | ReportSheet component — report users with reason picker + details |
| **Block users** | ✅ | Block from shared list member menu, confirmation alert |
| **Blocked users management** | ✅ | Dedicated blocked-users screen accessible from profile settings |
| **Content filtering** | ✅ | Server-side: blocked users' tasks + members filtered from shared lists |
| **Published contact info** | ✅ | support@calayo.net in profile settings |
| **Moderation backend** | ✅ | Full moderation router: report, block/unblock, admin report listing |

## 4. App Store Metadata

| Item | Status | Notes |
|------|--------|-------|
| App name & subtitle | ✅ | "Tokilist" / "Tasks, Lists & Collaboration" |
| Description | ✅ | Written in APP_STORE_METADATA.md |
| Screenshots | ❌ | Need iPhone screenshots for 6.7" and 6.1". No Mac/Xcode — take on device and resize with ffmpeg |
| App category | ✅ | Primary: Productivity, Secondary: Lifestyle |
| Age rating | ✅ | Documented — 4+ or 9+ (UGC) |
| Keywords | ✅ | 100 chars of comma-separated keywords ready |
| What's New text | ✅ | Version 1.0.0 release notes written |
| App Review Notes | ⚠️ | Needs update — swipe gestures changed (see below) |

## 5. In-App Purchases

| Item | Status | Notes |
|------|--------|-------|
| IAP needed? | ✅ (N/A) | No paid features — no IAP needed |
| Restore Purchases | ✅ (N/A) | Not applicable |

## 6. Apple Developer Account

| Item | Status | Notes |
|------|--------|-------|
| Apple Developer Program ($99/yr) | ⚠️ | Need active membership |
| EAS Submit configured | ✅ | Production profile + submit config in eas.json |
| Certificates & provisioning | ✅ | EAS handles this |

## 7. iOS Widgets

| Item | Status | Notes |
|------|--------|-------|
| Small widget | ✅ | Circular progress ring with task preview |
| Calendar week/month widgets | ✅ | Added |
| Large widget | ✅ | Shows up to 10 tasks |

---

## 🎯 Remaining Action Items

### Blockers
1. **Screenshots** — Take on your phone, resize to 1290×2796 (6.7") and 1179×2556 (6.1") with ffmpeg
2. **Apple Developer membership** — Verify active

### Polish
3. **Full QA pass** on clean device (fresh install, no dev data)
4. **Update App Review Notes** — Swipe gestures changed: left/up = complete, right/down = pending delete, double-tap = edit
5. Fill out age rating questionnaire in App Store Connect
6. Enter Privacy Nutrition Labels in App Store Connect

### Submit
7. Create production EAS build: `eas build --profile production --platform ios`
8. Submit: `eas submit --platform ios`
9. Include demo account credentials in App Review Notes

---

## Recent Changes (March 2026)
- Music league fully split out to standalone chumbaleague app
- Swipe gestures redesigned: left/up = toggle complete, right/down = pending delete, double-tap = edit
- Multi-delete: pending-delete tasks collected, FAB turns into red trash button for bulk delete
- Animated task reordering in list view (completed tasks slide to bottom)
- Animated subtask reordering in both list and card view
- Report/block moderation UI on shared list members
- Blocked users screen in profile settings
- Server-side filtering of blocked users' content
- Contact Support (support@calayo.net) in profile
- Responsive bottom bar for small iPhones
- iOS widgets: circular progress ring, calendar widgets
- Auth fix: production baseURL mismatch resolved
- Deleted tasks list view with restore

---

## References
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Submission Guide](https://developer.apple.com/app-store/submitting/)
- [Account Deletion Requirements](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Privacy Nutrition Labels](https://developer.apple.com/app-store/app-privacy-details/)
- [Expo: Submit to App Stores](https://docs.expo.dev/deploy/submit-to-app-stores/)
