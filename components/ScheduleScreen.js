import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getWithExpiry, setWithExpiry, safeJsonParse } from '../utils/cache';
import { getWeekNumber, formatDate, getDateByWeekAndDay } from '../utils/dateUtils';
import { API_BASE_URL, CORS_PROXY, ACCENT_COLORS } from '../utils/constants';
import ConnectionError from './ConnectionError';
import NetInfo from '@react-native-community/netinfo';

const { width } = Dimensions.get('window');

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
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const colors = ACCENT_COLORS[accentColor];
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';

  useEffect(() => {
    // Проверяем подключение к интернету
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });

    fetchGroupsForCourse(course);
    fetchPairsTime();

    return () => unsubscribe();
  }, [course]);

  useEffect(() => {
    if (selectedGroup) {
      fetchScheduleData(selectedGroup);
    }
  }, [viewMode, currentDate, currentWeek, selectedGroup]);

  const fetchGroupsForCourse = async (course) => {
    setLoadingGroups(true);
    setError(null);
    
    try {
      const cacheKey = `groups_${course}`;
      const cached = await getWithExpiry(cacheKey);
      
      if (cached) {
        setGroups(cached.groups || []);
      } else if (isOnline) {
        const targetUrl = `${API_BASE_URL}/getgroups/${course}`;
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(targetUrl)}`);
        const data = await safeJsonParse(response);
        setGroups(data.groups || []);
        await setWithExpiry(cacheKey, data);
      } else {
        setError('no-internet');
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('load-error');
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchScheduleData = async (group) => {
    setSelectedGroup(group);
    setLoadingSchedule(true);
    setError(null);
    
    try {
      if (viewMode === 'week') {
        const cacheKey = `schedule_${group}_${currentWeek}`;
        const cached = await getWithExpiry(cacheKey);
        
        if (cached) {
          setScheduleData(cached);
        } else if (isOnline) {
          const targetUrl = `${API_BASE_URL}/getpairsweek?type=group&data=${group}&week=${currentWeek}`;
          const response = await fetch(`${CORS_PROXY}${encodeURIComponent(targetUrl)}`);
          const data = await safeJsonParse(response);
          setScheduleData(data);
          await setWithExpiry(cacheKey, data, 60 * 60 * 1000);
        } else {
          setError('no-internet');
        }
      } else {
        const formattedDate = formatDate(currentDate);
        const cacheKey = `schedule_${group}_${formattedDate}`;
        const cached = await getWithExpiry(cacheKey);
        
        if (cached) {
          setScheduleData(cached);
        } else if (isOnline) {
          const targetUrl = `${API_BASE_URL}/getpairs/date:${group}:${formattedDate}`;
          const response = await fetch(`${CORS_PROXY}${encodeURIComponent(targetUrl)}`);
          const data = await safeJsonParse(response);
          setScheduleData(data);
          await setWithExpiry(cacheKey, data, 60 * 60 * 1000);
        } else {
          setError('no-internet');
        }
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setError('load-error');
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
      } else if (isOnline) {
        const targetUrl = `${API_BASE_URL}/getpairstime`;
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(targetUrl)}`);
        const data = await safeJsonParse(response);
        setPairsTime(data.pairs_time || []);
        await setWithExpiry(cacheKey, data);
      }
    } catch (error) {
      console.error('Error fetching pairs time:', error);
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
    setCurrentWeek(currentWeek + weeks);
  };

  const handleRetry = () => {
    setError(null);
    if (isOnline) {
      if (selectedGroup) {
        fetchScheduleData(selectedGroup);
      } else {
        fetchGroupsForCourse(course);
      }
    } else {
      setError('no-internet');
    }
  };

  const weekdays = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

  const renderDaySchedule = (day) => {
    if (!day || !day.lessons) return null;
    
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Icon name="book-outline" size={14} color={placeholderColor} />
                  <Text style={{ color: placeholderColor, marginLeft: 8, fontSize: 14, fontFamily: 'Montserrat_400Regular' }}>
                    Пара №{lesson.time}
                  </Text>
                </View>
                
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
    
    if (!daySchedule) return null;
    
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Icon name="book-outline" size={14} color={placeholderColor} />
                  <Text style={{ color: placeholderColor, marginLeft: 8, fontSize: 14, fontFamily: 'Montserrat_400Regular' }}>
                    Пара №{lesson.time}
                  </Text>
                </View>
                
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

  // Если есть ошибка, показываем соответствующий экран
  if (error && !loadingGroups && !loadingSchedule) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <ConnectionError 
          type={error}
          loading={false}
          onRetry={handleRetry}
          theme={theme}
          accentColor={accentColor}
          message={error === 'no-internet' ? 'Расписание недоступно без подключения к интернету' : 'Не удалось загрузить расписание'}
        />
      </View>
    );
  }

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

              {scheduleData.days.map(day => 
                day && day.lessons ? renderDaySchedule(day) : null
              )}
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
      
      {!isOnline && !error && (
        <View style={{ 
          backgroundColor: colors.light, 
          padding: 16, 
          borderRadius: 8, 
          alignItems: 'center',
          marginTop: 16
        }}>
          <Icon name="cloud-offline-outline" size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, marginTop: 8, textAlign: 'center', fontFamily: 'Montserrat_400Regular' }}>
            Нет подключения к интернету. Показаны ранее загруженные данные.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // Стили могут быть добавлены при необходимости
});

export default ScheduleScreen;