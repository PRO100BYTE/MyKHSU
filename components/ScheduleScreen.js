import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  Dimensions, 
  RefreshControl, 
  Animated, 
  StatusBar
} from 'react-native';
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
import Snowfall from './Snowfall';

const { width, height } = Dimensions.get('window');

const ScheduleScreen = ({ theme, accentColor, scheduleSettings: externalSettings, onSettingsUpdate, isNewYearMode }) => {
  const [isTeacherMode, setIsTeacherMode] = useState(false);
  const [teacherSchedule, setTeacherSchedule] = useState(null);
  const [loadingTeacher, setLoadingTeacher] = useState(false);
  const [showCourseSelector, setShowCourseSelector] = useState(true);
  const [teacherName, setTeacherName] = useState('');
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  
  // Анимация появления
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Анимация для контейнера расписания
  const scheduleSlideAnim = useRef(new Animated.Value(0)).current;
  const scheduleOpacityAnim = useRef(new Animated.Value(1)).current;
  
  // Анимация для даты/недели
  const dateSlideAnim = useRef(new Animated.Value(0)).current;
  const dateOpacityAnim = useRef(new Animated.Value(1)).current;
  
  // Анимация для заголовка при скролле
  const headerScrollAnim = useRef(new Animated.Value(0)).current;
  
  // Состояние для анимации
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState('right');
  
  // Состояние для скролла
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showFixedHeader, setShowFixedHeader] = useState(false);
  const scrollViewRef = useRef(null);
  const dayRefs = useRef({});

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

  // Функция для определения, нужно ли показывать фиксированный заголовок
  const shouldShowFixedHeader = () => {
    if (isTeacherMode) {
      return true; // Преподавательский режим - только недельный
    }
    if (!isTeacherMode && viewMode === 'week') {
      return true; // Студенческий недельный режим
    }
    return false; // Студенческий дневной режим
  };

  // Обработчик скролла
  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrollOffset(offsetY);
    
    // Показываем фиксированный заголовок при скролле вниз
    if (shouldShowFixedHeader()) {
      const showHeader = offsetY > 100;
      if (showHeader !== showFixedHeader) {
        setShowFixedHeader(showHeader);
        
        // Анимация появления/скрытия заголовка
        Animated.timing(headerScrollAnim, {
          toValue: showHeader ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  // Функция для скролла к текущей дате
  const scrollToCurrentDate = () => {
    if (!shouldShowFixedHeader()) return;
    
    const today = new Date();
    const todayFormatted = formatDate(today);
    
    // Проверяем, есть ли текущая дата в отображаемой неделе
    const daysArray = isTeacherMode && teacherSchedule ? teacherSchedule.days : 
                     scheduleData && scheduleData.days ? scheduleData.days : [];
    
    // Ищем день с текущей датой
    let currentDayIndex = -1;
    daysArray.forEach((day, index) => {
      if (day && day.weekday) {
        const dayDate = getDateByWeekAndDay(currentWeek, day.weekday);
        if (formatDate(dayDate) === todayFormatted) {
          currentDayIndex = index;
        }
      }
    });
    
    if (currentDayIndex !== -1 && dayRefs.current[currentDayIndex] && scrollViewRef.current) {
      // Используем requestAnimationFrame для плавного скролла
      requestAnimationFrame(() => {
        dayRefs.current[currentDayIndex].measure((x, y, width, height, pageX, pageY) => {
          // Прокручиваем с отступом
          const scrollPosition = Math.max(0, y - 150);
          
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
              y: scrollPosition,
              animated: true,
            });
          }
        });
      });
    }
  };

  // Автоматический скролл при изменении режима или данных
  useEffect(() => {
    if (shouldShowFixedHeader() && (scheduleData || teacherSchedule)) {
      // Небольшая задержка для гарантированной отрисовки компонентов
      const timer = setTimeout(() => {
        scrollToCurrentDate();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [viewMode, isTeacherMode, scheduleData, teacherSchedule, currentWeek]);

  // Сброс refs при изменении данных
  useEffect(() => {
    dayRefs.current = {};
  }, [scheduleData, teacherSchedule]);

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const colors = ACCENT_COLORS[accentColor];
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const hintBgColor = theme === 'light' ? '#f9fafb' : '#2d3748';

  // Функция анимации переключения
  const animateSwitch = (direction, action) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setAnimationDirection(direction);
    
    const slideDistance = 100;
    const slideOutValue = direction === 'left' ? -slideDistance : slideDistance;
    const slideInValue = direction === 'left' ? slideDistance : -slideDistance;
    
    // Анимация ухода
    Animated.parallel([
      // Анимация контейнера расписания
      Animated.parallel([
        Animated.timing(scheduleSlideAnim, {
          toValue: slideOutValue,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scheduleOpacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]),
      // Анимация даты/недели
      Animated.parallel([
        Animated.timing(dateSlideAnim, {
          toValue: slideOutValue,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(dateOpacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ])
    ]).start(() => {
      // Выполняем действие (смену дня/недели)
      action();
      
      // Сбрасываем анимацию для входа
      scheduleSlideAnim.setValue(slideInValue);
      scheduleOpacityAnim.setValue(0);
      dateSlideAnim.setValue(slideInValue);
      dateOpacityAnim.setValue(0);
      
      // Анимация входа
      Animated.parallel([
        // Анимация контейнера расписания
        Animated.parallel([
          Animated.timing(scheduleSlideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scheduleOpacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          })
        ]),
        // Анимация даты/недели
        Animated.parallel([
          Animated.timing(dateSlideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(dateOpacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          })
        ])
      ]).start(() => {
        setIsAnimating(false);
      });
    });
  };

  // Функция для получения иконки типа занятия
  const getLessonTypeIcon = (type) => {
    const typeLower = (type || '').toLowerCase().trim();
    
    if (typeLower.includes('лек') || typeLower === 'л.' || typeLower === 'лекция') {
      return { icon: 'school-outline', color: colors.primary };
    } else if (typeLower.includes('лаб') || typeLower === 'лаб.' || typeLower === 'лабораторная') {
      return { icon: 'flask-outline', color: '#8b5cf6' };
    } else if (typeLower.includes('практ') || typeLower.includes('пр.') || typeLower === 'пр' || typeLower === 'практическая') {
      return { icon: 'people-outline', color: '#10b981' };
    } else if (typeLower.includes('конс') || typeLower === 'конс.' || typeLower === 'консультация') {
      return { icon: 'chatbubble-outline', color: '#f59e0b' };
    } else if (typeLower.includes('экзамен') || typeLower.includes('экз.')) {
      return { icon: 'document-text-outline', color: '#ef4444' };
    } else if (typeLower.includes('мероприятие') || typeLower.includes('собрание')) {
      return { icon: 'calendar-outline', color: '#6366f1' };
    } else if (typeLower.includes('зачет') || typeLower.includes('зач.')) {
      return { icon: 'checkmark-circle-outline', color: '#10b981' };
    } else if (typeLower.includes('самост') || typeLower.includes('сам.')) {
      return { icon: 'book-outline', color: '#6b7280' };
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
        setAvailableCourses(COURSES);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
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
    setShowCourseSelector(settings.showSelector !== false);
    setTeacherName(settings.teacher || '');
    
    if (settings.format === 'teacher' && settings.teacher) {
      fetchTeacherSchedule(settings.teacher);
    } else if (settings.format === 'student') {
      if (settings.group && !settings.showSelector) {
        setSelectedGroup(settings.group);
        console.log('Установлена группа из настроек:', settings.group);
      }
    }
  };

  // Обработка выбора группы
  const handleGroupSelect = async (group) => {
    setSelectedGroup(group);
    console.log('Выбрана группа:', group, 'курс:', course);
    
    try {
      await SecureStore.setItemAsync('default_group', group);
      await SecureStore.setItemAsync('default_course', course.toString());
      
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

  // Обработка выбора курса
  const handleCourseSelect = async (courseId) => {
    setCourse(courseId);
    
    try {
      await SecureStore.setItemAsync('default_course', courseId.toString());
      
      const newSettings = {
        ...externalSettings,
        course: courseId,
        group: ''
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
    const direction = weeks > 0 ? 'left' : 'right';
    
    animateSwitch(direction, () => {
      const newWeek = currentWeek + weeks;
      setCurrentWeek(newWeek);
      
      if (isTeacherMode && teacherName) {
        fetchTeacherSchedule(teacherName, newWeek);
      }
    });
  };

  const changeDate = (days) => {
    const direction = days > 0 ? 'left' : 'right';
    
    animateSwitch(direction, () => {
      navigateDate(days);
    });
  };

  // Очистка кэша
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

  // Рендер дня расписания
  const renderDaySchedule = (day, weekNumber = currentWeek, index) => {
    if (!day || !day.lessons) return null;
    
    const date = getDateByWeekAndDay(weekNumber, day.weekday);
    const isCurrent = isCurrentDay(weekNumber, day.weekday, currentTime);
    
    return (
      <View 
        ref={ref => {
          if (ref) dayRefs.current[index] = ref;
        }}
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
          day.lessons.map((lesson, lessonIndex) => {
            if (!lesson) return null;
            
            const pairTime = getTimeForLesson(lesson.time);
            const lessonDate = getLessonDateForWeek(weekNumber, day.weekday, currentTime);
            const isCurrentLessonFlag = isCurrentLesson(lesson, pairTime, currentTime, lessonDate);
            const lessonStyle = getCurrentLessonStyle(isCurrentLessonFlag, colors);
            const typeIcon = getLessonTypeIcon(lesson.type_lesson);
            
            return (
              <View 
                key={lesson.id || lessonIndex} 
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

  // Рендер дневного расписания
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

  // Рендер фиксированного заголовка
  const renderFixedHeader = () => {
    if (!shouldShowFixedHeader()) return null;
    
    const headerTranslateY = headerScrollAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-60, 0],
    });
    
    const headerOpacity = headerScrollAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    
    return (
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          backgroundColor: cardBg,
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          zIndex: 1000,
          transform: [{ translateY: headerTranslateY }],
          opacity: headerOpacity,
          paddingHorizontal: 16,
          justifyContent: 'center',
        }}
      >
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          width: '100%' 
        }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            {isTeacherMode ? (
              <>
                <Text 
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{ 
                    fontSize: 16, 
                    fontWeight: 'bold', 
                    color: textColor, 
                    fontFamily: 'Montserrat_600SemiBold' 
                  }}
                >
                  Расписание преподавателя
                </Text>
                <Text 
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{ 
                    fontSize: 14, 
                    color: colors.primary, 
                    marginTop: 2,
                    fontFamily: 'Montserrat_500Medium' 
                  }}
                >
                  {teacherName || 'ФИО не указано'}
                </Text>
              </>
            ) : (
              <>
                <Text 
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{ 
                    fontSize: 16, 
                    fontWeight: 'bold', 
                    color: textColor, 
                    fontFamily: 'Montserrat_600SemiBold' 
                  }}
                >
                  Расписание для {selectedGroup || 'группы не выбрана'}
                </Text>
                <Text 
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{ 
                    fontSize: 14, 
                    color: placeholderColor, 
                    marginTop: 2,
                    fontFamily: 'Montserrat_400Regular' 
                  }}
                >
                  {availableCourses.find(c => c.id === course)?.label || `Курс ${course}`}
                </Text>
              </>
            )}
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
            <TouchableOpacity 
              onPress={() => changeWeek(-1)} 
              style={{ padding: 8 }}
              disabled={isAnimating}
            >
              <Icon name="chevron-back" size={24} color={isAnimating ? placeholderColor : colors.primary} />
            </TouchableOpacity>
            
            <Text 
              numberOfLines={1}
              style={{ 
                color: textColor, 
                fontWeight: '500', 
                marginHorizontal: 8, 
                fontFamily: 'Montserrat_500Medium',
                minWidth: 80,
                textAlign: 'center'
              }}
            >
              Неделя {currentWeek}
            </Text>
            
            <TouchableOpacity 
              onPress={() => changeWeek(1)} 
              style={{ padding: 8 }}
              disabled={isAnimating}
            >
              <Icon name="chevron-forward" size={24} color={isAnimating ? placeholderColor : colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
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

  // Рендер управления с анимацией
  const renderControls = () => {
    if (isTeacherMode) {
      return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: textColor, fontWeight: '500', fontFamily: 'Montserrat_500Medium' }}>
            Недельное расписание
          </Text>
          
          <Animated.View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              transform: [{ translateX: dateSlideAnim }],
              opacity: dateOpacityAnim,
            }}
          >
            <TouchableOpacity 
              onPress={() => changeWeek(-1)} 
              style={{ padding: 8 }}
              disabled={isAnimating}
            >
              <Icon name="chevron-back" size={24} color={isAnimating ? placeholderColor : colors.primary} />
            </TouchableOpacity>
            
            <Text style={{ color: textColor, fontWeight: '500', marginHorizontal: 8, fontFamily: 'Montserrat_500Medium' }}>
              Неделя {currentWeek}
            </Text>
            
            <TouchableOpacity 
              onPress={() => changeWeek(1)} 
              style={{ padding: 8 }}
              disabled={isAnimating}
            >
              <Icon name="chevron-forward" size={24} color={isAnimating ? placeholderColor : colors.primary} />
            </TouchableOpacity>
          </Animated.View>
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
              onPress={() => {
                setViewMode('week');
                // При переключении на недельный режим, сбрасываем скролл
                setTimeout(() => {
                  scrollToCurrentDate();
                }, 100);
              }}
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

          <Animated.View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              transform: [{ translateX: dateSlideAnim }],
              opacity: dateOpacityAnim,
            }}
          >
            <TouchableOpacity
              onPress={() => viewMode === 'day' ? changeDate(-1) : changeWeek(-1)}
              style={{ padding: 8 }}
              disabled={isAnimating}
            >
              <Icon name="chevron-back" size={24} color={isAnimating ? placeholderColor : colors.primary} />
            </TouchableOpacity>
            
            <Text style={{ color: textColor, fontWeight: '500', marginHorizontal: 8, fontFamily: 'Montserrat_500Medium' }}>
              {viewMode === 'day' ? formatDate(currentDate) : `Неделя ${currentWeek}`}
            </Text>
            
            <TouchableOpacity
              onPress={() => viewMode === 'day' ? changeDate(1) : changeWeek(1)}
              style={{ padding: 8 }}
              disabled={isAnimating}
            >
              <Icon name="chevron-forward" size={24} color={isAnimating ? placeholderColor : colors.primary} />
            </TouchableOpacity>
          </Animated.View>
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
            teacherSchedule.days.map((day, index) => 
              day && day.lessons ? renderDaySchedule(day, currentWeek, index) : null
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

              {scheduleData.days.map((day, index) => 
                day && day.lessons ? renderDaySchedule(day, currentWeek, index) : null
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
            isNewYearMode={isNewYearMode}
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
      
      {/* Снегопад для новогоднего режима */}
      {isNewYearMode && <Snowfall theme={theme} intensity={0.7} />}
      
      {/* Фиксированный заголовок */}
      {renderFixedHeader()}
      
      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1, padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ minHeight: height }}
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
        
        {/* Студенческий режим: кнопки курса и групп */}
        {!isTeacherMode && showCourseSelector && (
          <>
            {/* Кнопки выбора курса */}
            {loadingCourses ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 16 }} />
            ) : (
              <View style={{ 
                flexDirection: 'row', 
                flexWrap: 'wrap',
                backgroundColor: cardBg, 
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
                setShowCourseSelector(true);
                
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

        {/* Содержимое расписания с анимацией */}
        <Animated.View
          style={{
            transform: [{ translateX: scheduleSlideAnim }],
            opacity: scheduleOpacityAnim,
          }}
        >
          {renderContent()}
        </Animated.View>

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