import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
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
          trigger: { date: beforeStartTime }
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
        trigger: { date: startTime }
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
          trigger: { date: beforeEndTime }
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
        trigger: { date: endTime }
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