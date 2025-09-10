import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';

const ConnectionError = ({ type, loading, onRetry, theme, accentColor, message, onViewCache, showCacheButton }) => {
  const colors = ACCENT_COLORS[accentColor];
  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';

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

  const errorConfigs = {
    'no-internet': {
      icon: 'cloud-offline-outline',
      title: 'Нет подключения к интернету',
      description: message || 'Для загрузки данных необходимо подключение к интернету'
    },
    'load-error': {
      icon: 'warning-outline',
      title: 'Ошибка загрузки',
      description: message || 'Не удалось загрузить данные. Проверьте подключение и попробуйте снова'
    },
    'default': {
      icon: 'refresh-outline',
      title: 'Ошибка',
      description: message || 'Произошла непредвиденная ошибка'
    }
  };

  const config = errorConfigs[type] || errorConfigs.default;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.content, { backgroundColor: cardBg }]}>
        <Icon name={config.icon} size={64} color={colors.primary} />
        <Text style={[styles.title, { color: textColor, marginTop: 16 }]}>
          {config.title}
        </Text>
        <Text style={[styles.description, { color: textColor }]}>
          {config.description}
        </Text>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={onRetry}
          >
            <Text style={styles.retryButtonText}>Попробовать снова</Text>
          </TouchableOpacity>
          
          {showCacheButton && (
            <TouchableOpacity
              style={[styles.cacheButton, { backgroundColor: colors.light, borderColor: colors.primary }]}
              onPress={onViewCache}
            >
              <Text style={[styles.cacheButtonText, { color: colors.primary }]}>
                Показать кэшированные данные
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
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
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
    fontFamily: 'Montserrat_500Medium',
  },
});

export default ConnectionError;