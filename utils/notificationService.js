import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getWithExpiry, setWithExpiry } from './cache';
import ApiService from './api';

// Конфигурация уведомлений
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Ключ для хранения настроек в SecureStore
const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

class NotificationService {
  constructor() {
    this.isConfigured = false;
  }

  // Настройки по умолчанию
  getDefaultSettings() {
    return {
      enabled: false,
      news: false,
      schedule: false,
      beforeLesson: true,
      lessonStart: true,
      beforeLessonEnd: false,
      lessonEnd: false
    };
  }

  // Получение настроек уведомлений из SecureStore
  async getNotificationSettings() {
    try {
      const savedSettings = await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEY);
      
      if (savedSettings) {
        return JSON.parse(savedSettings);
      } else {
        // Если настроек нет, сохраняем настройки по умолчанию
        const defaultSettings = this.getDefaultSettings();
        await SecureStore.setItemAsync(NOTIFICATION_SETTINGS_KEY, JSON.stringify(defaultSettings));
        return defaultSettings;
      }
    } catch (error) {
      console.error('Error getting notification settings from SecureStore:', error);
      return this.getDefaultSettings();
    }
  }

  // Сохранение настроек уведомлений в SecureStore
  async saveNotificationSettings(settings) {
    try {
      await SecureStore.setItemAsync(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving notification settings to SecureStore:', error);
      return false;
    }
  }

  // Запрос разрешений на уведомления
  async requestPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
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
        console.log('Notification permissions not granted');
        return false;
      }
    } else {
      console.log('Must use physical device for notifications');
      return false;
    }
    
    this.isConfigured = true;
    return true;
  }

  // Проверка новых новостей и отправка уведомлений
  async checkForNewsNotifications() {
    try {
      // Проверяем настройки уведомлений из SecureStore
      const notificationSettings = await this.getNotificationSettings();
      
      if (!notificationSettings.enabled || !notificationSettings.news) {
        return false;
      }

      // Получаем информацию о новых новостях
      const newNewsInfo = await ApiService.getNewNewsInfo();
      
      if (newNewsInfo && newNewsInfo.count > 0) {
        // Проверяем, не показывали ли мы уже уведомление для этой новости
        const lastNotifiedDate = await getWithExpiry('last_news_notification_date');
        const latestNewsDate = newNewsInfo.latestNews.date;
        
        if (!lastNotifiedDate || lastNotifiedDate !== latestNewsDate) {
          // Отправляем уведомление
          await this.sendNewsNotification(newNewsInfo.count, newNewsInfo.latestNews);
          
          // Сохраняем дату последнего уведомления
          await setWithExpiry('last_news_notification_date', latestNewsDate, 24 * 60 * 60 * 1000);
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for news notifications:', error);
      return false;
    }
  }

  // Отправка уведомления о новых новостях
  async sendNewsNotification(count, latestNews) {
    try {
      const notificationContent = {
        title: count === 1 ? 'Новая новость' : `Новые новости: ${count}`,
        body: latestNews.content.length > 100 
          ? latestNews.content.substring(0, 100) + '...' 
          : latestNews.content,
        data: { 
          newsDate: latestNews.date, 
          type: 'new_news',
          url: 'mykhsu://news'
        },
        sound: true,
        badge: count,
      };

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Отправляем немедленно
      });

      console.log('News notification scheduled');
    } catch (error) {
      console.error('Error sending news notification:', error);
    }
  }

  // Планирование уведомлений о расписании
  async scheduleLessonNotifications(scheduleData, pairsTime) {
    try {
      // Проверяем настройки уведомлений из SecureStore
      const notificationSettings = await this.getNotificationSettings();
      
      if (!notificationSettings.enabled || !notificationSettings.schedule) {
        return;
      }

      // Отменяем предыдущие уведомления о расписании
      await this.cancelScheduledNotifications('lesson');

      if (!scheduleData || !pairsTime) {
        return;
      }

      const today = new Date();
      const notifications = [];

      // Обрабатываем расписание на сегодня
      if (scheduleData.lessons && scheduleData.lessons.length > 0) {
        for (const lesson of scheduleData.lessons) {
          const pairTime = pairsTime.find(p => p.time === lesson.time);
          if (!pairTime) continue;

          const lessonNotifications = this.createLessonNotifications(lesson, pairTime, notificationSettings);
          notifications.push(...lessonNotifications);
        }
      }

      // Планируем все уведомления
      for (const notification of notifications) {
        await Notifications.scheduleNotificationAsync(notification);
      }

      console.log(`Scheduled ${notifications.length} lesson notifications`);
    } catch (error) {
      console.error('Error scheduling lesson notifications:', error);
    }
  }

  // Создание уведомлений для одной пары
  createLessonNotifications(lesson, pairTime, settings) {
    const notifications = [];
    const lessonDate = new Date();
    
    // Парсим время начала и конца пары
    const [startHours, startMinutes] = pairTime.time_start.split(':').map(Number);
    const [endHours, endMinutes] = pairTime.time_end.split(':').map(Number);
    
    const startTime = new Date(lessonDate);
    startTime.setHours(startHours, startMinutes, 0, 0);
    
    const endTime = new Date(lessonDate);
    endTime.setHours(endHours, endMinutes, 0, 0);

    // Уведомление за 5 минут до начала
    if (settings.beforeLesson) {
      const triggerTime = new Date(startTime.getTime() - 5 * 60 * 1000);
      if (triggerTime > new Date()) {
        notifications.push({
          content: {
            title: 'Скоро пара',
            body: `Через 5 минут: ${lesson.subject} (${lesson.auditory})`,
            data: { type: 'lesson_reminder', lessonId: lesson.id },
            sound: true,
          },
          trigger: {
            date: triggerTime,
            channelId: 'default'
          }
        });
      }
    }

    // Уведомление в начале пары
    if (settings.lessonStart && startTime > new Date()) {
      notifications.push({
        content: {
          title: 'Началась пара',
          body: `${lesson.subject} в ${lesson.auditory}`,
          data: { type: 'lesson_start', lessonId: lesson.id },
          sound: true,
        },
        trigger: {
          date: startTime,
          channelId: 'default'
        }
      });
    }

    // Уведомление за 5 минут до конца
    if (settings.beforeLessonEnd) {
      const triggerTime = new Date(endTime.getTime() - 5 * 60 * 1000);
      if (triggerTime > new Date()) {
        notifications.push({
          content: {
            title: 'Скоро конец пары',
            body: `Через 5 минут заканчивается: ${lesson.subject}`,
            data: { type: 'lesson_end_reminder', lessonId: lesson.id },
            sound: true,
          },
          trigger: {
            date: triggerTime,
            channelId: 'default'
          }
        });
      }
    }

    // Уведомление в конце пары
    if (settings.lessonEnd && endTime > new Date()) {
      notifications.push({
        content: {
          title: 'Пара окончена',
          body: `${lesson.subject} завершена`,
          data: { type: 'lesson_end', lessonId: lesson.id },
          sound: true,
        },
        trigger: {
          date: endTime,
          channelId: 'default'
        }
      });
    }

    return notifications;
  }

  // Отмена запланированных уведомлений
  async cancelScheduledNotifications(type = null) {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        if (!type || notification.content.data?.type?.includes(type)) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
    } catch (error) {
      console.error('Error canceling scheduled notifications:', error);
    }
  }

  // Инициализация сервиса уведомлений
  async initialize() {
    try {
      await this.requestPermissions();
      
      // Убедимся, что настройки существуют в SecureStore
      await this.getNotificationSettings();
      
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  // Очистка всех данных уведомлений
  async clearAllNotificationData() {
    try {
      // Отменяем все запланированные уведомления
      await this.cancelScheduledNotifications();
      
      // Очищаем настройки из SecureStore
      await SecureStore.deleteItemAsync(NOTIFICATION_SETTINGS_KEY);
      
      // Очищаем кэшированные данные уведомлений
      await setWithExpiry('last_news_notification_date', null);
      await setWithExpiry('new_news_detected', null);
      
      console.log('All notification data cleared');
    } catch (error) {
      console.error('Error clearing notification data:', error);
    }
  }
}

// Создаем и экспортируем экземпляр класса
const notificationService = new NotificationService();
export default notificationService;