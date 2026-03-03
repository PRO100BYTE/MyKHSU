import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet, Platform, Animated, StatusBar, Alert } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';
import UnderDevelopmentModal from './UnderDevelopmentModal';
import BuildingsListScreen from './BuildingsListScreen';
import Snowfall from './Snowfall';
import { unlockAchievement } from '../utils/achievements';

const FreshmanScreen = forwardRef(({ theme, accentColor, isNewYearMode, onNavigationChange }, ref) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentGroupType, setCurrentGroupType] = useState(null);
  const [showBuildingsList, setShowBuildingsList] = useState(false);
  const [secretTapCount, setSecretTapCount] = useState(0);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const cardBg = glass.surfaceCard;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const colors = ACCENT_COLORS[accentColor];

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    goBack: () => {
      if (showBuildingsList) {
        setShowBuildingsList(false);
      } else if (currentGroupType === 'vk' || currentGroupType === 'telegram') {
        setCurrentGroupType('main');
      } else if (currentGroupType === 'main' || currentGroupType === 'bells' || currentGroupType === 'glossary') {
        setCurrentGroupType(null);
      }
    },
  }));

  // Notify parent about navigation state changes
  useEffect(() => {
    let title = null;
    if (showBuildingsList) {
      title = 'Корпуса ХГУ';
    } else if (currentGroupType === 'vk') {
      title = 'Группы ВКонтакте';
    } else if (currentGroupType === 'telegram') {
      title = 'Группы Telegram';
    } else if (currentGroupType === 'main') {
      title = 'Полезные группы';
    } else if (currentGroupType === 'bells') {
      title = 'Расписание звонков';
    } else if (currentGroupType === 'glossary') {
      title = 'Словарь аббревиатур';
    }
    if (onNavigationChange) onNavigationChange(title);
  }, [showBuildingsList, currentGroupType]);

  // Простая анимация fade при смене экрана
  useEffect(() => {
    // Сбрасываем прозрачность
    fadeAnim.setValue(0);
    
    // Плавное появление
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [currentGroupType, showBuildingsList]);

  // Функции для открытия ссылок
  const openITIWebsite = () => {
    Linking.openURL('https://iti.khsu.ru');
  };

  const openEduPortal = () => {
    Linking.openURL('https://edu.khsu.ru');
  };

  const openNewEduPortal = () => {
    Linking.openURL('https://newdo.khsu.ru');
  };

  const openLink = (url) => {
    Linking.openURL(url);
  };

  // Данные для групп ВКонтакте
  const vkGroups = [
    {
      id: 1,
      name: 'Хакасский государственный университет им. Н.Ф.Катанова',
      url: 'https://vk.com/khsu_ru',
      icon: 'school-outline'
    },
    {
      id: 2,
      name: 'Инженерно-технологический институт ХГУ',
      url: 'https://vk.com/khsu_iit',
      icon: 'business-outline'
    },
    {
      id: 3,
      name: 'Кафедра ПОВТиАС ИТИ ХГУ',
      url: 'https://vk.com/kafedrapovtias',
      icon: 'code-slash-outline'
    },
    {
      id: 4,
      name: 'Кафедра ЦТиД ИТИ ХГУ',
      url: 'https://vk.com/public212642505',
      icon: 'color-palette-outline'
    },
    {
      id: 5,
      name: 'Медиацентр "404"',
      url: 'https://vk.com/iti_404',
      icon: 'camera-outline'
    },
    {
      id: 6,
      name: 'Совет обучающихся ХГУ',
      url: 'https://vk.com/so_khsu',
      icon: 'people-outline'
    },
    {
      id: 7,
      name: 'Профсоюзная организация обучающихся ХГУ',
      url: 'https://vk.com/pos_khsu',
      icon: 'shield-checkmark-outline'
    },
    {
      id: 8,
      name: 'Профбюро ИТИ',
      url: 'https://vk.com/prof_iti_khsu',
      icon: 'briefcase-outline'
    },
    {
      id: 9,
      name: 'ХГУ Спорт ИТИ',
      url: 'https://vk.com/club178703236',
      icon: 'barbell-outline'
    }
  ];

  // Рендер карточки раздела
  const renderSectionCard = (icon, title, description, onPress, isLast = false) => (
    <TouchableOpacity 
      style={{ 
        flexDirection: 'row',
        backgroundColor: glass.surfaceSecondary, 
        borderRadius: 16, 
        marginBottom: isLast ? 0 : 12,
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: glass.border,
        overflow: 'hidden',
        shadowColor: glass.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
      }}
      onPress={onPress}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        <View style={{ 
          width: 42, 
          height: 42, 
          borderRadius: 12, 
          backgroundColor: colors.glass, 
          justifyContent: 'center', 
          alignItems: 'center',
          marginRight: 14,
          borderWidth: StyleSheet.hairlineWidth, 
          borderColor: colors.glassBorder,
        }}>
          <Icon name={icon} size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: textColor, fontSize: 15, fontFamily: 'Montserrat_500Medium' }}>
            {title}
          </Text>
          <Text style={{ color: placeholderColor, fontSize: 13, marginTop: 3, fontFamily: 'Montserrat_400Regular', lineHeight: 18 }}>
            {description}
          </Text>
        </View>
        <Icon name="chevron-forward" size={20} color={placeholderColor} />
      </View>
    </TouchableOpacity>
  );

  // Рендер карточки группы
  const renderGroupCard = (group, isLast = false) => (
    <TouchableOpacity 
      key={group.id}
      style={{ 
        flexDirection: 'row',
        backgroundColor: glass.surfaceSecondary, 
        borderRadius: 14, 
        marginBottom: isLast ? 0 : 10,
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: glass.border,
        overflow: 'hidden',
        shadowColor: glass.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
      }}
      onPress={() => openLink(group.url)}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 }}>
        <View style={{ 
          width: 36, 
          height: 36, 
          borderRadius: 10, 
          backgroundColor: colors.glass, 
          justifyContent: 'center', 
          alignItems: 'center',
          marginRight: 12,
          borderWidth: StyleSheet.hairlineWidth, 
          borderColor: colors.glassBorder,
        }}>
          <Icon name={group.icon} size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: textColor, fontSize: 14, fontFamily: 'Montserrat_500Medium', lineHeight: 19 }}>
            {group.name}
          </Text>
        </View>
        <Icon name="open-outline" size={18} color={placeholderColor} />
      </View>
    </TouchableOpacity>
  );

  // Главный экран разделов
  const renderMainSections = () => (
    <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 100 }}>
      {renderSectionCard(
        'people-outline',
        'Преподаватели',
        'Информация о преподавателях ИТИ ХГУ',
        () => setModalVisible(true)
      )}
      
      {renderSectionCard(
        'business-outline',
        'Корпуса ХГУ',
        'Список всех корпусов университета с маршрутами',
        () => setShowBuildingsList(true)
      )}
      
      {renderSectionCard(
        'globe-outline',
        'Сайт ИТИ ХГУ',
        'Официальный сайт Инженерно-технологического института',
        openITIWebsite
      )}
      
      {renderSectionCard(
        'laptop-outline',
        'Образовательный портал ХГУ',
        'Электронная образовательная среда университета',
        openEduPortal
      )}
      
      {renderSectionCard(
        'school-outline',
        'Новый образовательный портал ХГУ (Moodle)',
        'Современная платформа для дистанционного обучения',
        openNewEduPortal
      )}
      
      {renderSectionCard(
        'chatbubbles-outline',
        'Полезные группы (сообщества)',
        'Группы и сообщества ВКонтакте и Telegram',
        () => setCurrentGroupType('main'),
      )}

      {renderSectionCard(
        'time-outline',
        'Расписание звонков',
        'Время начала и окончания занятий',
        () => setCurrentGroupType('bells'),
      )}

      {renderSectionCard(
        'book-outline',
        'Словарь аббревиатур',
        'Расшифровка университетских сокращений',
        () => setCurrentGroupType('glossary'),
        true
      )}

      {/* Скрытая пасхалка */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          const newCount = secretTapCount + 1;
          setSecretTapCount(newCount);
          if (newCount >= 7) {
            setSecretTapCount(0);
            unlockAchievement('konami_code').then(result => {
              if (result) {
                Alert.alert(
                  '👁️ За гранью кода',
                  'Ты нашёл то, что не должен был найти. Или наоборот?\n\nНовое достижение разблокировано!',
                );
              }
            });
          }
        }}
        style={{ alignItems: 'center', marginTop: 32, marginBottom: 8 }}
      >
        <Text style={{ color: placeholderColor, fontSize: 11, fontFamily: 'Montserrat_400Regular', opacity: 0.4 }}>
          ИТИ ХГУ • {new Date().getFullYear()}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Экран групп ВКонтакте
  const renderVKGroups = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <ScrollView>
        {vkGroups.map((group, index) => 
          renderGroupCard(group, index === vkGroups.length - 1)
        )}
      </ScrollView>
    </View>
  );

  // Экран групп Telegram
  const renderTelegramGroups = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ 
        backgroundColor: glass.surfaceSecondary, 
        borderRadius: 16, 
        padding: 28, 
        alignItems: 'center',
        marginTop: 40,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: glass.border,
        shadowColor: glass.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
      }}>
        <View style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: 'rgba(0, 136, 204, 0.1)',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 14,
        }}>
          <Icon name="paper-plane-outline" size={28} color="#0088cc" />
        </View>
        <Text style={{ 
          color: textColor, 
          fontSize: 16, 
          fontFamily: 'Montserrat_500Medium',
          textAlign: 'center',
          marginBottom: 4,
        }}>
          Скоро здесь появятся группы
        </Text>
        <Text style={{ 
          color: placeholderColor, 
          fontSize: 14, 
          textAlign: 'center', 
          fontFamily: 'Montserrat_400Regular',
          lineHeight: 20,
        }}>
          Мы работаем над добавлением Telegram-каналов и чатов
        </Text>
      </View>
    </View>
  );

  // Экран выбора типа групп
  const renderGroupTypeSelection = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ 
        color: placeholderColor, 
        fontSize: 14, 
        marginBottom: 24,
        fontFamily: 'Montserrat_400Regular'
      }}>
        Выберите платформу для просмотра групп и сообществ
      </Text>

      {renderSectionCard(
        'logo-vk',
        'Группы ВКонтакте',
        'Официальные группы и сообщества ВКонтакте',
        () => setCurrentGroupType('vk')
      )}
      
      {renderSectionCard(
        'paper-plane-outline',
        'Группы Telegram',
        'Каналы и чаты в Telegram',
        () => setCurrentGroupType('telegram'),
        true
      )}
    </View>
  );

  // Рендер списка корпусов
  const renderBuildingsList = () => (
    <View style={{ flex: 1 }}>
      <BuildingsListScreen 
        theme={theme} 
        accentColor={accentColor} 
      />
    </View>
  );

  // Расписание звонков
  const bellSchedule = [
    { pair: 1, start: '08:00', end: '09:30', breakAfter: '10 мин' },
    { pair: 2, start: '09:40', end: '11:10', breakAfter: '20 мин' },
    { pair: 3, start: '11:30', end: '13:00', breakAfter: '30 мин' },
    { pair: 4, start: '13:30', end: '15:00', breakAfter: '10 мин' },
    { pair: 5, start: '15:10', end: '16:40', breakAfter: '10 мин' },
    { pair: 6, start: '16:50', end: '18:20', breakAfter: '10 мин' },
    { pair: 7, start: '18:30', end: '20:00', breakAfter: null },
  ];

  const renderBellSchedule = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const isCurrentPair = (start, end) => {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      return currentMinutes >= sh * 60 + sm && currentMinutes <= eh * 60 + em;
    };

    return (
      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{
          backgroundColor: colors.glass,
          borderRadius: 16,
          padding: 14,
          marginBottom: 20,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.glassBorder,
        }}>
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: colors.primary + '18',
            justifyContent: 'center', alignItems: 'center', marginRight: 12,
          }}>
            <Icon name="time" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: textColor, fontSize: 15, fontFamily: 'Montserrat_600SemiBold' }}>
              Учебные пары
            </Text>
            <Text style={{ color: placeholderColor, fontSize: 12, fontFamily: 'Montserrat_400Regular', marginTop: 2 }}>
              Длительность пары — 90 минут (2 × 45 мин)
            </Text>
          </View>
        </View>

        {bellSchedule.map((item, index) => {
          const isCurrent = isCurrentPair(item.start, item.end);
          return (
            <View key={item.pair}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isCurrent ? (colors.glass || colors.primary + '10') : glass.surfaceSecondary,
                borderRadius: 16,
                padding: 14,
                marginBottom: item.breakAfter ? 4 : 0,
                borderWidth: isCurrent ? 1.5 : StyleSheet.hairlineWidth,
                borderColor: isCurrent ? colors.primary + '40' : glass.border,
              }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: isCurrent ? colors.primary : glass.surfaceTertiary,
                  justifyContent: 'center', alignItems: 'center', marginRight: 14,
                }}>
                  <Text style={{
                    color: isCurrent ? '#fff' : textColor,
                    fontSize: 16, fontFamily: 'Montserrat_700Bold',
                  }}>
                    {item.pair}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: textColor, fontSize: 16, fontFamily: 'Montserrat_600SemiBold',
                  }}>
                    {item.start} – {item.end}
                  </Text>
                  {isCurrent && (
                    <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Montserrat_500Medium', marginTop: 2 }}>
                      Сейчас идёт
                    </Text>
                  )}
                </View>
                {isCurrent && (
                  <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: colors.primary, marginLeft: 8,
                  }} />
                )}
              </View>
              {item.breakAfter && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4 }}>
                  <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: glass.border }} />
                  <Text style={{
                    color: placeholderColor, fontSize: 11, fontFamily: 'Montserrat_400Regular',
                    marginHorizontal: 10, opacity: 0.7,
                  }}>
                    перерыв {item.breakAfter}
                  </Text>
                  <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: glass.border }} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  // Словарь аббревиатур
  const glossaryData = [
    { abbr: 'ХГУ', full: 'Хакасский государственный университет им. Н.Ф. Катанова' },
    { abbr: 'ИТИ', full: 'Инженерно-технологический институт' },
    { abbr: 'ЛК', full: 'Лекция — теоретическое занятие в аудитории' },
    { abbr: 'ПЗ', full: 'Практическое занятие — закрепление теории на практике' },
    { abbr: 'ЛР', full: 'Лабораторная работа — практика в лаборатории/компьютерном классе' },
    { abbr: 'КР', full: 'Контрольная работа — промежуточная проверка знаний' },
    { abbr: 'СРС', full: 'Самостоятельная работа студента' },
    { abbr: 'ЗЕТ', full: 'Зачётная единица трудоёмкости (1 ЗЕТ = 36 часов)' },
    { abbr: 'ГИА', full: 'Государственная итоговая аттестация' },
    { abbr: 'ВКР', full: 'Выпускная квалификационная работа (диплом)' },
    { abbr: 'ОПОП', full: 'Основная профессиональная образовательная программа' },
    { abbr: 'ФГОС', full: 'Федеральный государственный образовательный стандарт' },
    { abbr: 'ДО', full: 'Дистанционное обучение' },
    { abbr: 'ЭОС', full: 'Электронная образовательная среда' },
    { abbr: 'БРС', full: 'Балльно-рейтинговая система оценки знаний' },
    { abbr: 'ECTS', full: 'European Credit Transfer System — Европейская система перевода кредитов' },
    { abbr: 'ПОВТиАС', full: 'Кафедра программного обеспечения вычислительной техники и автоматизированных систем' },
    { abbr: 'ЦТиД', full: 'Кафедра цифровых технологий и дизайна' },
  ];

  const renderGlossary = () => (
    <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View style={{
        backgroundColor: colors.glass,
        borderRadius: 16,
        padding: 14,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.glassBorder,
      }}>
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: colors.primary + '18',
          justifyContent: 'center', alignItems: 'center', marginRight: 12,
        }}>
          <Icon name="book" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: textColor, fontSize: 15, fontFamily: 'Montserrat_600SemiBold' }}>
            Аббревиатуры
          </Text>
          <Text style={{ color: placeholderColor, fontSize: 12, fontFamily: 'Montserrat_400Regular', marginTop: 2 }}>
            Часто встречающиеся сокращения
          </Text>
        </View>
      </View>

      {glossaryData.map((item, index) => (
        <View 
          key={item.abbr}
          style={{
            flexDirection: 'row',
            backgroundColor: glass.surfaceSecondary,
            borderRadius: 14,
            marginBottom: index === glossaryData.length - 1 ? 0 : 8,
            padding: 14,
            alignItems: 'flex-start',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: glass.border,
          }}
        >
          <View style={{
            minWidth: 56,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: colors.glass,
            alignItems: 'center',
            marginRight: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.glassBorder,
          }}>
            <Text style={{
              color: colors.primary,
              fontSize: 13,
              fontFamily: 'Montserrat_700Bold',
            }}>
              {item.abbr}
            </Text>
          </View>
          <Text style={{
            flex: 1,
            color: textColor,
            fontSize: 14,
            fontFamily: 'Montserrat_400Regular',
            lineHeight: 20,
          }}>
            {item.full}
          </Text>
        </View>
      ))}
    </ScrollView>
  );

  // Рендер текущего экрана с анимацией
  const renderCurrentScreen = () => {
    if (showBuildingsList) {
      return renderBuildingsList();
    } else if (!currentGroupType) {
      return renderMainSections();
    } else if (currentGroupType === 'main') {
      return renderGroupTypeSelection();
    } else if (currentGroupType === 'vk') {
      return renderVKGroups();
    } else if (currentGroupType === 'telegram') {
      return renderTelegramGroups();
    } else if (currentGroupType === 'bells') {
      return renderBellSchedule();
    } else if (currentGroupType === 'glossary') {
      return renderGlossary();
    }
    return null;
  };

return (
  <View style={{ flex: 1, backgroundColor: bgColor }}>
    {/* Снегопад для новогоднего режима */}
    {isNewYearMode && <Snowfall key={`snowfall-${isNewYearMode}`} theme={theme} intensity={0.8} />}
    
    <View style={{ flex: 1, zIndex: 2 }}>
      <StatusBar 
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={bgColor}
      />
      
      {/* Рендер текущего экрана с анимацией */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {renderCurrentScreen()}
      </Animated.View>

      {/* Модальное окно заглушки */}
      <UnderDevelopmentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        theme={theme}
        accentColor={accentColor}
        featureName="Информация о преподавателях"
      />
    </View>
  </View>
);
});

const styles = StyleSheet.create({
  // Стили могут быть добавлены при необходимости
});

export default FreshmanScreen;