# Notification delivery and integration

## Scope and guarantees

There is no backend push sender. Lesson reminders are **local scheduled notifications**, built from the latest loaded day/week. News polling and schedule change comparisons run while using the application; OS background fetch for news is best effort, not an exact timer and not guaranteed after termination. Schedule changes are not polled while closed. A native device build is required to validate OS delivery; Expo Go/web are not a substitute.

## Settings and permissions

`notificationService.initialize()` creates Android channels, reads permission state and installs the foreground handler/listener. It never asks permission. Only an explicit master-switch enable invokes `requestPermissions()`. Denial retains the user's intent (foreground news/change banners still work) and the settings UI offers the OS settings link. Turning the master/category switches off retains all subordinate preferences. Existing `notification_settings` SecureStore data is merged with defaults, unknown keys retained; no destructive migration.

`saveNotificationSettings(patch)` serializes writes, publishes `settingsChanged`, and reapplies the last loaded lesson schedule. Background registration listens for settings changes and unregisters only `BACKGROUND_NEWS_CHECK` when disabled or permission is missing. When no schedule is loaded, disabling individual reminder kinds cancels those pending kinds; enabling a kind requires a schedule load to create new reminders. Errors applying native changes are shown by settings UI and logged.

## Scheduling and deduplication

- Lesson scheduling operations are serialized. Local wall-clock times are validated, past events skipped, malformed/reversed times rejected, and duplicate events collapsed.
- Android channel IDs live on triggers, not content. News uses `news`; lessons/changes use `schedule`.
- Rebuild cancels only requests tagged `{ owner: 'mykhsu.notifications.v1', kind: 'lesson' }` or IDs in the legacy `schedule_notification_ids` list. Homework/calendar requests are untouched.
- At most 60 total pending requests are budgeted (allowing space below iOS's small pending limit); nearest lesson events win. This does not guarantee an entire week when all four events per lesson are enabled.
- News identity uses canonical date/content, ignoring raw API IDs and generated presentation IDs so foreground and background observations share the same baseline.
- Missing/empty pair timings defer replacement of enabled lesson requests, retaining existing reminders. Explicitly disabled reminder kinds can still be canceled. `useScheduleLogic` reconciles in an effect depending on both `scheduleData` and `pairsTime`, so timings arriving after schedule data trigger scheduling without a duplicate fetch-path call. A genuinely empty lesson schedule with loaded timings still clears old owned requests.
- News uses a persistent bounded 200-item baseline independent of the expiring feed cache. First observation is silent; overlapping checks are serialized and duplicate IDs ignored. Up to three newly observed stories are delivered. Changes while notifications are disabled are baselined, not replayed on enable.
- Schedule snapshots are date-scoped and ignore cache/stale-cache results. Existing history key remains readable. First observation of a date is silent. The legacy non-date-scoped snapshots are not compared, avoiding false upgrade alerts.

## Required App.js integration (App.js is owned by parent agent)

1. Remove App's module-level `Notifications.setNotificationHandler` (service owns the handler). Remove startup permission requests / `setupNotifications()` invocation. Keep `await notificationService.initialize()` at startup.
2. Mount exactly one `<InAppNotificationBanner theme={theme} onNavigate={handleNotificationRoute} />` inside the existing `SafeAreaProvider` and above the normal screen content. It registers `subscribeForeground` on mount, unsubscribes on unmount, queues up to five banners, and auto-dismisses after seven seconds. Its background is the opaque theme `backgroundElevated`.
3. Both the live `Notifications.addNotificationResponseReceivedListener` and the cold-launch `Notifications.getLastNotificationResponseAsync()` should call `notificationService.getNotificationRoute(response)`. Deduplicate by `response.notification.request.identifier` (use a ref/Set) so cold/live replay navigates once. Catch initial-response errors and remove the subscription on unmount. Delay routing until application startup/navigation is ready if necessary. `clearLastNotificationResponseAsync()` is optional after successful handling.
4. `getNotificationRoute` returns exactly:
   - `{ screen: 'news', newsId: string | null }` for `new_news`;
   - `{ screen: 'schedule', date: 'YYYY-MM-DD' | null, scheduleKey: string | null }` for lesson and schedule-change types;
   - `null` for unrecognized notifications (including homework/academic notifications, which retain their existing routing).
   It accepts an Expo response, a Notification object, or a raw data object. `onNavigate` receives this same route, not an Expo response. Use the existing tab navigation. News ID/date/context are optional: if detail/date navigation is unavailable, opening the corresponding tab is safe. Do not parse a missing date or infer a group from `scheduleKey`.
5. Keep startup `backgroundService.registerBackgroundNewsCheck()`. On AppState active, re-read OS permissions (`initialize()` is idempotent), synchronize background registration, and optionally rebuild the last schedule via the existing schedule fetch flow. No permission prompt on resume.

Public event APIs:

```js
const unsubscribe = notificationService.subscribe(event => {
  if (event.type === 'settingsChanged') console.log(event.settings);
});
const unsubscribeForeground = notificationService.subscribeForeground(event => {
  // { type: 'notification', notification: { id, title, body, data }, route }
});
```

Only `subscribeForeground` marks a foreground delivery surface as available; background/settings subscribers do not suppress OS presentation. The built-in banner is sufficient; App should not create a second banner subscription. Owned scheduled lesson notifications received while active are bridged to this event API; direct news/change events avoid a second native notification while active. Unowned notifications retain system presentation.

## Validation

Run `node --test tests/notificationHelpers.test.cjs` (pure helpers, no native mocks). Parse changed JS/JSX with installed Babel parser. Device smoke checks: fresh-install startup never prompts; enabling prompts only from settings; denial leaves a clear status; switch off/on preserves categories; toggling a lesson kind cancels/reschedules correctly; schedule refresh has no duplicates; homework/event requests remain; news refresh establishes a silent baseline and delivers each subsequent story once; light/dark/special-theme banners are readable/dismissible; banner taps, external taps and cold-launch taps route once; restricted fetch fails gracefully. Test permission revocation/resume and offline/cache schedule refresh. Native delivery/timing still requires Android/iOS device testing.
