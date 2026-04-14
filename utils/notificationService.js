import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWithExpiry, setWithExpiry } from './cache';
import { getDateByWeekAndDay } from './dateUtils';

// Конфигурация уведомлений
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.isConfigured = false;
  }

  async getNotificationSettings() {
    try {
      const saved = await SecureStore.getItemAsync('notification_settings');
      if (saved) {
        return JSON.parse(saved);
      }
      return this.getDefaultSettings();
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      enabled: false,
      news: false,
      schedule: false,
      scheduleChanges: true,
      beforeLesson: true,
      lessonStart: true,
      beforeLessonEnd: true,
      lessonEnd: true
    };
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('schedule', {
        name: 'Расписание',
        description: 'Уведомления о парах',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });

      await Notifications.setNotificationChannelAsync('news', {
        name: 'Новости',
        description: 'Уведомления о новостях',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return false;
      }
    } else {
      return false;
    }
    
    this.isConfigured = true;
    return true;
  }

  async scheduleLessonNotifications(scheduleData, pairsTime) {
    try {
      if (!scheduleData || !pairsTime || pairsTime.length === 0) {
        return;
      }

      const settings = await this.getNotificationSettings();
      if (!settings.enabled || !settings.schedule) {
        return;
      }

      // Запрашиваем разрешения если не настроены
      if (!this.isConfigured) {
        const granted = await this.requestPermissions();
        if (!granted) {
          console.log('Notification permissions not granted');
          return;
        }
      }

      // Отменяем предыдущие уведомления о парах
      await Notifications.cancelAllScheduledNotificationsAsync();

      const notifications = [];
      const now = new Date();

      // Недельный режим: scheduleData.days — массив { weekday, lessons }
      if (scheduleData.days && Array.isArray(scheduleData.days)) {
        const weekNumber = scheduleData.week_number;
        
        for (const day of scheduleData.days) {
          if (!day || !day.lessons || !day.weekday) continue;

          // Вычисляем реальную дату для этого дня недели
          let dayDate;
          if (weekNumber) {
            dayDate = getDateByWeekAndDay(weekNumber, day.weekday);
          } else {
            continue;
          }

          for (const lesson of day.lessons) {
            if (!lesson) continue;
            const pairTime = pairsTime.find(p => 
              p.time === String(lesson.time) || p.time === lesson.time
            );
            if (!pairTime) continue;

            const lessonNotifications = this.createLessonNotificationsForDate(
              lesson, pairTime, settings, dayDate, now
            );
            notifications.push(...lessonNotifications);
          }
        }
      }

      // Дневной режим: scheduleData.lessons — прямой массив уроков
      if (scheduleData.lessons && Array.isArray(scheduleData.lessons)) {
        const dayDate = scheduleData.currentDate || new Date();

        for (const lesson of scheduleData.lessons) {
          if (!lesson) continue;
          const pairTime = pairsTime.find(p => 
            p.time === String(lesson.time) || p.time === lesson.time
          );
          if (!pairTime) continue;

          const lessonNotifications = this.createLessonNotificationsForDate(
            lesson, pairTime, settings, dayDate, now
          );
          notifications.push(...lessonNotifications);
        }
      }

      // Планируем все уведомления
      let scheduled = 0;
      for (const notification of notifications) {
        try {
          await Notifications.scheduleNotificationAsync(notification);
          scheduled++;
        } catch (e) {
          console.error('Error scheduling notification:', e);
        }
      }

      console.log(`Запланировано ${scheduled} уведомлений о парах`);
    } catch (error) {
      console.error('Error scheduling lesson notifications:', error);
    }
  }

  createLessonNotificationsForDate(lesson, pairTime, settings, lessonDate, now) {
    const notifications = [];

    const startTimeStr = pairTime.time_start || pairTime.start;
    const endTimeStr = pairTime.time_end || pairTime.end;

    if (!startTimeStr || !endTimeStr) return notifications;

    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    const [endHours, endMinutes] = endTimeStr.split(':').map(Number);

    // Используем реальную дату урока
    const startTime = new Date(lessonDate);
    startTime.setHours(startHours, startMinutes, 0, 0);

    const endTime = new Date(lessonDate);
    endTime.setHours(endHours, endMinutes, 0, 0);

    const subjectName = lesson.subject || 'Пара';
    const auditory = lesson.auditory || '';
    const channelId = Platform.OS === 'android' ? 'schedule' : undefined;

    // Пропускаем полностью прошедшие пары
    if (endTime <= now) return notifications;

    // Уведомление за 5 минут до начала
    if (settings.beforeLesson) {
      const beforeStartTime = new Date(startTime.getTime() - 5 * 60 * 1000);
      if (beforeStartTime > now) {
        notifications.push({
          content: {
            title: '⏰ Скоро пара',
            body: `Через 5 минут: ${subjectName}${auditory ? ` (${auditory})` : ''}`,
            data: { type: 'lesson_reminder' },
            sound: true,
            ...(channelId && { channelId }),
          },
          trigger: { type: 'date', date: beforeStartTime }
        });
      }
    }

    // Уведомление в начале пары
    if (settings.lessonStart && startTime > now) {
      notifications.push({
        content: {
          title: '📚 Началась пара',
          body: `${subjectName}${auditory ? ` в ${auditory}` : ''}`,
          data: { type: 'lesson_start' },
          sound: true,
          ...(channelId && { channelId }),
        },
        trigger: { type: 'date', date: startTime }
      });
    }

    // Уведомление за 5 минут до конца
    if (settings.beforeLessonEnd) {
      const beforeEndTime = new Date(endTime.getTime() - 5 * 60 * 1000);
      if (beforeEndTime > now) {
        notifications.push({
          content: {
            title: '⏳ Скоро конец пары',
            body: `Через 5 минут закончится: ${subjectName}`,
            data: { type: 'lesson_end_reminder' },
            sound: true,
            ...(channelId && { channelId }),
          },
          trigger: { type: 'date', date: beforeEndTime }
        });
      }
    }

    // Уведомление в конце пары
    if (settings.lessonEnd && endTime > now) {
      notifications.push({
        content: {
          title: '✅ Пара закончилась',
          body: `${subjectName} завершена`,
          data: { type: 'lesson_end' },
          sound: true,
          ...(channelId && { channelId }),
        },
        trigger: { type: 'date', date: endTime }
      });
    }

    return notifications;
  }

  // Метод для проверки новых новостей
  async checkForNewNews(currentNews) {
    try {
      if (!currentNews || currentNews.length === 0) return;

      // Проверяем настройки уведомлений
      const settings = await this.getNotificationSettings();
      if (!settings.enabled || !settings.news) {
        return;
      }

      // Получаем последние закэшированные новости
      const lastCachedNews = await getWithExpiry('news_latest');
      const lastNewsCheck = await getWithExpiry('news_last_check');
      
      // Если это первая проверка, сохраняем текущие новости и выходим
      if (!lastCachedNews || lastCachedNews.length === 0) {
        await this.updateNewsCache(currentNews);
        return;
      }

      // Находим действительно новые новости (по дате публикации)
      const newNews = this.findTrulyNewNews(currentNews, lastCachedNews);
      
      if (newNews.length > 0) {
        await this.showNewsNotification(newNews);
        await this.updateNewsCache(currentNews);
      }
    } catch (error) {
      console.error('Error checking for new news:', error);
    }
  }

  // Поиск действительно новых новостей по дате публикации
  findTrulyNewNews(currentNews, previousNews) {
    const newNews = [];
    
    // Находим максимальную дату из предыдущих новостей
    let maxPreviousDate = '';
    previousNews.forEach(news => {
      if (news.date > maxPreviousDate) {
        maxPreviousDate = news.date;
      }
    });

    // Ищем новости с датой позже максимальной из предыдущих
    for (const news of currentNews) {
      if (news.date > maxPreviousDate) {
        newNews.push(news);
      }
    }

    return newNews;
  }

  // Обновление кэша новостей
  async updateNewsCache(currentNews) {
    try {
      // Сохраняем только 5 последних новостей
      const latestNews = currentNews.slice(0, 5);
      await setWithExpiry('news_latest', latestNews, 24 * 60 * 60 * 1000);
      await setWithExpiry('news_last_check', Date.now(), 24 * 60 * 60 * 1000);
    } catch (error) {
      console.error('Error updating news cache:', error);
    }
  }

  async showNewsNotification(newNews) {
    try {
      if (!this.isConfigured) {
        const granted = await this.requestPermissions();
        if (!granted) return;
      }

      const newsToNotify = newNews.slice(0, 3);
      const channelId = Platform.OS === 'android' ? 'news' : undefined;
      
      for (const news of newsToNotify) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📰 Новая новость',
            body: this.formatNewsContent(news.content),
            data: { 
              type: 'new_news', 
              newsId: this.createNewsId(news),
              newsDate: news.date
            },
            sound: true,
            ...(channelId && { channelId }),
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error('Error showing news notification:', error);
    }
  }

  formatNewsContent(content) {
    if (content.length > 100) {
      return content.substring(0, 100) + '...';
    }
    return content;
  }

  createNewsId(newsItem) {
    // Используем дату публикации для создания уникального ID
    return newsItem.date;
  }

  /**
   * Проверяет изменения в расписании относительно предыдущего сохранённого снимка.
   * При обнаружении изменений отправляет push-уведомление.
   * @param {object} newScheduleData — обработанные данные расписания
   * @param {string} scheduleKey — уникальный ключ (имя группы / преподавателя / аудитории)
   */
  async checkScheduleChanges(newScheduleData, scheduleKey, options = {}) {
    try {
      if (!newScheduleData || !scheduleKey) return;

      const settings = await this.getNotificationSettings();
      const scheduleChangesEnabled = settings.scheduleChanges !== false;
      if (!settings.enabled || !settings.schedule || !scheduleChangesEnabled) return;

      // Для кэша и устаревшего кэша не проверяем изменения, чтобы не спамить уведомлениями.
      if (options.source === 'cache' || options.source === 'stale_cache') return;

      // Формируем компактный снимок занятий
      const days = newScheduleData.days || (newScheduleData.lessons ? [{ weekday: 0, lessons: newScheduleData.lessons }] : []);
      if (days.length === 0) return;

      const normalizedDays = days
        .map(d => ({
          weekday: d.weekday,
          lessons: (d.lessons || [])
            .map(l => l ? {
              time: String(l.time ?? ''),
              subject: l.subject || '',
              teacher: l.teacher || '',
              auditory: l.auditory || '',
            } : null)
            .filter(Boolean)
            .sort((a, b) => Number(a.time) - Number(b.time)),
        }))
        .filter(d => d.weekday != null)
        .sort((a, b) => a.weekday - b.weekday);

      const newSnapshot = JSON.stringify(normalizedDays);

      const snapshotKey = `schedule_snapshot_${scheduleKey}`;
      const prevSnapshot = await AsyncStorage.getItem(snapshotKey);

      // Всегда сохраняем актуальный снимок
      await AsyncStorage.setItem(snapshotKey, newSnapshot);

      if (!prevSnapshot) return; // первая загрузка — не с чем сравнивать
      if (prevSnapshot === newSnapshot) return; // изменений нет

      const prevDays = JSON.parse(prevSnapshot);
      const newDays = JSON.parse(newSnapshot);
      const changes = this.detectScheduleChanges(prevDays, newDays);

      if (changes.length > 0) {
        await this.sendScheduleChangeNotification(changes);
      }
    } catch (error) {
      console.error('Error checking schedule changes:', error);
    }
  }

  detectScheduleChanges(prevDays, newDays) {
    const changes = [];
    const buildDayMap = (days) => {
      const map = new Map();
      for (const day of days || []) {
        if (!day || day.weekday == null) continue;
        const lessonsMap = new Map();
        for (const lesson of (day.lessons || [])) {
          if (!lesson || lesson.time == null) continue;
          lessonsMap.set(String(lesson.time), lesson);
        }
        map.set(day.weekday, lessonsMap);
      }
      return map;
    };

    const prevByDay = buildDayMap(prevDays);
    const nextByDay = buildDayMap(newDays);

    // Сравниваем только общие дни, чтобы переключение между днями не считалось изменением расписания.
    const commonWeekdays = [...nextByDay.keys()].filter(weekday => prevByDay.has(weekday));
    if (commonWeekdays.length === 0) return changes;

    for (const weekday of commonWeekdays) {
      const prevLessons = prevByDay.get(weekday);
      const nextLessons = nextByDay.get(weekday);

      for (const [time, nextLesson] of nextLessons.entries()) {
        const prevLesson = prevLessons.get(time);
        if (!prevLesson) {
          changes.push({ type: 'added', lesson: nextLesson, weekday });
          continue;
        }

        if (
          (prevLesson.subject || '') !== (nextLesson.subject || '') ||
          (prevLesson.teacher || '') !== (nextLesson.teacher || '') ||
          (prevLesson.auditory || '') !== (nextLesson.auditory || '')
        ) {
          changes.push({ type: 'changed', lesson: nextLesson, prev: prevLesson, weekday });
        }
      }

      for (const [time, prevLesson] of prevLessons.entries()) {
        if (!nextLessons.has(time)) {
          changes.push({ type: 'removed', lesson: prevLesson, weekday });
        }
      }
    }

    return changes;
  }

  async sendScheduleChangeNotification(changes) {
    try {
      if (!this.isConfigured) {
        const granted = await this.requestPermissions();
        if (!granted) return;
      }
      const channelId = Platform.OS === 'android' ? 'schedule' : undefined;
      const wdays = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
      const change = changes[0];
      let body = '';
      if (change.type === 'changed') {
        const parts = [];
        if (change.prev.auditory !== change.lesson.auditory)
          parts.push(`ауд. ${change.lesson.auditory || 'не указана'}`);
        if (change.prev.teacher !== change.lesson.teacher)
          parts.push(`преп. ${change.lesson.teacher || 'не указан'}`);
        if (change.prev.subject !== change.lesson.subject)
          parts.push(`предмет изменён`);
        body = `Пара ${change.lesson.time} (${wdays[change.weekday] || ''}): ${change.lesson.subject}. Изм.: ${parts.join(', ')}.`;
      } else if (change.type === 'added') {
        body = `Добавлена пара ${change.lesson.time} (${wdays[change.weekday] || ''}): ${change.lesson.subject}.`;
      } else if (change.type === 'removed') {
        body = `Отменена пара ${change.lesson.time} (${wdays[change.weekday] || ''}): ${change.lesson.subject}.`;
      }
      if (!body) return;
      const suffix = changes.length > 1 ? ` (+${changes.length - 1} др.)` : '';
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📋 Изменение в расписании',
          body: body + suffix,
          data: { type: 'schedule_change' },
          sound: true,
          ...(channelId && { channelId }),
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending schedule change notification:', error);
    }
  }

  async initialize() {
    try {
      await this.requestPermissions();
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;