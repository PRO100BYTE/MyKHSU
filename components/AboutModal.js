// components/AboutModal.js
import React, { useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, APP_VERSION, APP_DEVELOPERS, APP_SUPPORTERS, BUILD_VER, BUILD_DATE, LIQUID_GLASS } from '../utils/constants';

const AboutModal = ({ visible, onClose, theme, accentColor }) => {
  const colors = ACCENT_COLORS[accentColor];
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.backgroundElevated;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const inputBgColor = glass.surfaceTertiary;
  const borderColor = glass.border;

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
      <Animated.View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)', opacity: overlayAnim }]}>
            <Animated.View style={[styles.modalContent, { backgroundColor: bgColor, transform: [{ scale: contentScale }, { translateY: contentTranslateY }] }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: textColor }]}>О приложении</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeIcon}>
              <Icon name="close" size={22} color={placeholderColor} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Идентификация приложения */}
            <View style={[styles.appIdentity, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <View style={[styles.appIconCircle, { backgroundColor: colors.primary }]}>
                <Icon name="school" size={32} color="#ffffff" />
              </View>
              <Text style={[styles.appName, { color: textColor }]}>Мой ИТИ ХГУ</Text>
              <Text style={[styles.appVersion, { color: placeholderColor }]}>
                Версия {APP_VERSION} • Сборка {BUILD_VER}
              </Text>
              <Text style={[styles.appDescription, { color: placeholderColor }]}>
                Мобильное приложение для студентов и преподавателей Инженерно-технологического института ХГУ
              </Text>
            </View>

            {/* Основные возможности */}
            <View style={[styles.sectionCard, { backgroundColor: inputBgColor, borderColor }]}>
              <View style={styles.sectionHeader}>
                <Icon name="sparkles-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Возможности</Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="calendar-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Расписание занятий для студентов и преподавателей
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="newspaper-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Новости университета с офлайн-доступом
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="map-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Интерактивная карта учебных корпусов
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="school-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Раздел «Первокурснику» с полезной информацией
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="notifications-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Уведомления о новостях и расписании
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="color-palette-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Темы оформления и цветовые схемы
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="cloud-offline-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Полная офлайн-работа с кэшированием
                </Text>
              </View>
            </View>

            {/* Для преподавателей */}
            <View style={[styles.sectionCard, { backgroundColor: inputBgColor, borderColor }]}>
              <View style={styles.sectionHeader}>
                <Icon name="person-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Для преподавателей</Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="search-outline" size={16} color={placeholderColor} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Расписание по ФИО с отображением групп
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="calendar-outline" size={16} color={placeholderColor} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Недельное расписание с навигацией
                </Text>
              </View>
            </View>

            {/* Отслеживание ошибок */}
            <View style={[styles.sectionCard, { backgroundColor: inputBgColor, borderColor }]}>
              <View style={styles.sectionHeader}>
                <Icon name="bug-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Отслеживание ошибок</Text>
              </View>
              <Text style={[styles.sectionDescription, { color: placeholderColor }]}>
                Приложение использует Self-hosted сервис Sentry (ООО «Скалк Софт» / Sculk Ltd.) для отслеживания ошибок. Собираемые данные включают техническую информацию об устройстве и контекст ошибки, но не содержат персональных данных.
              </Text>
            </View>

            {/* Информация о версии */}
            <View style={[styles.infoSection, { backgroundColor: inputBgColor, borderColor }]}>
              <View style={styles.infoItem}>
                <Icon name="calendar-outline" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: placeholderColor }]}>
                  Дата сборки: {BUILD_DATE}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Icon name="code-slash-outline" size={14} color={colors.primary} />
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

          {/* Кнопка */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.primary }]}
            onPress={handleClose}
          >
            <Text style={styles.closeButtonText}>Закрыть</Text>
          </TouchableOpacity>
            </Animated.View>
      </Animated.View>
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
    borderRadius: 24,
    padding: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Montserrat_600SemiBold',
    flex: 1,
  },
  closeIcon: {
    padding: 4,
  },
  scrollView: {
    maxHeight: 500,
  },
  // App identity
  appIdentity: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
  },
  appIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Section cards
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  featureIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  featureText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
  },
  // Info section
  infoSection: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
  },
  // Close button
  closeButton: {
    borderRadius: 16,
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