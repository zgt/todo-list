# Music League Expo Implementation Plan

## Current State Analysis

### What Exists in Expo

The Expo app has three basic screens under `apps/expo/src/app/music/`:

| Screen        | Route                | Status                                                                    |
| ------------- | -------------------- | ------------------------------------------------------------------------- |
| Dashboard     | `/music`             | Basic - lists leagues with member count and current round                 |
| League Detail | `/music/league/[id]` | Basic - shows members, rounds list, invite code                           |
| Round Detail  | `/music/round/[id]`  | Partial - shows theme, deadlines, submissions list, basic results ranking |

**What these screens do today:**

- Dashboard lists leagues via `musicLeague.getAllLeagues`, shows league name, member count badge, and current round theme/status
- League detail fetches via `musicLeague.getLeagueById`, displays invite code, member pills with owner badge, and round cards with status
- Round detail fetches via `musicLeague.getRoundById`, shows theme/deadlines, user's own submission, submission list, and ranked results in RESULTS phase

**What they're missing:**

- No interactive features (no forms, no mutations, no user actions)
- No Spotify search or song submission
- No voting interface
- No create/join league flow
- No create round flow
- No admin controls (advance phase, settings)
- No league standings
- No profile/settings
- No playlist view
- No countdown timers
- No share/copy invite functionality

---

### Available tRPC Procedures

All procedures already exist in `packages/api/src/router/music-league/index.ts`. The Expo app just needs to call them.

#### League Management

| Procedure                    | Type           | Used in Expo?       |
| ---------------------------- | -------------- | ------------------- |
| `getAllLeagues`              | Query          | Yes (dashboard)     |
| `getLeagueById`              | Query          | Yes (league detail) |
| `getLeagueByInviteCode`      | Query (public) | No                  |
| `createLeague`               | Mutation       | No                  |
| `joinLeague`                 | Mutation       | No                  |
| `leaveLeague`                | Mutation       | No                  |
| `deleteLeague`               | Mutation       | No                  |
| `updateLeagueSettings`       | Mutation       | No                  |
| `regenerateLeagueInviteCode` | Mutation       | No                  |
| `getLeagueStandings`         | Query          | No                  |

#### Round Management

| Procedure               | Type     | Used in Expo?      |
| ----------------------- | -------- | ------------------ |
| `getRoundById`          | Query    | Yes (round detail) |
| `getLatestRound`        | Query    | No                 |
| `createRound`           | Mutation | No                 |
| `advanceRoundPhase`     | Mutation | No                 |
| `setRoundPlaylistUrl`   | Mutation | No                 |
| `generateRoundPlaylist` | Mutation | No                 |
| `getPlaylistTracks`     | Query    | No                 |

#### Submissions & Voting

| Procedure          | Type     | Used in Expo? |
| ------------------ | -------- | ------------- |
| `searchSpotify`    | Query    | No            |
| `createSubmission` | Mutation | No            |
| `submitVotes`      | Mutation | No            |

#### User

| Procedure                       | Type     | Used in Expo? |
| ------------------------------- | -------- | ------------- |
| `getUserProfile`                | Query    | No            |
| `updateNotificationPreferences` | Mutation | No            |

**Summary: 22 procedures exist, only 3 are used.** The backend is complete; this is purely a frontend build.

---

### Web App Reference (What Expo Should Match)

The Next.js app at `apps/nextjs/src/app/music/` has these pages and components:

**Pages:** Dashboard, League Detail, Create League, Join League, Round Detail, Create Round, Playlist, Profile, Settings

**Components:** SubmitSong (Spotify search + submit), TrackList, VoteInterface (point allocation), RoundStatusBoard (member progress), LeagueStandings (table), RoundResults (ranked list with podium), MusicBreadcrumbs

---

## Screens to Build

### Screen 1: Dashboard Enhancement (`/music/index.tsx`)

**Current:** Lists leagues as cards
**Add:**

- "Join League" input field with invite code entry + join button
- "Create League" button navigating to create screen
- Upcoming deadlines section (submission/voting deadlines across leagues, sorted by nearest)
- Pull-to-refresh on league list
- Empty state with CTA when no leagues joined

**tRPC calls:**

- `musicLeague.getAllLeagues` (existing)
- `musicLeague.joinLeague` (new mutation)

**UI components:**

