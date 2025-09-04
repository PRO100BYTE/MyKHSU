import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getWithExpiry, setWithExpiry, safeJsonParse } from '../utils/cache';
import { API_BASE_URL, CORS_PROXY, ACCENT_COLORS } from '../utils/constants';

const NewsScreen = ({ theme, accentColor }) => {
  const [news, setNews] = useState([]);
  const [from, setFrom] = useState(0);
  const [loading, setLoading] = useState(false);

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
  const colors = ACCENT_COLORS[accentColor];

  const fetchNews = async (isInitial = false) => {
    if (loading) return;
    
    setLoading(true);
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
        Alert.alert('Ошибка', 'Не удалось загрузить новости :(');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Сначала пробуем загрузить из кэша
    const loadCachedNews = async () => {
      const cachedNews = await getWithExpiry('news');
      if (cachedNews) {
        setNews(cachedNews);
      } else {
        fetchNews(true);
      }
    };
    
    loadCachedNews();
  }, []);

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
        
        {!loading && (
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Стили могут быть добавлены при необходимости
});

export default NewsScreen;