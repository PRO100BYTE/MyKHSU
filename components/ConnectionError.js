import React from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';
import Snowfall from './Snowfall';

const ERROR_CONFIGS = {
  map: {
    'no-internet': {
      icon: 'map-outline',
      title: 'Карта недоступна',
      description: 'Для загрузки карты необходимо подключение к интернету',
      showRetryButton: true,
    },
    'load-error': {
      icon: 'warning-outline',
      title: 'Ошибка загрузки карты',
      description: 'Не удалось загрузить карту. Проверьте подключение и попробуйте снова',
      showRetryButton: true,
    },
    'api-unavailable': {
      icon: 'cloud-offline-outline',
      title: 'API карты недоступно',
      description: 'Сервис карты временно недоступен. Попробуйте снова сейчас или чуть позже.',
      showRetryButton: true,
    },
    'invalid-json': {
      icon: 'code-slash-outline',
      title: 'Карта временно недоступна',
      description: 'Сервис карты вернул данные в неожиданном формате. Попробуйте снова сейчас или чуть позже.',
      showRetryButton: true,
    },
    'json-parse-error': {
      icon: 'code-slash-outline',
      title: 'Карта временно недоступна',
      description: 'Не удалось обработать ответ сервиса карты. Попробуйте снова сейчас или чуть позже.',
      showRetryButton: true,
    },
    'android-not-supported': {
      icon: 'build-outline',
      title: 'Карта временно недоступна',
      description: 'В данный момент карта недоступна на платформе Android из-за отсутствия необходимых API ключей и ресурсов. Мы делаем все возможное, чтобы восстановить работоспособность карты на Android в кратчайшие сроки. Следите за обновлениями!',
      showRetryButton: false,
    },
  },
  schedule: {
    'no-internet': {
      icon: 'calendar-outline',
      title: 'Расписание недоступно',
      description: 'Для загрузки расписания необходимо подключение к интернету',
      showRetryButton: true,
    },
    'load-error': {
      icon: 'warning-outline',
      title: 'Ошибка загрузки расписания',
      description: 'Не удалось загрузить расписание. Проверьте подключение и попробуйте снова',
      showRetryButton: true,
    },
    'api-unavailable': {
      icon: 'cloud-offline-outline',
      title: 'API расписания недоступно',
      description: 'Сервис расписания временно недоступен. Попробуйте снова сейчас или чуть позже.',
      showRetryButton: true,
    },
    'invalid-json': {
      icon: 'code-slash-outline',
      title: 'Расписание временно недоступно',
      description: 'Сервис расписания вернул данные в неожиданном формате. Попробуйте снова сейчас или чуть позже.',
      showRetryButton: true,
    },
    'json-parse-error': {
      icon: 'code-slash-outline',
      title: 'Расписание временно недоступно',
      description: 'Не удалось обработать ответ сервиса расписания. Попробуйте снова сейчас или чуть позже.',
      showRetryButton: true,
    },
  },
  news: {
    'no-internet': {
      icon: 'newspaper-outline',
      title: 'Новости недоступны',
      description: 'Для загрузки новостей необходимо подключение к интернету',
      showRetryButton: true,
    },
    'load-error': {
      icon: 'warning-outline',
      title: 'Ошибка загрузки новостей',
      description: 'Не удалось загрузить новости. Проверьте подключение и попробуйте снова',
      showRetryButton: true,
    },
    'api-unavailable': {
      icon: 'cloud-offline-outline',
      title: 'API новостей недоступно',
      description: 'Сервис новостей временно недоступен. Попробуйте снова сейчас или чуть позже.',
      showRetryButton: true,
    },
    'invalid-json': {
      icon: 'code-slash-outline',
      title: 'Новости временно недоступны',
      description: 'Сервис новостей вернул данные в неожиданном формате. Попробуйте снова сейчас или чуть позже.',
      showRetryButton: true,
    },
    'json-parse-error': {
      icon: 'code-slash-outline',
      title: 'Новости временно недоступны',
      description: 'Не удалось обработать ответ сервиса новостей. Попробуйте снова сейчас или чуть позже.',
      showRetryButton: true,
    },
  },
  general: {
    'no-internet': {
      icon: 'cloud-offline-outline',
      title: 'Нет подключения к интернету',
      description: 'Для загрузки данных необходимо подключение к интернету',
      showRetryButton: true,
    },
    'load-error': {
      icon: 'warning-outline',
      title: 'Ошибка загрузки',
      description: 'Не удалось загрузить данные. Проверьте подключение и попробуйте снова',
      showRetryButton: true,
    },
    'api-unavailable': {
      icon: 'cloud-offline-outline',
      title: 'Сервис недоступен',
      description: 'Внешний API временно недоступен. Попробуйте снова сейчас или чуть позже.',
      showRetryButton: true,
    },
    'invalid-json': {
      icon: 'code-slash-outline',
      title: 'Данные временно недоступны',
      description: 'Сервис вернул данные в неожиданном формате. Попробуйте снова сейчас или чуть позже.',
      showRetryButton: true,
    },
    'json-parse-error': {
      icon: 'code-slash-outline',
      title: 'Данные временно недоступны',
      description: 'Не удалось обработать ответ сервиса. Попробуйте снова сейчас или чуть позже.',
      showRetryButton: true,
    },
    'android-not-supported': {
      icon: 'build-outline',
      title: 'Сервис временно недоступен',
      description: 'В данный момент сервис недоступен на платформе Android из-за отсутствия необходимых API ключей и ресурсов. Мы делаем все возможное, чтобы восстановить работоспособность в кратчайшие сроки. Следите за обновлениями!',
      showRetryButton: false,
    },
    default: {
      icon: 'refresh-outline',
      title: 'Ошибка',
      description: 'Произошла непредвиденная ошибка',
      showRetryButton: true,
    },
  },
};

