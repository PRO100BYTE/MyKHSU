import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';
import ConnectionError from './ConnectionError';
import NetInfo from '@react-native-community/netinfo';
import ApiService from '../utils/api';

const NewsScreen = ({ theme, accentColor }) => {
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

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
  const colors = ACCENT_COLORS[accentColor];

  useEffect(() => {
    // Проверяем подключение к интернету
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });

    // Загружаем первые новости
    fetchNews(true, 0);

    return () => unsubscribe();
  }, []);

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
      
      // Фильтрация пустого контента
      const filteredData = result.data.filter(item => item.content && item.content.trim() !== "");
      
      if (filteredData.length === 0) {
        setHasMoreNews(false);
      }
      
      if (isInitial) {
        setNews(filteredData);
        setFrom(currentFrom + 10);
      } else {
        setNews(prevNews => {
          // Объединяем новости, убирая дубликаты по дате и содержанию
          const combinedNews = [...prevNews];
          filteredData.forEach(newItem => {
            const exists = combinedNews.some(existingItem => 
              existingItem.date === newItem.date && 
              existingItem.content === newItem.content
            );
            if (!exists) {
              combinedNews.push(newItem);
            }
          });
          return combinedNews;
        });
        setFrom(currentFrom + 10);
      }
      
      setCachedNews(filteredData);
      setCacheInfo(result);
      
      if (result.source === 'cache' || result.source === 'stale_cache') {
        setShowCachedData(true);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      
      // При ошибке пытаемся показать кэшированные данные
      if (cachedNews.length > 0) {
        setNews(cachedNews);
        setShowCachedData(true);
        setCacheInfo({ source: 'stale_cache', cacheInfo: { cacheDate: new Date().toISOString() } });
      } else {
        setError(error.message || 'load-error');
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

  const onRefresh = () => {
    setRefreshing(true);
    setFrom(0);
    setHasMoreNews(true);
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
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {showCachedData && (
        <View style={{ 
          backgroundColor: colors.light, 
          padding: 12, 
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center'
        }}>
          <Icon name="time-outline" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, marginLeft: 8, fontFamily: 'Montserrat_400Regular' }}>
            {cacheInfo?.source === 'stale_cache' ? 'Показаны ранее загруженные новости' : 'Показаны кэшированные новости'}
          </Text>
        </View>
      )}
      
      <ScrollView 
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {news.map((item, index) => (
          <View 
            key={`${item.date}-${index}`} 
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
            backgroundColor: colors.light, 
            padding: 16, 
            borderRadius: 8, 
            alignItems: 'center',
            marginTop: 16,
            flexDirection: 'row',
            justifyContent: 'center'
          }}>
            <Icon name="cloud-offline-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, marginLeft: 8, textAlign: 'center', fontFamily: 'Montserrat_400Regular' }}>
              Нет подключения к интернету. {showCachedData ? 'Показаны ранее загруженные новости.' : 'Невозможно загрузить новые данные.'}
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
    </View>
  );
};

const styles = StyleSheet.create({
  // Стили могут быть добавлены при необходимости
});

export default NewsScreen;