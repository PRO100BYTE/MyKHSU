// utils/calendarExport.js
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDateByWeekAndDay } from './dateUtils';

// Форматирование даты в формат ICS (YYYYMMDDTHHMMSS)
const formatICSDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
};

// Экранирование текста для ICS
const escapeICSText = (text) => {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

// Генерация уникального UID для события
const generateUID = (lesson, date) => {
  const dateStr = formatICSDate(date);
  const hash = `${lesson.subject}-${lesson.time}-${dateStr}`.replace(/[^a-zA-Z0-9]/g, '');
  return `${hash}@mykhsu`;
};

// Построение описания занятия
const buildDescription = (lesson, isTeacher, isAuditory) => {
  const parts = [];
  if (lesson.type_lesson) parts.push(`Тип: ${lesson.type_lesson}`);
  if (!isTeacher && lesson.teacher) parts.push(`Преподаватель: ${lesson.teacher}`);
  if (lesson.auditory) parts.push(`Аудитория: ${lesson.auditory}`);
  if ((isTeacher || isAuditory) && lesson.group && Array.isArray(lesson.group) && lesson.group.length > 0) {
    parts.push(`Группы: ${lesson.group.join(', ')}`);
  }
  return parts.join('\\n');
};

// Преобразование расписания в массив событий ICS
const scheduleTOEvents = (days, weekNumber, pairsTime, options = {}) => {
  const { isTeacher = false, isAuditory = false } = options;
  const events = [];

  if (!days || !Array.isArray(days)) return events;

  days.forEach(day => {
    if (!day || !day.lessons || !Array.isArray(day.lessons)) return;

    const date = getDateByWeekAndDay(weekNumber, day.weekday);

    day.lessons.forEach(lesson => {
      if (!lesson || !lesson.subject) return;

      const pairTime = pairsTime && Array.isArray(pairsTime)
        ? pairsTime.find(p => p && p.time === lesson.time)
        : null;

      let startDate, endDate;

      if (pairTime && pairTime.time_start && pairTime.time_end) {
        const [startH, startM] = pairTime.time_start.split(':').map(Number);
        const [endH, endM] = pairTime.time_end.split(':').map(Number);

        startDate = new Date(date);
        startDate.setHours(startH, startM, 0, 0);

        endDate = new Date(date);
        endDate.setHours(endH, endM, 0, 0);
      } else {
        // Fallback — стандартные пары по 1.5 часа начиная с 8:00
        const pairIndex = (lesson.time || 1) - 1;
        startDate = new Date(date);
        startDate.setHours(8 + pairIndex * 2, 0, 0, 0);

        endDate = new Date(date);
        endDate.setHours(9 + pairIndex * 2, 30, 0, 0);
      }

      events.push({
        uid: generateUID(lesson, startDate),
        startDate,
        endDate,
        summary: lesson.subject,
        description: buildDescription(lesson, isTeacher, isAuditory),
        location: lesson.auditory || '',
      });
    });
  });

  return events;
};

// Преобразование дневного расписания студента в события
const dailyScheduleToEvents = (scheduleData, currentDate, pairsTime) => {
  const events = [];
  if (!scheduleData) return events;

  const weekday = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
  const daySchedule = scheduleData.days
    ? scheduleData.days.find(d => d && d.weekday === weekday)
    : { lessons: scheduleData.lessons || [] };

  if (!daySchedule || !daySchedule.lessons) return events;

  daySchedule.lessons.forEach(lesson => {
    if (!lesson || !lesson.subject) return;

    const pairTime = pairsTime && Array.isArray(pairsTime)
      ? pairsTime.find(p => p && p.time === lesson.time)
      : null;

    let startDate, endDate;

    if (pairTime && pairTime.time_start && pairTime.time_end) {
      const [startH, startM] = pairTime.time_start.split(':').map(Number);
      const [endH, endM] = pairTime.time_end.split(':').map(Number);

      startDate = new Date(currentDate);
      startDate.setHours(startH, startM, 0, 0);

      endDate = new Date(currentDate);
      endDate.setHours(endH, endM, 0, 0);
    } else {
      const pairIndex = (lesson.time || 1) - 1;
      startDate = new Date(currentDate);
      startDate.setHours(8 + pairIndex * 2, 0, 0, 0);

      endDate = new Date(currentDate);
      endDate.setHours(9 + pairIndex * 2, 30, 0, 0);
    }

    events.push({
      uid: generateUID(lesson, startDate),
      startDate,
      endDate,
      summary: lesson.subject,
      description: buildDescription(lesson, false, false),
      location: lesson.auditory || '',
    });
  });

  return events;
};

// Генерация содержимого ICS-файла
const generateICSContent = (events, calendarName = 'Расписание MyKHSU') => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MyKHSU//Schedule//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICSText(calendarName)}`,
  ];

  events.forEach(event => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTART:${formatICSDate(event.startDate)}`);
    lines.push(`DTEND:${formatICSDate(event.endDate)}`);
    lines.push(`SUMMARY:${escapeICSText(event.summary)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${event.description}`);
    }
    if (event.location) {
      lines.push(`LOCATION:${escapeICSText(event.location)}`);
    }
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

/**
 * Экспорт расписания в .ics файл и открытие диалога "Поделиться"
 * 
 * @param {Object} params
 * @param {string} params.mode - 'student' | 'teacher' | 'auditory'
 * @param {string} params.viewMode - 'day' | 'week' (только для student)
 * @param {Object} params.scheduleData - данные расписания студента
 * @param {Object} params.teacherSchedule - данные расписания преподавателя
 * @param {Object} params.auditorySchedule - данные расписания аудитории
 * @param {Array}  params.pairsTime - массив временных слотов пар
 * @param {number} params.currentWeek - номер текущей недели
 * @param {Date}   params.currentDate - текущая дата (для дневного режима)
 * @param {string} params.title - название для файла (группа/ФИО/аудитория)
 * @returns {Promise<boolean>} true если успешно
 */
export const exportScheduleToCalendar = async (params) => {
  const {
    mode,
    viewMode = 'week',
    scheduleData,
    teacherSchedule,
    auditorySchedule,
    pairsTime,
    currentWeek,
    currentDate,
    title = '',
  } = params;

  let events = [];
  let calendarName = 'Расписание MyKHSU';
  let fileName = 'schedule';

  if (mode === 'teacher' && teacherSchedule) {
    events = scheduleTOEvents(
      teacherSchedule.days,
      currentWeek,
      teacherSchedule.pairs_time || pairsTime,
      { isTeacher: true }
    );
    calendarName = `Расписание: ${title}`;
    fileName = `schedule_teacher_week${currentWeek}`;
  } else if (mode === 'auditory' && auditorySchedule) {
    events = scheduleTOEvents(
      auditorySchedule.days,
      currentWeek,
      auditorySchedule.pairs_time || pairsTime,
      { isAuditory: true }
    );
    calendarName = `Расписание ауд. ${title}`;
    fileName = `schedule_auditory_week${currentWeek}`;
  } else if (mode === 'student' && scheduleData) {
    if (viewMode === 'day' && currentDate) {
      events = dailyScheduleToEvents(scheduleData, currentDate, pairsTime);
      calendarName = `Расписание ${title}`;
      const dateStr = currentDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }).replace('.', '-');
      fileName = `schedule_${dateStr}`;
    } else {
      events = scheduleTOEvents(
        scheduleData.days,
        currentWeek,
        pairsTime,
        { isTeacher: false }
      );
      calendarName = `Расписание ${title}`;
      fileName = `schedule_week${currentWeek}`;
    }
  }

  if (events.length === 0) {
    throw new Error('NO_EVENTS');
  }

  const icsContent = generateICSContent(events, calendarName);

  // Сохранение во временную директорию
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = `${FileSystem.cacheDirectory}${sanitizedFileName}.ics`;

  await FileSystem.writeAsStringAsync(filePath, icsContent, {
    encoding: 'utf8',
  });

  // Проверяем доступность функции "Поделиться"
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('SHARING_NOT_AVAILABLE');
  }

  await Sharing.shareAsync(filePath, {
    mimeType: 'text/calendar',
    dialogTitle: 'Экспорт расписания',
    UTI: 'com.apple.ical.ics',
  });

  return true;
};
