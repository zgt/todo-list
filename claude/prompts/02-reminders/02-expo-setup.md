# Reminders - Expo Notifications Setup

Configure `expo-notifications` package for iOS and Android local notifications with proper permissions and notification categories.

## Installation & Configuration

1. **Install expo-notifications**:
   ```bash
   cd apps/expo
   npx expo install expo-notifications
   ```

2. **Update `app.json`** - Add notification configuration:
   ```json
   {
     "expo": {
       "plugins": [
         [
           "expo-notifications",
           {
             "icon": "./assets/notification-icon.png",
             "color": "#50C878",
             "sounds": ["./assets/notification-sound.wav"],
             "mode": "production"
           }
         ]
       ],
       "notification": {
         "icon": "./assets/notification-icon.png",
         "color": "#50C878",
         "iosDisplayInForeground": true,
         "androidMode": "default",
         "androidCollapsedTitle": "Tokilist Reminder"
       },
       "ios": {
         "infoPlist": {
           "UIBackgroundModes": ["remote-notification"]
         }
       },
       "android": {
         "adaptiveIcon": {
           "foregroundImage": "./assets/adaptive-icon.png",
           "backgroundColor": "#0A1A1A"
         },
         "permissions": [
           "android.permission.RECEIVE_BOOT_COMPLETED",
           "android.permission.VIBRATE",
           "android.permission.WAKE_LOCK"
         ]
       }
     }
   }
   ```

3. **Create notification categories** - `apps/expo/src/utils/notifications/categories.ts`:
   - Define notification categories for task actions
   - Categories: "task-reminder" with actions:
     - "complete" - Mark task as complete
     - "snooze-15" - Snooze for 15 minutes
     - "snooze-1h" - Snooze for 1 hour
     - "view" - Open task detail
   - Register categories on app startup

4. **Create permission handler** - `apps/expo/src/utils/notifications/permissions.ts`:
   - `requestPermissions()` - Request notification permissions with error handling
   - `checkPermissions()` - Check current permission status
   - `openSettings()` - Deep link to app settings if permissions denied
   - Return proper types: `{ granted: boolean, canAskAgain: boolean, status: string }`

5. **Create notification manager** - `apps/expo/src/utils/notifications/manager.ts`:
   - `setupNotifications()` - Initialize notifications on app startup
     - Request permissions
     - Set notification handler (how to handle notifications when app is foregrounded)
     - Register notification categories
     - Set up notification listeners (received, response)
   - `handleNotificationResponse(response)` - Handle user tapping notification or action buttons
     - Parse notification data
     - Navigate to appropriate screen
     - Trigger action (complete task, snooze, etc.)
   - Export singleton instance

6. **Configure notification handler** - Set behavior when notifications arrive while app is open:
   ```typescript
   Notifications.setNotificationHandler({
     handleNotification: async () => ({
       shouldShowAlert: true,
       shouldPlaySound: true,
       shouldSetBadge: true,
     }),
   });
   ```

7. **Update App entry point** - `apps/expo/src/app/_layout.tsx`:
   - Import and call `setupNotifications()` in root layout useEffect
   - Set up notification listeners
   - Handle deep linking from notifications

## Testing Setup

1. **Create test screen** - `apps/expo/src/app/test-notifications.tsx`:
   - Button to request permissions
   - Button to schedule test notification in 5 seconds
   - Button to schedule notification in 1 minute
   - Button to check permission status
   - Display current badge count
   - Button to clear all notifications

2. **Test checklist**:
   - [ ] Permissions request shows native dialog
   - [ ] Can grant/deny permissions
   - [ ] Scheduled notifications appear on time
   - [ ] Notifications show when app is closed
   - [ ] Notifications show when app is backgrounded
   - [ ] Notifications show when app is foregrounded
   - [ ] Badge count updates correctly
   - [ ] Notification actions work (complete, snooze)
   - [ ] Tapping notification opens app

## Platform-Specific Notes

**iOS**:
- Permissions required before scheduling
- Maximum ~64 scheduled notifications
- Badge count must be manually managed
- Critical alerts require special entitlement (skip for now)

**Android**:
- Need to create notification channel
- Different permission flow on Android 13+
- Exact alarm permission for time-sensitive notifications
- Background restrictions may affect delivery

## Environment Setup

1. **Update `.env`** - No new env vars needed for local notifications

2. **Rebuild native projects** (after app.json changes):
   ```bash
   cd apps/expo
   npx expo prebuild --clean
   npx expo run:ios
   npx expo run:android
   ```

## Success Criteria

- ✅ expo-notifications installed
- ✅ app.json configured with notification settings
- ✅ Notification categories registered
- ✅ Permission request works on iOS and Android
- ✅ Can schedule and receive test notifications
- ✅ Notification actions work (complete, snooze)
- ✅ App handles notification taps correctly
- ✅ Badge count updates
- ✅ No console errors

Run `pnpm typecheck` to verify TypeScript compilation.
