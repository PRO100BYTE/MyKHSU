import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

const NOTIFICATION_SETTINGS_KEY = 'notificationSettings';
const LAST_CHECKED_NEWS_ID_KEY = 'lastCheckedNewsId';

export const registerForPushNotificationsAsync = async () => {
  let token;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }
  token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('Push token:', token);
  return token;
};

// Отправка уведомления о новой новости
export const sendNewsNotification = async (title) => {
  const settings = await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEY);
  if (settings === 'all' || settings === 'newsOnly') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Новая новость!",
        body: title,
        data: { screen: 'news' },
      },
      trigger: null, // Отправить немедленно
    });
  }
};

// Планирование уведомлений о парах
export const scheduleLessonNotifications = async (lesson) => {
  const settings = await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEY);
  if (settings !== 'all') return;

  const now = new Date();
  const startTime = new Date(lesson.date);
  const endTime = new Date(lesson.date);
  
  // Здесь нужно правильно разобрать время из строки lesson.time
  // Например, если lesson.time = "9:00 - 10:30"
  const [startStr, endStr] = lesson.time.split(' - ');
  const [startHour, startMinute] = startStr.split(':').map(Number);
  const [endHour, endMinute] = endStr.split(':').map(Number);

  startTime.setHours(startHour, startMinute, 0);
  endTime.setHours(endHour, endMinute, 0);

  const fiveMinutesBeforeStart = new Date(startTime.getTime() - 5 * 60 * 1000);
  const fiveMinutesBeforeEnd = new Date(endTime.getTime() - 5 * 60 * 1000);

  const notifications = [
    {
      title: 'Скоро пара!',
      body: `Ваша пара "${lesson.subject}" начнется через 5 минут.`,
      trigger: fiveMinutesBeforeStart,
    },
    {
      title: 'Пара началась!',
      body: `Пара "${lesson.subject}" уже началась.`,
      trigger: startTime,
    },
    {
      title: 'Пара скоро закончится',
      body: `Пара "${lesson.subject}" закончится через 5 минут.`,
      trigger: fiveMinutesBeforeEnd,
    },
    {
      title: 'Пара закончилась',
      body: `Пара "${lesson.subject}" закончилась.`,
      trigger: endTime,
    },
  ];

  for (const notif of notifications) {
    if (notif.trigger > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notif.title,
          body: notif.body,
          data: { screen: 'schedule', lessonId: lesson.id },
        },
        trigger: {
          date: notif.trigger,
        },
      });
    }
  }
};

// Функция для очистки всех запланированных уведомлений
export const cancelAllScheduledNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};