import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { ACCENT_COLORS } from '../utils/constants';

const ScheduleFormatModal = ({ visible, onClose, theme, accentColor, currentGroups }) => {
  const [scheduleFormat, setScheduleFormat] = useState('student');
  const [defaultGroup, setDefaultGroup] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [availableGroups, setAvailableGroups] = useState([]);

  const colors = ACCENT_COLORS[accentColor];
  const bgColor = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const inputBgColor = theme === 'light' ? '#f9fafb' : '#374151';
  const borderColor = theme === 'light' ? '#e5e7eb' : '#4b5563';

  useEffect(() => {
    if (visible) {
      loadSettings();
      setAvailableGroups(currentGroups || []);
    }
  }, [visible, currentGroups]);

  const loadSettings = async () => {
    try {
      const savedFormat = await SecureStore.getItemAsync('schedule_format');
      const savedGroup = await SecureStore.getItemAsync('default_group');
      const savedTeacher = await SecureStore.getItemAsync('teacher_name');
      
      if (savedFormat) setScheduleFormat(savedFormat);
      if (savedGroup) setDefaultGroup(savedGroup);
      if (savedTeacher) setTeacherName(savedTeacher);
    } catch (error) {
      console.error('Error loading schedule format settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      if (scheduleFormat === 'teacher' && !teacherName.trim()) {
        Alert.alert('Ошибка', 'Пожалуйста, укажите ФИО преподавателя');
        return;
      }

      await SecureStore.setItemAsync('schedule_format', scheduleFormat);
      await SecureStore.setItemAsync('default_group', defaultGroup);
      await SecureStore.setItemAsync('teacher_name', teacherName.trim());
      
      Alert.alert('Успех', 'Настройки расписания сохранены');
      onClose();
    } catch (error) {
      console.error('Error saving schedule format settings:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить настройки');
    }
  };

  const handleFormatChange = (format) => {
    setScheduleFormat(format);
  };

  const isValidTeacherName = (name) => {
    // Проверяем формат "Фамилия И.О."
    const pattern = /^[А-ЯЁ][а-яё]+\s[А-ЯЁ]\.[А-ЯЁ]\.$/;
    return pattern.test(name.trim());
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
          <Text style={[styles.title, { color: textColor }]}>Формат расписания</Text>
          
          <ScrollView style={styles.scrollView}>
            {/* Выбор формата */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Режим отображения</Text>
              
              <TouchableOpacity
                style={[
                  styles.formatOption,
                  { 
                    backgroundColor: scheduleFormat === 'student' ? colors.light : 'transparent',
                    borderColor: scheduleFormat === 'student' ? colors.primary : borderColor
                  }
                ]}
                onPress={() => handleFormatChange('student')}
              >
                <View style={styles.formatOptionHeader}>
                  <Icon 
                    name="people-outline" 
                    size={24} 
                    color={scheduleFormat === 'student' ? colors.primary : placeholderColor} 
                  />
                  <Text style={[
                    styles.formatOptionTitle, 
                    { color: scheduleFormat === 'student' ? colors.primary : textColor }
                  ]}>
                    Для студентов
                  </Text>
                </View>
                <Text style={[styles.formatOptionDescription, { color: placeholderColor }]}>
                  Просмотр расписания по группам с возможностью выбора дня/недели
                </Text>
                {scheduleFormat === 'student' && (
                  <Icon name="checkmark-circle" size={20} color={colors.primary} style={styles.formatCheckmark} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.formatOption,
                  { 
                    backgroundColor: scheduleFormat === 'teacher' ? colors.light : 'transparent',
                    borderColor: scheduleFormat === 'teacher' ? colors.primary : borderColor
                  }
                ]}
                onPress={() => handleFormatChange('teacher')}
              >
                <View style={styles.formatOptionHeader}>
                  <Icon 
                    name="person-outline" 
                    size={24} 
                    color={scheduleFormat === 'teacher' ? colors.primary : placeholderColor} 
                  />
                  <Text style={[
                    styles.formatOptionTitle, 
                    { color: scheduleFormat === 'teacher' ? colors.primary : textColor }
                  ]}>
                    Для преподавателей
                  </Text>
                </View>
                <Text style={[styles.formatOptionDescription, { color: placeholderColor }]}>
                  Просмотр расписания только в недельном формате для указанного преподавателя
                </Text>
                {scheduleFormat === 'teacher' && (
                  <Icon name="checkmark-circle" size={20} color={colors.primary} style={styles.formatCheckmark} />
                )}
              </TouchableOpacity>
            </View>

            {/* Настройки для студента */}
            {scheduleFormat === 'student' && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Группа по умолчанию</Text>
                <Text style={[styles.sectionDescription, { color: placeholderColor }]}>
                  Выберите группу, которая будет автоматически загружаться при открытии расписания
                </Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupsScroll}>
                  {availableGroups.map((group) => (
                    <TouchableOpacity
                      key={group}
                      style={[
                        styles.groupOption,
                        {
                          backgroundColor: defaultGroup === group ? colors.primary : inputBgColor,
                          borderColor: defaultGroup === group ? colors.primary : borderColor
                        }
                      ]}
                      onPress={() => setDefaultGroup(group)}
                    >
                      <Text style={[
                        styles.groupOptionText,
                        { color: defaultGroup === group ? '#ffffff' : textColor }
                      ]}>
                        {group}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {availableGroups.length === 0 && (
                  <Text style={[styles.noGroupsText, { color: placeholderColor }]}>
                    Загрузите группы, выбрав курс в расписании
                  </Text>
                )}
              </View>
            )}

            {/* Настройки для преподавателя */}
            {scheduleFormat === 'teacher' && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>ФИО преподавателя</Text>
                <Text style={[styles.sectionDescription, { color: placeholderColor }]}>
                  Укажите фамилию и инициалы в формате: Иванов И.И.
                </Text>
                
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: inputBgColor,
                      borderColor: isValidTeacherName(teacherName) ? colors.primary : borderColor,
                      color: textColor
                    }
                  ]}
                  placeholder="Например: Курячий С.Б."
                  placeholderTextColor={placeholderColor}
                  value={teacherName}
                  onChangeText={setTeacherName}
                  autoCapitalize="words"
                />
                
                {teacherName && !isValidTeacherName(teacherName) && (
                  <Text style={[styles.validationText, { color: '#ef4444' }]}>
                    Используйте формат: Фамилия И.О.
                  </Text>
                )}
                
                {teacherName && isValidTeacherName(teacherName) && (
                  <Text style={[styles.validationText, { color: colors.primary }]}>
                    Формат корректен
                  </Text>
                )}
              </View>
            )}

            {/* Информация о режимах */}
            <View style={styles.infoSection}>
              <Text style={[styles.infoTitle, { color: textColor }]}>Информация о режимах</Text>
              
              <View style={styles.infoItem}>
                <Icon name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: placeholderColor }]}>
                  <Text style={{ color: colors.primary }}>Студент:</Text> полный функционал с выбором групп и режимов отображения
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: placeholderColor }]}>
                  <Text style={{ color: colors.primary }}>Преподаватель:</Text> только недельное расписание для указанного преподавателя
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: inputBgColor }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: textColor }]}>Отмена</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={saveSettings}
            >
              <Text style={[styles.buttonText, { color: '#ffffff' }]}>Сохранить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Montserrat_600SemiBold',
  },
  scrollView: {
    maxHeight: 400,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'Montserrat_600SemiBold',
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  formatOption: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  formatOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  formatOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    fontFamily: 'Montserrat_600SemiBold',
    flex: 1,
  },
  formatOptionDescription: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  formatCheckmark: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  groupsScroll: {
    marginVertical: 8,
  },
  groupOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  groupOptionText: {
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },
  noGroupsText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'Montserrat_400Regular',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 8,
  },
  validationText: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Montserrat_400Regular',
  },
  infoSection: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'Montserrat_600SemiBold',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  saveButton: {
    marginLeft: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
});

export default ScheduleFormatModal;