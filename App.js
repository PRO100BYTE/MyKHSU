import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, Platform, Appearance, StyleSheet, StatusBar, PanResponder, Animated, TouchableOpacity, Alert } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

// Импорт компонентов
import SplashScreen from './components/SplashScreen';
import TabButton from './components/TabButton';
import NewsScreen from './components/NewsScreen';
import ScheduleScreen from './components/ScheduleScreen';
import SettingsScreen from './components/SettingsScreen';
import MapScreen from './components/MapScreen';
import FreshmanScreen from './components/FreshmanScreen';
import MatrixRain from './components/MatrixRain';

// Импорт утилит
import { ACCENT_COLORS, SCREENS, LIQUID_GLASS, isNewYearPeriod, getNewYearText, getHolidayInfo } from './utils/constants';
import { getBlurConfig } from './utils/liquidGlass';
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
  // Плавающий glass header (iOS Liquid Glass)
  headerFloating: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerBlur: {
    overflow: 'hidden',
    marginHorizontal: 8,
    marginTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerIcon: {
    marginRight: 10,
  },
  headerText: {
    fontSize: 18, 
    fontWeight: '700', 
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.2,
  },
  // Android header (без blur, но glass-стиль)
  headerAndroid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: (StatusBar.currentHeight || 0) + 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // Контейнер для плавающего tab bar (iOS Liquid Glass)
  tabBarFloating: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  tabBarFloatingIOS: {
    marginHorizontal: 12,
    marginBottom: 28,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  tabBarInner: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    position: 'relative',
  },
  // Анимированный индикатор активной вкладки
  tabIndicator: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
  },
  // Fallback стиль для Android
  tabBarAndroid: {
    flexDirection: 'row', 
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 6,
    elevation: 8,
    position: 'relative',
  },
});

