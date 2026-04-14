import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  StatusBar,
  Alert,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getWeekNumber, formatDate, getDateByWeekAndDay } from '../utils/dateUtils';
import { ACCENT_COLORS, COURSES, LIQUID_GLASS } from '../utils/constants';
import ConnectionError from './ConnectionError';
import ApiService from '../utils/api';
import { useScheduleLogic } from '../hooks/useScheduleLogic';
import { 
  isCurrentLesson, 
  getLessonDateForWeek, 
  isCurrentDay 
} from '../utils/scheduleUtils';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Snowfall from './Snowfall';
import { exportScheduleToCalendar } from '../utils/calendarExport';
import LessonNoteModal from './LessonNoteModal';
import { loadAllNotes, getLessonNoteKey, findHomeworkBySubject, markHomeworkDelivered } from '../utils/notesStorage';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import ScheduleShareImage from './ScheduleShareImage';
import notificationService from '../utils/notificationService';
import AttendanceStatsModal from './AttendanceStatsModal';
import FreeAuditoriesScreen from './FreeAuditoriesScreen';
import {
  loadAllAttendance,
  saveAttendance,
  removeAttendance,
  buildAttendanceKeyV2,
} from '../utils/attendanceStorage';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  buildFavoriteId,
} from '../utils/favoritesStorage';

const { width, height } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Компонент обратного отсчёта до конца текущей пары
const LessonCountdown = ({ timeEnd, accentColor }) => {
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const calcRemaining = () => {
      const now = new Date();
      const [h, m] = timeEnd.split(':').map(Number);
      const end = new Date(now);
      end.setHours(h, m, 0, 0);
      const diff = end - now;
      if (diff <= 0) {
        setRemaining('');
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      const pad = (n) => n < 10 ? '0' + n : '' + n;
      if (hours > 0) {
        setRemaining(`${hours} ч ${pad(mins)} мин`);
      } else if (mins > 0) {
        setRemaining(`${mins} мин ${pad(secs)} с`);
      } else {
        setRemaining(`${secs} с`);
      }
    };

    calcRemaining();
    const interval = setInterval(calcRemaining, 1000);
    return () => clearInterval(interval);
  }, [timeEnd]);

  if (!remaining) return null;

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '12',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      gap: 4,
    }}>
      <Icon name="hourglass-outline" size={13} color={colors.primary} />
      <Text style={{
        fontSize: 12,
        color: colors.primary,
        fontFamily: 'Montserrat_600SemiBold',
      }}>
        {remaining}
      </Text>
    </View>
  );
};

