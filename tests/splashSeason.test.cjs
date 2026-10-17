const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../utils/splashSeason.js'), 'utf8');
const modulePromise = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const holidays = {
  'new-year': 'sparkles', 'student-day': 'school', 'valentines-day': 'heart',
  'defender-day': 'shield', 'womens-day': 'flower', 'cosmonautics-day': 'rocket',
  'may-day': 'sunny', 'victory-day': 'star', 'children-day': 'balloon',
  'knowledge-day': 'book', 'russia-day': 'flag', 'september-3': 'musical-notes', 'programmer-day': 'code-slash',
  'sysadmin-day': 'server', 'teacher-day': 'easel', 'unity-day': 'people', 'intl-student-day': 'earth',
};

test('local calendar months cover every season and boundary', async () => {
  const { getSplashSeason } = await modulePromise;
  const expected = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
  expected.forEach((season, month) => {
    assert.equal(getSplashSeason(new Date(2026, month, 1)), season);
    assert.equal(getSplashSeason(new Date(2026, month + 1, 0)), season);
  });
  for (const date of [null, undefined, new Date('invalid'), 'bad']) {
    assert.ok(['winter', 'spring', 'summer', 'autumn'].includes(getSplashSeason(date)));
  }
});

test('all existing holiday types override the season with appropriate icons', async () => {
  const { getSplashDecoration } = await modulePromise;
  for (const [type, icon] of Object.entries(holidays)) {
    const decoration = getSplashDecoration({ date: new Date(2026, 6, 15), holidayInfo: { type } });
    assert.equal(decoration.kind, 'holiday');
    assert.equal(decoration.key, type);
    assert.ok(decoration.icons.includes(icon));
  }
  const constants = fs.readFileSync(path.join(__dirname, '../utils/constants.js'), 'utf8');
  const declaredTypes = [...constants.matchAll(/type: '([^']+)'/g)].map(match => match[1]);
  assert.deepEqual([...new Set(declaredTypes)].sort(), Object.keys(holidays).sort());
});

test('all holiday types have a meaningful greeting and decorative subtitle', async () => {
  const { getSplashGreeting } = await modulePromise;
  for (const type of Object.keys(holidays)) {
    const greeting = getSplashGreeting({ type });
    assert.ok(greeting.title.length > 8, `${type} needs a greeting title`);
    assert.ok(greeting.subtitle.length > 15, `${type} needs a decorative subtitle`);
  }
  assert.equal(getSplashGreeting({ type: 'unknown', text: 'Особый день' }).title, 'Особый день');
  assert.ok(getSplashGreeting().title.length > 0);
});

test('Matrix and Legend suppress all added decoration, even on holidays', async () => {
  const { getSplashDecoration } = await modulePromise;
  assert.equal(getSplashDecoration({ theme: 'matrix', holidayInfo: { type: 'new-year' } }), null);
  assert.equal(getSplashDecoration({ legendUnlocked: true, holidayInfo: { type: 'new-year' } }), null);
});

test('partial holiday data and unknown types have safe fallbacks', async () => {
  const { getSplashDecoration } = await modulePromise;
  for (const holidayInfo of [null, undefined, {}, { type: null }]) {
    assert.equal(getSplashDecoration({ holidayInfo }).kind, 'season');
  }
  for (const type of ['unknown', '__proto__', 'constructor']) {
    assert.deepEqual(getSplashDecoration({ holidayInfo: { type } }).icons, ['sparkles', 'star', 'sparkles']);
  }
});

test('particles are deterministic, bounded, and kept away from central content', async () => {
  const { getSplashDecoration, createSplashParticles, SPLASH_PARTICLE_COUNT } = await modulePromise;
  for (let month = 0; month < 12; month++) {
    const decoration = getSplashDecoration({ date: new Date(2026, month, 15) });
    const particles = createSplashParticles(decoration);
    assert.equal(particles.length, 12);
    assert.equal(particles.length, SPLASH_PARTICLE_COUNT);
    assert.deepEqual(particles, createSplashParticles(decoration));
    assert.equal(new Set(particles.map(particle => particle.y)).size, 12);
    assert.ok(particles.some(particle => particle.y > 0.75));
    assert.ok(particles.some(particle => particle.y > 0.3 && particle.y < 0.6));
    for (const particle of particles) {
      assert.ok(particle.x < 0.2 || particle.x >= 0.8);
      assert.ok(particle.duration >= 6500);
      assert.ok(particle.size <= 20);
    }
  }
  assert.deepEqual(createSplashParticles(null), []);
});
