import React, { useState, useEffect } from 'react';
import { View, Text, Platform, Appearance, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

// Импорт компонентов
import SplashScreen from './components/SplashScreen';
import TabButton from './components/TabButton';
import PlaceholderScreen from './components/PlaceholderScreen';
import NewsScreen from './components/NewsScreen';
import ScheduleScreen from './components/ScheduleScreen';
import SettingsScreen from './components/SettingsScreen';
import MapScreen from './components/MapScreen';
import NotificationSettingsModal from './components/NotificationSettingsModal';

// Импорт утилит
import { ACCENT_COLORS, SCREENS } from './utils/constants';
import * as Sentry from '@sentry/react-native';
import notificationService from './utils/notificationService';
import backgroundService from './utils/backgroundService';

Sentry.init({
  dsn: 'https://9954c52fe80999a51a6905e3ee180d11@sentry.sculkmetrics.com/5',
  sendDefaultPii: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
});

// Конфигурация уведомлений
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Фоновая задача для проверки новостей (только для Android)
const BACKGROUND_NEWS_CHECK = 'BACKGROUND_NEWS_CHECK';

TaskManager.defineTask(BACKGROUND_NEWS_CHECK, async () => {
  try {
    console.log('Background news check running...');
    await backgroundService.checkForNewsNotifications();
  } catch (error) {
    console.error('Background news check error:', error);
    Sentry.captureException(error);
  }
});

const styles = StyleSheet.create({
  header: {
    padding: 16, 
    paddingTop: Platform.OS === 'ios' ? 50 : 40, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerText: {
    fontSize: 24, 
    fontWeight: 'bold', 
    fontFamily: 'Montserrat_600SemiBold'
  },
  navigation: {
    flexDirection: 'row', 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    paddingHorizontal: 4,
    paddingVertical: 8,
    // Добавляем отступ для навигационных кнопок Android
    paddingBottom: Platform.OS === 'android' ? 10 : 8
  },
  // Новый стиль для безопасной области
  safeAreaBottom: {
    paddingBottom: Platform.OS === 'android' ? 20 : 0
  }
});

export default Sentry.wrap(function App() {
  let [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState(SCREENS.SCHEDULE);
  const [theme, setTheme] = useState('auto');
  const [accentColor, setAccentColor] = useState('green');
  const [systemTheme, setSystemTheme] = useState(Appearance.getColorScheme() || 'light');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    // Настройка обработчиков уведомлений
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    // Инициализация уведомлений
    initializeApp();

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Запрашиваем разрешения на уведомления
      await setupNotifications();

      // Инициализируем сервис уведомлений
      await notificationService.initialize();

      // Загружаем сохраненные настройки
      await loadSettings();

      // Регистрируем фоновую задачу (только для Android)
      if (Platform.OS === 'android') {
        await registerBackgroundTask();
      }

    } catch (error) {
      console.error('Error initializing app:', error);
      Sentry.captureException(error);
    } finally {
      // Показываем splash screen на 2 секунды
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    }
  };

  const setupNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return;
      }

      // Настраиваем канал для Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const registerBackgroundTask = async () => {
    try {
      await Notifications.registerTaskAsync(BACKGROUND_NEWS_CHECK);
    } catch (error) {
      console.error('Error registering background task:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const savedTheme = await SecureStore.getItemAsync('theme');
      const savedAccentColor = await SecureStore.getItemAsync('accentColor');
      
      if (savedTheme) setTheme(savedTheme);
      if (savedAccentColor) setAccentColor(savedAccentColor);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Слушатель изменений системной темы
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme || 'light');
      
      // Принудительно обновляем компонент при изменении системной темы
      // если выбрана автоматическая тема
      if (theme === 'auto') {
        setRefresh(prev => prev + 1);
      }
    });

    return () => subscription.remove();
  }, [theme]);

  const getEffectiveTheme = () => {
    if (theme === 'auto') return systemTheme;
    return theme;
  };

  const effectiveTheme = getEffectiveTheme();
  
  // Рендерим SplashScreen пока шрифты не загружены или приложение загружается
  if (!fontsLoaded || isLoading) {
    return <SplashScreen accentColor={accentColor} theme={getEffectiveTheme()} />;
  }
  
  const bgColor = effectiveTheme === 'light' ? '#f3f4f6' : '#111827';
  const headerBg = effectiveTheme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = effectiveTheme === 'light' ? '#111827' : '#ffffff';
  const colors = ACCENT_COLORS[accentColor];
  
  return (
    <View style={[{ flex: 1, backgroundColor: bgColor }, styles.safeAreaBottom]}>
      {/* Заголовок */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <Text style={[styles.headerText, { color: textColor }]}>
          {activeScreen}
        </Text>
      </View>
      
      {/* Контент */}
      <View style={{ flex: 1 }}>
        {activeScreen === SCREENS.SCHEDULE && (
          <ScheduleScreen theme={effectiveTheme} accentColor={accentColor} key={`schedule-${refresh}`} />
        )}
        {activeScreen === SCREENS.MAP && (
          <MapScreen theme={effectiveTheme} accentColor={accentColor} key={`map-${refresh}`} />
        )}
        {activeScreen === SCREENS.FRESHMAN && (
          <PlaceholderScreen title={SCREENS.FRESHMAN} theme={effectiveTheme} key={`freshman-${refresh}`} />
        )}
        {activeScreen === SCREENS.NEWS && (
          <NewsScreen theme={effectiveTheme} accentColor={accentColor} key={`news-${refresh}`} />
        )}
        {activeScreen === SCREENS.SETTINGS && (
          <SettingsScreen 
            theme={effectiveTheme} 
            accentColor={accentColor} 
            setTheme={setTheme} 
            setAccentColor={setAccentColor} 
            key={`settings-${refresh}`}
          />
        )}
      </View>
      
      {/* Навигация */}
      <View style={[styles.navigation, { backgroundColor: headerBg }]}>
        <TabButton 
          icon="calendar-outline" 
          label={SCREENS.SCHEDULE} 
          isActive={activeScreen === SCREENS.SCHEDULE} 
          onPress={() => setActiveScreen(SCREENS.SCHEDULE)}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="map-outline" 
          label={SCREENS.MAP} 
          isActive={activeScreen === SCREENS.MAP} 
          onPress={() => setActiveScreen(SCREENS.MAP)}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="book-outline" 
          label={SCREENS.FRESHMAN} 
          isActive={activeScreen === SCREENS.FRESHMAN} 
          onPress={() => setActiveScreen(SCREENS.FRESHMAN)}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="newspaper-outline" 
          label={SCREENS.NEWS} 
          isActive={activeScreen === SCREENS.NEWS} 
          onPress={() => setActiveScreen(SCREENS.NEWS)}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="settings-outline" 
          label={SCREENS.SETTINGS} 
          isActive={activeScreen === SCREENS.SETTINGS} 
          onPress={() => setActiveScreen(SCREENS.SETTINGS)}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
      </View>
    </View>
  );
});