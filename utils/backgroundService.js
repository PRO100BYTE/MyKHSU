import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import ApiService from './api';
import notificationService from './notificationService';

const BACKGROUND_NEWS_CHECK = 'BACKGROUND_NEWS_CHECK';
let registrationQueue = Promise.resolve();
let nativeConfigurationUnavailable = false;

const checkForNewsNotifications = async () => {
  try {
    const settings = await notificationService.getNotificationSettings();
    if (!settings.enabled || !settings.news) return 0;
    const result = await ApiService.getNews(0, 5, true);
    if (['cache', 'stale_cache'].includes(result?.source) || !Array.isArray(result?.data)) return 0;
    return await notificationService.checkForNewNews(result.data);
  } catch (error) {
    console.error('Error checking for news notifications:', error);
    return 0;
  }
};

if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(BACKGROUND_NEWS_CHECK)) {
  TaskManager.defineTask(BACKGROUND_NEWS_CHECK, async () => {
    try {
      const delivered = await checkForNewsNotifications();
      return delivered > 0 ? BackgroundFetch.Result.NewData : BackgroundFetch.Result.NoData;
    } catch (error) {
      console.error('Background news check failed:', error);
      return BackgroundFetch.Result.Failed;
    }
  });
}

// OS-controlled best-effort fetch, not server push or a guaranteed 15-minute timer.
export const registerBackgroundNewsCheck = () => {
  registrationQueue = registrationQueue.then(async () => {
    if (Platform.OS === 'web') return;
    try {
      const settings = await notificationService.getNotificationSettings();
      const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NEWS_CHECK);
      if (!settings.enabled || !settings.news || !await notificationService.hasPermission()) {
        if (registered) await BackgroundFetch.unregisterTaskAsync(BACKGROUND_NEWS_CHECK);
        return;
      }
      if (registered || nativeConfigurationUnavailable) return;
      const status = await BackgroundFetch.getStatusAsync();
      if (status !== BackgroundFetch.BackgroundFetchStatus.Available) return;
      await BackgroundFetch.registerTaskAsync(BACKGROUND_NEWS_CHECK, {
        minimumInterval: 15 * 60, stopOnTerminate: false, startOnBoot: true,
      });
    } catch (error) {
      const message = String(error?.message || error);
      if (Platform.OS === 'ios' && /BackgroundFetchDisabled|Background Fetch has not been configured|UIBackgroundModes/i.test(message)) {
        nativeConfigurationUnavailable = true;
        console.warn('Фоновые проверки недоступны в установленной iOS-сборке. Нужна пересборка с expo-background-fetch и UIBackgroundModes: fetch. Проверка новостей при открытом приложении продолжает работать.');
      } else {
        console.log('Background fetch registration skipped:', message);
      }
    }
  }).catch(error => console.error('Background task synchronization failed:', error));
  return registrationQueue;
};

notificationService.subscribe(event => {
  if (event.type === 'settingsChanged') registerBackgroundNewsCheck();
});

export default { registerBackgroundNewsCheck, checkForNewsNotifications };
