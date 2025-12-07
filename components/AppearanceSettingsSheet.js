import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Switch } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ACCENT_COLORS, isNewYearPeriod } from '../utils/constants';

const AppearanceSettingsSheet = ({ 
  visible, 
  onClose, 
  theme, 
  accentColor, 
  setTheme, 
  setAccentColor, 
  onTabbarSettingsChange,
  isNewYearMode,
  onNewYearModeChange
}) => {
  const systemColorScheme = useColorScheme();
  
  const bgColor = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const inputBgColor = theme === 'light' ? '#f9fafb' : '#374151';
  const borderColor = theme === 'light' ? '#e5e7eb' : '#4b5563';
  const colors = ACCENT_COLORS[accentColor];

  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [showTabbarLabels, setShowTabbarLabels] = useState(true);
  const [tabbarFontSize, setTabbarFontSize] = useState('medium');
  const [newYearMode, setNewYearMode] = useState(isNewYearMode);
  const [showNewYearOption, setShowNewYearOption] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedTheme(theme);
      setNewYearMode(isNewYearMode);
      setShowNewYearOption(isNewYearPeriod());
      loadTabbarSettings();
    }
  }, [visible, theme, isNewYearMode]);

  const loadTabbarSettings = async () => {
    try {
      const labelsEnabled = await SecureStore.getItemAsync('tabbar_labels_enabled');
      const fontSize = await SecureStore.getItemAsync('tabbar_font_size');
      
      if (labelsEnabled !== null) {
        setShowTabbarLabels(labelsEnabled === 'true');
      }
      
      if (fontSize) {
        setTabbarFontSize(fontSize);
      }
    } catch (error) {
      console.error('Error loading tabbar settings:', error);
    }
  };

  const handleThemeChange = async (newTheme) => {
    setSelectedTheme(newTheme);
    setTheme(newTheme);
    await SecureStore.setItemAsync('theme', newTheme);
  };

  const handleAccentColorChange = async (newColor) => {
    setAccentColor(newColor);
    await SecureStore.setItemAsync('accentColor', newColor);
  };

  const handleShowLabelsChange = async (value) => {
    setShowTabbarLabels(value);
    await SecureStore.setItemAsync('tabbar_labels_enabled', value.toString());
    
    // Уведомляем родительский компонент о изменениях
    if (onTabbarSettingsChange) {
      onTabbarSettingsChange({
        showLabels: value,
        fontSize: tabbarFontSize
      });
    }
  };

  const handleFontSizeChange = async (size) => {
    setTabbarFontSize(size);
    await SecureStore.setItemAsync('tabbar_font_size', size);
    
    // Уведомляем родительский компонент о изменениях
    if (onTabbarSettingsChange) {
      onTabbarSettingsChange({
        showLabels: showTabbarLabels,
        fontSize: size
      });
    }
  };

  const handleNewYearModeChange = (value) => {
    setNewYearMode(value);
    if (onNewYearModeChange) {
      onNewYearModeChange(value);
    }
  };

  const getFontSizeText = (size) => {
    switch (size) {
      case 'small': return 'Маленький';
      case 'medium': return 'Средний';
      case 'large': return 'Большой';
      default: return 'Средний';
    }
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
          <Text style={[styles.title, { color: textColor }]}>Внешний вид приложения</Text>
          
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Секция темы */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Тема</Text>
              
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    { 
                      backgroundColor: selectedTheme === 'light' ? colors.light + '40' : 'transparent',
                      borderColor: selectedTheme === 'light' ? colors.primary : borderColor
                    }
                  ]}
                  onPress={() => handleThemeChange('light')}
                >
                  <View style={styles.optionHeader}>
                    <Icon 
                      name="sunny-outline" 
                      size={24} 
                      color={selectedTheme === 'light' ? colors.primary : placeholderColor} 
                    />
                    <Text style={[
                      styles.optionText, 
                      { color: selectedTheme === 'light' ? colors.primary : textColor }
                    ]}>
                      Светлая
                    </Text>
                  </View>
                  {selectedTheme === 'light' && (
                    <Icon name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.option,
                    { 
                      backgroundColor: selectedTheme === 'dark' ? colors.light + '40' : 'transparent',
                      borderColor: selectedTheme === 'dark' ? colors.primary : borderColor
                    }
                  ]}
                  onPress={() => handleThemeChange('dark')}
                >
                  <View style={styles.optionHeader}>
                    <Icon 
                      name="moon-outline" 
                      size={24} 
                      color={selectedTheme === 'dark' ? colors.primary : placeholderColor} 
                    />
                    <Text style={[
                      styles.optionText, 
                      { color: selectedTheme === 'dark' ? colors.primary : textColor }
                    ]}>
                      Темная
                    </Text>
                  </View>
                  {selectedTheme === 'dark' && (
                    <Icon name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.option,
                    { 
                      backgroundColor: selectedTheme === 'auto' ? colors.light + '40' : 'transparent',
                      borderColor: selectedTheme === 'auto' ? colors.primary : borderColor
                    }
                  ]}
                  onPress={() => handleThemeChange('auto')}
                >
                  <View style={styles.optionHeader}>
                    <Icon 
                      name="phone-portrait-outline" 
                      size={24} 
                      color={selectedTheme === 'auto' ? colors.primary : placeholderColor} 
                    />
                    <View style={styles.optionTextContainer}>
                      <Text style={[
                        styles.optionText, 
                        { color: selectedTheme === 'auto' ? colors.primary : textColor }
                      ]}>
                        Системная
                      </Text>
                      <Text style={[styles.optionDescription, { color: placeholderColor }]}>
                        {systemColorScheme === 'dark' ? 'Тёмная' : 'Светлая'}
                      </Text>
                    </View>
                  </View>
                  {selectedTheme === 'auto' && (
                    <Icon name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Секция акцентного цвета */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Акцентный цвет</Text>
              
              <View style={styles.colorOptions}>
                <TouchableOpacity
                  style={[
                    styles.colorOption, 
                    { backgroundColor: ACCENT_COLORS.green.primary }
                  ]}
                  onPress={() => handleAccentColorChange('green')}
                >
                  {accentColor === 'green' && (
                    <Icon name="checkmark" size={20} color="#ffffff" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.colorOption, 
                    { backgroundColor: ACCENT_COLORS.blue.primary }
                  ]}
                  onPress={() => handleAccentColorChange('blue')}
                >
                  {accentColor === 'blue' && (
                    <Icon name="checkmark" size={20} color="#ffffff" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.colorOption, 
                    { backgroundColor: ACCENT_COLORS.purple.primary }
                  ]}
                  onPress={() => handleAccentColorChange('purple')}
                >
                  {accentColor === 'purple' && (
                    <Icon name="checkmark" size={20} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Секция новогоднего настроения */}
            {showNewYearOption && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Новогоднее настроение</Text>
                
                <TouchableOpacity
                  style={[styles.settingItem, { borderBottomWidth: 1, borderBottomColor: borderColor }]}
                  onPress={() => handleNewYearModeChange(!newYearMode)}
                >
                  <View style={styles.settingInfo}>
                    <Icon 
                      name={newYearMode ? "snow" : "snow-outline"} 
                      size={24} 
                      color={newYearMode ? colors.primary : placeholderColor} 
                    />
                    <View style={styles.textContainer}>
                      <Text style={[styles.settingLabel, { color: textColor }]}>
                        Включить новогоднее настроение
                      </Text>
                      <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                        {newYearMode ? 'Снегопад и праздничные эффекты включены' : 'Включить снегопад и праздничные эффекты'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={newYearMode}
                    onValueChange={handleNewYearModeChange}
                    trackColor={{ false: '#f0f0f0', true: colors.light }}
                    thumbColor={newYearMode ? colors.primary : '#f4f3f4'}
                  />
                </TouchableOpacity>
                
                <View style={[styles.infoSection, { backgroundColor: inputBgColor, marginTop: 12 }]}>
                  <Icon name="information-circle-outline" size={16} color={colors.primary} />
                  <Text style={[styles.infoText, { color: placeholderColor, marginLeft: 8, flex: 1 }]}>
                    Новогоднее настроение доступно с 1 декабря по 31 января
                  </Text>
                </View>
              </View>
            )}

            {/* Секция настроек панели навигации */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Панель навигации</Text>
              
              {/* Переключатель подписей иконок */}
              <TouchableOpacity
                style={[styles.settingItem, { borderBottomWidth: 1, borderBottomColor: borderColor }]}
                onPress={() => handleShowLabelsChange(!showTabbarLabels)}
              >
                <View style={styles.settingInfo}>
                  <Icon name="text-outline" size={24} color={showTabbarLabels ? colors.primary : placeholderColor} />
                  <View style={styles.textContainer}>
                    <Text style={[styles.settingLabel, { color: textColor }]}>Показывать подписи иконок</Text>
                    <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                      Отображать названия вкладок под иконками
                    </Text>
                  </View>
                </View>
                <Switch
                  value={showTabbarLabels}
                  onValueChange={handleShowLabelsChange}
                  trackColor={{ false: '#f0f0f0', true: colors.light }}
                  thumbColor={showTabbarLabels ? colors.primary : '#f4f3f4'}
                />
              </TouchableOpacity>

              {/* Выбор размера шрифта подписей */}
              {showTabbarLabels && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.subSectionTitle, { color: textColor }]}>Размер шрифта подписей</Text>
                  <Text style={[styles.subSectionDescription, { color: placeholderColor }]}>
                    Выберите размер текста под иконками навигации
                  </Text>
                  
                  <View style={styles.fontSizeOptions}>
                    {['small', 'medium', 'large'].map((size) => (
                      <TouchableOpacity
                        key={size}
                        style={[
                          styles.fontSizeOption,
                          {
                            backgroundColor: tabbarFontSize === size ? colors.primary : inputBgColor,
                            borderColor: tabbarFontSize === size ? colors.primary : borderColor
                          }
                        ]}
                        onPress={() => handleFontSizeChange(size)}
                      >
                        <Text style={[
                          styles.fontSizeOptionText,
                          { 
                            color: tabbarFontSize === size ? '#ffffff' : textColor,
                            fontSize: size === 'small' ? 10 : size === 'medium' ? 12 : 14
                          }
                        ]}>
                          {getFontSizeText(size)}
                        </Text>
                        {tabbarFontSize === size && (
                          <Icon name="checkmark" size={16} color="#ffffff" style={{ marginLeft: 4 }} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Информационная секция */}
            <View style={[styles.infoSection, { backgroundColor: inputBgColor }]}>
              <Icon name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: placeholderColor, marginLeft: 8, flex: 1 }]}>
                Настройки оформления применяются автоматически
              </Text>
            </View>
          </ScrollView>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: inputBgColor }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: textColor }]}>Закрыть</Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
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
    marginBottom: 12,
    fontFamily: 'Montserrat_600SemiBold',
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Montserrat_600SemiBold',
  },
  subSectionDescription: {
    fontSize: 12,
    marginBottom: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  optionsContainer: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTextContainer: {
    marginLeft: 12,
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
    marginLeft: 12,
  },
  optionDescription: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
    marginLeft: 12,
  },
  colorOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  fontSizeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  fontSizeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  fontSizeOptionText: {
    fontFamily: 'Montserrat_500Medium',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  buttonsContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
});

export default AppearanceSettingsSheet;