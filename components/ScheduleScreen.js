// components/ScheduleScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getWeekNumber, formatDate, getDateByWeekAndDay } from '../utils/dateUtils';
import { ACCENT_COLORS, COURSES } from '../utils/constants';
import ConnectionError from './ConnectionError';
import ApiService from '../utils/api';
import { useScheduleLogic } from '../hooks/useScheduleLogic';
import { 
  isCurrentLesson, 
  getLessonDateForWeek, 
  isCurrentDay,
  getCurrentLessonStyle 
} from '../utils/scheduleUtils';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const ScheduleScreen = ({ theme, accentColor }) => {
  const [scheduleFormat, setScheduleFormat] = useState('student');
  const [teacherName, setTeacherName] = useState('');
  const [isTeacherMode, setIsTeacherMode] = useState(false);
  const [teacherSchedule, setTeacherSchedule] = useState(null);
  const [loadingTeacher, setLoadingTeacher] = useState(false);
  const [showCourseSelector, setShowCourseSelector] = useState(true);
  const [defaultGroup, setDefaultGroup] = useState('');
  const [defaultCourse, setDefaultCourse] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);

  // Используем хук для логики студенческого режима
  const {
    course,
    setCourse,
    groups,
    selectedGroup,
    setSelectedGroup,
    scheduleData,
    pairsTime,
    loadingGroups,
    loadingSchedule,
    refreshing,
    error,
    isOnline,
    showCachedData,
    cacheInfo,
    currentTime,
    viewMode,
    setViewMode,
    currentDate,
    currentWeek,
    setCurrentWeek,
    handleRetry,
    handleViewCache,
    onRefresh,
    navigateDate,
    setError
  } = useScheduleLogic();

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const colors = ACCENT_COLORS[accentColor];
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';

  // Загрузка настроек при монтировании
  useEffect(() => {
    loadScheduleSettings();
  }, []);

  // Инициализация при первом запуске - устанавливаем настройки по умолчанию только один раз
  useEffect(() => {
    if (!isTeacherMode && defaultGroup && defaultCourse && groups.length > 0 && !selectedGroup && isInitialized) {
      const groupExists = groups.includes(defaultGroup);
      if (groupExists) {
        setSelectedGroup(defaultGroup);
        setCourse(defaultCourse);
        console.log('Инициализация: установлена группа по умолчанию:', defaultGroup, 'курс:', defaultCourse);
      } else if (groups.length > 0) {
        setSelectedGroup(groups[0]);
        console.log('Инициализация: группа по умолчанию не найдена, установлена первая группа:', groups[0]);
      }
    }
  }, [defaultGroup, defaultCourse, groups, isTeacherMode, selectedGroup, isInitialized]);

  const loadScheduleSettings = async () => {
    try {
      const format = await SecureStore.getItemAsync('schedule_format') || 'student';
      const teacher = await SecureStore.getItemAsync('teacher_name') || '';
      const showSelector = await SecureStore.getItemAsync('show_course_selector');
      const group = await SecureStore.getItemAsync('default_group') || '';
      const savedCourse = await SecureStore.getItemAsync('default_course') || '1';
      
      setScheduleFormat(format);
      setTeacherName(teacher);
      setIsTeacherMode(format === 'teacher');
      setShowCourseSelector(showSelector !== 'false');
      setDefaultGroup(group);
      setDefaultCourse(parseInt(savedCourse));

      if (format === 'teacher' && teacher) {
        fetchTeacherSchedule(teacher);
      }
      
      setIsInitialized(true);
      console.log('Настройки расписания загружены. Группа:', group, 'Курс:', savedCourse);
    } catch (error) {
      console.error('Error loading schedule settings:', error);
      setIsInitialized(true);
    }
  };

  const fetchTeacherSchedule = async (teacher, week = null) => {
    if (!teacher) return;
    
    setLoadingTeacher(true);
    setError(null);
    try {
      const result = await ApiService.getTeacherSchedule(teacher, week || currentWeek);
      if (result.data) {
        setTeacherSchedule(result.data);
      } else {
        throw new Error('INVALID_RESPONSE');
      }
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
      setError(error.message || 'load-error');
    } finally {
      setLoadingTeacher(false);
    }
  };

  const changeWeek = (weeks) => {
    const newWeek = currentWeek + weeks;
    setCurrentWeek(newWeek);
    
    if (isTeacherMode && teacherName) {
      fetchTeacherSchedule(teacherName, newWeek);
    }
  };

  const changeDate = (days) => {
    navigateDate(days);
  };

  // Очистка кэша расписания при принудительном обновлении
  const clearScheduleCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const scheduleKeys = keys.filter(key => 
        key.startsWith('schedule_') || 
        key.startsWith('groups_') ||
        key.startsWith('pairs_time')
      );
      
      if (scheduleKeys.length > 0) {
        await AsyncStorage.multiRemove(scheduleKeys);
        console.log('Кэш расписания очищен:', scheduleKeys.length, 'ключей');
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing schedule cache:', error);
      return false;
    }
  };

  // Улучшенная функция обновления с очисткой кэша
  const handleRefresh = async () => {
    if (isOnline) {
      await clearScheduleCache();
    }
    
    if (isTeacherMode && teacherName) {
      fetchTeacherSchedule(teacherName);
    } else {
      onRefresh();
    }
  };

  // Обработчик выбора группы - только меняем состояние, не сохраняем в настройки
  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    console.log('Выбрана группа:', group, 'курс:', course);
  };

  // Обработчик выбора курса - только меняем состояние, не сохраняем в настройки
  const handleCourseSelect = (courseId) => {
    setCourse(courseId);
    setSelectedGroup(null); // Сбрасываем выбор группы при смене курса
    console.log('Выбран курс:', courseId);
  };

  const getTimeForLesson = (timeNumber) => {
    if (!pairsTime || !Array.isArray(pairsTime)) return null;
    return pairsTime.find(pair => pair && pair.time === timeNumber);
  };

  const weekdays = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

  // Рендер дня расписания (общий для обоих режимов)
  const renderDaySchedule = (day, weekNumber = currentWeek) => {
    if (!day || !day.lessons) return null;
    
    const date = getDateByWeekAndDay(weekNumber, day.weekday);
    const isCurrent = isCurrentDay(weekNumber, day.weekday, currentTime);
    
    return (
      <View 
        key={day.weekday} 
        style={[{ 
          backgroundColor: cardBg, 
          borderRadius: 12, 
          padding: 16, 
          marginBottom: 16,
          borderWidth: 1,
          borderColor
        }, isCurrent ? {
          borderColor: colors.primary,
          borderWidth: 2
        } : {}]}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 4, fontFamily: 'Montserrat_600SemiBold' }}>
          {weekdays[day.weekday - 1]}
          {isCurrent && ' (Сегодня)'}
        </Text>
        <Text style={{ color: placeholderColor, marginBottom: 12, fontFamily: 'Montserrat_400Regular' }}>
          {formatDate(date)}
        </Text>

        {day.lessons && day.lessons.length > 0 ? (
          day.lessons.map((lesson, index) => {
            if (!lesson) return null;
            
            const pairTime = getTimeForLesson(lesson.time);
            const lessonDate = getLessonDateForWeek(weekNumber, day.weekday, currentTime);
            const isCurrentLessonFlag = isCurrentLesson(lesson, pairTime, currentTime, lessonDate);
            const lessonStyle = getCurrentLessonStyle(isCurrentLessonFlag, colors);
            
            return (
              <View 
                key={lesson.id || index} 
                style={[{ 
                  paddingVertical: 12, 
                  borderTopWidth: 1, 
                  borderTopColor: borderColor,
                  marginTop: 12
                }, lessonStyle]}
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

  // Рендер дневного расписания (только для студенческого режима)
  const renderDailySchedule = () => {
    if (!scheduleData) return null;
    
    const weekday = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
    const daySchedule = scheduleData.days ? 
      scheduleData.days.find(d => d && d.weekday === weekday) : 
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
          daySchedule.lessons.map((lesson, index) => {
            if (!lesson) return null;
            
            const pairTime = getTimeForLesson(lesson.time);
            const isCurrentLessonFlag = isCurrentLesson(lesson, pairTime, currentTime, currentDate);
            const lessonStyle = getCurrentLessonStyle(isCurrentLessonFlag, colors);
            
            return (
              <View 
                key={lesson.id || index} 
                style={[{ 
                  paddingVertical: 12, 
                  borderTopWidth: 1, 
                  borderTopColor: borderColor,
                  marginTop: 12
                }, lessonStyle]}
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

  // Рендер заголовка
  const renderHeader = () => {
    if (isTeacherMode) {
      return (
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: textColor, fontFamily: 'Montserrat_600SemiBold' }}>
            Расписание преподавателя
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

  // Рендер управления
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
    
    // Студенческий режим
    if (selectedGroup || showCourseSelector) {
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

  // Рендер содержимого
  const renderContent = () => {
    if (isTeacherMode) {
      if (loadingTeacher) {
        return <ActivityIndicator size="large" color={colors.primary} />;
      }
      
      return (
        <View>
          {teacherSchedule && teacherSchedule.days ? (
            teacherSchedule.days.map(day => 
              day && day.lessons ? renderDaySchedule(day, currentWeek) : null
            )
          ) : (
            <Text style={{ textAlign: 'center', color: placeholderColor, marginTop: 20, fontFamily: 'Montserrat_400Regular' }}>
              {teacherName ? 'Расписание не найдено' : 'Укажите ФИО преподавателя в настройках'}
            </Text>
          )}
        </View>
      );
    } else {
      if (loadingSchedule) {
        return <ActivityIndicator size="large" color={colors.primary} />;
      }
      
      if (scheduleData && selectedGroup) {
        if (viewMode === 'week' && scheduleData.days) {
          return (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: textColor, fontFamily: 'Montserrat_600SemiBold' }}>
                  Расписание для {selectedGroup}
                </Text>
                <Text style={{ color: placeholderColor, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
                  {COURSES.find(c => c.id === course)?.label}
                </Text>
                {scheduleData.dates && (
                  <Text style={{ color: placeholderColor, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
                    Неделя: {scheduleData.week_number} ({scheduleData.dates.date_start} - {scheduleData.dates.date_end})
                  </Text>
                )}
              </View>

              {scheduleData.days.map(day => 
                day && day.lessons ? renderDaySchedule(day) : null
              )}
            </View>
          );
        } else if (viewMode === 'day') {
          return (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: textColor, fontFamily: 'Montserrat_600SemiBold' }}>
                  Расписание для {selectedGroup}
                </Text>
                <Text style={{ color: placeholderColor, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
                  {COURSES.find(c => c.id === course)?.label}
                </Text>
              </View>
              {renderDailySchedule()}
            </View>
          );
        }
      }
      
      if (!selectedGroup && groups.length > 0) {
        return (
          <Text style={{ textAlign: 'center', color: placeholderColor, marginTop: 20, fontFamily: 'Montserrat_400Regular' }}>
            Выберите группу для отображения расписания
          </Text>
        );
      }

      if (scheduleData && !loadingSchedule) {
        return (
          <Text style={{ textAlign: 'center', color: placeholderColor, marginTop: 20, fontFamily: 'Montserrat_400Regular' }}>
            На {viewMode === 'day' ? 'этот день' : 'эту неделю'} занятий нет.
          </Text>
        );
      }

      if (!showCourseSelector && !selectedGroup && defaultGroup) {
        return (
          <Text style={{ textAlign: 'center', color: placeholderColor, marginTop: 20, fontFamily: 'Montserrat_400Regular' }}>
            Загрузка расписания для группы {defaultGroup}...
          </Text>
        );
      }
    }
    
    return null;
  };

  // Обработка ошибок
  if (error && !loadingGroups && !loadingSchedule && !loadingTeacher) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <ConnectionError 
          type={error}
          loading={false}
          onRetry={isTeacherMode ? () => teacherName && fetchTeacherSchedule(teacherName) : handleRetry}
          onViewCache={handleViewCache}
          showCacheButton={!!scheduleData}
          cacheAvailable={!!scheduleData}
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
          onRefresh={handleRefresh}
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
      
      {/* Студенческий режим: кнопки курса и групп (только если включен селектор) */}
      {!isTeacherMode && showCourseSelector && (
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
            {COURSES.map(courseItem => (
              <TouchableOpacity
                key={courseItem.id}
                onPress={() => handleCourseSelect(courseItem.id)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 20,
                  backgroundColor: course === courseItem.id ? colors.primary : 'transparent',
                  alignItems: 'center',
                  margin: 2,
                  flexGrow: 1,
                  minWidth: '18%'
                }}
              >
                <Text style={{ 
                  color: course === courseItem.id ? '#ffffff' : textColor,
                  fontWeight: '500',
                  fontFamily: 'Montserrat_500Medium'
                }}>
                  {courseItem.label}
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
                  onPress={() => handleGroupSelect(group)}
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

      {/* Информация о скрытом селекторе */}
      {!isTeacherMode && !showCourseSelector && selectedGroup && (
        <View style={{ 
          backgroundColor: colors.light, 
          padding: 12, 
          borderRadius: 8,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          marginBottom: 16
        }}>
          <Icon name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, marginLeft: 8, fontFamily: 'Montserrat_400Regular' }}>
            Показано расписание для группы {selectedGroup} ({COURSES.find(c => c.id === course)?.label})
          </Text>
          <TouchableOpacity 
            onPress={() => {
              setShowCourseSelector(true);
              SecureStore.setItemAsync('show_course_selector', 'true');
            }}
            style={{ marginLeft: 12 }}
          >
            <Text style={{ color: colors.primary, textDecorationLine: 'underline', fontFamily: 'Montserrat_500Medium' }}>
              Изменить
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Содержимое расписания */}
      {renderContent()}

      {!isOnline && !error && !showCachedData && (
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