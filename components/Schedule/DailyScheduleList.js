import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ACCENT_COLORS } from '../../utils/constants';

const DailyScheduleList = ({ dailySchedule, theme, accentColor }) => {
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const colors = ACCENT_COLORS[accentColor];

  const renderLesson = (lesson, index) => (
    <View key={index} style={[styles.lessonCard, { backgroundColor: cardBg }]}>
      <Text style={[styles.lessonTime, { color: colors.primary }]}>
        {lesson.time}
      </Text>
      <View style={styles.lessonInfo}>
        <Text style={[styles.lessonSubject, { color: textColor }]}>
          {lesson.subject}
        </Text>
        <Text style={[styles.lessonTeacher, { color: placeholderColor }]}>
          {lesson.teacher}
        </Text>
        <Text style={[styles.lessonLocation, { color: placeholderColor }]}>
          {lesson.auditory}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {dailySchedule.lessons.map(renderLesson)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lessonTime: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Montserrat_600SemiBold',
    marginRight: 16,
    width: 80,
    textAlign: 'center',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 4,
  },
  lessonTeacher: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  lessonLocation: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    fontStyle: 'italic',
  },
});

export default DailyScheduleList;