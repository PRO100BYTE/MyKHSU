import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LIQUID_GLASS, ACCENT_COLORS } from '../utils/constants';
import { saveNote, loadNote, deleteNote } from '../utils/notesStorage';

const LessonNoteModal = ({ visible, onClose, lesson, weekday, theme, accentColor }) => {
  const [noteText, setNoteText] = useState('');
  const [homework, setHomework] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;

  const lessonParams = {
    subject: lesson?.subject,
    weekday: weekday,
    timeSlot: lesson?.time,
    group: lesson?.group ? (Array.isArray(lesson.group) ? lesson.group.join(',') : lesson.group) : '',
  };

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
      } else {
        setNoteText('');
        setHomework('');
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
      await saveNote({
        ...lessonParams,
        noteText: noteText.trim(),
        homework: homework.trim(),
      });
      setHasChanges(false);
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
              await deleteNote(lessonParams);
              setNoteText('');
              setHomework('');
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

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        pointerEvents="box-none"
      >
        <View style={[styles.container, { backgroundColor: glass.backgroundElevated }]}>
          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: glass.textTertiary }]} />
          </View>

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
        </View>
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
    zIndex: 100,
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
    maxHeight: '80%',
    minHeight: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
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