const ERROR_TYPE_ALIASES = {
  NO_INTERNET: 'no-internet',
  LOAD_ERROR: 'load-error',
  API_UNAVAILABLE: 'api-unavailable',
  NO_API_KEY: 'api-unavailable',
  HTML_RESPONSE: 'api-unavailable',
  EMPTY_RESPONSE: 'api-unavailable',
  INVALID_JSON: 'invalid-json',
  INVALID_NEWS_FORMAT: 'api-unavailable',
  ANDROID_NOT_SUPPORTED: 'android-not-supported',
};

const SCREEN_ALIASES = {
  default: 'general',
};

const getNormalizedScreen = (screenName) => {
  if (!screenName) return 'general';
  const normalized = String(screenName).toLowerCase();
  return SCREEN_ALIASES[normalized] || normalized;
};

const getNormalizedErrorType = (value) => {
  if (!value) return 'load-error';
  const rawValue = String(value);

  if (/INVALID_JSON/i.test(rawValue)) return 'invalid-json';
  if (/JSON\s*Parse\s*error/i.test(rawValue) || /Unexpected\s*character/i.test(rawValue)) return 'json-parse-error';
  if (/API_UNAVAILABLE/i.test(rawValue)) return 'api-unavailable';

  if (ERROR_TYPE_ALIASES[rawValue]) return ERROR_TYPE_ALIASES[rawValue];

  const normalized = rawValue.toLowerCase().replace(/_/g, '-');
  return ERROR_TYPE_ALIASES[normalized] || normalized;
};

const getCacheButtonText = (screenName) => {
  const textByScreen = {
    schedule: 'Показать кэшированное расписание',
    news: 'Показать кэшированные новости',
    map: 'Показать кэшированные данные',
    general: 'Показать кэшированные данные',
  };

  return textByScreen[screenName] || textByScreen.general;
};

