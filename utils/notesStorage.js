import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTES_PREFIX = 'lesson_note_';

/**
 * Генерирует уникальный ключ для заметки по параметрам занятия
 */
const getNoteKey = (subject, weekday, timeSlot, group) => {
  const normalized = [subject, weekday, timeSlot, group]
    .map(v => String(v || '').trim().toLowerCase().replace(/\s+/g, '_'))
    .join('__');
  return `${NOTES_PREFIX}${normalized}`;
};

/**
 * Сохраняет заметку/ДЗ к занятию
 */
export const saveNote = async ({ subject, weekday, timeSlot, group, noteText, homework }) => {
  const key = getNoteKey(subject, weekday, timeSlot, group);
  const data = {
    noteText: noteText || '',
    homework: homework || '',
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(key, JSON.stringify(data));
  return data;
};

/**
 * Загружает заметку/ДЗ к занятию
 */
export const loadNote = async ({ subject, weekday, timeSlot, group }) => {
  const key = getNoteKey(subject, weekday, timeSlot, group);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Удаляет заметку к занятию
 */
export const deleteNote = async ({ subject, weekday, timeSlot, group }) => {
  const key = getNoteKey(subject, weekday, timeSlot, group);
  await AsyncStorage.removeItem(key);
};

/**
 * Загружает все заметки (для пакетной подгрузки)
 */
export const loadAllNotes = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const noteKeys = keys.filter(k => k.startsWith(NOTES_PREFIX));
  if (noteKeys.length === 0) return {};

  const pairs = await AsyncStorage.multiGet(noteKeys);
  const result = {};
  for (const [key, value] of pairs) {
    if (value) {
      try {
        result[key] = JSON.parse(value);
      } catch {
        // skip corrupted entries
      }
    }
  }
  return result;
};

/**
 * Возвращает ключ для данного занятия (для сопоставления с пакетной загрузкой)
 */
export const getLessonNoteKey = (subject, weekday, timeSlot, group) => {
  return getNoteKey(subject, weekday, timeSlot, group);
};

/**
 * Удаляет все заметки
 */
export const clearAllNotes = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const noteKeys = keys.filter(k => k.startsWith(NOTES_PREFIX));
  if (noteKeys.length > 0) {
    await AsyncStorage.multiRemove(noteKeys);
  }
  return noteKeys.length;
};

/**
 * Возвращает количество заметок
 */
export const getNotesCount = async () => {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter(k => k.startsWith(NOTES_PREFIX)).length;
};

/**
 * Ищет ДЗ по предмету (поиск по всем дням/слотам) — для отображения ДЗ на следующем занятии.
 * Возвращает последнее найденное ДЗ для данного предмета и группы.
 */
export const findHomeworkBySubject = (allNotes, subject, group) => {
  if (!allNotes || !subject) return null;

  const normalizedSubject = subject.trim().toLowerCase().replace(/\s+/g, '_');
  const normalizedGroup = (group || '').trim().toLowerCase().replace(/\s+/g, '_');

  let latestResult = null;
  let latestTimestamp = 0;

  for (const [key, note] of Object.entries(allNotes)) {
    if (!note || !note.homework) continue;
    // Ключ формат: lesson_note_<subject>__<weekday>__<timeSlot>__<group>
    const parts = key.replace(NOTES_PREFIX, '').split('__');
    if (parts.length < 4) continue;
    const noteSubject = parts[0];
    const noteGroup = parts[3];
    if (noteSubject === normalizedSubject && noteGroup === normalizedGroup) {
      if (note.updatedAt > latestTimestamp) {
        latestTimestamp = note.updatedAt;
        latestResult = { homework: note.homework, updatedAt: note.updatedAt };
      }
    }
  }
  return latestResult;
};
