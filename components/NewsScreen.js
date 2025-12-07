import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl, Animated, StatusBar } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';
import ConnectionError from './ConnectionError';
import NetInfo from '@react-native-community/netinfo';
import ApiService from '../utils/api';
import notificationService from '../utils/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Snowfall from './Snowfall';

const NewsScreen = ({ theme, accentColor, isNewYearMode }) => {
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

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
  const colors = ACCENT_COLORS[accentColor];
  const hintBgColor = theme === 'light' ? '#f9fafb' : '#2d3748'; // Более темный для темной темы

  // Запуск анимации при монтировании
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
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
      <Animated.View style={{ flex: 1, backgroundColor: bgColor, opacity: fadeAnim }}>
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
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {isNewYearMode && <Snowfall theme={theme} intensity={0.8} />}
      
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <StatusBar 
          barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
          backgroundColor={bgColor}
        />
        
        <ScrollView 
          contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {showCachedData && (
          <View style={{ 
            backgroundColor: hintBgColor, 
            padding: 12, 
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            borderWidth: 1,
            borderColor: borderColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: theme === 'light' ? 0.05 : 0.2,
            shadowRadius: 2,
            elevation: 2
          }}>
            <Icon name="time-outline" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, marginLeft: 8, fontFamily: 'Montserrat_400Regular' }}>
              {cacheInfo?.source === 'stale_cache' ? 'Показаны ранее загруженные новости' : 'Показаны кэшированные новости'}
            </Text>
          </View>
        )}
        
        {news.map((item) => (
          <View 
            key={item.id} 
            style={{ 
              backgroundColor: cardBg, 
              borderRadius: 12, 
              padding: 16, 
              marginBottom: 12, 
              borderWidth: 1, 
              borderColor 
            }}
          >
            <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Montserrat_400Regular' }}>
              {item.content}
            </Text>
            <Text style={{ color: placeholderColor, fontSize: 12, textAlign: 'right', marginTop: 12, fontFamily: 'Montserrat_400Regular' }}>
              {item.hr_date}
            </Text>
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
              padding: 16, 
              borderRadius: 8, 
              alignItems: 'center',
              marginTop: 16,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8
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
            backgroundColor: hintBgColor, 
            padding: 16, 
            borderRadius: 8, 
            alignItems: 'center',
            marginTop: 16,
            flexDirection: 'row',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: borderColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: theme === 'light' ? 0.05 : 0.2,
            shadowRadius: 2,
            elevation: 2
          }}>
            <Icon name="cloud-offline-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, marginLeft: 8, textAlign: 'center', fontFamily: 'Montserrat_400Regular' }}>
              Нет подключения к интернету. {showCachedData ? 'Показаны ранее загруженные новости.' : 'Невозможно загрузить новые данные.'}
            </Text>
          </View>
        )}

        {lastNewsCheck && (
          <View style={{ 
            padding: 8, 
            alignItems: 'center',
            marginBottom: 16
          }}>
            <Text style={{ color: placeholderColor, fontSize: 10, fontFamily: 'Montserrat_400Regular' }}>
              Последнее обновление: {new Date(lastNewsCheck).toLocaleString('ru-RU')}
            </Text>
          </View>
        )}
      </ScrollView>
      
      {loading && news.length === 0 && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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