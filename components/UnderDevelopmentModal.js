import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';

const UnderDevelopmentModal = ({ visible, onClose, theme, accentColor, featureName }) => {
  const colors = ACCENT_COLORS[accentColor];
  const bgColor = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';

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
          <View style={[styles.iconContainer, { backgroundColor: colors.light }]}>
            <Icon name="construct-outline" size={48} color={colors.primary} />
          </View>
          
          <Text style={[styles.title, { color: textColor }]}>
            Функционал в разработке
          </Text>
          
          <Text style={[styles.message, { color: placeholderColor }]}>
            {featureName || 'Данный функционал'} находится в разработке и будет доступен в одном из следующих обновлений приложения.
          </Text>

          <Text style={[styles.encouragement, { color: placeholderColor }]}>
            Следите за обновлениями! 🚀
          </Text>

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Понятно</Text>
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
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    borderRadius: 50,
    padding: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Montserrat_600SemiBold',
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Montserrat_400Regular',
  },
  encouragement: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Montserrat_400Regular',
  },
  closeButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
});

export default UnderDevelopmentModal;