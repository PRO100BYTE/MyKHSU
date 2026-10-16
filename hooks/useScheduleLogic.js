import { useState, useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import ApiService from '../utils/api';
import notificationService from '../utils/notificationService';
import { getWeekNumber, setServerWeekNumber } from '../utils/dateUtils';
import { unlockAchievement } from '../utils/achievements';
import * as SecureStore from 'expo-secure-store';
import { COURSES } from '../utils/constants';
import { getScheduleGroups, resolveScheduleSelection } from '../utils/scheduleSelection';

const normalizeScheduleErrorCode = (error) => {
  const raw = String(error?.message || error || 'load-error');

  if (/NO_INTERNET/i.test(raw)) return 'NO_INTERNET';
  if (/API_UNAVAILABLE/i.test(raw)) return 'API_UNAVAILABLE';
  if (/INVALID_JSON/i.test(raw)) return 'INVALID_JSON';
  if (/JSON\s*Parse\s*error/i.test(raw) || /Unexpected\s*character/i.test(raw)) return 'JSON_PARSE_ERROR';

  return 'load-error';
};

export const useScheduleLogic = () => {
  const [course, updateCourse] = useState(1);
  const [groups, setGroups] = useState([]);
  const [cachedGroups, setCachedGroups] = useState([]);
  const [groupsForCourse, setGroupsForCourse] = useState(null);
  const [selectedGroup, updateSelectedGroup] = useState(null);
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
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showCachedData, setShowCachedData] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [initialSettingsLoaded, setInitialSettingsLoaded] = useState(false);
  const groupsRequestId = useRef(0);
  const groupsCacheByCourse = useRef({});
  const currentCourseRef = useRef(course);
  const initialSelectionRef = useRef(null);
  const selectedGroupRef = useRef(null);
  const selectionVersion = useRef(0);
  const scheduleRequestId = useRef(0);
  const scheduleCache = useRef({});

  const setSelectedGroup = useCallback((group) => {
    selectionVersion.current += 1;
    scheduleRequestId.current += 1;
    selectedGroupRef.current = group;
    updateSelectedGroup(group);
    setScheduleData(null);
    setCachedScheduleData(null);
    setLoadingSchedule(false);
  }, []);

  const setCourse = useCallback((nextCourse) => {
    if (currentCourseRef.current === nextCourse) return;
    currentCourseRef.current = nextCourse;
    groupsRequestId.current += 1;
    initialSelectionRef.current = null;
    setSelectedGroup(null);
    setGroupsForCourse(null);
    setGroups([]);
    updateCourse(nextCourse);
  }, [setSelectedGroup]);

  useEffect(() => () => {
    groupsRequestId.current += 1;
    scheduleRequestId.current += 1;
    selectionVersion.current += 1;
  }, []);

  // Обновление текущего времени
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Слушатель сети
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      if (state.isConnected) {
        setShowCachedData(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Загрузка начальных настроек при монтировании
  useEffect(() => {
    loadInitialSettings();
    fetchWeekNumbers();
  }, []);

  // Загрузка групп при изменении курса
  useEffect(() => {
    if (initialSettingsLoaded) {
      if (groupsForCourse !== course) fetchGroupsForCourse(course);
    }
  }, [course, initialSettingsLoaded]);

  // Загрузка времени пар
  useEffect(() => {
    fetchPairsTime();
  }, []);

  useEffect(() => {
    if (!scheduleData || pairsTime.length === 0) return;
    notificationService.scheduleLessonNotifications(scheduleData, pairsTime).catch(error => {
      console.error('Error reconciling lesson notifications:', error);
    });
  }, [scheduleData, pairsTime]);

  // Загрузка расписания при изменении выбранной группы или других параметров
  useEffect(() => {
    if (selectedGroup && groupsForCourse === course) {
      fetchScheduleData(selectedGroup);
    }
  }, [viewMode, currentDate, currentWeek, selectedGroup, groupsForCourse, course]);

  const fetchWeekNumbers = async () => {
    try {
      const result = await ApiService.getWeekNumbers();
      if (result && result.data && result.data.current_week_number) {
        setServerWeekNumber(result.data.current_week_number);
        setCurrentWeek(result.data.current_week_number);
        if (result.data.week_numbers) {
          setAvailableWeeks(result.data.week_numbers);
        }
      } else {
        // Fallback to local calculation
        setCurrentWeek(getWeekNumber(new Date()));
      }
    } catch (error) {
      console.error('Error fetching week numbers:', error);
      // Fallback to local calculation
      setCurrentWeek(getWeekNumber(new Date()));
    }
  };

  const loadInitialSettings = async () => {
    try {
      const [savedCourse, savedGroup] = await Promise.all([
        SecureStore.getItemAsync('default_course'),
        SecureStore.getItemAsync('default_group'),
      ]);
      const parsedCourse = Number.parseInt(savedCourse, 10);
      if (selectionVersion.current !== 0) return;
      const savedCourseId = COURSES.some(item => item.id === parsedCourse) ? parsedCourse : 1;
      currentCourseRef.current = savedCourseId;
      updateCourse(savedCourseId);
      initialSelectionRef.current = { group: savedGroup, course: savedCourseId };
      console.log('Загружены начальные настройки:', { course: savedCourse, group: savedGroup });
    } catch (error) {
      console.error('Error loading initial settings:', error);
    } finally {
      setInitialSettingsLoaded(true);
    }
  };

  const fetchGroupsForCourse = async (courseId) => {
    const requestId = ++groupsRequestId.current;
    const version = selectionVersion.current;
    const isRequestCurrent = () => requestId === groupsRequestId.current && currentCourseRef.current === courseId;
    const isCurrent = () => isRequestCurrent() && version === selectionVersion.current;
    setLoadingGroups(true);
    setError(null);
    try {
      const result = await ApiService.getGroups(courseId);
      if (!isRequestCurrent()) return;
      groupsCacheByCourse.current[courseId] = result;
      setGroupsForCourse(courseId);
      setGroups(getScheduleGroups(result));
      if (!isCurrent()) return;
      const initial = initialSelectionRef.current;
      const preferredGroup = selectedGroupRef.current || (initial?.course === courseId ? initial.group : null);
      const selection = initial?.course === courseId
        ? await resolveScheduleSelection({ course: courseId, group: preferredGroup, result,
          courses: COURSES, getGroups: id => ApiService.getGroups(id), isCurrent })
        : { course: courseId, group: preferredGroup || getScheduleGroups(result)[0] || null,
          groups: getScheduleGroups(result), result };
      if (!selection || !isCurrent()) return;
      initialSelectionRef.current = null;
      groupsCacheByCourse.current[selection.course] = selection.result;
      currentCourseRef.current = selection.course;
      updateCourse(selection.course);
      setGroupsForCourse(selection.course);
      setGroups(selection.groups);
      setCachedGroups(selection.groups);
      selectedGroupRef.current = selection.group;
      updateSelectedGroup(selection.group);
      if (selection.result.source === 'cache' || selection.result.source === 'stale_cache') {
        setShowCachedData(true);
        setCacheInfo(selection.result);
      }
      if (selection.course !== courseId) {
        await SecureStore.setItemAsync('default_course', String(selection.course));
      }
    } catch (error) {
      if (!isCurrent()) return;
      setError(normalizeScheduleErrorCode(error));
      const cached = groupsCacheByCourse.current[courseId];
      const courseGroups = getScheduleGroups(cached);
      setGroupsForCourse(courseId);
      setGroups(courseGroups);
      setCachedGroups(courseGroups);
      const initial = initialSelectionRef.current;
      const group = selectedGroupRef.current || (initial?.course === courseId ? initial.group : null);
      if (group || courseGroups.length) {
        selectedGroupRef.current = group || courseGroups[0];
        updateSelectedGroup(selectedGroupRef.current);
        setShowCachedData(true);
      }
    } finally {
      if (requestId === groupsRequestId.current) {
        setLoadingGroups(false);
        setRefreshing(false);
      }
    }
  };
  const fetchPairsTime = async () => {
    try {
      const result = await ApiService.getPairsTime();
      const processedTime = processPairsTimeData(result);
      
      setPairsTime(processedTime);
      setCachedPairsTime(processedTime);

      if (result.source === 'stale_cache') {
        setShowCachedData(true);
        setCacheInfo(result);
        setError(prevError => prevError || (isOnline ? 'API_UNAVAILABLE' : 'NO_INTERNET'));
      }
    } catch (error) {
      console.error('Error fetching pairs time:', error);
      if (cachedPairsTime.length > 0) {
        setPairsTime(cachedPairsTime);
        setShowCachedData(true);
        setError(prevError => prevError || normalizeScheduleErrorCode(error));
      } else {
        setError(prevError => prevError || normalizeScheduleErrorCode(error));
      }
    }
  };

  const fetchScheduleData = async (group, forceRefresh = false) => {
    if (!group) return;
    const requestId = ++scheduleRequestId.current;
    const requestCourse = currentCourseRef.current;
    const cacheKey = `${requestCourse}:${group}:${viewMode}:${viewMode === 'day' ? currentDate.toDateString() : currentWeek}`;
    const isCurrent = () => requestId === scheduleRequestId.current &&
      group === selectedGroupRef.current && requestCourse === currentCourseRef.current;

    setLoadingSchedule(true);
    setError(null);
    setShowCachedData(false);
    
    try {
      let result;
      if (viewMode === 'day') {
        result = await ApiService.getSchedule(group, currentDate, null, forceRefresh);
      } else {
        result = await ApiService.getSchedule(group, null, currentWeek, forceRefresh);
      }
      
      if (!isCurrent()) return;
      const processedSchedule = processScheduleData(result, currentDate);
      scheduleCache.current[cacheKey] = processedSchedule;
      setScheduleData(processedSchedule);
      setCachedScheduleData(processedSchedule);
      
      if (result.source === 'cache' || result.source === 'stale_cache') {
        setShowCachedData(true);
        setCacheInfo(result);
      }
      
      if (!isCurrent()) return;
      // Проверяем изменения в расписании и уведомляем пользователя
      try {
        const d = new Date(currentDate);
        const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const scopeSuffix = viewMode === 'day'
          ? `day_${localDateStr}`
          : `week_${processedSchedule?.week_number || currentWeek}`;
        await notificationService.checkScheduleChanges(
          processedSchedule,
          `${group}__${scopeSuffix}`,
          { source: result.source }
        );
      } catch (changeError) {
        console.error('Error checking schedule changes:', changeError);
      }
      
      console.log('Загружено расписание для группы', group, 'на', viewMode === 'day' ? currentDate.toDateString() : `неделю ${currentWeek}`);
    } catch (error) {
      if (!isCurrent()) return;
      console.error('Error fetching schedule:', error);
      setError(normalizeScheduleErrorCode(error));
      
      if (scheduleCache.current[cacheKey]) {
        setScheduleData(scheduleCache.current[cacheKey]);
        setShowCachedData(true);
        setCacheInfo({ source: 'stale_cache', cacheInfo: { cacheDate: new Date().toISOString() } });
        unlockAchievement('offline_hero').catch(() => {});
      }
    } finally {
      if (isCurrent()) {
        setLoadingSchedule(false);
        setRefreshing(false);
      }
    }
  };

  const processGroupsData = (result) => {
    if (!result || !result.data) return [];
    
    const groupsData = result.data;
    
    if (Array.isArray(groupsData)) {
      return groupsData.filter(group => group && typeof group === 'string');
    }
    
    if (typeof groupsData === 'object' && groupsData.groups) {
      return Array.isArray(groupsData.groups) ? groupsData.groups : [];
    }
    
    return [];
  };

  const processPairsTimeData = (result) => {
    if (!result || !result.data) return [];
    return result.data.pairs_time || [];
  };

  const processScheduleData = (result, date) => {
    if (!result || !result.data) return null;
    
    return {
      ...result.data,
      currentDate: date
    };
  };

  const handleRetry = () => {
    setError(null);
    setShowCachedData(false);
    if (selectedGroup) {
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
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedGroup) {
      return fetchScheduleData(selectedGroup, true);
    } else {
      return fetchGroupsForCourse(course);
    }
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + direction);
      setCurrentDate(newDate);
    } else {
      setCurrentWeek(currentWeek + direction);
    }
  };

  return {
    // States
    course,
    groups,
    groupsForCourse,
    selectedGroup,
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
    currentDate,
    currentWeek,
    availableWeeks,
    
    // Setters
    setCourse,
    setSelectedGroup,
    setViewMode,
    setCurrentWeek,
    setRefreshing,
    
    // Functions
    handleRetry,
    handleViewCache,
    onRefresh,
    navigateDate,
    setError,
    fetchWeekNumbers
  };
};