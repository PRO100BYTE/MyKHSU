import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Alert, ActivityIndicator, Switch, FlatList } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { ACCENT_COLORS, COURSES, LIQUID_GLASS } from '../utils/constants';
import ApiService from '../utils/api';

const ScheduleFormatModal = ({ theme, accentColor, onSettingsChange, onSave }) => {
  const [scheduleFormat, setScheduleFormat] = useState('student');
  const [defaultGroup, setDefaultGroup] = useState('');
  const [defaultCourse, setDefaultCourse] = useState(1);
  const [teacherName, setTeacherName] = useState('');
  const [auditoryName, setAuditoryName] = useState('');
  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(1);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showCourseSelector, setShowCourseSelector] = useState(true);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  
  // Поиск преподавателей
  const [teacherSearchResults, setTeacherSearchResults] = useState([]);
  const [loadingTeacherSearch, setLoadingTeacherSearch] = useState(false);
  const [showTeacherSuggestions, setShowTeacherSuggestions] = useState(false);
  const teacherSearchTimeout = useRef(null);
  
  // Поиск аудиторий
  const [auditorySearchResults, setAuditorySearchResults] = useState([]);
  const [loadingAuditorySearch, setLoadingAuditorySearch] = useState(false);
  const [showAuditorySuggestions, setShowAuditorySuggestions] = useState(false);
  const auditorySearchTimeout = useRef(null);

  const colors = ACCENT_COLORS[accentColor];
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const inputBgColor = glass.surfaceTertiary;
  const borderColor = glass.border;

  useEffect(() => {
    loadSettings();
    fetchAvailableCourses();
  }, []);

  useEffect(() => {
    loadGroupsForCourse(selectedCourse);
  }, [selectedCourse]);

  const fetchAvailableCourses = async () => {
    setLoadingCourses(true);
    try {
      const result = await ApiService.getCourses();
      if (result.data && result.data.courses) {
        const coursesFromApi = result.data.courses;
        const filteredCourses = COURSES.filter(courseItem => 
          coursesFromApi.includes(courseItem.id.toString())
        );
        setAvailableCourses(filteredCourses);
      } else {
        setAvailableCourses(COURSES);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setAvailableCourses(COURSES);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadSettings = async () => {
    try {
      const savedFormat = await SecureStore.getItemAsync('schedule_format');
      const savedGroup = await SecureStore.getItemAsync('default_group');
      const savedCourse = await SecureStore.getItemAsync('default_course');
      const savedTeacher = await SecureStore.getItemAsync('teacher_name');
      const savedAuditory = await SecureStore.getItemAsync('auditory_name');
      const savedShowSelector = await SecureStore.getItemAsync('show_course_selector');
      
      if (savedFormat) setScheduleFormat(savedFormat);
      if (savedGroup) setDefaultGroup(savedGroup);
      if (savedCourse) setDefaultCourse(parseInt(savedCourse));
      if (savedTeacher) setTeacherName(savedTeacher);
      if (savedAuditory) setAuditoryName(savedAuditory);
      if (savedShowSelector !== null) setShowCourseSelector(savedShowSelector === 'true');
      if (savedCourse) setSelectedCourse(parseInt(savedCourse));
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
        if (defaultGroup && result.data.groups.includes(defaultGroup)) {
          setDefaultGroup(defaultGroup);
        } else if (result.data.groups.length > 0) {
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
      if (scheduleFormat === 'auditory' && !auditoryName.trim()) {
        Alert.alert('Ошибка', 'Пожалуйста, укажите номер аудитории');
        return;
      }
      if (scheduleFormat === 'student' && !defaultGroup && !showCourseSelector) {
        Alert.alert('Ошибка', 'При скрытом селекторе необходимо выбрать группу по умолчанию');
        return;
      }

      await SecureStore.setItemAsync('schedule_format', scheduleFormat);
      await SecureStore.setItemAsync('default_group', defaultGroup);
      await SecureStore.setItemAsync('default_course', selectedCourse.toString());
      await SecureStore.setItemAsync('teacher_name', teacherName.trim());
      await SecureStore.setItemAsync('auditory_name', auditoryName.trim());
      await SecureStore.setItemAsync('show_course_selector', showCourseSelector.toString());
      
      if (onSettingsChange) {
        onSettingsChange({
          format: scheduleFormat,
          group: defaultGroup,
          course: selectedCourse,
          teacher: teacherName.trim(),
          auditory: auditoryName.trim(),
          showSelector: showCourseSelector
        });
      }
      
      Alert.alert('Успех', 'Настройки расписания сохранены');
      if (onSave) onSave();
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
    setDefaultGroup('');
  };

  const isValidTeacherName = (name) => {
    const pattern = /^[А-ЯЁ][а-яё]+\s[А-ЯЁ]\.[А-ЯЁ]\.$/;
    return pattern.test(name.trim());
  };

  // Поиск преподавателей через API
  const searchTeachers = useCallback((query) => {
    if (teacherSearchTimeout.current) {
      clearTimeout(teacherSearchTimeout.current);
    }
    
    if (!query || query.trim().length < 2) {
      setTeacherSearchResults([]);
      setShowTeacherSuggestions(false);
      return;
    }
    
    teacherSearchTimeout.current = setTimeout(async () => {
      setLoadingTeacherSearch(true);
      try {
        const result = await ApiService.search(query.trim());
        if (result.data && result.data.tnames) {
          setTeacherSearchResults(result.data.tnames);
          setShowTeacherSuggestions(result.data.tnames.length > 0);
        } else {
          setTeacherSearchResults([]);
          setShowTeacherSuggestions(false);
        }
      } catch (error) {
        console.error('Error searching teachers:', error);
        setTeacherSearchResults([]);
        setShowTeacherSuggestions(false);
      } finally {
        setLoadingTeacherSearch(false);
      }
    }, 400);
  }, []);

  // Поиск аудиторий через API
  const searchAuditories = useCallback((query) => {
    if (auditorySearchTimeout.current) {
      clearTimeout(auditorySearchTimeout.current);
    }
    
    if (!query || query.trim().length < 1) {
      setAuditorySearchResults([]);
      setShowAuditorySuggestions(false);
      return;
    }
    
    auditorySearchTimeout.current = setTimeout(async () => {
      setLoadingAuditorySearch(true);
      try {
        const result = await ApiService.search(query.trim());
        if (result.data && result.data.auditories) {
          setAuditorySearchResults(result.data.auditories);
          setShowAuditorySuggestions(result.data.auditories.length > 0);
        } else {
          setAuditorySearchResults([]);
          setShowAuditorySuggestions(false);
        }
      } catch (error) {
        console.error('Error searching auditories:', error);
        setAuditorySearchResults([]);
        setShowAuditorySuggestions(false);
      } finally {
        setLoadingAuditorySearch(false);
      }
    }, 400);
  }, []);

  const handleTeacherNameChange = (text) => {
    setTeacherName(text);
    searchTeachers(text);
  };

  const selectTeacher = (name) => {
    setTeacherName(name);
    setShowTeacherSuggestions(false);
    setTeacherSearchResults([]);
  };

  const handleAuditoryNameChange = (text) => {
    setAuditoryName(text);
    searchAuditories(text);
  };

  const selectAuditory = (name) => {
    setAuditoryName(name);
    setShowAuditorySuggestions(false);
    setAuditorySearchResults([]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView 
        style={{ flex: 1, padding: 16 }} 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Выбор формата */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Режим отображения</Text>
          
          <TouchableOpacity
            style={[styles.formatOption, { 
              backgroundColor: scheduleFormat === 'student' ? colors.glass : 'transparent',
              borderColor: scheduleFormat === 'student' ? colors.primary : borderColor
            }]}
            onPress={() => handleFormatChange('student')}
          >
            <View style={styles.formatOptionHeader}>
              <Icon name="people-outline" size={24} color={scheduleFormat === 'student' ? colors.primary : placeholderColor} />
              <Text style={[styles.formatOptionTitle, { color: scheduleFormat === 'student' ? colors.primary : textColor }]}>
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
            style={[styles.formatOption, { 
              backgroundColor: scheduleFormat === 'teacher' ? colors.glass : 'transparent',
              borderColor: scheduleFormat === 'teacher' ? colors.primary : borderColor
            }]}
            onPress={() => handleFormatChange('teacher')}
          >
            <View style={styles.formatOptionHeader}>
              <Icon name="person-outline" size={24} color={scheduleFormat === 'teacher' ? colors.primary : placeholderColor} />
              <Text style={[styles.formatOptionTitle, { color: scheduleFormat === 'teacher' ? colors.primary : textColor }]}>
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

          <TouchableOpacity
            style={[styles.formatOption, { 
              backgroundColor: scheduleFormat === 'auditory' ? colors.glass : 'transparent',
              borderColor: scheduleFormat === 'auditory' ? colors.primary : borderColor
            }]}
            onPress={() => handleFormatChange('auditory')}
          >
            <View style={styles.formatOptionHeader}>
              <Icon name="business-outline" size={24} color={scheduleFormat === 'auditory' ? colors.primary : placeholderColor} />
              <Text style={[styles.formatOptionTitle, { color: scheduleFormat === 'auditory' ? colors.primary : textColor }]}>
                Аудитория
              </Text>
            </View>
            <Text style={[styles.formatOptionDescription, { color: placeholderColor }]}>
              Просмотр недельного расписания для указанной аудитории
            </Text>
            {scheduleFormat === 'auditory' && (
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
              
              <Text style={[styles.subSectionTitle, { color: textColor }]}>Выберите курс:</Text>
              {loadingCourses ? (
                <View style={{ alignItems: 'center', padding: 10 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ color: placeholderColor, marginTop: 8, fontFamily: 'Montserrat_400Regular' }}>
                    Загрузка курсов...
                  </Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.coursesScroll}>
                  {availableCourses.map((courseItem) => (
                    <TouchableOpacity
                      key={courseItem.id}
                      style={[styles.courseOption, {
                        backgroundColor: selectedCourse === courseItem.id ? colors.primary : inputBgColor,
                        borderColor: selectedCourse === courseItem.id ? colors.primary : borderColor
                      }]}
                      onPress={() => handleCourseChange(courseItem.id)}
                    >
                      <Text style={[styles.courseOptionText, { color: selectedCourse === courseItem.id ? '#ffffff' : textColor }]}>
                        {courseItem.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              
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
                      style={[styles.groupOption, {
                        backgroundColor: defaultGroup === group ? colors.primary : inputBgColor,
                        borderColor: defaultGroup === group ? colors.primary : borderColor
                      }]}
                      onPress={() => setDefaultGroup(group)}
                    >
                      <Text style={[styles.groupOptionText, { color: defaultGroup === group ? '#ffffff' : textColor }]}>
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
                <View style={[styles.selectedInfo, { backgroundColor: colors.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder }]}>
                  <Icon name="checkmark-circle" size={16} color={colors.primary} />
                  <Text style={[styles.selectedInfoText, { color: colors.primary }]}>
                    Выбрана группа: {defaultGroup} ({availableCourses.find(c => c.id === selectedCourse)?.label || `Курс ${selectedCourse}`})
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Отображение селектора</Text>
              
              <TouchableOpacity
                style={[styles.selectorOption, { borderColor }]}
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
                  trackColor={{ false: borderColor, true: colors.light }}
                  thumbColor={showCourseSelector ? colors.primary : placeholderColor}
                />
              </TouchableOpacity>

              {!showCourseSelector && !defaultGroup && (
                <Text style={[styles.warningText, { color: '#ef4444' }]}>
                  Для скрытия селектора необходимо выбрать группу по умолчанию
                </Text>
              )}

              {!showCourseSelector && defaultGroup && (
                <Text style={[styles.hintText, { color: colors.primary }]}>
                  При скрытом селекторе будет показано расписание для группы {defaultGroup} ({availableCourses.find(c => c.id === selectedCourse)?.label || `Курс ${selectedCourse}`})
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
              Начните вводить фамилию преподавателя для поиска
            </Text>
            
            <View style={{ position: 'relative', zIndex: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={[styles.textInput, {
                    backgroundColor: inputBgColor,
                    borderColor: teacherName.trim() ? colors.primary : borderColor,
                    color: textColor,
                    flex: 1,
                  }]}
                  placeholder="Начните вводить ФИО..."
                  placeholderTextColor={placeholderColor}
                  value={teacherName}
                  onChangeText={handleTeacherNameChange}
                  autoCapitalize="words"
                />
                {loadingTeacherSearch && (
                  <ActivityIndicator size="small" color={colors.primary} style={{ position: 'absolute', right: 12, top: 20 }} />
                )}
              </View>
              
              {showTeacherSuggestions && teacherSearchResults.length > 0 && (
                <View style={[styles.suggestionsContainer, {
                  backgroundColor: glass.backgroundElevated || inputBgColor,
                  borderColor: borderColor,
                }]}>
                  {teacherSearchResults.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.suggestionItem, {
                        borderBottomColor: borderColor,
                        borderBottomWidth: index < teacherSearchResults.length - 1 ? StyleSheet.hairlineWidth : 0,
                      }]}
                      onPress={() => selectTeacher(item)}
                    >
                      <Icon name="person-outline" size={16} color={colors.primary} style={{ marginRight: 10 }} />
                      <Text style={[styles.suggestionText, { color: textColor }]}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            {teacherName.trim() !== '' && (
              <View style={[styles.selectedInfo, { backgroundColor: colors.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder, marginTop: 12 }]}>
                <Icon name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={[styles.selectedInfoText, { color: colors.primary }]}>
                  Выбран преподаватель: {teacherName}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Настройки для аудитории */}
        {scheduleFormat === 'auditory' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Номер аудитории</Text>
            <Text style={[styles.sectionDescription, { color: placeholderColor }]}>
              Начните вводить номер аудитории для поиска
            </Text>
            
            <View style={{ position: 'relative', zIndex: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={[styles.textInput, {
                    backgroundColor: inputBgColor,
                    borderColor: auditoryName.trim() ? colors.primary : borderColor,
                    color: textColor,
                    flex: 1,
                  }]}
                  placeholder="Например: 2-221"
                  placeholderTextColor={placeholderColor}
                  value={auditoryName}
                  onChangeText={handleAuditoryNameChange}
                />
                {loadingAuditorySearch && (
                  <ActivityIndicator size="small" color={colors.primary} style={{ position: 'absolute', right: 12, top: 20 }} />
                )}
              </View>
              
              {showAuditorySuggestions && auditorySearchResults.length > 0 && (
                <View style={[styles.suggestionsContainer, {
                  backgroundColor: glass.backgroundElevated || inputBgColor,
                  borderColor: borderColor,
                }]}>
                  {auditorySearchResults.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.suggestionItem, {
                        borderBottomColor: borderColor,
                        borderBottomWidth: index < auditorySearchResults.length - 1 ? StyleSheet.hairlineWidth : 0,
                      }]}
                      onPress={() => selectAuditory(item)}
                    >
                      <Icon name="business-outline" size={16} color={colors.primary} style={{ marginRight: 10 }} />
                      <Text style={[styles.suggestionText, { color: textColor }]}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            {auditoryName.trim() !== '' && (
              <View style={[styles.selectedInfo, { backgroundColor: colors.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder, marginTop: 12 }]}>
                <Icon name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={[styles.selectedInfoText, { color: colors.primary }]}>
                  Выбрана аудитория: {auditoryName}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Информация о режимах */}
        <View style={[styles.infoSection, { backgroundColor: inputBgColor }]}>
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
          <View style={styles.infoItem}>
            <Icon name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: placeholderColor }]}>
              <Text style={{ color: colors.primary }}>Аудитория:</Text> только недельное расписание для указанной аудитории
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Кнопка сохранения */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={saveSettings}
        >
          <Icon name="checkmark" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>Сохранить</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, fontFamily: 'Montserrat_600SemiBold' },
  subSectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12, fontFamily: 'Montserrat_600SemiBold' },
  sectionDescription: { fontSize: 14, marginBottom: 12, fontFamily: 'Montserrat_400Regular' },
  formatOption: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16, marginBottom: 12, position: 'relative' },
  formatOptionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  formatOptionTitle: { fontSize: 16, fontWeight: '600', marginLeft: 12, fontFamily: 'Montserrat_600SemiBold', flex: 1 },
  formatOptionDescription: { fontSize: 14, fontFamily: 'Montserrat_400Regular' },
  formatCheckmark: { position: 'absolute', top: 16, right: 16 },
  coursesScroll: { marginVertical: 8 },
  courseOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: StyleSheet.hairlineWidth },
  courseOptionText: { fontSize: 14, fontFamily: 'Montserrat_500Medium' },
  groupsScroll: { marginVertical: 8, minHeight: 50 },
  groupOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  groupOptionText: { fontSize: 14, fontFamily: 'Montserrat_500Medium' },
  noGroupsText: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginTop: 8, fontFamily: 'Montserrat_400Regular' },
  selectedInfo: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 12 },
  selectedInfoText: { fontSize: 14, marginLeft: 8, fontFamily: 'Montserrat_500Medium' },
  textInput: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, fontSize: 16, fontFamily: 'Montserrat_400Regular', marginTop: 8 },
  validationText: { fontSize: 12, marginTop: 4, fontFamily: 'Montserrat_400Regular' },
  suggestionsContainer: { 
    borderWidth: StyleSheet.hairlineWidth, 
    borderRadius: 12, 
    marginTop: 4, 
    maxHeight: 200, 
    overflow: 'hidden',
  },
  suggestionItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 14,
  },
  suggestionText: { 
    fontSize: 15, 
    fontFamily: 'Montserrat_400Regular', 
    flex: 1,
  },
  selectorOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12 },
  selectorOptionHeader: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  selectorTextContainer: { marginLeft: 12, flex: 1 },
  selectorOptionTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Montserrat_600SemiBold' },
  selectorOptionDescription: { fontSize: 12, marginTop: 4, fontFamily: 'Montserrat_400Regular' },
  warningText: { fontSize: 12, marginTop: 8, fontFamily: 'Montserrat_400Regular', fontStyle: 'italic' },
  hintText: { fontSize: 12, marginTop: 8, fontFamily: 'Montserrat_400Regular', fontStyle: 'italic' },
  infoSection: { marginTop: 16, padding: 12, borderRadius: 16 },
  infoTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8, fontFamily: 'Montserrat_600SemiBold' },
  infoItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  infoText: { fontSize: 12, marginLeft: 8, flex: 1, fontFamily: 'Montserrat_400Regular' },
  saveButtonContainer: { 
    padding: 16, 
    paddingBottom: 100, 
    borderTopWidth: StyleSheet.hairlineWidth, 
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  saveButton: { 
    flexDirection: 'row', 
    borderRadius: 16, 
    padding: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  saveButtonText: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: '600', 
    fontFamily: 'Montserrat_600SemiBold',
  },
});

export default ScheduleFormatModal;
