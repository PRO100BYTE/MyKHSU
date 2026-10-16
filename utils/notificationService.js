import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWithExpiry, setWithExpiry } from './cache';
import { getDateByWeekAndDay } from './dateUtils';
import {
  NOTIFICATION_OWNER, normalizeNotificationSettings, notificationRoute,
  createLessonNotificationPlan, dedupeNotificationPlan, newsIdentity, findNewNews,
  isOwnedLessonRequest, localDateKey, shouldDeferLessonReplacement,
} from './notificationHelpers';

const SETTINGS_KEY = 'notification_settings';
const SCHEDULE_NOTIFICATION_IDS_KEY = 'schedule_notification_ids';
const NEWS_BASELINE_KEY = 'notification_news_baseline_v2';
const SCHEDULE_CHANGES_HISTORY_KEY = 'schedule_changes_history_v1';
const SCHEDULE_CHANGES_HISTORY_DAYS = 7;
const SCHEDULE_CHANGES_HISTORY_LIMIT = 200;

class NotificationService {
  constructor() {
    this.isConfigured = false;
    this.listeners = new Set();
    this.foregroundListeners = new Set();
    this.queue = Promise.resolve();
    this.recentDeliveries = new Map();
    this.lastSchedule = null;
    this.receivedSubscription = null;
  }

  // Serialize read/modify/write operations shared by foreground and background callers.
  enqueue(operation) {
    const result = this.queue.then(operation);
    this.queue = result.catch(error => console.error('Notification operation failed:', error));
    return result;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeForeground(listener) {
    this.foregroundListeners.add(listener);
    return () => this.foregroundListeners.delete(listener);
  }

  emit(event) {
    const listeners = event.type === 'notification' ? this.foregroundListeners : this.listeners;
    for (const listener of listeners) {
      try { listener(event); } catch (error) { console.error('Notification subscriber failed:', error); }
    }
  }

  getDefaultSettings() {
    return normalizeNotificationSettings(null);
  }

  async getNotificationSettings() {
    try {
      const saved = await SecureStore.getItemAsync(SETTINGS_KEY);
      return normalizeNotificationSettings(saved ? JSON.parse(saved) : null);
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return this.getDefaultSettings();
    }
  }

  async saveNotificationSettings(patch) {
    return this.enqueue(async () => {
      const settings = normalizeNotificationSettings({ ...await this.getNotificationSettings(), ...patch });
      await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(settings));
      this.emit({ type: 'settingsChanged', settings });
      await this.replaceLessonNotifications(this.lastSchedule?.data, this.lastSchedule?.pairsTime, settings);
      return settings;
    });
  }

