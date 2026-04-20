import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ACCENT_COLORS, isNewYearPeriod, LIQUID_GLASS } from '../utils/constants';
import { getAchievementsCount, unlockAchievement } from '../utils/achievements';
import { showAchievementToast } from './AchievementToast';

const AppearanceSettingsSheet = ({ 
  theme, 
  accentColor, 
  legendUnlocked,
  setTheme, 
  setAccentColor, 
  onTabbarSettingsChange,
  isNewYearMode,
  onNewYearModeChange,
  developerMode
}) => {
  const systemColorScheme = useColorScheme();
  
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const inputBgColor = glass.surfaceTertiary;
  const borderColor = glass.border;
  const colors = ACCENT_COLORS[accentColor];

  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [showTabbarLabels, setShowTabbarLabels] = useState(true);
  const [tabbarFontSize, setTabbarFontSize] = useState('medium');
  const [newYearSetting, setNewYearSetting] = useState(false);
  const [localLegendUnlocked, setLocalLegendUnlocked] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    checkLegendUnlock();
  }, []);

  const checkLegendUnlock = async () => {
    try {
      const stats = await getAchievementsCount();
      setLocalLegendUnlocked(stats.total > 0 && stats.unlocked >= stats.total);
    } catch {
      setLocalLegendUnlocked(false);
    }
  };

  const loadSettings = async () => {
    try {
      setSelectedTheme(theme);
      
      const labelsEnabled = await SecureStore.getItemAsync('tabbar_labels_enabled');
      const fontSize = await SecureStore.getItemAsync('tabbar_font_size');
      
      if (labelsEnabled !== null) {
        setShowTabbarLabels(labelsEnabled === 'true');
      }
      
      if (fontSize) {
        setTabbarFontSize(fontSize);
      }
      
      const savedSetting = await SecureStore.getItemAsync('new_year_mode');
      if (savedSetting !== null) {
        setNewYearSetting(savedSetting === 'true');
      } else {
        setNewYearSetting(isNewYearMode);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setNewYearSetting(false);
    }
  };

  const handleThemeChange = async (newTheme) => {
    if (newTheme === 'legend' && !(legendUnlocked || localLegendUnlocked)) {
      Alert.alert('Тема недоступна', 'Легендарная тема откроется после получения всех достижений.');
      return;
    }

    setSelectedTheme(newTheme);
    setTheme(newTheme);
    await SecureStore.setItemAsync('theme', newTheme);
    
    // Ачивка за смену темы
    const ach = await unlockAchievement('theme_changer');
    if (ach) showAchievementToast(ach);
    
    // При выборе темы «Матрица» автоматически ставим акцентный цвет matrix
    if (newTheme === 'matrix') {
      setAccentColor('matrix');
      await SecureStore.setItemAsync('accentColor', 'matrix');
    } else if (accentColor === 'matrix') {
      // При уходе с темы «Матрица» сбрасываем акцент на зелёный
      setAccentColor('green');
      await SecureStore.setItemAsync('accentColor', 'green');
    }
  };

  const handleAccentColorChange = async (newColor) => {
    if (newColor === 'legend' && !(legendUnlocked || localLegendUnlocked)) {
      Alert.alert('Цвет недоступен', 'Легендарный акцент откроется после получения всех достижений.');
      return;
    }

    setAccentColor(newColor);
    await SecureStore.setItemAsync('accentColor', newColor);
  };

  const handleShowLabelsChange = async (value) => {
    setShowTabbarLabels(value);
    await SecureStore.setItemAsync('tabbar_labels_enabled', value.toString());
    if (onTabbarSettingsChange) {
      onTabbarSettingsChange({ showLabels: value, fontSize: tabbarFontSize });
    }
  };

  const handleFontSizeChange = async (size) => {
    setTabbarFontSize(size);
    await SecureStore.setItemAsync('tabbar_font_size', size);
    if (onTabbarSettingsChange) {
      onTabbarSettingsChange({ showLabels: showTabbarLabels, fontSize: size });
    }
  };

  const handleNewYearModeChange = async (value) => {
    setNewYearSetting(value);
    await SecureStore.setItemAsync('new_year_mode', value.toString());
    if (onNewYearModeChange) {
      onNewYearModeChange(value);
    }
    Alert.alert(
      'Настройки новогоднего настроения',
      'Изменены настройки Новогоднего настроения. Если изменения не вступили в силу - перезапустите приложение.',
      [{ text: 'ОК' }]
    );
  };

  const getFontSizeText = (size) => {
    switch (size) {
      case 'small': return 'Маленький';
      case 'medium': return 'Средний';
      case 'large': return 'Большой';
      default: return 'Средний';
    }
  };

  const showNewYearOption = isNewYearPeriod();

  // Доступные акцентные цвета (оранжевый доступен только в режиме разработчика)
  const accentColorOptions = [
    { key: 'green', label: 'Зелёный' },
    { key: 'blue', label: 'Голубой' },
    { key: 'purple', label: 'Фиолетовый' },
    ...(developerMode ? [{ key: 'orange', label: 'Оранжевый' }] : []),
    ...(developerMode ? [{ key: 'matrix', label: 'Матрица' }] : []),
    ...((legendUnlocked || localLegendUnlocked) ? [{ key: 'legend', label: 'Легендарный' }] : []),
  ];

  const themeOptions = [
    { key: 'light', icon: 'sunny-outline', label: 'Светлая' },
    { key: 'dark', icon: 'moon-outline', label: 'Тёмная' },
    { key: 'auto', icon: 'phone-portrait-outline', label: 'Системная', desc: systemColorScheme === 'dark' ? 'Тёмная' : 'Светлая' },
    ...(developerMode ? [{ key: 'matrix', icon: 'code-slash-outline', label: 'Матрица', desc: 'Цифровой дождь' }] : []),
    ...((legendUnlocked || localLegendUnlocked) ? [{ key: 'legend', icon: 'trophy-outline', label: 'Легендарная', desc: 'Награда за все достижения' }] : []),
  ];

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: bgColor, padding: 16 }} 
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Секция темы */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Тема</Text>
        <View style={styles.optionsContainer}>
          {themeOptions.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.option, { 
                backgroundColor: selectedTheme === opt.key ? colors.glass : 'transparent',
                borderColor: selectedTheme === opt.key ? colors.primary : borderColor,
              }]}
              onPress={() => handleThemeChange(opt.key)}
            >
              <View style={styles.optionHeader}>
                <Icon name={opt.icon} size={24} color={selectedTheme === opt.key ? colors.primary : placeholderColor} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.optionText, { color: selectedTheme === opt.key ? colors.primary : textColor }]}>
                    {opt.label}
                  </Text>
                  {opt.desc && (
                    <Text style={[styles.optionDescription, { color: placeholderColor }]}>{opt.desc}</Text>
                  )}
                </View>
              </View>
              {selectedTheme === opt.key && <Icon name="checkmark" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Секция акцентного цвета */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Акцентный цвет</Text>
        <View style={styles.colorOptions}>
          {accentColorOptions.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.colorOption, { 
                backgroundColor: ACCENT_COLORS[opt.key].primary,
                borderWidth: accentColor === opt.key ? 3 : 0,
                borderColor: accentColor === opt.key ? textColor : 'transparent',
              }]}
              onPress={() => handleAccentColorChange(opt.key)}
            >
              {accentColor === opt.key && <Icon name="checkmark" size={20} color="#ffffff" />}
            </TouchableOpacity>
          ))}
        </View>
        {developerMode && accentColor === 'orange' && (
          <View style={[styles.infoSection, { backgroundColor: 'rgba(249, 115, 22, 0.1)', marginTop: 12 }]}>
            <Icon name="sparkles" size={16} color="#F97316" />
            <Text style={[styles.infoText, { color: '#F97316', marginLeft: 8, flex: 1 }]}>
              Секретный цвет разблокирован через режим разработчика!
            </Text>
          </View>
        )}
        {developerMode && selectedTheme === 'matrix' && (
          <View style={[styles.infoSection, { backgroundColor: 'rgba(0, 255, 65, 0.1)', marginTop: 12 }]}>
            <Icon name="code-slash" size={16} color="#00FF41" />
            <Text style={[styles.infoText, { color: '#00FF41', marginLeft: 8, flex: 1 }]}>
              Тема «Матрица» активирована. Добро пожаловать в кроличью нору.
            </Text>
          </View>
        )}
        {(legendUnlocked || localLegendUnlocked) && selectedTheme === 'legend' && (
          <View style={[styles.infoSection, { backgroundColor: 'rgba(255, 214, 102, 0.12)', marginTop: 12 }]}> 
            <Icon name="trophy" size={16} color="#FFD666" />
            <Text style={[styles.infoText, { color: '#FFD666', marginLeft: 8, flex: 1 }]}> 
              Эксклюзивная тема открыта за полный набор достижений.
            </Text>
          </View>
        )}
        {(legendUnlocked || localLegendUnlocked) && accentColor === 'legend' && (
          <View style={[styles.infoSection, { backgroundColor: 'rgba(255, 214, 102, 0.12)', marginTop: 12 }]}> 
            <Icon name="diamond" size={16} color="#FFD666" />
            <Text style={[styles.infoText, { color: '#FFD666', marginLeft: 8, flex: 1 }]}> 
              Легендарный акцент активен.
            </Text>
          </View>
        )}
      </View>

      {/* Секция новогоднего настроения */}
      {showNewYearOption && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Новогоднее настроение</Text>
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor }]}
            onPress={() => handleNewYearModeChange(!newYearSetting)}
          >
            <View style={styles.settingInfo}>
              <Icon name={newYearSetting ? "snow" : "snow-outline"} size={24} color={newYearSetting ? colors.primary : placeholderColor} />
              <View style={styles.textContainer}>
                <Text style={[styles.settingLabel, { color: textColor }]}>
                  Включить новогоднее настроение
                </Text>
                <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                  {newYearSetting ? 'Снегопад и праздничные эффекты включены' : 'Включить снегопад и праздничные эффекты'}
                </Text>
              </View>
            </View>
            <Switch
              value={newYearSetting}
              onValueChange={handleNewYearModeChange}
              trackColor={{ false: borderColor, true: colors.light }}
              thumbColor={newYearSetting ? colors.primary : placeholderColor}
            />
          </TouchableOpacity>
          <View style={[styles.infoSection, { backgroundColor: inputBgColor, marginTop: 12 }]}>
            <Icon name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: placeholderColor, marginLeft: 8, flex: 1 }]}>
              Новогоднее настроение доступно с 1 декабря по 31 января
            </Text>
          </View>
        </View>
      )}

      {/* Секция панели навигации */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Панель навигации</Text>
        <TouchableOpacity
          style={[styles.settingItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor }]}
          onPress={() => handleShowLabelsChange(!showTabbarLabels)}
        >
          <View style={styles.settingInfo}>
            <Icon name="text-outline" size={24} color={showTabbarLabels ? colors.primary : placeholderColor} />
            <View style={styles.textContainer}>
              <Text style={[styles.settingLabel, { color: textColor }]}>Показывать подписи иконок</Text>
              <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                Отображать названия вкладок под иконками
              </Text>
            </View>
          </View>
          <Switch
            value={showTabbarLabels}
            onValueChange={handleShowLabelsChange}
            trackColor={{ false: borderColor, true: colors.light }}
            thumbColor={showTabbarLabels ? colors.primary : placeholderColor}
          />
        </TouchableOpacity>
        {showTabbarLabels && (
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.subSectionTitle, { color: textColor }]}>Размер шрифта подписей</Text>
            <Text style={[styles.subSectionDescription, { color: placeholderColor }]}>
              Выберите размер текста под иконками навигации
            </Text>
            <View style={styles.fontSizeOptions}>
              {['small', 'medium', 'large'].map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[styles.fontSizeOption, {
                    backgroundColor: tabbarFontSize === size ? colors.primary : inputBgColor,
                    borderColor: tabbarFontSize === size ? colors.primary : borderColor
                  }]}
                  onPress={() => handleFontSizeChange(size)}
                >
                  <Text style={[styles.fontSizeOptionText, { 
                    color: tabbarFontSize === size ? '#ffffff' : textColor,
                    fontSize: size === 'small' ? 10 : size === 'medium' ? 12 : 14
                  }]}>
                    {getFontSizeText(size)}
                  </Text>
                  {tabbarFontSize === size && (
                    <Icon name="checkmark" size={16} color="#ffffff" style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Информационная секция */}
      <View style={[styles.infoSection, { backgroundColor: inputBgColor }]}>
        <Icon name="information-circle-outline" size={16} color={colors.primary} />
        <Text style={[styles.infoText, { color: placeholderColor, marginLeft: 8, flex: 1 }]}>
          Настройки оформления применяются автоматически
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, fontFamily: 'Montserrat_600SemiBold' },
  subSectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4, fontFamily: 'Montserrat_600SemiBold' },
  subSectionDescription: { fontSize: 12, marginBottom: 12, fontFamily: 'Montserrat_400Regular' },
  optionsContainer: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  optionHeader: { flexDirection: 'row', alignItems: 'center' },
  optionText: { fontSize: 16, fontFamily: 'Montserrat_500Medium' },
  optionDescription: { fontSize: 12, fontFamily: 'Montserrat_400Regular', marginTop: 2 },
  colorOptions: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingHorizontal: 20 },
  colorOption: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  textContainer: { marginLeft: 12, flex: 1 },
  settingLabel: { fontSize: 16, fontFamily: 'Montserrat_500Medium', marginBottom: 2 },
  settingDescription: { fontSize: 14, fontFamily: 'Montserrat_400Regular' },
  fontSizeOptions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  fontSizeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  fontSizeOptionText: { fontFamily: 'Montserrat_500Medium' },
  infoSection: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 8 },
  infoText: { fontSize: 12, fontFamily: 'Montserrat_400Regular' },
});

export default AppearanceSettingsSheet;
