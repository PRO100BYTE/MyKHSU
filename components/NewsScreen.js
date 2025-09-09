import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getWithExpiry, setWithExpiry, safeJsonParse } from '../utils/cache';
import { API_BASE_URL, CORS_PROXY, ACCENT_COLORS } from '../utils/constants';
import ConnectionError from './ConnectionError';
import NetInfo from '@react-native-community/netinfo';

const NewsScreen = ({ theme, accentColor }) => {
  const [news, setNews] = useState([]);
  const [from, setFrom] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

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

    // Сначала пробуем загрузить из кэша
    loadCachedNews();

    return () => unsubscribe();
  }, []);

  const loadCachedNews = async () => {
    try {
      const cachedNews = await getWithExpiry('news');
      if (cachedNews) {
        setNews(cachedNews);
      } else if (isOnline) {
        fetchNews(true);
      } else {
        setError('no-internet');
      }
    } catch (error) {
      console.error('Error loading cached news:', error);
      if (isOnline) {
        fetchNews(true);
      } else {
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
      }
      
      setNews(isInitial ? filteredData : [...news, ...filteredData]);
      setFrom(targetFrom + 10);
    } catch (error) {
      console.error('Error fetching news:', error);
      // Пробуем загрузить из кэша при ошибке
      const cachedNews = await getWithExpiry('news');
      if (cachedNews && isInitial) {
        setNews(cachedNews);
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

  // Если есть ошибка или загрузка, показываем соответствующий экран
  if (error || (loading && news.length === 0)) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <ConnectionError 
          type={error}
          loading={loading && news.length === 0}
          onRetry={handleRetry}
          theme={theme}
          accentColor={accentColor}
          message={error === 'no-internet' ? 'Новости недоступны без подключения к интернету' : 'Не удалось загрузить новости'}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
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
        
        {loading && <ActivityIndicator size="large" color={colors.primary} />}
        
        {!loading && isOnline && (
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
              Нет подключения к интернету. Показаны ранее загруженные новости.
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