import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, PanResponder, Animated } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';

const AboutModal = ({ visible, onClose, theme, accentColor }) => {
  const [panY] = useState(new Animated.Value(0));

  const bgColor = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const colors = ACCENT_COLORS[accentColor];

  // Создаем PanResponder для обработки свайпа
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 0;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        panY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        onClose();
      } else {
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true
        }).start();
      }
    }
  });

  const animatedStyle = {
    transform: [{ translateY: panY }]
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <Animated.View 
          style={[styles.bottomSheet, { backgroundColor: bgColor }, animatedStyle]}
          {...panResponder.panHandlers}
        >
          <View style={styles.sheetHandle} />
          
          <Text style={[styles.sheetTitle, { color: textColor, fontFamily: 'Montserrat_600SemiBold' }]}>
            О приложении
          </Text>
          
          <ScrollView style={styles.aboutContent}>
            <Text style={[styles.aboutText, { color: textColor }]}>
              Мой ИТИ ХГУ - мобильное приложение для студентов Инженерно-технологического института Хакасского государственного университета.
              {"\n\n"}
              Основные возможности:
              {"\n"}
              • Просмотр расписания занятий по группам
              {"\n"}
              • Чтение новостей университета
              {"\n"}
              • Офлайн-доступ к расписанию и новостям
              {"\n"}
              • Просмотр карты расположения учебных корпусов
              {"\n"}
              • Раздел Первокурснику для тех, кто только поступил в ИТИ :) (в разработке)
              {"\n"}
              • Настройка внешнего вида приложения
              {"\n\n"}
              Приложение разработано для удобного доступа к актуальной информации об учебном процессе.
              {"\n\n"}
              Важно: приложение использует Self-hosted сервис Sentry, предоставляемый ООО "Скалк Софт" (Sculk Ltd.) для отслеживания ошибок, возникших в процессе использования приложения. Данные, собираемые Sentry, включают техническую информацию об устройстве и контекст ошибки, но не содержат персональных данных пользователей.
            </Text>
          </ScrollView>
          
          <TouchableOpacity
            style={[styles.sheetButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={[styles.sheetButtonText, { color: '#ffffff', fontFamily: 'Montserrat_600SemiBold' }]}>
              Закрыть
            </Text>
          </TouchableOpacity>
        </Animated.View>
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
  aboutContent: {
    maxHeight: 300,
    marginBottom: 20,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'Montserrat_400Regular',
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

export default AboutModal;