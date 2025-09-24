import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getWeekNumber, formatDate, getDateByWeekAndDay } from '../utils/dateUtils';
import { ACCENT_COLORS, COURSES, WEEKDAYS } from '../utils/constants';
import ConnectionError from './ConnectionError';
import { useScheduleData } from '../hooks/useScheduleData';

const { width } = Dimensions.get('window');

const ScheduleScreen = ({ theme, accentColor }) => {
  const [course, setCourse] = useState(1);
  const [viewMode, setViewMode] = useState('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(getWeekNumber(new Date()));

  const {
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
    handleRetry,
    handleViewCache,
    onRefresh
  } = useScheduleData(course, viewMode, currentDate, currentWeek);

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const colors = ACCENT_COLORS[accentColor];
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';

  const weekdays = WEEKDAYS;

  const getTimeForLesson = (timeNumber) => {
    return pairsTime.find(pair => 
      pair.time === timeNumber.toString() || 
      pair.number === timeNumber.toString()
    );
  };

  const isCurrentLesson = (lesson, pairTime) => {
    if (!pairTime || !lesson) return false;
    
    const now = currentTime;
    const lessonDate = new Date(currentDate);
    
    try {
      const startTimeStr = pairTime.time_start || pairTime.start;
      const endTimeStr = pairTime.time_end || pairTime.end;
      
      if (!startTimeStr || !endTimeStr) return false;
      
      const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
      const [endHours, endMinutes] = endTimeStr.split(':').map(Number);
      
      const startTime = new Date(lessonDate);
      startTime.setHours(startHours, startMinutes, 0, 0);
      
      const endTime = new Date(lessonDate);
      endTime.setHours(endHours, endMinutes, 0, 0);
      
      return now >= startTime && now <= endTime;
    } catch (error) {
      return false;
    }
  };

  const isNextLesson = (lesson, pairTime, index, lessons) => {
    if (!pairTime || !lesson) return false;
    
    const now = currentTime;
    const lessonDate = new Date(currentDate);
    
    try {
      const startTimeStr = pairTime.time_start || pairTime.start;
      if (!startTimeStr) return false;
      
      const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
      const startTime = new Date(lessonDate);
      startTime.setHours(startHours, startMinutes, 0, 0);
      
      const isNext = now < startTime && 
                    (index === 0 || !isCurrentLesson(lessons[index - 1], 
                      getTimeForLesson(lessons[index - 1]?.time)));
      
      return isNext;
    } catch (error) {
      return false;
    }
  };

  const getLessonStyle = (lesson, pairTime, index, lessons) => {
    if (isCurrentLesson(lesson, pairTime)) {
      return {
        backgroundColor: theme === 'light' ? colors.light : '#2d3748',
        borderColor: colors.primary,
        borderWidth: 2,
      };
    } else if (isNextLesson(lesson, pairTime, index, lessons)) {
      return {
        backgroundColor: theme === 'light' ? colors.light : '#2d3748',
        borderColor: colors.primary,
        borderWidth: 1,
      };
    }
    
    return {
      backgroundColor: cardBg,
      borderColor: borderColor,
      borderWidth: 1,
    };
  };

  const getLessonTextColor = (lesson, pairTime) => {
    if (isCurrentLesson(lesson, pairTime)) {
      return colors.primary;
    }
    return textColor;
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

  const renderDailySchedule = () => {
    if (!scheduleData) return null;
    
    const weekday = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
    const daySchedule = scheduleData.days ? 
      scheduleData.days.find(d => d.weekday === weekday) : 
      { lessons: scheduleData.lessons || [] };
    
    if (!daySchedule || !daySchedule.lessons || daySchedule.lessons.length === 0) {
      return (
        <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor }]}>
          <Icon name="calendar-outline" size={48} color={placeholderColor} />
          <Text style={[styles.emptyStateText, { color: placeholderColor }]}>
            Занятий нет
          </Text>
        </View>
      );
    }
    
    return (
      <View style={{ marginBottom: 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: textColor, fontFamily: 'Montserrat_600SemiBold' }}>
            Расписание для {selectedGroup}
          </Text>
          <Text style={{ color: placeholderColor, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
            {formatDate(currentDate)}
          </Text>
        </View>

        {daySchedule.lessons.map((lesson, index) => {
          const pairTime = getTimeForLesson(lesson.time);
          const lessonStyle = getLessonStyle(lesson, pairTime, index, daySchedule.lessons);
          const textColorStyle = getLessonTextColor(lesson, pairTime);
          const isCurrent = isCurrentLesson(lesson, pairTime);
          const isNext = isNextLesson(lesson, pairTime, index, daySchedule.lessons);
          
          return (
            <View 
              key={`${lesson.id || index}_${index}`} 
              style={[styles.lessonCard, lessonStyle]}
            >
              {(isCurrent || isNext) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
                    <Icon name="time" size={12} color="#ffffff" />
                    <Text style={styles.statusBadgeText}>
                      {isCurrent ? 'СЕЙЧАС' : 'СЛЕДУЮЩАЯ'}
                    </Text>
                  </View>
                </View>
              )}
              
              <View style={styles.lessonHeader}>
                <View style={styles.lessonInfo}>
                  <Text style={[styles.subjectText, { color: textColorStyle }]}>
                    {lesson.subject || 'Не указано'}
                  </Text>
                  <Text style={[styles.typeText, { color: isCurrent ? colors.primary : placeholderColor }]}>
                    {lesson.type_lesson || 'Занятие'}
                  </Text>
                </View>
                
                {pairTime && (
                  <View style={styles.timeInfo}>
                    <Text style={[styles.timeText, { color: textColorStyle }]}>
                      {pairTime.time_start || pairTime.start} - {pairTime.time_end || pairTime.end}
                    </Text>
                    <Text style={[styles.pairNumberText, { color: isCurrent ? colors.primary : placeholderColor }]}>
                      Пара №{lesson.time}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.lessonDetails}>
                <View style={styles.detailItem}>
                  <Icon name="person-outline" size={14} color={isCurrent ? colors.primary : placeholderColor} />
                  <Text style={[styles.detailText, { color: textColorStyle, marginLeft: 8 }]}>
                    {lesson.teacher || 'Преподаватель не указан'}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Icon name="location-outline" size={14} color={isCurrent ? colors.primary : placeholderColor} />
                  <Text style={[styles.detailText, { color: textColorStyle, marginLeft: 8 }]}>
                    Аудитория: {lesson.auditory || 'Не указана'}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderCourseAndGroupSelector = () => {
    if (loadingGroups) {
      return (
        <View style={[styles.loadingContainer, { marginBottom: 16 }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: textColor }]}>
            Загрузка групп...
          </Text>
        </View>
      );
    }

    return (
      <View style={{ marginBottom: 16 }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
        >
          {COURSES.map(courseItem => (
            <TouchableOpacity
              key={courseItem.id}
              style={[
                styles.courseButton,
                { 
                  backgroundColor: course === courseItem.id ? colors.primary : cardBg,
                  borderColor: course === courseItem.id ? colors.primary : borderColor
                }
              ]}
              onPress={() => setCourse(courseItem.id)}
            >
              <Text style={[
                styles.courseButtonText,
                { color: course === courseItem.id ? '#ffffff' : textColor }
              ]}>
                {courseItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {groups.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }}
          >
            {groups.map((group, index) => (
              <TouchableOpacity
                key={group || index}
                style={[
                  styles.groupButton,
                  { 
                    backgroundColor: selectedGroup === group ? colors.primary : cardBg,
                    borderColor: selectedGroup === group ? colors.primary : borderColor
                  }
                ]}
                onPress={() => setSelectedGroup(group)}
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
        ) : (
          <View style={[styles.emptyGroups, { backgroundColor: cardBg }]}>
            <Text style={[styles.emptyGroupsText, { color: placeholderColor }]}>
              Группы не найдены для выбранного курса
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderViewControls = () => {
    return (
      <View style={[styles.controlsContainer, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.viewModeContainer}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              { 
                backgroundColor: viewMode === 'day' ? colors.primary : 'transparent',
                borderColor: viewMode === 'day' ? colors.primary : borderColor
              }
            ]}
            onPress={() => setViewMode('day')}
          >
            <Text style={[
              styles.viewModeText,
              { color: viewMode === 'day' ? '#ffffff' : textColor }
            ]}>
              День
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              { 
                backgroundColor: viewMode === 'week' ? colors.primary : 'transparent',
                borderColor: viewMode === 'week' ? colors.primary : borderColor
              }
            ]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[
              styles.viewModeText,
              { color: viewMode === 'week' ? '#ffffff' : textColor }
            ]}>
              Неделя
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: colors.light }]}
            onPress={() => navigateDate(-1)}
          >
            <Icon name="chevron-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          
          <Text style={[styles.navText, { color: textColor }]}>
            {viewMode === 'day' ? formatDate(currentDate) : `Неделя ${currentWeek}`}
          </Text>
          
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: colors.light }]}
            onPress={() => navigateDate(1)}
          >
            <Icon name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (error && !loadingGroups && !loadingSchedule) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <ConnectionError 
          type={error}
          loading={false}
          onRetry={handleRetry}
          onViewCache={handleViewCache}
          showCacheButton={!!scheduleData}
          cacheAvailable={!!scheduleData}
          theme={theme}
          accentColor={accentColor}
          contentType="schedule"
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {showCachedData && (
        <View style={[styles.cacheIndicator, { backgroundColor: colors.light }]}>
          <Icon name="time-outline" size={16} color={colors.primary} />
          <Text style={[styles.cacheText, { color: colors.primary }]}>
            Показаны кэшированные данные
          </Text>
        </View>
      )}
      
      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ padding: 16 }}
      >
        {renderCourseAndGroupSelector()}
        {renderViewControls()}
        
        {(loadingGroups || loadingSchedule) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: textColor }]}>
              {loadingGroups ? 'Загрузка групп...' : 'Загрузка расписания...'}
            </Text>
          </View>
        ) : (
          renderDailySchedule()
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  courseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  courseButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },
  groupButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  groupButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },
  controlsContainer: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  viewModeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  viewModeText: {
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
  },
  navText: {
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
  },
  lessonCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    marginLeft: 4,
    fontFamily: 'Montserrat_500Medium',
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  lessonInfo: {
    flex: 1,
  },
  subjectText: {
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
  },
  typeText: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontWeight: '600',
    fontFamily: 'Montserrat_500Medium',
  },
  pairNumberText: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  lessonDetails: {
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  emptyState: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Montserrat_400Regular',
  },
  emptyGroups: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emptyGroupsText: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
  },
  cacheIndicator: {
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cacheText: {
    marginLeft: 8,
    fontFamily: 'Montserrat_400Regular',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Montserrat_400Regular',
  },
});

export default ScheduleScreen;