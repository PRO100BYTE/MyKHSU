import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';
import notificationService from '../utils/notificationService';

const WEEKDAY_SHORT = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const formatStamp = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const buildChangeRows = (entry) => {
  if (!entry) return [];

  if (entry.type === 'changed') {
    const pairs = [
      ['Предмет', entry.prev?.subject, entry.lesson?.subject],
      ['Преподаватель', entry.prev?.teacher, entry.lesson?.teacher],
      ['Аудитория', entry.prev?.auditory, entry.lesson?.auditory],
      ['Время пары', entry.prev?.time, entry.lesson?.time],
    ];
    return pairs.filter(([, prevValue, nextValue]) => (prevValue || '') !== (nextValue || ''));
  }

  return [
    ['Предмет', null, entry.lesson?.subject || 'Не указано'],
    ['Преподаватель', null, entry.lesson?.teacher || 'Не указан'],
    ['Аудитория', null, entry.lesson?.auditory || 'Не указана'],
    ['Время пары', null, entry.lesson?.time || 'Не указано'],
  ];
};

const ScheduleChangesHistoryScreen = ({ theme, accentColor }) => {
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;

  const loadHistory = async () => {
    const items = await notificationService.getScheduleChangesHistory(7);
    setHistory(items);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, padding: 16 }}
      contentContainerStyle={{ paddingBottom: 64 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
    >
      <View style={[styles.card, { backgroundColor: glass.surfaceSecondary, borderColor: glass.border }]}> 
        <Text style={[styles.title, { color: glass.text }]}>Лента изменений расписания</Text>
        <Text style={{ color: glass.textSecondary, fontSize: 12, fontFamily: 'Montserrat_400Regular', marginTop: 4 }}>
          Изменения за 7 дней с детализацией по полям пары.
        </Text>
      </View>

      {history.length === 0 ? (
        <View style={[styles.card, { marginTop: 12, backgroundColor: glass.surfaceSecondary, borderColor: glass.border }]}> 
          <Text style={{ color: glass.textSecondary, fontFamily: 'Montserrat_400Regular' }}>Изменений пока нет.</Text>
        </View>
      ) : null}

      {history.map((entry) => {
        const rows = buildChangeRows(entry);
        const changeTitle = entry.type === 'changed'
          ? 'Изменена пара'
          : entry.type === 'added'
            ? 'Добавлена пара'
            : 'Удалена пара';

        return (
          <View key={entry.id} style={[styles.card, { marginTop: 12, backgroundColor: glass.surfaceSecondary, borderColor: glass.border }]}> 
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: glass.text, fontSize: 14, fontFamily: 'Montserrat_600SemiBold' }}>{changeTitle}</Text>
                <Text style={{ color: glass.textSecondary, fontSize: 12, fontFamily: 'Montserrat_400Regular', marginTop: 4 }}>
                  {entry.scheduleKey} · {WEEKDAY_SHORT[entry.weekday] || 'День не указан'}
                </Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Montserrat_500Medium' }}>
                {formatStamp(entry.timestamp)}
              </Text>
            </View>

            {rows.map(([label, prevValue, nextValue]) => (
              <View key={`${entry.id}_${label}`} style={[styles.diffRow, { borderColor: glass.border, backgroundColor: glass.surfaceTertiary }]}> 
                <View style={{ flex: 1 }}>
                  <Text style={{ color: glass.textSecondary, fontSize: 11, fontFamily: 'Montserrat_500Medium' }}>{label}</Text>
                  {prevValue != null ? (
                    <Text style={{ color: glass.textSecondary, fontSize: 12, fontFamily: 'Montserrat_400Regular', marginTop: 4 }}>
                      Было: {prevValue || 'Не указано'}
                    </Text>
                  ) : null}
                  <Text style={{ color: glass.text, fontSize: 13, fontFamily: 'Montserrat_500Medium', marginTop: 4 }}>
                    Стало: {nextValue || 'Не указано'}
                  </Text>
                </View>
                <Icon name={entry.type === 'removed' ? 'remove-circle-outline' : 'swap-horizontal-outline'} size={18} color={entry.type === 'removed' ? '#ef4444' : colors.primary} />
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
  },
  diffRow: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    flexDirection: 'row',
    gap: 8,
  },
});

export default ScheduleChangesHistoryScreen;