import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, StyleSheet, Alert, ActivityIndicator, Switch } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { ACCENT_COLORS, COURSES } from '../utils/constants';
import ApiService from '../utils/api';

const ScheduleFormatModal = ({ visible, onClose, theme, accentColor }) => {
  const [scheduleFormat, setScheduleFormat] = useState('student');
  const [defaultGroup, setDefaultGroup] = useState('');
  const [defaultCourse, setDefaultCourse] = useState(1); // Добавлено состояние для курса
  const [teacherName, setTeacherName] = useState('');
  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(1);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showCourseSelector, setShowCourseSelector] = useState(true);

  const colors = ACCENT_COLORS[accentColor];
  const bgColor = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const inputBgColor = theme === 'light' ? '#f9fafb' : '#374151';
  const borderColor = theme === 'light' ? '#e5e7eb' : '#4b5563';

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      loadGroupsForCourse(selectedCourse);
    }
  }, [visible, selectedCourse]);

  const loadSettings = async () => {
    try {
      const savedFormat = await SecureStore.getItemAsync('schedule_format');
      const savedGroup = await SecureStore.getItemAsync('default_group');
      const savedCourse = await SecureStore.getItemAsync('default_course'); // Загружаем курс
      const savedTeacher = await SecureStore.getItemAsync('teacher_name');
      const savedShowSelector = await SecureStore.getItemAsync('show_course_selector');
      
      if (savedFormat) setScheduleFormat(savedFormat);
      if (savedGroup) setDefaultGroup(savedGroup);
      if (savedCourse) setDefaultCourse(parseInt(savedCourse)); // Устанавливаем сохраненный курс
      if (savedTeacher) setTeacherName(savedTeacher);
      if (savedShowSelector !== null) setShowCourseSelector(savedShowSelector === 'true');
      
      // Устанавливаем выбранный курс из сохраненных настроек
      if (savedCourse) {
        setSelectedCourse(parseInt(savedCourse));
      }
      
      console.log('Загружены настройки:', { 
        format: savedFormat, 
        group: savedGroup, 
        course: savedCourse,
        teacher: savedTeacher 
      });
    } catch (error) {
      console.error('Error loading schedule format settings:', error);
    }
  };

  const loadGroupsForCourse = async (course) => {
    setLoadingGroups(true);
    try {
      const result = await ApiService.getGroups(course);
      if (result.data && result.data.groups) {
        setAvailableGroups(result.data.groups);
        
        // Если есть сохраненная группа и она есть в новом списке, выбираем ее
        if (defaultGroup && result.data.groups.includes(defaultGroup)) {
          setDefaultGroup(defaultGroup);
        } else if (result.data.groups.length > 0) {
          // Иначе выбираем первую группу из списка
          setDefaultGroup(result.data.groups[0]);
        }
      } else {
        setAvailableGroups([]);
        setDefaultGroup('');
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      setAvailableGroups([]);
      setDefaultGroup('');
    } finally {
      setLoadingGroups(false);
    }
  };

  const saveSettings = async () => {
    try {
      if (scheduleFormat === 'teacher' && !teacherName.trim()) {
        Alert.alert('Ошибка', 'Пожалуйста, укажите ФИО преподавателя');
        return;
      }

      if (scheduleFormat === 'student' && !defaultGroup && !showCourseSelector) {
        Alert.alert('Ошибка', 'При скрытом селекторе необходимо выбрать группу по умолчанию');
        return;
      }

      await SecureStore.setItemAsync('schedule_format', scheduleFormat);
      await SecureStore.setItemAsync('default_group', defaultGroup);
      await SecureStore.setItemAsync('default_course', selectedCourse.toString()); // Сохраняем курс
      await SecureStore.setItemAsync('teacher_name', teacherName.trim());
      await SecureStore.setItemAsync('show_course_selector', showCourseSelector.toString());
      
      console.log('Настройки сохранены:', { 
        format: scheduleFormat, 
        group: defaultGroup, 
        course: selectedCourse,
        teacher: teacherName.trim() 
      });
      
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

  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
    setDefaultGroup(''); // Сбрасываем группу при смене курса
  };

  const isValidTeacherName = (name) => {
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
              <>
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Группа по умолчанию</Text>
                  <Text style={[styles.sectionDescription, { color: placeholderColor }]}>
                    Выберите курс и группу, которые будут автоматически загружаться при открытии расписания
                  </Text>
                  
                  {/* Выбор курса */}
                  <Text style={[styles.subSectionTitle, { color: textColor }]}>Выберите курс:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.coursesScroll}>
                    {COURSES.map((courseItem) => (
                      <TouchableOpacity
                        key={courseItem.id}
                        style={[
                          styles.courseOption,
                          {
                            backgroundColor: selectedCourse === courseItem.id ? colors.primary : inputBgColor,
                            borderColor: selectedCourse === courseItem.id ? colors.primary : borderColor
                          }
                        ]}
                        onPress={() => handleCourseChange(courseItem.id)}
                      >
                        <Text style={[
                          styles.courseOptionText,
                          { color: selectedCourse === courseItem.id ? '#ffffff' : textColor }
                        ]}>
                          {courseItem.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  
                  {/* Список групп */}
                  <Text style={[styles.subSectionTitle, { color: textColor }]}>Выберите группу:</Text>
                  {loadingGroups ? (
                    <View style={{ alignItems: 'center', padding: 20 }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={{ color: placeholderColor, marginTop: 8, fontFamily: 'Montserrat_400Regular' }}>
                        Загрузка групп...
                      </Text>
                    </View>
                  ) : (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      style={styles.groupsScroll}
                      contentContainerStyle={{ paddingHorizontal: 4 }}
                    >
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
                  )}
                  
                  {availableGroups.length === 0 && !loadingGroups && (
                    <Text style={[styles.noGroupsText, { color: placeholderColor }]}>
                      Группы не найдены для выбранного курса
                    </Text>
                  )}
                  
                  {defaultGroup && (
                    <View style={[styles.selectedInfo, { backgroundColor: colors.light }]}>
                      <Icon name="checkmark-circle" size={16} color={colors.primary} />
                      <Text style={[styles.selectedInfoText, { color: colors.primary }]}>
                        Выбрана группа: {defaultGroup} ({COURSES.find(c => c.id === selectedCourse)?.label})
                      </Text>
                    </View>
                  )}
                </View>

                {/* Настройка отображения селектора */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Отображение селектора</Text>
                  
                  <TouchableOpacity
                    style={styles.selectorOption}
                    onPress={() => setShowCourseSelector(!showCourseSelector)}
                  >
                    <View style={styles.selectorOptionHeader}>
                      <Icon 
                        name={showCourseSelector ? "eye-outline" : "eye-off-outline"} 
                        size={24} 
                        color={showCourseSelector ? colors.primary : placeholderColor} 
                      />
                      <View style={styles.selectorTextContainer}>
                        <Text style={[styles.selectorOptionTitle, { color: textColor }]}>
                          Показывать селектор курсов и групп
                        </Text>
                        <Text style={[styles.selectorOptionDescription, { color: placeholderColor }]}>
                          {showCourseSelector 
                            ? 'В расписании будет отображаться выбор курса и группы' 
                            : 'Будет показано только расписание для выбранной группы по умолчанию'}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={showCourseSelector}
                      onValueChange={setShowCourseSelector}
                      trackColor={{ false: '#f0f0f0', true: colors.light }}
                      thumbColor={showCourseSelector ? colors.primary : '#f4f3f4'}
                    />
                  </TouchableOpacity>

                  {!showCourseSelector && !defaultGroup && (
                    <Text style={[styles.warningText, { color: '#ef4444' }]}>
                      Для скрытия селектора необходимо выбрать группу по умолчанию
                    </Text>
                  )}

                  {!showCourseSelector && defaultGroup && (
                    <Text style={[styles.infoText, { color: colors.primary }]}>
                       
                    </Text>
                  )}
                  
                  {!showCourseSelector && defaultGroup && (
                    <Text style={[styles.infoText, { color: colors.primary }]}>
                      При скрытом селекторе будет показано расписание для группы {defaultGroup} ({COURSES.find(c => c.id === selectedCourse)?.label})
                    </Text>
                  )}
                </View>
              </>
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
    maxHeight: '90%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Montserrat_600SemiBold',
  },
  scrollView: {
    maxHeight: 500,
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
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
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
  coursesScroll: {
    marginVertical: 8,
  },
  courseOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  courseOptionText: {
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },
  groupsScroll: {
    marginVertical: 8,
    minHeight: 50,
  },
  groupOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    marginBottom: 8,
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
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  selectedInfoText: {
    fontSize: 14,
    marginLeft: 8,
    fontFamily: 'Montserrat_500Medium',
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
  selectorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  selectorOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  selectorOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  selectorOptionDescription: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Montserrat_400Regular',
  },
  warningText: {
    fontSize: 12,
    marginTop: 8,
    fontFamily: 'Montserrat_400Regular',
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 12,
    marginTop: 8,
    fontFamily: 'Montserrat_400Regular',
    fontStyle: 'italic',
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