- `TextInput` for invite code
- Deadline countdown pills
- Empty state illustration

**Platform notes:** Use `Share` API for invite links instead of clipboard copy

---

### Screen 2: Create League (`/music/league/create.tsx`)

**Route:** `/music/league/create`

**Displays:**

- Form with: league name (required), description (optional), songs per round (1-5 picker), upvote points per round (1-20), allow downvotes toggle

**tRPC calls:**

- `musicLeague.createLeague` mutation
- Navigate to new league on success

**UI components:**

- `TextInput` for name/description
- Number picker or stepper for songs per round
- Slider or stepper for upvote points
- `Switch` for downvotes toggle
- Submit button with loading state

**Platform notes:** Use bottom sheet or wheel picker for numeric selections (match existing `CategoryWheelPicker` pattern)

---

### Screen 3: Join League (`/music/join/[inviteCode].tsx`)

**Route:** `/music/join/[inviteCode]`

**Displays:**

- League preview: name, description, member count / max capacity
- "Join League" button
- Already-a-member state redirecting to league
- Error state for invalid codes

**tRPC calls:**

- `musicLeague.getLeagueByInviteCode` query
- `musicLeague.joinLeague` mutation

**UI components:**

- League preview card
- Join button with loading state
- Error/empty states

**Platform notes:** This route supports deep linking (`tokilist://music/join/ABC123`). Register the route in the Expo scheme config.

---

### Screen 4: League Detail Enhancement (`/music/league/[id].tsx`)

**Current:** Shows members and rounds
**Add:**

- League standings section (table: rank, name, points, wins)
- Share invite link button (native share sheet)
- Admin actions: settings modal, regenerate invite code
- Create round button (admin/owner only)
- Leave league button
- Delete league button (owner only, with confirmation)
- Pull-to-refresh

**tRPC calls (new):**

- `musicLeague.getLeagueStandings` query
- `musicLeague.updateLeagueSettings` mutation
- `musicLeague.regenerateLeagueInviteCode` mutation
- `musicLeague.leaveLeague` mutation
- `musicLeague.deleteLeague` mutation

**UI components:**

- `LeagueStandings` component (table/list)
- Settings bottom sheet modal
- Share button using `Share.share()`
- Confirmation alert for destructive actions

**Platform notes:** Use `Alert.alert()` for destructive confirmation dialogs (native feel)

---

### Screen 5: Create Round (`/music/round/create.tsx`)

**Route:** `/music/round/create?leagueId=xxx`

**Displays:**

- Theme name input (required)
- Theme description input (optional)
- Theme template browser (bottom sheet with 25+ templates in categories)
- Submission deadline picker
- Voting deadline picker
- Smart defaults: submission 3 days out, voting 5 days out

**tRPC calls:**

- `musicLeague.getLatestRound` query (for smart deadline defaults)
- `musicLeague.createRound` mutation

**UI components:**

- `TextInput` for theme name/description
- `DateTimePicker` (use `@react-native-community/datetimepicker` or `expo-date-time-picker`)
- Theme template bottom sheet with search/filter by category
- Validation: voting deadline > submission deadline, both in future

**Platform notes:** Native datetime pickers differ on iOS vs Android. Use platform-specific date picker components.

---

### Screen 6: Round Detail Enhancement (`/music/round/[id].tsx`)

**Current:** Shows theme, deadlines, basic submission list, basic results
**Rebuild to be phase-aware:**

#### SUBMISSION Phase

- Show submission count progress: "2/5 songs submitted"
- "Submit a Song" button → navigates to submit screen or opens bottom sheet
- List of user's own submissions with remove option
- Member status board: who has submitted

#### LISTENING Phase

- Track list with album art, track name, artist, duration
- "Open in Spotify" deep links (`spotify:track:{id}` for app, `https://open.spotify.com/track/{id}` for web)
- Spotify preview playback (if `previewUrl` available, use `expo-av` Audio)
- Playlist URL link (if set by admin)

#### VOTING Phase

- Voting interface: cards for each submission (not own)
- Point allocation with +/- stepper per submission
- Remaining points budget display
- Optional comment per submission (280 char max)
- Submit votes button
- Edit votes option (re-submit)

#### RESULTS / COMPLETED Phase

- Ranked submissions list with points
- Winner highlight (gold accent, trophy icon)
- Submitter names revealed
- Vote breakdown per submission
- Comments displayed under each submission

