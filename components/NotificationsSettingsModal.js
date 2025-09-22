import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { ACCENT_COLORS } from '../utils/constants';

const NOTIFICATION_SETTINGS_KEY = 'notificationSettings';

const NotificationsSettingsModal = ({ visible, onClose, theme, accentColor }) => {
  const [notificationType, setNotificationType] = useState('disabled');
  const bgColor = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const colors = ACCENT_COLORS[accentColor];

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEY);
        if (settings) {
          setNotificationType(settings);
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    }
    loadSettings();
  }, []);

  const saveSettings = async (type) => {
    try {
      setNotificationType(type);
      await SecureStore.setItemAsync(NOTIFICATION_SETTINGS_KEY, type);
      Alert.alert('Настройки сохранены', 'Ваши предпочтения уведомлений были успешно обновлены.');
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить настройки уведомлений.');
    }
  };

  const options = [
    { label: 'Уведомления отключены', value: 'disabled' },
    { label: 'Только уведомления о новостях', value: 'newsOnly' },
    { label: 'Все уведомления', value: 'all' },
  ];

  const renderOption = (option) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.optionButton,
        { 
          borderColor: notificationType === option.value ? colors.primary : placeholderColor,
          backgroundColor: notificationType === option.value ? colors.light : 'transparent',
        }
      ]}
      onPress={() => saveSettings(option.value)}
    >
      <View style={[styles.radioOuter, { borderColor: notificationType === option.value ? colors.primary : placeholderColor }]}>
        {notificationType === option.value && (
          <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
        )}
      </View>
      <Text style={[styles.optionText, { color: textColor }]}>{option.label}</Text>
    </TouchableOpacity>
  );

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
            Настройки уведомлений
          </Text>
          
          <Text style={[styles.sheetDescription, { color: placeholderColor }]}>
            Выберите, какие уведомления вы хотите получать.
          </Text>

          <View style={styles.optionsContainer}>
            {options.map(renderOption)}
          </View>
          
          <TouchableOpacity
            style={[styles.sheetButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={[styles.sheetButtonText, { color: '#ffffff', fontFamily: 'Montserrat_600SemiBold' }]}>
              Закрыть
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
    paddingHorizontal: 20,
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
    textAlign: 'center',
  },
  sheetDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 16,
    fontFamily: 'Montserrat_500Medium',
  },
  radioOuter: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    height: 12,
    width: 12,
    borderRadius: 6,
  },
  sheetButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  sheetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NotificationsSettingsModal;