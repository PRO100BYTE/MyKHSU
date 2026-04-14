import AsyncStorage from '@react-native-async-storage/async-storage';

const ATTENDANCE_PREFIX = 'attendance_';

/** Порог пропусков для предупреждения (25%) */
export const WARN_MISSED_THRESHOLD = 0.25;

const buildKey = (subject, weekday, timeSlot, group) => {
  const normalized = [subject, weekday, timeSlot, group]
    .map(v => String(v || '').trim().toLowerCase().replace(/\s+/g, '_'))
    .join('__');
  return `${ATTENDANCE_PREFIX}${normalized}`;
};

/**
 * Сохраняет/обновляет отметку посещаемости для занятия
 * status: 'attended' | 'missed' | 'excused'
 */
export const saveAttendance = async ({ subject, weekday, timeSlot, group, status }) => {
  const key = buildKey(subject, weekday, timeSlot, group);
  const entry = {
    subject,
    weekday: String(weekday),
    timeSlot: String(timeSlot),
    group: group || '',
    status,
    markedAt: Date.now(),
  };
  await AsyncStorage.setItem(key, JSON.stringify(entry));
  return entry;
};

/**
 * Получает отметку посещаемости для конкретного занятия
 */
export const getAttendance = async ({ subject, weekday, timeSlot, group }) => {
  try {
    const key = buildKey(subject, weekday, timeSlot, group);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Удаляет отметку посещаемости для конкретного занятия
 */
export const removeAttendance = async ({ subject, weekday, timeSlot, group }) => {
  const key = buildKey(subject, weekday, timeSlot, group);
  await AsyncStorage.removeItem(key);
};

/**
 * Загружает все отметки посещаемости
 */
export const loadAllAttendance = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const aKeys = keys.filter(k => k.startsWith(ATTENDANCE_PREFIX));
    if (aKeys.length === 0) return {};
    const pairs = await AsyncStorage.multiGet(aKeys);
    const result = {};
    for (const [key, value] of pairs) {
      if (value) {
        try { result[key] = JSON.parse(value); } catch {}
      }
    }
    return result;
  } catch {
    return {};
  }
};

/**
 * Строит ключ для отметки посещаемости (для сопоставления с пакетной загрузкой)
 */
export const buildAttendanceKey = (subject, weekday, timeSlot, group) =>
  buildKey(subject, weekday, timeSlot, group);

/**
 * Удаляет все отметки посещаемости
 */
export const clearAllAttendance = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const aKeys = keys.filter(k => k.startsWith(ATTENDANCE_PREFIX));
    if (aKeys.length > 0) await AsyncStorage.multiRemove(aKeys);
    return aKeys.length;
  } catch {
    return 0;
  }
};

/**
 * Считает статистику посещаемости по предметам из всех отметок
 */
export const getAttendanceStats = (attendanceMap) => {
  const subjectMap = {};
  for (const entry of Object.values(attendanceMap)) {
    if (!entry || !entry.subject) continue;
    const key = entry.subject;
    if (!subjectMap[key]) subjectMap[key] = { attended: 0, missed: 0, excused: 0 };
    if (entry.status === 'attended') subjectMap[key].attended++;
    else if (entry.status === 'missed') subjectMap[key].missed++;
    else if (entry.status === 'excused') subjectMap[key].excused++;
  }
  return Object.entries(subjectMap).map(([subject, counts]) => {
    const total = counts.attended + counts.missed + counts.excused;
    const absentRatio = total > 0 ? (counts.missed + counts.excused) / total : 0;
    return {
      subject,
      ...counts,
      total,
      absentRatio,
      isWarning: absentRatio >= WARN_MISSED_THRESHOLD,
    };
  }).sort((a, b) => b.missed - a.missed);
};