#### Admin Controls (all phases)

- "Advance Phase" button (owner/admin only)
- Set playlist URL input (owner/admin only)
- Phase progress indicator (4-step: Submit → Listen → Vote → Results)

**tRPC calls (new):**

- `musicLeague.advanceRoundPhase` mutation
- `musicLeague.setRoundPlaylistUrl` mutation
- `musicLeague.submitVotes` mutation
- `musicLeague.getPlaylistTracks` query

**UI components:**

- `PhaseProgressBar` - visual 4-step indicator
- `SubmissionCard` - album art, track info, Spotify link
- `VoteCard` - submission + point stepper + comment input
- `ResultCard` - ranked submission with points and voter breakdown
- `MemberStatusBoard` - avatar list with submitted/voted checkmarks
- `CountdownTimer` - live countdown to next deadline

**Platform notes:**

- Use `expo-av` for audio preview playback (30-sec Spotify previews)
- Use `Linking.openURL()` for Spotify deep links (prefer `spotify:` URI scheme on mobile)
- Haptic feedback on vote stepper changes (`expo-haptics`)

---

### Screen 7: Submit Song (`/music/round/[roundId]/submit.tsx` or bottom sheet)

**Route:** `/music/round/[roundId]/submit` (or presented as bottom sheet from round detail)

**Displays:**

- Spotify search input with debounced search (300ms)
- Search results list: album art (48x48), track name, artist, album, duration
- Selected track preview: larger album art (120x120), full metadata, audio preview
- Submit button

**tRPC calls:**

- `musicLeague.searchSpotify` query (debounced)
- `musicLeague.createSubmission` mutation

**UI components:**

- Search input with magnifying glass icon
- `SpotifyTrackCard` - reusable track display card
- Audio preview player (play/pause, progress bar)
- Loading skeleton for search results

**Platform notes:**

- `expo-av` for audio preview playback
- Keyboard-aware scroll view for search input
- Use `FlatList` for search results (virtualized)

---

### Screen 8: Playlist View (`/music/round/[roundId]/playlist.tsx`)

**Route:** `/music/round/[roundId]/playlist`

**Displays:**

- Round theme and track count header
- Full track list with album art, name, artist, duration
- "Open in Spotify" per track
- "Share All Tracks" button (share track links via native share sheet)
- Playlist link (if set by admin)

**tRPC calls:**

- `musicLeague.getPlaylistTracks` query

**UI components:**

- Track list (reuse `SpotifyTrackCard`)
- Share button using `Share.share()`

**Platform notes:** Spotify deep links: `spotify:track:{id}` opens Spotify app directly on mobile

---

### Screen 9: Profile (`/music/profile.tsx`)

**Route:** `/music/profile`

**Displays:**

- User avatar and name
- Stats cards: Total Points, Rounds Won, Leagues Active, Total Submissions
- Best submission card: album art, track name, artist, points earned, round theme
- Link to notification settings

**tRPC calls:**

- `musicLeague.getUserProfile` query

**UI components:**

- Stats grid (2x2 cards)
- Best submission card (reuse `SpotifyTrackCard` variant)

---

### Screen 10: Settings (`/music/settings.tsx`)

**Route:** `/music/settings`

**Displays:**

- Notification preference toggles:
  - Round Started
  - Submission Reminder
  - Voting Open
  - Results Available
- Save button (disabled when no changes)

**tRPC calls:**

- `musicLeague.getUserProfile` query (load current preferences)
- `musicLeague.updateNotificationPreferences` mutation

**UI components:**

- Switch toggles per notification type
- Save button with loading state

**Platform notes:** Consider push notification registration flow (`expo-notifications`) in addition to email preferences

---

## Shared Components to Build

### New Components (under `apps/expo/src/components/music/`)

