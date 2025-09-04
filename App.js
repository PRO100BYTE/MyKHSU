import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, StyleSheet, Alert, Platform, Modal, useColorScheme } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';

// Константы
const API_BASE_URL = 'https://t2iti.khsu.ru/api';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 дней

// Цветовые схемы
const ACCENT_COLORS = {
  green: {
    primary: '#10B981',
    light: '#ECFDF5',
    dark: '#047857'
  },
  blue: {
    primary: '#3B82F6',
    light: '#DBEAFE',
    dark: '#1D4ED8'
  },
  purple: {
    primary: '#8B5CF6',
    light: '#EDE9FE',
    dark: '#5B21B6'
  }
};

// Утилиты для работы с кэшем
const getWithExpiry = async (key) => {
  try {
    const itemStr = await AsyncStorage.getItem(key);
    if (!itemStr) return null;
    
    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
};

const setWithExpiry = async (key, value, ttl = CACHE_TTL) => {
  try {
    const item = {
      value,
      expiry: Date.now() + ttl
    };
    await AsyncStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

// Определение номера недели
const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getFullYear(), 8, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Форматирование даты
const formatDate = (date) => {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Получение даты по номеру недели и дню недели
const getDateByWeekAndDay = (weekNumber, dayOfWeek) => {
  const yearStart = new Date(new Date().getFullYear(), 8, 1); // 1 сентября текущего года
  const firstMonday = new Date(yearStart);
  firstMonday.setDate(firstMonday.getDate() + (1 - firstMonday.getDay() + 7) % 7);
  
  const targetDate = new Date(firstMonday);
  targetDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7 + (dayOfWeek - 1));
  
  return targetDate;
};

// Splash Screen компонент
const SplashScreen = ({ accentColor }) => {
  const colors = ACCENT_COLORS[accentColor];
  
  return (
    <View style={[styles.flexCenter, { backgroundColor: '#f3f4f6' }]}>
      <Icon name="school-outline" size={120} color={colors.primary} />
      <Text style={[styles.title, { color: colors.primary, marginTop: 20, fontFamily: 'Montserrat_700Bold' }]}>Мой ХГУ</Text>
    </View>
  );
};

// Компонент вкладки
const TabButton = ({ icon, label, isActive, onPress, theme, accentColor }) => {
  const colors = ACCENT_COLORS[accentColor];
  const iconColor = isActive ? 
    (theme === 'light' ? colors.primary : colors.dark) : 
    (theme === 'light' ? '#6b7280' : '#9ca3af');
  
  const textColor = isActive ? 
    (theme === 'light' ? colors.primary : colors.dark) : 
    (theme === 'light' ? '#6b7280' : '#9ca3af');

  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[styles.tabButton, { 
        backgroundColor: isActive ? (theme === 'light' ? colors.light : 'rgba(96, 165, 250, 0.1)') : 'transparent'
      }]}
    >
      <Icon name={icon} size={24} color={iconColor} />
      <Text style={[styles.tabText, { color: textColor, fontFamily: 'Montserrat_500Medium' }]}>{label}</Text>
    </TouchableOpacity>
  );
};

// Экран заглушки
const PlaceholderScreen = ({ title, theme }) => {
  const messages = {
    'Карта': 'Данный раздел находится в разработке и скоро будет доступен.',
    'Первокурснику': 'Полезная информация для первокурсников появится здесь в ближайшее время.'
  };

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';

  return (
    <View style={[styles.flexCenter, { backgroundColor: bgColor, padding: 20 }]}>
      <Text style={[styles.placeholderTitle, { color: textColor, fontFamily: 'Montserrat_600SemiBold' }]}>{title}</Text>
      <Text style={[styles.placeholderText, { color: placeholderColor, fontFamily: 'Montserrat_400Regular' }]}>{messages[title] || ''}</Text>
    </View>
  );
};

// Экран новостей
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
      const data = await response.json();
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
        Alert.alert('Ошибка', 'Не удалось загрузить новости.');
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
            <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Montserrat_400Regular' }}>{item.content}</Text>
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
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontFamily: 'Montserrat_600SemiBold' }}>Загрузить еще</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

