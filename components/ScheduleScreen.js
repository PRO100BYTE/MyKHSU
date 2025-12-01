import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, RefreshControl, Animated, StatusBar } from 'react-native';
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
  const [isTeacherMode, setIsTeacherMode] = useState(false);
  const [teacherSchedule, setTeacherSchedule] = useState(null);
  const [loadingTeacher, setLoadingTeacher] = useState(false);
  const [showCourseSelector, setShowCourseSelector] = useState(true);
  const [teacherName, setTeacherName] = useState('');
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  
  // Анимация появления
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  // Запуск анимации при монтировании
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const colors = ACCENT_COLORS[accentColor];
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const hintBgColor = theme === 'light' ? '#f9fafb' : '#2d3748'; // Более темный для темной темы

  // Функция для получения иконки типа занятия
  const getLessonTypeIcon = (type) => {
    const typeLower = (type || '').toLowerCase().trim();
    
    if (typeLower.includes('лек') || typeLower === 'л.' || typeLower === 'лекция') {
      return { icon: 'school-outline', color: colors.primary };
    } else if (typeLower.includes('лаб') || typeLower === 'лаб.' || typeLower === 'лабораторная') {
      return { icon: 'flask-outline', color: '#8b5cf6' }; // Фиолетовый для лабораторных
    } else if (typeLower.includes('практ') || typeLower.includes('пр.') || typeLower === 'пр' || typeLower === 'практическая') {
      return { icon: 'people-outline', color: '#10b981' }; // Зеленый для практических
    } else if (typeLower.includes('конс') || typeLower === 'конс.' || typeLower === 'консультация') {
      return { icon: 'chatbubble-outline', color: '#f59e0b' }; // Оранжевый для консультаций
    } else if (typeLower.includes('экзамен') || typeLower.includes('экз.')) {
      return { icon: 'document-text-outline', color: '#ef4444' }; // Красный для экзаменов
    } else if (typeLower.includes('мероприят') || typeLower.includes('собрание')) {
      return { icon: 'calendar-outline', color: '#6366f1' }; // Индиго для мероприятий
    } else if (typeLower.includes('зачет') || typeLower.includes('зач.')) {
      return { icon: 'checkmark-circle-outline', color: '#10b981' }; // Зеленый для зачетов
    } else if (typeLower.includes('самост') || typeLower.includes('сам.')) {
      return { icon: 'book-outline', color: '#6b7280' }; // Серый для самостоятельных
    }
    
    return { icon: 'book-outline', color: placeholderColor };
  };

  // Загрузка настроек и курсов при монтировании
  useEffect(() => {
    loadScheduleSettings();
    fetchAvailableCourses();
  }, []);

  // Применение внешних настроек
  useEffect(() => {
    if (externalSettings) {
      applyExternalSettings(externalSettings);
    }
  }, [externalSettings]);

  // Загрузка доступных курсов с API
  const fetchAvailableCourses = async () => {
    setLoadingCourses(true);
    try {
      const result = await ApiService.getCourses();
      if (result.data && result.data.courses) {
        const coursesFromApi = result.data.courses;
        const filteredCourses = COURSES.filter(courseItem => 
          coursesFromApi.includes(courseItem.id.toString())
        );
        setAvailableCourses(filteredCourses);
        console.log('Доступные курсы загружены:', filteredCourses);
      } else {
        // Если API не вернуло курсы, используем все по умолчанию
        setAvailableCourses(COURSES);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      // В случае ошибки используем все курсы по умолчанию
      setAvailableCourses(COURSES);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadScheduleSettings = async () => {
    try {
      const format = await SecureStore.getItemAsync('schedule_format') || 'student';
      const showSelector = await SecureStore.getItemAsync('show_course_selector');
      const teacher = await SecureStore.getItemAsync('teacher_name') || '';
      
      // Явно преобразуем строку в boolean
      const shouldShowSelector = showSelector !== 'false';
      
      setIsTeacherMode(format === 'teacher');
      setShowCourseSelector(shouldShowSelector);
      setTeacherName(teacher);
      
      console.log('Настройки расписания загружены:', { 
        format, 
        showSelector, 
        shouldShowSelector, 
        teacher 
      });
      
      // Если режим преподавателя и есть ФИО, загружаем расписание
      if (format === 'teacher' && teacher) {
        fetchTeacherSchedule(teacher);
      }
    } catch (error) {
      console.error('Error loading schedule settings:', error);
    }
  };

  const applyExternalSettings = (settings) => {
    console.log('Применение внешних настроек:', settings);
    
    setIsTeacherMode(settings.format === 'teacher');
    setShowCourseSelector(settings.showSelector !== false); // Явно проверяем на false
    setTeacherName(settings.teacher || '');
    
    if (settings.format === 'teacher' && settings.teacher) {
      fetchTeacherSchedule(settings.teacher);
    } else if (settings.format === 'student') {
      // Если в настройках есть группа по умолчанию и селектор скрыт, устанавливаем ее
      if (settings.group && !settings.showSelector) {
        setSelectedGroup(settings.group);
        console.log('Установлена группа из настроек:', settings.group);
      }
    }
  };

  // Обработка выбора группы - сохраняем в настройки
  const handleGroupSelect = async (group) => {
    setSelectedGroup(group);
    console.log('Выбрана группа:', group, 'курс:', course);
    
    // Сохраняем выбор группы в настройки
    try {
      await SecureStore.setItemAsync('default_group', group);
      await SecureStore.setItemAsync('default_course', course.toString());
      
      // Обновляем локальное состояние и уведомляем родительский компонент
      const newSettings = {
        ...externalSettings,
        group: group,
        course: course
      };
      
      if (onSettingsUpdate) {
        onSettingsUpdate(newSettings);
      }
      
      console.log('Группа сохранена в настройки:', group, ', курс:', course);
    } catch (error) {
      console.error('Ошибка сохранения группы:', error);
    }
  };

  // Обработка выбора курса - сохраняем в настройки
  const handleCourseSelect = async (courseId) => {
    setCourse(courseId);
    
    // Сохраняем выбор курса в настройки
    try {
      await SecureStore.setItemAsync('default_course', courseId.toString());
      
      const newSettings = {
        ...externalSettings,
        course: courseId,
        group: '' // Сбрасываем группу при смене курса
      };
      
      if (onSettingsUpdate) {
        onSettingsUpdate(newSettings);
      }
      
      console.log('Курс сохранен в настройки:', courseId);
    } catch (error) {
      console.error('Ошибка сохранения курса:', error);
    }
  };

  const fetchTeacherSchedule = async (teacher, week = null) => {
    if (!teacher) {
      console.log('ФИО преподавателя не указано');
      return;
    }
    
    setLoadingTeacher(true);
    setError(null);
    try {
      console.log('Загрузка расписания для преподавателя:', teacher, 'неделя:', week || currentWeek);
      const result = await ApiService.getTeacherSchedule(teacher, week || currentWeek);
      if (result.data) {
        setTeacherSchedule(result.data);
        console.log('Расписание преподавателя загружено:', result.data);
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

  // Очистка кэша расписания
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
    
    if (isTeacherMode && teacherName) {
      fetchTeacherSchedule(teacherName);
    } else {
      onRefresh();
    }
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
            const typeIcon = getLessonTypeIcon(lesson.type_lesson);
            
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
                  <Icon name={typeIcon.icon} size={16} color={typeIcon.color} />
                  <Text style={{ color: placeholderColor, fontSize: 14, fontFamily: 'Montserrat_400Regular', marginLeft: 8 }}>
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

                {/* Блок с группами - отображается только в режиме преподавателя */}
                {isTeacherMode && lesson.group && Array.isArray(lesson.group) && lesson.group.length > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 }}>
                    <Icon name="people-outline" size={14} color={placeholderColor} style={{ marginTop: 2 }} />
                    <Text style={{ color: textColor, marginLeft: 8, fontSize: 14, fontFamily: 'Montserrat_400Regular', flex: 1 }}>
                      Группы: {lesson.group.join(', ')}
                    </Text>
                  </View>
                )}
                
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
            const typeIcon = getLessonTypeIcon(lesson.type_lesson);
            
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
                  <Icon name={typeIcon.icon} size={16} color={typeIcon.color} />
                  <Text style={{ color: placeholderColor, fontSize: 14, fontFamily: 'Montserrat_400Regular', marginLeft: 8 }}>
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
            {teacherName || 'ФИО не указано'}
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
                  {availableCourses.find(c => c.id === course)?.label || `Курс ${course}`}
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
                  {availableCourses.find(c => c.id === course)?.label || `Курс ${course}`}
                </Text>
              </View>
              {renderDailySchedule()}
            </View>
          );
        }
      }
      
      if (!selectedGroup && groups.length > 0 && showCourseSelector) {
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

      if (!showCourseSelector && !selectedGroup && externalSettings?.group) {
        return (
          <Text style={{ textAlign: 'center', color: placeholderColor, marginTop: 20, fontFamily: 'Montserrat_400Regular' }}>
            Загрузка расписания для группы {externalSettings.group}...
          </Text>
        );
      }
    }
    
    return null;
  };

  // Обработка ошибок
  if (error && !loadingGroups && !loadingSchedule && !loadingTeacher) {
    // Если ошибка сети и есть кэшированные данные, показываем их
    if (error === 'NO_INTERNET' && (scheduleData || teacherSchedule)) {
      // Не показываем ошибку, продолжаем рендерить контент
    } else {
      return (
        <Animated.View style={{ flex: 1, backgroundColor: bgColor, opacity: fadeAnim }}>
          <ConnectionError 
            type={error}
            loading={false}
            onRetry={isTeacherMode ? () => teacherName && fetchTeacherSchedule(teacherName) : handleRetry}
            onViewCache={handleViewCache}
            showCacheButton={!!scheduleData || !!teacherSchedule}
            cacheAvailable={!!scheduleData || !!teacherSchedule}
            theme={theme}
            accentColor={accentColor}
            contentType="schedule"
            message={error === 'NO_INTERNET' ? 'Расписание недоступно без подключения к интернету' : 'Не удалось загрузить расписание'}
          />
        </Animated.View>
      );
    }
  }

  return (
    <Animated.View style={{ flex: 1, backgroundColor: bgColor, opacity: fadeAnim }}>
      <StatusBar 
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={bgColor}
      />
      <ScrollView 
        style={{ flex: 1, padding: 16 }}
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
            backgroundColor: hintBgColor, 
            padding: 12, 
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            borderWidth: 1,
            borderColor: borderColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: theme === 'light' ? 0.05 : 0.2,
            shadowRadius: 2,
            elevation: 2
          }}>
            <Icon name="time-outline" size={16} color={colors.primary} />
            <Text style={{ 
              color: colors.primary, 
              marginLeft: 8, 
              fontFamily: 'Montserrat_400Regular', 
              textAlign: 'center',
              flex: 1
            }}>
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
            {loadingCourses ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 16 }} />
            ) : (
              <View style={{ 
                flexDirection: 'row', 
                flexWrap: 'wrap',
                backgroundColor: bgColor, 
                borderRadius: 24, 
                padding: 4, 
                marginBottom: 16,
                borderWidth: 1,
                borderColor,
                justifyContent: 'center'
              }}>
                {availableCourses.map(courseItem => (
                  <TouchableOpacity
                    key={courseItem.id}
                    onPress={() => handleCourseSelect(courseItem.id)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 20,
                      backgroundColor: course === courseItem.id ? colors.primary : 'transparent',
                      alignItems: 'center',
                      margin: 2,
                      minWidth: '23%',
                      justifyContent: 'center'
                    }}
                  >
                    <Text style={{ 
                      color: course === courseItem.id ? '#ffffff' : textColor,
                      fontWeight: '500',
                      fontFamily: 'Montserrat_500Medium',
                      fontSize: 14,
                      textAlign: 'center'
                    }}>
                      {courseItem.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

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
                      borderColor: selectedGroup === group ? colors.primary : borderColor,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{ 
                      color: selectedGroup === group ? '#ffffff' : textColor,
                      fontFamily: 'Montserrat_500Medium',
                      textAlign: 'center'
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
            backgroundColor: hintBgColor, 
            padding: 12, 
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            borderWidth: 1,
            borderColor: borderColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: theme === 'light' ? 0.05 : 0.2,
            shadowRadius: 2,
            elevation: 2
          }}>
            <Icon name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={{ 
              color: colors.primary, 
              marginLeft: 8, 
              fontFamily: 'Montserrat_400Regular', 
              textAlign: 'center',
              flex: 1
            }}>
              Показано расписание для группы {selectedGroup}
            </Text>
            <TouchableOpacity 
              onPress={() => {
                // Включаем отображение селектора
                setShowCourseSelector(true);
                
                // Обновляем настройки
                const newSettings = { 
                  ...externalSettings, 
                  showSelector: true 
                };
                
                if (onSettingsUpdate) {
                  onSettingsUpdate(newSettings);
                }
                
                console.log('Селектор групп включен');
              }}
              style={{ marginLeft: 8 }}
            >
              <Text style={{ 
                color: colors.primary, 
                textDecorationLine: 'underline', 
                fontFamily: 'Montserrat_500Medium',
                textAlign: 'center'
              }}>
                Изменить
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Содержимое расписания */}
        {renderContent()}

        {!isOnline && !error && !showCachedData && (
          <View style={{ 
            backgroundColor: hintBgColor, 
            padding: 16, 
            borderRadius: 8, 
            alignItems: 'center',
            marginTop: 16,
            borderWidth: 1,
            borderColor: borderColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: theme === 'light' ? 0.05 : 0.2,
            shadowRadius: 2,
            elevation: 2
          }}>
            <Icon name="cloud-offline-outline" size={20} color={colors.primary} />
            <Text style={{ 
              color: colors.primary, 
              marginTop: 8, 
              textAlign: 'center', 
              fontFamily: 'Montserrat_400Regular' 
            }}>
              Нет подключения к интернету. Показаны ранее загруженные данные.
            </Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Стили могут быть добавлены при необходимости
});

export default ScheduleScreen;