| Component              | Description                                                | Web Equivalent            |
| ---------------------- | ---------------------------------------------------------- | ------------------------- |
| `SpotifyTrackCard`     | Album art + track name + artist + duration + Spotify link  | `TrackList` item          |
| `VoteCard`             | Track card + point stepper + comment input                 | `VoteInterface` card      |
| `ResultCard`           | Ranked track card with points, submitter, vote breakdown   | `RoundResults` item       |
| `PhaseProgressBar`     | 4-step visual indicator (Submit → Listen → Vote → Results) | Phase bar in round detail |
| `CountdownTimer`       | Live countdown to deadline                                 | Countdown in round detail |
| `MemberStatusBoard`    | Member avatars with submit/vote completion indicators      | `RoundStatusBoard`        |
| `LeagueStandingsTable` | Ranked list: player name, total points, wins               | `LeagueStandings`         |
| `PointStepper`         | +/- buttons with current value for vote allocation         | Part of `VoteInterface`   |
| `RemainingPointsBadge` | Points remaining display with color coding                 | Part of `VoteInterface`   |
| `StatusBadge`          | Round status pill (SUBMISSION, LISTENING, etc.)            | Status badges in web      |
| `ThemeTemplatePicker`  | Bottom sheet with categorized theme templates              | Theme browser modal       |
| `AudioPreviewPlayer`   | Play/pause button + progress bar for Spotify previews      | Spotify embed             |
| `LeagueSettingsSheet`  | Bottom sheet with league settings form                     | Settings modal            |
| `ConfirmationAlert`    | Alert.alert wrapper for destructive actions                | Confirmation modal        |

### Existing Components to Reuse

| Component              | From            | Use In                                 |
| ---------------------- | --------------- | -------------------------------------- |
| `GradientBackground`   | Shared          | All music screens                      |
| `CategoryPill` pattern | Tasks           | Status pills, filter pills             |
| `FAB` pattern          | Tasks           | "Create Round" / "Submit Song" buttons |
| Bottom sheet pattern   | Category filter | Theme picker, settings, submit song    |

---

## Feature Gap Analysis

### 1. Spotify Search & Song Submission

**Gap:** No search UI, no submission flow
**Solution:** Build `SubmitSong` screen with debounced Spotify search, track preview, and submission mutation
**Complexity:** Medium - requires search UI, audio preview, submission state management

### 2. Voting Interface

**Gap:** No vote allocation UI, no point budget management
**Solution:** Build `VoteCard` components with `PointStepper`, remaining points tracking, comment inputs
**Complexity:** High - complex state management for point allocation across multiple submissions, validation logic

### 3. Results & Leaderboards

**Gap:** Basic ranked list exists but no podium, no vote breakdown, no comments, no league standings
**Solution:** Enhance results view with winner highlight, expand submissions to show individual votes/comments. Build `LeagueStandingsTable`.
**Complexity:** Medium - mostly display components with sorting logic

### 4. Round Phase Management

**Gap:** No admin controls, no phase advancement, no member status tracking
**Solution:** Add admin section to round detail with advance phase button, playlist URL input. Build `MemberStatusBoard` and `PhaseProgressBar`.
**Complexity:** Low-Medium - mutations + conditional UI based on user role

### 5. Create/Join League Flow

**Gap:** No creation form, no join flow, no deep link handling for invite codes
**Solution:** Build create league form screen and join league screen. Register deep link route.
**Complexity:** Low - standard form + mutation

### 6. Create Round Flow

**Gap:** No round creation, no theme templates, no deadline pickers
**Solution:** Build create round screen with theme input, template browser bottom sheet, and datetime pickers
**Complexity:** Medium - datetime pickers require platform-specific handling

### 7. League Settings & Management

**Gap:** No settings editing, no leave/delete, no invite code management
**Solution:** Build settings bottom sheet on league detail page with edit form, leave/delete actions
**Complexity:** Low - form in bottom sheet + mutations

### 8. Profile & Notification Settings

**Gap:** No profile stats, no notification preferences
**Solution:** Build profile screen and settings screen
**Complexity:** Low - read-only stats + toggle form

### 9. Audio Preview Playback

**Gap:** No audio playback for Spotify track previews
**Solution:** Use `expo-av` Audio API for 30-second preview playback
**Complexity:** Low-Medium - requires audio state management, play/pause controls

### 10. Push Notifications (Mobile-Specific)

**Gap:** Web uses email; mobile should also support push
**Solution:** Future phase - integrate `expo-notifications` for push notification delivery alongside email
**Complexity:** High - requires push notification server, token management, background handling
**Note:** Defer to Phase 7. Email notifications already work. Push is an enhancement.

---

## Implementation Order

### Phase 1: Core Navigation & League Management

**Priority:** Highest - enables all other features
**Dependencies:** None
**Screens:** Create League, Join League, Dashboard enhancement
**Effort:** ~2 days

