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
          <Text style={{ color: glass.textSecondary, marginTop: 6, fontFamily: 'Montserrat_400Regular' }}>
            События не найдены.
          </Text>
        )}

        {visibleEvents.map((event) => (
          <View key={event.id} style={[styles.eventRow, { borderColor: glass.border, backgroundColor: glass.surfaceTertiary }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: glass.text, fontFamily: 'Montserrat_600SemiBold', fontSize: 14 }}>{event.title}</Text>
              <Text style={{ color: glass.textSecondary, fontFamily: 'Montserrat_400Regular', fontSize: 12, marginTop: 2 }}>
                {event.date} · {(ACADEMIC_EVENT_TYPES.find((item) => item.key === event.type) || { label: 'Другое' }).label}
                {event.reminderEnabled ? ' · с напоминанием' : ''}
              </Text>
              {!!event.description && (
                <Text style={{ color: glass.textSecondary, fontFamily: 'Montserrat_400Regular', fontSize: 12, marginTop: 4 }}>
                  {event.description}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => handleDelete(event)} style={{ padding: 6 }}>
              <Icon name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
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
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
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
});

export default AcademicCalendarScreen;
