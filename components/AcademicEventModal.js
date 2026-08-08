import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';
import { ACADEMIC_EVENT_TYPES } from '../utils/academicEventsStorage';
import NativeDateField from './NativeDateField';

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
  const [saving, setSaving] = useState(false);

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const bgColor = glass.backgroundElevated || glass.background;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const borderColor = glass.border;
  const initialState = useMemo(() => buildInitialState(event), [event]);
  const isEditing = !!event?.id;

  useEffect(() => {
    if (visible) {
      setTitle(initialState.title);
      setDate(initialState.date);
      setType(initialState.type);
      setDescription(initialState.description);
      setReminderEnabled(initialState.reminderEnabled);
      setHasChanges(false);
      setSaving(false);
    }
  }, [visible, initialState]);

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />

        <View style={[styles.header, { borderBottomColor: borderColor }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.glass || colors.primary + '18',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Icon name="calendar-outline" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={{ fontSize: 17, fontFamily: 'Montserrat_700Bold', color: textColor }}>
                {isEditing ? 'Редактирование события' : 'Новое событие'}
              </Text>
              <Text style={{ fontSize: 12, fontFamily: 'Montserrat_400Regular', color: placeholderColor }}>
                Учебный планер
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
              disabled={saving}
            >
              <Icon name={isEditing ? 'checkmark' : 'add'} size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color={placeholderColor} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: placeholderColor, marginTop: 0 }]}>НАЗВАНИЕ</Text>
          <TextInput
            value={title}
            onChangeText={markChanged(setTitle)}
            placeholder="Например, Экзамен по математике"
            placeholderTextColor={glass.textTertiary}
            style={[
              styles.input,
              { color: textColor, borderColor, backgroundColor: glass.surfaceSecondary },
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

          <Text style={[styles.label, { color: placeholderColor }]}>ТИП СОБЫТИЯ</Text>
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
                      borderColor: active ? colors.primary : borderColor,
                      backgroundColor: active ? colors.glass : glass.surfaceSecondary,
                    },
                  ]}
                >
                  <Text style={{ color: active ? colors.primary : placeholderColor, fontSize: 12, fontFamily: 'Montserrat_500Medium' }}>
                    {eventType.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: placeholderColor }]}>ОПИСАНИЕ</Text>
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
              { color: textColor, borderColor, backgroundColor: glass.surfaceSecondary },
            ]}
          />

          <View style={[styles.switchRow, { backgroundColor: glass.surfaceSecondary, borderColor }]}> 
            <Text style={{ color: textColor, fontFamily: 'Montserrat_500Medium', fontSize: 13, flex: 1, marginRight: 12 }}>
              Локальное напоминание в 09:00
            </Text>
            <Switch
              value={reminderEnabled}
              onValueChange={(value) => {
                setReminderEnabled(value);
                setHasChanges(true);
              }}
              trackColor={{ true: colors.primary, false: '#64748b' }}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
    minHeight: 96,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
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