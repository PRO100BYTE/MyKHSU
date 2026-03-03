import React from 'react';
import { View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';

const UnderDevelopmentModal = ({ visible, onClose, theme, accentColor, featureName }) => {
  const colors = ACCENT_COLORS[accentColor];
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalContainer}>
          <View 
            style={[
              styles.modalContent, 
              { 
                backgroundColor: glass.backgroundElevated,
                borderColor: glass.borderStrong,
              }
            ]} 
            onStartShouldSetResponder={() => true}
          >
            {/* Иконка */}
            <View style={[
              styles.iconContainer, 
              { backgroundColor: colors.glass, borderColor: colors.glassBorder }
            ]}>
              <Icon name="construct-outline" size={32} color={colors.primary} />
            </View>
            
            <Text style={[styles.title, { color: textColor }]}>
              В разработке
            </Text>
            
            <Text style={[styles.message, { color: placeholderColor }]}>
              {featureName || 'Данный функционал'} находится в разработке и будет доступен в одном из следующих обновлений.
            </Text>

            <View style={[
              styles.hintRow, 
              { backgroundColor: colors.glass, borderColor: colors.glassBorder }
            ]}>
              <Icon name="rocket-outline" size={16} color={colors.primary} />
              <Text style={[styles.hintText, { color: colors.primary }]}>
                Следите за обновлениями!
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.closeButton, 
                { 
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                }
              ]}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Понятно</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'Montserrat_700Bold',
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Montserrat_400Regular',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 22,
    gap: 6,
  },
  hintText: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
  closeButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
});

export default UnderDevelopmentModal;