  async ensureChannels() {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync('schedule', {
      name: 'Расписание', description: 'Уведомления о парах',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250], lightColor: '#10B981',
    });
    await Notifications.setNotificationChannelAsync('news', {
      name: 'Новости', importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  async hasPermission() {
    if (Platform.OS === 'web') return false;
    try {
      const result = await Notifications.getPermissionsAsync();
      this.isConfigured = result.granted === true || (Platform.OS === 'ios' &&
        result.ios?.status != null && result.ios.status === Notifications.IosAuthorizationStatus?.PROVISIONAL);
      return this.isConfigured;
    } catch (error) {
      console.error('Error reading notification permission:', error);
      this.isConfigured = false;
      return false;
    }
  }

  // Call only from an explicit user action (settings switch/button), never startup/fetch.
  async requestPermissions() {
    try {
      if (Platform.OS === 'web') return false;
      await this.ensureChannels();
      if (await this.hasPermission()) return true;
      const current = await Notifications.getPermissionsAsync();
      if (current.canAskAgain === false) return false;
      await Notifications.requestPermissionsAsync();
      return await this.hasPermission();
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async initialize() {
    try {
      if (Platform.OS === 'web') return;
      await this.ensureChannels();
      await this.hasPermission();
      Notifications.setNotificationHandler({
        handleNotification: async notification => {
          const owned = notification?.request?.content?.data?.owner === NOTIFICATION_OWNER;
          const showSystem = !(owned && AppState.currentState === 'active' && this.foregroundListeners.size > 0);
          return { shouldShowAlert: showSystem, shouldShowBanner: showSystem, shouldShowList: showSystem,
            shouldPlaySound: showSystem, shouldSetBadge: false };
        },
      });
      if (!this.receivedSubscription) {
        this.receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
          const content = notification?.request?.content;
          if (content?.data?.owner !== NOTIFICATION_OWNER) return;
          if (AppState.currentState === 'active') this.emit({ type: 'notification',
            notification: { id: notification.request.identifier, ...content }, route: notificationRoute(content.data) });
        });
      }
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  getNotificationRoute(response) {
    return notificationRoute(response?.notification?.request?.content?.data || response?.request?.content?.data || response);
  }

  async scheduleLessonNotifications(scheduleData, pairsTime) {
    if (scheduleData && Array.isArray(pairsTime)) this.lastSchedule = { data: scheduleData, pairsTime };
    try {
      return await this.enqueue(async () => this.replaceLessonNotifications(scheduleData, pairsTime, await this.getNotificationSettings()));
    } catch (error) {
      console.error('Error scheduling lesson notifications:', error);
      return 0;
    }
  }

  async replaceLessonNotifications(scheduleData, pairsTime, settings) {
    if (Platform.OS === 'web') return 0;
    let plan = [];
    const canSchedule = settings.enabled && settings.schedule && await this.hasPermission();
    if (canSchedule && scheduleData && Array.isArray(pairsTime)) {
      const now = new Date();
      const addLessons = (lessons, date) => {
        for (const lesson of Array.isArray(lessons) ? lessons : []) {
          if (!lesson) continue;
          const pairTime = pairsTime.find(pair => pair && String(pair.time) === String(lesson.time));
          plan.push(...this.createLessonNotificationsForDate(lesson, pairTime, settings, date, now));
        }
      };
      if (Array.isArray(scheduleData.days)) {
        for (const day of scheduleData.days) {
          if (!day || !Number.isFinite(Number(scheduleData.week_number)) || Number(scheduleData.week_number) < 1 ||
              !Number.isInteger(Number(day.weekday)) || Number(day.weekday) < 1 || Number(day.weekday) > 7) continue;
          addLessons(day.lessons, getDateByWeekAndDay(Number(scheduleData.week_number), Number(day.weekday)));
        }
      } else if (Array.isArray(scheduleData.lessons) && scheduleData.currentDate) {
        // Never guess today for a schedule without a known date.
        addLessons(scheduleData.lessons, scheduleData.currentDate);
      }
      plan = dedupeNotificationPlan(plan);
    }
    await this.ensureChannels();
    let legacyIds = [];
    try {
      const raw = await AsyncStorage.getItem(SCHEDULE_NOTIFICATION_IDS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) legacyIds = parsed;
    } catch (error) { console.error('Error reading scheduled notification IDs:', error); }
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const owned = pending.filter(request => isOwnedLessonRequest(request, legacyIds));
    if (shouldDeferLessonReplacement(settings, scheduleData, pairsTime)) {
      const flags = { lesson_reminder: 'beforeLesson', lesson_start: 'lessonStart',
        lesson_end_reminder: 'beforeLessonEnd', lesson_end: 'lessonEnd' };
      for (const request of owned) {
        const flag = flags[request.content?.data?.type];
        if (flag && !settings[flag]) await Notifications.cancelScheduledNotificationAsync(request.identifier);
      }
      return 0;
    }
    // iOS has a small OS-wide pending-request budget. Leave space for homework/events.
    plan = plan.slice(0, Math.max(0, 60 - (pending.length - owned.length)));
    for (const request of owned) await Notifications.cancelScheduledNotificationAsync(request.identifier);
    const ids = [];
    for (const item of plan) {
      try {
        if (item.trigger.date <= new Date()) continue;
        ids.push(await Notifications.scheduleNotificationAsync(item));
      } catch (error) { console.error('Error scheduling lesson notification:', error); }
    }
    await AsyncStorage.setItem(SCHEDULE_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
    return ids.length;
  }

  createLessonNotificationsForDate(lesson, pairTime, settings, date, now) {
    return createLessonNotificationPlan(lesson, pairTime, settings, date, now,
      Platform.OS === 'android' ? 'schedule' : undefined);
  }

  async deliver(content, channelId, dedupeKey) {
    const now = Date.now();
    for (const [key, timestamp] of this.recentDeliveries) {
      if (now - timestamp > 60000) this.recentDeliveries.delete(key);
    }
    if (this.recentDeliveries.has(dedupeKey)) return false;
    this.recentDeliveries.set(dedupeKey, now);
    const notification = { id: dedupeKey, ...content,
      data: { ...content.data, owner: NOTIFICATION_OWNER } };
    if (AppState.currentState === 'active' && this.foregroundListeners.size > 0) {
      this.emit({ type: 'notification', notification, route: notificationRoute(notification.data) });
      return true;
    }
    if (!await this.hasPermission()) return false;
    await this.ensureChannels();
    await Notifications.scheduleNotificationAsync({ content: { ...notification, sound: true },
      trigger: Platform.OS === 'android' ? { channelId } : null });
    return true;
  }

  async checkForNewNews(currentNews) {
    try {
      return await this.enqueue(async () => {
        if (!Array.isArray(currentNews) || !currentNews.length) return 0;
        const settings = await this.getNotificationSettings();
        // A persistent baseline avoids re-alerting old items after a cache TTL expires.
        const raw = await AsyncStorage.getItem(NEWS_BASELINE_KEY);
        let previous = raw ? JSON.parse(raw) : await getWithExpiry('news_latest');
        if (!Array.isArray(previous)) previous = [];
        const incoming = previous.length ? this.findTrulyNewNews(currentNews, previous) : [];
        const baseline = [...currentNews, ...previous].filter((item, index, all) => {
          const id = newsIdentity(item);
          return id && all.findIndex(other => newsIdentity(other) === id) === index;
        }).slice(0, 200);
        await AsyncStorage.setItem(NEWS_BASELINE_KEY, JSON.stringify(baseline));
        await this.updateNewsCache(currentNews);
        if (!settings.enabled || !settings.news) return 0;
        return await this.showNewsNotification(incoming);
      });
    } catch (error) {
      console.error('Error checking for new news:', error);
      return 0;
    }
  }

  findTrulyNewNews(current, previous) { return findNewNews(current, previous); }
  createNewsId(item) { return newsIdentity(item) || ''; }
  formatNewsContent(content) {
    const text = String(content || '').trim();
    return text.length > 100 ? `${text.slice(0, 100)}...` : text;
  }

  async updateNewsCache(currentNews) {
    try {
      await setWithExpiry('news_latest', currentNews.slice(0, 5), 86400000);
      await setWithExpiry('news_last_check', Date.now(), 86400000);
    } catch (error) { console.error('Error updating news cache:', error); }
  }

  async showNewsNotification(newNews) {
    let delivered = 0;
    try {
      const settings = await this.getNotificationSettings();
      if (!settings.enabled || !settings.news) return 0;
      for (const news of (Array.isArray(newNews) ? newNews : []).slice(0, 3)) {
        const newsId = this.createNewsId(news);
        if (await this.deliver({ title: '📰 Новая новость', body: this.formatNewsContent(news?.content),
          data: { type: 'new_news', screen: 'news', newsId, newsDate: news?.date || news?.hr_date || '' } },
        'news', `news:${newsId}`)) delivered++;
      }
    } catch (error) { console.error('Error showing news notification:', error); }
    return delivered;
  }

  async checkScheduleChanges(newScheduleData, scheduleKey, options = {}) {
    try {
      return await this.enqueue(async () => {
        if (!newScheduleData || !scheduleKey || ['cache', 'stale_cache'].includes(options.source)) return;
        const settings = await this.getNotificationSettings();
        const days = Array.isArray(newScheduleData.days) ? newScheduleData.days :
          (Array.isArray(newScheduleData.lessons) && newScheduleData.currentDate ?
            [{ weekday: new Date(newScheduleData.currentDate).getDay() || 7, lessons: newScheduleData.lessons }] : []);
        // Store each dated day independently: switching week/day must not look like an edit.
        for (const day of days) {
          if (!day || !Array.isArray(day.lessons)) continue;
          const date = newScheduleData.days ?
            (Number(newScheduleData.week_number) > 0 ? getDateByWeekAndDay(Number(newScheduleData.week_number), Number(day.weekday)) : null) :
            new Date(newScheduleData.currentDate);
          const dateKey = localDateKey(date);
          if (!dateKey) continue;
          const normalized = [{ weekday: day.weekday, lessons: day.lessons.filter(Boolean).map(lesson => ({
            time: String(lesson.time ?? ''), subject: lesson.subject || '', teacher: lesson.teacher || '', auditory: lesson.auditory || '',
          })).sort((a, b) => a.time.localeCompare(b.time) || JSON.stringify(a).localeCompare(JSON.stringify(b))) }];
          const key = `schedule_snapshot_v2_${scheduleKey}_${dateKey}`;
          const previous = await AsyncStorage.getItem(key);
          const snapshot = JSON.stringify(normalized);
          await AsyncStorage.setItem(key, snapshot);
          if (!previous || previous === snapshot) continue;
          const changes = this.detectScheduleChanges(JSON.parse(previous), normalized);
          if (!changes.length || !settings.enabled || !settings.schedule || !settings.scheduleChanges) continue;
          await this.appendScheduleChangeHistory(changes, scheduleKey);
          await this.sendScheduleChangeNotification(changes, { scheduleKey, date: dateKey });
        }
      });
    } catch (error) { console.error('Error checking schedule changes:', error); }
  }

  async appendScheduleChangeHistory(changes, scheduleKey) {
    try {
      const now = Date.now();
      const raw = await AsyncStorage.getItem(SCHEDULE_CHANGES_HISTORY_KEY);
      const current = raw ? JSON.parse(raw) : [];
      const entries = changes.map((change, index) => ({ id: `${now}_${index}`, timestamp: now, scheduleKey,
        type: change.type, weekday: change.weekday, lesson: change.lesson || null, prev: change.prev || null }));
      const merged = [...entries, ...(Array.isArray(current) ? current : [])]
        .filter(entry => Number(entry?.timestamp || 0) >= now - SCHEDULE_CHANGES_HISTORY_DAYS * 86400000)
        .slice(0, SCHEDULE_CHANGES_HISTORY_LIMIT);
      await AsyncStorage.setItem(SCHEDULE_CHANGES_HISTORY_KEY, JSON.stringify(merged));
    } catch (error) { console.error('Error appending schedule history:', error); }
  }

  async getScheduleChangesHistory(days = SCHEDULE_CHANGES_HISTORY_DAYS) {
    try {
      const raw = await AsyncStorage.getItem(SCHEDULE_CHANGES_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(entry => Number(entry?.timestamp || 0) >= Date.now() - Number(days || 7) * 86400000)
        .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    } catch { return []; }
  }

  detectScheduleChanges(prevDays, newDays) {
    const changes = [];
    const buildMap = days => new Map((Array.isArray(days) ? days : []).filter(day => day && day.weekday != null)
      .map(day => [day.weekday, new Map((Array.isArray(day.lessons) ? day.lessons : []).filter(lesson => lesson && lesson.time != null)
        .map(lesson => [String(lesson.time), lesson]))]));
    const previous = buildMap(prevDays);
    for (const [weekday, lessons] of buildMap(newDays)) {
      const oldLessons = previous.get(weekday);
      if (!oldLessons) continue;
      for (const [time, lesson] of lessons) {
        const prev = oldLessons.get(time);
        if (!prev) changes.push({ type: 'added', lesson, weekday });
        else if (['subject', 'teacher', 'auditory'].some(key => (prev[key] || '') !== (lesson[key] || ''))) {
          changes.push({ type: 'changed', lesson, prev, weekday });
        }
      }
      for (const [time, lesson] of oldLessons) {
        if (!lessons.has(time)) changes.push({ type: 'removed', lesson, weekday });
      }
    }
    return changes;
  }

  async sendScheduleChangeNotification(changes, context = {}) {
    try {
      if (!Array.isArray(changes) || !changes.length) return;
      const settings = await this.getNotificationSettings();
      if (!settings.enabled || !settings.schedule || !settings.scheduleChanges) return;
      const change = changes[0];
      const labels = { changed: 'Изменена', added: 'Добавлена', removed: 'Отменена' };
      const label = labels[change.type];
      if (!label) return;
      const body = `${label} пара ${change.lesson?.time || ''}: ${change.lesson?.subject || 'Пара'}` +
        (changes.length > 1 ? ` (+${changes.length - 1} др.)` : '');
      await this.deliver({ title: '📋 Изменение в расписании', body,
        data: { type: 'schedule_change', screen: 'schedule', ...context } }, 'schedule',
      `schedule:${JSON.stringify(context)}:${JSON.stringify(changes)}`);
    } catch (error) { console.error('Error sending schedule change notification:', error); }
  }
}

const notificationService = new NotificationService();
export default notificationService;
