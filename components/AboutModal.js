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
                Мой ИТИ ХГУ - мобильное приложение для студентов и преподавателей Инженерно-технологического института Хакасского государственного университета.
                {"\n\n"}
                Основные возможности:
                {"\n"}
                • Просмотр расписания занятий для студентов и преподавателей
                {"\n"}
                • Два формата отображения: для студентов (по группам) и преподавателей (по ФИО)
                {"\n"}
                • Режимы просмотра: на день и на неделю
                {"\n"}
                • Чтение новостей университета с поддержкой офлайн-доступа
                {"\n"}
                • Интерактивная карта расположения учебных корпусов
                {"\n"}
                • Раздел "Первокурснику" с полезной информацией для новых студентов
                {"\n"}
                • Настройка внешнего вида приложения (темы и цветовые схемы)
                {"\n"}
                • Уведомления о новостях и изменениях в расписании
                {"\n"}
                • Полная офлайн-работа с кэшированием данных
                {"\n\n"}
                В разделе "Первокурснику" доступны:
                {"\n"}
                • Ссылки на официальные сайты ИТИ ХГУ и образовательные порталы
                {"\n"}
                • Полезные группы и сообщества ВКонтакте
                {"\n"}
                • Быстрый доступ к основным ресурсам университета
                {"\n\n"}
                Для преподавателей:
                {"\n"}
                • Просмотр расписания по ФИО преподавателя
                {"\n"}
                • Отображение групп для каждой пары
                {"\n"}
                • Недельное расписание с возможностью навигации
                {"\n\n"}
                Приложение разработано для удобного доступа к актуальной информации об учебном процессе и жизни университета.
                {"\n\n"}
                Техническая информация:
                {"\n"}
                • Поддержка светлой и тёмной тем
                {"\n"}
                • Несколько акцентных цветовых схем
                {"\n"}
                • Адаптивный интерфейс для разных размеров экранов
                {"\n"}
                • Оптимизированная работа при слабом интернет-соединении
                {"\n"}
                • Регулярные автоматические обновления данных
                {"\n\n"}
                Важно: приложение использует Self-hosted сервис Sentry, предоставляемый ООО "Скалк Софт" (Sculk Ltd.) для отслеживания ошибок, возникших в процессе использования приложения. Данные, собираемые Sentry, включают техническую информацию об устройстве и контекст ошибки, но не содержат персональных данных пользователей.
              </Text>
            </View>

            <View style={[styles.infoSection, { backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)' }]}>
              <Text style={[styles.infoTitle, { color: textColor }]}>Информация о версии</Text>
              
              <View style={styles.infoItem}>
                <Icon name="phone-portrait-outline" size={14} color={placeholderColor} />
                <Text style={[styles.infoText, { color: placeholderColor }]}>
                  Версия приложения: {APP_VERSION}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="build-outline" size={14} color={placeholderColor} />
                <Text style={[styles.infoText, { color: placeholderColor }]}>
                  Сборка {BUILD_VER} от {BUILD_DATE}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="people-outline" size={14} color={placeholderColor} />
                <Text style={[styles.infoText, { color: placeholderColor }]}>
                  Разработано {APP_DEVELOPERS}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="heart-outline" size={14} color={placeholderColor} />
                <Text style={[styles.infoText, { color: placeholderColor }]}>
                  При поддержке {APP_SUPPORTERS}
                </Text>
              </View>
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