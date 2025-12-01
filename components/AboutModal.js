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
  const inputBgColor = theme === 'light' ? '#f9fafb' : '#374151';
  const borderColor = theme === 'light' ? '#e5e7eb' : '#4b5563';

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
          
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Основная информация */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Описание</Text>
              <Text style={[styles.sectionDescription, { color: placeholderColor }]}>
                Мой ИТИ ХГУ - мобильное приложение для студентов и преподавателей Инженерно-технологического института Хакасского государственного университета.
              </Text>
            </View>

            {/* Основные возможности */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Основные возможности</Text>
              
              <View style={styles.featureItem}>
                <Icon name="checkmark-circle" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Просмотр расписания занятий для студентов и преподавателей
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="checkmark-circle" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Два формата отображения: для студентов (по группам) и преподавателей (по ФИО)
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="checkmark-circle" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Режимы просмотра: на день и на неделю
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="checkmark-circle" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Чтение новостей университета с поддержкой офлайн-доступа
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="checkmark-circle" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Интерактивная карта расположения учебных корпусов
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="checkmark-circle" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Раздел "Первокурснику" с полезной информацией для новых студентов
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="checkmark-circle" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Настройка внешнего вида приложения (темы и цветовые схемы)
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="checkmark-circle" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Уведомления о новостях и изменениях в расписании
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="checkmark-circle" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Полная офлайн-работа с кэшированием данных
                </Text>
              </View>
            </View>

            {/* Раздел "Первокурснику" */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Раздел "Первокурснику"</Text>
              
              <View style={styles.featureItem}>
                <Icon name="link-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Ссылки на официальные сайты ИТИ ХГУ и образовательные порталы
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="people-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Полезные группы и сообщества ВКонтакте
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="rocket-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Быстрый доступ к основным ресурсам университета
                </Text>
              </View>
            </View>

            {/* Для преподавателей */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Для преподавателей</Text>
              
              <View style={styles.featureItem}>
                <Icon name="person-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Просмотр расписания по ФИО преподавателя
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="people-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Отображение групп для каждой пары
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="calendar-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Недельное расписание с возможностью навигации
                </Text>
              </View>
            </View>

            {/* Техническая информация */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Техническая информация</Text>
              
              <View style={styles.featureItem}>
                <Icon name="phone-portrait-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Поддержка светлой и тёмной тем
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="color-palette-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Несколько акцентных цветовых схем
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="expand-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Адаптивный интерфейс для разных размеров экранов
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="wifi-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Оптимизированная работа при слабом интернет-соединении
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="refresh-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Регулярные автоматические обновления данных
                </Text>
              </View>
            </View>

            {/* Информация о Sentry */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Отслеживание ошибок</Text>
              <Text style={[styles.sectionDescription, { color: placeholderColor }]}>
                Приложение использует Self-hosted сервис Sentry, предоставляемый ООО "Скалк Софт" (Sculk Ltd.) для отслеживания ошибок, возникших в процессе использования приложения. Данные, собираемые Sentry, включают техническую информацию об устройстве и контекст ошибки, но не содержат персональных данных пользователей.
              </Text>
            </View>

            {/* Информация о версии */}
            <View style={[styles.infoSection, { backgroundColor: inputBgColor, borderColor: borderColor }]}>
              <Text style={[styles.infoTitle, { color: textColor }]}>Информация о версии</Text>
              
              <View style={styles.infoItem}>
                <Icon name="phone-portrait-outline" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: placeholderColor }]}>
                  Версия приложения: {APP_VERSION}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="build-outline" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: placeholderColor }]}>
                  Сборка {BUILD_VER} от {BUILD_DATE}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="people-outline" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: placeholderColor }]}>
                  Разработано {APP_DEVELOPERS}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="heart-outline" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: placeholderColor }]}>
                  При поддержке {APP_SUPPORTERS}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Кнопки */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: inputBgColor, borderColor: borderColor }]}
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
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    fontFamily: 'Montserrat_400Regular',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  featureIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
  },
  infoSection: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'Montserrat_600SemiBold',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButton: {
    maxWidth: 200,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
});

export default AboutModal;