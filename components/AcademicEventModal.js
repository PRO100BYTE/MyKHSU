import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';
import { ACADEMIC_EVENT_TYPES } from '../utils/academicEventsStorage';
import NativeDateField from './NativeDateField';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const buildInitialState = (event) => ({
  id: event?.id || null,
  title: event?.title || '',
  date: event?.date || '',
  type: event?.type || 'exam',
  description: event?.description || '',
  reminderEnabled: !!event?.reminderEnabled,
});

const AcademicEventModal = ({ visible, onClose, onSubmit, event, theme, accentColor }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('exam');
  const [description, setDescription] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [saving, setSaving] = useState(false);

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const initialState = useMemo(() => buildInitialState(event), [event]);
  const isEditing = !!event?.id;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      setTitle(initialState.title);
      setDate(initialState.date);
      setType(initialState.type);
      setDescription(initialState.description);
      setReminderEnabled(initialState.reminderEnabled);
      setHasChanges(false);
      setSaving(false);

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
  }, [visible, initialState, rendered, backdropAnim, slideAnim]);

  const markChanged = (setter) => (value) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedDate = date.trim();

    if (!trimmedTitle) {
      Alert.alert('Пустой заголовок', 'Введите название учебного события.');
      return;
    }

    if (!DATE_RE.test(trimmedDate)) {
      Alert.alert('Некорректная дата', 'Выберите дату учебного события через календарь.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        id: initialState.id,
        title: trimmedTitle,
        date: trimmedDate,
        type,
        description: description.trim(),
        reminderEnabled,
      });
      setHasChanges(false);
      onClose();
    } catch (error) {
      Alert.alert('Ошибка', error?.message || 'Не удалось сохранить учебное событие.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!hasChanges || saving) {
      if (!saving) onClose();
      return;
    }

    Alert.alert(
      'Несохранённые изменения',
      'Сохранить изменения перед закрытием?',
      [
        { text: 'Не сохранять', style: 'destructive', onPress: onClose },
        { text: 'Отмена', style: 'cancel' },
        { text: 'Сохранить', onPress: handleSubmit },
      ],
    );
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
          <View style={[styles.header, { borderBottomColor: glass.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
              <Icon name="close" size={24} color={glass.text} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: glass.text }]}>
                {isEditing ? 'Редактирование события' : 'Новое событие'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: glass.textSecondary }]}>
                Учебный планер
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
              disabled={saving}
            >
              <Icon name={isEditing ? 'checkmark' : 'add'} size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.glass }]}>
                  <Icon name="calendar-outline" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: glass.text }]}>Основное</Text>
              </View>

              <Text style={[styles.label, { color: glass.textSecondary }]}>Название</Text>
              <TextInput
                value={title}
                onChangeText={markChanged(setTitle)}
                placeholder="Например, Экзамен по математике"
                placeholderTextColor={glass.textTertiary}
                style={[
                  styles.input,
                  { color: glass.text, borderColor: glass.border, backgroundColor: glass.surfaceSecondary },
                ]}
              />

              <NativeDateField
                label="Дата"
                value={date}
                onChange={markChanged(setDate)}
                theme={theme}
                accentColor={accentColor}
                placeholder="Выбрать дату события"
              />

              <Text style={[styles.label, { color: glass.textSecondary }]}>Тип</Text>
              <View style={styles.chipsRow}>
                {ACADEMIC_EVENT_TYPES.map((eventType) => {
                  const active = type === eventType.key;
                  return (
                    <TouchableOpacity
                      key={eventType.key}
                      onPress={() => {
                        setType(eventType.key);
                        setHasChanges(true);
                      }}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? colors.primary : glass.border,
                          backgroundColor: active ? colors.glass : glass.surfaceSecondary,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? colors.primary : glass.textSecondary, fontSize: 12, fontFamily: 'Montserrat_500Medium' }}>
                        {eventType.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.14)' }]}>
                  <Icon name="document-text-outline" size={16} color="#f59e0b" />
                </View>
                <Text style={[styles.sectionTitle, { color: glass.text }]}>Описание и напоминание</Text>
              </View>

              <Text style={[styles.label, { color: glass.textSecondary }]}>Описание</Text>
              <TextInput
                value={description}
                onChangeText={markChanged(setDescription)}
                placeholder="Аудитория, время, комментарии"
                placeholderTextColor={glass.textTertiary}
                multiline
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.multilineInput,
                  { color: glass.text, borderColor: glass.border, backgroundColor: glass.surfaceSecondary },
                ]}
              />

              <View style={[styles.switchRow, { backgroundColor: glass.surfaceSecondary, borderColor: glass.border }]}> 
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ color: glass.text, fontFamily: 'Montserrat_500Medium', fontSize: 13 }}>
                    Локальное напоминание в 09:00
                  </Text>
                  <Text style={{ color: glass.textSecondary, fontFamily: 'Montserrat_400Regular', fontSize: 11, marginTop: 4 }}>
                    Подходит для экзаменов, зачетов и важных учебных дат.
                  </Text>
                </View>
                <Switch
                  value={reminderEnabled}
                  onValueChange={(value) => {
                    setReminderEnabled(value);
                    setHasChanges(true);
                  }}
                  trackColor={{ true: colors.primary, false: '#64748b' }}
                />
              </View>
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
    zIndex: 8,
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
    maxHeight: '92%',
    minHeight: '62%',
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
    fontFamily: 'Montserrat_700Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
  },
  label: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Montserrat_400Regular',
  },
  multilineInput: {
    minHeight: 88,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  switchRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});

export default AcademicEventModal;