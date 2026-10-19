import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, Platform, AppState, Appearance, StyleSheet, StatusBar, PanResponder, Animated, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';

// Импорт компонентов
import SplashScreen from './components/SplashScreen';
import TabButton from './components/TabButton';
import NativeTabBar from './components/NativeTabBar';
import IOSEdgeSwipeBack from './components/IOSEdgeSwipeBack';
import HeaderToolbar from './components/HeaderToolbar';
import InAppNotificationBanner from './components/InAppNotificationBanner';
import OnboardingScreen from './components/OnboardingScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isOnboardingCompleted } from './utils/onboarding';
import NewsScreen from './components/NewsScreen';
import ScheduleScreen from './components/ScheduleScreen';
import SettingsScreen from './components/SettingsScreen';
import MapScreen from './components/MapScreen';
import FreshmanScreen from './components/FreshmanScreen';
import MatrixRain from './components/MatrixRain';
import AchievementToast from './components/AchievementToast';

// Импорт утилит
import { ACCENT_COLORS, SCREENS, LIQUID_GLASS, SPLASH_DURATION_MS, SPLASH_DURATION_BEFORE_MS, isNewYearPeriod, getNewYearText, getHolidayInfo } from './utils/constants';
import * as Sentry from '@sentry/react-native';
import notificationService from './utils/notificationService';
import backgroundService from './utils/backgroundService';
import { hasUnlockedAllAchievements } from './utils/achievements';