const getLoadingTitle = (screenName) => {
  const loadingTitles = {
    map: 'Загрузка карты...',
    schedule: 'Загрузка расписания...',
    news: 'Загрузка новостей...',
    general: 'Загрузка...',
  };

  return loadingTitles[screenName] || loadingTitles.general;
};

const ConnectionError = ({ 
  type, 
  errorType,
  screen,
  loading, 
  onRetry, 
  onViewCache, 
  theme, 
  accentColor, 
  contentType = 'general',
  icon,
  title,
  description,
  loadingTitle,
  retryButtonText,
  message,
  showCacheButton = false,
  cacheAvailable = false,
  customCacheButtonText,
  showFreshmanHint = false,
  isNewYearMode = false
}) => {
  const colors = ACCENT_COLORS[accentColor];
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const textColor = glass.text;
  const cardBg = glass.surfaceCard;
  const placeholderColor = glass.textSecondary;

  const normalizedScreen = getNormalizedScreen(screen || contentType);
  const normalizedErrorType = getNormalizedErrorType(errorType || type);

  const screenConfig = ERROR_CONFIGS[normalizedScreen] || ERROR_CONFIGS.general;
  const fallbackConfig = ERROR_CONFIGS.general[normalizedErrorType] || ERROR_CONFIGS.general.default;
  const baseConfig = screenConfig[normalizedErrorType] || screenConfig.default || fallbackConfig;

  const config = {
    ...baseConfig,
    icon: icon || baseConfig.icon,
    title: title || baseConfig.title,
    description: description || message || baseConfig.description,
    retryButtonText: retryButtonText || 'Попробовать снова',
  };

  // Проверяем, нужно ли показывать кнопку "Попробовать снова"
  const shouldShowRetryButton = config.showRetryButton !== false && onRetry;
  const shouldShowCacheButton = showCacheButton && cacheAvailable && onViewCache;
  const cacheButtonText = customCacheButtonText || getCacheButtonText(normalizedScreen);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        {isNewYearMode && <Snowfall theme={theme} intensity={0.5} />}
        <View style={[styles.content, { backgroundColor: cardBg }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.title, { color: textColor, marginTop: 16 }]}>
            {loadingTitle || getLoadingTitle(normalizedScreen)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {isNewYearMode && <Snowfall theme={theme} intensity={0.5} />}
      <View style={[styles.content, { backgroundColor: cardBg }]}>
        <Icon name={config.icon} size={64} color={colors.primary} />
        <Text style={[styles.title, { color: textColor, marginTop: 16 }]}>
          {config.title}
        </Text>
        <Text style={[styles.description, { color: textColor }]}>
          {config.description}
        </Text>
        
        {/* Подсказка о разделе Студгородок */}
        {showFreshmanHint && (
          <View style={[styles.hintCard, { backgroundColor: cardBg, marginBottom: 24 }]}>
            <Icon name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.hintText, { color: colors.primary, marginLeft: 8, flex: 1 }]}>
              Список всех корпусов доступен в разделе "Студгородок"
            </Text>
          </View>
        )}
        
        <View style={styles.buttonsContainer}>
          {shouldShowRetryButton && (
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={onRetry}
            >
              <Icon name="refresh" size={20} color="#ffffff" />
              <Text style={styles.retryButtonText}>{config.retryButtonText}</Text>
            </TouchableOpacity>
          )}

          {shouldShowCacheButton && (
            <TouchableOpacity
              style={[
                styles.cacheButton,
                { borderColor: colors.primary, backgroundColor: glass.surfaceSecondary }
              ]}
              onPress={onViewCache}
            >
              <Icon name="download-outline" size={20} color={colors.primary} />
              <Text style={[styles.cacheButtonText, { color: colors.primary }]}>{cacheButtonText}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 24,
    lineHeight: 22,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  hintText: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
  },
  cacheButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  cacheButtonText: {
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
  },
});

export default ConnectionError;