1. Build `/music/league/create.tsx` - create league form
2. Build `/music/join/[inviteCode].tsx` - join league screen
3. Enhance `/music/index.tsx` - add join input, create button, pull-to-refresh, empty state
4. Register deep link for `tokilist://music/join/:inviteCode`

### Phase 2: League Detail & Settings

**Priority:** High - needed before round management makes sense
**Dependencies:** Phase 1
**Screens:** League detail enhancement
**Effort:** ~2 days

1. Build `LeagueStandingsTable` component
2. Build `LeagueSettingsSheet` bottom sheet component
3. Enhance `/music/league/[id].tsx` - add standings, share invite, admin actions, leave/delete
4. Build confirmation alert pattern for destructive actions

### Phase 3: Round Creation & Phase Controls

**Priority:** High - enables the game loop
**Dependencies:** Phase 2
**Screens:** Create Round, round detail admin controls
**Effort:** ~2 days

1. Build `ThemeTemplatePicker` bottom sheet
2. Build `PhaseProgressBar` component
3. Build `/music/round/create.tsx` - create round with theme templates and datetime pickers
4. Add admin controls to `/music/round/[id].tsx` - advance phase button, playlist URL input
5. Install `@react-native-community/datetimepicker` if not present

### Phase 4: Song Submission

**Priority:** High - core gameplay feature
**Dependencies:** Phase 3
**Screens:** Submit Song
**Effort:** ~3 days

1. Build `SpotifyTrackCard` component
2. Build `AudioPreviewPlayer` component (using `expo-av`)
3. Build `/music/round/[roundId]/submit.tsx` - Spotify search + preview + submit
4. Add submission count indicator and "Submit Song" CTA to round detail SUBMISSION phase
5. Add "my submissions" list with remove option

### Phase 5: Voting System

**Priority:** High - core gameplay feature
**Dependencies:** Phase 4
**Screens:** Voting UI in round detail
**Effort:** ~3 days

1. Build `PointStepper` component
2. Build `RemainingPointsBadge` component
3. Build `VoteCard` component (track + stepper + comment)
4. Implement voting section in round detail VOTING phase
5. Handle vote submission, re-submission (edit votes), and validation
6. Add haptic feedback on point changes

### Phase 6: Results & Standings

**Priority:** Medium - completes the game loop
**Dependencies:** Phase 5
**Screens:** Results view in round detail, standings
**Effort:** ~2 days

1. Build `ResultCard` component with vote breakdown and comments
2. Enhance RESULTS phase in round detail - winner highlight, full results list
3. Build `MemberStatusBoard` component
4. Add member status to round detail (all phases)
5. Build `CountdownTimer` component for deadline displays

### Phase 7: Profile, Settings, & Polish

**Priority:** Medium - quality of life features
**Dependencies:** Phase 1 (standalone)
**Screens:** Profile, Settings, Playlist
**Effort:** ~2 days

1. Build `/music/profile.tsx` - user stats and best submission
2. Build `/music/settings.tsx` - notification preference toggles
3. Build `/music/round/[roundId]/playlist.tsx` - full track list with Spotify links
4. Add Spotify deep links throughout (open tracks in Spotify app)
5. Add pull-to-refresh to all list screens
6. Add loading skeletons to all screens
7. Add empty states to all list views

### Phase 8: Push Notifications (Future)

**Priority:** Low - enhancement over existing email notifications
**Dependencies:** Phase 7
**Effort:** ~3 days

1. Install and configure `expo-notifications`
2. Register push tokens on login
3. Build notification server endpoint
4. Map existing email notification triggers to also send push
5. Add push notification preferences to settings screen

---

## File Structure

