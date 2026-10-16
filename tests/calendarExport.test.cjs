const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../utils/calendarExport.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/^export /gm, '');

function loadExporter({ os = 'android', status = 'granted', calendars = [], targetId = 'existing' } = {}) {
  const calls = [];
  const createdEvents = [];
  const targetCalendar = {
    async createEvent(event) {
      assert.equal(this, targetCalendar);
      calls.push(['createEvent', event.title]);
      createdEvents.push({ ...event });
      return { id: `event-${createdEvents.length}` };
    },
  };
  const Calendar = {
    EntityTypes: { EVENT: 'event' },
    SourceType: { LOCAL: 'local' },
    CalendarAccessLevel: { OWNER: 'owner' },
    async requestCalendarPermissions() {
      calls.push(['requestCalendarPermissions']);
      return { status };
    },
    async getCalendars(entityType) {
      calls.push(['getCalendars', entityType]);
      return calendars;
    },
    ExpoCalendar: {
      async get(id) {
        calls.push(['get', id]);
        assert.equal(id, targetId);
        return targetCalendar;
      },
    },
    getDefaultCalendarSync() {
      calls.push(['getDefaultCalendarSync']);
      return targetCalendar;
    },
    async createCalendar(options) {
      calls.push(['createCalendar', { ...options, source: { ...options.source } }]);
      return { id: 'created' };
    },
  };
  const context = vm.createContext({ Calendar, Platform: { OS: os }, Intl });
  vm.runInContext(`${source}\nglobalThis.exportToSystemCalendar = exportToSystemCalendar;`, context, {
    filename: 'utils/calendarExport.js',
  });
  return { exportToSystemCalendar: context.exportToSystemCalendar, calls, createdEvents };
}

function makeEvents() {
  return [
    {
      summary: 'Mathematics',
      startDate: new Date('2026-10-16T08:00:00Z'),
      endDate: new Date('2026-10-16T09:30:00Z'),
      description: 'Lecture\\nTeacher: Example',
      location: 'Room 101',
    },
    {
      summary: 'University holiday',
      startDate: new Date('2026-10-17T00:00:00Z'),
      endDate: new Date('2026-10-18T00:00:00Z'),
      allDay: true,
      location: '',
    },
  ];
}

function assertExportedEvents(actual, events) {
  assert.deepEqual(actual, events.map(event => ({
    title: event.summary,
    startDate: event.startDate,
    endDate: event.endDate,
    allDay: !!event.allDay,
    location: event.location || undefined,
    notes: (event.description || '').replace(/\\n/g, '\n'),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })));
}

test('denied calendar permission stops before calendar lookup or creation', async () => {
  const { exportToSystemCalendar, calls, createdEvents } = loadExporter({ status: 'denied' });
  await assert.rejects(exportToSystemCalendar(makeEvents(), 'Schedule'), {
    message: 'CALENDAR_PERMISSION_DENIED',
  });
  assert.deepEqual(calls, [['requestCalendarPermissions']]);
  assert.deepEqual(createdEvents, []);
});

test('Android resolves a writable local calendar object and creates every event on it', async () => {
  const { exportToSystemCalendar, calls, createdEvents } = loadExporter({
    calendars: [
      { id: 'readonly', allowsModifications: false, source: { isLocalAccount: true } },
      { id: 'remote', allowsModifications: true, source: { isLocalAccount: false } },
      { id: 'existing', allowsModifications: true, source: { isLocalAccount: true } },
    ],
  });
  const events = makeEvents();
  assert.equal(await exportToSystemCalendar(events, 'Schedule'), events.length);
  assert.deepEqual(calls, [
    ['requestCalendarPermissions'],
    ['getCalendars', 'event'],
    ['get', 'existing'],
    ...events.map(event => ['createEvent', event.summary]),
  ]);
  assertExportedEvents(createdEvents, events);
});

test('Android falls back to a writable nonlocal calendar before creating one', async () => {
  const { exportToSystemCalendar, calls, createdEvents } = loadExporter({
    calendars: [{ id: 'remote', allowsModifications: true, source: { isLocalAccount: false } }],
    targetId: 'remote',
  });
  const events = makeEvents();
  assert.equal(await exportToSystemCalendar(events, 'Schedule'), events.length);
  assert.deepEqual(calls.slice(0, 3), [
    ['requestCalendarPermissions'], ['getCalendars', 'event'], ['get', 'remote'],
  ]);
  assert.equal(calls.some(([method]) => method === 'createCalendar'), false);
  assertExportedEvents(createdEvents, events);
});

test('iOS uses the synchronous default calendar object when the calendar list is empty', async () => {
  const { exportToSystemCalendar, calls, createdEvents } = loadExporter({ os: 'ios' });
  const events = makeEvents();
  assert.equal(await exportToSystemCalendar(events, 'Schedule'), events.length);
  assert.deepEqual(calls, [
    ['requestCalendarPermissions'],
    ['getCalendars', 'event'],
    ['getDefaultCalendarSync'],
    ...events.map(event => ['createEvent', event.summary]),
  ]);
  assertExportedEvents(createdEvents, events);
});

test('Android creates a local calendar when none is writable and resolves its object for events', async () => {
  const { exportToSystemCalendar, calls, createdEvents } = loadExporter({
    calendars: [{ id: 'readonly', allowsModifications: false, source: { isLocalAccount: true } }],
    targetId: 'created',
  });
  const events = makeEvents();
  assert.equal(await exportToSystemCalendar(events, 'Schedule'), events.length);
  assert.deepEqual(calls, [
    ['requestCalendarPermissions'],
    ['getCalendars', 'event'],
    ['createCalendar', {
      title: 'MyKHSU',
      color: '#10B981',
      entityType: 'event',
      source: { isLocalAccount: true, name: 'MyKHSU', type: 'local' },
      name: 'mykhsu',
      ownerAccount: 'mykhsu',
      accessLevel: 'owner',
    }],
    ['get', 'created'],
    ...events.map(event => ['createEvent', event.summary]),
  ]);
  assertExportedEvents(createdEvents, events);
});