const TAB_ORDER = [SCREENS.SCHEDULE, SCREENS.MAP, SCREENS.FRESHMAN, SCREENS.NEWS, SCREENS.SETTINGS];

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
  const [refreshKey, setRefreshKey] = useState(0);
  const insets = useSafeAreaInsets();

  // Refs для дочерних экранов (для управления из хедера)
  const mapScreenRef = useRef(null);
  const freshmanScreenRef = useRef(null);
  const settingsScreenRef = useRef(null);

  // Состояния для контекстных кнопок в хедере
  const [mapFilterCount, setMapFilterCount] = useState(0);
  const [mapSubScreen, setMapSubScreen] = useState(null);
  const [freshmanSubScreen, setFreshmanSubScreen] = useState(null);
  const [settingsSubScreen, setSettingsSubScreen] = useState(null);

  // Статус кэша расписания для иконки в хедере
  const [scheduleCacheStatus, setScheduleCacheStatus] = useState(null); // null | 'cache' | 'stale_cache' | 'offline'
  const [newsCacheStatus, setNewsCacheStatus] = useState(null);
  const [cacheDate, setCacheDate] = useState(null); // дата последнего кэширования

  // Анимация индикатора активной вкладки (Liquid Glass iOS 26)
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef({});   // { index: { x, width } }
  const isDragging = useRef(false);
  const prevTabIndex = useRef(0);
  const [indicatorReady, setIndicatorReady] = useState(false);

  // Сохраняем позицию вкладки при её layout
  const handleTabLayout = useCallback((index, event) => {
    const { x, width } = event.nativeEvent.layout;
    tabLayouts.current[index] = { x, width };
    // Инициализируем позицию индикатора для начальной вкладки
    if (index === TAB_ORDER.indexOf(activeScreen) && !isDragging.current) {
      indicatorAnim.setValue(x);
      if (!indicatorReady) setIndicatorReady(true);
    }
  }, [activeScreen, indicatorReady]);

  // Анимация скольжения при переключении таба
  const animateIndicatorTo = useCallback((tabIndex) => {
    const layout = tabLayouts.current[tabIndex];
    if (layout) {
      Animated.spring(indicatorAnim, {
        toValue: layout.x,
        useNativeDriver: true,
        tension: 68,
        friction: 12,
      }).start();
    }
  }, [indicatorAnim]);

  // PanResponder для перетаскивания индикатора при зажатии активной вкладки
  const indicatorPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => {
      return Math.abs(gesture.dx) > 8 && Math.abs(gesture.dy) < 20;
    },
    onMoveShouldSetPanResponderCapture: (_, gesture) => {
      return Math.abs(gesture.dx) > 8 && Math.abs(gesture.dy) < 20;
    },
    onPanResponderGrant: () => {
      isDragging.current = true;
      indicatorAnim.stopAnimation();
    },
    onPanResponderMove: (_, gesture) => {
      const activeIndex = TAB_ORDER.indexOf(activeScreenRef.current);
      const startLayout = tabLayouts.current[activeIndex];
      if (startLayout) {
        const newX = startLayout.x + gesture.dx;
        // Ограничиваем в пределах таббара
        const firstTab = tabLayouts.current[0];
        const lastTab = tabLayouts.current[TAB_ORDER.length - 1];
        if (firstTab && lastTab) {
          const min = firstTab.x;
          const max = lastTab.x;
          indicatorAnim.setValue(Math.max(min, Math.min(max, newX)));
        }
      }
    },
    onPanResponderRelease: (_, gesture) => {
      isDragging.current = false;
      // Определяем ближайшую вкладку к текущей позиции индикатора
      const activeIndex = TAB_ORDER.indexOf(activeScreenRef.current);
      const startLayout = tabLayouts.current[activeIndex];
      if (!startLayout) return;
      
      const currentX = startLayout.x + gesture.dx;
      let closestIndex = 0;
      let closestDist = Infinity;
      
      for (let i = 0; i < TAB_ORDER.length; i++) {
        const layout = tabLayouts.current[i];
        if (layout) {
          const center = layout.x + layout.width / 2;
          const dist = Math.abs(currentX + (startLayout.width / 2) - center);
          if (dist < closestDist) {
            closestDist = dist;
            closestIndex = i;
          }
        }
      }
      
      // Переключить вкладку и анимировать к ней
      const newScreen = TAB_ORDER[closestIndex];
      if (newScreen !== activeScreenRef.current) {
        setActiveScreen(newScreen);
      }
      animateIndicatorTo(closestIndex);
    },
    onPanResponderTerminate: () => {
      isDragging.current = false;
      const activeIndex = TAB_ORDER.indexOf(activeScreenRef.current);
      animateIndicatorTo(activeIndex);
    },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => false,
  }), [indicatorAnim, animateIndicatorTo]);

  // Ref для отслеживания текущего экрана в PanResponder
  const activeScreenRef = useRef(activeScreen);

  useEffect(() => {
    const newIndex = TAB_ORDER.indexOf(activeScreen);
    const oldIndex = prevTabIndex.current;
    activeScreenRef.current = activeScreen;
    
    // Анимируем индикатор при переключении (если не перетаскиваем)
    if (!isDragging.current && newIndex !== oldIndex) {
      animateIndicatorTo(newIndex);
    }
    prevTabIndex.current = newIndex;
  }, [activeScreen, animateIndicatorTo]);

  // Состояния для настроек таббара
  const [showTabbarLabels, setShowTabbarLabels] = useState(true);
  const [tabbarFontSize, setTabbarFontSize] = useState('medium');
  
  // Состояние для новогоднего настроения
  const [isNewYearMode, setIsNewYearMode] = useState(false);
  const [splashNewYearMode, setSplashNewYearMode] = useState(false);

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

  // Функция для загрузки настроек таббара
  const loadTabbarSettings = async () => {
    try {
      const labelsEnabled = await SecureStore.getItemAsync('tabbar_labels_enabled');
      const fontSize = await SecureStore.getItemAsync('tabbar_font_size');
      
      if (labelsEnabled !== null) {
        setShowTabbarLabels(labelsEnabled === 'true');
      }
      
      if (fontSize) {
        setTabbarFontSize(fontSize);
      }
    } catch (error) {
      console.error('Error loading tabbar settings:', error);
    }
  };