Sentry.init({
  dsn: 'https://9954c52fe80999a51a6905e3ee180d11@sentry.sculkmetrics.com/5',
  sendDefaultPii: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
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
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 0,
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
    backgroundColor: 'transparent',
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
    left: 0,
    top: 6,
    borderRadius: 24,
    overflow: 'hidden',
    zIndex: 1,
  },
  tabIndicatorGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  tabIndicatorContent: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
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
const NATIVE_TABS = TAB_ORDER.map((key, index) => ({
  key,
  label: key,
  sfSymbol: ['calendar', 'map', 'book', 'newspaper', 'gearshape'][index],
}));

export default Sentry.wrap(function App() {
  let [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [initializationReady, setInitializationReady] = useState(false);
  const [showSplashOverlay, setShowSplashOverlay] = useState(true);
  const splashTransition = useRef(new Animated.Value(1)).current;
  const splashStartedAt = useRef(Date.now());
  const [onboardingRequired, setOnboardingRequired] = useState(null);
  const [activeScreen, setActiveScreen] = useState(SCREENS.SCHEDULE);
  const [theme, setTheme] = useState('auto');
  const [accentColor, setAccentColor] = useState('green');
  const [systemTheme, setSystemTheme] = useState(Appearance.getColorScheme() || 'light');
  const [refresh, setRefresh] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [legendUnlocked, setLegendUnlocked] = useState(false);
  const [legendSplashEnabled, setLegendSplashEnabled] = useState(false);
  const [splashConfettiEnabled, setSplashConfettiEnabled] = useState(true);
  const [communityFeatureEnabled, setCommunityFeatureEnabled] = useState(false);
  const [liquidGlassEnabled, setLiquidGlassEnabled] = useState(true);
  const insets = useSafeAreaInsets();

  // Refs для дочерних экранов (для управления из хедера)
  const mapScreenRef = useRef(null);
  const freshmanScreenRef = useRef(null);
  const settingsScreenRef = useRef(null);

  // Состояния для контекстных кнопок в хедере
  const [mapFilterCount, setMapFilterCount] = useState(0);
  const [, refreshMapFilterControl] = useState(0);
  const handleMapFilterControlChange = useCallback(() => refreshMapFilterControl(value => value + 1), []);
  const scheduleExportHandler = useRef(null);
  const [scheduleExportAvailable, setScheduleExportAvailable] = useState(false);
  const [scheduleExporting, setScheduleExporting] = useState(false);
  const scheduleFavoritesHandler = useRef(null);
  const [scheduleFavoritesAvailable, setScheduleFavoritesAvailable] = useState(false);
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
  const [, setTabLayoutRevision] = useState(0);

  // Сохраняем позицию вкладки при её layout
  const handleTabLayout = useCallback((index, event) => {
    const { x, width, height } = event.nativeEvent.layout;
    const previous = tabLayouts.current[index];
    tabLayouts.current[index] = { x, width, height };
    if (!previous || previous.x !== x || previous.width !== width || previous.height !== height) {
      setTabLayoutRevision((revision) => revision + 1);
    }
    if (index === TAB_ORDER.indexOf(activeScreen) && !isDragging.current) {
      indicatorAnim.setValue(x);
    }
  }, [activeScreen, indicatorAnim]);

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
    onStartShouldSetPanResponder: () => false,
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

  const handledNotificationResponse = useRef(null);
  const navigateFromNotification = useCallback((route) => {
    const screen = route?.screen === 'news' ? SCREENS.NEWS
      : route?.screen === 'schedule' ? SCREENS.SCHEDULE : null;
    if (!screen) return;
    setActiveScreen(screen);
    setRefreshKey(value => value + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    const handleResponse = (response) => {
      if (!mounted || !response) return;
      const id = `${response.notification?.request?.identifier}:${response.actionIdentifier}`;
      if (handledNotificationResponse.current === id) return;
      handledNotificationResponse.current = id;
      navigateFromNotification(notificationService.getNotificationRoute(response));
      Notifications.clearLastNotificationResponseAsync().catch(error => {
        console.warn('Unable to clear handled notification response:', error);
      });
    };
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    Notifications.getLastNotificationResponseAsync().then(handleResponse).catch(error => {
      console.warn('Unable to restore notification response:', error);
    });
    initializeApp();
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      notificationService.initialize().then(() => backgroundService.registerBackgroundNewsCheck()).catch(error => {
        console.warn('Unable to synchronize notification permissions:', error);
      });
    });
    return () => {
      mounted = false;
      appStateSubscription.remove();
      responseSubscription.remove();
    };
  }, [navigateFromNotification]);

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
      setOnboardingRequired(!await isOnboardingCompleted(AsyncStorage));
      // Инициализируем сервис уведомлений
      await notificationService.initialize();

      // Загружаем сохраненные настройки (В ЭТОМ ПОРЯДКЕ!)
      await loadSettings(); // тема и цвет
      await loadTabbarSettings(); // настройки таббара
      await loadNewYearSettings(); // новогодние настройки

      // Регистрируем фоновую задачу
      await registerBackgroundTask();

    } catch (error) {
      console.error('Error initializing app:', error);
      Sentry.captureException(error);
    } finally {
      setInitializationReady(true);
    }
  };

  const registerBackgroundTask = async () => {
    try {
      await backgroundService.registerBackgroundNewsCheck();
    } catch (error) {
      console.error('Error registering background task:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const savedTheme = await SecureStore.getItemAsync('theme');
      const savedAccentColor = await SecureStore.getItemAsync('accentColor');
      const savedCommunityFeature = await SecureStore.getItemAsync('feature_community_enabled');
      const savedLiquidGlass = await SecureStore.getItemAsync('feature_liquid_glass_enabled');
      const savedLegendSplash = await SecureStore.getItemAsync('legend_splash_enabled');
      const savedSplashConfetti = await SecureStore.getItemAsync('splash_confetti_enabled');
      const allUnlocked = await hasUnlockedAllAchievements().catch(() => false);

      setCommunityFeatureEnabled(savedCommunityFeature === 'true');
      setLiquidGlassEnabled(savedLiquidGlass !== 'false');
      setLegendUnlocked(allUnlocked);
      setLegendSplashEnabled(savedLegendSplash === 'true' && allUnlocked);
      setSplashConfettiEnabled(savedSplashConfetti !== 'false');
      
      if (savedTheme === 'legend' && !allUnlocked) {
        setTheme('dark');
        await SecureStore.setItemAsync('theme', 'dark');
      } else if (savedTheme) {
        setTheme(savedTheme);
      }
      if (savedAccentColor === 'legend' && !allUnlocked) {
        setAccentColor('green');
        await SecureStore.setItemAsync('accentColor', 'green');
      } else if (savedAccentColor) {
        setAccentColor(savedAccentColor);
      }
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
  
  useEffect(() => {
    if (!initializationReady || !fontsLoaded || onboardingRequired === null) return undefined;
    const startedAt = Date.now();
    const remaining = Math.max(0, SPLASH_DURATION_MS - (startedAt - splashStartedAt.current));
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), remaining);
    console.info(`Splash duration: ${SPLASH_DURATION_BEFORE_MS}ms -> ${SPLASH_DURATION_MS}ms`);
    return () => clearTimeout(timer);
  }, [fontsLoaded, initializationReady, onboardingRequired]);

  const shouldShowSplash = !fontsLoaded || isLoading || onboardingRequired === null;
  const holiday = getHolidayInfo();
  const holidayInfo = holiday && (holiday.type !== 'new-year' || splashNewYearMode) ? holiday : null;

  useEffect(() => {
    if (shouldShowSplash) {
      setShowSplashOverlay(true);
      splashTransition.setValue(1);
      return undefined;
    }
    const fadeOut = Animated.timing(splashTransition, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
      isInteraction: false,
    });
    fadeOut.start(({ finished }) => {
      if (finished) setShowSplashOverlay(false);
    });
    return () => fadeOut.stop();
  }, [shouldShowSplash, splashTransition]);

  if (shouldShowSplash) {
    return <SplashScreen
      accentColor={accentColor}
      theme={getEffectiveTheme()}
      holidayInfo={holidayInfo}
      legendUnlocked={legendSplashEnabled}
      confettiEnabled={splashConfettiEnabled}
      durationMs={SPLASH_DURATION_MS}
    />;
  }

  if (onboardingRequired) {
    return (
      <View style={{ flex: 1 }}>
        <OnboardingScreen visible theme={effectiveTheme} accentColor={accentColor} onComplete={() => setOnboardingRequired(false)} />
        {showSplashOverlay && (
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: splashTransition }]} pointerEvents="none">
            <SplashScreen accentColor={accentColor} theme={effectiveTheme} holidayInfo={holidayInfo} legendUnlocked={legendSplashEnabled} confettiEnabled={splashConfettiEnabled} durationMs={SPLASH_DURATION_MS} />
          </Animated.View>
        )}
      </View>
    );
  }

  const glass = LIQUID_GLASS[effectiveTheme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const textColor = glass.text;
  const colors = ACCENT_COLORS[accentColor];
  let supportsSystemGlass = false;
  if (liquidGlassEnabled && Platform.OS === 'ios') {
    try {
      supportsSystemGlass = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
    } catch (error) {
      console.warn('Liquid Glass API unavailable; using BlurView fallback.', error);
    }
  }
  const systemGlassColorScheme = effectiveTheme === 'light' ? 'light' : 'dark';
  
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

  const isSubscreenOpen = (activeScreen === SCREENS.MAP && mapSubScreen) ||
    (activeScreen === SCREENS.FRESHMAN && freshmanSubScreen) ||
    (activeScreen === SCREENS.SETTINGS && settingsSubScreen);

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

    // iOS — системный Liquid Glass при поддержке, BlurView как fallback.
    if (Platform.OS === 'ios') {
      return (
        <HeaderToolbar
          title={headerTitle}
          icon={headerIcon}
          onBack={showBackButton ? handleBackPress : undefined}
          accent={colors.primary}
          textColor={textColor}
          glass={glass}
          supportsGlass={supportsSystemGlass}
          colorScheme={systemGlassColorScheme}
          top={insets.top + 6}
          status={showCacheIcon ? {
            label: currentCacheStatus === 'offline' ? 'Нет сети. Сведения о сохранённых данных' : 'Показаны сохранённые данные',
            icon: currentCacheStatus === 'offline' ? 'cloud-offline-outline' : 'cloud-done-outline',
            warning: currentCacheStatus === 'offline',
            onPress: handleCacheIconPress,
          } : null}
          actions={[
            showFilterButton && { primary: true, render: () => mapScreenRef.current?.renderFilterButton(), label: 'Фильтры карты' },
            activeScreen === SCREENS.SCHEDULE && scheduleFavoritesAvailable && { primary: true, icon: 'star-outline', label: 'Избранное расписание', onPress: () => scheduleFavoritesHandler.current?.() },
            activeScreen === SCREENS.SCHEDULE && scheduleExportAvailable && { direct: true, icon: 'share-outline', label: scheduleExporting ? 'Экспорт выполняется…' : 'Поделиться расписанием', disabled: scheduleExporting, onPress: () => scheduleExportHandler.current?.() },
          ]}
        />
      );
    }

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
              size={22}
              color={colors.primary}
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
        {activeScreen === SCREENS.SCHEDULE && scheduleFavoritesAvailable && (
          <TouchableOpacity
            onPress={() => scheduleFavoritesHandler.current?.()}
            activeOpacity={0.7}
            style={{
              marginLeft: 8,
              padding: 6,
              borderRadius: 10,
              backgroundColor: colors.glass,
            }}
          >
            <Icon name="star-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
        {activeScreen === SCREENS.SCHEDULE && scheduleExportAvailable && (
          <TouchableOpacity
            onPress={() => scheduleExportHandler.current?.()}
            disabled={scheduleExporting}
            activeOpacity={0.7}
            style={{
              marginLeft: 8,
              padding: 6,
              borderRadius: 10,
              backgroundColor: colors.glass,
            }}
          >
            {scheduleExporting ? (
              <ActivityIndicator size={16} color={colors.primary} />
            ) : (
              <Icon name="share-outline" size={18} color={colors.primary} />
            )}
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

    // Нейтральная капсула под содержимым вкладки; акцент принадлежит иконке.
    const indicator = indicatorWidth > 0 ? (
      <Animated.View
        style={[
          styles.tabIndicator,
          {
            width: indicatorWidth,
            height: activeLayout.height,
            top: Platform.OS === 'ios' ? 6 : 0,
            transform: [{ translateX: indicatorAnim }],
          },
        ]}
        pointerEvents="none"
      >
        {supportsSystemGlass && (
          <GlassView
            colorScheme={systemGlassColorScheme}
            glassEffectStyle="regular"
            isInteractive
            style={styles.tabIndicatorGlass}
          />
        )}
        <View style={[styles.tabIndicatorContent, {
          backgroundColor: effectiveTheme === 'light' ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.14)',
          borderColor: effectiveTheme === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.22)',
        }]} />
      </Animated.View>
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
        glassAvailable={supportsSystemGlass}
        activeColor={colors.primary}
        onLayout={(e) => handleTabLayout(index, e)}
      />
    ));

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

  const renderScreen = (screen) => (
      <View style={{ flex: 1 }}>
        {screen === SCREENS.SCHEDULE && (
          <ScheduleScreen 
            theme={effectiveTheme} 
            accentColor={accentColor} 
            key={`schedule-${refreshKey}`}
            isNewYearMode={isNewYearMode}
            onCacheStatusChange={(status, date) => {
              setScheduleCacheStatus(status);
              if (date) setCacheDate(date);
            }}
            onExportReady={(handler, isExporting) => {
              scheduleExportHandler.current = handler;
              setScheduleExportAvailable(!!handler);
              setScheduleExporting(isExporting);
            }}
            onFavoritesReady={(handler) => {
              scheduleFavoritesHandler.current = handler;
              setScheduleFavoritesAvailable(!!handler);
            }}
          />
        )}
        {screen === SCREENS.MAP && (
          <MapScreen 
            ref={mapScreenRef}
            theme={effectiveTheme} 
            accentColor={accentColor} 
            key={`map-${refreshKey}`}
            isNewYearMode={isNewYearMode}
            onFilterCountChange={setMapFilterCount}
            onFilterControlChange={handleMapFilterControlChange}
            onNavigationChange={setMapSubScreen}
          />
        )}
        {screen === SCREENS.FRESHMAN && (
          <FreshmanScreen 
            ref={freshmanScreenRef}
            theme={effectiveTheme} 
            accentColor={accentColor} 
            key={`freshman-${refreshKey}`}
            isNewYearMode={isNewYearMode}
            communityFeatureEnabled={communityFeatureEnabled}
            onNavigationChange={setFreshmanSubScreen}
          />
        )}
        {screen === SCREENS.NEWS && (
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
        {screen === SCREENS.SETTINGS && (
          <SettingsScreen 
            ref={settingsScreenRef}
            theme={effectiveTheme} 
            accentColor={accentColor} 
            legendUnlocked={legendUnlocked}
            setTheme={setTheme} 
            setAccentColor={setAccentColor} 
            key={`settings-${refreshKey}`}
            onTabbarSettingsChange={handleTabbarSettingsChange}
            legendSplashEnabled={legendSplashEnabled}
            onLegendSplashChange={async value => {
              setLegendSplashEnabled(value);
              await SecureStore.setItemAsync('legend_splash_enabled', value.toString());
            }}
            splashConfettiEnabled={splashConfettiEnabled}
            onSplashConfettiChange={async value => {
              setSplashConfettiEnabled(value);
              await SecureStore.setItemAsync('splash_confetti_enabled', value.toString());
            }}
            isNewYearMode={isNewYearMode}
            onNewYearModeChange={handleNewYearModeChange}
            onCommunityFeatureChange={setCommunityFeatureEnabled}
            onLiquidGlassFeatureChange={setLiquidGlassEnabled}
            onNavigationChange={setSettingsSubScreen}
          />
        )}
      </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: effectiveTheme === 'matrix' ? glass.backgroundSolid : bgColor }}>
      {effectiveTheme === 'matrix' && <MatrixRain intensity={0.85} />}
      <StatusBar
        barStyle={effectiveTheme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={Platform.OS === 'android' ? glass.headerGlass : 'transparent'}
        translucent={Platform.OS === 'ios'}
      />
      {Platform.OS !== 'ios' && renderHeader()}
      {Platform.OS === 'ios' ? (
        <IOSEdgeSwipeBack
          enabled={Boolean(isSubscreenOpen)}
          onBack={() => {
            if (activeScreen === SCREENS.MAP) mapScreenRef.current?.goBack();
            else if (activeScreen === SCREENS.FRESHMAN) freshmanScreenRef.current?.goBack();
            else if (activeScreen === SCREENS.SETTINGS) settingsScreenRef.current?.goBack();
          }}
        >
          <NativeTabBar
          activeScreen={activeScreen}
          onTabPress={handleTabPress}
          tabs={NATIVE_TABS}
          renderScreen={renderScreen}
          theme={effectiveTheme}
          accentColor={colors.primary}
          backgroundColor={bgColor}
          showLabels={showTabbarLabels}
          labelFontSize={{ small: 8, medium: 10, large: 12 }[tabbarFontSize]}
          />
        </IOSEdgeSwipeBack>
      ) : renderScreen(activeScreen)}
      {Platform.OS === 'ios' && renderHeader()}
      {Platform.OS !== 'ios' && renderTabBar()}
      <AchievementToast theme={effectiveTheme} accentColor={accentColor} />
      <InAppNotificationBanner theme={effectiveTheme} onNavigate={navigateFromNotification} />
      {showSplashOverlay && (
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: splashTransition }]} pointerEvents="none">
          <SplashScreen accentColor={accentColor} theme={effectiveTheme} holidayInfo={holidayInfo} legendUnlocked={legendSplashEnabled} confettiEnabled={splashConfettiEnabled} durationMs={SPLASH_DURATION_MS} />
        </Animated.View>
      )}
    </View>
  );
});