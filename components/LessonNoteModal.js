import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LIQUID_GLASS, ACCENT_COLORS } from '../utils/constants';
import { saveNote, loadNote, deleteNote, HOMEWORK_STATUSES } from '../utils/notesStorage';
import { unlockAchievement, incrementCounter } from '../utils/achievements';
import { showAchievementToast } from './AchievementToast';
import NativeDateField from './NativeDateField';
import notificationService from '../utils/notificationService';

const TABBAR_HEIGHT = 90;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const LessonNoteModal = ({ visible, onClose, lesson, weekday, theme, accentColor }) => {
  const [noteText, setNoteText] = useState('');
  const [homework, setHomework] = useState('');
  const [homeworkStatus, setHomeworkStatus] = useState(HOMEWORK_STATUSES.TODO);
  const [homeworkDueDate, setHomeworkDueDate] = useState('');
  const [homeworkReminderId, setHomeworkReminderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [rendered, setRendered] = useState(false);

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;

  const lessonParams = {
    subject: lesson?.subject,
    weekday: weekday,
    timeSlot: lesson?.time,
    group: lesson?.group ? (Array.isArray(lesson.group) ? lesson.group.join(',') : lesson.group) : '',
  };

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  useEffect(() => {
    if (visible && lesson) {
      loadExistingNote();
    }
  }, [visible, lesson]);

  const loadExistingNote = async () => {
    setLoading(true);
    try {
      const existing = await loadNote(lessonParams);
      if (existing) {
        setNoteText(existing.noteText || '');
        setHomework(existing.homework || '');
        setHomeworkStatus(existing.homeworkStatus || HOMEWORK_STATUSES.TODO);
        setHomeworkDueDate(existing.homeworkDueDate || '');
        setHomeworkReminderId(existing.homeworkReminderNotificationId || null);
      } else {
        setNoteText('');
        setHomework('');
        setHomeworkStatus(HOMEWORK_STATUSES.TODO);
        setHomeworkDueDate('');
        setHomeworkReminderId(null);
      }
      setHasChanges(false);
    } catch (e) {
      console.error('Error loading note:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const trimmedDueDate = homeworkDueDate.trim();
      if (trimmedDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDueDate)) {
        Alert.alert('Некорректная дата', 'Используйте формат ГГГГ-ММ-ДД для дедлайна.');
        return;
      }

      let nextReminderId = homeworkReminderId || null;
      const shouldCancelReminder = !homework.trim() || !trimmedDueDate || homeworkStatus === HOMEWORK_STATUSES.DONE;

      if (shouldCancelReminder && homeworkReminderId) {
        try {
          await Notifications.cancelScheduledNotificationAsync(homeworkReminderId);
        } catch {}
        nextReminderId = null;
      }

      if (!shouldCancelReminder && trimmedDueDate) {
        const granted = await notificationService.requestPermissions();
        if (!granted) {
          Alert.alert('Нет доступа', 'Разрешите уведомления, чтобы получать напоминания о дедлайнах.');
        }
        const [year, month, day] = trimmedDueDate.split('-').map(Number);
        const triggerDate = new Date(year, month - 1, day, 9, 0, 0, 0);
        if (granted && triggerDate > new Date()) {
          if (homeworkReminderId) {
            try {
              await Notifications.cancelScheduledNotificationAsync(homeworkReminderId);
            } catch {}
          }
          nextReminderId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Дедлайн по паре',
              body: `${lesson?.subject || 'Задание'}: ${homework.trim().slice(0, 80)}`,
              data: { type: 'homework_deadline', subject: lesson?.subject || '' },
            },
            trigger: { type: 'date', date: triggerDate },
          });
        }
      }

      await saveNote({
        ...lessonParams,
        noteText: noteText.trim(),
        homework: homework.trim(),
        homeworkStatus: homework.trim() ? homeworkStatus : null,
        homeworkDueDate: homework.trim() ? (trimmedDueDate || null) : null,
        homeworkReminderNotificationId: nextReminderId,
      });
      setHomeworkReminderId(nextReminderId);
      setHasChanges(false);
      
      // Ачивки
      const firstNote = await unlockAchievement('first_note');
      if (firstNote) showAchievementToast(firstNote);
      
      if (homework.trim()) {
        const count = await incrementCounter('homework_count');
        if (count >= 10) {
          const hwMaster = await unlockAchievement('homework_master');
          if (hwMaster) showAchievementToast(hwMaster);
        }

        if (homeworkStatus === HOMEWORK_STATUSES.DONE) {
          const hwDone = await unlockAchievement('homework_done');
          if (hwDone) showAchievementToast(hwDone);
        }
      }
      
      onClose(true); // true = saved
    } catch (e) {
      console.error('Error saving note:', e);
      Alert.alert('Ошибка', 'Не удалось сохранить заметку');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Удалить заметку',
      'Вы уверены, что хотите удалить заметку и домашнее задание?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              if (homeworkReminderId) {
                try {
                  await Notifications.cancelScheduledNotificationAsync(homeworkReminderId);
                } catch {}
              }
              await deleteNote(lessonParams);
              setNoteText('');
              setHomework('');
              setHomeworkReminderId(null);
              setHasChanges(false);
              onClose(true);
            } catch (e) {
              console.error('Error deleting note:', e);
            }
          },
        },
      ],
    );
  };

  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        'Несохранённые изменения',
        'Сохранить изменения перед закрытием?',
        [
          { text: 'Не сохранять', style: 'destructive', onPress: () => onClose(false) },
          { text: 'Отмена', style: 'cancel' },
          { text: 'Сохранить', onPress: handleSave },
        ],
      );
    } else {
      onClose(false);
    }
  };

  const hasContent = noteText.trim().length > 0 || homework.trim().length > 0;

  const setQuickDueDate = (daysFromNow) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    const iso = date.toISOString().slice(0, 10);
    setHomeworkDueDate(iso);
    setHasChanges(true);
  };

  if (!visible && !rendered) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.container,
            { backgroundColor: glass.backgroundElevated, transform: [{ translateY: slideAnim }] },
          ]}
        >

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: glass.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
              <Icon name="close" size={24} color={glass.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text
                style={[styles.headerTitle, { color: glass.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {lesson?.subject || 'Занятие'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: glass.textSecondary }]}>
                Заметки и ДЗ
              </Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              {hasContent && (
                <TouchableOpacity onPress={handleDelete} style={[styles.headerBtn, { marginRight: 4 }]}>
                  <Icon name="trash-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: hasChanges ? 1 : 0.5 }]}
                disabled={!hasChanges}
              >
                <Icon name="checkmark" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {/* Заметка к паре */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.glass }]}>
                  <Icon name="document-text-outline" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: glass.text }]}>
                  Заметка к паре
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: glass.surfaceSecondary,
                    color: glass.text,
                    borderColor: glass.border,
                  },
                ]}
                placeholder="Введите заметку..."
                placeholderTextColor={glass.textTertiary}
                value={noteText}
                onChangeText={(text) => {
                  setNoteText(text);
                  setHasChanges(true);
                }}
                multiline
                textAlignVertical="top"
              />

              {homework.trim().length > 0 && (
                <>
                  <Text style={{ color: glass.textSecondary, fontSize: 12, fontFamily: 'Montserrat_500Medium', marginTop: 10, marginBottom: 6 }}>
                    Статус
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                    {[
                      { key: HOMEWORK_STATUSES.TODO, label: 'К выполнению', color: '#64748b' },
                      { key: HOMEWORK_STATUSES.IN_PROGRESS, label: 'В работе', color: '#f59e0b' },
                      { key: HOMEWORK_STATUSES.DONE, label: 'Сделано', color: '#10b981' },
                    ].map(item => {
                      const active = homeworkStatus === item.key;
                      return (
                        <TouchableOpacity
                          key={item.key}
                          onPress={() => {
                            setHomeworkStatus(item.key);
                            setHasChanges(true);
                          }}
                          style={{
                            flex: 1,
                            borderRadius: 10,
                            paddingVertical: 7,
                            alignItems: 'center',
                            backgroundColor: active ? `${item.color}22` : glass.surfaceTertiary,
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: active ? item.color : glass.border,
                          }}
                        >
                          <Text style={{ color: active ? item.color : glass.textSecondary, fontSize: 11, fontFamily: 'Montserrat_500Medium' }}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <NativeDateField
                    label="Дедлайн"
                    value={homeworkDueDate}
                    onChange={(nextValue) => {
                      setHomeworkDueDate(nextValue);
                      setHasChanges(true);
                    }}
                    theme={theme}
                    accentColor={accentColor}
                    placeholder="Выбрать дедлайн"
                  />

                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={() => setQuickDueDate(1)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 10,
                        backgroundColor: glass.surfaceTertiary,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: glass.border,
                      }}
                    >
                      <Text style={{ color: glass.textSecondary, fontSize: 11, fontFamily: 'Montserrat_500Medium' }}>+1 день</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setQuickDueDate(7)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 10,
                        backgroundColor: glass.surfaceTertiary,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: glass.border,
                      }}
                    >
                      <Text style={{ color: glass.textSecondary, fontSize: 11, fontFamily: 'Montserrat_500Medium' }}>+7 дней</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setHomeworkDueDate('');
                        setHasChanges(true);
                      }}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 10,
                        backgroundColor: glass.surfaceTertiary,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: glass.border,
                      }}
                    >
                      <Text style={{ color: glass.textSecondary, fontSize: 11, fontFamily: 'Montserrat_500Medium' }}>Сбросить</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {/* Домашнее задание */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                  <Icon name="school-outline" size={16} color="#f59e0b" />
                </View>
                <Text style={[styles.sectionTitle, { color: glass.text }]}>
                  Домашнее задание
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: glass.surfaceSecondary,
                    color: glass.text,
                    borderColor: glass.border,
                  },
                ]}
                placeholder="Введите домашнее задание..."
                placeholderTextColor={glass.textTertiary}
                value={homework}
                onChangeText={(text) => {
                  setHomework(text);
                  setHasChanges(true);
                }}
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '93%',
    minHeight: '65%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  saveBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: TABBAR_HEIGHT + 48,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  input: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
    minHeight: 100,
    lineHeight: 22,
  },
});

export default LessonNoteModal;