const loadNewYearSettings = async () => {
  try {
    const savedSetting = await SecureStore.getItemAsync('new_year_mode');
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const isNewYearPeriod = (month === 12 && day >= 1) || (month === 1 && day <= 31);
    
    console.log('Loading new year settings:', { 
      savedSetting, 
      isNewYearPeriod,
      today: today.toISOString(),
      month,
      day
    });
    
    if (savedSetting !== null) {
      // Используем сохраненную настройку пользователя
      const userEnabled = savedSetting === 'true';
      // Включаем только если это новогодний период И пользователь включил
      const shouldEnable = userEnabled && isNewYearPeriod;
      setIsNewYearMode(shouldEnable);
      setSplashNewYearMode(shouldEnable);
    } else {
      // Если настройка не сохранена - включаем автоматически в новогодний период
      if (isNewYearPeriod) {
        setIsNewYearMode(true);
        setSplashNewYearMode(true);
        await SecureStore.setItemAsync('new_year_mode', 'true');
      } else {
        setIsNewYearMode(false);
        setSplashNewYearMode(false);
      }
    }
    
  } catch (error) {
    console.error('Error loading new year settings:', error);
    setIsNewYearMode(false);
    setSplashNewYearMode(false);
  }
};

// Функция для обновления настроек новогоднего режима
const handleNewYearModeChange = async (enabled) => {
  console.log('App: Changing new year mode to:', enabled);
  
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const isNewYearPeriod = (month === 12 && day >= 1) || (month === 1 && day <= 31);
  
  // Сохраняем настройку пользователя
  await SecureStore.setItemAsync('new_year_mode', enabled.toString());
  
  // Применяем настройку немедленно
  const shouldEnable = enabled && isNewYearPeriod;
  setIsNewYearMode(shouldEnable);
  setSplashNewYearMode(shouldEnable);
  
  console.log('New year mode updated immediately:', shouldEnable);
  
  // Принудительно обновляем все компоненты для немедленного применения
  setRefreshKey(prev => prev + 1);
};

  const initializeApp = async () => {
    try {
      // Запрашиваем разрешения на уведомления
      await setupNotifications();

      // Инициализируем сервис уведомлений
      await notificationService.initialize();

      // Загружаем сохраненные настройки (В ЭТОМ ПОРЯДКЕ!)
      await loadSettings(); // тема и цвет
      await loadTabbarSettings(); // настройки таббара
      await loadNewYearSettings(); // новогодние настройки

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

  // Функция для обновления настроек таббара
  const handleTabbarSettingsChange = (newSettings) => {
    setShowTabbarLabels(newSettings.showLabels);
    setTabbarFontSize(newSettings.fontSize);
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
    const holiday = getHolidayInfo();
    const holidayInfo = holiday && (holiday.type !== 'new-year' || splashNewYearMode) ? holiday : null;
    return <SplashScreen 
      accentColor={accentColor} 
      theme={getEffectiveTheme()} 
      holidayInfo={holidayInfo}
    />;
  }
  
  const glass = LIQUID_GLASS[effectiveTheme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const textColor = glass.text;
  const colors = ACCENT_COLORS[accentColor];
  const blurConfig = getBlurConfig(effectiveTheme);
  const tabBarBlurConfig = {
    intensity: glass.tabBarBlurIntensity || blurConfig.intensity,
    tint: glass.tabBarBlurTint || blurConfig.tint,
  };
  
  const handleTabPress = (screen) => {
    if (activeScreen === screen) {
      // Перезагрузка компонента при повторном нажатии
      setRefreshKey(prev => prev + 1);
    } else {
      setActiveScreen(screen);
    }
  };

  const newYearText = isNewYearMode ? getNewYearText() : '';

  // Иконка для текущего экрана в хедере
  const SCREEN_ICONS = {
    [SCREENS.SCHEDULE]: 'calendar-outline',
    [SCREENS.MAP]: 'map-outline',
    [SCREENS.FRESHMAN]: 'book-outline',
    [SCREENS.NEWS]: 'newspaper-outline',
    [SCREENS.SETTINGS]: 'settings-outline',
  };

  // Рендер header с glass-эффектом (плавающая капсула)
  const renderHeader = () => {
    // Определяем, нужна ли кнопка назад
    const showBackButton = (activeScreen === SCREENS.MAP && mapSubScreen) ||
                           (activeScreen === SCREENS.FRESHMAN && freshmanSubScreen) ||
                           (activeScreen === SCREENS.SETTINGS && settingsSubScreen);
    
    // Определяем заголовок
    let headerTitle = activeScreen;
    if (activeScreen === SCREENS.MAP && mapSubScreen) {
      headerTitle = mapSubScreen;
    } else if (activeScreen === SCREENS.FRESHMAN && freshmanSubScreen) {
      headerTitle = freshmanSubScreen;
    } else if (activeScreen === SCREENS.SETTINGS && settingsSubScreen) {
      headerTitle = settingsSubScreen;
    }

    // Определяем иконку
    const headerIcon = showBackButton ? null : (SCREEN_ICONS[activeScreen] || 'apps-outline');

    // Показываем кнопку фильтров для экрана карты (основной вид)
    const showFilterButton = activeScreen === SCREENS.MAP && !mapSubScreen;

    // Показываем иконку кэша для экранов расписания и новостей
    const currentCacheStatus = activeScreen === SCREENS.SCHEDULE ? scheduleCacheStatus 
      : activeScreen === SCREENS.NEWS ? newsCacheStatus 
      : null;
    const showCacheIcon = !!currentCacheStatus;

    const handleCacheIconPress = () => {
      const screenName = activeScreen === SCREENS.SCHEDULE ? 'Расписание' : 'Новости';
      const isOffline = currentCacheStatus === 'offline';
      const isStale = currentCacheStatus === 'stale_cache';
      
      let message = isOffline 
        ? 'Нет подключения к интернету. Показаны ранее сохранённые данные.'
        : isStale 
          ? 'Данные загружены из локального хранилища. Потяните вниз для обновления.'
          : 'Показаны кэшированные данные. Потяните вниз для обновления.';
      
      if (cacheDate) {
        try {
          const date = new Date(cacheDate);
          const formatted = date.toLocaleDateString('ru-RU', { 
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit' 
          });
          message += `\n\nПоследнее обновление: ${formatted}`;
        } catch (e) {}
      }
      
      Alert.alert(
        isOffline ? 'Оффлайн-режим' : `Кэш • ${screenName}`,
        message,
        [{ text: 'Понятно' }]
      );
    };

    const handleBackPress = () => {
      if (activeScreen === SCREENS.MAP) {
        mapScreenRef.current?.goBack();
      } else if (activeScreen === SCREENS.FRESHMAN) {
        freshmanScreenRef.current?.goBack();
      } else if (activeScreen === SCREENS.SETTINGS) {
        settingsScreenRef.current?.goBack();
      }
    };

    const handleFilterPress = () => {
      mapScreenRef.current?.openFilters();
    };

    // iOS — плавающая glass-капсула с blur
    if (Platform.OS === 'ios') {
      return (
        <View style={styles.headerFloating} pointerEvents="box-none">
          <BlurView
            intensity={tabBarBlurConfig.intensity}
            tint={tabBarBlurConfig.tint}
            style={[
              styles.headerBlur,
              {
                borderColor: glass.borderStrong,
                shadowColor: glass.shadowColor,
              },
            ]}
          >
            <View style={styles.headerInner}>
              {showBackButton ? (
                <TouchableOpacity onPress={handleBackPress} style={{ marginRight: 10 }}>
                  <Icon name="arrow-back" size={20} color={colors.primary} />
                </TouchableOpacity>
              ) : (
                <Icon name={headerIcon} size={20} color={colors.primary} style={styles.headerIcon} />
              )}
              <Text style={[styles.headerText, { color: textColor, flex: 1 }]}>
                {headerTitle}
              </Text>
              {showFilterButton && (
                <TouchableOpacity 
                  onPress={handleFilterPress}
                  style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}
                >
                  <Icon name="filter-outline" size={20} color={colors.primary} />
                  {mapFilterCount > 0 && (
                    <View style={{ 
                      backgroundColor: colors.primary, 
                      borderRadius: 8, 
                      minWidth: 16, 
                      height: 16, 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      marginLeft: 4,
                    }}>
                      <Text style={{ color: '#ffffff', fontSize: 10, fontFamily: 'Montserrat_600SemiBold' }}>
                        {mapFilterCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              {showCacheIcon && (
                <TouchableOpacity 
                  onPress={handleCacheIconPress}
                  activeOpacity={0.7}
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    marginLeft: 8,
                    backgroundColor: currentCacheStatus === 'offline' ? '#f59e0b18' : colors.glass,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 10,
                  }}
                >
                  <Icon 
                    name={currentCacheStatus === 'offline' ? 'cloud-offline-outline' : 'cloud-done-outline'} 
                    size={16} 
                    color={currentCacheStatus === 'offline' ? '#f59e0b' : colors.primary} 
                  />
                  <Text style={{ 
                    fontSize: 11, 
                    color: currentCacheStatus === 'offline' ? '#f59e0b' : colors.primary,
                    fontFamily: 'Montserrat_500Medium',
                    marginLeft: 4,
                  }}>
                    {currentCacheStatus === 'offline' ? 'Оффлайн' : 'Кэш'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </BlurView>
        </View>
      );
    }

    // Android — glass фон без blur
    return (
      <View style={[
        styles.headerAndroid,
        {
          backgroundColor: glass.headerGlass,
          borderBottomColor: glass.border,
        }
      ]}>
        {showBackButton ? (
          <TouchableOpacity onPress={handleBackPress} style={{ marginRight: 10 }}>
            <Icon name="arrow-back" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <Icon name={headerIcon} size={20} color={colors.primary} style={styles.headerIcon} />
        )}
        <Text style={[styles.headerText, { color: textColor, flex: 1 }]}>
          {headerTitle}
        </Text>
        {showFilterButton && (
          <TouchableOpacity 
            onPress={handleFilterPress}
            style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}
          >
            <Icon name="filter-outline" size={20} color={colors.primary} />
            {mapFilterCount > 0 && (
              <View style={{ 
                backgroundColor: colors.primary, 
                borderRadius: 8, 
                minWidth: 16, 
                height: 16, 
                justifyContent: 'center', 
                alignItems: 'center',
                marginLeft: 4,
              }}>
                <Text style={{ color: '#ffffff', fontSize: 10, fontFamily: 'Montserrat_600SemiBold' }}>
                  {mapFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {showCacheIcon && (
          <TouchableOpacity 
            onPress={handleCacheIconPress}
            activeOpacity={0.7}
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginLeft: 8,
              backgroundColor: currentCacheStatus === 'offline' ? '#f59e0b18' : colors.glass,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 10,
            }}
          >
            <Icon 
              name={currentCacheStatus === 'offline' ? 'cloud-offline-outline' : 'cloud-done-outline'} 
              size={16} 
              color={currentCacheStatus === 'offline' ? '#f59e0b' : colors.primary} 
            />
            <Text style={{ 
              fontSize: 11, 
              color: currentCacheStatus === 'offline' ? '#f59e0b' : colors.primary,
              fontFamily: 'Montserrat_500Medium',
              marginLeft: 4,
            }}>
              {currentCacheStatus === 'offline' ? 'Оффлайн' : 'Кэш'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Рендер tab bar с glass-эффектом и анимированным индикатором
  const TAB_ICONS = ['calendar-outline', 'map-outline', 'book-outline', 'newspaper-outline', 'settings-outline'];

  const renderTabBar = () => {
    const activeIndex = TAB_ORDER.indexOf(activeScreen);
    const activeLayout = tabLayouts.current[activeIndex];
    const indicatorWidth = activeLayout ? activeLayout.width : 0;

    // Анимированный индикатор (glass pill) — перетаскиваемый
    const indicator = indicatorWidth > 0 ? (
      <Animated.View
        style={[
          styles.tabIndicator,
          {
            width: indicatorWidth,
            backgroundColor: colors.glass,
            borderColor: colors.glassBorder,
            transform: [{ translateX: indicatorAnim }],
          },
        ]}
        {...indicatorPanResponder.panHandlers}
      />
    ) : null;

    const tabButtons = TAB_ORDER.map((screen, index) => (
      <TabButton
        key={screen}
        icon={TAB_ICONS[index]}
        label={screen}
        isActive={activeScreen === screen}
        onPress={() => handleTabPress(screen)}
        theme={effectiveTheme}
        accentColor={accentColor}
        showLabels={showTabbarLabels}
        fontSize={tabbarFontSize}
        onLayout={(e) => handleTabLayout(index, e)}
      />
    ));

    // iOS — плавающий glass tab bar
    if (Platform.OS === 'ios') {
      return (
        <View style={styles.tabBarFloating}>
          <BlurView
            intensity={tabBarBlurConfig.intensity}
            tint={tabBarBlurConfig.tint}
            style={[
              styles.tabBarFloatingIOS,
              {
                borderColor: glass.borderStrong,
                shadowColor: glass.shadowStrong,
              },
            ]}
          >
            <View style={styles.tabBarInner}>
              {indicator}
              {tabButtons}
            </View>
          </BlurView>
        </View>
      );
    }

    // Android
    return (
      <View 
        style={[
          styles.tabBarAndroid, 
          { 
            backgroundColor: glass.tabBarGlass,
            borderTopColor: glass.border,
            paddingBottom: insets.bottom + 8,
          }
        ]}
      >
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {indicator}
          {tabButtons}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: effectiveTheme === 'matrix' ? glass.backgroundSolid : bgColor }}>
      {effectiveTheme === 'matrix' && <MatrixRain intensity={0.85} />}
      {/* Статусбар */}
      <StatusBar 
        barStyle={effectiveTheme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={Platform.OS === 'android' ? glass.headerGlass : 'transparent'}
        translucent={Platform.OS === 'ios'}
      />
      
      {/* Заголовок с Glass-эффектом (плавающий поверх контента на iOS) */}
      {renderHeader()}
      
      {/* Контент — содержимое проходит за header и tab bar для Liquid Glass-эффекта */}
      <View style={{ flex: 1, paddingTop: Platform.OS === 'ios' ? 104 : 0 }}>
        {activeScreen === SCREENS.SCHEDULE && (
          <ScheduleScreen 
            theme={effectiveTheme} 
            accentColor={accentColor} 
            key={`schedule-${refreshKey}`}
            isNewYearMode={isNewYearMode}
            onCacheStatusChange={(status, date) => {
              setScheduleCacheStatus(status);
              if (date) setCacheDate(date);
            }}
          />
        )}
        {activeScreen === SCREENS.MAP && (
          <MapScreen 
            ref={mapScreenRef}
            theme={effectiveTheme} 
            accentColor={accentColor} 
            key={`map-${refreshKey}`}
            isNewYearMode={isNewYearMode}
            onFilterCountChange={setMapFilterCount}
            onNavigationChange={setMapSubScreen}
          />
        )}
        {activeScreen === SCREENS.FRESHMAN && (
          <FreshmanScreen 
            ref={freshmanScreenRef}
            theme={effectiveTheme} 
            accentColor={accentColor} 
            key={`freshman-${refreshKey}`}
            isNewYearMode={isNewYearMode}
            onNavigationChange={setFreshmanSubScreen}
          />
        )}
        {activeScreen === SCREENS.NEWS && (
          <NewsScreen 
            theme={effectiveTheme} 
            accentColor={accentColor} 
            key={`news-${refreshKey}`}
            isNewYearMode={isNewYearMode}
            onCacheStatusChange={(status, date) => {
              setNewsCacheStatus(status);
              if (date) setCacheDate(date);
            }}
          />
        )}
        {activeScreen === SCREENS.SETTINGS && (
          <SettingsScreen 
            ref={settingsScreenRef}
            theme={effectiveTheme} 
            accentColor={accentColor} 
            setTheme={setTheme} 
            setAccentColor={setAccentColor} 
            key={`settings-${refreshKey}`}
            onTabbarSettingsChange={handleTabbarSettingsChange}
            isNewYearMode={isNewYearMode}
            onNewYearModeChange={handleNewYearModeChange}
            onNavigationChange={setSettingsSubScreen}
          />
        )}
      </View>
      
      {/* Навигация — Liquid Glass tab bar */}
      {renderTabBar()}
    </View>
  );
});