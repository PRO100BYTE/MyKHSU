import React, { useState, useEffect } from 'react';
import { View, Text, Platform, Appearance, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';

// Импорт компонентов
import SplashScreen from './components/SplashScreen';
import TabButton from './components/TabButton';
import PlaceholderScreen from './components/PlaceholderScreen';
import NewsScreen from './components/NewsScreen';
import ScheduleScreen from './components/ScheduleScreen';
import SettingsScreen from './components/SettingsScreen';

// Импорт утилит
import { ACCENT_COLORS, SCREENS } from './utils/constants';

// Стили
const styles = StyleSheet.create({
  header: {
    padding: 16, 
    paddingTop: Platform.OS === 'ios' ? 50 : 40, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerText: {
    fontSize: 24, 
    fontWeight: 'bold', 
    fontFamily: 'Montserrat_600SemiBold'
  },
  navigation: {
    flexDirection: 'row', 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    paddingHorizontal: 4,
    paddingVertical: 8
  }
});

export default function App() {
  // Загрузка шрифтов должна быть первым хуком
  let [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState(SCREENS.SCHEDULE);
  const [theme, setTheme] = useState('auto');
  const [accentColor, setAccentColor] = useState('green');
  const [systemTheme, setSystemTheme] = useState(Appearance.getColorScheme() || 'light');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    // Загружаем сохраненные настройки
    const loadSettings = async () => {
      try {
        const savedTheme = await SecureStore.getItemAsync('theme');
        const savedAccentColor = await SecureStore.getItemAsync('accentColor');
        
        if (savedTheme) setTheme(savedTheme);
        if (savedAccentColor) setAccentColor(savedAccentColor);
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        // Показываем splash screen на 2 секунды
        setTimeout(() => {
          setIsLoading(false);
        }, 2000);
      }
    };
    
    loadSettings();
  }, []);

  // Слушатель изменений системной темы
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme || 'light');
      
      // Принудительно обновляем компонент при изменении системной темы
      // если выбрана автоматическая тема
      if (theme === 'auto') {
        setRefresh(prev => prev + 1);
      }
    });

    return () => subscription.remove();
  }, [theme]);

  const getEffectiveTheme = () => {
    if (theme === 'auto') return systemTheme;
    return theme;
  };

  const effectiveTheme = getEffectiveTheme();
  
  // Рендерим SplashScreen пока шрифты не загружены или приложение загружается
  if (!fontsLoaded || isLoading) {
    return <SplashScreen accentColor={accentColor} theme={getEffectiveTheme()} />;
  }
  
  const bgColor = effectiveTheme === 'light' ? '#f3f4f6' : '#111827';
  const headerBg = effectiveTheme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = effectiveTheme === 'light' ? '#111827' : '#ffffff';
  const colors = ACCENT_COLORS[accentColor];
  
  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Заголовок */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <Text style={[styles.headerText, { color: textColor }]}>
          {activeScreen}
        </Text>
      </View>
      
      {/* Контент */}
      <View style={{ flex: 1 }}>
        {activeScreen === SCREENS.SCHEDULE && (
          <ScheduleScreen theme={effectiveTheme} accentColor={accentColor} key={`schedule-${refresh}`} />
        )}
        {activeScreen === SCREENS.MAP && (
          <PlaceholderScreen title={SCREENS.MAP} theme={effectiveTheme} key={`map-${refresh}`} />
        )}
        {activeScreen === SCREENS.FRESHMAN && (
          <PlaceholderScreen title={SCREENS.FRESHMAN} theme={effectiveTheme} key={`freshman-${refresh}`} />
        )}
        {activeScreen === SCREENS.NEWS && (
          <NewsScreen theme={effectiveTheme} accentColor={accentColor} key={`news-${refresh}`} />
        )}
        {activeScreen === SCREENS.SETTINGS && (
          <SettingsScreen 
            theme={effectiveTheme} 
            accentColor={accentColor} 
            setTheme={setTheme} 
            setAccentColor={setAccentColor} 
            key={`settings-${refresh}`}
          />
        )}
      </View>
      
      {/* Навигация */}
      <View style={[styles.navigation, { backgroundColor: headerBg }]}>
        <TabButton 
          icon="calendar-outline" 
          label={SCREENS.SCHEDULE} 
          isActive={activeScreen === SCREENS.SCHEDULE} 
          onPress={() => setActiveScreen(SCREENS.SCHEDULE)}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="map-outline" 
          label={SCREENS.MAP} 
          isActive={activeScreen === SCREENS.MAP} 
          onPress={() => setActiveScreen(SCREENS.MAP)}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="book-outline" 
          label={SCREENS.FRESHMAN} 
          isActive={activeScreen === SCREENS.FRESHMAN} 
          onPress={() => setActiveScreen(SCREENS.FRESHMAN)}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="newspaper-outline" 
          label={SCREENS.NEWS} 
          isActive={activeScreen === SCREENS.NEWS} 
          onPress={() => setActiveScreen(SCREENS.NEWS)}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
        
        <TabButton 
          icon="settings-outline" 
          label={SCREENS.SETTINGS} 
          isActive={activeScreen === SCREENS.SETTINGS} 
          onPress={() => setActiveScreen(SCREENS.SETTINGS)}
          theme={effectiveTheme}
          accentColor={accentColor}
        />
      </View>
    </View>
  );
}