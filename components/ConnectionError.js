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
  message,
  contentType = 'general' // 'map', 'schedule', 'news', 'general'
}) => {
  const colors = ACCENT_COLORS[accentColor];
  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';

  const contentConfigs = {
    map: {
      'no-internet': {
        icon: 'map-outline',
        title: 'Карта недоступна',
        description: 'Для загрузки карты необходимо подключение к интернету',
        cacheButton: 'Использовать оффлайн-карту',
      },
      'load-error': {
        icon: 'warning-outline',
        title: 'Ошибка загрузки карты',
        description: 'Не удалось загрузить карту. Проверьте подключение и попробуйте еще раз.',
        cacheButton: 'Использовать оффлайн-карту',
      }
    },
    schedule: {
      'no-internet': {
        icon: 'calendar-outline',
        title: 'Расписание недоступно',
        description: 'Для загрузки расписания необходимо подключение к интернету. Попробуйте еще раз или используйте ранее загруженные данные.',
        cacheButton: 'Показать кэшированные данные',
      },
      'load-error': {
        icon: 'warning-outline',
        title: 'Ошибка загрузки расписания',
        description: 'Не удалось загрузить расписание. Проверьте подключение и попробуйте еще раз.',
        cacheButton: 'Показать кэшированные данные',
      }
    },
    news: {
      'no-internet': {
        icon: 'newspaper-outline',
        title: 'Новости недоступны',
        description: 'Для загрузки новостей необходимо подключение к интернету. Попробуйте еще раз или используйте ранее загруженные данные.',
        cacheButton: 'Показать кэшированные данные',
      },
      'load-error': {
        icon: 'warning-outline',
        title: 'Ошибка загрузки новостей',
        description: 'Не удалось загрузить новости. Проверьте подключение и попробуйте еще раз.',
        cacheButton: 'Показать кэшированные данные',
      }
    },
    general: {
      'no-internet': {
        icon: 'cloud-offline-outline',
        title: 'Нет подключения к интернету',
        description: 'Проверьте ваше соединение и попробуйте еще раз.',
        cacheButton: null,
      },
      'load-error': {
        icon: 'warning-outline',
        title: 'Ошибка загрузки данных',
        description: message || 'Не удалось загрузить данные. Попробуйте еще раз.',
        cacheButton: null,
      }
    }
  };

  const config = contentConfigs[contentType][type];

  if (!config) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.content, { backgroundColor: cardBg }]}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <>
            <Icon name={config.icon} size={64} color={colors.primary} />
            <Text style={[styles.title, { color: textColor }]}>
              {config.title}
            </Text>
            <Text style={[styles.description, { color: textColor }]}>
              {config.description}
            </Text>
          </>
        )}
        
        <View style={styles.buttonsContainer}>
          {onRetry && !loading && (
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={onRetry}
            >
              <Text style={[styles.retryButtonText, { color: '#ffffff' }]}>
                Повторить
              </Text>
            </TouchableOpacity>
          )}

          {onViewCache && !loading && config.cacheButton && (
            <TouchableOpacity 
              style={[styles.cacheButton, { backgroundColor: colors.light, borderColor: colors.primary }]}
              onPress={onViewCache}
            >
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
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat_600SemiBold',
  },
  cacheButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  cacheButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat_600SemiBold',
  },
});

export default ConnectionError;