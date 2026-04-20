import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LIQUID_GLASS, ACCENT_COLORS } from '../utils/constants';
import { loadAllAttendance, getAttendanceStats } from '../utils/attendanceStorage';
import { getAllHomeworkDeadlines, HOMEWORK_STATUSES } from '../utils/notesStorage';
import notificationService from '../utils/notificationService';
import { loadStudyProfile, saveStudyProfile } from '../utils/studyProfileStorage';

const formatDateTime = (timestamp) => {
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

const statusLabel = {
  [HOMEWORK_STATUSES.TODO]: 'К выполнению',
  [HOMEWORK_STATUSES.IN_PROGRESS]: 'В работе',
  [HOMEWORK_STATUSES.DONE]: 'Сделано',
};

const StudyProfileScreen = ({ theme, accentColor }) => {
  const [attendanceMap, setAttendanceMap] = useState({});
  const [deadlines, setDeadlines] = useState([]);
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState({ targetAttendance: 85, weeklyStudyTargetHours: 12 });

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;

  const loadData = async () => {
    const [attendance, deadlinesData, historyData, profileData] = await Promise.all([
      loadAllAttendance(),
      getAllHomeworkDeadlines(),
      notificationService.getScheduleChangesHistory(7),
      loadStudyProfile(),
    ]);
    setAttendanceMap(attendance);
    setDeadlines(deadlinesData);
    setHistory(historyData.slice(0, 20));
    setProfile(profileData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const attendanceStats = useMemo(() => getAttendanceStats(attendanceMap), [attendanceMap]);
  const attendanceTotal = useMemo(() => {
    let attended = 0;
    let all = 0;
    Object.values(attendanceMap).forEach((entry) => {
      if (!entry || !entry.dateISO) return;
      if (entry.status === 'attended') attended += 1;
      all += 1;
    });
    return {
      attended,
      all,
      ratio: all > 0 ? Math.round((attended / all) * 100) : 0,
    };
  }, [attendanceMap]);

  const deadlinesStats = useMemo(() => {
    const result = { todo: 0, in_progress: 0, done: 0, overdue: 0 };
    deadlines.forEach((item) => {
      if (item.isOverdue) result.overdue += 1;
      if (item.status === HOMEWORK_STATUSES.DONE) result.done += 1;
      else if (item.status === HOMEWORK_STATUSES.IN_PROGRESS) result.in_progress += 1;
      else result.todo += 1;
    });
    return result;
  }, [deadlines]);

  const updateTargetAttendance = async (delta) => {
    const next = Math.min(100, Math.max(50, Number(profile.targetAttendance || 85) + delta));
    const updated = { ...profile, targetAttendance: next };
    setProfile(updated);
    await saveStudyProfile(updated);
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 64 }}>
      <Text style={[styles.title, { color: glass.text }]}>Персональный учебный профиль</Text>

      <View style={[styles.card, { backgroundColor: glass.surfaceSecondary, borderColor: glass.border }]}>
        <Text style={[styles.sectionTitle, { color: glass.text }]}>Посещаемость</Text>
        <Text style={{ color: glass.textSecondary, fontFamily: 'Montserrat_400Regular', marginTop: 4 }}>
          Текущая: {attendanceTotal.ratio}% ({attendanceTotal.attended}/{attendanceTotal.all})
        </Text>

        <View style={styles.targetRow}>
          <Text style={{ color: glass.text, fontFamily: 'Montserrat_500Medium' }}>Цель посещаемости</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => updateTargetAttendance(-5)} style={[styles.targetBtn, { borderColor: glass.border }]}>
              <Icon name="remove" size={16} color={glass.text} />
            </TouchableOpacity>
            <Text style={{ color: colors.primary, fontFamily: 'Montserrat_700Bold' }}>{profile.targetAttendance}%</Text>
            <TouchableOpacity onPress={() => updateTargetAttendance(5)} style={[styles.targetBtn, { borderColor: glass.border }]}>
              <Icon name="add" size={16} color={glass.text} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={{ color: attendanceTotal.ratio >= profile.targetAttendance ? '#10b981' : '#f59e0b', marginTop: 8, fontFamily: 'Montserrat_500Medium' }}>
          {attendanceTotal.ratio >= profile.targetAttendance ? 'Цель выполняется' : 'Нужно усилить посещаемость'}
        </Text>
      </View>

      <View style={[styles.card, { marginTop: 12, backgroundColor: glass.surfaceSecondary, borderColor: glass.border }]}>
        <Text style={[styles.sectionTitle, { color: glass.text }]}>Дедлайны и ДЗ</Text>
        <Text style={[styles.text, { color: glass.textSecondary }]}>К выполнению: {deadlinesStats.todo}</Text>
        <Text style={[styles.text, { color: glass.textSecondary }]}>В работе: {deadlinesStats.in_progress}</Text>
        <Text style={[styles.text, { color: glass.textSecondary }]}>Готово: {deadlinesStats.done}</Text>
        <Text style={[styles.text, { color: '#ef4444' }]}>Просрочено: {deadlinesStats.overdue}</Text>

        {deadlines.slice(0, 6).map((item) => (
          <View key={item.id} style={[styles.listRow, { borderColor: glass.border, backgroundColor: glass.surfaceTertiary }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: glass.text, fontFamily: 'Montserrat_600SemiBold', fontSize: 13 }}>{item.subject}</Text>
              <Text style={{ color: glass.textSecondary, fontFamily: 'Montserrat_400Regular', fontSize: 11, marginTop: 2 }}>
                {item.homework}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: item.isOverdue ? '#ef4444' : colors.primary, fontFamily: 'Montserrat_500Medium', fontSize: 11 }}>
                {item.dueDate || 'Без даты'}
              </Text>
              <Text style={{ color: glass.textSecondary, fontFamily: 'Montserrat_400Regular', fontSize: 11, marginTop: 2 }}>
                {item.isOverdue ? 'Просрочено' : (statusLabel[item.status] || 'К выполнению')}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.card, { marginTop: 12, backgroundColor: glass.surfaceSecondary, borderColor: glass.border }]}>
        <Text style={[styles.sectionTitle, { color: glass.text }]}>История изменений расписания (7 дней)</Text>
        {history.length === 0 && (
          <Text style={[styles.text, { color: glass.textSecondary }]}>Изменений пока нет.</Text>
        )}
        {history.map((entry) => (
          <View key={entry.id} style={[styles.listRow, { borderColor: glass.border, backgroundColor: glass.surfaceTertiary }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: glass.text, fontFamily: 'Montserrat_500Medium', fontSize: 12 }}>
                {entry.type === 'changed' ? 'Изменена пара' : entry.type === 'added' ? 'Добавлена пара' : 'Удалена пара'}
              </Text>
              <Text style={{ color: glass.textSecondary, fontFamily: 'Montserrat_400Regular', fontSize: 11, marginTop: 2 }}>
                {entry.lesson?.subject || 'Пара'} · {entry.lesson?.time || '-'} · {entry.scheduleKey}
              </Text>
            </View>
            <Text style={{ color: glass.textSecondary, fontFamily: 'Montserrat_400Regular', fontSize: 11 }}>
              {formatDateTime(entry.timestamp)}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, { marginTop: 12, backgroundColor: glass.surfaceSecondary, borderColor: glass.border }]}>
        <Text style={[styles.sectionTitle, { color: glass.text }]}>Риск-зоны по предметам</Text>
        {attendanceStats.slice(0, 5).map((item) => (
          <View key={item.subject} style={[styles.listRow, { borderColor: glass.border, backgroundColor: glass.surfaceTertiary }]}>
            <Text style={{ color: glass.text, fontFamily: 'Montserrat_500Medium', flex: 1 }}>{item.subject}</Text>
            <Text style={{ color: item.isWarning ? '#ef4444' : '#10b981', fontFamily: 'Montserrat_600SemiBold' }}>
              {Math.round((1 - item.absentRatio) * 100)}%
            </Text>
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
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  text: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  targetRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listRow: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default StudyProfileScreen;
