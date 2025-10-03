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

const ScheduleScreen = ({ theme, accentColor, scheduleSettings: externalSettings, onSettingsUpdate }) => {
  // Локальное состояние настроек, которое может обновляться извне
  const [scheduleSettings, setScheduleSettings] = useState(
    externalSettings || {
      format: 'student',
      group: '',
      course: 1,
      teacher: '',
      showSelector: true
    }
  );
  
  const [isTeacherMode, setIsTeacherMode] = useState(false);
  const [teacherSchedule, setTeacherSchedule] = useState(null);
  const [loadingTeacher, setLoadingTeacher] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

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

  // Обновляем состояние при получении новых настроек извне
  useEffect(() => {
    if (externalSettings) {
      console.log('Получены новые настройки извне:', externalSettings);
      setScheduleSettings(externalSettings);
      applySettingsImmediately(externalSettings);
    }
  }, [externalSettings]);

  // Загрузка настроек при монтировании
  useEffect(() => {
    if (!externalSettings) {
      loadScheduleSettings();
    }
  }, []);

  // Применяем настройки немедленно
  const applySettingsImmediately = (settings) => {
    console.log('Немедленное применение настроек:', settings);
    
    setIsTeacherMode(settings.format === 'teacher');
    
    if (settings.format === 'student') {
      // Устанавливаем курс из настроек
      setCourse(settings.course);
      
      // Если селектор скрыт и есть группа по умолчанию, устанавливаем её
      if (!settings.showSelector && settings.group) {
        setSelectedGroup(settings.group);
        console.log('Немедленно установлена группа по умолчанию:', settings.group);
      }
    } else if (settings.format === 'teacher' && settings.teacher) {
      fetchTeacherSchedule(settings.teacher);
    }
    
    // Форсируем обновление компонента
    setForceUpdate(prev => prev + 1);
  };

  // Инициализация состояния на основе настроек
  useEffect(() => {
    if (isInitialized && scheduleSettings) {
      console.log('Инициализация состояния:', scheduleSettings);
      applySettingsImmediately(scheduleSettings);
    }
  }, [isInitialized, scheduleSettings]);

  // Обработка выбора группы - принудительно сохраняем в настройки
  const handleGroupSelect = async (group) => {
    setSelectedGroup(group);
    console.log('Выбрана группа:', group, 'курс:', course);
    
    // Сохраняем выбор группы в настройки
    try {
      await SecureStore.setItemAsync('default_group', group);
      await SecureStore.setItemAsync('default_course', course.toString());
      
      // Обновляем локальное состояние
      const newSettings = {
        ...scheduleSettings,
        group: group,
        course: course
      };
      
      setScheduleSettings(newSettings);
      
      // Уведомляем родительский компонент об изменении настроек
      if (onSettingsUpdate) {
        onSettingsUpdate(newSettings);
      }
      
      console.log('Группа сохранена в настройки:', group, 'курс:', course);
    } catch (error) {
      console.error('Ошибка сохранения группы:', error);
    }
  };

  // Обработка выбора курса - принудительно сохраняем в настройки
  const handleCourseSelect = async (courseId) => {
    setCourse(courseId);
    setSelectedGroup(null); // Сбрасываем выбор группы при смене курса
    
    // Сохраняем выбор курса в настройки
    try {
      await SecureStore.setItemAsync('default_course', courseId.toString());
      await SecureStore.setItemAsync('default_group', ''); // Сбрасываем группу
      
      // Обновляем локальное состояние
      const newSettings = {
        ...scheduleSettings,
        course: courseId,
        group: ''
      };
      
      setScheduleSettings(newSettings);
      
      // Уведомляем родительский компонент об изменении настроек
      if (onSettingsUpdate) {
        onSettingsUpdate(newSettings);
      }
      
      console.log('Курс сохранен в настройки:', courseId);
    } catch (error) {
      console.error('Ошибка сохранения курса:', error);
    }
  };

  const loadScheduleSettings = async () => {
    try {
      const format = await SecureStore.getItemAsync('schedule_format') || 'student';
      const teacher = await SecureStore.getItemAsync('teacher_name') || '';
      const showSelector = await SecureStore.getItemAsync('show_course_selector');
      const group = await SecureStore.getItemAsync('default_group') || '';
      const savedCourse = await SecureStore.getItemAsync('default_course') || '1';
      
      const settings = {
        format: format,
        group: group,
        course: parseInt(savedCourse),
        teacher: teacher,
        showSelector: showSelector !== 'false'
      };
      
      setScheduleSettings(settings);
      setIsTeacherMode(format === 'teacher');
      setIsInitialized(true);
      
      console.log('Настройки расписания загружены:', settings);
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
    
    if (isTeacherMode && scheduleSettings.teacher) {
      fetchTeacherSchedule(scheduleSettings.teacher, newWeek);
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

  // Очистка кэша расписания преподавателя
  const clearTeacherScheduleCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const teacherKeys = keys.filter(key => key.startsWith('teacher_schedule_'));
      
      if (teacherKeys.length > 0) {
        await AsyncStorage.multiRemove(teacherKeys);
        console.log('Кэш расписания преподавателей очищен:', teacherKeys.length, 'ключей');
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing teacher schedule cache:', error);
      return false;
    }
  };

  // Улучшенная функция обновления с очисткой кэша
  const handleRefresh = async () => {
    if (isOnline) {
      if (isTeacherMode) {
        await clearTeacherScheduleCache();
      } else {
        await clearScheduleCache();
      }
    }
    
    if (isTeacherMode && scheduleSettings.teacher) {
      fetchTeacherSchedule(scheduleSettings.teacher);
    } else {
      onRefresh();
    }
  };

  // Автоматический выбор группы при загрузке групп
  useEffect(() => {
    if (groups.length > 0 && scheduleSettings.group && !selectedGroup && isInitialized) {
      const groupExists = groups.includes(scheduleSettings.group);
      if (groupExists) {
        setSelectedGroup(scheduleSettings.group);
        console.log('Автоматически выбрана группа из настроек:', scheduleSettings.group);
      } else if (groups.length > 0 && !scheduleSettings.showSelector) {
        // Если группа не найдена, но селектор скрыт, выбираем первую доступную
        setSelectedGroup(groups[0]);
        console.log('Группа из настроек не найдена, выбрана первая доступная:', groups[0]);
      }
    }
  }, [groups, scheduleSettings, selectedGroup, isInitialized, forceUpdate]);

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
            {scheduleSettings.teacher}
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
    if (selectedGroup || scheduleSettings.showSelector) {
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
              {scheduleSettings.teacher ? 'Расписание не найдено' : 'Укажите ФИО преподавателя в настройках'}
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

      if (!scheduleSettings.showSelector && !selectedGroup && scheduleSettings.group) {
        return (
          <Text style={{ textAlign: 'center', color: placeholderColor, marginTop: 20, fontFamily: 'Montserrat_400Regular' }}>
            Загрузка расписания для группы {scheduleSettings.group}...
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
          onRetry={isTeacherMode ? () => scheduleSettings.teacher && fetchTeacherSchedule(scheduleSettings.teacher) : handleRetry}
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
      {!isTeacherMode && scheduleSettings.showSelector && (
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
      {!isTeacherMode && !scheduleSettings.showSelector && selectedGroup && (
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
            Показано расписание для группы {selectedGroup}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              // Временно показываем селектор, но не сохраняем в настройки
              const newSettings = { ...scheduleSettings, showSelector: true };
              setScheduleSettings(newSettings);
              
              // Уведомляем родительский компонент
              if (onSettingsUpdate) {
                onSettingsUpdate(newSettings);
              }
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