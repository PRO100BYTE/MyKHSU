import AsyncStorage from '@react-native-async-storage/async-storage';

const ACADEMIC_EVENTS_KEY = 'academic_events_v1';

export const ACADEMIC_EVENT_TYPES = [
  { key: 'exam', label: 'Экзамены' },
  { key: 'credit', label: 'Зачеты' },
  { key: 'practice', label: 'Практика' },
  { key: 'holiday', label: 'Каникулы' },
  { key: 'other', label: 'Другое' },
];

const normalizeEvent = (event) => ({
  id: String(event.id || `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`),
  title: String(event.title || '').trim(),
  date: String(event.date || '').trim(),
  type: event.type || 'other',
  description: String(event.description || '').trim(),
  reminderEnabled: !!event.reminderEnabled,
  reminderTime: event.reminderTime || '09:00',
  notificationId: event.notificationId || null,
  createdAt: Number(event.createdAt || Date.now()),
});

const sortEvents = (events) =>
  [...events].sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    return b.createdAt - a.createdAt;
  });

export const getAcademicEvents = async () => {
  try {
    const raw = await AsyncStorage.getItem(ACADEMIC_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortEvents(parsed.map(normalizeEvent));
  } catch {
    return [];
  }
};

export const saveAcademicEvents = async (events) => {
  const normalized = sortEvents((events || []).map(normalizeEvent));
  await AsyncStorage.setItem(ACADEMIC_EVENTS_KEY, JSON.stringify(normalized));
  return normalized;
};

export const addAcademicEvent = async (event) => {
  const all = await getAcademicEvents();
  const next = normalizeEvent(event);
  return saveAcademicEvents([next, ...all]);
};

export const updateAcademicEvent = async (id, patch) => {
  const all = await getAcademicEvents();
  const updated = all.map((event) => (event.id === id ? normalizeEvent({ ...event, ...patch }) : event));
  return saveAcademicEvents(updated);
};

export const deleteAcademicEvent = async (id) => {
  const all = await getAcademicEvents();
  const updated = all.filter((event) => event.id !== id);
  return saveAcademicEvents(updated);
};
