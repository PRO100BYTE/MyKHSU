// components/AppearanceSettingsSheet.js
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ACCENT_COLORS } from '../utils/constants';

const AppearanceSettingsSheet = ({ visible, onClose, theme, accentColor, setTheme, setAccentColor }) => {
  const systemColorScheme = useColorScheme();
  
  const bgColor = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const colors = ACCENT_COLORS[accentColor];

  const [selectedTheme, setSelectedTheme] = useState(theme);

  useEffect(() => {
    if (visible) {
      setSelectedTheme(theme);
    }
  }, [visible, theme]);

  const handleThemeChange = async (newTheme) => {
    setSelectedTheme(newTheme);
    setTheme(newTheme);
    await SecureStore.setItemAsync('theme', newTheme);
  };

  const handleAccentColorChange = async (newColor) => {
    setAccentColor(newColor);
    await SecureStore.setItemAsync('accentColor', newColor);
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
          
          <ScrollView style={styles.scrollView}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Тема</Text>
              
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    { 
                      backgroundColor: selectedTheme === 'light' ? colors.light : 'transparent',
                      borderColor: selectedTheme === 'light' ? colors.primary : '#e5e7eb'
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
                    <Icon name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.option,
                    { 
                      backgroundColor: selectedTheme === 'dark' ? colors.light : 'transparent',
                      borderColor: selectedTheme === 'dark' ? colors.primary : '#e5e7eb'
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
                    <Icon name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.option,
                    { 
                      backgroundColor: selectedTheme === 'auto' ? colors.light : 'transparent',
                      borderColor: selectedTheme === 'auto' ? colors.primary : '#e5e7eb'
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
                    <Icon name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Акцентный цвет</Text>
              
              <View style={styles.colorOptions}>
                <TouchableOpacity
                  style={[styles.colorOption, { backgroundColor: ACCENT_COLORS.green.primary }]}
                  onPress={() => handleAccentColorChange('green')}
                >
                  {accentColor === 'green' && <Icon name="checkmark" size={20} color="#ffffff" />}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.colorOption, { backgroundColor: ACCENT_COLORS.blue.primary }]}
                  onPress={() => handleAccentColorChange('blue')}
                >
                  {accentColor === 'blue' && <Icon name="checkmark" size={20} color="#ffffff" />}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.colorOption, { backgroundColor: ACCENT_COLORS.purple.primary }]}
                  onPress={() => handleAccentColorChange('purple')}
                >
                  {accentColor === 'purple' && <Icon name="checkmark" size={20} color="#ffffff" />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={[styles.infoText, { color: placeholderColor }]}>
                Внимание! Настройки оформления применяются автоматически
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Закрыть</Text>
          </TouchableOpacity>
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
    marginBottom: 12,
    fontFamily: 'Montserrat_600SemiBold',
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
  },
  optionDescription: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
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
  infoSection: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
  },
  closeButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
});

export default AppearanceSettingsSheet;