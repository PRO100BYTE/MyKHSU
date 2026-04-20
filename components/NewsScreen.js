import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl, Animated, StatusBar } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';
import ConnectionError from './ConnectionError';
import NetInfo from '@react-native-community/netinfo';
import ApiService from '../utils/api';
import notificationService from '../utils/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Snowfall from './Snowfall';

const NewsScreen = ({ theme, accentColor, isNewYearMode, onCacheStatusChange }) => {
  const [news, setNews] = useState([]);
  const [cachedNews, setCachedNews] = useState([]);
  const [from, setFrom] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showCachedData, setShowCachedData] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [hasMoreNews, setHasMoreNews] = useState(true);
  const [lastNewsCheck, setLastNewsCheck] = useState(null);
  
  // Анимация появления
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const cardBg = glass.surfaceCard;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const borderColor = glass.border;
  const colors = ACCENT_COLORS[accentColor];
  const hintBgColor = glass.surfaceTertiary;

  // Запуск анимации при монтировании
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Синхронизация статуса кэша с хедером приложения
  useEffect(() => {
    if (onCacheStatusChange) {
      if (!isOnline) {
        onCacheStatusChange('offline', cacheInfo?.cacheInfo?.cacheDate);
      } else if (showCachedData) {
        const status = cacheInfo?.source === 'stale_cache' ? 'stale_cache' : 'cache';
        onCacheStatusChange(status, cacheInfo?.cacheInfo?.cacheDate);
      } else {
        onCacheStatusChange(null);
      }
    }
  }, [showCachedData, isOnline, cacheInfo]);

  // Очистка статуса при размонтировании
  useEffect(() => {
    return () => {
      if (onCacheStatusChange) onCacheStatusChange(null);
    };
  }, []);

  // Функция для очистки кэша новостей
  const clearNewsCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const newsKeys = keys.filter(key => key.startsWith('news_'));
      await AsyncStorage.multiRemove(newsKeys);
      console.log('Кэш новостей очищен:', newsKeys.length, 'ключей');
      return true;
    } catch (error) {
      console.error('Error clearing news cache:', error);
      return false;
    }
  };

  // Фильтрация и обработка новостей
  const filterAndProcessNews = (newsData) => {
    if (!newsData || !Array.isArray(newsData)) return [];
    
    return newsData
      .filter(item => item.content && item.content.trim() !== "")
      .map(item => ({
        ...item,
        id: createNewsId(item),
        normalizedDate: normalizeDate(item.date)
      }))
      .filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id)
      )
      .sort((a, b) => new Date(b.normalizedDate) - new Date(a.normalizedDate));
  };

  // Создание уникального ID для новости
  const createNewsId = (newsItem) => {
    const contentHash = newsItem.content.substring(0, 100).replace(/\s+/g, '_');
    return `${newsItem.date}_${contentHash}`;
  };

  // Проверка, является ли новость той же самой
  const isSameNews = (news1, news2) => {
    return createNewsId(news1) === createNewsId(news2);
  };

  // Нормализация даты
  const normalizeDate = (dateString) => {
    try {
      return new Date(dateString).toISOString();
    } catch {
      return dateString;
    }
  };

  // Проверка новых новостей для уведомлений
  const checkForNewNews = async (currentNews) => {
    if (!isOnline || loading || loadingMore) return;
    
    try {
      await notificationService.checkForNewNews(currentNews);
    } catch (error) {
      console.error('Error checking for new news:', error);
    }
  };

  useEffect(() => {
    // Проверяем подключение к интернету
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });

    // Загружаем первые новости
    fetchNews(true, 0);

    return () => unsubscribe();
  }, []);

  // Проверяем новые новости при загрузке
  useEffect(() => {
    if (news.length > 0 && !loading && !loadingMore) {
      checkForNewNews(news);
    }
  }, [news, loading, loadingMore]);

  const fetchNews = async (isInitial = false, targetFrom = null) => {
    if (loading || loadingMore) return;
    
    const currentFrom = targetFrom !== null ? targetFrom : from;
    
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    setError(null);
    setShowCachedData(false);
    
    try {
      const result = await ApiService.getNews(currentFrom, 10);
      
      if (!result.data || !Array.isArray(result.data)) {
        throw new Error('INVALID_RESPONSE');
      }
      
      // Фильтрация пустого контента и дубликатов
      const filteredData = filterAndProcessNews(result.data);
      
      if (filteredData.length === 0 && currentFrom === 0) {
        setHasMoreNews(false);
      } else if (filteredData.length < 10) {
        setHasMoreNews(false);
      }
      
      if (isInitial) {
        setNews(filteredData);
        setFrom(currentFrom + filteredData.length);
      } else {
        setNews(prevNews => {
          // Объединяем новости, убирая дубликаты
          const combinedNews = [...prevNews];
          filteredData.forEach(newItem => {
            const exists = combinedNews.some(existingItem => 
              isSameNews(existingItem, newItem)
            );
            if (!exists) {
              combinedNews.push(newItem);
            }
          });
          return combinedNews;
        });
        setFrom(currentFrom + filteredData.length);
      }
      
      setCachedNews(filteredData);
      setCacheInfo(result);
      
      if (result.source === 'cache' || result.source === 'stale_cache') {
        setShowCachedData(true);
      }

      // Сохраняем время последней проверки
      setLastNewsCheck(new Date().toISOString());
      
    } catch (error) {
      console.error('Error fetching news:', error);
      setError('load-error');
      
      // При ошибке пытаемся показать кэшированные данные
      if (cachedNews.length > 0) {
        setNews(cachedNews);
        setShowCachedData(true);
        setCacheInfo({ source: 'stale_cache', cacheInfo: { cacheDate: new Date().toISOString() } });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setShowCachedData(false);
    fetchNews(true, 0);
  };

  const handleViewCache = () => {
    if (cachedNews.length > 0) {
      setNews(cachedNews);
      setShowCachedData(true);
      setError(null);
      setCacheInfo({ source: 'stale_cache', cacheInfo: { cacheDate: new Date().toISOString() } });
    }
  };

  // Улучшенная функция обновления с очисткой кэша
  const handleRefresh = async () => {
    setRefreshing(true);
    setFrom(0);
    setHasMoreNews(true);
    
    // Очищаем кэш при наличии интернета
    if (isOnline) {
      await clearNewsCache();
    }
    
    fetchNews(true, 0);
  };

  const loadMoreNews = () => {
    if (!loadingMore && hasMoreNews && isOnline && !showCachedData) {
      fetchNews(false, from);
    }
  };

// Если есть ошибка и нет загрузки, показываем соответствующий экран
if (error && !loading) {
  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {isNewYearMode && <Snowfall key={`snowfall-${isNewYearMode}`} theme={theme} intensity={0.8} />}
      
      <Animated.View style={{ flex: 1, opacity: fadeAnim, zIndex: 2 }}>
        <ConnectionError 
          type={error}
          loading={false}
          onRetry={handleRetry}
          onViewCache={handleViewCache}
          showCacheButton={cachedNews.length > 0}
          cacheAvailable={cachedNews.length > 0}
          theme={theme}
          accentColor={accentColor}
          contentType="news"
          message={error === 'NO_INTERNET' ? 'Новости недоступны без подключения к интернету' : 'Не удалось загрузить новости'}
        />
      </Animated.View>
    </View>
  );
}

return (
  <View style={{ flex: 1, backgroundColor: bgColor }}>
    {/* Снегопад на заднем плане */}
    {isNewYearMode && <Snowfall key={`snowfall-${isNewYearMode}`} theme={theme} intensity={0.8} />}
    
    <Animated.View style={{ flex: 1, opacity: fadeAnim, zIndex: 2 }}>
      <StatusBar 
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={bgColor}
      />
      
      <ScrollView 
        contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* ВСЕ содержимое новостей */}
        
        {news.map((item) => (
          <View 
            key={item.id} 
            style={{ 
              flexDirection: 'row',
              backgroundColor: glass.surfaceSecondary, 
              borderRadius: 16, 
              marginBottom: 12, 
              borderWidth: StyleSheet.hairlineWidth, 
              borderColor,
              overflow: 'hidden',
              shadowColor: glass.shadowColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            {/* Цветная полоска-акцент слева */}
            <View style={{
              width: 4,
              backgroundColor: colors.primary,
              borderTopLeftRadius: 16,
              borderBottomLeftRadius: 16,
            }} />
            
            <View style={{ flex: 1, padding: 14 }}>
              {/* Дата сверху */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Icon name="time-outline" size={13} color={placeholderColor} />
                <Text style={{ 
                  color: placeholderColor, 
                  fontSize: 12, 
                  fontFamily: 'Montserrat_400Regular',
                  marginLeft: 5,
                }}>
                  {item.hr_date}
                </Text>
              </View>
              
              {/* Контент */}
              <Text style={{ 
                color: textColor, 
                fontSize: 15, 
                fontFamily: 'Montserrat_400Regular',
                lineHeight: 22,
              }}>
                {item.content}
              </Text>
            </View>
          </View>
        ))}
        
        {loadingMore && (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: placeholderColor, marginTop: 8, fontFamily: 'Montserrat_400Regular' }}>
              Загрузка новостей...
            </Text>
          </View>
        )}
        
        {!loadingMore && hasMoreNews && isOnline && !showCachedData && news.length > 0 && (
          <TouchableOpacity 
            onPress={loadMoreNews}
            style={{ 
              backgroundColor: colors.primary, 
              padding: 14, 
              borderRadius: 14, 
              alignItems: 'center',
              marginTop: 16,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Icon name="download-outline" size={20} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontFamily: 'Montserrat_600SemiBold' }}>
              Загрузить еще
            </Text>
          </TouchableOpacity>
        )}
        
        {!hasMoreNews && news.length > 0 && (
          <View style={{ 
            padding: 16, 
            alignItems: 'center',
            marginTop: 16
          }}>
            <Text style={{ color: placeholderColor, fontFamily: 'Montserrat_400Regular' }}>
              Все новости загружены
            </Text>
          </View>
        )}
        
        {!isOnline && news.length > 0 && (
          <View style={{ 
            backgroundColor: colors.glass || (colors.primary + '10'),
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.glassBorder || (colors.primary + '25'),
            borderRadius: 16,
            paddingVertical: 12,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 16,
          }}>
            <View style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: colors.primary + '18',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 10,
            }}>
              <Icon name="cloud-offline-outline" size={16} color={colors.primary} />
            </View>
            <Text style={{ 
              color: textColor, 
              fontFamily: 'Montserrat_400Regular',
              fontSize: 13,
              flex: 1,
              opacity: 0.85,
            }}>
              Нет подключения к интернету. {showCachedData ? 'Показаны ранее загруженные новости.' : 'Невозможно загрузить новые данные.'}
            </Text>
          </View>
        )}
      </ScrollView>
      
      {loading && news.length === 0 && (
        <View style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.1)',
          zIndex: 3
        }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: textColor, marginTop: 16, fontFamily: 'Montserrat_400Regular' }}>
            Загрузка новостей...
          </Text>
        </View>
      )}
    </Animated.View>
  </View>
);
};

const styles = StyleSheet.create({
  // Стили могут быть добавлены при необходимости
});

export default NewsScreen;