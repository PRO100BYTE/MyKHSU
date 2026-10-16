const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../utils/notificationHelpers.js'), 'utf8');
const helpers = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('settings merge legacy partial preferences and retain unknown keys', async () => {
  const { normalizeNotificationSettings } = await helpers;
  const settings = normalizeNotificationSettings({ enabled: true, lessonEnd: false, futureFlag: 3 });
  assert.equal(settings.scheduleChanges, true);
  assert.equal(settings.lessonEnd, false);
  assert.equal(settings.futureFlag, 3);
  assert.equal(normalizeNotificationSettings({ news: 'false' }).news, false);
  assert.equal(normalizeNotificationSettings(null).enabled, false);
});
test('lesson timing is local, future only, and channels belong on trigger', async () => {
  const { createLessonNotificationPlan, normalizeNotificationSettings } = await helpers;
  const date = new Date(2026, 9, 16);
  const plan = createLessonNotificationPlan({ subject: 'Math', time: 1 },
    { start: '09:00', end: '10:30' }, normalizeNotificationSettings(null), date,
    new Date(2026, 9, 16, 9, 1), 'schedule');
  assert.equal(plan.length, 2);
  assert.equal(plan[0].trigger.date.getHours(), 10);
  assert.equal(plan[0].trigger.date.getMinutes(), 25);
  assert.equal(plan[0].trigger.channelId, 'schedule');
  assert.equal(plan[0].content.channelId, undefined);
  assert.equal(plan[0].content.data.date, '2026-10-16');
});
test('invalid and reverse times/dates do not produce notifications', async () => {
  const { createLessonNotificationPlan, normalizeNotificationSettings } = await helpers;
  for (const pair of [{ start: '25:00', end: '26:00' }, { start: '09:60', end: '10:00' },
    { start: '12:00', end: '10:00' }, { start: null, end: '10:00' }]) {
    assert.deepEqual(createLessonNotificationPlan({}, pair, normalizeNotificationSettings(null), new Date(), new Date()), []);
  }
  assert.deepEqual(createLessonNotificationPlan({}, { start: '09:00', end: '10:00' }, {}, 'invalid', new Date()), []);
});
test('duplicate lessons collapse and nearest pending events are retained first', async () => {
  const { dedupeNotificationPlan } = await helpers;
  const make = timestamp => ({ content: { body: 'Math', data: { type: 'lesson_start' } }, trigger: { date: new Date(timestamp) } });
  const result = dedupeNotificationPlan([make(3000), make(1000), make(1000), make(2000)], 2);
  assert.deepEqual(result.map(item => +item.trigger.date), [1000, 2000]);
});
test('ownership cancellation cannot target homework/events or arbitrary requests', async () => {
  const { isOwnedLessonRequest, NOTIFICATION_OWNER } = await helpers;
  assert.equal(isOwnedLessonRequest({ identifier: 'homework', content: { data: { type: 'homework_deadline' } } }), false);
  assert.equal(isOwnedLessonRequest({ identifier: 'new', content: { data: { owner: NOTIFICATION_OWNER, kind: 'lesson' } } }), true);
  assert.equal(isOwnedLessonRequest({ identifier: 'old' }, ['old']), true);
  assert.equal(isOwnedLessonRequest(null, {}), false);
});
test('news baseline comparison ignores malformed and duplicate items', async () => {
  const { findNewNews } = await helpers;
  assert.deepEqual(findNewNews([{ id: 1, content: 'old' }, { id: 2, content: 'new' },
    { id: 'presentation-2', content: 'new' }, null, {}], [{ id: 'presentation-1', content: 'old' }]), [{ id: 2, content: 'new' }]);
  assert.deepEqual(findNewNews([{ content: ' hello   world ', date: 'today' }], [{ content: 'hello world', date: 'today' }]), []);
  assert.deepEqual(findNewNews(null, null), []);
});
test('news identity is identical for raw API and presentation IDs in either direction', async () => {
  const { newsIdentity, findNewNews } = await helpers;
  const raw = { id: 123, date: '2026-10-16', content: 'University news' };
  const presented = { ...raw, id: '2026-10-16_University_news', normalizedDate: 123 };
  assert.equal(newsIdentity(raw), newsIdentity(presented));
  assert.deepEqual(findNewNews([raw], [presented]), []);
  assert.deepEqual(findNewNews([presented], [raw]), []);
  assert.equal(newsIdentity({ id: 'generated-but-empty' }), null);
});

test('enabled lessons defer replacement until schedule and timing are loaded', async () => {
  const { shouldDeferLessonReplacement } = await helpers;
  const settings = { enabled: true, schedule: true };
  const schedule = { lessons: [] };
  assert.equal(shouldDeferLessonReplacement(settings, schedule, []), true);
  assert.equal(shouldDeferLessonReplacement(settings, schedule, undefined), true);
  assert.equal(shouldDeferLessonReplacement(settings, null, [{ time: '1' }]), true);
  // An explicitly empty schedule with loaded timings is valid and should clear old lessons.
  assert.equal(shouldDeferLessonReplacement(settings, schedule, [{ time: '1' }]), false);
  // Disabling must still cancel owned requests even when timings are unavailable.
  assert.equal(shouldDeferLessonReplacement({ ...settings, enabled: false }, schedule, []), false);
  assert.equal(shouldDeferLessonReplacement({ ...settings, schedule: false }, schedule, []), false);
});

test('routing is allowlisted and works for legacy notification types', async () => {
  const { notificationRoute } = await helpers;
  assert.deepEqual(notificationRoute({ type: 'new_news', newsId: 'x' }), { screen: 'news', newsId: 'x' });
  assert.deepEqual(notificationRoute({ type: 'lesson_start', date: '2026-10-16' }),
    { screen: 'schedule', date: '2026-10-16', scheduleKey: null });
  assert.equal(notificationRoute({ screen: 'arbitrary', type: 'unknown' }), null);
  assert.equal(notificationRoute(null), null);
});
