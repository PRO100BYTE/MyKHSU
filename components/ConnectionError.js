import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, ERROR_MESSAGES } from '../utils/constants';

const ConnectionError = ({ 
  type, 
  loading, 
  onRetry, 
  onViewCache, 
  theme, 
  accentColor, 
  message,
  cacheAvailable = false,
  contentType = 'general',
  cacheDate = null
}) => {
  const colors = ACCENT_COLORS[accentColor];
  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';

  const getErrorConfig = () => {
    const configs = {
      'NO_INTERNET': {
        icon: 'cloud-offline-outline',
        title: 'Нет подключения',
        description: ERROR_MESSAGES.NETWORK_ERROR,
        showCacheButton: cacheAvailable
      },
      'API_UNAVAILABLE': {
        icon: 'server-outline',
        title: 'Сервер недоступен',
        description: ERROR_MESSAGES.SERVER_ERROR,
        showCacheButton: cacheAvailable
      },
      'INVALID_JSON': {
        icon: 'document-text-outline',
        title: 'Ошибка данных',
        description: ERROR_MESSAGES.JSON_PARSE_ERROR,
        showCacheButton: cacheAvailable
      },
      'HTML_RESPONSE': {
        icon: 'warning-outline',
        title: 'Ошибка сервера',
        description: 'Сервер вернул HTML вместо данных',
        showCacheButton: cacheAvailable
      },
      'default': {
        icon: 'alert-circle-outline',
        title: 'Ошибка',
        description: 'Произошла непредвиденная ошибка',
        showCacheButton: cacheAvailable
      }
    };

    return configs[type] || configs.default;
  };

  const config = getErrorConfig();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={[styles.content, { backgroundColor: cardBg }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.title, { color: textColor, marginTop: 16 }]}>
            Загрузка...
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
        
        {cacheDate && (
          <Text style={[styles.cacheDate, { color: colors.primary }]}>
            Данные из кэша от {new Date(cacheDate).toLocaleDateString('ru-RU')}
          </Text>
        )}
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={onRetry}
          >
            <Icon name="refresh" size={20} color="#ffffff" />
            <Text style={styles.retryButtonText}>Попробовать снова</Text>
          </TouchableOpacity>
          
          {config.showCacheButton && onViewCache && (
            <TouchableOpacity
              style={[styles.cacheButton, { 
                backgroundColor: theme === 'light' ? colors.light : '#374151',
                borderColor: colors.primary 
              }]}
              onPress={onViewCache}
            >
              <Icon name="time-outline" size={20} color={colors.primary} />
              <Text style={[styles.cacheButtonText, { color: colors.primary }]}>
                Использовать кэш
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
    marginBottom: 16,
    lineHeight: 22,
  },
  cacheDate: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 16,
    fontStyle: 'italic',
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