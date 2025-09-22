import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl, Platform } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getWithExpiry, setWithExpiry, safeJsonParse } from '../utils/cache';
import { ACCENT_COLORS } from '../utils/constants';
import ConnectionError from './ConnectionError';
import NetInfo from '@react-native-community/netinfo';
import { fetchAPI } from '../utils/api';
import { sendNewsNotification } from '../utils/notifications';

const NewsScreen = ({ theme, accentColor }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showCachedData, setShowCachedData] = useState(false);
  const [cacheDate, setCacheDate] = useState(null);
  const [allNewsLoaded, setAllNewsLoaded] = useState(false);

  const newsLoadedCountRef = useRef(0);

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const colors = ACCENT_COLORS[accentColor];

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });

    fetchNews(true);

    return () => {
      unsubscribe();
    };
  }, []);

  const fetchNews = async (isInitialLoad = false) => {
    if (loading || (allNewsLoaded && !isInitialLoad)) return;
    
    setLoading(true);
    setError(null);
    setShowCachedData(false);

    let start = newsLoadedCountRef.current;
    if (isInitialLoad) {
      start = 0;
    }

    const url = `/news?from=${start}`;

    try {
      const { data, source, cacheDate: fetchedCacheDate } = await fetchAPI(url, 'news');
      
      if (source === 'cache') {
        setShowCachedData(true);
        setCacheDate(fetchedCacheDate);
        setNews(data);
        setAllNewsLoaded(true);
      } else {
        const newNews = data;
        const oldNews = await getWithExpiry('news_cache');
        const oldNewsData = oldNews?.value || [];

        // Проверка на новые новости для уведомлений
        if (oldNewsData.length > 0 && newNews.length > 0 && JSON.stringify(oldNewsData[0]) !== JSON.stringify(newNews[0])) {
          sendNewsNotification(newNews[0].title);
        }

        if (newNews && newNews.length > 0) {
          if (isInitialLoad) {
            setNews(newNews);
            newsLoadedCountRef.current = newNews.length;
          } else {
            setNews(prevNews => [...prevNews, ...newNews]);
            newsLoadedCountRef.current += newNews.length;
          }
          if (newNews.length < 10) { // Предполагаем, что 10 новостей — это максимальная порция
            setAllNewsLoaded(true);
          }
        } else {
          setAllNewsLoaded(true);
          if (isInitialLoad) {
            setNews([]);
          }
        }
        await setWithExpiry('news_cache', newNews);
      }
    } catch (err) {
      setError(err);
      const cachedData = await getWithExpiryAndInfo('news_cache');
      if (cachedData) {
        setShowCachedData(true);
        setCacheDate(cachedData.cacheDate);
        setNews(cachedData.value);
        setAllNewsLoaded(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setNews([]);
    setAllNewsLoaded(false);
    newsLoadedCountRef.current = 0;
    fetchNews(true);
  };

  const renderNewsItem = (item, index) => (
    <View key={index} style={[styles.newsCard, { backgroundColor: cardBg }]}>
      <Text style={[styles.newsTitle, { color: textColor }]}>{item.title}</Text>
      <Text style={[styles.newsDescription, { color: placeholderColor }]}>{item.description}</Text>
    </View>
  );

  if (error && !showCachedData) {
    return <ConnectionError 
      type="load-error" 
      onRetry={fetchNews} 
      onViewCache={() => setShowCachedData(true)} 
      theme={theme} 
      accentColor={accentColor}
      contentType="news"
      message={error.message}
    />;
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={[styles.title, { color: textColor }]}>Новости</Text>
        
        {showCachedData && (
          <View style={[styles.cacheInfo, { backgroundColor: colors.light }]}>
            <Icon name="cloud-offline-outline" size={20} color={colors.primary} />
            <Text style={[styles.cacheText, { color: colors.primary }]}>
              Показаны кэшированные данные от {new Date(cacheDate).toLocaleDateString()}. Нет подключения к интернету.
            </Text>
          </View>
        )}

        {news.length === 0 && !loading && !error && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: placeholderColor }]}>
              Пока нет новостей.
            </Text>
          </View>
        )}

        {news.map(renderNewsItem)}
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        
        {!loading && !allNewsLoaded && (
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
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  newsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 8,
  },
  newsDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Montserrat_400Regular',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
  },
  cacheInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  cacheText: {
    marginLeft: 8,
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
});

export default NewsScreen;