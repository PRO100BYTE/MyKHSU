import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import ApiService from '../utils/api';
import notificationService from '../utils/notificationService';
import { getWeekNumber } from '../utils/dateUtils';
import * as SecureStore from 'expo-secure-store';

export const useScheduleLogic = () => {
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
  }, []);

  // Загрузка групп при изменении курса
  useEffect(() => {
    fetchGroupsForCourse(course);
  }, [course]);

  // Загрузка времени пар
  useEffect(() => {
    fetchPairsTime();
  }, []);

  // Загрузка расписания при изменении выбранной группы или других параметров
  useEffect(() => {
    if (selectedGroup) {
      fetchScheduleData(selectedGroup);
    }
  }, [viewMode, currentDate, currentWeek, selectedGroup]);

  const loadInitialSettings = async () => {
    try {
      const savedCourse = await SecureStore.getItemAsync('default_course');
      const savedGroup = await SecureStore.getItemAsync('default_group');
      
      if (savedCourse) {
        setCourse(parseInt(savedCourse));
      }
      
      console.log('Загружены начальные настройки:', { course: savedCourse, group: savedGroup });
    } catch (error) {
      console.error('Error loading initial settings:', error);
    }
  };

  const fetchGroupsForCourse = async (courseId) => {
    setLoadingGroups(true);
    setError(null);
    
    try {
      const result = await ApiService.getGroups(courseId);
      const processedGroups = processGroupsData(result);
      
      setGroups(processedGroups);
      setCachedGroups(processedGroups);
      
      if (result.source === 'cache' || result.source === 'stale_cache') {
        setShowCachedData(true);
        setCacheInfo(result);
      }
      
      console.log('Загружены группы для курса', courseId, ':', processedGroups);
      
      // Автоматический выбор группы после загрузки
      await autoSelectGroup(processedGroups, courseId);
      
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('load-error');
      
      if (cachedGroups.length > 0) {
        setGroups(cachedGroups);
        setShowCachedData(true);
        // Пробуем выбрать группу из кэша
        autoSelectGroup(cachedGroups, courseId);
      } else {
        setGroups([]);
      }
    } finally {
      setLoadingGroups(false);
    }
  };

  const autoSelectGroup = async (availableGroups, currentCourseId) => {
    if (availableGroups.length === 0) return;
    
    try {
      const savedGroup = await SecureStore.getItemAsync('default_group');
      const savedCourse = await SecureStore.getItemAsync('default_course');
      const showSelector = await SecureStore.getItemAsync('show_course_selector');
      
      // Если есть сохраненная группа и она доступна в текущем курсе
      if (savedGroup && availableGroups.includes(savedGroup) && 
          parseInt(savedCourse) === currentCourseId) {
        setSelectedGroup(savedGroup);
        console.log('Автоматически выбрана сохраненная группа:', savedGroup);
      } 
      // Если нет выбранной группы, но есть сохраненная (даже если курс не совпадает)
      else if (!selectedGroup && savedGroup && availableGroups.includes(savedGroup)) {
        setSelectedGroup(savedGroup);
        console.log('Выбрана сохраненная группа (курс мог измениться):', savedGroup);
      }
      // Если все еще нет выбранной группы, выбираем первую
      else if (!selectedGroup && availableGroups.length > 0) {
        setSelectedGroup(availableGroups[0]);
        console.log('Выбрана первая группа из списка:', availableGroups[0]);
      }
    } catch (error) {
      console.error('Error in autoSelectGroup:', error);
    }
  };

  const fetchPairsTime = async () => {
    try {
      const result = await ApiService.getPairsTime();
      const processedTime = processPairsTimeData(result);
      
      setPairsTime(processedTime);
      setCachedPairsTime(processedTime);
    } catch (error) {
      console.error('Error fetching pairs time:', error);
      if (cachedPairsTime.length > 0) {
        setPairsTime(cachedPairsTime);
      }
    }
  };

  const fetchScheduleData = async (group) => {
    if (!group) return;
    
    setLoadingSchedule(true);
    setError(null);
    setShowCachedData(false);
    
    try {
      let result;
      if (viewMode === 'day') {
        result = await ApiService.getSchedule(group, currentDate);
      } else {
        result = await ApiService.getSchedule(group, null, currentWeek);
      }
      
      const processedSchedule = processScheduleData(result, currentDate);
      setScheduleData(processedSchedule);
      setCachedScheduleData(processedSchedule);
      
      if (result.source === 'cache' || result.source === 'stale_cache') {
        setShowCachedData(true);
        setCacheInfo(result);
      }
      
      try {
        await notificationService.scheduleLessonNotifications(processedSchedule, pairsTime);
      } catch (notifyError) {
        console.error('Error scheduling notifications:', notifyError);
      }
      
      console.log('Загружено расписание для группы', group);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setError('load-error');
      
      if (cachedScheduleData) {
        setScheduleData(cachedScheduleData);
        setShowCachedData(true);
        setCacheInfo({ source: 'stale_cache', cacheInfo: { cacheDate: new Date().toISOString() } });
      }
    } finally {
      setLoadingSchedule(false);
      setRefreshing(false);
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
      fetchScheduleData(selectedGroup);
    } else {
      fetchGroupsForCourse(course);
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
    
    // Setters
    setCourse,
    setSelectedGroup,
    setViewMode,
    setCurrentWeek,
    
    // Functions
    handleRetry,
    handleViewCache,
    onRefresh,
    navigateDate,
    setError
  };
};