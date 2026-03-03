import React, { useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, Animated } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';

const UnderDevelopmentModal = ({ visible, onClose, theme, accentColor, featureName }) => {
  const colors = ACCENT_COLORS[accentColor];
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;

  const overlayAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      overlayAnim.setValue(0);
      contentAnim.setValue(0);
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(contentAnim, { toValue: 1, damping: 20, stiffness: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  if (!visible) return null;

  const contentScale = contentAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const contentTranslateY = contentAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.modalContainer, { opacity: overlayAnim }]}>
          <Animated.View 
            style={[
              styles.modalContent, 
              { 
                backgroundColor: glass.backgroundElevated,
                borderColor: glass.borderStrong,
                transform: [{ scale: contentScale }, { translateY: contentTranslateY }],
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
              onPress={handleClose}
            >
              <Text style={styles.closeButtonText}>Понятно</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
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