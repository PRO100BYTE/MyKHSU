import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LIQUID_GLASS, ACCENT_COLORS } from '../utils/constants';
import { exportAcademicEventsToCalendar } from '../utils/calendarExport';
import notificationService from '../utils/notificationService';
import NativeDateField from './NativeDateField';
import {
  ACADEMIC_EVENT_TYPES,
  addAcademicEvent,
  deleteAcademicEvent,
  getAcademicEvents,
  updateAcademicEvent,
} from '../utils/academicEventsStorage';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const formatDisplayDate = (value) => {
  if (!DATE_RE.test(String(value || ''))) return value || 'Дата не указана';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
};

const AcademicCalendarScreen = ({ theme, accentColor }) => {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('exam');
  const [description, setDescription] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;

  const loadEvents = async () => {
    const list = await getAcademicEvents();
    setEvents(list);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const visibleEvents = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((event) => event.type === filter);
  }, [events, filter]);

  const upcomingCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return events.filter((event) => event.date >= today).length;
  }, [events]);

  const scheduleReminderIfNeeded = async (event) => {
    if (!event.reminderEnabled || !DATE_RE.test(event.date)) return null;
    const granted = await notificationService.requestPermissions();
    if (!granted) {
      Alert.alert('Нет доступа', 'Разрешите уведомления, чтобы получать напоминания о событиях.');
      return null;
    }
    const [year, month, day] = event.date.split('-').map(Number);
    const triggerDate = new Date(year, month - 1, day, 9, 0, 0, 0);
    if (Number.isNaN(triggerDate.getTime()) || triggerDate <= new Date()) return null;

    return Notifications.scheduleNotificationAsync({
      content: {
        title: 'Учебное событие',
        body: `${event.title} сегодня`,
        data: { type: 'academic_event', eventId: event.id },
      },
      trigger: { type: 'date', date: triggerDate },
    });
  };

  const handleAddEvent = async () => {
    const trimmedTitle = title.trim();
    const trimmedDate = date.trim();

    if (!trimmedTitle) {
      Alert.alert('Пустой заголовок', 'Введите название учебного события.');
      return;
    }

    if (!DATE_RE.test(trimmedDate)) {
      Alert.alert('Некорректная дата', 'Используйте формат ГГГГ-ММ-ДД.');
      return;
    }

    const baseEvent = {
      title: trimmedTitle,
      date: trimmedDate,
      type,
      description,
      reminderEnabled,
    };

    const saved = await addAcademicEvent(baseEvent);
    const created = saved.find((item) => item.title === trimmedTitle && item.date === trimmedDate && item.type === type);

    if (created) {
      const notificationId = await scheduleReminderIfNeeded(created);
      if (notificationId) {
        await updateAcademicEvent(created.id, { notificationId });
      }
    }

    setTitle('');
    setDate('');
    setDescription('');
    setReminderEnabled(false);
    await loadEvents();
  };

  const handleExport = async () => {
    try {
      await exportAcademicEventsToCalendar(visibleEvents.map((event) => ({
        ...event,
        typeLabel: (ACADEMIC_EVENT_TYPES.find((item) => item.key === event.type) || { label: 'Другое' }).label,
      })), {
        title: 'Учебные события MyKHSU',
        fileName: 'academic_events',
      });
    } catch (error) {
      if (error?.message !== 'NO_ACADEMIC_EVENTS') {
        Alert.alert('Ошибка', 'Не удалось экспортировать учебные события.');
      } else {
        Alert.alert('Нет событий', 'Для экспорта пока нет учебных событий.');
      }
    }
  };

  const handleDelete = async (event) => {
    Alert.alert('Удалить событие', `Удалить "${event.title}"?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            if (event.notificationId) {
              await Notifications.cancelScheduledNotificationAsync(event.notificationId);
            }
            await deleteAcademicEvent(event.id);
            await loadEvents();
          } catch {
            Alert.alert('Ошибка', 'Не удалось удалить событие.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 64 }}>
      <Text style={[styles.title, { color: glass.text }]}>Календарь учебных событий</Text>

      <View style={[styles.heroCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder || glass.border }]}>
        <View style={styles.heroBadge}>
          <Icon name="sparkles-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: glass.text, fontSize: 15, fontFamily: 'Montserrat_600SemiBold' }}>
            Учебный планер
          </Text>
          <Text style={{ color: glass.textSecondary, fontSize: 12, fontFamily: 'Montserrat_400Regular', marginTop: 4, lineHeight: 18 }}>
            Всего событий: {events.length}. Ближайших и актуальных: {upcomingCount}. Добавляйте экзамены, зачеты и практику в одном месте.
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: glass.surfaceSecondary, borderColor: glass.border }]}>
        <Text style={[styles.label, { color: glass.textSecondary }]}>Название</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Например, Экзамен по математике"
          placeholderTextColor={glass.textTertiary}
          style={[styles.input, { color: glass.text, borderColor: glass.border, backgroundColor: glass.surfaceTertiary }]}
        />

        <NativeDateField
          label="Дата"
          value={date}
          onChange={setDate}
          theme={theme}
          accentColor={accentColor}
          placeholder="Выбрать дату события"
        />

        <Text style={[styles.label, { color: glass.textSecondary }]}>Тип</Text>
        <View style={styles.chipsRow}>
          {ACADEMIC_EVENT_TYPES.map((eventType) => {
            const active = type === eventType.key;
            return (
              <TouchableOpacity
                key={eventType.key}
                onPress={() => setType(eventType.key)}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? colors.primary : glass.border,
                    backgroundColor: active ? colors.glass : glass.surfaceTertiary,
                  },
                ]}
              >
                <Text style={{ color: active ? colors.primary : glass.textSecondary, fontSize: 12, fontFamily: 'Montserrat_500Medium' }}>
                  {eventType.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: glass.textSecondary }]}>Описание (опционально)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Аудитория, время, комментарии"
          placeholderTextColor={glass.textTertiary}
          multiline
          style={[styles.input, { minHeight: 70, color: glass.text, borderColor: glass.border, backgroundColor: glass.surfaceTertiary }]}
        />

        <View style={styles.switchRow}>
          <Text style={{ color: glass.text, fontFamily: 'Montserrat_500Medium' }}>Локальное напоминание в 09:00</Text>
          <Switch value={reminderEnabled} onValueChange={setReminderEnabled} trackColor={{ true: colors.primary, false: '#64748b' }} />
        </View>

        <TouchableOpacity onPress={handleAddEvent} style={[styles.addBtn, { backgroundColor: colors.primary }]}> 
          <Icon name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Добавить событие</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { marginTop: 14, backgroundColor: glass.surfaceSecondary, borderColor: glass.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.label, { color: glass.textSecondary, marginTop: 0 }]}>Фильтры</Text>
          <TouchableOpacity onPress={handleExport} style={[styles.exportBtn, { borderColor: glass.border, backgroundColor: colors.glass }]}>
            <Icon name="share-outline" size={15} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Montserrat_600SemiBold' }}>Экспорт</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chipsRow}>
          {[{ key: 'all', label: 'Все' }, ...ACADEMIC_EVENT_TYPES].map((item) => {
            const active = filter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? colors.primary : glass.border,
                    backgroundColor: active ? colors.glass : glass.surfaceTertiary,
                  },
                ]}
              >
                <Text style={{ color: active ? colors.primary : glass.textSecondary, fontSize: 12, fontFamily: 'Montserrat_500Medium' }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {visibleEvents.length === 0 && (
          <View style={[styles.emptyState, { borderColor: glass.border, backgroundColor: glass.surfaceTertiary }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.glass }]}>
              <Icon name="calendar-clear-outline" size={22} color={colors.primary} />
            </View>
            <Text style={{ color: glass.text, marginTop: 10, fontSize: 14, fontFamily: 'Montserrat_600SemiBold' }}>
              События не найдены
            </Text>
            <Text style={{ color: glass.textSecondary, marginTop: 6, fontFamily: 'Montserrat_400Regular', textAlign: 'center', lineHeight: 18 }}>
              Попробуйте другой фильтр или добавьте первое учебное событие.
            </Text>
          </View>
        )}

        {visibleEvents.map((event) => (
          <View key={event.id} style={[styles.eventRow, { borderColor: glass.border, backgroundColor: glass.surfaceTertiary }]}>
            <View style={[styles.dateBadge, { backgroundColor: colors.glass, borderColor: colors.glassBorder || glass.border }]}>
              <Text style={{ color: colors.primary, fontSize: 11, fontFamily: 'Montserrat_700Bold' }}>
                {formatDisplayDate(event.date).slice(0, 5)}
              </Text>
              <Text style={{ color: glass.textSecondary, fontSize: 10, fontFamily: 'Montserrat_500Medium', marginTop: 2 }}>
                {formatDisplayDate(event.date).slice(6)}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: glass.text, fontFamily: 'Montserrat_600SemiBold', fontSize: 14, lineHeight: 20 }}>{event.title}</Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.metaChip, { borderColor: glass.border, backgroundColor: glass.surfaceSecondary }]}>
                      <Icon name="pricetag-outline" size={12} color={colors.primary} />
                      <Text style={{ color: glass.textSecondary, fontFamily: 'Montserrat_500Medium', fontSize: 11 }}>
                        {(ACADEMIC_EVENT_TYPES.find((item) => item.key === event.type) || { label: 'Другое' }).label}
                      </Text>
                    </View>
                    {event.reminderEnabled ? (
                      <View style={[styles.metaChip, { borderColor: glass.border, backgroundColor: glass.surfaceSecondary }]}>
                        <Icon name="notifications-outline" size={12} color="#f59e0b" />
                        <Text style={{ color: glass.textSecondary, fontFamily: 'Montserrat_500Medium', fontSize: 11 }}>
                          Напоминание
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(event)} style={styles.deleteBtn}>
                  <Icon name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <Text style={{ color: colors.primary, fontFamily: 'Montserrat_600SemiBold', fontSize: 12, marginTop: 6 }}>
                {formatDisplayDate(event.date)}
              </Text>

              {!!event.description && (
                <Text style={{ color: glass.textSecondary, fontFamily: 'Montserrat_400Regular', fontSize: 12, marginTop: 6, lineHeight: 18 }}>
                  {event.description}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  heroBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  label: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: 'Montserrat_400Regular',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  switchRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addBtn: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
  },
  eventRow: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  exportBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateBadge: {
    width: 62,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AcademicCalendarScreen;
