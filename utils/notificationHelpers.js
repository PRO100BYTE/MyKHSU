export const NOTIFICATION_OWNER = 'mykhsu.notifications.v1';
export const DEFAULT_NOTIFICATION_SETTINGS = Object.freeze({
  enabled: false, news: false, schedule: false, scheduleChanges: true,
  beforeLesson: true, lessonStart: true, beforeLessonEnd: true, lessonEnd: true,
});

export function normalizeNotificationSettings(value) {
  const settings = { ...(value && typeof value === 'object' && !Array.isArray(value) ? value : {}) };
  for (const [key, fallback] of Object.entries(DEFAULT_NOTIFICATION_SETTINGS)) {
    if (typeof settings[key] !== 'boolean') settings[key] = fallback;
  }
  return settings;
}

export function notificationRoute(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.type === 'new_news') return { screen: 'news', newsId: data.newsId || null };
  if (['schedule_change', 'lesson_reminder', 'lesson_start', 'lesson_end_reminder', 'lesson_end'].includes(data.type)) {
    return { screen: 'schedule', date: typeof data.date === 'string' ? data.date : null, scheduleKey: data.scheduleKey || null };
  }
  return null;
}

export function localDateKey(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function timeOnDate(value, date) {
  if (typeof value !== 'string' || !/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;
  const result = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(...date.split('-').map((part, index) => Number(part) - (index === 1 ? 1 : 0)))
    : new Date(date);
  if (!Number.isFinite(result.getTime())) return null;
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function createLessonNotificationPlan(lesson, pairTime, settings, lessonDate, now = new Date(), channelId) {
  if (!lesson || !pairTime) return [];
  const start = timeOnDate(pairTime.time_start || pairTime.start, lessonDate);
  const end = timeOnDate(pairTime.time_end || pairTime.end, lessonDate);
  if (!start || !end || end <= start || end <= now) return [];
  const subject = String(lesson.subject || 'Пара');
  const room = lesson.auditory ? ` (${lesson.auditory})` : '';
  const events = [
    ['beforeLesson', 'lesson_reminder', start.getTime() - 300000, '⏰ Скоро пара', `Через 5 минут: ${subject}${room}`],
    ['lessonStart', 'lesson_start', start.getTime(), '📚 Началась пара', `${subject}${room}`],
    ['beforeLessonEnd', 'lesson_end_reminder', end.getTime() - 300000, '⏳ Скоро конец пары', `Через 5 минут закончится: ${subject}`],
    ['lessonEnd', 'lesson_end', end.getTime(), '✅ Пара закончилась', `${subject} завершена`],
  ];
  return events.filter(([key, , timestamp]) => settings[key] && timestamp > now.getTime()).map(([, type, timestamp, title, body]) => ({
    content: { title, body, sound: true, data: {
      owner: NOTIFICATION_OWNER, kind: 'lesson', type, screen: 'schedule',
      date: localDateKey(start), lessonTime: String(lesson.time ?? ''),
    } },
    trigger: { type: 'date', date: new Date(timestamp), ...(channelId ? { channelId } : {}) },
  }));
}

export function dedupeNotificationPlan(plan, limit = 60) {
  const seen = new Set();
  return plan.filter(item => {
    const key = `${item.trigger.date.getTime()}|${item.content.data.type}|${item.content.body}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.trigger.date - b.trigger.date).slice(0, limit);
}

export function shouldDeferLessonReplacement(settings, scheduleData, pairsTime) {
  return Boolean(settings.enabled && settings.schedule &&
    (!scheduleData || !Array.isArray(pairsTime) || pairsTime.length === 0));
}

export function newsIdentity(item) {
  if (!item || typeof item !== 'object') return null;
  const content = String(item.content || '').trim().replace(/\s+/g, ' ');
  if (!content) return null;
  return `${item.date || item.hr_date || ''}_${content}`;
}

export function findNewNews(current, previous) {
  const seen = new Set((Array.isArray(previous) ? previous : []).map(newsIdentity).filter(Boolean));
  return (Array.isArray(current) ? current : []).filter(item => {
    const id = newsIdentity(item);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function isOwnedLessonRequest(request, legacyIds = []) {
  const data = request?.content?.data;
  return (data?.owner === NOTIFICATION_OWNER && data.kind === 'lesson') ||
    (Array.isArray(legacyIds) && legacyIds.includes(request?.identifier));
}
