import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getWithExpiryAndInfo, setWithExpiry } from '../utils/cache';
import { getWeekNumber, getWeekDayName, getFirstDayOfWeek, isWeekend } from '../utils/dateUtils';
import { ACCENT_COLORS, COURSES } from '../utils/constants';
import ConnectionError from './ConnectionError';
import NetInfo from '@react-native-community/netinfo';
import { fetchAPI } from '../utils/api';
import DailyScheduleList from './Schedule/DailyScheduleList';

const { width } = Dimensions.get('window');

const ScheduleScreen = ({ theme, accentColor }) => {
  const [course, setCourse] = useState(1);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState(null);
  const [showCachedData, setShowCachedData] = useState(false);
  const [cacheDate, setCacheDate] = useState(null);

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const colors = ACCENT_COLORS[accentColor];

  const currentWeekNumber = useMemo(() => getWeekNumber(new Date()), []);
  const weekNumber = useMemo(() => getWeekNumber(currentDate), [currentDate]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });
    fetchGroupsAndSchedule(true);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchSchedule();
    }
  }, [selectedGroup, currentDate]);

  const fetchGroupsAndSchedule = async (isInitialLoad = false) => {
    setLoadingGroups(true);
    setError(null);
    setShowCachedData(false);
    
    const groupsUrl = '/groups';
    
    try {
      const { data, source, cacheDate: fetchedCacheDate } = await fetchAPI(groupsUrl, 'schedule_groups');
      
      if (source === 'cache') {
        setShowCachedData(true);
        setCacheDate(fetchedCacheDate);
        setGroups(data);
        if (!selectedGroup && data.length > 0) {
          const storedGroup = await getWithExpiry('selectedGroup');
          setSelectedGroup(storedGroup || data[0].group_name);
        }
      } else {
        setGroups(data);
        if (!selectedGroup && data.length > 0) {
          const storedGroup = await getWithExpiry('selectedGroup');
          setSelectedGroup(storedGroup || data[0].group_name);
        }
        await setWithExpiry('schedule_groups_cache', data);
      }
    } catch (err) {
      setError(err);
      const cachedData = await getWithExpiryAndInfo('schedule_groups_cache');
      if (cachedData) {
        setShowCachedData(true);
        setCacheDate(cachedData.cacheDate);
        setGroups(cachedData.value);
        if (!selectedGroup && cachedData.value.length > 0) {
          const storedGroup = await getWithExpiry('selectedGroup');
          setSelectedGroup(storedGroup || cachedData.value[0].group_name);
        }
      }
    } finally {
      setLoadingGroups(false);
      setRefreshing(false);
    }
  };

  const fetchSchedule = async () => {
    if (!selectedGroup) return;

    setLoadingSchedule(true);
    setError(null);
    setShowCachedData(false);
    
    const scheduleUrl = `/schedule?group=${selectedGroup}`;

    try {
      const { data, source, cacheDate: fetchedCacheDate } = await fetchAPI(scheduleUrl, 'schedule');
      if (source === 'cache') {
        setShowCachedData(true);
        setCacheDate(fetchedCacheDate);
        setScheduleData(data);
      } else {
        setScheduleData(data);
        await setWithExpiry('schedule_cache_' + selectedGroup, data);
      }
    } catch (err) {
      setError(err);
      const cachedData = await getWithExpiryAndInfo('schedule_cache_' + selectedGroup);
      if (cachedData) {
        setShowCachedData(true);
        setCacheDate(cachedData.cacheDate);
        setScheduleData(cachedData.value);
      }
    } finally {
      setLoadingSchedule(false);
      setRefreshing(false);
    }
  };

  const onSelectGroup = async (group) => {
    setSelectedGroup(group);
    await setWithExpiry('selectedGroup', group);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGroupsAndSchedule();
  }, [selectedGroup]);

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const changeDay = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const today = new Date();
  const isToday = currentDate.toDateString() === today.toDateString();
  
  const dailySchedule = scheduleData?.find(item => item.date === getWeekDayName(currentDate));

  if (error && !showCachedData) {
    return <ConnectionError 
      type="load-error" 
      onRetry={fetchGroupsAndSchedule} 
      onViewCache={fetchGroupsAndSchedule} 
      theme={theme} 
      accentColor={accentColor}
      contentType="schedule"
      message={error.message}
    />;
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={[styles.title, { color: textColor }]}>Расписание</Text>

        {showCachedData && (
          <View style={[styles.cacheInfo, { backgroundColor: colors.light }]}>
            <Icon name="cloud-offline-outline" size={20} color={colors.primary} />
            <Text style={[styles.cacheText, { color: colors.primary }]}>
              Показаны кэшированные данные от {new Date(cacheDate).toLocaleDateString()}. Нет подключения к интернету.
            </Text>
          </View>
        )}

        {/* Навигация по курсам и группам */}
        <View style={styles.groupSelectionContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courseList}>
            {COURSES.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.courseButton, { backgroundColor: course === c.id ? colors.primary : cardBg }]}
                onPress={() => setCourse(c.id)}
              >
                <Text style={[styles.courseText, { color: course === c.id ? '#ffffff' : textColor }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingGroups ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 10 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupList}>
              {groups.filter(g => g.course_id === course).map(g => (
                <TouchableOpacity
                  key={g.group_id}
                  style={[styles.groupButton, { borderColor: colors.primary, backgroundColor: selectedGroup === g.group_name ? colors.light : 'transparent' }]}
                  onPress={() => onSelectGroup(g.group_name)}
                >
                  <Text style={[styles.groupText, { color: selectedGroup === g.group_name ? colors.primary : textColor }]}>
                    {g.group_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Навигация по дням */}
        <View style={[styles.dayNavigationContainer, { backgroundColor: cardBg }]}>
          <TouchableOpacity onPress={() => changeDay(-1)}>
            <Icon name="chevron-back" size={24} color={textColor} />
          </TouchableOpacity>
          <View style={styles.dateInfo}>
            <Text style={[styles.dayText, { color: textColor }]}>{getWeekDayName(currentDate)}</Text>
            <Text style={[styles.dateText, { color: placeholderColor }]}>{currentDate.toLocaleDateString()}</Text>
          </View>
          <TouchableOpacity onPress={() => changeDay(1)}>
            <Icon name="chevron-forward" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        {!isToday && (
          <TouchableOpacity onPress={goToToday} style={[styles.todayButton, { backgroundColor: colors.primary }]}>
            <Text style={[styles.todayButtonText, { color: '#ffffff' }]}>Сегодня</Text>
          </TouchableOpacity>
        )}
        
        {loadingSchedule ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : dailySchedule ? (
          <DailyScheduleList dailySchedule={dailySchedule} theme={theme} accentColor={accentColor} />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: placeholderColor }]}>
              {isWeekend(currentDate) ? 'Выходной день!' : 'На этот день занятий нет.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  groupSelectionContainer: {
    marginBottom: 20,
  },
  courseList: {
    marginBottom: 10,
    gap: 8,
  },
  courseButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  courseText: {
    fontWeight: 'bold',
    fontFamily: 'Montserrat_600SemiBold',
  },
  groupList: {
    gap: 8,
  },
  groupButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  groupText: {
    fontWeight: 'bold',
    fontFamily: 'Montserrat_600SemiBold',
  },
  dayNavigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  dateInfo: {
    alignItems: 'center',
  },
  dayText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Montserrat_600SemiBold',
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  todayButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  todayButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat_600SemiBold',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
  },
  cacheInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  cacheText: {
    marginLeft: 8,
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
});

export default ScheduleScreen;