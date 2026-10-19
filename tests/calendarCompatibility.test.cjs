const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const readSource = relative => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');

test('calendar consumers use the SDK57 root object API', () => {
  for (const relative of ['utils/calendarAccess.js', 'utils/calendarExport.js']) {
    const source = readSource(relative);
    assert.match(source, /from ['"]expo-calendar['"]/);
    assert.doesNotMatch(source, /from ['"]expo-calendar\/legacy['"]/);
    assert.doesNotMatch(source, /(?:getCalendarPermissions|requestCalendarPermissions|getCalendars|createCalendar|createEvent|deleteEvent|updateEvent|createReminder|deleteReminder|updateReminder)(?:Async|\s*Async)\b/);
  }
});

test('onboarding reads permissions through the guarded adapter', () => {
  const source = readSource('components/OnboardingScreen.js');
  assert.match(source, /from ['"]\.\.\/utils\/calendarAccess['"]/);
  assert.doesNotMatch(source, /Calendar\.(getCalendarPermissions|requestCalendarPermissions)\(/);
});

test('calendar export uses object methods for calendar and event creation', () => {
  const source = readSource('utils/calendarExport.js');
  assert.match(source, /Calendar\.getCalendars\(/);
  assert.match(source, /Calendar\.createCalendar\(/);
  assert.match(source, /Calendar\.ExpoCalendar\.get\(/);
  assert.match(source, /targetCalendar\.createEvent\(/);
  assert.match(source, /Calendar\.getDefaultCalendarSync\(/);
  assert.doesNotMatch(source, /Calendar\.\w+Async\(/);
});

test('native config preserves fetch mode and calendar/background plugins', () => {
  const config = JSON.parse(readSource('app.json')).expo;
  assert.ok(config.ios.infoPlist.UIBackgroundModes.includes('fetch'));
  const plugins = config.plugins.map(plugin => Array.isArray(plugin) ? plugin[0] : plugin);
  assert.ok(plugins.includes('expo-background-fetch'));
  assert.ok(plugins.includes('expo-calendar'));
});
