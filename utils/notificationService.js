import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

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
      if (!scheduleData || !pairsTime) {
        return;
      }

      // Отменяем предыдущие уведомления
      await this.cancelScheduledNotifications('lesson');

      const today = new Date();
      const notifications = [];

      if (scheduleData.lessons && scheduleData.lessons.length > 0) {
        for (const lesson of scheduleData.lessons) {
          const pairTime = pairsTime.find(p => p.time === lesson.time.toString());
          if (!pairTime) continue;

          const lessonNotifications = this.createLessonNotifications(lesson, pairTime);
          notifications.push(...lessonNotifications);
        }
      }

      for (const notification of notifications) {
        await Notifications.scheduleNotificationAsync(notification);
      }

    } catch (error) {
      console.error('Error scheduling lesson notifications:', error);
    }
  }

  createLessonNotifications(lesson, pairTime) {
    const notifications = [];
    const lessonDate = new Date();
    
    const startTimeStr = pairTime.time_start || pairTime.start;
    const endTimeStr = pairTime.time_end || pairTime.end;
    
    if (!startTimeStr || !endTimeStr) return notifications;

    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    const [endHours, endMinutes] = endTimeStr.split(':').map(Number);
    
    const startTime = new Date(lessonDate);
    startTime.setHours(startHours, startMinutes, 0, 0);
    
    const endTime = new Date(lessonDate);
    endTime.setHours(endHours, endMinutes, 0, 0);

    // Уведомление за 5 минут до начала
    const beforeStartTime = new Date(startTime.getTime() - 5 * 60 * 1000);
    if (beforeStartTime > new Date()) {
      notifications.push({
        content: {
          title: 'Скоро пара',
          body: `Через 5 минут: ${lesson.subject} (${lesson.auditory})`,
          data: { type: 'lesson_reminder', lessonId: lesson.id },
          sound: true,
        },
        trigger: { date: beforeStartTime }
      });
    }

    // Уведомление в начале пары
    if (startTime > new Date()) {
      notifications.push({
        content: {
          title: 'Началась пара',
          body: `${lesson.subject} в ${lesson.auditory}`,
          data: { type: 'lesson_start', lessonId: lesson.id },
          sound: true,
        },
        trigger: { date: startTime }
      });
    }

    return notifications;
  }

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