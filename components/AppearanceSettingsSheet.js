import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ACCENT_COLORS } from '../utils/constants';

const AppearanceSettingsSheet = ({ visible, onClose, theme, accentColor, setTheme, setAccentColor }) => {
  const systemColorScheme = useColorScheme();
  const bgColor = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    await SecureStore.setItemAsync('theme', newTheme);
  };

  const handleAccentColorChange = async (newColor) => {
    setAccentColor(newColor);
    await SecureStore.setItemAsync('accentColor', newColor);
  };

  // Правильное определение эффективной темы
  const getEffectiveTheme = () => {
    if (theme === 'auto') return systemColorScheme || 'light';
    return theme;
  };

  const effectiveTheme = getEffectiveTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.bottomSheet, { backgroundColor: bgColor }]}>
          <View style={styles.sheetHandle} />
          
          <Text style={[styles.sheetTitle, { color: textColor, fontFamily: 'Montserrat_600SemiBold' }]}>
            Внешний вид
          </Text>
          
          <View style={styles.sheetSection}>
            <Text style={[styles.sheetSectionTitle, { color: textColor, fontFamily: 'Montserrat_500Medium' }]}>
              Тема
            </Text>
            
            <View style={styles.sheetOptions}>
              <TouchableOpacity
                style={[
                  styles.sheetOption,
                  { 
                    backgroundColor: theme === 'light' ? ACCENT_COLORS[accentColor].light : 'transparent',
                    borderColor: theme === 'light' ? ACCENT_COLORS[accentColor].primary : 'transparent'
                  }
                ]}
                onPress={() => handleThemeChange('light')}
              >
                <Icon name="sunny-outline" size={20} color={theme === 'light' ? ACCENT_COLORS[accentColor].primary : textColor} />
                <Text style={[styles.sheetOptionText, { 
                  color: theme === 'light' ? ACCENT_COLORS[accentColor].primary : textColor,
                  fontFamily: 'Montserrat_400Regular' 
                }]}>
                  Светлая
                </Text>
                {theme === 'light' && <Icon name="checkmark" size={20} color={ACCENT_COLORS[accentColor].primary} />}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.sheetOption,
                  { 
                    backgroundColor: theme === 'dark' ? ACCENT_COLORS[accentColor].light : 'transparent',
                    borderColor: theme === 'dark' ? ACCENT_COLORS[accentColor].primary : 'transparent'
                  }
                ]}
                onPress={() => handleThemeChange('dark')}
              >
                <Icon name="moon-outline" size={20} color={theme === 'dark' ? ACCENT_COLORS[accentColor].primary : textColor} />
                <Text style={[styles.sheetOptionText, { 
                  color: theme === 'dark' ? ACCENT_COLORS[accentColor].primary : textColor,
                  fontFamily: 'Montserrat_400Regular' 
                }]}>
                  Темная
                </Text>
                {theme === 'dark' && <Icon name="checkmark" size={20} color={ACCENT_COLORS[accentColor].primary} />}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.sheetOption,
                  { 
                    backgroundColor: theme === 'auto' ? ACCENT_COLORS[accentColor].light : 'transparent',
                    borderColor: theme === 'auto' ? ACCENT_COLORS[accentColor].primary : 'transparent'
                  }
                ]}
                onPress={() => handleThemeChange('auto')}
              >
                <Icon name="phone-portrait-outline" size={20} color={theme === 'auto' ? ACCENT_COLORS[accentColor].primary : textColor} />
                <Text style={[styles.sheetOptionText, { 
                  color: theme === 'auto' ? ACCENT_COLORS[accentColor].primary : textColor,
                  fontFamily: 'Montserrat_400Regular' 
                }]}>
                  Системная ({systemColorScheme === 'dark' ? 'Тёмная' : 'Светлая'})
                </Text>
                {theme === 'auto' && <Icon name="checkmark" size={20} color={ACCENT_COLORS[accentColor].primary} />}
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.sheetSection}>
            <Text style={[styles.sheetSectionTitle, { color: textColor, fontFamily: 'Montserrat_500Medium' }]}>
              Акцентный цвет
            </Text>
            
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
          
          <TouchableOpacity
            style={[styles.sheetButton, { backgroundColor: ACCENT_COLORS[accentColor].primary }]}
            onPress={onClose}
          >
            <Text style={[styles.sheetButtonText, { color: '#ffffff', fontFamily: 'Montserrat_600SemiBold' }]}>
              Готово
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#9ca3af',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  sheetSection: {
    marginBottom: 24,
  },
  sheetSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sheetOptions: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sheetOptionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  colorOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  sheetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AppearanceSettingsSheet;