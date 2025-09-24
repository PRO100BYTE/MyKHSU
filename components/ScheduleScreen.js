import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getWeekNumber, formatDate } from '../utils/dateUtils';
import { ACCENT_COLORS } from '../utils/constants';
import ConnectionError from './ConnectionError';
import NetInfo from '@react-native-community/netinfo';
import ApiService from '../utils/api';
import notificationService from '../utils/notificationService';
import { 
  isCurrentLesson, 
  getLessonDateForWeek, 
  isCurrentDay,
  processGroupsData,
  getCurrentLessonStyle 
} from '../utils/scheduleUtils';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

const ScheduleScreen = ({ theme, accentColor }) => {
  // Существующие состояния
  const [course, setCourse] = useState(1);
  const [groups, setGroups] = useState([]);
  const [cachedGroups, setCachedGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [cachedScheduleData, setCachedScheduleData] = useState(null);
  const [pairsTime, setPairsTime] = useState([]);
  const [cachedPairsTime, setCachedPairsTime] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(getWeekNumber(new Date()));
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showCachedData, setShowCachedData] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Новые состояния для режима преподавателя
  const [scheduleFormat, setScheduleFormat] = useState('student');
  const [defaultGroup, setDefaultGroup] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [isTeacherMode, setIsTeacherMode] = useState(false);

  // Цвета и константы
  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const colors = ACCENT_COLORS[accentColor];
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  
  // Загрузка настроек формата
  useEffect(() => {
    loadScheduleFormatSettings();
  }, []);

  // Обновление текущего времени
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      if (state.isConnected) {
        setShowCachedData(false);
      }
    });

    if (!isTeacherMode) {
      fetchGroupsForCourse(course);
    }
    fetchPairsTime();

    return () => unsubscribe();
  }, [course, isTeacherMode]);

  useEffect(() => {
    if (!isTeacherMode && selectedGroup) {
      fetchScheduleData(selectedGroup);
    }
  }, [viewMode, currentDate, selectedGroup]);
  
  const loadScheduleFormatSettings = async () => {
    try {
      const format = await SecureStore.getItemAsync('schedule_format') || 'student';
      const group = await SecureStore.getItemAsync('default_group') || '';
      const teacher = await SecureStore.getItemAsync('teacher_name') || '';
      
      setScheduleFormat(format);
      setDefaultGroup(group);
      setTeacherName(teacher);
      setIsTeacherMode(format === 'teacher');
      
      if (format === 'teacher' && teacher) {
        // Если режим преподавателя, загружаем расписание преподавателя
        await fetchTeacherSchedule(teacher);
      } else if (format === 'student') {
        // Если режим студента, загружаем группы
        await fetchGroupsForCourse(course);
      }
    } catch (error) {
      console.error('Error loading schedule format settings:', error);
    }
  };

  const fetchGroupsForCourse = async (course) => {
    setLoadingGroups(true);
    setError(null);
    setShowCachedData(false);
    
    try {
      const result = await ApiService.getGroups(course);
      
      if (result.data && result.data.groups) {
        setGroups(result.data.groups);
        setCachedGroups(result.data.groups);
        setCacheInfo(result);
        
        if (result.source === 'cache' || result.source === 'stale_cache') {
          setShowCachedData(true);
        }
      } else {
        throw new Error('INVALID_RESPONSE');
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      
      if (cachedGroups.length > 0) {
        setGroups(cachedGroups);
        setShowCachedData(true);
        setCacheInfo({ source: 'stale_cache', cacheInfo: { cacheDate: new Date().toISOString() } });
      } else {
        setError(error.message || 'load-error');
      }
    } finally {
      setLoadingGroups(false);
    }
  };
  
  // Загрузка расписания преподавателя
  const fetchTeacherSchedule = async (teacher, week = null) => {
    setLoadingSchedule(true);
    setError(null);
    setShowCachedData(false);
    
    try {
      const result = await ApiService.getTeacherSchedule(teacher, week || currentWeek);
      
      if (result.data) {
        setScheduleData(result.data);
        setCacheInfo(result);
        
        if (result.source === 'cache' || result.source === 'stale_cache') {
          setShowCachedData(true);
        }
      } else {
        throw new Error('INVALID_RESPONSE');
      }
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
      setError(error.message || 'load-error');
    } finally {
      setLoadingSchedule(false);
      setRefreshing(false);
    }
  };

  const fetchScheduleData = async (group) => {
    if (isTeacherMode) {
      await fetchTeacherSchedule(teacherName);
      return;
    }
    
    // Существующий код загрузки студенческого расписания
    setSelectedGroup(group);
    setLoadingSchedule(true);
    setError(null);
    setShowCachedData(false);
    
    try {
      let result;
      
      if (viewMode === 'week') {
        result = await ApiService.getSchedule(group, null, currentWeek);
      } else {
        result = await ApiService.getSchedule(group, currentDate);
      }
      
      if (result.data) {
        setScheduleData(result.data);
        setCachedScheduleData(result.data);
        setCacheInfo(result);
        
        if (result.source === 'cache' || result.source === 'stale_cache') {
          setShowCachedData(true);
        }

        try {
          await notificationService.scheduleLessonNotifications(result.data, pairsTime);
        } catch (notifyError) {
          console.error('Error scheduling notifications:', notifyError);
        }
      } else {
        throw new Error('INVALID_RESPONSE');
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      
      if (cachedScheduleData) {
        setScheduleData(cachedScheduleData);
        setShowCachedData(true);
        setCacheInfo({ source: 'stale_cache', cacheInfo: { cacheDate: new Date().toISOString() } });
      } else {
        setError(error.message || 'load-error');
      }
    } finally {
      setLoadingSchedule(false);
      setRefreshing(false);
    }
  };

  const fetchPairsTime = async () => {
    try {
      const result = await ApiService.getPairsTime();
      
      if (result.data && result.data.pairs_time) {
        setPairsTime(result.data.pairs_time);
        setCachedPairsTime(result.data.pairs_time);
      }
    } catch (error) {
      console.error('Error fetching pairs time:', error);
      if (cachedPairsTime.length > 0) {
        setPairsTime(cachedPairsTime);
      }
    }
  };

  const getTimeForLesson = (timeNumber) => {
    return pairsTime.find(pair => pair.time === timeNumber);
  };

  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };
  
  const changeWeek = (weeks) => {
    const newWeek = currentWeek + weeks;
    setCurrentWeek(newWeek);
    
    if (isTeacherMode && teacherName) {
      fetchTeacherSchedule(teacherName, newWeek);
    } else if (selectedGroup) {
      // The useEffect for currentWeek will trigger fetchScheduleData for students
    }
  };

  const handleRetry = () => {
    setError(null);
    setShowCachedData(false);
    if (isTeacherMode) {
        fetchTeacherSchedule(teacherName);
    } else if (selectedGroup) {
      fetchScheduleData(selectedGroup);
    } else {
      fetchGroupsForCourse(course);
    }
  };

  const handleViewCache = () => {
    if (cachedScheduleData) {
      setScheduleData(cachedScheduleData);
      setShowCachedData(true);
      setError(null);
      setCacheInfo({ source: 'stale_cache', cacheInfo: { cacheDate: new Date().toISOString() } });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (isTeacherMode) {
        fetchTeacherSchedule(teacherName);
    } else if (selectedGroup) {
      fetchScheduleData(selectedGroup);
    } else {
      fetchGroupsForCourse(course);
    }
  };
  
  const weekdays = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

  // Рендеринг расписания (остается в основном без изменений, так как структура данных одинакова)
  const renderDaySchedule = (day) => {
    // ... существующий код ...
  };
  const renderDailySchedule = () => {
    // ... существующий код ...
  };

  // Обновленный рендеринг заголовка
  const renderHeader = () => {
    if (isTeacherMode) {
      return (
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: textColor, fontFamily: 'Montserrat_600SemiBold' }}>
            Расписание для преподавателя
          </Text>
          <Text style={{ color: colors.primary, marginTop: 4, fontFamily: 'Montserrat_500Medium' }}>
            {teacherName}
          </Text>
        </View>
      );
    }
    
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: textColor, fontWeight: '500', textAlign: 'center', fontFamily: 'Montserrat_500Medium' }}>
          Сегодня: {formatDate(new Date())}
        </Text>
      </View>
    );
  };
  
  // Обновленный рендеринг управления
  const renderControls = () => {
    if (isTeacherMode) {
      return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: textColor, fontWeight: '500', fontFamily: 'Montserrat_500Medium' }}>
            Недельное расписание
          </Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => changeWeek(-1)} style={{ padding: 8 }}>
              <Icon name="chevron-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            
            <Text style={{ color: textColor, fontWeight: '500', marginHorizontal: 8, fontFamily: 'Montserrat_500Medium' }}>
              Неделя {currentWeek}
            </Text>
            
            <TouchableOpacity onPress={() => changeWeek(1)} style={{ padding: 8 }}>
              <Icon name="chevron-forward" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    // Существующий код для студенческого режима
    if (selectedGroup) {
        return (
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
        );
    }
    return null;
  };

  if (error && !loadingGroups && !loadingSchedule) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <ConnectionError 
          type={error}
          loading={false}
          onRetry={handleRetry}
          onViewCache={handleViewCache}
          showCacheButton={!!cachedScheduleData}
          cacheAvailable={!!cachedScheduleData}
          theme={theme}
          accentColor={accentColor}
          contentType="schedule"
          message={error === 'NO_INTERNET' ? 'Расписание недоступно без подключения к интернету' : 'Не удалось загрузить расписание'}
        />
      </View>
    );
  }

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: bgColor, padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {showCachedData && (
        <View style={{ 
          backgroundColor: colors.light, 
          padding: 12, 
          borderRadius: 8,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          marginBottom: 16
        }}>
          <Icon name="time-outline" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, marginLeft: 8, fontFamily: 'Montserrat_400Regular' }}>
            {cacheInfo?.source === 'stale_cache' ? 'Показаны ранее загруженные данные' : 'Показаны кэшированные данные'}
          </Text>
        </View>
      )}
      
      {/* Заголовок */}
      {renderHeader()}

      {/* Управление */}
      {renderControls()}
      
      {/* Остальной код остается без изменений, но условно рендерится в зависимости от режима */}
      {!isTeacherMode && (
        <>
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
            {[-1, 1, 2, 3, 4, 5].map(c => (
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
        </>
      )}

      {/* Расписание */}
      {loadingSchedule ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : scheduleData && (isTeacherMode || selectedGroup) ? (
        <View>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            {!isTeacherMode && (
                 <Text style={{ fontSize: 20, fontWeight: 'bold', color: textColor, fontFamily: 'Montserrat_600SemiBold' }}>
                    Расписание для {selectedGroup}
                 </Text>
            )}
            <Text style={{ color: placeholderColor, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
              Неделя: {scheduleData.week_number} ({scheduleData.dates?.date_start} - {scheduleData.dates?.date_end})
            </Text>
          </View>
          {scheduleData.days.map(day => 
            day && day.lessons ? renderDaySchedule(day) : null
          )}
        </View>
      ) : null}

    </ScrollView>
  );
};

export default ScheduleScreen;
