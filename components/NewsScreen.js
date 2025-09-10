import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getWithExpiry, setWithExpiry, safeJsonParse } from '../utils/cache';
import { API_BASE_URL, CORS_PROXY, ACCENT_COLORS } from '../utils/constants';
import ConnectionError from './ConnectionError';
import NetInfo from '@react-native-community/netinfo';

const NewsScreen = ({ theme, accentColor }) => {
  const [news, setNews] = useState([]);
  const [cachedNews, setCachedNews] = useState([]);
  const [from, setFrom] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showCachedData, setShowCachedData] = useState(false);

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
      
      // Если появилось соединение, сбрасываем флаг показа кэша
      if (state.isConnected) {
        setShowCachedData(false);
      }
    });

    // Сначала пробуем загрузить из кэша
    loadCachedNews();

    return () => unsubscribe();
  }, []);

  const loadCachedNews = async () => {
    try {
      const cachedData = await getWithExpiry('news');
      if (cachedData) {
        setCachedNews(cachedData);
        
        // Если есть кэш и нет интернета, автоматически показываем кэшированные данные
        if (!isOnline) {
          setNews(cachedData);
          setShowCachedData(true);
          return;
        }
      }
      
      // Если есть интернет, загружаем свежие данные
      if (isOnline) {
        fetchNews(true);
      } else if (!cachedData) {
        setError('no-internet');
      }
    } catch (error) {
      console.error('Error loading cached news:', error);
      if (isOnline) {
        fetchNews(true);
      } else if (!cachedNews.length) {
        setError('no-internet');
      }
    }
  };

  const fetchNews = async (isInitial = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const targetFrom = isInitial ? 0 : from;
      const targetUrl = `${API_BASE_URL}/news?amount=10&from=${targetFrom}`;
      const response = await fetch(`${CORS_PROXY}${encodeURIComponent(targetUrl)}`);
      
      // Исправление ошибки парсинга JSON
      const data = await safeJsonParse(response);
      
      // Фильтрация пустого контента
      const filteredData = data.filter(item => item.content && item.content.trim() !== "");
      
      // Кэшируем новости
      if (isInitial) {
        await setWithExpiry('news', filteredData, 30 * 60 * 1000); // 30 минут
        setCachedNews(filteredData);
      }
      
      setNews(isInitial ? filteredData : [...news, ...filteredData]);
      setFrom(targetFrom + 10);
      setShowCachedData(false);
    } catch (error) {
      console.error('Error fetching news:', error);
      
      // При ошибке пытаемся показать кэшированные данные
      if (cachedNews.length > 0) {
        setNews(cachedNews);
        setShowCachedData(true);
      } else {
        setError('load-error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    if (isOnline) {
      fetchNews(true);
    } else {
      setError('no-internet');
    }
  };

  const handleViewCache = () => {
    if (cachedNews.length > 0) {
      setNews(cachedNews);
      setShowCachedData(true);
      setError(null);
    }
  };

  // Если есть ошибка или загрузка, показываем соответствующий экран
  if ((error && !showCachedData) || (loading && news.length === 0)) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <ConnectionError 
          type={error}
          loading={loading && news.length === 0}
          onRetry={handleRetry}
          onViewCache={handleViewCache}
          showCacheButton={cachedNews.length > 0}
          theme={theme}
          accentColor={accentColor}
          message={error === 'no-internet' ? 'Новости недоступны без подключения к интернету' : 'Не удалось загрузить новости'}
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
            Показаны кэшированные данные {new Date(cachedNews[0]?.cacheDate).toLocaleDateString('ru-RU')}
          </Text>
        </View>
      )}
      
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {news.map((item, index) => (
          <View 
            key={index} 
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
        
        {loading && news.length > 0 && (
          <View style={{ padding: 16 }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        
        {!loading && isOnline && !showCachedData && (
          <TouchableOpacity 
            onPress={() => fetchNews(false)}
            style={{ 
              backgroundColor: colors.primary, 
              padding: 16, 
              borderRadius: 8, 
              alignItems: 'center',
              marginTop: 16
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontFamily: 'Montserrat_600SemiBold' }}>
              Загрузить еще
            </Text>
          </TouchableOpacity>
        )}
        
        {!isOnline && news.length > 0 && (
          <View style={{ 
            backgroundColor: colors.light, 
            padding: 16, 
            borderRadius: 8, 
            alignItems: 'center',
            marginTop: 16
          }}>
            <Icon name="cloud-offline-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, marginTop: 8, textAlign: 'center', fontFamily: 'Montserrat_400Regular' }}>
              Нет подключения к интернету. {showCachedData ? 'Показаны ранее загруженные новости.' : 'Невозможно загрузить новые данные.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Стили могут быть добавлены при необходимости
});

export default NewsScreen;