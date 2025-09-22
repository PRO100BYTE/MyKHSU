import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';

const ConnectionError = ({ 
  type, 
  loading, 
  onRetry, 
  onViewCache, 
  theme, 
  accentColor, 
  contentType = 'general',
  message,
  showCacheButton = false,
  cacheAvailable = false
}) => {
  const colors = ACCENT_COLORS[accentColor];
  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';

  // Конфигурация для разных типов контента
  const contentConfigs = {
    map: {
      'no-internet': {
        icon: 'map-outline',
        title: 'Карта недоступна',
        description: 'Для загрузки карты необходимо подключение к интернету',
        cacheButton: 'Использовать оффлайн-карту'
      },
      'load-error': {
        icon: 'warning-outline',
        title: 'Ошибка загрузки карты',
        description: 'Не удалось загрузить карту. Проверьте подключение и попробуйте снова',
        cacheButton: 'Использовать оффлайн-карту'
      }
    },
    schedule: {
      'no-internet': {
        icon: 'calendar-outline',
        title: 'Расписание недоступно',
        description: 'Для загрузки расписания необходимо подключение к интернету',
        cacheButton: 'Показать кэшированное расписание'
      },
      'load-error': {
        icon: 'warning-outline',
        title: 'Ошибка загрузки расписания',
        description: 'Не удалось загрузить расписание. Проверьте подключение и попробуйте снова',
        cacheButton: 'Показать кэшированное расписание'
      }
    },
    news: {
      'no-internet': {
        icon: 'newspaper-outline',
        title: 'Новости недоступны',
        description: 'Для загрузки новостей необходимо подключение к интернету',
        cacheButton: 'Показать кэшированные новости'
      },
      'load-error': {
        icon: 'warning-outline',
        title: 'Ошибка загрузки новостей',
        description: 'Не удалось загрузить новости. Проверьте подключение и попробуйте снова',
        cacheButton: 'Показать кэшированные новости'
      }
    },
    general: {
      'no-internet': {
        icon: 'cloud-offline-outline',
        title: 'Нет подключения к интернету',
        description: 'Для загрузки данных необходимо подключение к интернету',
        cacheButton: 'Показать кэшированные данные'
      },
      'load-error': {
        icon: 'warning-outline',
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить данные. Проверьте подключение и попробуйте снова',
        cacheButton: 'Показать кэшированные данные'
      },
      'default': {
        icon: 'refresh-outline',
        title: 'Ошибка',
        description: 'Произошла непредвиденная ошибка',
        cacheButton: 'Показать кэшированные данные'
      }
    }
  };

  // Получаем конфигурацию для текущего типа контента и ошибки
  const config = contentConfigs[contentType][type] || 
                contentConfigs[contentType]['default'] || 
                contentConfigs.general[type] || 
                contentConfigs.general.default;

  // Определяем, показывать ли кнопку кэша
  const shouldShowCacheButton = (showCacheButton || cacheAvailable) && onViewCache;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={[styles.content, { backgroundColor: cardBg }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.title, { color: textColor, marginTop: 16 }]}>
            {contentType === 'map' ? 'Загрузка карты...' : 
             contentType === 'schedule' ? 'Загрузка расписания...' : 
             contentType === 'news' ? 'Загрузка новостей...' : 'Загрузка...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.content, { backgroundColor: cardBg }]}>
        <Icon name={config.icon} size={64} color={colors.primary} />
        <Text style={[styles.title, { color: textColor, marginTop: 16 }]}>
          {config.title}
        </Text>
        <Text style={[styles.description, { color: textColor }]}>
          {message || config.description}
        </Text>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={onRetry}
          >
            <Icon name="refresh" size={20} color="#ffffff" />
            <Text style={styles.retryButtonText}>Попробовать снова</Text>
          </TouchableOpacity>
          
          {shouldShowCacheButton && (
            <TouchableOpacity
              style={[styles.cacheButton, { 
                backgroundColor: theme === 'light' ? colors.light : '#374151',
                borderColor: colors.primary 
              }]}
              onPress={onViewCache}
            >
              <Icon name="time-outline" size={20} color={colors.primary} />
              <Text style={[styles.cacheButtonText, { color: colors.primary }]}>
                {config.cacheButton}
              </Text>
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