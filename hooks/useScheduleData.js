import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import ApiService from '../utils/api';
import notificationService from '../utils/notificationService';
import { getWeekNumber } from '../utils/dateUtils';

export const useScheduleData = (course, viewMode, currentDate, currentWeek) => {
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
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showCachedData, setShowCachedData] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Обновляем текущее время каждую минуту
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Слушатель состояния сети
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      if (state.isConnected) {
        setShowCachedData(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Загрузка групп при изменении курса
  useEffect(() => {
    fetchGroupsForCourse(course);
  }, [course]);

  // Загрузка времени пар при монтировании
  useEffect(() => {
    fetchPairsTime();
  }, []);

  // Загрузка расписания при изменении параметров
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
      
      let groupsData = [];
      
      if (result.data) {
        if (Array.isArray(result.data)) {
          groupsData = result.data;
        } else if (typeof result.data === 'object') {
          if (result.data.groups && Array.isArray(result.data.groups)) {
            groupsData = result.data.groups;
          } else {
            groupsData = Object.values(result.data).filter(item => 
              typeof item === 'string' && item.trim() !== ''
            );
          }
        }
      }
      
      const filteredGroups = groupsData
        .filter(group => group && typeof group === 'string' && group.trim() !== '')
        .filter((group, index, self) => self.indexOf(group) === index)
        .sort();
      
      if (filteredGroups.length > 0) {
        setGroups(filteredGroups);
        setCachedGroups(filteredGroups);
        
        if (result.source === 'cache' || result.source === 'stale_cache') {
          setShowCachedData(true);
          setCacheInfo(result);
        }
        
        if (!selectedGroup) {
          setSelectedGroup(filteredGroups[0]);
        }
      } else {
        setGroups([]);
        setCachedGroups([]);
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
      
      let timeData = [];
      
      if (result.data) {
        if (Array.isArray(result.data)) {
          timeData = result.data;
        } else if (result.data.pairs && Array.isArray(result.data.pairs)) {
          timeData = result.data.pairs;
        } else if (typeof result.data === 'object') {
          timeData = Object.values(result.data).filter(item => 
            item && typeof item === 'object' && item.time_start && item.time_end
          );
        }
      }
      
      if (timeData.length > 0) {
        setPairsTime(timeData);
        setCachedPairsTime(timeData);
      }
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
      
      if (result.data) {
        let scheduleData = result.data;
        
        if (!scheduleData.days && scheduleData.lessons) {
          scheduleData = {
            days: [{ weekday: currentDate.getDay() || 7, lessons: scheduleData.lessons }],
            lessons: scheduleData.lessons
          };
        }
        
        setScheduleData(scheduleData);
        setCachedScheduleData(scheduleData);
        
        if (result.source === 'cache' || result.source === 'stale_cache') {
          setShowCachedData(true);
          setCacheInfo(result);
        }
        
        try {
          await notificationService.scheduleLessonNotifications(scheduleData, pairsTime);
        } catch (notifyError) {
          console.error('Error scheduling notifications:', notifyError);
        }
      } else {
        setScheduleData({ days: [], lessons: [] });
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setError('load-error');
      
      if (cachedScheduleData) {
        setScheduleData(cachedScheduleData);
        setShowCachedData(true);
        setCacheInfo({ source: 'stale_cache', cacheInfo: { cacheDate: new Date().toISOString() } });
      } else {
        setScheduleData({ days: [], lessons: [] });
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

  return {
    // States
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
    
    // Functions
    handleRetry,
    handleViewCache,
    onRefresh,
    setError,
    setCourse: (newCourse) => {
      setCourse(newCourse);
      setSelectedGroup(null);
    }
  };
};