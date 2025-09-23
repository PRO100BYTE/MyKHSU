import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getWeekNumber, formatDate, getDateByWeekAndDay } from '../utils/dateUtils';
import { ACCENT_COLORS } from '../utils/constants';
import ConnectionError from './ConnectionError';
import NetInfo from '@react-native-community/netinfo';
import ApiService from '../utils/api';
import notificationService from '../utils/notificationService';

const { width } = Dimensions.get('window');

const ScheduleScreen = ({ theme, accentColor }) => {
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

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const colors = ACCENT_COLORS[accentColor];
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';

  // Обновляем текущее время каждую минуту
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Обновляем каждую минуту

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Проверяем подключение к интернету
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      
      // Если появилось соединение, сбрасываем флаг показа кэша
      if (state.isConnected) {
        setShowCachedData(false);
      }
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

  // Проверяем, является ли пара текущей
  const isCurrentLesson = (lesson, pairTime) => {
    if (!pairTime) return false;
    
    const now = currentTime;
    const [startHours, startMinutes] = pairTime.time_start.split(':').map(Number);
    const [endHours, endMinutes] = pairTime.time_end.split(':').map(Number);
    
    const startTime = new Date(now);
    startTime.setHours(startHours, startMinutes, 0, 0);
    
    const endTime = new Date(now);
    endTime.setHours(endHours, endMinutes, 0, 0);
    
    return now >= startTime && now <= endTime;
  };

  // Проверяем, является ли пара следующей
  const isNextLesson = (lesson, pairTime, index, lessons) => {
    if (!pairTime) return false;
    
    const now = currentTime;
    const [startHours, startMinutes] = pairTime.time_start.split(':').map(Number);
    
    const startTime = new Date(now);
    startTime.setHours(startHours, startMinutes, 0, 0);
    
    // Следующая пара - первая после текущего времени
    return now < startTime && (index === 0 || !isCurrentLesson(lessons[index - 1], 
      pairsTime.find(p => p.time === lessons[index - 1].time)));
  };

  // Получаем стиль для пары в зависимости от ее статуса
  const getLessonStyle = (lesson, pairTime, index, lessons) => {
    if (isCurrentLesson(lesson, pairTime)) {
      return {
        backgroundColor: colors.primary + '20', // Полупрозрачный акцентный цвет
        borderColor: colors.primary,
        borderWidth: 2,
      };
    } else if (isNextLesson(lesson, pairTime, index, lessons)) {
      return {
        backgroundColor: theme === 'light' ? colors.light : '#2d3748',
        borderColor: colors.primary,
        borderWidth: 1,
      };
    }
    
    return {
      backgroundColor: cardBg,
      borderColor: borderColor,
      borderWidth: 1,
    };
  };

  // Получаем цвет текста для пары
  const getLessonTextColor = (lesson, pairTime) => {
    if (isCurrentLesson(lesson, pairTime)) {
      return colors.primary;
    }
    return textColor;
  };

  // Остальной код компонента остается без изменений до функции renderDailySchedule...

  const renderDailySchedule = () => {
    if (!scheduleData) return null;
    
    const weekday = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
    const daySchedule = scheduleData.days ? 
      scheduleData.days.find(d => d.weekday === weekday) : 
      { lessons: scheduleData.lessons || [] };
    
    if (!daySchedule || !daySchedule.lessons) return null;
    
    return (
      <View style={{ marginBottom: 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: textColor, fontFamily: 'Montserrat_600SemiBold' }}>
            Расписание для {selectedGroup}
          </Text>
          <Text style={{ color: placeholderColor, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
            {formatDate(currentDate)}
          </Text>
        </View>

        {daySchedule.lessons.length > 0 ? (
          daySchedule.lessons.map((lesson, index) => {
            const pairTime = getTimeForLesson(lesson.time);
            const lessonStyle = getLessonStyle(lesson, pairTime, index, daySchedule.lessons);
            const textColorStyle = getLessonTextColor(lesson, pairTime);
            
            return (
              <View 
                key={lesson.id} 
                style={[{
                  borderRadius: 12, 
                  padding: 16, 
                  marginBottom: 12,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3.84,
                  elevation: 3,
                }, lessonStyle]}
              >
                {/* Индикатор текущей пары */}
                {isCurrentLesson(lesson, pairTime) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ 
                      backgroundColor: colors.primary, 
                      paddingHorizontal: 8, 
                      paddingVertical: 2, 
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}>
                      <Icon name="time" size={12} color="#ffffff" />
                      <Text style={{ color: '#ffffff', fontSize: 12, marginLeft: 4, fontFamily: 'Montserrat_500Medium' }}>
                        Сейчас
                      </Text>
                    </View>
                  </View>
                )}
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', fontSize: 16, color: textColorStyle, fontFamily: 'Montserrat_500Medium' }}>
                      {lesson.subject}
                    </Text>
                    <Text style={{ color: isCurrentLesson(lesson, pairTime) ? colors.primary : placeholderColor, fontSize: 14, fontFamily: 'Montserrat_400Regular' }}>
                      {lesson.type_lesson}
                    </Text>
                  </View>
                  
                  {pairTime && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: textColorStyle, fontWeight: '600', fontFamily: 'Montserrat_500Medium' }}>
                        {pairTime.time_start} - {pairTime.time_end}
                      </Text>
                      <Text style={{ color: isCurrentLesson(lesson, pairTime) ? colors.primary : placeholderColor, fontSize: 12, fontFamily: 'Montserrat_400Regular' }}>
                        Пара №{lesson.time}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Icon name="person-outline" size={14} color={isCurrentLesson(lesson, pairTime) ? colors.primary : placeholderColor} />
                  <Text style={{ color: textColorStyle, marginLeft: 8, fontSize: 14, fontFamily: 'Montserrat_400Regular' }}>
                    {lesson.teacher}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Icon name="location-outline" size={14} color={isCurrentLesson(lesson, pairTime) ? colors.primary : placeholderColor} />
                  <Text style={{ color: textColorStyle, marginLeft: 8, fontSize: 14, fontFamily: 'Montserrat_400Regular' }}>
                    Аудитория: {lesson.auditory}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={{ 
            backgroundColor: cardBg, 
            borderRadius: 12, 
            padding: 40, 
            alignItems: 'center',
            borderWidth: 1,
            borderColor
          }}>
            <Icon name="calendar-outline" size={48} color={placeholderColor} />
            <Text style={{ color: placeholderColor, marginTop: 16, fontSize: 16, fontFamily: 'Montserrat_400Regular' }}>
              Занятий нет
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Аналогично обновляем renderDaySchedule для недельного режима...

  const renderDaySchedule = (day) => {
    if (!day || !day.lessons) return null;
    
    const date = getDateByWeekAndDay(currentWeek, day.weekday);
    const isToday = new Date().toDateString() === date.toDateString();
    
    return (
      <View 
        key={day.weekday} 
        style={{ 
          backgroundColor: cardBg, 
          borderRadius: 12, 
          padding: 16, 
          marginBottom: 16,
          borderWidth: 1,
          borderColor: isToday ? colors.primary : borderColor
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: isToday ? colors.primary : textColor, fontFamily: 'Montserrat_600SemiBold' }}>
            {weekdays[day.weekday - 1]}
          </Text>
          <Text style={{ color: isToday ? colors.primary : placeholderColor, fontFamily: 'Montserrat_400Regular' }}>
            {formatDate(date)}
          </Text>
        </View>

        {day.lessons.length > 0 ? (
          day.lessons.map((lesson, index) => {
            const pairTime = getTimeForLesson(lesson.time);
            const lessonStyle = getLessonStyle(lesson, pairTime, index, day.lessons);
            const textColorStyle = getLessonTextColor(lesson, pairTime);
            
            return (
              <View 
                key={lesson.id} 
                style={[{
                  paddingVertical: 12, 
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  marginTop: 8,
                }, lessonStyle]}
              >
                {isCurrentLesson(lesson, pairTime) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <View style={{ 
                      backgroundColor: colors.primary, 
                      paddingHorizontal: 6, 
                      paddingVertical: 2, 
                      borderRadius: 8,
                    }}>
                      <Text style={{ color: '#ffffff', fontSize: 10, fontFamily: 'Montserrat_500Medium' }}>
                        СЕЙЧАС
                      </Text>
                    </View>
                  </View>
                )}
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: textColorStyle, fontSize: 14, fontFamily: 'Montserrat_500Medium' }}>
                      {lesson.subject}
                    </Text>
                    <Text style={{ color: isCurrentLesson(lesson, pairTime) ? colors.primary : placeholderColor, fontSize: 12, fontFamily: 'Montserrat_400Regular' }}>
                      {lesson.type_lesson}
                    </Text>
                  </View>
                  
                  {pairTime && (
                    <Text style={{ color: textColorStyle, fontSize: 12, fontFamily: 'Montserrat_400Regular' }}>
                      {pairTime.time_start}
                    </Text>
                  )}
                </View>
                
                <Text style={{ color: textColorStyle, fontSize: 12, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
                  {lesson.teacher} • {lesson.auditory}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={{ color: placeholderColor, marginTop: 12, fontFamily: 'Montserrat_400Regular', textAlign: 'center' }}>
            Занятий нет
          </Text>
        )}
      </View>
    );
  };

  // Остальной код компонента остается без изменений...
  // [Остальная часть кода ScheduleScreen без изменений]
};

const styles = StyleSheet.create({
  // Стили могут быть добавлены при необходимости
});

export default ScheduleScreen;