```
apps/expo/src/
├── app/
│   └── music/
│       ├── index.tsx                          # Dashboard (enhance)
│       ├── profile.tsx                        # NEW: Profile stats
│       ├── settings.tsx                       # NEW: Notification prefs
│       ├── join/
│       │   └── [inviteCode].tsx               # NEW: Join league
│       ├── league/
│       │   ├── [id].tsx                       # League detail (enhance)
│       │   └── create.tsx                     # NEW: Create league
│       └── round/
│           ├── [id].tsx                       # Round detail (rebuild)
│           ├── create.tsx                     # NEW: Create round
│           └── [roundId]/
│               ├── submit.tsx                 # NEW: Submit song
│               └── playlist.tsx               # NEW: Playlist view
└── components/
    └── music/
        ├── SpotifyTrackCard.tsx               # Track display card
        ├── AudioPreviewPlayer.tsx             # Audio preview playback
        ├── VoteCard.tsx                       # Voting card with stepper
        ├── PointStepper.tsx                   # +/- point allocation
        ├── RemainingPointsBadge.tsx           # Points budget display
        ├── ResultCard.tsx                     # Ranked result item
        ├── PhaseProgressBar.tsx               # 4-step phase indicator
        ├── CountdownTimer.tsx                 # Live deadline countdown
        ├── MemberStatusBoard.tsx              # Member progress board
        ├── LeagueStandingsTable.tsx           # League leaderboard
        ├── StatusBadge.tsx                    # Round status pill
        ├── ThemeTemplatePicker.tsx            # Theme browser sheet
        └── LeagueSettingsSheet.tsx            # League settings modal
```

---

## Dependencies to Add

| Package                                  | Purpose                             | Required By      |
| ---------------------------------------- | ----------------------------------- | ---------------- |
| `expo-av`                                | Audio playback for Spotify previews | Phase 4          |
| `expo-haptics`                           | Haptic feedback on interactions     | Phase 5          |
| `expo-sharing`                           | Native share sheet                  | Phase 2          |
| `@react-native-community/datetimepicker` | Date/time picker for deadlines      | Phase 3          |
| `expo-notifications`                     | Push notifications                  | Phase 8 (future) |

**Note:** Check if these are already installed before adding. `expo-haptics` and `expo-sharing` are likely already present in the Expo app.

---

## Design System Compliance

All components follow the established Emerald Green theme:

```
Background:     #0A1A1A (deep), #102A2A (surface)
Text:           #DCE4E4 (primary), #8FA8A8 (muted)
Borders:        #164B49 (default), #21716C (focused)
Primary:        #50C878 (emerald), #66D99A (bright), #388E3C (dim)
Cards:          bg-[#102A2A] border-[#164B49] rounded-lg p-4
Pills:          bg-transparent border-[#164B49] rounded-full px-4 py-1.5
Active pills:   border-[#50C878] bg-[#50C878]/20
Buttons:        bg-[#50C878] text-[#0A1A1A] rounded-md
Touch targets:  Minimum 44px height
```

All screens use `GradientBackground` + `SafeAreaView` pattern. Navigation uses `Link` from `expo-router`.

---

## Key Technical Decisions

1. **Bottom sheets over modals** - Use `@gorhom/bottom-sheet` for settings, theme picker, submit song (matches existing app patterns)
2. **Native date pickers** - Use platform-specific datetime pickers rather than custom UI
3. **Spotify deep links** - Use `spotify:track:{id}` URI scheme for mobile (opens Spotify app) with `https://open.spotify.com/track/{id}` fallback
4. **Audio via expo-av** - For 30-sec preview playback when `previewUrl` is available
5. **Haptic feedback** - On vote stepper changes and submission confirmation
6. **Pull-to-refresh** - On all list screens using `RefreshControl`
7. **Optimistic updates** - For vote submission and league join (match existing task patterns)
8. **FlatList** - For all scrollable lists (virtualized rendering for performance)
9. **Alert.alert()** - For destructive action confirmations (native dialog, not custom modal)
10. **Share API** - For invite links (native share sheet vs clipboard copy on web)

---

## Estimated Total Effort

| Phase                                    | Effort  | Running Total |
| ---------------------------------------- | ------- | ------------- |
| Phase 1: Navigation & League Management  | ~2 days | 2 days        |
| Phase 2: League Detail & Settings        | ~2 days | 4 days        |
| Phase 3: Round Creation & Phase Controls | ~2 days | 6 days        |
| Phase 4: Song Submission                 | ~3 days | 9 days        |
| Phase 5: Voting System                   | ~3 days | 12 days       |
| Phase 6: Results & Standings             | ~2 days | 14 days       |
| Phase 7: Profile, Settings, & Polish     | ~2 days | 16 days       |
| Phase 8: Push Notifications (future)     | ~3 days | 19 days       |

**Core feature parity (Phases 1-6): ~14 days**
**Full implementation (Phases 1-7): ~16 days**
