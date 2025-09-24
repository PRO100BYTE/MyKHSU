// hooks/useScheduleLogic.js
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import ApiService from '../utils/api';
import notificationService from '../utils/notificationService';
import scheduleUtils from '../utils/scheduleUtils';
import { getWeekNumber } from '../utils/dateUtils';

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

  // Загрузка групп
  useEffect(() => {
    fetchGroupsForCourse(course);
  }, [course]);

  // Загрузка времени пар
  useEffect(() => {
    fetchPairsTime();
  }, []);

  // Загрузка расписания
  useEffect(() => {
    if (selectedGroup) {
      fetchScheduleData(selectedGroup);
    }
  }, [viewMode, currentDate, currentWeek, selectedGroup]);

  const fetchGroupsForCourse = async (courseId) => {
    setLoadingGroups(true);
    setError(null);
    
    try {
      const result = await ApiService.getGroups(courseId);
      const processedGroups = scheduleUtils.processGroupsData(result);
      
      setGroups(processedGroups);
      setCachedGroups(processedGroups);
      
      if (result.source === 'cache' || result.source === 'stale_cache') {
        setShowCachedData(true);
        setCacheInfo(result);
      }
      
      if (processedGroups.length > 0 && !selectedGroup) {
        setSelectedGroup(processedGroups[0]);
      }
      
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('load-error');
      
      if (cachedGroups.length > 0) {
        setGroups(cachedGroups);
        setShowCachedData(true);
      } else {
        setGroups([]);
      }
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchPairsTime = async () => {
    try {
      const result = await ApiService.getPairsTime();
      const processedTime = scheduleUtils.processPairsTimeData(result);
      
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
      
      const processedSchedule = scheduleUtils.processScheduleData(result, currentDate);
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
    
    // Functions
    handleRetry,
    handleViewCache,
    onRefresh,
    navigateDate,
    setError
  };
};