// Экран расписания
const ScheduleScreen = ({ theme, accentColor }) => {
  const [course, setCourse] = useState(1);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [pairsTime, setPairsTime] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [viewMode, setViewMode] = useState('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(getWeekNumber(new Date()));

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const colors = ACCENT_COLORS[accentColor];
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';

  const fetchGroupsForCourse = async (course) => {
    setLoadingGroups(true);
    try {
      const cacheKey = `groups_${course}`;
      const cached = await getWithExpiry(cacheKey);
      
      if (cached) {
        setGroups(cached.groups || []);
      } else {
        const targetUrl = `${API_BASE_URL}/getgroups/${course}`;
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(targetUrl)}`);
        const data = await response.json();
        setGroups(data.groups || []);
        await setWithExpiry(cacheKey, data);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить список групп.');
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchScheduleData = async (group) => {
    setSelectedGroup(group);
    setLoadingSchedule(true);
    
    try {
      if (viewMode === 'week') {
        const cacheKey = `schedule_${group}_${currentWeek}`;
        const cached = await getWithExpiry(cacheKey);
        
        if (cached) {
          setScheduleData(cached);
        } else {
          const targetUrl = `${API_BASE_URL}/getpairsweek?type=group&data=${group}&week=${currentWeek}`;
          const response = await fetch(`${CORS_PROXY}${encodeURIComponent(targetUrl)}`);
          const data = await response.json();
          setScheduleData(data);
          await setWithExpiry(cacheKey, data, 60 * 60 * 1000);
        }
      } else {
        const formattedDate = formatDate(currentDate);
        const cacheKey = `schedule_${group}_${formattedDate}`;
        const cached = await getWithExpiry(cacheKey);
        
        if (cached) {
          setScheduleData(cached);
        } else {
          const targetUrl = `${API_BASE_URL}/getpairs/date:${group}:${formattedDate}`;
          const response = await fetch(`${CORS_PROXY}${encodeURIComponent(targetUrl)}`);
          const data = await response.json();
          setScheduleData(data);
          await setWithExpiry(cacheKey, data, 60 * 60 * 1000);
        }
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить расписание.');
    } finally {
      setLoadingSchedule(false);
    }
  };

  const fetchPairsTime = async () => {
    try {
      const cacheKey = 'pairsTime';
      const cached = await getWithExpiry(cacheKey);
      
      if (cached) {
        setPairsTime(cached.pairs_time || []);
      } else {
        const targetUrl = `${API_BASE_URL}/getpairstime`;
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(targetUrl)}`);
        const data = await response.json();
        setPairsTime(data.pairs_time || []);
        await setWithExpiry(cacheKey, data);
      }
    } catch (error) {
      console.error('Error fetching pairs time:', error);
    }
  };

  useEffect(() => {
    fetchGroupsForCourse(course);
    fetchPairsTime();
  }, [course]);

  useEffect(() => {
    if (selectedGroup) {
      fetchScheduleData(selectedGroup);
    }
  }, [viewMode, currentDate, currentWeek, selectedGroup]);

  const getTimeForLesson = (timeNumber) => {
    return pairsTime.find(pair => pair.time === timeNumber);
  };

  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const changeWeek = (weeks) => {
    setCurrentWeek(currentWeek + weeks);
  };

  const weekdays = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

  const renderDaySchedule = (day) => {
    const date = getDateByWeekAndDay(currentWeek, day.weekday);
    return (
      <View 
        key={day.weekday} 
        style={{ 
          backgroundColor: cardBg, 
          borderRadius: 12, 
          padding: 16, 
          marginBottom: 16,
          borderWidth: 1,
          borderColor
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 4, fontFamily: 'Montserrat_600SemiBold' }}>
          {weekdays[day.weekday - 1]}
        </Text>
        <Text style={{ color: placeholderColor, marginBottom: 12, fontFamily: 'Montserrat_400Regular' }}>
          {formatDate(date)}
        </Text>

        {day.lessons.length > 0 ? (
          day.lessons.map(lesson => {
            const pairTime = getTimeForLesson(lesson.time);
            return (
              <View 
                key={lesson.id} 
                style={{ 
                  paddingVertical: 12, 
                  borderTopWidth: 1, 
                  borderTopColor: borderColor,
                  marginTop: 12
                }}
              >
                <Text style={{ fontWeight: '600', color: textColor, fontSize: 16, fontFamily: 'Montserrat_500Medium' }}>
                  {lesson.subject} ({lesson.type_lesson})
                </Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Icon name="person-outline" size={14} color={placeholderColor} />
                  <Text style={{ color: textColor, marginLeft: 8, fontSize: 14, fontFamily: 'Montserrat_400Regular' }}>
                    {lesson.teacher}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Icon name="location-outline" size={14} color={placeholderColor} />
                  <Text style={{ color: textColor, marginLeft: 8, fontSize: 14, fontFamily: 'Montserrat_400Regular' }}>
                    Аудитория: {lesson.auditory}
                  </Text>
                </View>
                
                {pairTime && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Icon name="time-outline" size={14} color={placeholderColor} />
                    <Text style={{ color: placeholderColor, marginLeft: 8, fontSize: 14, fontFamily: 'Montserrat_400Regular' }}>
                      {pairTime.time_start} - {pairTime.time_end}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <Text style={{ color: placeholderColor, marginTop: 12, fontFamily: 'Montserrat_400Regular' }}>Занятий нет</Text>
        )}
      </View>
    );
  };

  const renderDailySchedule = () => {
    if (!scheduleData) return null;
    
    const weekday = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
    const daySchedule = scheduleData.days ? 
      scheduleData.days.find(d => d.weekday === weekday) : 
      { lessons: scheduleData.lessons || [] };
    
    return (
      <View 
        style={{ 
          backgroundColor: cardBg, 
          borderRadius: 12, 
          padding: 16, 
          marginBottom: 16,
          borderWidth: 1,
          borderColor
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 4, fontFamily: 'Montserrat_600SemiBold' }}>
          {weekdays[weekday - 1]}
        </Text>
        <Text style={{ color: placeholderColor, marginBottom: 12, fontFamily: 'Montserrat_400Regular' }}>
          {formatDate(currentDate)}
        </Text>

        {daySchedule.lessons && daySchedule.lessons.length > 0 ? (
          daySchedule.lessons.map(lesson => {
            const pairTime = getTimeForLesson(lesson.time);
            return (
              <View 
                key={lesson.id} 
                style={{ 
                  paddingVertical: 12, 
                  borderTopWidth: 1, 
                  borderTopColor: borderColor,
                  marginTop: 12
                }}
              >
                <Text style={{ fontWeight: '600', color: textColor, fontSize: 16, fontFamily: 'Montserrat_500Medium' }}>
                  {lesson.subject} ({lesson.type_lesson})
                </Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Icon name="person-outline" size={14} color={placeholderColor} />
                  <Text style={{ color: textColor, marginLeft: 8, fontSize: 14, fontFamily: 'Montserrat_400Regular' }}>
                    {lesson.teacher}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Icon name="location-outline" size={14} color={placeholderColor} />
                  <Text style={{ color: textColor, marginLeft: 8, fontSize: 14, fontFamily: 'Montserrat_400Regular' }}>
                    Аудитория: {lesson.auditory}
                  </Text>
                </View>
                
                {pairTime && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Icon name="time-outline" size={14} color={placeholderColor} />
                    <Text style={{ color: placeholderColor, marginLeft: 8, fontSize: 14, fontFamily: 'Montserrat_400Regular' }}>
                      {pairTime.time_start} - {pairTime.time_end}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <Text style={{ color: placeholderColor, marginTop: 12, fontFamily: 'Montserrat_400Regular' }}>Занятий нет</Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bgColor, padding: 16 }}>
      {/* Текущая дата */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: textColor, fontWeight: '500', textAlign: 'center', fontFamily: 'Montserrat_500Medium' }}>
          Сегодня: {formatDate(new Date())}
        </Text>
      </View>

      {/* Кнопки выбора курса */}
      <View style={{ 
        flexDirection: 'row', 
        flexWrap: 'wrap',
        backgroundColor: bgColor, 
        borderRadius: 24, 
        padding: 4, 
        marginBottom: 16,
        borderWidth: 1,
        borderColor
      }}>
        {[-1, 1, 2, 3, 4].map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setCourse(c)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 20,
              backgroundColor: course === c ? colors.primary : 'transparent',
              alignItems: 'center',
              margin: 2,
              flexGrow: 1,
              minWidth: '18%'
            }}
          >
            <Text style={{ 
              color: course === c ? '#ffffff' : textColor,
              fontWeight: '500',
              fontFamily: 'Montserrat_500Medium'
            }}>
              {c === -1 ? 'Магистратура' : `${c} курс`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Список групп */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
        {loadingGroups ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          groups.map(group => (
            <TouchableOpacity
              key={group}
              onPress={() => fetchScheduleData(group)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 8,
                margin: 4,
                backgroundColor: selectedGroup === group ? colors.primary : cardBg,
                borderWidth: 1,
                borderColor: selectedGroup === group ? colors.primary : borderColor
              }}
            >
              <Text style={{ 
                color: selectedGroup === group ? '#ffffff' : textColor,
                fontFamily: 'Montserrat_500Medium'
              }}>
                {group}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Управление расписанием (только после выбора группы) */}
      {selectedGroup && (
        <>
          {/* Переключение режимов и навигация */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', backgroundColor: cardBg, borderRadius: 8, padding: 4 }}>
              <TouchableOpacity
                onPress={() => setViewMode('day')}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  backgroundColor: viewMode === 'day' ? colors.primary : 'transparent'
                }}
              >
                <Text style={{ color: viewMode === 'day' ? '#ffffff' : textColor, fontFamily: 'Montserrat_500Medium' }}>День</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewMode('week')}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  backgroundColor: viewMode === 'week' ? colors.primary : 'transparent'
                }}
              >
                <Text style={{ color: viewMode === 'week' ? '#ffffff' : textColor, fontFamily: 'Montserrat_500Medium' }}>Неделя</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => viewMode === 'day' ? changeDate(-1) : changeWeek(-1)}
                style={{ padding: 8 }}
              >
                <Icon name="chevron-back" size={24} color={colors.primary} />
              </TouchableOpacity>
              
              <Text style={{ color: textColor, fontWeight: '500', marginHorizontal: 8, fontFamily: 'Montserrat_500Medium' }}>
                {viewMode === 'day' ? formatDate(currentDate) : `Неделя ${currentWeek}`}
              </Text>
              
              <TouchableOpacity
                onPress={() => viewMode === 'day' ? changeDate(1) : changeWeek(1)}
                style={{ padding: 8 }}
              >
                <Icon name="chevron-forward" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Расписание */}
          {loadingSchedule ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : scheduleData && scheduleData.days && viewMode === 'week' ? (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: textColor, fontFamily: 'Montserrat_600SemiBold' }}>
                  Расписание для {selectedGroup}
                </Text>
                <Text style={{ color: placeholderColor, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
                  Неделя: {scheduleData.week_number} ({scheduleData.dates?.date_start} - {scheduleData.dates?.date_end})
                </Text>
              </View>

              {scheduleData.days.map(day => renderDaySchedule(day))}
            </View>
          ) : scheduleData && viewMode === 'day' ? (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: textColor, fontFamily: 'Montserrat_600SemiBold' }}>
                  Расписание для {selectedGroup}
                </Text>
              </View>
              {renderDailySchedule()}
            </View>
          ) : scheduleData && !loadingSchedule ? (
            <Text style={{ textAlign: 'center', color: placeholderColor, marginTop: 20, fontFamily: 'Montserrat_400Regular' }}>
              На {viewMode === 'day' ? 'этот день' : 'эту неделю'} занятий нет.
            </Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
};

// BottomSheet для настроек внешнего вида
const AppearanceSettingsSheet = ({ visible, onClose, theme, accentColor, setTheme, setAccentColor }) => {
  const bgColor = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const systemColorScheme = useColorScheme();

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    await SecureStore.setItemAsync('theme', newTheme);
  };

  const handleAccentColorChange = async (newColor) => {
    setAccentColor(newColor);
    await SecureStore.setItemAsync('accentColor', newColor);
  };

  const getEffectiveTheme = () => {
    if (theme === 'auto') return systemColorScheme;
    return theme;
  };

  const effectiveTheme = getEffectiveTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.bottomSheet, { backgroundColor: bgColor }]}>
          <View style={styles.sheetHandle} />
          
          <Text style={[styles.sheetTitle, { color: textColor, fontFamily: 'Montserrat_600SemiBold' }]}>
            Внешний вид
          </Text>
          
          <View style={styles.sheetSection}>
            <Text style={[styles.sheetSectionTitle, { color: textColor, fontFamily: 'Montserrat_500Medium' }]}>
              Тема
            </Text>
            
            <View style={styles.sheetOptions}>
              <TouchableOpacity
                style={[
                  styles.sheetOption,
                  { 
                    backgroundColor: theme === 'light' ? ACCENT_COLORS[accentColor].light : 'transparent',
                    borderColor: theme === 'light' ? ACCENT_COLORS[accentColor].primary : 'transparent'
                  }
                ]}
                onPress={() => handleThemeChange('light')}
              >
                <Icon name="sunny-outline" size={20} color={theme === 'light' ? ACCENT_COLORS[accentColor].primary : textColor} />
                <Text style={[styles.sheetOptionText, { 
                  color: theme === 'light' ? ACCENT_COLORS[accentColor].primary : textColor,
                  fontFamily: 'Montserrat_400Regular' 
                }]}>
                  Светлая
                </Text>
                {theme === 'light' && <Icon name="checkmark" size={20} color={ACCENT_COLORS[accentColor].primary} />}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.sheetOption,
                  { 
                    backgroundColor: theme === 'dark' ? ACCENT_COLORS[accentColor].light : 'transparent',
                    borderColor: theme === 'dark' ? ACCENT_COLORS[accentColor].primary : 'transparent'
                  }
                ]}
                onPress={() => handleThemeChange('dark')}
              >
                <Icon name="moon-outline" size={20} color={theme === 'dark' ? ACCENT_COLORS[accentColor].primary : textColor} />
                <Text style={[styles.sheetOptionText, { 
                  color: theme === 'dark' ? ACCENT_COLORS[accentColor].primary : textColor,
                  fontFamily: 'Montserrat_400Regular' 
                }]}>
                  Темная
                </Text>
                {theme === 'dark' && <Icon name="checkmark" size={20} color={ACCENT_COLORS[accentColor].primary} />}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.sheetOption,
                  { 
                    backgroundColor: theme === 'auto' ? ACCENT_COLORS[accentColor].light : 'transparent',
                    borderColor: theme === 'auto' ? ACCENT_COLORS[accentColor].primary : 'transparent'
                  }
                ]}
                onPress={() => handleThemeChange('auto')}
              >
                <Icon name="phone-portrait-outline" size={20} color={theme === 'auto' ? ACCENT_COLORS[accentColor].primary : textColor} />
                <Text style={[styles.sheetOptionText, { 
                  color: theme === 'auto' ? ACCENT_COLORS[accentColor].primary : textColor,
                  fontFamily: 'Montserrat_400Regular' 
                }]}>
                  Системная
                </Text>
                {theme === 'auto' && <Icon name="checkmark" size={20} color={ACCENT_COLORS[accentColor].primary} />}
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.sheetSection}>
            <Text style={[styles.sheetSectionTitle, { color: textColor, fontFamily: 'Montserrat_500Medium' }]}>
              Акцентный цвет
            </Text>
            
            <View style={styles.colorOptions}>
              <TouchableOpacity
                style={[styles.colorOption, { backgroundColor: ACCENT_COLORS.green.primary }]}
                onPress={() => handleAccentColorChange('green')}
              >
                {accentColor === 'green' && <Icon name="checkmark" size={20} color="#ffffff" />}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.colorOption, { backgroundColor: ACCENT_COLORS.blue.primary }]}
                onPress={() => handleAccentColorChange('blue')}
              >
                {accentColor === 'blue' && <Icon name="checkmark" size={20} color="#ffffff" />}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.colorOption, { backgroundColor: ACCENT_COLORS.purple.primary }]}
                onPress={() => handleAccentColorChange('purple')}
              >
                {accentColor === 'purple' && <Icon name="checkmark" size={20} color="#ffffff" />}
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.sheetButton, { backgroundColor: ACCENT_COLORS[accentColor].primary }]}
            onPress={onClose}
          >
            <Text style={[styles.sheetButtonText, { color: '#ffffff', fontFamily: 'Montserrat_600SemiBold' }]}>
              Готово
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Модальное окно "О приложении"
const AboutModal = ({ visible, onClose, theme, accentColor }) => {
  const bgColor = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const colors = ACCENT_COLORS[accentColor];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.bottomSheet, { backgroundColor: bgColor }]}>
          <View style={styles.sheetHandle} />
          
          <Text style={[styles.sheetTitle, { color: textColor, fontFamily: 'Montserrat_600SemiBold' }]}>
            О приложении
          </Text>
          
          <ScrollView style={styles.aboutContent}>
            <Text style={[styles.aboutText, { color: textColor }]}>
              Мой ХГУ - мобильное приложение для студентов Хакасского государственного университета.
              {"\n\n"}
              Основные возможности:
              {"\n"}
              • Просмотр расписания занятий по группам
              {"\n"}
              • Чтение новостей университета
              {"\n"}
              • Настройка внешнего вида приложения
              {"\n"}
              • Офлайн-доступ к расписанию и новостям
              {"\n\n"}
              Приложение разработано для удобного доступа к актуальной информации об учебном процессе.
              {"\n\n"}
              Версия: 1.0.0
              {"\n\n"}
              Разработано с ❤️ студентами группы 125-1 в составе команды PRO100BYTE Team
            </Text>
          </ScrollView>
          
          <TouchableOpacity
            style={[styles.sheetButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={[styles.sheetButtonText, { color: '#ffffff', fontFamily: 'Montserrat_600SemiBold' }]}>
              Закрыть
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Экран настроек
const SettingsScreen = ({ theme, accentColor, setTheme, setAccentColor }) => {
  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const colors = ACCENT_COLORS[accentColor];
  const [appearanceSheetVisible, setAppearanceSheetVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  const clearCache = () => {
    Alert.alert(
      'Очистка кэша',
      'После очистки кэша вы не сможете просматривать расписание и новости в оффлайн-режиме, пока не загрузите их повторно. Продолжить?',
      [
        {
          text: 'Отмена',
          style: 'cancel'
        },
        {
          text: 'Очистить',
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              for (const key of keys) {
                await AsyncStorage.removeItem(key);
              }
              Alert.alert('Успех', 'Кэш успешно очищен');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Ошибка', 'Не удалось очистить кэш');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const openGitHub = () => {
    Linking.openURL('https://github.com/PRO100BYTE/MyKHSU');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bgColor, padding: 16 }}>
      {/* Настройки внешнего вида */}
      <TouchableOpacity 
        style={{ 
          backgroundColor: cardBg, 
          borderRadius: 12, 
          padding: 16, 
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center'
        }}
        onPress={() => setAppearanceSheetVisible(true)}
      >
        <View style={{ backgroundColor: colors.light, borderRadius: 8, padding: 8, marginRight: 12 }}>
          <Icon name="color-palette-outline" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Montserrat_500Medium' }}>Внешний вид</Text>
          <Text style={{ color: placeholderColor, fontSize: 14, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
            Настройте тему и цветовую схему приложения
          </Text>
        </View>
        <Icon name="chevron-forward" size={20} color={placeholderColor} />
      </TouchableOpacity>

      {/* О приложении */}
      <TouchableOpacity 
        style={{ 
          backgroundColor: cardBg, 
          borderRadius: 12, 
          padding: 16, 
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center'
        }}
        onPress={() => setAboutModalVisible(true)}
      >
        <View style={{ backgroundColor: colors.light, borderRadius: 8, padding: 8, marginRight: 12 }}>
          <Icon name="information-circle-outline" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Montserrat_500Medium' }}>О приложении</Text>
          <Text style={{ color: placeholderColor, fontSize: 14, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
            Информация о приложении и его возможностях
          </Text>
        </View>
        <Icon name="chevron-forward" size={20} color={placeholderColor} />
      </TouchableOpacity>

      {/* GitHub репозиторий */}
      <TouchableOpacity 
        style={{ 
          backgroundColor: cardBg, 
          borderRadius: 12, 
          padding: 16, 
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center'
        }}
        onPress={openGitHub}
  >
        <View style={{ backgroundColor: colors.light, borderRadius: 8, padding: 8, marginRight: 12 }}>
          <Icon name="logo-github" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Montserrat_500Medium' }}>GitHub репозиторий</Text>
          <Text style={{ color: placeholderColor, fontSize: 14, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
            Исходный код проекта на GitHub
          </Text>
        </View>
        <Icon name="chevron-forward" size={20} color={placeholderColor} />
      </TouchableOpacity>

      {/* Очистка кэша */}
      <TouchableOpacity 
        style={{ 
          backgroundColor: cardBg, 
          borderRadius: 12, 
          padding: 16, 
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center'
        }}
        onPress={clearCache}
      >
        <View style={{ backgroundColor: colors.light, borderRadius: 8, padding: 8, marginRight: 12 }}>
          <Icon name="trash-outline" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Montserrat_500Medium' }}>Очистка кэша</Text>
          <Text style={{ color: placeholderColor, fontSize: 14, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
            Удалить все сохраненные данные приложения
          </Text>
        </View>
        <Icon name="chevron-forward" size={20} color={placeholderColor} />
      </TouchableOpacity>

      <AppearanceSettingsSheet
        visible={appearanceSheetVisible}
        onClose={() => setAppearanceSheetVisible(false)}
        theme={theme}
        accentColor={accentColor}
        setTheme={setTheme}
        setAccentColor={setAccentColor}
      />

      <AboutModal
        visible={aboutModalVisible}
        onClose={() => setAboutModalVisible(false)}
        theme={theme}
        accentColor={accentColor}
      />
    </ScrollView>
  );
};

// Стили
const styles = StyleSheet.create({
  flexCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold'
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8
  },
  tabText: {
    fontSize: 12,
    marginTop: 4
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16
  },
  placeholderText: {
    textAlign: 'center'
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#9ca3af',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  sheetSection: {
    marginBottom: 24,
  },
  sheetSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sheetOptions: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sheetOptionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  colorOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  sheetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  aboutContent: {
    maxHeight: 300,
    marginBottom: 20,
  },
  aboutText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Montserrat_400Regular',
  },
});

// Главный компонент приложения
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState('Расписание');
  const [theme, setTheme] = useState('auto');
  const [accentColor, setAccentColor] = useState('green');
  const systemColorScheme = useColorScheme();

  let [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  useEffect(() => {
    // Загружаем сохраненные настройки
    const loadSettings = async () => {
      try {
        const savedTheme = await SecureStore.getItemAsync('theme');
        const savedAccentColor = await SecureStore.getItemAsync('accentColor');
        
        if (savedTheme) setTheme(savedTheme);
        if (savedAccentColor) setAccentColor(savedAccentColor);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
    
    // Показываем splash screen на 2 секунды
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  }, []);
  
  const getEffectiveTheme = () => {
    if (theme === 'auto') return systemColorScheme;
    return theme;
  };

  const effectiveTheme = getEffectiveTheme();
  
  if (!fontsLoaded || isLoading) {
    return <SplashScreen accentColor={accentColor} />;
  }
  
  const bgColor = effectiveTheme === 'light' ? '#f3f4f6' : '#111827';
  const headerBg = effectiveTheme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = effectiveTheme === 'light' ? '#111827' : '#ffffff';
  const colors = ACCENT_COLORS[accentColor];
  
  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Заголовок - убрана кнопка настроек */}
      <View style={{ 
        padding: 16, 
        paddingTop: Platform.OS === 'ios' ? 50 : 40, 
        backgroundColor: headerBg,
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: textColor, fontFamily: 'Montserrat_600SemiBold' }}>
          {activeScreen}
        </Text>
      </View>
      
      {/* Контент */}
      <View style={{ flex: 1 }}>
        {activeScreen === 'Расписание' && <ScheduleScreen theme={effectiveTheme} accentColor={accentColor} />}
        {activeScreen === 'Карта' && <PlaceholderScreen title="Карта" theme={effectiveTheme} />}
        {activeScreen === 'Первокурснику' && <PlaceholderScreen title="Первокурснику" theme={effectiveTheme} />}
        {activeScreen === 'Новости' && <NewsScreen theme={effectiveTheme} accentColor={accentColor} />}
        {activeScreen === 'Настройки' && (
          <SettingsScreen 
            theme={effectiveTheme} 
            accentColor={accentColor} 
            setTheme={setTheme} 
            setAccentColor={setAccentColor} 
          />
        )}
      </View>
      
      {/* Навигация */}
      <View style={{ 
        flexDirection: 'row', 
        backgroundColor: headerBg,
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        paddingHorizontal: 4,
        paddingVertical: 8
      }}>
        <TabButton 
          icon="calendar-outline" 
          label="Расписание" 
          isActive={activeScreen === 'Расписание'} 
          onPress={() => setActiveScreen('Расписание')}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="map-outline" 
          label="Карта" 
          isActive={activeScreen === 'Карта'} 
          onPress={() => setActiveScreen('Карта')}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="book-outline" 
          label="Первокурснику" 
          isActive={activeScreen === 'Первокурснику'} 
          onPress={() => setActiveScreen('Первокурснику')}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="newspaper-outline" 
          label="Новости" 
          isActive={activeScreen === 'Новости'} 
          onPress={() => setActiveScreen('Новости')}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="settings-outline" 
          label="Настройки" 
          isActive={activeScreen === 'Настройки'} 
          onPress={() => setActiveScreen('Настройки')}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
      </View>
    </View>
  );
}