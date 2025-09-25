// components/AboutModal.js
import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, APP_VERSION, APP_DEVELOPERS, APP_SUPPORTERS, BUILD_VER, BUILD_DATE } from '../utils/constants';

const AboutModal = ({ visible, onClose, theme, accentColor }) => {
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
          <Text style={[styles.title, { color: textColor }]}>О приложении</Text>
          
          <ScrollView style={styles.scrollView}>
            <View style={styles.section}>
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
  aboutText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'Montserrat_400Regular',
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

export default AboutModal;