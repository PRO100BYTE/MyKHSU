import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { formatDate } from '../utils/dateUtils';
import { ACCENT_COLORS, COURSES } from '../utils/constants';
import ConnectionError from './ConnectionError';
import { useScheduleLogic } from '../hooks/useScheduleLogic';
import scheduleUtils from '../utils/scheduleUtils';

const { width } = Dimensions.get('window');

const ScheduleScreen = ({ theme, accentColor }) => {
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
    handleRetry,
    handleViewCache,
    onRefresh
  } = useScheduleLogic();

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const colors = ACCENT_COLORS[accentColor];
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';

  const getTimeForLesson = (timeNumber) => {
    return pairsTime.find(pair => 
      pair.time === timeNumber.toString() || 
      pair.number === timeNumber.toString()
    );
  };

  const renderDailySchedule = () => {
    if (!scheduleData) return null;
    
    const weekday = currentTime.getDay() === 0 ? 7 : currentTime.getDay();
    const daySchedule = scheduleData.days ? 
      scheduleData.days.find(d => d.weekday === weekday) : 
      { lessons: scheduleData.lessons || [] };
    
    if (!daySchedule || !daySchedule.lessons || daySchedule.lessons.length === 0) {
      return (
        <View style={{ 
          backgroundColor: cardBg, 
          borderRadius: 12, 
          padding: 40, 
          alignItems: 'center',
          borderWidth: 1,
          borderColor
        }}>
          <Icon name="calendar-outline" size={48} color={placeholderColor} />
          <Text style={{ color: placeholderColor, marginTop: 16, fontSize: 16, fontFamily: 'Montserrat_400Regular' }}>
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
            {formatDate(currentTime)}
          </Text>
        </View>

        {daySchedule.lessons.map((lesson, index) => {
          const pairTime = getTimeForLesson(lesson.time);
          const lessonStyle = scheduleUtils.getLessonStyle(lesson, pairTime, currentTime, theme, colors, cardBg, borderColor);
          const textColorStyle = scheduleUtils.getLessonTextColor(lesson, pairTime, currentTime, colors, textColor);
          const isCurrent = scheduleUtils.isCurrentLesson(lesson, pairTime, currentTime);
          
          return (
            <View 
              key={`${lesson.id || index}_${index}`} 
              style={[{
                borderRadius: 12, 
                padding: 16, 
                marginBottom: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3.84,
                elevation: 3,
              }, lessonStyle]}
            >
              {isCurrent && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ 
                    backgroundColor: colors.primary, 
                    paddingHorizontal: 8, 
                    paddingVertical: 2, 
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}>
                    <Icon name="time" size={12} color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontSize: 12, marginLeft: 4, fontFamily: 'Montserrat_500Medium' }}>
                      Сейчас
                    </Text>
                  </View>
                </View>
              )}
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 16, color: textColorStyle, fontFamily: 'Montserrat_500Medium' }}>
                    {lesson.subject || 'Не указано'}
                  </Text>
                  <Text style={{ color: isCurrent ? colors.primary : placeholderColor, fontSize: 14, fontFamily: 'Montserrat_400Regular' }}>
                    {lesson.type_lesson || 'Занятие'}
                  </Text>
                </View>
                
                {pairTime && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: textColorStyle, fontWeight: '600', fontFamily: 'Montserrat_500Medium' }}>
                      {pairTime.time_start || pairTime.start} - {pairTime.time_end || pairTime.end}
                    </Text>
                    <Text style={{ color: isCurrent ? colors.primary : placeholderColor, fontSize: 12, fontFamily: 'Montserrat_400Regular' }}>
                      Пара №{lesson.time}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Icon name="person-outline" size={14} color={isCurrent ? colors.primary : placeholderColor} />
                <Text style={{ color: textColorStyle, marginLeft: 8, fontSize: 14, fontFamily: 'Montserrat_400Regular' }}>
                  {lesson.teacher || 'Преподаватель не указан'}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Icon name="location-outline" size={14} color={isCurrent ? colors.primary : placeholderColor} />
                <Text style={{ color: textColorStyle, marginLeft: 8, fontSize: 14, fontFamily: 'Montserrat_400Regular' }}>
                  Аудитория: {lesson.auditory || 'Не указана'}
                </Text>
              </View>
            </View>
          );
        })}
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
        <View style={{ 
          backgroundColor: colors.light, 
          padding: 12, 
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center'
        }}>
          <Icon name="time-outline" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, marginLeft: 8, fontFamily: 'Montserrat_400Regular' }}>
            {cacheInfo?.source === 'stale_cache' ? 'Показаны ранее загруженные данные' : 'Показаны кэшированные данные'}
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
        {/* Выбор курса */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
        >
          {COURSES.map(courseItem => (
            <TouchableOpacity
              key={courseItem.id}
              style={{
                backgroundColor: course === courseItem.id ? colors.primary : cardBg,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 8,
                borderWidth: 1,
                borderColor: course === courseItem.id ? colors.primary : borderColor
              }}
              onPress={() => setCourse(courseItem.id)}
            >
              <Text style={{
                color: course === courseItem.id ? '#ffffff' : textColor,
                fontSize: 14,
                fontFamily: 'Montserrat_500Medium'
              }}>
                {courseItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Выбор группы */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        >
          {(groups || []).map((group, index) => (
            <TouchableOpacity
              key={group || index}
              style={{
                backgroundColor: selectedGroup === group ? colors.primary : cardBg,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 8,
                borderWidth: 1,
                borderColor: selectedGroup === group ? colors.primary : borderColor
              }}
              onPress={() => setSelectedGroup(group)}
            >
              <Text style={{
                color: selectedGroup === group ? '#ffffff' : textColor,
                fontSize: 14,
                fontFamily: 'Montserrat_500Medium'
              }}>
                {group}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {(loadingGroups || loadingSchedule) ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: textColor, marginTop: 16, fontFamily: 'Montserrat_400Regular' }}>
              {loadingGroups ? 'Загрузка групп...' : 'Загрузка расписания...'}
            </Text>
          </View>
        ) : selectedGroup ? (
          renderDailySchedule()
        ) : (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Icon name="school-outline" size={48} color={placeholderColor} />
            <Text style={{ color: placeholderColor, marginTop: 16, fontSize: 16, fontFamily: 'Montserrat_400Regular' }}>
              {groups.length > 0 ? 'Выберите группу' : 'Загрузка групп...'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Стили могут быть добавлены при необходимости
});

export default ScheduleScreen;