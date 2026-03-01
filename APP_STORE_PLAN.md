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

## 2. Account & Privacy (CRITICAL — top rejection reasons)

| Item | Status | Action Needed |
|------|--------|---------------|
| **Privacy Policy** | ❌ | Need a privacy policy URL hosted somewhere + linked in App Store Connect + accessible inside the app (Settings) |
| **Account Deletion** | ❌ | Apple **requires** in-app account deletion if you support account creation. Need a "Delete Account" option in profile/settings |
| **Privacy Nutrition Labels** | ❌ | Must declare what data you collect in App Store Connect (email, name, usage data, push tokens, etc.) |

## 3. User-Generated Content (UGC)

Music leagues have user-submitted content (song submissions, comments, league names). Apple requires:

| Item | Status | Action Needed |
|------|--------|---------------|
| **Report content** | ❌ | Need report buttons on leagues, submissions, user profiles |
| **Block users** | ❌ | Need ability to block abusive users |
| **Content filtering** | ❌ | Basic profanity/content filter or moderation queue |
| **Published contact info** | ❌ | Support email accessible from Settings/Help in the app |

## 4. App Store Metadata

| Item | Status | Action Needed |
|------|--------|---------------|
| App name & subtitle | ⚠️ | Need to finalize |
| Description | ❌ | Write compelling App Store description |
| Screenshots | ❌ | Need iPhone screenshots for required device sizes (6.7", 6.1", 5.5") |
| App category | ⚠️ | Productivity + Social? |
| Age rating | ❌ | Fill out age rating questionnaire (updated Jan 2026) |
| Keywords | ❌ | Research and set App Store keywords |

## 5. In-App Purchases

| Item | Status | Notes |
|------|--------|-------|
| IAP needed? | ✅ (N/A) | No paid features currently — no IAP needed |
| Restore Purchases | ✅ (N/A) | Not applicable if no IAP |

## 6. Apple Developer Account

| Item | Status | Action Needed |
|------|--------|---------------|
| Apple Developer Program ($99/yr) | ⚠️ | Need active membership |
| EAS Submit configured | ⚠️ | Check `eas.json` for production profile |
| Certificates & provisioning | ⚠️ | EAS handles this, but verify |

---

## 🎯 Recommended Action Plan (Priority Order)

### Phase 1 — Blockers (must have)
1. **Add Privacy Policy** — host it (even a simple GitHub Pages site), link in app Settings
2. **Add Account Deletion** — add "Delete My Account" to profile menu with confirmation
3. **Add basic UGC moderation** — report buttons + block user + support email in Settings
4. **Privacy Nutrition Labels** — document all data collected for App Store Connect

### Phase 2 — Polish
5. Full QA pass on clean device (every screen, every flow)
6. Fix any remaining UI bugs
7. Write App Store description + prepare screenshots
8. Fill out age rating questionnaire

### Phase 3 — Submit
9. Create production EAS build
10. Submit via EAS Submit or App Store Connect
11. Include demo account credentials in App Review Notes

---

## References
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Submission Guide](https://developer.apple.com/app-store/submitting/)
- [Account Deletion Requirements](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Privacy Nutrition Labels](https://developer.apple.com/app-store/app-privacy-details/)
- [Expo: Submit to App Stores](https://docs.expo.dev/deploy/submit-to-app-stores/)
