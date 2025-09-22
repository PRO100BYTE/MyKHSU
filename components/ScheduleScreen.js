import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getWeekNumber, formatDate } from '../utils/dateUtils';
import { ACCENT_COLORS, COURSES } from '../utils/constants';
import ApiService from '../utils/api';
import ConnectionError from './ConnectionError';
import NetInfo from '@react-native-community/netinfo';

// Выносим компоненты для упрощения
const CourseSelector = ({ course, setCourse, theme, accentColor }) => {
  const colors = ACCENT_COLORS[accentColor];
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';

  return (
    <View style={[styles.courseSelector, { borderColor }]}>
      {COURSES.map(c => (
        <TouchableOpacity
          key={c.id}
          onPress={() => setCourse(c.id)}
          style={[
            styles.courseButton,
            { 
              backgroundColor: course === c.id ? colors.primary : 'transparent',
              borderColor: course === c.id ? colors.primary : borderColor
            }
          ]}
        >
          <Text style={[
            styles.courseButtonText,
            { color: course === c.id ? '#ffffff' : textColor }
          ]}>
            {c.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const GroupSelector = ({ groups, selectedGroup, onSelectGroup, loading, theme, accentColor }) => {
  const colors = ACCENT_COLORS[accentColor];
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: textColor }]}>Загрузка групп...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.groupSelector}
    >
      {groups.map(group => (
        <TouchableOpacity
          key={group}
          onPress={() => onSelectGroup(group)}
          style={[
            styles.groupButton,
            { 
              backgroundColor: selectedGroup === group ? colors.primary : cardBg,
              borderColor: selectedGroup === group ? colors.primary : borderColor
            }
          ]}
        >
          <Text style={[
            styles.groupButtonText,
            { color: selectedGroup === group ? '#ffffff' : textColor }
          ]}>
            {group}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const ScheduleView = ({ scheduleData, pairsTime, viewMode, theme, accentColor }) => {
  const colors = ACCENT_COLORS[accentColor];
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';

  if (!scheduleData) return null;

  const renderLesson = (lesson) => {
    const pairTime = pairsTime.find(pair => pair.time === lesson.time);
    
    return (
      <View key={lesson.id} style={[styles.lessonCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.lessonHeader}>
          <Text style={[styles.lessonTime, { color: colors.primary }]}>
            Пара {lesson.time}
          </Text>
          {pairTime && (
            <Text style={[styles.lessonTimeRange, { color: textColor }]}>
              {pairTime.time_start} - {pairTime.time_end}
            </Text>
          )}
        </View>
        
        <Text style={[styles.lessonSubject, { color: textColor }]}>
          {lesson.subject}
        </Text>
        
        <Text style={[styles.lessonType, { color: colors.primary }]}>
          {lesson.type_lesson}
        </Text>
        
        <View style={styles.lessonDetails}>
          <View style={styles.detailRow}>
            <Icon name="person-outline" size={16} color={textColor} />
            <Text style={[styles.detailText, { color: textColor }]}>
              {lesson.teacher}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="location-outline" size={16} color={textColor} />
            <Text style={[styles.detailText, { color: textColor }]}>
              {lesson.auditory}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (viewMode === 'week') {
    return (
      <View>
        {scheduleData.days?.map(day => (
          <View key={day.weekday} style={[styles.dayCard, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.dayTitle, { color: colors.primary }]}>
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][day.weekday - 1]}
            </Text>
            {day.lessons && day.lessons.length > 0 ? (
              day.lessons.map(renderLesson)
            ) : (
              <Text style={[styles.noLessons, { color: textColor }]}>Нет занятий</Text>
            )}
          </View>
        ))}
      </View>
    );
  } else {
    // Daily view
    const dayLessons = scheduleData.lessons || [];
    return (
      <View style={[styles.dayCard, { backgroundColor: cardBg, borderColor }]}>
        {dayLessons.length > 0 ? (
          dayLessons.map(renderLesson)
        ) : (
          <Text style={[styles.noLessons, { color: textColor }]}>Нет занятий на этот день</Text>
        )}
      </View>
    );
  }
};

const ScheduleScreen = ({ theme, accentColor }) => {
  const [course, setCourse] = useState(1);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [pairsTime, setPairsTime] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(getWeekNumber(new Date()));
  const [error, setError] = useState(null);
  const [cacheInfo, setCacheInfo] = useState(null);

  const colors = ACCENT_COLORS[accentColor];
  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';

  useEffect(() => {
    loadGroups();
    loadPairsTime();
  }, [course]);

  useEffect(() => {
    if (selectedGroup) {
      loadSchedule();
    }
  }, [selectedGroup, viewMode, currentDate, currentWeek]);

  const loadGroups = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await ApiService.getGroups(course);
      setGroups(result.data.groups || []);
      setCacheInfo(result.cacheInfo);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = viewMode === 'week' 
        ? await ApiService.getSchedule(selectedGroup, null, currentWeek)
        : await ApiService.getSchedule(selectedGroup, currentDate);
      
      setScheduleData(result.data);
      setCacheInfo(result.cacheInfo);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPairsTime = async () => {
    try {
      const result = await ApiService.getPairsTime();
      setPairsTime(result.data.pairs_time || []);
    } catch (error) {
      console.error('Error loading pairs time:', error);
    }
  };

  const handleRetry = () => {
    setError(null);
    if (selectedGroup) {
      loadSchedule();
    } else {
      loadGroups();
    }
  };

  const handleViewCache = () => {
    // Используем данные из кэша, которые уже загружены
    setError(null);
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedGroup) {
      loadSchedule().finally(() => setRefreshing(false));
    } else {
      loadGroups().finally(() => setRefreshing(false));
    }
  };

  if (error && !loading) {
    return (
      <ConnectionError
        type={error}
        loading={false}
        onRetry={handleRetry}
        onViewCache={handleViewCache}
        theme={theme}
        accentColor={accentColor}
        cacheAvailable={!!scheduleData || groups.length > 0}
        cacheDate={cacheInfo?.cacheDate}
        contentType="schedule"
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {cacheInfo && cacheInfo.source === 'cache' && (
        <View style={[styles.cacheIndicator, { backgroundColor: colors.light }]}>
          <Icon name="time-outline" size={16} color={colors.primary} />
          <Text style={[styles.cacheText, { color: colors.primary }]}>
            Данные из кэша
          </Text>
        </View>
      )}
      
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.content}>
          <CourseSelector
            course={course}
            setCourse={setCourse}
            theme={theme}
            accentColor={accentColor}
          />
          
          <GroupSelector
            groups={groups}
            selectedGroup={selectedGroup}
            onSelectGroup={setSelectedGroup}
            loading={loading}
            theme={theme}
            accentColor={accentColor}
          />
          
          {selectedGroup && (
            <ScheduleView
              scheduleData={scheduleData}
              pairsTime={pairsTime}
              viewMode={viewMode}
              theme={theme}
              accentColor={accentColor}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  cacheIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  cacheText: {
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },
  courseSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  courseButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  courseButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },
  groupSelector: {
    marginBottom: 16,
  },
  groupButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  groupButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  dayCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 12,
  },
  lessonCard: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lessonTime: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  lessonTimeRange: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  lessonSubject: {
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
    marginBottom: 4,
  },
  lessonType: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 8,
  },
  lessonDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  noLessons: {
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'Montserrat_400Regular',
  },
});

export default ScheduleScreen;