const ScheduleScreen = ({ theme, accentColor, scheduleSettings: externalSettings, onSettingsUpdate, isNewYearMode, onCacheStatusChange, onExportReady, onFavoritesReady }) => {
  const [isTeacherMode, setIsTeacherMode] = useState(false);
  const [isAuditoryMode, setIsAuditoryMode] = useState(false);
  const [teacherSchedule, setTeacherSchedule] = useState(null);
  const [auditorySchedule, setAuditorySchedule] = useState(null);
  const [loadingTeacher, setLoadingTeacher] = useState(false);
  const [loadingAuditory, setLoadingAuditory] = useState(false);
  const [showCourseSelector, setShowCourseSelector] = useState(true);
  const [selectorExpandedTemp, setSelectorExpandedTemp] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [auditoryName, setAuditoryName] = useState('');
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Посещаемость
  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceStatsVisible, setAttendanceStatsVisible] = useState(false);
  const [attendanceTrackingEnabled, setAttendanceTrackingEnabled] = useState(true);

  // Избранные расписания
  const [favorites, setFavorites] = useState([]);
  const [isFav, setIsFav] = useState(false);
  const [favoritesModalVisible, setFavoritesModalVisible] = useState(false);

  // Поиск свободных аудиторий
  const [freeAuditoriesVisible, setFreeAuditoriesVisible] = useState(false);
  const [freeAuditoriesEnabled, setFreeAuditoriesEnabled] = useState(true);

  // Заметки к парам
  const [lessonNotes, setLessonNotes] = useState({});
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteModalLesson, setNoteModalLesson] = useState(null);
  const [noteModalWeekday, setNoteModalWeekday] = useState(null);
  
  // Скриншот расписания
  const shareImageRef = useRef(null);
  
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
    setError,
    setRefreshing,
    fetchWeekNumbers
  } = useScheduleLogic();

  // Запуск анимации при монтировании
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Передаём функцию экспорта и состояние наверх в App.js
  useEffect(() => {
    if (onExportReady) {
      const hasData = isTeacherMode ? !!teacherSchedule : isAuditoryMode ? !!auditorySchedule : !!scheduleData;
      onExportReady(hasData ? handleExportAction : null, exporting);
    }
  }, [handleExportAction, isTeacherMode, isAuditoryMode, teacherSchedule, auditorySchedule, scheduleData, exporting]);

  // Передаём обработчик открытия модалки избранного в App.js
  useEffect(() => {
    if (onFavoritesReady) {
      onFavoritesReady(() => setFavoritesModalVisible(true));
    }
  }, [onFavoritesReady]);

  // Синхронизация статуса кэша с хедером приложения
  useEffect(() => {
    if (onCacheStatusChange) {
      if (!isOnline) {
        onCacheStatusChange('offline', cacheInfo?.cacheInfo?.cacheDate);
      } else if (showCachedData) {
        const status = cacheInfo?.source === 'stale_cache' ? 'stale_cache' : 'cache';
        onCacheStatusChange(status, cacheInfo?.cacheInfo?.cacheDate);
      } else {
        onCacheStatusChange(null);
      }
    }
  }, [showCachedData, isOnline, cacheInfo]);

  // Очистка статуса при размонтировании
  useEffect(() => {
    return () => {
      if (onCacheStatusChange) onCacheStatusChange(null);
    };
  }, []);

  // Функция для определения, нужно ли показывать фиксированный заголовок
  const shouldShowFixedHeader = () => {
    if (isTeacherMode || isAuditoryMode) {
      return true; // Преподавательский/аудиторный режим - только недельный
    }
    if (!isTeacherMode && !isAuditoryMode && viewMode === 'week') {
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
                     isAuditoryMode && auditorySchedule ? auditorySchedule.days :
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
    if (shouldShowFixedHeader() && (scheduleData || teacherSchedule || auditorySchedule)) {
      // Небольшая задержка для гарантированной отрисовки компонентов
      const timer = setTimeout(() => {
        scrollToCurrentDate();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [viewMode, isTeacherMode, isAuditoryMode, scheduleData, teacherSchedule, auditorySchedule, currentWeek]);

  // Сброс refs при изменении данных
  useEffect(() => {
    dayRefs.current = {};
  }, [scheduleData, teacherSchedule, auditorySchedule]);

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const cardBg = glass.surfaceCard;
  const textColor = glass.text;
  const colors = ACCENT_COLORS[accentColor];
  const borderColor = glass.border;
  const placeholderColor = glass.textSecondary;
  const hintBgColor = glass.surfaceTertiary;
  const isMatrix = theme === 'matrix';

  // Цвета для селектора режима (день/неделя)
  const selectorActiveBg = isMatrix ? 'rgba(0, 255, 65, 0.15)' : colors.primary;
  const selectorActiveText = isMatrix ? '#00FF41' : '#ffffff';
  const selectorActiveShadow = isMatrix ? 'transparent' : colors.primary;

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

  // Функция для получения иконки и лейбла типа занятия
  const getLessonTypeIcon = (type) => {
    const typeLower = (type || '').toLowerCase().trim();
    
    if (typeLower.includes('лек') || typeLower === 'л.' || typeLower === 'лекция') {
      return { icon: 'school-outline', color: '#3B82F6', label: 'Лекция', bg: 'rgba(59, 130, 246, 0.12)' };
    } else if (typeLower.includes('лаб') || typeLower === 'лаб.' || typeLower === 'лабораторная') {
      return { icon: 'flask-outline', color: '#8b5cf6', label: 'Лабораторная', bg: 'rgba(139, 92, 246, 0.12)' };
    } else if (typeLower.includes('практ') || typeLower.includes('пр.') || typeLower === 'пр' || typeLower === 'практическая') {
      return { icon: 'people-outline', color: '#10b981', label: 'Практика', bg: 'rgba(16, 185, 129, 0.12)' };
    } else if (typeLower.includes('конс') || typeLower === 'конс.' || typeLower === 'консультация') {
      return { icon: 'chatbubble-outline', color: '#f59e0b', label: 'Консультация', bg: 'rgba(245, 158, 11, 0.12)' };
    } else if (typeLower.includes('экзамен') || typeLower.includes('экз.')) {
      return { icon: 'document-text-outline', color: '#ef4444', label: 'Экзамен', bg: 'rgba(239, 68, 68, 0.12)' };
    } else if (typeLower.includes('мероприятие') || typeLower.includes('собрание')) {
      return { icon: 'calendar-outline', color: '#6366f1', label: 'Мероприятие', bg: 'rgba(99, 102, 241, 0.12)' };
    } else if (typeLower.includes('зачет') || typeLower.includes('зач.')) {
      return { icon: 'checkmark-circle-outline', color: '#10b981', label: 'Зачёт', bg: 'rgba(16, 185, 129, 0.12)' };
    } else if (typeLower.includes('самост') || typeLower.includes('сам.')) {
      return { icon: 'book-outline', color: '#6b7280', label: 'Самост. работа', bg: 'rgba(107, 114, 128, 0.12)' };
    }
    
    return { icon: 'book-outline', color: placeholderColor, label: type || 'Занятие', bg: glass.surfaceTertiary };
  };

  // Загрузка всех заметок
  const refreshNotes = useCallback(async () => {
    try {
      const all = await loadAllNotes();
      setLessonNotes(all);
    } catch (e) {
      console.error('Error loading notes:', e);
    }
  }, []);

  useEffect(() => {
    refreshNotes();
  }, [scheduleData, teacherSchedule, auditorySchedule]);

  // Загрузка отметок посещаемости
  useEffect(() => {
    loadAllAttendance().then(setAttendanceMap).catch(() => {});
  }, []);

  // Загрузка избранных расписаний
  useEffect(() => {
    getFavorites().then(setFavorites).catch(() => {});
  }, []);

  // Обновление isFav при смене активного расписания
  useEffect(() => {
    let type, data;
    if (isTeacherMode && teacherName) {
      type = 'teacher'; data = { teacherName };
    } else if (isAuditoryMode && auditoryName) {
      type = 'auditory'; data = { auditoryName };
    } else if (selectedGroup) {
      type = 'student'; data = { group: selectedGroup };
    } else {
      setIsFav(false);
      return;
    }
    const id = buildFavoriteId(type, data);
    getFavorites().then(list => setIsFav(list.some(f => f.id === id))).catch(() => {});
  }, [isTeacherMode, isAuditoryMode, teacherName, auditoryName, selectedGroup]);

  const openNoteModal = (lesson, weekday) => {
    setNoteModalLesson(lesson);
    setNoteModalWeekday(weekday);
    setNoteModalVisible(true);
  };

  const formatLocalDateISO = useCallback((date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const getAttendanceMeta = useCallback((lesson, weekday, lessonDate) => {
    const resolvedDate = lessonDate || (viewMode === 'day'
      ? currentDate
      : getLessonDateForWeek(currentWeek, weekday, currentTime));

    return {
      group: selectedGroup || '',
      dateISO: formatLocalDateISO(resolvedDate),
      lessonType: lesson?.type_lesson || '',
    };
  }, [selectedGroup, viewMode, currentDate, currentWeek, currentTime, formatLocalDateISO]);

  const handleNoteModalClose = (saved) => {
    setNoteModalVisible(false);
    setNoteModalLesson(null);
    setNoteModalWeekday(null);
    if (saved) refreshNotes();
  };

  // Отметить посещаемость пары (toggle: повторный тап снимает отметку)
  const handleAttendanceMark = useCallback(async (lesson, weekday, status, lessonDate) => {
    const { group, dateISO, lessonType } = getAttendanceMeta(lesson, weekday, lessonDate);
    const key = buildAttendanceKeyV2(lesson.subject, weekday, lesson.time, group, dateISO, lessonType);
    const current = attendanceMap[key];
    try {
      if (current?.status === status) {
        await removeAttendance({ subject: lesson.subject, weekday, timeSlot: lesson.time, group, dateISO, lessonType });
        setAttendanceMap(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } else {
        const entry = await saveAttendance({ subject: lesson.subject, weekday, timeSlot: lesson.time, group, status, dateISO, lessonType });
        setAttendanceMap(prev => ({ ...prev, [key]: entry }));
      }
    } catch (e) {
      console.error('Error saving attendance:', e);
    }
  }, [attendanceMap, getAttendanceMeta]);

  const confirmRemoveFavorite = useCallback((id, label = 'элемент') => {
    Alert.alert(
      'Удалить из избранного?',
      `"${label}" будет удален из избранного.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            await removeFavorite(id);
            setFavorites(prev => prev.filter(f => f.id !== id));
            const cur = favorites.find(f => f.id === id);
            if (cur && checkIsActiveFavorite(cur)) setIsFav(false);
          },
        },
      ]
    );
  }, [favorites, checkIsActiveFavorite]);

  // Добавить / удалить текущее расписание из избранного
  const handleToggleFavorite = useCallback(async () => {
    let type, label, data;
    if (isTeacherMode && teacherName) {
      type = 'teacher'; label = teacherName; data = { teacherName };
    } else if (isAuditoryMode && auditoryName) {
      type = 'auditory'; label = auditoryName; data = { auditoryName };
    } else if (selectedGroup) {
      type = 'student'; label = selectedGroup; data = { group: selectedGroup, course };
    } else {
      return;
    }
    const id = buildFavoriteId(type, data);
    try {
      if (isFav) {
        confirmRemoveFavorite(id, label);
      } else {
        const favorite = { id, type, label, data };
        await addFavorite(favorite);
        setFavorites(prev => [...prev, favorite]);
        setIsFav(true);
      }
    } catch (e) {
      console.error('Error toggling favorite:', e);
    }
  }, [isFav, isTeacherMode, isAuditoryMode, teacherName, auditoryName, selectedGroup, course, confirmRemoveFavorite]);

  // Применить избранное
  const applyFavorite = useCallback((fav) => {
    if (fav.type === 'teacher') {
      setIsTeacherMode(true);
      setIsAuditoryMode(false);
      setTeacherName(fav.data.teacherName);
      fetchTeacherSchedule(fav.data.teacherName);
      if (onSettingsUpdate) onSettingsUpdate({ format: 'teacher', teacher: fav.data.teacherName });
    } else if (fav.type === 'auditory') {
      setIsTeacherMode(false);
      setIsAuditoryMode(true);
      setAuditoryName(fav.data.auditoryName);
      fetchAuditorySchedule(fav.data.auditoryName);
      if (onSettingsUpdate) onSettingsUpdate({ format: 'auditory', auditory: fav.data.auditoryName });
    } else if (fav.type === 'student') {
      setIsTeacherMode(false);
      setIsAuditoryMode(false);
      if (fav.data.course) setCourse(fav.data.course);
      if (fav.data.group) setSelectedGroup(fav.data.group);
      if (onSettingsUpdate) onSettingsUpdate({ format: 'student', group: fav.data.group, course: fav.data.course });
    }
  }, [fetchTeacherSchedule, fetchAuditorySchedule, setCourse, setSelectedGroup, onSettingsUpdate]);

  const checkIsActiveFavorite = useCallback((fav) => {
    if (fav.type === 'teacher') return isTeacherMode && teacherName === fav.data.teacherName;
    if (fav.type === 'auditory') return isAuditoryMode && auditoryName === fav.data.auditoryName;
    if (fav.type === 'student') return !isTeacherMode && !isAuditoryMode && selectedGroup === fav.data.group;
    return false;
  }, [isTeacherMode, isAuditoryMode, teacherName, auditoryName, selectedGroup]);

  // Удалить из избранного (с подтверждением)
  const handleRemoveFavoriteFromBar = useCallback((id, label) => {
    confirmRemoveFavorite(id, label);
  }, [confirmRemoveFavorite]);

  // Проверяет, есть ли заметка к занятию
  const hasNoteForLesson = (lesson, weekday) => {
    const group = lesson.group ? (Array.isArray(lesson.group) ? lesson.group.join(',') : lesson.group) : '';
    const key = getLessonNoteKey(lesson.subject, weekday, lesson.time, group);
    const note = lessonNotes[key];
    return note && (note.noteText || note.homework);
  };

  // Получает текст заметки для отображения превью
  const getNotePreview = (lesson, weekday) => {
    const group = lesson.group ? (Array.isArray(lesson.group) ? lesson.group.join(',') : lesson.group) : '';
    const key = getLessonNoteKey(lesson.subject, weekday, lesson.time, group);
    return lessonNotes[key] || null;
  };

  // Получает ДЗ из предыдущего занятия по тому же предмету (отображается только на 1 следующем занятии)
  const getHomeworkFromPrevLesson = (lesson, weekday, lessonDate) => {
    const group = lesson.group ? (Array.isArray(lesson.group) ? lesson.group.join(',') : lesson.group) : '';
    // Не показываем чужое ДЗ, если у текущего занятия уже есть своя заметка с ДЗ
    const ownKey = getLessonNoteKey(lesson.subject, weekday, lesson.time, group);
    const ownNote = lessonNotes[ownKey];
    if (ownNote && ownNote.homework) return null;
    const result = findHomeworkBySubject(lessonNotes, lesson.subject, group);
    if (!result || !result.updatedAt || !lessonDate) return null;

    const hwDate = new Date(result.updatedAt);
    hwDate.setHours(0, 0, 0, 0);
    const ld = new Date(lessonDate);
    ld.setHours(0, 0, 0, 0);
    const ldISO = ld.toISOString();

    // Не показываем на занятиях в день создания ДЗ или раньше
    if (ld.getTime() <= hwDate.getTime()) return null;

    if (result.homeworkTargetDate) {
      // targetDate уже установлена — показываем только на этой конкретной дате
      if (result.homeworkTargetDate === ldISO) return result.homework;
      return null;
    }

    // targetDate ещё не установлена — это первое занятие после создания ДЗ,
    // «захватываем» его: записываем дату в базу и обновляем локальный кэш
    markHomeworkDelivered(result.sourceKey, ldISO).then(() => refreshNotes());
    // Обновляем кэш сразу, чтобы при следующем рендере другие карточки не захватили
    if (lessonNotes[result.sourceKey]) {
      lessonNotes[result.sourceKey] = { ...lessonNotes[result.sourceKey], homeworkTargetDate: ldISO };
    }
    return result.homework;
  };

  // Общий компонент карточки занятия
  const renderLessonCard = (lesson, lessonIndex, pairTime, isCurrentLessonFlag, isTeacher = false, isAuditory = false, weekday = null, lessonDate = null) => {
    const typeInfo = getLessonTypeIcon(lesson.type_lesson);
    
    return (
      <View
        key={lesson.id || lessonIndex}
        style={{
          flexDirection: 'row',
          backgroundColor: isCurrentLessonFlag 
            ? (colors.glass || colors.primary + '10') 
            : glass.surfaceSecondary,
          borderRadius: 16,
          marginTop: lessonIndex === 0 ? 0 : 10,
          borderWidth: isCurrentLessonFlag ? 1.5 : StyleSheet.hairlineWidth,
          borderColor: isCurrentLessonFlag 
            ? (colors.glassBorder || colors.primary) 
            : glass.border,
          overflow: 'hidden',
          shadowColor: isCurrentLessonFlag ? colors.primary : glass.shadowColor,
          shadowOffset: { width: 0, height: isCurrentLessonFlag ? 4 : 2 },
          shadowOpacity: isCurrentLessonFlag ? 0.25 : 0.08,
          shadowRadius: isCurrentLessonFlag ? 12 : 6,
          elevation: isCurrentLessonFlag ? 6 : 2,
        }}
      >
        {/* Цветная полоска-акцент слева */}
        <View style={{
          width: 4,
          backgroundColor: typeInfo.color,
          borderTopLeftRadius: 16,
          borderBottomLeftRadius: 16,
        }} />
        
        {/* Основной контент */}
        <View style={{ flex: 1, padding: 14 }}>
          {/* Верхняя строка: время + тип занятия */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            {/* Время пары */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {pairTime ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="time-outline" size={15} color={isCurrentLessonFlag ? colors.primary : placeholderColor} />
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '600', 
                    color: isCurrentLessonFlag ? colors.primary : textColor, 
                    fontFamily: 'Montserrat_600SemiBold',
                    marginLeft: 5,
                  }}>
                    {pairTime.time_start} – {pairTime.time_end}
                  </Text>
                </View>
              ) : (
                <Text style={{ 
                  fontSize: 13, 
                  color: placeholderColor, 
                  fontFamily: 'Montserrat_400Regular' 
                }}>
                  Пара {lesson.time}
                </Text>
              )}
              {isCurrentLessonFlag && (
                <View style={{
                  marginLeft: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                  backgroundColor: colors.primary + '20',
                }}>
                  <Text style={{ 
                    fontSize: 11, 
                    color: colors.primary, 
                    fontFamily: 'Montserrat_600SemiBold' 
                  }}>
                    Сейчас
                  </Text>
                </View>
              )}
            </View>
            
            {/* Бейдж типа занятия */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: typeInfo.bg,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 10,
            }}>
              <Icon name={typeInfo.icon} size={13} color={typeInfo.color} />
              <Text style={{ 
                fontSize: 12, 
                color: typeInfo.color, 
                fontFamily: 'Montserrat_500Medium',
                marginLeft: 4,
              }}>
                {typeInfo.label}
              </Text>
            </View>
          </View>
          
          {/* Название предмета */}
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600', 
            color: textColor, 
            fontFamily: 'Montserrat_600SemiBold',
            lineHeight: 22,
            marginBottom: 10,
          }}>
            {lesson.subject}
          </Text>
          
          {/* Детали занятия */}
          <View style={{ gap: 6 }}>
            {/* Преподаватель */}
            {!isTeacher && lesson.teacher && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ 
                  width: 26, 
                  height: 26, 
                  borderRadius: 13, 
                  backgroundColor: glass.surfaceTertiary, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  marginRight: 8,
                }}>
                  <Icon name="person-outline" size={14} color={placeholderColor} />
                </View>
                <Text style={{ 
                  color: textColor, 
                  fontSize: 14, 
                  fontFamily: 'Montserrat_400Regular',
                  flex: 1,
                }}>
                  {lesson.teacher}
                </Text>
              </View>
            )}
            
            {/* Аудитория */}
            {lesson.auditory && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ 
                  width: 26, 
                  height: 26, 
                  borderRadius: 13, 
                  backgroundColor: glass.surfaceTertiary, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  marginRight: 8,
                }}>
                  <Icon name="location-outline" size={14} color={placeholderColor} />
                </View>
                <Text style={{ 
                  color: textColor, 
                  fontSize: 14, 
                  fontFamily: 'Montserrat_400Regular',
                  flex: 1,
                }}>
                  {lesson.auditory}
                </Text>
              </View>
            )}

            {/* Группы (для преподавательского и аудиторного режима) */}
            {(isTeacher || isAuditory) && lesson.group && Array.isArray(lesson.group) && lesson.group.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ 
                  width: 26, 
                  height: 26, 
                  borderRadius: 13, 
                  backgroundColor: glass.surfaceTertiary, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  marginRight: 8,
                }}>
                  <Icon name="people-outline" size={14} color={placeholderColor} />
                </View>
                <Text style={{ 
                  color: textColor, 
                  fontSize: 14, 
                  fontFamily: 'Montserrat_400Regular',
                  flex: 1,
                }}>
                  {lesson.group.join(', ')}
                </Text>
              </View>
            )}
          </View>

          {/* Превью заметки/ДЗ */}
          {weekday != null && (() => {
            const noteData = getNotePreview(lesson, weekday);
            const hasOwnNote = noteData && (noteData.noteText || noteData.homework);
            const prevHomework = !hasOwnNote || !noteData?.homework ? getHomeworkFromPrevLesson(lesson, weekday, lessonDate) : null;
            if (!hasOwnNote && !prevHomework) return null;
            return (
              <View style={{ marginTop: 10, gap: 6 }}>
                {noteData?.noteText ? (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    backgroundColor: colors.glass || (colors.primary + '10'),
                    borderRadius: 10,
                    padding: 8,
                  }}>
                    <Icon name="document-text-outline" size={14} color={colors.primary} style={{ marginRight: 6, marginTop: 2 }} />
                    <Text numberOfLines={2} style={{ flex: 1, color: textColor, fontSize: 13, fontFamily: 'Montserrat_400Regular', lineHeight: 18 }}>
                      {noteData.noteText}
                    </Text>
                  </View>
                ) : null}
                {noteData?.homework ? (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    backgroundColor: 'rgba(245, 158, 11, 0.10)',
                    borderRadius: 10,
                    padding: 8,
                  }}>
                    <Icon name="school-outline" size={14} color="#f59e0b" style={{ marginRight: 6, marginTop: 2 }} />
                    <Text numberOfLines={2} style={{ flex: 1, color: textColor, fontSize: 13, fontFamily: 'Montserrat_400Regular', lineHeight: 18 }}>
                      {noteData.homework}
                    </Text>
                  </View>
                ) : null}
                {prevHomework ? (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    borderRadius: 10,
                    padding: 8,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: 'rgba(245, 158, 11, 0.20)',
                    borderStyle: 'dashed',
                  }}>
                    <Icon name="arrow-redo-outline" size={14} color="#f59e0b" style={{ marginRight: 6, marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#f59e0b', fontFamily: 'Montserrat_500Medium', marginBottom: 2 }}>
                        ДЗ с прошлого занятия
                      </Text>
                      <Text numberOfLines={2} style={{ color: textColor, fontSize: 13, fontFamily: 'Montserrat_400Regular', lineHeight: 18 }}>
                        {prevHomework}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })()}

          {/* Нижняя строка: обратный отсчёт + кнопка заметок */}
          {weekday != null && (
            <View style={{
              flexDirection: 'row',
              justifyContent: isCurrentLessonFlag && pairTime ? 'space-between' : 'flex-end',
              alignItems: 'center',
              marginTop: 2,
            }}>
              {isCurrentLessonFlag && pairTime && (pairTime.time_end || pairTime.end) && (
                <LessonCountdown
                  timeEnd={pairTime.time_end || pairTime.end}
                  accentColor={accentColor}
                />
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {attendanceTrackingEnabled && !isTeacher && !isAuditory && (
                  <TouchableOpacity
                    onPress={() => {
                      const { group, dateISO, lessonType } = getAttendanceMeta(lesson, weekday, lessonDate);
                      const attKey = buildAttendanceKeyV2(lesson.subject, weekday, lesson.time, group, dateISO, lessonType);
                      const currentStatus = attendanceMap[attKey]?.status;
                      if (currentStatus === 'attended') {
                        handleAttendanceMark(lesson, weekday, 'missed', lessonDate);
                      } else if (currentStatus === 'missed') {
                        handleAttendanceMark(lesson, weekday, 'excused', lessonDate);
                      } else if (currentStatus === 'excused') {
                        handleAttendanceMark(lesson, weekday, 'excused', lessonDate);
                      } else {
                        handleAttendanceMark(lesson, weekday, 'attended', lessonDate);
                      }
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: (() => {
                        const { group, dateISO, lessonType } = getAttendanceMeta(lesson, weekday, lessonDate);
                        const attKey = buildAttendanceKeyV2(lesson.subject, weekday, lesson.time, group, dateISO, lessonType);
                        const status = attendanceMap[attKey]?.status;
                        if (status === 'attended') return 'rgba(16, 185, 129, 0.14)';
                        if (status === 'missed') return 'rgba(239, 68, 68, 0.14)';
                        if (status === 'excused') return 'rgba(245, 158, 11, 0.14)';
                        return glass.surfaceTertiary;
                      })(),
                    }}
                  >
                    {(() => {
                      const { group, dateISO, lessonType } = getAttendanceMeta(lesson, weekday, lessonDate);
                      const attKey = buildAttendanceKeyV2(lesson.subject, weekday, lesson.time, group, dateISO, lessonType);
                      const status = attendanceMap[attKey]?.status;
                      if (status === 'attended') {
                        return <Icon name="checkmark-circle" size={16} color="#10b981" />;
                      }
                      if (status === 'missed') {
                        return <Icon name="close-circle" size={16} color="#ef4444" />;
                      }
                      if (status === 'excused') {
                        return <Icon name="remove-circle" size={16} color="#f59e0b" />;
                      }
                      return <Icon name="checkmark-done-outline" size={16} color={placeholderColor} />;
                    })()}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => openNoteModal(lesson, weekday)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: hasNoteForLesson(lesson, weekday)
                      ? (colors.glass || colors.primary + '10')
                      : glass.surfaceTertiary,
                  }}
                >
                  <Icon
                    name={hasNoteForLesson(lesson, weekday) ? 'create' : 'create-outline'}
                    size={16}
                    color={hasNoteForLesson(lesson, weekday) ? colors.primary : placeholderColor}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
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
      const auditory = await SecureStore.getItemAsync('auditory_name') || '';
      const attendanceTracking = await SecureStore.getItemAsync('attendance_tracking_enabled');
      const freeAuditories = await SecureStore.getItemAsync('free_auditories_enabled');
      
      const shouldShowSelector = showSelector !== 'false';
      const shouldTrackAttendance = attendanceTracking !== 'false';
      const shouldShowFreeAuditories = freeAuditories !== 'false';
      
      setIsTeacherMode(format === 'teacher');
      setIsAuditoryMode(format === 'auditory');
      setShowCourseSelector(shouldShowSelector);
      setTeacherName(teacher);
      setAuditoryName(auditory);
      setAttendanceTrackingEnabled(shouldTrackAttendance);
      setFreeAuditoriesEnabled(shouldShowFreeAuditories);
      
      console.log('Настройки расписания загружены:', { 
        format, 
        showSelector, 
        shouldShowSelector, 
        teacher,
        auditory,
        shouldTrackAttendance,
        shouldShowFreeAuditories,
      });
      
      if (format === 'teacher' && teacher) {
        // Дожидаемся получения номера недели с сервера перед загрузкой расписания
        let serverWeek = null;
        try {
          const weekResult = await ApiService.getWeekNumbers();
          if (weekResult?.data?.current_week_number) {
            serverWeek = weekResult.data.current_week_number;
            setCurrentWeek(serverWeek);
          }
        } catch (e) {
          console.error('Error fetching week numbers for teacher:', e);
        }
        fetchTeacherSchedule(teacher, serverWeek);
      } else if (format === 'auditory' && auditory) {
        // Дожидаемся получения номера недели с сервера перед загрузкой расписания
        let serverWeek = null;
        try {
          const weekResult = await ApiService.getWeekNumbers();
          if (weekResult?.data?.current_week_number) {
            serverWeek = weekResult.data.current_week_number;
            setCurrentWeek(serverWeek);
          }
        } catch (e) {
          console.error('Error fetching week numbers for auditory:', e);
        }
        fetchAuditorySchedule(auditory, serverWeek);
      }
      
      setSettingsLoaded(true);
    } catch (error) {
      console.error('Error loading schedule settings:', error);
      setSettingsLoaded(true);
    }
  };

  const applyExternalSettings = (settings) => {
    console.log('Применение внешних настроек:', settings);
    
    setIsTeacherMode(settings.format === 'teacher');
    setIsAuditoryMode(settings.format === 'auditory');
    setShowCourseSelector(settings.showSelector !== false);
    setTeacherName(settings.teacher || '');
    setAuditoryName(settings.auditory || '');
    if (typeof settings.attendanceTrackingEnabled === 'boolean') {
      setAttendanceTrackingEnabled(settings.attendanceTrackingEnabled);
    }
    if (typeof settings.freeAuditoriesEnabled === 'boolean') {
      setFreeAuditoriesEnabled(settings.freeAuditoriesEnabled);
    }
    
    if (settings.format === 'teacher' && settings.teacher) {
      fetchTeacherSchedule(settings.teacher);
    } else if (settings.format === 'auditory' && settings.auditory) {
      fetchAuditorySchedule(settings.auditory);
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
        if (result.data.week_number && !week) {
          setCurrentWeek(result.data.week_number);
        }
        try {
          const weekScope = result.data.week_number || week || currentWeek || 'unknown';
          await notificationService.checkScheduleChanges(
            result.data,
            `teacher_${teacher}__week_${weekScope}`,
            { source: result.source }
          );
        } catch (notifyError) {
          console.error('Error checking teacher schedule changes:', notifyError);
        }
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

  const fetchAuditorySchedule = async (auditory, week = null) => {
    if (!auditory) {
      console.log('Номер аудитории не указан');
      return;
    }
    
    setLoadingAuditory(true);
    setError(null);
    try {
      console.log('Загрузка расписания для аудитории:', auditory, 'неделя:', week || currentWeek);
      const result = await ApiService.getAuditorySchedule(auditory, week || currentWeek);
      if (result.data) {
        setAuditorySchedule(result.data);
        if (result.data.week_number && !week) {
          setCurrentWeek(result.data.week_number);
        }
        try {
          const weekScope = result.data.week_number || week || currentWeek || 'unknown';
          await notificationService.checkScheduleChanges(
            result.data,
            `auditory_${auditory}__week_${weekScope}`,
            { source: result.source }
          );
        } catch (notifyError) {
          console.error('Error checking auditory schedule changes:', notifyError);
        }
        console.log('Расписание аудитории загружено:', result.data);
      } else {
        throw new Error('INVALID_RESPONSE');
      }
    } catch (error) {
      console.error('Error fetching auditory schedule:', error);
      setError(error.message || 'load-error');
    } finally {
      setLoadingAuditory(false);
    }
  };

  const changeWeek = (weeks) => {
    const newWeek = currentWeek + weeks;
    if (newWeek >= 1) {
      const direction = weeks > 0 ? 'left' : 'right';
      animateSwitch(direction, () => {
        setCurrentWeek(newWeek);
        if (isTeacherMode && teacherName) {
          fetchTeacherSchedule(teacherName, newWeek);
        } else if (isAuditoryMode && auditoryName) {
          fetchAuditorySchedule(auditoryName, newWeek);
        }
      });
    }
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

  const clearAuditoryScheduleCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const auditoryKeys = keys.filter(key => key.startsWith('auditory_schedule_'));
      
      if (auditoryKeys.length > 0) {
        await AsyncStorage.multiRemove(auditoryKeys);
        console.log('Кэш расписания аудиторий очищен:', auditoryKeys.length, 'ключей');
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing auditory schedule cache:', error);
      return false;
    }
  };

  const handleExportCalendar = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      let mode = 'student';
      let title = selectedGroup || '';
      if (isTeacherMode) {
        mode = 'teacher';
        title = teacherName;
      } else if (isAuditoryMode) {
        mode = 'auditory';
        title = auditoryName;
      }

      await exportScheduleToCalendar({
        mode,
        viewMode,
        scheduleData,
        teacherSchedule,
        auditorySchedule,
        pairsTime,
        currentWeek,
        currentDate,
        title,
      });
    } catch (err) {
      if (err.message === 'NO_EVENTS') {
        Alert.alert('Экспорт', 'Нет занятий для экспорта');
      } else if (err.message === 'SHARING_NOT_AVAILABLE') {
        Alert.alert('Экспорт', 'Функция "Поделиться" недоступна на этом устройстве');
      } else {
        console.error('Calendar export error:', err);
        Alert.alert('Ошибка', 'Не удалось экспортировать расписание');
      }
    } finally {
      setExporting(false);
    }
  }, [isTeacherMode, isAuditoryMode, teacherName, auditoryName, selectedGroup, viewMode, scheduleData, teacherSchedule, auditorySchedule, pairsTime, currentWeek, currentDate, exporting]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchWeekNumbers();
      if (isOnline) {
        if (isTeacherMode) {
          await clearTeacherScheduleCache();
        } else if (isAuditoryMode) {
          await clearAuditoryScheduleCache();
        } else {
          await clearScheduleCache();
        }
      }
      
      if (isTeacherMode && teacherName) {
        await fetchTeacherSchedule(teacherName, viewMode === 'week' ? currentWeek : null);
      } else if (isAuditoryMode && auditoryName) {
        await fetchAuditorySchedule(auditoryName, currentWeek);
      } else {
        await onRefresh();
      }
    } catch (e) {
      console.error('Ошибка при обновлении:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleShareSchedule = useCallback(async () => {
    if (exporting || !shareImageRef.current) return;
    setExporting(true);
    try {
      const uri = await shareImageRef.current.capture();
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Ошибка', 'Функция "Поделиться" недоступна на этом устройстве');
        return;
      }
      
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Поделиться расписанием',
      });
    } catch (err) {
      console.error('Share schedule error:', err);
      Alert.alert('Ошибка', 'Не удалось создать скриншот расписания');
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  const handleExportAction = useCallback(() => {
    Alert.alert(
      'Поделиться расписанием',
      'Выберите формат',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: '📅 Календарь (.ics)', onPress: handleExportCalendar },
        { text: '📸 Скриншот', onPress: handleShareSchedule },
      ]
    );
  }, [handleExportCalendar, handleShareSchedule]);

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
        style={{ marginBottom: 20 }}
      >
        {/* Заголовок дня */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginBottom: 12,
          paddingHorizontal: 4,
        }}>
          {isCurrent && (
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.primary,
              marginRight: 8,
            }} />
          )}
          <Text style={{ 
            fontSize: 17, 
            fontWeight: '700', 
            color: isCurrent ? colors.primary : textColor, 
            fontFamily: 'Montserrat_700Bold',
            letterSpacing: 0.2,
          }}>
            {weekdays[day.weekday - 1]}
          </Text>
          <Text style={{ 
            color: placeholderColor, 
            marginLeft: 8, 
            fontSize: 14,
            fontFamily: 'Montserrat_400Regular',
          }}>
            {formatDate(date)}
          </Text>
          {isCurrent && (
            <View style={{
              marginLeft: 8,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 8,
              backgroundColor: colors.primary + '18',
            }}>
              <Text style={{ 
                fontSize: 11, 
                color: colors.primary, 
                fontFamily: 'Montserrat_600SemiBold' 
              }}>
                Сегодня
              </Text>
            </View>
          )}
        </View>

        {day.lessons && day.lessons.length > 0 ? (
          day.lessons.map((lesson, lessonIndex) => {
            if (!lesson) return null;
            
            const pairTime = getTimeForLesson(lesson.time);
            const lessonDate = getLessonDateForWeek(weekNumber, day.weekday, currentTime);
            const isCurrentLessonFlag = isCurrentLesson(lesson, pairTime, currentTime, lessonDate);
            
            return renderLessonCard(lesson, lessonIndex, pairTime, isCurrentLessonFlag, isTeacherMode, isAuditoryMode, day.weekday, date);
          })
        ) : (
          <View style={{
            backgroundColor: glass.surfaceSecondary,
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: glass.border,
          }}>
            <Icon name="sunny-outline" size={28} color={placeholderColor} style={{ marginBottom: 6 }} />
            <Text style={{ color: placeholderColor, fontFamily: 'Montserrat_400Regular', fontSize: 14 }}>Занятий нет</Text>
          </View>
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

    const isToday = (() => {
      const now = new Date();
      return currentDate.getDate() === now.getDate() && 
             currentDate.getMonth() === now.getMonth() && 
             currentDate.getFullYear() === now.getFullYear();
    })();
    
    return (
      <View style={{ marginBottom: 16 }}>
        {/* Заголовок дня */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginBottom: 12,
          paddingHorizontal: 4,
        }}>
          {isToday && (
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.primary,
              marginRight: 8,
            }} />
          )}
          <Text style={{ 
            fontSize: 17, 
            fontWeight: '700', 
            color: isToday ? colors.primary : textColor, 
            fontFamily: 'Montserrat_700Bold',
            letterSpacing: 0.2,
          }}>
            {weekdays[weekday - 1]}
          </Text>
          <Text style={{ 
            color: placeholderColor, 
            marginLeft: 8, 
            fontSize: 14,
            fontFamily: 'Montserrat_400Regular',
          }}>
            {formatDate(currentDate)}
          </Text>
          {isToday && (
            <View style={{
              marginLeft: 8,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 8,
              backgroundColor: colors.primary + '18',
            }}>
              <Text style={{ 
                fontSize: 11, 
                color: colors.primary, 
                fontFamily: 'Montserrat_600SemiBold' 
              }}>
                Сегодня
              </Text>
            </View>
          )}
        </View>

        {daySchedule.lessons && daySchedule.lessons.length > 0 ? (
          daySchedule.lessons.map((lesson, index) => {
            if (!lesson) return null;
            
            const pairTime = getTimeForLesson(lesson.time);
            const isCurrentLessonFlag = isCurrentLesson(lesson, pairTime, currentTime, currentDate);
            
            return renderLessonCard(lesson, index, pairTime, isCurrentLessonFlag, false, false, weekday, currentDate);
          })
        ) : (
          <View style={{
            backgroundColor: glass.surfaceSecondary,
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: glass.border,
          }}>
            <Icon name="sunny-outline" size={28} color={placeholderColor} style={{ marginBottom: 6 }} />
            <Text style={{ color: placeholderColor, fontFamily: 'Montserrat_400Regular', fontSize: 14 }}>Занятий нет</Text>
          </View>
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
          top: 8,
          left: 12,
          right: 12,
          backgroundColor: glass.backgroundElevated,
          borderRadius: 20,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: glass.borderStrong,
          zIndex: 1000,
          transform: [{ translateY: headerTranslateY }],
          opacity: headerOpacity,
          paddingHorizontal: 16,
          paddingVertical: 12,
          shadowColor: glass.shadowStrong,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 16,
          elevation: 8,
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
            ) : isAuditoryMode ? (
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
                  Расписание аудитории
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
                  {auditoryName || 'Аудитория не указана'}
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
          
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            flexShrink: 0,
            backgroundColor: glass.surfaceSecondary,
            borderRadius: 14,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: glass.border,
            paddingVertical: 4,
            paddingHorizontal: 4,
          }}>
            <TouchableOpacity 
              onPress={() => changeWeek(-1)} 
              style={{ padding: 6, borderRadius: 10, backgroundColor: isAnimating ? 'transparent' : colors.glass }}
              disabled={isAnimating}
            >
              <Icon name="chevron-back" size={18} color={isAnimating ? placeholderColor : colors.primary} />
            </TouchableOpacity>
            
            <Text 
              numberOfLines={1}
              style={{ 
                color: textColor, 
                fontSize: 13,
                marginHorizontal: 8, 
                fontFamily: 'Montserrat_600SemiBold',
                minWidth: 56,
                textAlign: 'center'
              }}
            >
              Нед. {currentWeek}
            </Text>
            
            <TouchableOpacity 
              onPress={() => changeWeek(1)} 
              style={{ padding: 6, borderRadius: 10, backgroundColor: isAnimating ? 'transparent' : colors.glass }}
              disabled={isAnimating}
            >
              <Icon name="chevron-forward" size={18} color={isAnimating ? placeholderColor : colors.primary} />
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
    
    if (isAuditoryMode) {
      return (
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: textColor, fontFamily: 'Montserrat_600SemiBold' }}>
            Расписание аудитории
          </Text>
          <Text style={{ color: colors.primary, marginTop: 4, fontFamily: 'Montserrat_500Medium' }}>
            {auditoryName || 'Аудитория не указана'}
          </Text>
        </View>
      );
    }
    
    return null;
  };

  // Рендер управления с анимацией
  const renderControls = () => {
    if (isTeacherMode || isAuditoryMode) {
      return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center',
            backgroundColor: glass.surfaceSecondary, 
            borderRadius: 14, 
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: glass.border,
          }}>
            <Icon name="calendar-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: textColor, fontSize: 13, fontFamily: 'Montserrat_600SemiBold' }}>Недельное</Text>
          </View>
          
          <Animated.View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: glass.surfaceSecondary,
              borderRadius: 14,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: glass.border,
              paddingVertical: 4,
              paddingHorizontal: 4,
              transform: [{ translateX: dateSlideAnim }],
              opacity: dateOpacityAnim,
            }}
          >
            <TouchableOpacity 
              onPress={() => changeWeek(-1)} 
              style={{ padding: 6, borderRadius: 10, backgroundColor: isAnimating ? 'transparent' : colors.glass }}
              disabled={isAnimating}
            >
              <Icon name="chevron-back" size={18} color={isAnimating ? placeholderColor : colors.primary} />
            </TouchableOpacity>
            
            <Text style={{ color: textColor, fontSize: 13, marginHorizontal: 8, fontFamily: 'Montserrat_600SemiBold' }}>
              Нед. {currentWeek}
            </Text>
            
            <TouchableOpacity 
              onPress={() => changeWeek(1)} 
              style={{ padding: 6, borderRadius: 10, backgroundColor: isAnimating ? 'transparent' : colors.glass }}
              disabled={isAnimating}
            >
              <Icon name="chevron-forward" size={18} color={isAnimating ? placeholderColor : colors.primary} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      );
    }
    
    // Студенческий режим
    if (selectedGroup || showCourseSelector) {
      return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ 
            flexDirection: 'row', 
            backgroundColor: glass.surfaceSecondary, 
            borderRadius: 14, 
            padding: 3,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: glass.border,
          }}>
            <TouchableOpacity
              onPress={() => setViewMode('day')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: viewMode === 'day' ? selectorActiveBg : 'transparent',
                shadowColor: viewMode === 'day' ? selectorActiveShadow : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: viewMode === 'day' ? 0.3 : 0,
                shadowRadius: 4,
                elevation: viewMode === 'day' ? 3 : 0,
              }}
            >
              <Icon name="today-outline" size={15} color={viewMode === 'day' ? selectorActiveText : placeholderColor} style={{ marginRight: 5 }} />
              <Text style={{ color: viewMode === 'day' ? selectorActiveText : textColor, fontSize: 13, fontFamily: 'Montserrat_600SemiBold' }}>День</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setViewMode('week');
                setTimeout(() => {
                  scrollToCurrentDate();
                }, 100);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: viewMode === 'week' ? selectorActiveBg : 'transparent',
                shadowColor: viewMode === 'week' ? selectorActiveShadow : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: viewMode === 'week' ? 0.3 : 0,
                shadowRadius: 4,
                elevation: viewMode === 'week' ? 3 : 0,
              }}
            >
              <Icon name="calendar-outline" size={15} color={viewMode === 'week' ? selectorActiveText : placeholderColor} style={{ marginRight: 5 }} />
              <Text style={{ color: viewMode === 'week' ? selectorActiveText : textColor, fontSize: 13, fontFamily: 'Montserrat_600SemiBold' }}>Неделя</Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: glass.surfaceSecondary,
              borderRadius: 14,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: glass.border,
              paddingVertical: 4,
              paddingHorizontal: 4,
              transform: [{ translateX: dateSlideAnim }],
              opacity: dateOpacityAnim,
            }}
          >
            <TouchableOpacity
              onPress={() => viewMode === 'day' ? changeDate(-1) : changeWeek(-1)}
              style={{ padding: 6, borderRadius: 10, backgroundColor: isAnimating ? 'transparent' : colors.glass }}
              disabled={isAnimating}
            >
              <Icon name="chevron-back" size={18} color={isAnimating ? placeholderColor : colors.primary} />
            </TouchableOpacity>
            
            <Text style={{ color: textColor, fontSize: 13, marginHorizontal: 8, fontFamily: 'Montserrat_600SemiBold' }}>
              {viewMode === 'day' ? formatDate(currentDate) : `Нед. ${currentWeek}`}
            </Text>
            
            <TouchableOpacity
              onPress={() => viewMode === 'day' ? changeDate(1) : changeWeek(1)}
              style={{ padding: 6, borderRadius: 10, backgroundColor: isAnimating ? 'transparent' : colors.glass }}
              disabled={isAnimating}
            >
              <Icon name="chevron-forward" size={18} color={isAnimating ? placeholderColor : colors.primary} />
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
    } else if (isAuditoryMode) {
      if (loadingAuditory) {
        return <ActivityIndicator size="large" color={colors.primary} />;
      }
      
      return (
        <View>
          {auditorySchedule && auditorySchedule.days ? (
            <>
              {auditorySchedule.days.map((day, index) => 
                day && day.lessons ? renderDaySchedule(day, currentWeek, index) : null
              )}
            </>
          ) : (
            <Text style={{ textAlign: 'center', color: placeholderColor, marginTop: 20, fontFamily: 'Montserrat_400Regular' }}>
              {auditoryName ? 'Расписание не найдено' : 'Укажите номер аудитории в настройках'}
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
      
      if (!selectedGroup && groups.length > 0 && (showCourseSelector || selectorExpandedTemp)) {
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

  const hasSelection = (isTeacherMode && teacherName) || (isAuditoryMode && auditoryName) || (!isTeacherMode && !isAuditoryMode && selectedGroup);

  const renderFavoriteToggleButton = ({ compact = false } = {}) => {
    if (!hasSelection) return null;
    return (
      <TouchableOpacity
        onPress={handleToggleFavorite}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: compact ? 5 : 6,
          paddingHorizontal: compact ? 8 : 10,
          borderRadius: compact ? 10 : 12,
          backgroundColor: isFav ? (colors.glass || colors.primary + '15') : glass.surfaceSecondary,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: isFav ? (colors.glassBorder || colors.primary + '35') : glass.border,
          gap: 4,
        }}
      >
        <Icon name={isFav ? 'star' : 'star-outline'} size={compact ? 12 : 13} color={isFav ? colors.primary : placeholderColor} />
        <Text style={{
          fontSize: compact ? 11 : 12,
          fontFamily: 'Montserrat_500Medium',
          color: isFav ? colors.primary : textColor,
        }}>
          {compact ? 'Избр.' : (isFav ? 'В избранном' : 'В избранное')}
        </Text>
      </TouchableOpacity>
    );
  };

  // Кнопки инструментов: посещаемость + свободные аудитории
  const renderToolbar = () => {
    const showAttendanceBtn = attendanceTrackingEnabled && !isTeacherMode && !isAuditoryMode && selectedGroup;
    const showFreeAuditoriesBtn = freeAuditoriesEnabled;
    const showFavoriteInToolbar = hasSelection && (isTeacherMode || isAuditoryMode);
    if (!showFavoriteInToolbar && !showAttendanceBtn && !showFreeAuditoriesBtn) return null;

    const compactActionStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: glass.surfaceSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: glass.border,
      gap: 5,
    };

    return (
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {showFavoriteInToolbar && renderFavoriteToggleButton({ compact: true })}
        {showAttendanceBtn && (
          <TouchableOpacity
            onPress={() => setAttendanceStatsVisible(true)}
            style={compactActionStyle}
          >
            <Icon name="bar-chart-outline" size={13} color={colors.primary} />
            <Text style={{ fontSize: 11, fontFamily: 'Montserrat_500Medium', color: textColor }}>
              Посещаемость
            </Text>
          </TouchableOpacity>
        )}
        {showFreeAuditoriesBtn && (
          <TouchableOpacity
            onPress={() => setFreeAuditoriesVisible(true)}
            style={compactActionStyle}
          >
            <Icon name="grid-outline" size={13} color={colors.primary} />
            <Text style={{ fontSize: 11, fontFamily: 'Montserrat_500Medium', color: textColor }}>
              Своб. аудитории
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderCurrentScreen = () => {

// Обработка ошибок
if (error && !loadingGroups && !loadingSchedule && !loadingTeacher && !loadingAuditory) {
  if (error === 'NO_INTERNET' && (scheduleData || teacherSchedule || auditorySchedule)) {
    // Не показываем ошибку, продолжаем рендерить контент
  } else {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        {/* Снегопад для новогоднего режима (между фоном и контентом) */}
        {isNewYearMode && <Snowfall key={`snowfall-${isNewYearMode}`} theme={theme} intensity={0.8} />}
        
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ConnectionError 
            type={error}
            loading={false}
            onRetry={isTeacherMode ? () => teacherName && fetchTeacherSchedule(teacherName) : isAuditoryMode ? () => auditoryName && fetchAuditorySchedule(auditoryName) : handleRetry}
            onViewCache={handleViewCache}
            showCacheButton={!!scheduleData || !!teacherSchedule || !!auditorySchedule}
            cacheAvailable={!!scheduleData || !!teacherSchedule || !!auditorySchedule}
            theme={theme}
            accentColor={accentColor}
            contentType="schedule"
            message={error === 'NO_INTERNET' ? 'Расписание недоступно без подключения к интернету' : 'Не удалось загрузить расписание'}
            isNewYearMode={isNewYearMode}
          />
        </Animated.View>
      </View>
    );
  }
}

return (
  <View style={{ flex: 1, backgroundColor: bgColor }}>
    {/* Снегопад для новогоднего режима (между фоном и контентом) */}
    {isNewYearMode && <Snowfall key={`snowfall-${isNewYearMode}`} theme={theme} intensity={0.8} />}
    
    <Animated.View style={{ flex: 1, opacity: fadeAnim, zIndex: 2 }}>
      <StatusBar 
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={bgColor}
      />
      
      {/* Фиксированный заголовок */}
      {renderFixedHeader()}
      
      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1, padding: 16 }}
        contentInset={{ top: 0 }}
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
        contentContainerStyle={{ minHeight: height, paddingBottom: 100 }}
      >
        {/* ВСЕ содержимое расписания */}
        
        {/* Заголовок */}
        {renderHeader()}

        {/* Управление */}
        {renderControls()}

        {/* Инструменты: посещаемость, свободные аудитории */}
        {renderToolbar()}

        {/* Студенческий режим: кнопки курса и групп */}
        {settingsLoaded && !isTeacherMode && !isAuditoryMode && (showCourseSelector || selectorExpandedTemp) && (
          <View>
            {/* Кнопка закрытия селектора (только при временном раскрытии) */}
            {selectorExpandedTemp && !showCourseSelector && (
              <TouchableOpacity
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.create(
                    250,
                    LayoutAnimation.Types.easeInEaseOut,
                    LayoutAnimation.Properties.opacity,
                  ));
                  setSelectorExpandedTemp(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-end',
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 12,
                  backgroundColor: glass.surfaceTertiary,
                  marginBottom: 10,
                }}
              >
                <Icon name="chevron-up" size={14} color={placeholderColor} />
                <Text style={{ color: placeholderColor, fontSize: 12, fontFamily: 'Montserrat_500Medium', marginLeft: 4 }}>Свернуть</Text>
              </TouchableOpacity>
            )}
            {/* Кнопки выбора курса */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 }}>
                <View style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: colors.glass,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8,
                }}>
                  <Icon name="school-outline" size={15} color={colors.primary} />
                </View>
                <Text style={{
                  fontSize: 15,
                  fontFamily: 'Montserrat_600SemiBold',
                  color: textColor,
                }}>Курс</Text>
              </View>
              {loadingCourses ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <View style={{ 
                  flexDirection: 'row', 
                  backgroundColor: glass.surfaceSecondary, 
                  borderRadius: 14, 
                  padding: 3,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: glass.border,
                }}>
                  {availableCourses.map(courseItem => (
                    <TouchableOpacity
                      key={courseItem.id}
                      onPress={() => handleCourseSelect(courseItem.id)}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        paddingHorizontal: 10,
                        borderRadius: 12,
                        backgroundColor: course === courseItem.id ? colors.primary : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: course === courseItem.id ? colors.primary : 'transparent',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: course === courseItem.id ? 0.3 : 0,
                        shadowRadius: 4,
                        elevation: course === courseItem.id ? 3 : 0,
                      }}
                    >
                      <Text style={{ 
                        color: course === courseItem.id ? '#ffffff' : textColor,
                        fontFamily: 'Montserrat_600SemiBold',
                        fontSize: 14,
                        textAlign: 'center'
                      }}>
                        {courseItem.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Список групп */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: colors.glass,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 8,
                  }}>
                    <Icon name="people-outline" size={15} color={colors.primary} />
                  </View>
                  <Text style={{
                    fontSize: 15,
                    fontFamily: 'Montserrat_600SemiBold',
                    color: textColor,
                  }}>Группа</Text>
                </View>
                {renderFavoriteToggleButton({ compact: true })}
              </View>
              {loadingGroups ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                  {groups.map(group => (
                    <TouchableOpacity
                      key={group}
                      onPress={() => handleGroupSelect(group)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 18,
                        borderRadius: 14,
                        backgroundColor: selectedGroup === group ? colors.primary : glass.surfaceSecondary,
                        borderWidth: selectedGroup === group ? 1.5 : StyleSheet.hairlineWidth,
                        borderColor: selectedGroup === group ? colors.primary : glass.border,
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: selectedGroup === group ? colors.primary : glass.shadowColor,
                        shadowOffset: { width: 0, height: selectedGroup === group ? 3 : 1 },
                        shadowOpacity: selectedGroup === group ? 0.3 : 0.06,
                        shadowRadius: selectedGroup === group ? 8 : 3,
                        elevation: selectedGroup === group ? 4 : 1,
                      }}
                    >
                      <Text style={{ 
                        color: selectedGroup === group ? '#ffffff' : textColor,
                        fontFamily: selectedGroup === group ? 'Montserrat_600SemiBold' : 'Montserrat_500Medium',
                        fontSize: 14,
                        textAlign: 'center'
                      }}>
                        {group}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Информация о скрытом селекторе */}
        {settingsLoaded && !isTeacherMode && !isAuditoryMode && !showCourseSelector && !selectorExpandedTemp && selectedGroup && (
          <View style={{ 
            backgroundColor: colors.glass || (colors.primary + '10'),
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.glassBorder || (colors.primary + '25'),
            borderRadius: 16,
            paddingVertical: 10,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
          }}>
            <View style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: colors.primary + '18',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 10,
            }}>
              <Icon name="people" size={16} color={colors.primary} />
            </View>
            <Text style={{ 
              color: textColor, 
              fontFamily: 'Montserrat_400Regular', 
              fontSize: 13,
              flex: 1,
              opacity: 0.85,
            }}>
              Группа {selectedGroup}
            </Text>
            {hasSelection && (
              <View style={{ marginRight: 8 }}>
                {renderFavoriteToggleButton({ compact: true })}
              </View>
            )}
            <TouchableOpacity 
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.create(
                  300,
                  LayoutAnimation.Types.easeInEaseOut,
                  LayoutAnimation.Properties.opacity,
                ));
                setSelectorExpandedTemp(true);
              }}
              style={{
                paddingVertical: 4,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: colors.primary + '15',
              }}
            >
              <Text style={{ 
                color: colors.primary, 
                fontFamily: 'Montserrat_500Medium',
                fontSize: 12,
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
      </ScrollView>
    </Animated.View>
  </View>
);
  };

  return (
    <View style={{ flex: 1 }}>
      {renderCurrentScreen()}
      <Modal
        visible={favoritesModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFavoritesModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: glass.backgroundElevated || bgColor }}>
          <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 16,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: glass.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.glass || colors.primary + '18',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Icon name="star-outline" size={18} color={colors.primary} />
              </View>
              <Text style={{ color: textColor, fontSize: 18, fontFamily: 'Montserrat_700Bold' }}>
                Избранные расписания
              </Text>
            </View>
            <TouchableOpacity onPress={() => setFavoritesModalVisible(false)}>
              <Icon name="close" size={22} color={placeholderColor} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
            {favorites.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 44 }}>
                <Icon name="star-outline" size={44} color={placeholderColor} style={{ marginBottom: 10 }} />
                <Text style={{ color: placeholderColor, fontFamily: 'Montserrat_600SemiBold', fontSize: 15 }}>
                  Избранных расписаний пока нет
                </Text>
                <Text style={{ color: placeholderColor, fontFamily: 'Montserrat_400Regular', fontSize: 13, marginTop: 6, textAlign: 'center', opacity: 0.9 }}>
                  Добавьте группы, преподавателей или аудитории в избранное
                </Text>
              </View>
            ) : (
              (() => {
                const sections = [
                  {
                    key: 'student',
                    title: 'Студенческие группы',
                    icon: 'people-outline',
                    data: favorites.filter(f => f.type === 'student'),
                  },
                  {
                    key: 'teacher',
                    title: 'Преподаватели',
                    icon: 'person-outline',
                    data: favorites.filter(f => f.type === 'teacher'),
                  },
                  {
                    key: 'auditory',
                    title: 'Аудитории',
                    icon: 'business-outline',
                    data: favorites.filter(f => f.type === 'auditory'),
                  },
                ].filter(section => section.data.length > 0);

                return sections.map(section => (
                  <View key={section.key} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Icon name={section.icon} size={15} color={colors.primary} />
                      <Text style={{ marginLeft: 6, color: placeholderColor, fontSize: 12, fontFamily: 'Montserrat_600SemiBold' }}>
                        {section.title.toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ gap: 8 }}>
                      {section.data.map(fav => {
                        const active = checkIsActiveFavorite(fav);
                        return (
                          <View
                            key={fav.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              borderRadius: 12,
                              borderWidth: StyleSheet.hairlineWidth,
                              borderColor: active ? colors.primary : glass.border,
                              backgroundColor: active ? (colors.glass || colors.primary + '10') : glass.surfaceSecondary,
                              paddingVertical: 9,
                              paddingHorizontal: 10,
                            }}
                          >
                            <TouchableOpacity
                              onPress={() => {
                                applyFavorite(fav);
                                setFavoritesModalVisible(false);
                              }}
                              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}
                            >
                              <Icon name={active ? 'star' : 'star-outline'} size={14} color={active ? colors.primary : placeholderColor} />
                              <Text numberOfLines={1} style={{ marginLeft: 8, color: textColor, fontSize: 13, fontFamily: 'Montserrat_500Medium', flex: 1 }}>
                                {fav.label}
                              </Text>
                              {active && (
                                <Text style={{ color: colors.primary, fontSize: 11, fontFamily: 'Montserrat_600SemiBold', marginRight: 4 }}>
                                  Активно
                                </Text>
                              )}
                              <Icon name="chevron-forward" size={14} color={placeholderColor} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleRemoveFavoriteFromBar(fav.id, fav.label)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              }}
                            >
                              <Icon name="trash-outline" size={14} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ));
              })()
            )}
          </ScrollView>
        </View>
      </Modal>
      <LessonNoteModal
        visible={noteModalVisible}
        onClose={handleNoteModalClose}
        lesson={noteModalLesson}
        weekday={noteModalWeekday}
        theme={theme}
        accentColor={accentColor}
      />
      <AttendanceStatsModal
        visible={attendanceStatsVisible}
        onClose={() => setAttendanceStatsVisible(false)}
        attendanceMap={attendanceMap}
        theme={theme}
        accentColor={accentColor}
      />
      <FreeAuditoriesScreen
        visible={freeAuditoriesVisible}
        onClose={() => setFreeAuditoriesVisible(false)}
        theme={theme}
        accentColor={accentColor}
        currentWeek={currentWeek}
        pairsTime={pairsTime}
      />
      <ScheduleShareImage
        ref={shareImageRef}
        theme={theme}
        accentColor={accentColor}
        scheduleData={scheduleData}
        teacherSchedule={teacherSchedule}
        auditorySchedule={auditorySchedule}
        isTeacherMode={isTeacherMode}
        isAuditoryMode={isAuditoryMode}
        teacherName={teacherName}
        auditoryName={auditoryName}
        selectedGroup={selectedGroup}
        viewMode={viewMode}
        currentDate={currentDate}
        currentWeek={currentWeek}
        pairsTime={pairsTime}
      />
    </View>
  );
  // Стили могут быть добавлены при необходимости
};

export default ScheduleScreen;