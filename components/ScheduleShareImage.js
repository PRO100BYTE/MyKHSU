import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import { ACCENT_COLORS, LIQUID_GLASS, APP_VERSION } from '../utils/constants';
import { formatDate, getDateByWeekAndDay } from '../utils/dateUtils';

const getLessonTypeInfo = (type) => {
  const t = (type || '').toLowerCase().trim();
  if (t.includes('лек') || t === 'л.' || t === 'лекция')
    return { label: 'Лекция', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' };
  if (t.includes('лаб') || t === 'лаб.' || t === 'лабораторная')
    return { label: 'Лабораторная', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' };
  if (t.includes('практ') || t.includes('пр.') || t === 'пр' || t === 'практическая')
    return { label: 'Практика', color: '#10B981', bg: 'rgba(16,185,129,0.12)' };
  if (t.includes('конс') || t === 'конс.' || t === 'консультация')
    return { label: 'Консультация', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
  if (t.includes('экзамен') || t.includes('экз.'))
    return { label: 'Экзамен', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
  if (t.includes('зачет') || t.includes('зач.'))
    return { label: 'Зачёт', color: '#10B981', bg: 'rgba(16,185,129,0.12)' };
  if (t.includes('мероприятие') || t.includes('собрание'))
    return { label: 'Мероприятие', color: '#6366F1', bg: 'rgba(99,102,241,0.12)' };
  if (t.includes('самост') || t.includes('сам.'))
    return { label: 'Самост. работа', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' };
  return { label: type || 'Занятие', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' };
};

const ScheduleShareImage = forwardRef(({
  theme,
  accentColor,
  scheduleData,
  teacherSchedule,
  auditorySchedule,
  isTeacherMode,
  isAuditoryMode,
  teacherName,
  auditoryName,
  selectedGroup,
  viewMode,
  currentDate,
  currentWeek,
  pairsTime,
}, ref) => {
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  
  // Горизонтальный режим для недельного расписания (преподаватели, аудитории и студенты в режиме недели)
  const isDayView = viewMode === 'day' && !isTeacherMode && !isAuditoryMode;
  const isHorizontal = !isDayView;

  // Всегда рендерим на светлом фоне для читаемости
  const bg = '#FFFFFF';
  const cardBg = '#F8FAFC';
  const text = '#1E293B';
  const textSec = '#64748B';
  const border = '#E2E8F0';

  const weekdays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const weekdaysShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Определяем заголовок
  let title = '';
  let subtitle = '';
  if (isTeacherMode) {
    title = teacherName || 'Преподаватель';
    subtitle = 'Расписание преподавателя';
  } else if (isAuditoryMode) {
    title = auditoryName || 'Аудитория';
    subtitle = 'Расписание аудитории';
  } else {
    title = selectedGroup || 'Группа';
    subtitle = 'Расписание занятий';
  }

  const getTimeForLesson = (timeNumber) => {
    if (!pairsTime || !Array.isArray(pairsTime)) return null;
    return pairsTime.find(p => p && p.time === timeNumber);
  };

  // Собираем дни для рендера
  const getDays = () => {
    const data = isTeacherMode ? teacherSchedule : isAuditoryMode ? auditorySchedule : scheduleData;
    if (!data) return [];

    if (viewMode === 'day' && !isTeacherMode && !isAuditoryMode) {
      const weekday = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
      const daySchedule = data.days
        ? data.days.find(d => d && d.weekday === weekday)
        : { lessons: data.lessons || [], weekday };
      return daySchedule ? [daySchedule] : [];
    }

    return (data.days || []).filter(d => d && d.lessons && d.lessons.length > 0);
  };

  const days = getDays();

  // --- Вертикальный режим (студенты) ---
  const renderLesson = (lesson, index, pairTime) => {
    const typeInfo = getLessonTypeInfo(lesson.type_lesson);
    return (
      <View key={lesson.id || index} style={s.lessonRow}>
        <View style={[s.pairNum, { backgroundColor: colors.primary + '14' }]}>
          <Text style={[s.pairNumText, { color: colors.primary }]}>{lesson.time}</Text>
        </View>
        <View style={s.lessonInfo}>
          <View style={s.lessonTopRow}>
            <Text style={[s.lessonTime, { color: textSec }]}>
              {pairTime ? `${pairTime.time_start} – ${pairTime.time_end}` : `Пара ${lesson.time}`}
            </Text>
            {typeInfo.label ? (
              <View style={[s.typeBadge, { backgroundColor: typeInfo.bg }]}>
                <Text style={[s.typeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[s.subjectText, { color: text }]} numberOfLines={2}>{lesson.subject}</Text>
          <View style={s.detailsRow}>
            {lesson.teacher ? (
              <View style={s.detailItem}>
                <Icon name="person-outline" size={12} color={textSec} />
                <Text style={[s.detailText, { color: textSec }]} numberOfLines={1}>{lesson.teacher}</Text>
              </View>
            ) : null}
            {lesson.auditory ? (
              <View style={s.detailItem}>
                <Icon name="location-outline" size={12} color={textSec} />
                <Text style={[s.detailText, { color: textSec }]}>{lesson.auditory}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const renderDay = (day) => {
    const date = getDateByWeekAndDay(currentWeek, day.weekday);
    return (
      <View key={day.weekday} style={s.dayBlock}>
        <View style={s.dayHeader}>
          <View style={[s.dayDot, { backgroundColor: colors.primary }]} />
          <Text style={[s.dayTitle, { color: text }]}>{weekdays[day.weekday - 1]}</Text>
          <Text style={[s.dayDate, { color: textSec }]}>{formatDate(date)}</Text>
        </View>
        <View style={[s.dayCard, { backgroundColor: cardBg, borderColor: border }]}>
          {day.lessons.filter(Boolean).map((lesson, i) => {
            const pairTime = getTimeForLesson(lesson.time);
            return renderLesson(lesson, i, pairTime);
          })}
        </View>
      </View>
    );
  };

  // --- Горизонтальный режим (преподаватели / аудитории) ---
  const renderHorizontalLesson = (lesson, index) => {
    const typeInfo = getLessonTypeInfo(lesson.type_lesson);
    const pairTime = getTimeForLesson(lesson.time);
    return (
      <View key={lesson.id || index} style={sh.lessonRow}>
        <View style={sh.lessonTopLine}>
          <View style={[sh.pairBadge, { backgroundColor: colors.primary + '14' }]}>
            <Text style={[sh.pairBadgeText, { color: colors.primary }]}>{lesson.time}</Text>
          </View>
          <Text style={[sh.timeText, { color: textSec }]}>
            {pairTime ? `${pairTime.time_start}–${pairTime.time_end}` : ''}
          </Text>
          {typeInfo.label ? (
            <View style={[sh.typeBadge, { backgroundColor: typeInfo.bg }]}>
              <Text style={[sh.typeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[sh.subjectText, { color: text }]} numberOfLines={2}>{lesson.subject}</Text>
        {!isAuditoryMode && lesson.auditory ? (
          <Text style={[sh.metaText, { color: textSec }]} numberOfLines={1}>
            <Icon name="location-outline" size={10} color={textSec} /> {lesson.auditory}
          </Text>
        ) : null}
        {!isTeacherMode && lesson.teacher ? (
          <Text style={[sh.metaText, { color: textSec }]} numberOfLines={1}>
            <Icon name="person-outline" size={10} color={textSec} /> {lesson.teacher}
          </Text>
        ) : null}
        {lesson.group && Array.isArray(lesson.group) && lesson.group.length > 0 ? (
          <Text style={[sh.metaText, { color: textSec }]} numberOfLines={1}>
            <Icon name="people-outline" size={10} color={textSec} /> {lesson.group.join(', ')}
          </Text>
        ) : null}
      </View>
    );
  };

  const renderHorizontalDay = (day) => {
    const date = getDateByWeekAndDay(currentWeek, day.weekday);
    return (
      <View key={day.weekday} style={sh.dayColumn}>
        <View style={[sh.dayHeader, { backgroundColor: colors.primary + '0C' }]}>
          <Text style={[sh.dayName, { color: colors.primary }]}>{weekdaysShort[day.weekday - 1]}</Text>
          <Text style={[sh.dayDateText, { color: textSec }]}>{formatDate(date)}</Text>
        </View>
        <View style={sh.dayContent}>
          {day.lessons.filter(Boolean).map((lesson, i) => renderHorizontalLesson(lesson, i))}
        </View>
      </View>
    );
  };

  // Разбиваем дни на ряды по 3 колонки для горизонтального режима
  const getHorizontalRows = () => {
    const rows = [];
    for (let i = 0; i < days.length; i += 3) {
      rows.push(days.slice(i, i + 3));
    }
    return rows;
  };

  // Форматирование даты для заголовка
  const getDateLabel = () => {
    if (viewMode === 'day' && !isTeacherMode && !isAuditoryMode) {
      return currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const data = isTeacherMode ? teacherSchedule : isAuditoryMode ? auditorySchedule : scheduleData;
    if (data?.dates) {
      return `Неделя ${data.week_number} • ${data.dates.date_start} – ${data.dates.date_end}`;
    }
    return `Неделя ${currentWeek}`;
  };

  // --- Горизонтальный рендер ---
  if (isHorizontal) {
    const rows = getHorizontalRows();
    return (
      <View style={s.offscreen} pointerEvents="none">
        <ViewShot ref={ref} options={{ format: 'png', quality: 1, result: 'tmpfile' }}>
          <View style={[sh.card, { backgroundColor: bg }]}>
            {/* Шапка */}
            <View style={[sh.header, { borderBottomColor: border }]}>
              <View style={[s.logoBadge, { backgroundColor: colors.primary }]}>
                <Icon name="calendar" size={20} color="#FFFFFF" />
              </View>
              <View style={s.headerText}>
                <Text style={[s.headerTitle, { color: text }]}>{title}</Text>
                <Text style={[s.headerSubtitle, { color: textSec }]}>{subtitle}</Text>
              </View>
              <View style={[sh.datePill, { backgroundColor: colors.primary + '0A' }]}>
                <Icon name="calendar-outline" size={13} color={colors.primary} />
                <Text style={[sh.datePillText, { color: colors.primary }]}>{getDateLabel()}</Text>
              </View>
            </View>

            {/* Контент — ряды по 3 дня */}
            {days.length > 0 ? (
              rows.map((row, ri) => (
                <View key={ri} style={sh.dayRow}>
                  {row.map(renderHorizontalDay)}
                  {/* Заполнитель до 3 колонок */}
                  {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, fi) => (
                    <View key={`fill-${fi}`} style={sh.dayColumn} />
                  ))}
                </View>
              ))
            ) : (
              <View style={s.emptyBlock}>
                <Text style={[s.emptyText, { color: textSec }]}>Занятий нет</Text>
              </View>
            )}

            {/* Футер */}
            <View style={[sh.footer, { borderTopColor: border }]}>
              <Text style={[s.footerText, { color: textSec }]}>
                Мой ИТИ ХГУ v{APP_VERSION}
              </Text>
            </View>
          </View>
        </ViewShot>
      </View>
    );
  }

  // --- Вертикальный рендер (студенты) ---
  return (
    <View style={s.offscreen} pointerEvents="none">
      <ViewShot ref={ref} options={{ format: 'png', quality: 1, result: 'tmpfile' }}>
        <View style={[s.card, { backgroundColor: bg }]}>
          {/* Шапка */}
          <View style={[s.header, { borderBottomColor: border }]}>
            <View style={[s.logoBadge, { backgroundColor: colors.primary }]}>
              <Icon name="calendar" size={20} color="#FFFFFF" />
            </View>
            <View style={s.headerText}>
              <Text style={[s.headerTitle, { color: text }]}>{title}</Text>
              <Text style={[s.headerSubtitle, { color: textSec }]}>{subtitle}</Text>
            </View>
          </View>

          {/* Дата */}
          <View style={[s.dateBar, { backgroundColor: colors.primary + '0A' }]}>
            <Icon name="calendar-outline" size={14} color={colors.primary} />
            <Text style={[s.dateText, { color: colors.primary }]}>{getDateLabel()}</Text>
          </View>

          {/* Содержимое */}
          {days.length > 0 ? (
            days.map(renderDay)
          ) : (
            <View style={s.emptyBlock}>
              <Text style={[s.emptyText, { color: textSec }]}>Занятий нет</Text>
            </View>
          )}

          {/* Футер */}
          <View style={[s.footer, { borderTopColor: border }]}>
            <Text style={[s.footerText, { color: textSec }]}>
              Мой ИТИ ХГУ v{APP_VERSION}
            </Text>
          </View>
        </View>
      </ViewShot>
    </View>
  );
});

const s = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
    opacity: 0,
  },
  card: {
    width: 420,
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    marginLeft: 8,
  },
  dayBlock: {
    marginHorizontal: 20,
    marginTop: 14,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 8,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  dayDate: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    marginLeft: 8,
  },
  dayCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  lessonRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  pairNum: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  pairNumText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lessonTime: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  subjectText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    lineHeight: 19,
    marginBottom: 4,
  },
  detailsRow: {
    gap: 3,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginLeft: 5,
    flex: 1,
  },
  emptyBlock: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
  },
});

// Горизонтальные стили для преподавателей / аудиторий
const sh = StyleSheet.create({
  card: {
    width: 1100,
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    marginLeft: 6,
  },
  dayRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    marginTop: 12,
    gap: 10,
  },
  dayColumn: {
    flex: 1,
    minWidth: 0,
  },
  dayHeader: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  dayDateText: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
  },
  dayContent: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  lessonRow: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  lessonTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  pairBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pairBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  timeText: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    lineHeight: 16,
    marginBottom: 2,
  },
  metaText: {
    fontSize: 10,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 14,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
});

export default ScheduleShareImage;
